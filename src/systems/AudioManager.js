import { AUDIO_FILES } from '../data/audio.js';

/**
 * AUDIO MANAGER
 * -------------
 * Musique et effets sonores synthétisés en temps réel (Web Audio API) : aucun fichier requis,
 * fonctionne hors ligne. Si des fichiers audio sont déclarés dans data/audio.js, ils sont
 * utilisés en priorité (les sons synthétisés restent en secours — aucun asset n'est supprimé).
 *
 * Réglages : musique ON/OFF, SFX ON/OFF, volumes.
 */

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** Pistes musicales génératives (gammes mineures, ambiance donjon). */
const TRACKS = {
  menu: {
    bpm: 72, root: 50, scale: [0, 2, 3, 5, 7, 8, 10],
    chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 10, 14]],
    arp: [0, 2, 4, 2, 1, 2, 4, 6], arpOct: 2, bass: [0, null, null, null, 0, null, -5, null], drums: null, pad: true, bell: 0.25,
  },
  dungeon: {
    bpm: 84, root: 45, scale: [0, 2, 3, 5, 7, 8, 11],
    chords: [[0, 3, 7], [5, 8, 12], [8, 12, 15], [7, 11, 14]],
    arp: [0, 1, 2, 1, 3, 2, 1, 2], arpOct: 2, bass: [0, null, 0, null, 7, null, 5, null], drums: 'soft', pad: true, bell: 0.15,
  },
  boss: {
    bpm: 132, root: 40, scale: [0, 1, 3, 5, 7, 8, 10],
    chords: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 2, 5]],
    arp: [0, 2, 1, 2, 0, 3, 1, 2], arpOct: 2, bass: [0, 0, 12, 0, 0, 0, 13, 0], drums: 'hard', pad: false, bell: 0,
  },
};

