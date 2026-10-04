const fs = require('fs');
const path = require('path');
const { compressImageFile } = require('./compress-images.cjs');

const WATCH_DIRS = [
  path.resolve(__dirname, '../client/public'),
];

const pendingTimeouts = new Map();
const recentlyProcessed = new Map(); // path -> timestamp
const DEBOUNCE_MS = 800;
const COOLDOWN_MS = 4000; // prevent self-trigger loop

console.log('====================================================');
console.log('  CYBOTZ AUTO-IMAGE-COMPRESSION WATCHER ACTIVE');
console.log('  Monitoring client/public for new & updated images...');
console.log('====================================================');

async function handleFileChange(fullPath) {
  const ext = path.extname(fullPath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return;

  const now = Date.now();
  const lastProcessed = recentlyProcessed.get(fullPath) || 0;
  if (now - lastProcessed < COOLDOWN_MS) {
    return; // Ignore file change triggered by our own in-place compression
  }

  // Wait briefly to make sure file write finished (e.g. download or copy)
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (!fs.existsSync(fullPath)) return;

  try {
    const stat = fs.statSync(fullPath);
    if (stat.size === 0) return;

    recentlyProcessed.set(fullPath, Date.now());
    const relName = path.relative(path.resolve(__dirname, '..'), fullPath).replace(/\\/g, '/');
    console.log(`[AUTO-COMPRESS] New image detected: ${relName} (${(stat.size / 1024).toFixed(1)} KB) - Compressing...`);

    const result = await compressImageFile(fullPath);
    if (result) {
      console.log(
        `[AUTO-COMPRESS] Done! ${relName}: ${result.originalKb} KB -> ${result.currentKb} KB ` +
        `(Saved ${result.savedPercent})${result.webpCreated ? ` [WebP: ${result.webpKb} KB]` : ''}`
      );

      // If dist exists, sync the file
      const distPublic = path.resolve(__dirname, '../dist/public');
      if (fs.existsSync(distPublic) && fullPath.includes('client' + path.sep + 'public')) {
        const relToPublic = path.relative(path.resolve(__dirname, '../client/public'), fullPath);
        const distTarget = path.join(distPublic, relToPublic);
        fs.mkdirSync(path.dirname(distTarget), { recursive: true });
        fs.copyFileSync(fullPath, distTarget);

        if (result.webpCreated) {
          const webpSource = fullPath.substring(0, fullPath.lastIndexOf('.')) + '.webp';
          const distWebpTarget = distTarget.substring(0, distTarget.lastIndexOf('.')) + '.webp';
          if (fs.existsSync(webpSource)) {
            fs.copyFileSync(webpSource, distWebpTarget);
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[AUTO-COMPRESS] Skipping ${fullPath}:`, err.message);
  }
}

for (const dir of WATCH_DIRS) {
  if (!fs.existsSync(dir)) continue;

  try {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const fullPath = path.join(dir, filename);

      if (pendingTimeouts.has(fullPath)) {
        clearTimeout(pendingTimeouts.get(fullPath));
      }

      pendingTimeouts.set(
        fullPath,
        setTimeout(() => {
          pendingTimeouts.delete(fullPath);
          handleFileChange(fullPath).catch(console.error);
        }, DEBOUNCE_MS)
      );
    });
    console.log(`[WATCHER] Watching ${path.relative(path.resolve(__dirname, '..'), dir)}`);
  } catch (err) {
    console.warn(`[WATCHER WARN] Could not watch ${dir}:`, err.message);
  }
}
