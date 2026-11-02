// AudioWorklet (audio thread): downmix → windowed-sinc low-pass → fractional resample to 16 kHz → Int16,
// posted as 15,360-sample (0.96 s) frames. The filter cuts at 7.2 kHz with a ~2.5 kHz Hamming transition, so
// anything that would fold into VGGish's 125 Hz–7.5 kHz mel range (input above ~8.5 kHz) is in the stopband;
// taps scale with the input rate to keep that transition width constant in Hz.
const TARGET_RATE = 16000;
const FRAME = 15360;
const TAPS = 2 * Math.ceil((32 * sampleRate) / 48000);

function lowPass(cutoff) {
  const kernel = new Float32Array(TAPS);
  const mid = (TAPS - 1) / 2;
  let sum = 0;
  for (let k = 0; k < TAPS; k++) {
    const x = k - mid;
    const sinc = x === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x);
    kernel[k] = sinc * (0.54 - 0.46 * Math.cos((2 * Math.PI * k) / (TAPS - 1)));
    sum += kernel[k];
  }
  return kernel.map((v) => v / sum);
}

class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / TARGET_RATE;
    this.kernel = lowPass(Math.min(0.5, (0.45 * TARGET_RATE) / sampleRate));
    this.history = new Float32Array(TAPS);
    this.head = 0;
    this.prev = 0;
    this.t = 0; // position of the next output sample, in input samples after `prev`
    this.frame = new Int16Array(FRAME);
    this.filled = 0;
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels || channels.length === 0) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let x = 0;
      for (let c = 0; c < channels.length; c++) x += channels[c][i];
      this.history[this.head] = x / channels.length;
      let y = 0;
      for (let k = 0; k < TAPS; k++)
        y += this.kernel[k] * this.history[(this.head - k + TAPS) % TAPS];
      this.head = (this.head + 1) % TAPS;
      while (this.t < 1) {
        this.emit(this.prev + (y - this.prev) * this.t);
        this.t += this.step;
      }
      this.t -= 1;
      this.prev = y;
    }
    return true;
  }

  emit(sample) {
    const s = Math.max(-1, Math.min(1, sample));
    this.frame[this.filled++] = s < 0 ? s * 32768 : s * 32767;
    if (this.filled === FRAME) {
      this.port.postMessage(this.frame, [this.frame.buffer]);
      this.frame = new Int16Array(FRAME);
      this.filled = 0;
    }
  }
}

registerProcessor("pcm-processor", PcmProcessor);