export class AudioManager {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.buffers = new Map();
    this.lastPlay = new Map();
    this.voices = 0;
    this.track = null;
    this.wantedTrack = null;
    this.step = 0;
    this.nextNoteTime = 0;
    this.timer = null;
    this.noiseBuffer = null;
    this.suspendedByVisibility = false;
  }

  get settings() {
    return this.game.state?.settings || { music: true, sfx: true, musicVolume: 0.5, sfxVolume: 0.8 };
  }

  /** À appeler lors d'un geste utilisateur (politique d'autoplay des navigateurs). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !this.suspendedByVisibility) this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(comp);
    this.sfxGain.connect(comp);
    // Réverbération simple pour la profondeur de la caverne
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.2, 2.5);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.28;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(comp);
    this.noiseBuffer = this.makeNoise();
    this.applySettings();
    this.loadFiles();
    if (this.wantedTrack) this.playMusic(this.wantedTrack, true);
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 1;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  async loadFiles() {
    for (const [key, url] of Object.entries(AUDIO_FILES)) {
      try {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        this.buffers.set(key, await this.ctx.decodeAudioData(arr));
      } catch {
        /* fichier absent : on garde le son synthétisé */
      }
    }
  }

  applySettings() {
    if (!this.ctx) return;
    const s = this.settings;
    const t = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(s.music ? s.musicVolume * 0.55 : 0, t, 0.1);
    this.sfxGain.gain.setTargetAtTime(s.sfx ? s.sfxVolume : 0, t, 0.05);
  }

  setPaused(paused) {
    if (!this.ctx) return;
    this.suspendedByVisibility = paused;
    if (paused) this.ctx.suspend();
    else this.ctx.resume();
  }

  // ------------------------------------------------------------------ synthèse
  env(gainNode, when, attack, peak, decay, sustain = 0, release = 0.05) {
    const g = gainNode.gain;
    g.cancelScheduledValues(when);
    g.setValueAtTime(0.0001, when);
    g.linearRampToValueAtTime(peak, when + attack);
    g.exponentialRampToValueAtTime(Math.max(0.0001, sustain || 0.0001), when + attack + decay);
    if (release) g.linearRampToValueAtTime(0.0001, when + attack + decay + release);
  }

  tone({ freq = 440, to = null, type = 'sine', when = 0, dur = 0.2, peak = 0.3, attack = 0.005, dest = this.sfxGain, filter = null, detune = 0, reverb = 0 }) {
    const ctx = this.ctx;
    const t = when || ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    osc.detune.value = detune;
    const g = ctx.createGain();
    this.env(g, t, attack, peak, dur);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.value = filter.freq || 2000;
      f.Q.value = filter.q || 1;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest);
    if (reverb) {
      const rg = ctx.createGain();
      rg.gain.value = reverb;
      g.connect(rg);
      rg.connect(this.reverb);
    }
    osc.start(t);
    osc.stop(t + attack + dur + 0.1);
    this.trackVoice(osc);
  }

  noise({ when = 0, dur = 0.2, peak = 0.3, freq = 1200, to = null, type = 'bandpass', q = 1, dest = this.sfxGain, attack = 0.003, reverb = 0 }) {
    const ctx = this.ctx;
    const t = when || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, attack, peak, dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    if (reverb) {
      const rg = ctx.createGain();
      rg.gain.value = reverb;
      g.connect(rg);
      rg.connect(this.reverb);
    }
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + dur + 0.1);
    this.trackVoice(src);
  }

  trackVoice(node) {
    this.voices++;
    node.onended = () => {
      this.voices--;
    };
  }

  // ------------------------------------------------------------------ effets sonores
  play(key, { volume = 1 } = {}) {
    if (!this.ctx || !this.settings.sfx || this.ctx.state !== 'running') return;
    const now = performance.now();
    if (now - (this.lastPlay.get(key) || 0) < 45) return;
    if (this.voices > 40) return;
    this.lastPlay.set(key, now);
    const buf = this.buffers.get(key);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = volume;
      src.connect(g);
      g.connect(this.sfxGain);
      src.start();
      return;
    }
    const fn = SFX[key];
    if (fn) fn(this, volume, this.ctx.currentTime);
  }

  // ------------------------------------------------------------------ musique
  playMusic(name, force = false) {
    if (!TRACKS[name]) name = name?.startsWith('boss') ? 'boss' : 'dungeon';
    this.wantedTrack = name;
    if (!this.ctx) return;
    if (this.track === name && !force) return;
    this.track = name;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.15;
    if (!this.timer) this.timer = setInterval(() => this.scheduler(), 30);
  }

  stopMusic() {
    this.track = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  scheduler() {
    if (!this.ctx || !this.track || this.ctx.state !== 'running') return;
    const tr = TRACKS[this.track];
    const stepDur = 60 / tr.bpm / 2; // croches
    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      this.scheduleStep(tr, this.step, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step++;
    }
  }

  scheduleStep(tr, step, t, sd) {
    if (!this.settings.music) return;
    const bar = Math.floor(step / 16) % tr.chords.length;
    const chord = tr.chords[bar];
    const s16 = step % 16;
    const dest = this.musicGain;
    const deg = (d) => {
      const n = tr.scale.length;
      const oct = Math.floor(d / n);
      return tr.scale[((d % n) + n) % n] + oct * 12;
    };
    // Nappe (pad) au début de chaque mesure
    if (tr.pad && s16 === 0) {
      for (const n of chord) {
        this.tone({ freq: NOTE(tr.root + 12 + n), type: 'sawtooth', when: t, dur: sd * 16, peak: 0.035, attack: 0.6, dest, filter: { freq: 900, q: 0.7 }, detune: (Math.random() - 0.5) * 12, reverb: 0.6 });
      }
    }
    // Basse
    const b = tr.bass[step % tr.bass.length];
    if (b !== null && b !== undefined) {
      this.tone({ freq: NOTE(tr.root - 12 + chord[0] + b), type: 'triangle', when: t, dur: sd * 1.8, peak: tr.drums === 'hard' ? 0.22 : 0.16, dest, filter: { freq: 500 } });
    }
    // Arpège
    if (step % 2 === 0 || tr.drums === 'hard') {
      const a = tr.arp[(step >> (tr.drums === 'hard' ? 0 : 1)) % tr.arp.length];
      const n = chord[a % chord.length] + (a >= chord.length ? 12 : 0);
      this.tone({ freq: NOTE(tr.root + 12 * tr.arpOct - 12 + n), type: tr.drums === 'hard' ? 'square' : 'triangle', when: t, dur: sd * 1.5, peak: tr.drums === 'hard' ? 0.035 : 0.05, dest, filter: { freq: 2400 }, reverb: 0.4 });
    }
    // Cloche mélodique occasionnelle
    if (tr.bell && s16 % 8 === 4 && Math.random() < tr.bell) {
      const d = Math.floor(Math.random() * 7) + 7;
      this.tone({ freq: NOTE(tr.root + 24 + deg(d)), type: 'sine', when: t, dur: 1.4, peak: 0.05, dest, reverb: 0.9 });
      this.tone({ freq: NOTE(tr.root + 36 + deg(d)), type: 'sine', when: t, dur: 0.8, peak: 0.015, dest, reverb: 0.9 });
    }
    // Percussions
    if (tr.drums === 'soft') {
      if (s16 === 0 || s16 === 8) this.tone({ freq: 90, to: 40, type: 'sine', when: t, dur: 0.35, peak: 0.25, dest });
      if (s16 === 12) this.noise({ when: t, dur: 0.12, peak: 0.04, freq: 4000, type: 'highpass', dest, reverb: 0.5 });
    } else if (tr.drums === 'hard') {
      if (s16 % 4 === 0) this.tone({ freq: 110, to: 38, type: 'sine', when: t, dur: 0.3, peak: 0.35, dest });
      if (s16 % 8 === 4) this.noise({ when: t, dur: 0.16, peak: 0.12, freq: 1800, dest, reverb: 0.3 });
      if (s16 % 2 === 1) this.noise({ when: t, dur: 0.05, peak: 0.03, freq: 8000, type: 'highpass', dest });
    }
  }
}

