class SoundManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window !== 'undefined' && !this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!muted && this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playTick(urgency: number = 0) {
    if (this.isMuted || !this.audioContext) return;
    this.resumeContext();

    const t = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Woodblock-ish sound
    osc.type = 'sine';
    // Pitch goes up with urgency (800Hz -> 1200Hz)
    osc.frequency.setValueAtTime(800 + (urgency * 400), t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playSuccess() {
    if (this.isMuted || !this.audioContext) return;
    this.resumeContext();

    const t = this.audioContext.currentTime;
    
    // Play a happy major chord arpeggio (C5, E5, G5)
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const startTime = t + (i * 0.05);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioContext!.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  public playExplosion() {
    if (this.isMuted || !this.audioContext) return;
    this.resumeContext();

    const t = this.audioContext.currentTime;
    const bufferSize = this.audioContext.sampleRate * 1.5; // 1.5 seconds
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // White noise
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const gain = this.audioContext.createGain();
    // Start loud and fade out
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);

    // Lowpass filter to make it "boomy" not hissy
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.linearRampToValueAtTime(100, t + 1.0);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    noise.start(t);
  }

  public playFanfare() {
      // Victory fanfare? Maybe later.
  }

  private resumeContext() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

export const soundManager = new SoundManager();
