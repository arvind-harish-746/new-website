/**
 * Short glass hit plus a whoosh. Oscillators and a noise buffer only —
 * nothing is fetched, and any video element stays muted.
 */
export function playGlass(ctx: AudioContext) {
  const now = ctx.currentTime;
  const burst = 0.32;
  const count = Math.floor(ctx.sampleRate * burst);
  const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < count; i += 1) {
    const t = i / ctx.sampleRate;
    const env = Math.exp(-t * 22) * (1 - Math.exp(-t * 90));
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(2200, now);
  bandpass.frequency.exponentialRampToValueAtTime(480, now + 0.28);
  bandpass.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.42, now + 0.012);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  noise.connect(bandpass);
  bandpass.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + burst);

  [640, 980, 1510, 2140, 2890].forEach((freq, index) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    const gain = ctx.createGain();
    const peak = 0.1 / (1 + index * 0.4);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26 + index * 0.02);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  });

  const whooshLen = 0.42;
  const whooshCount = Math.floor(ctx.sampleRate * whooshLen);
  const whooshBuffer = ctx.createBuffer(1, whooshCount, ctx.sampleRate);
  const whooshData = whooshBuffer.getChannelData(0);
  for (let i = 0; i < whooshCount; i += 1) whooshData[i] = Math.random() * 2 - 1;
  const whoosh = ctx.createBufferSource();
  whoosh.buffer = whooshBuffer;
  const whooshFilter = ctx.createBiquadFilter();
  whooshFilter.type = "bandpass";
  whooshFilter.Q.value = 1.1;
  whooshFilter.frequency.setValueAtTime(220, now + 0.04);
  whooshFilter.frequency.exponentialRampToValueAtTime(2600, now + 0.2);
  whooshFilter.frequency.exponentialRampToValueAtTime(540, now + 0.4);
  const whooshGain = ctx.createGain();
  whooshGain.gain.setValueAtTime(0.0001, now);
  whooshGain.gain.exponentialRampToValueAtTime(0.22, now + 0.1);
  whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  whoosh.connect(whooshFilter);
  whooshFilter.connect(whooshGain);
  whooshGain.connect(ctx.destination);
  whoosh.start(now);
  whoosh.stop(now + whooshLen);
}
