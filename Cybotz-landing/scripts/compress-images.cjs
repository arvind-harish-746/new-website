const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Target directories that contain website images
const TARGET_DIRS = [
  path.resolve(__dirname, '../client/public'),
];

// Maximum dimension for responsive web display
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;
const JPEG_QUALITY = 82;
const PNG_QUALITY = 80;

const CACHE_DIR = path.resolve(__dirname, '../node_modules/.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'image-compress-cache.json');

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveCache(cache) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch {}
}

const memoryCache = loadCache();

/**
 * Optimizes an individual image file in-place and optionally creates a .webp sibling
 */
async function compressImageFile(filePath, force = false) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return null;

  try {
    const originalStat = fs.statSync(filePath);
    const originalSize = originalStat.size;
    if (originalSize === 0) return null;

    const relKey = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');
    const webpPath = filePath.substring(0, filePath.lastIndexOf('.')) + '.webp';

    // Smart caching: skip if file unchanged and webp sibling exists
    if (!force && memoryCache[relKey]) {
      const cached = memoryCache[relKey];
      const webpOk = ext === '.webp' || fs.existsSync(webpPath);
      if (cached.mtime === originalStat.mtimeMs && cached.currentBytes === originalSize && webpOk) {
        return {
          ...cached,
          skipped: true,
        };
      }
    }

    // Read file into buffer to avoid Windows file lock during processing
    const inputBuffer = fs.readFileSync(filePath);
    const metadata = await sharp(inputBuffer).metadata();

    const needsResize =
      (metadata.width && metadata.width > MAX_DIMENSION) ||
      (metadata.height && metadata.height > MAX_DIMENSION);

    const getPipeline = () => {
      let pipeline = sharp(inputBuffer);
      if (needsResize) {
        pipeline = pipeline.resize({
          width: metadata.width >= metadata.height ? MAX_DIMENSION : undefined,
          height: metadata.height > metadata.width ? MAX_DIMENSION : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
      return pipeline;
    };

    // 1. Optimize original format in-place
    let optimizedBuffer = null;
    if (ext === '.png') {
      optimizedBuffer = await getPipeline()
        .png({ quality: PNG_QUALITY, palette: true, compressionLevel: 9, effort: 6 })
        .toBuffer();
    } else if (ext === '.jpg' || ext === '.jpeg') {
      optimizedBuffer = await getPipeline()
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
    } else if (ext === '.webp') {
      optimizedBuffer = await getPipeline()
        .webp({ quality: WEBP_QUALITY, effort: 6 })
        .toBuffer();
    }

    let inPlaceSaved = 0;
    if (optimizedBuffer && optimizedBuffer.length < originalSize) {
      fs.writeFileSync(filePath, optimizedBuffer);
      inPlaceSaved = originalSize - optimizedBuffer.length;
    }

    // 2. Also generate modern WebP sibling if original is PNG or JPG
    let webpCreated = false;
    let webpSize = 0;
    if (ext !== '.webp') {
      const webpBuffer = await getPipeline()
        .webp({ quality: WEBP_QUALITY, effort: 6 })
        .toBuffer();

      // Only write if doesn't exist or is smaller
      if (!fs.existsSync(webpPath) || fs.statSync(webpPath).size > webpBuffer.length) {
        fs.writeFileSync(webpPath, webpBuffer);
        webpCreated = true;
        webpSize = webpBuffer.length;
      } else {
        webpSize = fs.statSync(webpPath).size;
      }
    }

    const currentStat = fs.statSync(filePath);
    const currentSize = currentStat.size;
    const effectiveSaved = originalSize - (webpCreated && webpSize < currentSize ? webpSize : currentSize);
    const savedPercent = originalSize > 0 && effectiveSaved > 0
      ? ((effectiveSaved / originalSize) * 100).toFixed(1) + '%'
      : '0%';

    const record = {
      file: relKey,
      originalKb: (originalSize / 1024).toFixed(1),
      currentKb: (currentSize / 1024).toFixed(1),
      originalBytes: originalSize,
      currentBytes: currentSize,
      mtime: currentStat.mtimeMs,
      webpCreated,
      webpKb: webpSize ? (webpSize / 1024).toFixed(1) : null,
      savedPercent,
      bytesSaved: Math.max(0, originalSize - currentSize),
      skipped: false,
    };

    memoryCache[relKey] = record;
    return record;
  } catch (err) {
    console.warn(`[WARN] Could not compress ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Recursively find and compress all images in a directory
 */
async function walkDirectory(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      await walkDirectory(fullPath, results);
    } else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) {
      const res = await compressImageFile(fullPath);
      if (res) results.push(res);
    }
  }
  return results;
}

/**
 * Copy compressed public assets to dist/public if dist exists
 */
function syncToDist() {
  const distPublic = path.resolve(__dirname, '../dist/public');
  const clientPublic = path.resolve(__dirname, '../client/public');
  if (!fs.existsSync(distPublic) || !fs.existsSync(clientPublic)) return;

  const copyDir = (src, dest) => {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      const s = path.join(src, item);
      const d = path.join(dest, item);
      if (fs.statSync(s).isDirectory()) {
        copyDir(s, d);
      } else if (/\.(png|jpe?g|webp|svg)$/i.test(item)) {
        if (!fs.existsSync(d) || fs.statSync(s).mtimeMs > fs.statSync(d).mtimeMs) {
          fs.copyFileSync(s, d);
        }
      }
    }
  };
  copyDir(clientPublic, distPublic);
}

async function run() {
  console.log('==============================================');
  console.log('   CYBOTZ IMAGE COMPRESSION OPTIMIZER');
  console.log('==============================================');

  let totalOriginalBytes = 0;
  let totalCurrentBytes = 0;
  const allResults = [];

  for (const dir of TARGET_DIRS) {
    if (fs.existsSync(dir)) {
      const res = await walkDirectory(dir);
      allResults.push(...res);
    }
  }

  saveCache(memoryCache);
  syncToDist();

  // Calculate totals
  allResults.forEach((r) => {
    totalOriginalBytes += parseFloat(r.originalKb) * 1024;
    totalCurrentBytes += parseFloat(r.currentKb) * 1024;
  });

  const freshlyCompressed = allResults.filter(r => !r.skipped);
  console.log(`\n=== COMPRESSION REPORT (${allResults.length} assets checked, ${freshlyCompressed.length} newly processed) ===`);

  if (freshlyCompressed.length > 0) {
    console.log(
      'File'.padEnd(52) +
      'Original'.padStart(10) +
      'Optimized'.padStart(11) +
      'Saved %'.padStart(10) +
      '  WebP Sibling'
    );
    console.log('-'.repeat(95));

    freshlyCompressed.forEach((r) => {
      const webpInfo = r.webpCreated ? `${r.webpKb} KB` : '-';
      console.log(
        r.file.padEnd(52) +
        `${r.originalKb} KB`.padStart(10) +
        `${r.currentKb} KB`.padStart(11) +
        r.savedPercent.padStart(10) +
        `  ${webpInfo}`
      );
    });
  } else {
    console.log('All image assets are already fully optimized and up to date!');
  }

  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalCurrentBytes);
  const totalSavedMb = (totalSavedBytes / (1024 * 1024)).toFixed(2);
  const totalOriginalMb = (totalOriginalBytes / (1024 * 1024)).toFixed(2);
  const totalCurrentMb = (totalCurrentBytes / (1024 * 1024)).toFixed(2);

  console.log('='.repeat(95));
  console.log(`TOTAL IMAGES CHECKED   : ${allResults.length}`);
  console.log(`TOTAL ACTIVE ASSET SIZE: ${totalCurrentMb} MB`);
  console.log(`ALL SIBLINGS & WEBP    : SYNCHRONIZED`);
  console.log('==============================================\n');
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = { compressImageFile, walkDirectory, TARGET_DIRS };