/** Recettes d'effets sonores synthétisés. */
const SFX = {
  click: (a, v, t) => a.tone({ freq: 900, to: 600, type: 'triangle', dur: 0.06, peak: 0.18 * v, when: t }),
  open: (a, v, t) => {
    a.tone({ freq: 400, to: 800, type: 'triangle', dur: 0.12, peak: 0.12 * v, when: t });
    a.noise({ freq: 2000, to: 5000, dur: 0.12, peak: 0.04 * v, when: t });
  },
  close: (a, v, t) => a.tone({ freq: 700, to: 350, type: 'triangle', dur: 0.1, peak: 0.12 * v, when: t }),
  error: (a, v, t) => {
    a.tone({ freq: 220, type: 'square', dur: 0.1, peak: 0.08 * v, when: t, filter: { freq: 1200 } });
    a.tone({ freq: 160, type: 'square', dur: 0.14, peak: 0.08 * v, when: t + 0.1, filter: { freq: 1200 } });
  },
  build: (a, v, t) => {
    a.tone({ freq: 120, to: 50, type: 'sine', dur: 0.25, peak: 0.5 * v, when: t });
    a.noise({ freq: 600, to: 200, dur: 0.3, peak: 0.25 * v, when: t, q: 0.7, reverb: 0.4 });
    a.noise({ freq: 3000, dur: 0.08, peak: 0.12 * v, when: t + 0.12, type: 'highpass' });
  },
  upgrade: (a, v, t) => [523, 659, 784].forEach((f, i) => a.tone({ freq: f, type: 'triangle', dur: 0.15, peak: 0.12 * v, when: t + i * 0.06, reverb: 0.3 })),
  levelup: (a, v, t) => [523, 659, 784, 1047].forEach((f, i) => {
    a.tone({ freq: f, type: 'square', dur: 0.18, peak: 0.06 * v, when: t + i * 0.07, filter: { freq: 3000 }, reverb: 0.4 });
    a.tone({ freq: f * 2, type: 'sine', dur: 0.2, peak: 0.04 * v, when: t + i * 0.07 });
  }),
  coins: (a, v, t) => [0, 0.05, 0.1].forEach((d, i) => {
    a.tone({ freq: 1800 + i * 300, type: 'sine', dur: 0.08, peak: 0.1 * v, when: t + d });
    a.tone({ freq: 2700 + i * 400, type: 'sine', dur: 0.06, peak: 0.05 * v, when: t + d + 0.02 });
  }),
  reward: (a, v, t) => [659, 784, 988, 1319].forEach((f, i) => a.tone({ freq: f, type: 'triangle', dur: 0.25, peak: 0.1 * v, when: t + i * 0.08, reverb: 0.5 })),
  chest: (a, v, t) => {
    a.noise({ freq: 300, to: 900, dur: 0.25, peak: 0.15 * v, when: t });
    [784, 988, 1175, 1568].forEach((f, i) => a.tone({ freq: f, type: 'sine', dur: 0.4, peak: 0.08 * v, when: t + 0.2 + i * 0.07, reverb: 0.7 }));
  },
  summon: (a, v, t) => {
    a.tone({ freq: 200, to: 1200, type: 'sawtooth', dur: 0.8, peak: 0.08 * v, when: t, filter: { freq: 1500, q: 4 }, reverb: 0.7 });
    a.noise({ freq: 400, to: 4000, dur: 0.9, peak: 0.08 * v, when: t, q: 3, reverb: 0.6 });
    [523, 784, 1047].forEach((f, i) => a.tone({ freq: f, type: 'triangle', dur: 0.5, peak: 0.08 * v, when: t + 0.7 + i * 0.05, reverb: 0.8 }));
  },
  evolve: (a, v, t) => {
    a.tone({ freq: 150, to: 900, type: 'sawtooth', dur: 1.2, peak: 0.06 * v, when: t, filter: { freq: 1800, q: 6 }, reverb: 0.8 });
    [523, 659, 784, 1047, 1319].forEach((f, i) => a.tone({ freq: f, type: 'triangle', dur: 0.6, peak: 0.08 * v, when: t + 1 + i * 0.06, reverb: 0.8 }));
  },
  hit: (a, v, t) => {
    a.noise({ freq: 1400, to: 400, dur: 0.09, peak: 0.25 * v, when: t, q: 0.8 });
    a.tone({ freq: 180, to: 90, type: 'sine', dur: 0.08, peak: 0.25 * v, when: t });
  },
  crit: (a, v, t) => {
    a.noise({ freq: 2400, to: 500, dur: 0.15, peak: 0.3 * v, when: t, q: 0.8 });
    a.tone({ freq: 260, to: 70, type: 'square', dur: 0.15, peak: 0.12 * v, when: t, filter: { freq: 1500 } });
    a.tone({ freq: 1600, type: 'sine', dur: 0.12, peak: 0.06 * v, when: t + 0.02 });
  },
  slash: (a, v, t) => a.noise({ freq: 3000, to: 800, dur: 0.1, peak: 0.18 * v, when: t, q: 1.5 }),
  arrow: (a, v, t) => a.noise({ freq: 5000, to: 1500, dur: 0.12, peak: 0.1 * v, when: t, q: 2 }),
  magic: (a, v, t) => {
    a.tone({ freq: 700, to: 1400, type: 'sine', dur: 0.2, peak: 0.1 * v, when: t, reverb: 0.5 });
    a.tone({ freq: 1050, to: 2100, type: 'sine', dur: 0.2, peak: 0.05 * v, when: t + 0.03, reverb: 0.5 });
  },
  fire: (a, v, t) => {
    a.noise({ freq: 800, to: 200, dur: 0.4, peak: 0.25 * v, when: t, q: 0.6, type: 'lowpass', reverb: 0.3 });
    a.tone({ freq: 90, to: 50, type: 'sawtooth', dur: 0.3, peak: 0.08 * v, when: t, filter: { freq: 400 } });
  },
  ice: (a, v, t) => {
    [2400, 3200, 2800].forEach((f, i) => a.tone({ freq: f, type: 'sine', dur: 0.15, peak: 0.06 * v, when: t + i * 0.03, reverb: 0.6 }));
    a.noise({ freq: 6000, dur: 0.2, peak: 0.08 * v, when: t, type: 'highpass' });
  },
  lightning: (a, v, t) => {
    a.noise({ freq: 3000, to: 300, dur: 0.35, peak: 0.3 * v, when: t, q: 0.5, reverb: 0.5 });
    a.tone({ freq: 60, to: 30, type: 'sawtooth', dur: 0.4, peak: 0.12 * v, when: t, filter: { freq: 300 } });
  },
  poison: (a, v, t) => [0, 0.06, 0.12].forEach((d) => a.tone({ freq: 300 + Math.random() * 200, to: 600, type: 'sine', dur: 0.06, peak: 0.08 * v, when: t + d })),
  shadow: (a, v, t) => a.tone({ freq: 220, to: 70, type: 'sawtooth', dur: 0.4, peak: 0.08 * v, when: t, filter: { freq: 700, q: 5 }, reverb: 0.6 }),
  holy: (a, v, t) => [880, 1109, 1319].forEach((f) => a.tone({ freq: f, type: 'sine', dur: 0.5, peak: 0.05 * v, when: t, reverb: 0.8 })),
  heal: (a, v, t) => [660, 880, 1100].forEach((f, i) => a.tone({ freq: f, type: 'sine', dur: 0.2, peak: 0.06 * v, when: t + i * 0.05, reverb: 0.6 })),
  death_hero: (a, v, t) => {
    a.tone({ freq: 400, to: 100, type: 'triangle', dur: 0.4, peak: 0.15 * v, when: t });
    a.noise({ freq: 900, to: 200, dur: 0.3, peak: 0.12 * v, when: t + 0.05 });
  },
  death_monster: (a, v, t) => a.tone({ freq: 200, to: 60, type: 'sawtooth', dur: 0.45, peak: 0.1 * v, when: t, filter: { freq: 800 } }),
  trap: (a, v, t) => {
    a.noise({ freq: 1500, dur: 0.05, peak: 0.25 * v, when: t, type: 'highpass' });
    a.tone({ freq: 140, to: 60, type: 'square', dur: 0.12, peak: 0.1 * v, when: t + 0.02, filter: { freq: 800 } });
  },
  trap_place: (a, v, t) => {
    a.tone({ freq: 600, type: 'square', dur: 0.05, peak: 0.08 * v, when: t, filter: { freq: 2000 } });
    a.tone({ freq: 900, type: 'square', dur: 0.05, peak: 0.08 * v, when: t + 0.07, filter: { freq: 2000 } });
  },
  synergy: (a, v, t) => {
    a.tone({ freq: 400, to: 1600, type: 'sawtooth', dur: 0.3, peak: 0.06 * v, when: t, filter: { freq: 2500, q: 5 }, reverb: 0.6 });
    a.noise({ freq: 2000, dur: 0.3, peak: 0.1 * v, when: t + 0.1, reverb: 0.4 });
  },
  raid_start: (a, v, t) => [392, 392, 523].forEach((f, i) => a.tone({ freq: f, type: 'sawtooth', dur: i === 2 ? 0.4 : 0.12, peak: 0.07 * v, when: t + i * 0.14, filter: { freq: 1800 }, reverb: 0.5 })),
  victory: (a, v, t) => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => a.tone({ freq: f, type: 'square', dur: i === 5 ? 0.6 : 0.15, peak: 0.06 * v, when: t + i * 0.11, filter: { freq: 3000 }, reverb: 0.5 })),
  defeat: (a, v, t) => [392, 349, 311, 262].forEach((f, i) => a.tone({ freq: f, type: 'triangle', dur: 0.35, peak: 0.1 * v, when: t + i * 0.2, reverb: 0.6 })),
  unlock: (a, v, t) => {
    a.tone({ freq: 100, to: 40, type: 'sine', dur: 0.6, peak: 0.4 * v, when: t });
    a.noise({ freq: 400, to: 100, dur: 0.8, peak: 0.2 * v, when: t, reverb: 0.8 });
    [262, 392, 523, 784].forEach((f, i) => a.tone({ freq: f, type: 'triangle', dur: 0.5, peak: 0.08 * v, when: t + 0.4 + i * 0.1, reverb: 0.7 }));
  },
  ascend: (a, v, t) => {
    a.tone({ freq: 100, to: 2000, type: 'sawtooth', dur: 2, peak: 0.06 * v, when: t, filter: { freq: 2000, q: 8 }, reverb: 1 });
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => a.tone({ freq: f, type: 'sine', dur: 1.2, peak: 0.07 * v, when: t + 1.5 + i * 0.1, reverb: 1 }));
  },
  equip: (a, v, t) => {
    a.noise({ freq: 4000, dur: 0.06, peak: 0.12 * v, when: t, type: 'highpass' });
    a.tone({ freq: 1200, type: 'triangle', dur: 0.1, peak: 0.08 * v, when: t + 0.04 });
  },
  fuse: (a, v, t) => {
    a.tone({ freq: 200, to: 800, type: 'sawtooth', dur: 0.5, peak: 0.06 * v, when: t, filter: { freq: 1500, q: 6 } });
    a.tone({ freq: 1047, type: 'triangle', dur: 0.4, peak: 0.1 * v, when: t + 0.5, reverb: 0.6 });
  },
  recycle: (a, v, t) => a.noise({ freq: 800, to: 3000, dur: 0.25, peak: 0.12 * v, when: t }),
  research: (a, v, t) => [440, 554, 659].forEach((f, i) => a.tone({ freq: f, type: 'sine', dur: 0.2, peak: 0.07 * v, when: t + i * 0.05, reverb: 0.5 })),
  research_done: (a, v, t) => [659, 880, 1109, 1319].forEach((f, i) => a.tone({ freq: f, type: 'triangle', dur: 0.3, peak: 0.08 * v, when: t + i * 0.08, reverb: 0.6 })),
  phase: (a, v, t) => {
    a.tone({ freq: 80, to: 40, type: 'sawtooth', dur: 0.9, peak: 0.2 * v, when: t, filter: { freq: 500 }, reverb: 0.8 });
    a.noise({ freq: 300, to: 80, dur: 1, peak: 0.2 * v, when: t, reverb: 0.8 });
  },
  boss_roar: (a, v, t) => {
    a.tone({ freq: 140, to: 60, type: 'sawtooth', dur: 1.1, peak: 0.18 * v, when: t, filter: { freq: 600, q: 3 }, reverb: 0.8 });
    a.noise({ freq: 500, to: 150, dur: 1.2, peak: 0.2 * v, when: t, q: 1, reverb: 0.8 });
  },
  explosion: (a, v, t) => {
    a.tone({ freq: 120, to: 30, type: 'sine', dur: 0.5, peak: 0.45 * v, when: t });
    a.noise({ freq: 1200, to: 100, dur: 0.6, peak: 0.3 * v, when: t, type: 'lowpass', reverb: 0.5 });
  },
};

export const SFX_KEYS = Object.keys(SFX);
