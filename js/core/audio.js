// 音：WebAudio のシンセ＋サンプラー（スーファミ風、同時発音16音まで）
// - 波形：sine / square / sawtooth / triangle / パルス25%・12.5% / オルガン / ノイズ / FM
// - エフェクト：リバーブ・ディレイ・フィルター・ビブラート
// - サンプル：assets/soundfont/ の楽器（FluidR3_GM から切り出したもの）。読み込み前は代わりのシンセで鳴る
import { SONGS } from './songs.js';

const MAX_VOICES = 16;
const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteNameToMidi(name) {
  const m = /^([A-G])(b|#)?(-?\d)$/.exec(name);
  if (!m) return null;
  let n = NOTE_INDEX[m[1]];
  if (m[2] === 'b') n -= 1;
  if (m[2] === '#') n += 1;
  return (parseInt(m[3], 10) + 1) * 12 + n;
}
const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------------- 楽器 ----------------
// env: [attack, decay, sustain(0..1), release]
export const INSTRUMENTS = {
  lead: { waves: ['square'], env: [0.01, 0.12, 0.65, 0.12], filter: { type: 'lowpass', freq: 4200, q: 1 }, vib: [5.5, 14, 0.18], gain: 0.13, rev: 0.25, dly: 0.18 },
  pulse: { waves: ['pulse25'], env: [0.01, 0.1, 0.6, 0.1], filter: { type: 'lowpass', freq: 5000, q: 0.7 }, vib: [6, 10, 0.2], gain: 0.13, rev: 0.2, dly: 0.15 },
  flute: { waves: ['triangle', 'sine'], detune: [0, 1200], mix: [1, 0.25], env: [0.05, 0.1, 0.8, 0.2], vib: [5, 18, 0.25], gain: 0.22, rev: 0.4, dly: 0.25 },
  saw: { waves: ['sawtooth', 'sawtooth'], detune: [-7, 7], env: [0.01, 0.2, 0.55, 0.15], filter: { type: 'lowpass', freq: 2400, q: 2, env: 2400 }, gain: 0.1, rev: 0.2, dly: 0.1 },
  synbass: { waves: ['sawtooth', 'square'], detune: [0, -1200], mix: [1, 0.5], env: [0.005, 0.15, 0.6, 0.06], filter: { type: 'lowpass', freq: 700, q: 4, env: 1400 }, gain: 0.16, rev: 0.05 },
  tribass: { waves: ['triangle'], env: [0.005, 0.1, 0.8, 0.08], gain: 0.35, rev: 0.05 },
  pad: { waves: ['sawtooth', 'sawtooth', 'triangle'], detune: [-12, 12, 0], env: [0.45, 0.6, 0.75, 0.9], filter: { type: 'lowpass', freq: 1500, q: 0.8 }, gain: 0.06, rev: 0.6, dly: 0.2 },
  organ: { waves: ['organ'], env: [0.01, 0.1, 0.9, 0.1], gain: 0.12, rev: 0.3 },
  pluck: { waves: ['pulse12'], env: [0.002, 0.16, 0.0, 0.1], filter: { type: 'lowpass', freq: 3000, q: 1 }, gain: 0.14, rev: 0.25, dly: 0.25 },
  bell: { fm: { ratio: 3.51, index: 5, decay: 0.6 }, env: [0.002, 1.2, 0.0, 0.8], gain: 0.16, rev: 0.5, dly: 0.3 },
  epiano: { fm: { ratio: 1, index: 2.2, decay: 0.4 }, env: [0.003, 0.9, 0.25, 0.4], gain: 0.16, rev: 0.35 },
  powerchord: { waves: ['sawtooth', 'sawtooth', 'square'], detune: [0, 702, -1200], mix: [1, 0.8, 0.5], env: [0.005, 0.15, 0.7, 0.08], filter: { type: 'lowpass', freq: 2200, q: 3 }, drive: 3, gain: 0.07, rev: 0.15 },
  // サンプル楽器（読み込み前は fallback のシンセで鳴る）
  piano: { sample: 'piano', env: [0.004, 0, 1, 0.35], gain: 0.55, rev: 0.3, fallback: 'epiano' },
  strings: { sample: 'strings', env: [0.12, 0, 1, 0.5], gain: 0.42, rev: 0.5, fallback: 'pad' },
  brass: { sample: 'brass', env: [0.03, 0, 1, 0.2], gain: 0.45, rev: 0.3, fallback: 'saw' },
  ebass: { sample: 'bass', env: [0.004, 0, 1, 0.08], gain: 0.75, rev: 0.05, fallback: 'synbass' },
  guitar: { sample: 'guitar', env: [0.004, 0, 1, 0.08], gain: 0.4, rev: 0.15, fallback: 'powerchord' },
  warmpad: { sample: 'pad', env: [0.3, 0, 1, 0.8], gain: 0.4, rev: 0.55, fallback: 'pad' },
  harp: { sample: 'harp', env: [0.002, 0, 1, 0.6], gain: 0.5, rev: 0.45, dly: 0.15, fallback: 'pluck' },
  drums: { drums: true },
};

// ---------------- 高音質版（アレンジ）v2.1〜 ----------------
// 「せってい」の「音」で高音質を選ぶと、電子音の楽器を本物の楽器のサンプルに置きかえて、いくつか重ねて鳴らす。
// layers：[サンプル, オクターブ, 音量, 定位(左右)]。env：[attack, release]。読み込み前の楽器は電子音のまま鳴る
export const HQ_INSTRUMENTS = {
  lead: { layers: [['violin', 0, 0.5, 0], ['flute', 0, 0.22, 0.15]], env: [0.03, 0.35], rev: 0.4 },
  pulse: { layers: [['oboe', 0, 0.5, -0.1], ['pizz', 0, 0.18, 0.2]], env: [0.02, 0.3], rev: 0.35 },
  flute: { layers: [['flute', 0, 0.55, 0.1]], env: [0.05, 0.4], rev: 0.45 },
  saw: { layers: [['horn', 0, 0.45, -0.15], ['strings', 0, 0.3, 0.15]], env: [0.04, 0.35], rev: 0.4 },
  synbass: { layers: [['bass', 0, 0.75, 0], ['cello', 1, 0.12, 0]], env: [0.005, 0.12], rev: 0.08 },
  tribass: { layers: [['abass', 0, 0.85, 0]], env: [0.005, 0.15], rev: 0.1 },
  pad: { layers: [['strings', 0, 0.36, -0.25], ['choir', 0, 0.26, 0.25]], env: [0.35, 0.9], rev: 0.65 },
  organ: { layers: [['organ', 0, 0.38, 0]], env: [0.02, 0.4], rev: 0.5 },
  pluck: { layers: [['harp', 0, 0.45, -0.1], ['marimba', 0, 0.25, 0.15]], env: [0.002, 0.5], rev: 0.4 },
  bell: { layers: [['glock', 0, 0.45, 0.2]], env: [0.002, 1.2], rev: 0.55 },
  epiano: { layers: [['epiano', 0, 0.55, 0]], env: [0.003, 0.5], rev: 0.35 },
  powerchord: { layers: [['guitar', 0, 0.42, -0.2], ['brass', 0, 0.16, 0.2]], env: [0.005, 0.12], rev: 0.2 },
  piano: { layers: [['piano', 0, 0.6, 0]], env: [0.004, 0.5], rev: 0.4 },
  strings: { layers: [['strings', 0, 0.42, -0.2], ['cello', -1, 0.2, 0.2]], env: [0.15, 0.7], rev: 0.6 },
  brass: { layers: [['brass', 0, 0.42, -0.1], ['trumpet', 0, 0.22, 0.15]], env: [0.03, 0.3], rev: 0.4 },
  ebass: { layers: [['bass', 0, 0.75, 0]], env: [0.004, 0.1], rev: 0.06 },
  guitar: { layers: [['guitar', 0, 0.42, -0.15]], env: [0.004, 0.1], rev: 0.2 },
  warmpad: { layers: [['pad', 0, 0.32, -0.2], ['choir', 0, 0.24, 0.2]], env: [0.4, 1.0], rev: 0.65 },
  harp: { layers: [['harp', 0, 0.5, 0]], env: [0.002, 0.7], rev: 0.5 },
};
// アレンジ：ベースの音に合わせて、ストリングスとコーラスの和音（1オクターブ上の根音と5度）をそっと重ねる
const HQ_BASS = new Set(['synbass', 'tribass', 'ebass']);
const HQ_MAX_VOICES = 44;

// ---------------- MML ----------------
// o4 オクターブ / > < 上下 / l8 長さ / v12 音量(0-15) / q7 音の長さ(1-8) / r 休符 / c+ d- 半音 / ^ タイ
// (ceg) 和音 / [ ... ]4 くり返し / . 付点
export function parseMML(src) {
  const s = src.replace(/\|/g, ' ');
  let i = 0, oct = 4, len = 4, vel = 12, q = 7, t = 0;
  const events = [];
  const readNum = () => { const m = /^\d+/.exec(s.slice(i)); if (!m) return null; i += m[0].length; return parseInt(m[0], 10); };
  const readLen = () => {
    const n = readNum();
    let d = 4 / (n || len);
    let add = d / 2;
    while (s[i] === '.') { d += add; add /= 2; i++; }
    while (s[i] === '^') { i++; const n2 = readNum(); let d2 = 4 / (n2 || len); let a2 = d2 / 2; while (s[i] === '.') { d2 += a2; a2 /= 2; i++; } d += d2; }
    return d;
  };
  const readNote = () => {
    const c = s[i].toUpperCase(); i++;
    let n = NOTE_INDEX[c];
    while (s[i] === '+' || s[i] === '#' || s[i] === '-') { n += s[i] === '-' ? -1 : 1; i++; }
    return (oct + 1) * 12 + n;
  };
  const loopStack = [];
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    const lc = c.toLowerCase();
    if ('cdefgab'.includes(lc)) {
      const midi = readNote();
      const d = readLen();
      events.push({ t, d, notes: [midi], vel, q });
      t += d;
    } else if (lc === 'r') { i++; t += readLen(); }
    else if (lc === 'o') { i++; oct = readNum() ?? 4; }
    else if (c === '>') { i++; oct++; }
    else if (c === '<') { i++; oct--; }
    else if (lc === 'l') { i++; len = readNum() ?? 4; }
    else if (lc === 'v') { i++; vel = readNum() ?? 12; }
    else if (lc === 'q') { i++; q = readNum() ?? 7; }
    else if (c === '(') {
      i++;
      const notes = [];
      while (i < s.length && s[i] !== ')') {
        const ch = s[i];
        if ('cdefgabCDEFGAB'.includes(ch)) notes.push(readNote());
        else if (ch === '>') { oct++; i++; } else if (ch === '<') { oct--; i++; }
        else if (ch === 'o') { i++; oct = readNum() ?? oct; } else i++;
      }
      i++;
      const d = readLen();
      events.push({ t, d, notes, vel, q });
      t += d;
    } else if (c === '[') { i++; loopStack.push({ start: events.length, t0: t }); }
    else if (c === ']') {
      i++;
      const n = readNum() ?? 2;
      const lp = loopStack.pop();
      const body = events.slice(lp.start);
      const span = t - lp.t0;
      for (let k = 1; k < n; k++) for (const e of body) events.push({ ...e, t: e.t + span * k });
      t += span * (n - 1);
    } else i++;
  }
  return { events, length: t };
}

function compileSong(song) {
  const tracks = song.tracks.map((tr) => ({ ...tr, ...parseMML(tr.mml) }));
  const len = song.length ?? Math.max(...tracks.map((t) => t.length));
  const all = [];
  tracks.forEach((tr, ti) => {
    if (tr.length <= 0) return;
    const reps = song.loop === false ? 1 : Math.max(1, Math.round(len / tr.length));
    for (let k = 0; k < reps; k++) for (const e of tr.events) {
      const tt = e.t + k * tr.length;
      if (tt < len - 1e-6) all.push({ ...e, t: tt, track: ti });
    }
  });
  all.sort((a, b) => a.t - b.t);
  return { ...song, tracks, events: all, len };
}

// ---------------- 本体 ----------------
export const audio = {
  ctx: null,
  ready: false,
  voices: [],
  banks: {},
  compiled: {},
  song: null,
  currentSong: null,
  settings: { bgm: 0.7, se: 0.8 },

  loadSettings() {
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem('alphamax.settings') || '{}')); } catch { /* 無視 */ }
  },
  saveSettings() {
    try { localStorage.setItem('alphamax.settings', JSON.stringify(this.settings)); } catch { /* 無視 */ }
    if (this.musicBus) this.musicBus.gain.value = this.settings.bgm;
    if (this.sfxBus) this.sfxBus.gain.value = this.settings.se;
  },

  // 最初のタップで呼ぶ（ブラウザの決まりで、操作の後でないと音が出せない）
  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    this.master = ctx.createGain(); this.master.gain.value = 0.9; this.master.connect(comp);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.settings.bgm; this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.settings.se; this.sfxBus.connect(this.master);
    // リバーブ
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.4, 2.8);
    this.reverbIn = ctx.createGain(); this.reverbIn.gain.value = 0.6;
    this.reverbIn.connect(this.reverb); this.reverb.connect(this.master);
    // 高音質版の広いホールの響き（前に少し間をあけ、高い音をやわらげる）
    this.hall = ctx.createConvolver();
    this.hall.buffer = this.makeHall(3.6);
    this.hallIn = ctx.createGain(); this.hallIn.gain.value = 0.55;
    const pre = ctx.createDelay(0.1); pre.delayTime.value = 0.025;
    const hlp = ctx.createBiquadFilter(); hlp.type = 'lowpass'; hlp.frequency.value = 6500;
    this.hallIn.connect(pre); pre.connect(this.hall); this.hall.connect(hlp); hlp.connect(this.master);
    // ディレイ
    this.delay = ctx.createDelay(1.0); this.delay.delayTime.value = 0.32;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500;
    this.delayIn = ctx.createGain(); this.delayIn.gain.value = 0.5;
    this.delayIn.connect(this.delay); this.delay.connect(lp); lp.connect(fb); fb.connect(this.delay); lp.connect(this.master);
    // 波形
    this.waves = {
      pulse25: this.pulseWave(0.25),
      pulse12: this.pulseWave(0.125),
      organ: this.harmonicWave([1, 0.8, 0.5, 0.35, 0, 0.25, 0, 0.15]),
    };
    this.noise = this.makeNoise(1.5);
    this.driveCurve = this.makeDrive(3);
    this.ready = true;
    this.banksReady = this.loadBanks();
    if (this.pendingSong) { const p = this.pendingSong; this.pendingSong = null; this.playSong(p); }
  },

  makeImpulse(sec, decay) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  },
  // ホールの響き：左右で少しずつ違う、なめらかに消えていく響き
  makeHall(sec) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const x = i / n;
        lp += ((Math.random() * 2 - 1) - lp) * (0.35 + 0.6 * (1 - x)); // 後ろほど高い音が消える
        const early = i < ctx.sampleRate * 0.08 && Math.random() < 0.004 ? (Math.random() * 2 - 1) * 1.5 : 0;
        d[i] = (lp + early) * Math.exp(-x * 5.2);
      }
    }
    return buf;
  },
  makeNoise(sec) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },
  makeDrive(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = Math.tanh(x * k); }
    return c;
  },
  pulseWave(duty) {
    const N = 64, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return this.ctx.createPeriodicWave(re, im);
  },
  harmonicWave(h) {
    const re = new Float32Array(h.length + 1), im = new Float32Array(h.length + 1);
    h.forEach((v, i) => { im[i + 1] = v; });
    return this.ctx.createPeriodicWave(re, im);
  },

  async loadBanks() {
    try {
      const res = await fetch('assets/soundfont/index.json');
      const index = await res.json();
      const jobs = [];
      for (const [bank, info] of Object.entries(index)) {
        if (this.banks[bank]) continue; // 読み込み済み・読み込み中
        if (info.hq && !this.hq) continue; // 高音質版の楽器は、高音質を選んだときだけ
        this.banks[bank] = { notes: [], loaded: false };
        for (const name of info.notes) jobs.push({ bank, name });
      }
      const run = async () => {
        while (jobs.length) {
          const { bank, name } = jobs.shift();
          try {
            const r = await fetch(`assets/soundfont/${bank}/${name}.mp3`);
            const ab = await r.arrayBuffer();
            const buf = await new Promise((ok, ng) => this.ctx.decodeAudioData(ab, ok, ng));
            this.banks[bank].notes.push({ midi: noteNameToMidi(name), buf });
            this.banks[bank].notes.sort((a, b) => a.midi - b.midi);
            this.banks[bank].loaded = true;
          } catch { /* 読めない音は飛ばす（シンセで代わりに鳴る） */ }
        }
      };
      await Promise.all([run(), run(), run(), run()]);
    } catch { /* サンプルが無くてもシンセで鳴る */ }
  },

  // 同時発音数の管理：16音を超えたら一番古い音を止める
  get hq() { return this.settings.sound === 'hq'; },
  allocVoice(start, end) {
    const now = this.ctx.currentTime;
    this.voices = this.voices.filter((v) => v.end > now);
    while (this.voices.length >= (this.hq ? HQ_MAX_VOICES : MAX_VOICES)) {
      this.voices.sort((a, b) => a.start - b.start);
      const old = this.voices.shift();
      old.kill(Math.max(now, start - 0.01));
    }
    const v = { start, end, nodes: [], kill: null };
    this.voices.push(v);
    return v;
  },

  // 出力の配線（ドライ＋リバーブ＋ディレイへの送り）
  route(node, bus, rev = 0, dly = 0, pan = 0) {
    const ctx = this.ctx;
    let out = node;
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); out = p; }
    out.connect(bus);
    if (rev > 0) { const g = ctx.createGain(); g.gain.value = rev; out.connect(g); g.connect(this.reverbIn); }
    if (dly > 0) { const g = ctx.createGain(); g.gain.value = dly; out.connect(g); g.connect(this.delayIn); }
  },

  playNote(instName, midi, time, dur, vel = 1, bus = this.musicBus, pan = 0) {
    if (!this.ready) return;
    let inst = INSTRUMENTS[instName] || INSTRUMENTS.lead;
    if (inst.drums) { this.playDrum(midi, time, vel, bus); return; }
    if (inst.sample) {
      const bank = this.banks[inst.sample];
      if (bank?.loaded && bank.notes.length) { this.playSample(inst, bank, midi, time, dur, vel, bus, pan); return; }
      inst = INSTRUMENTS[inst.fallback] || INSTRUMENTS.lead;
    }
    const ctx = this.ctx;
    const [a, d, s, r] = inst.env;
    const end = time + dur + r;
    const v = this.allocVoice(time, end);
    const env = ctx.createGain();
    const peak = inst.gain * vel;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(peak, time + a);
    env.gain.setTargetAtTime(peak * s, time + a, Math.max(0.01, d / 3));
    env.gain.setValueAtTime(peak * s, time + Math.max(dur, a));
    env.gain.setTargetAtTime(0, time + Math.max(dur, a), Math.max(0.01, r / 4));
    let head = env;
    if (inst.filter) {
      const f = ctx.createBiquadFilter();
      f.type = inst.filter.type; f.Q.value = inst.filter.q ?? 1;
      const base = inst.filter.freq;
      if (inst.filter.env) {
        f.frequency.setValueAtTime(base + inst.filter.env, time);
        f.frequency.setTargetAtTime(base, time + 0.005, 0.08);
      } else f.frequency.value = base;
      f.connect(env);
      head = f;
    }
    if (inst.drive) { const ws = ctx.createWaveShaper(); ws.curve = this.driveCurve; ws.connect(head); head = ws; }
    const freq = midiFreq(midi);
    const oscs = [];
    if (inst.fm) {
      const car = ctx.createOscillator(); car.frequency.value = freq;
      const mod = ctx.createOscillator(); mod.frequency.value = freq * inst.fm.ratio;
      const mg = ctx.createGain();
      mg.gain.setValueAtTime(freq * inst.fm.index, time);
      mg.gain.setTargetAtTime(freq * inst.fm.index * 0.15, time, inst.fm.decay);
      mod.connect(mg); mg.connect(car.frequency);
      car.connect(head);
      oscs.push(car, mod);
    } else {
      inst.waves.forEach((w, i) => {
        const o = ctx.createOscillator();
        if (this.waves[w]) o.setPeriodicWave(this.waves[w]); else o.type = w;
        o.frequency.value = freq;
        o.detune.value = inst.detune?.[i] ?? 0;
        let node = o;
        const mix = inst.mix?.[i];
        if (mix != null && mix !== 1) { const g = ctx.createGain(); g.gain.value = mix; o.connect(g); node = g; }
        node.connect(head);
        oscs.push(o);
      });
    }
    if (inst.vib) {
      const [rate, depth, delay] = inst.vib;
      const lfo = ctx.createOscillator(); lfo.frequency.value = rate;
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, time); lg.gain.linearRampToValueAtTime(depth, time + delay + 0.2);
      lfo.connect(lg);
      for (const o of oscs) lg.connect(o.detune);
      oscs.push(lfo);
    }
    this.route(env, bus, inst.rev, inst.dly, pan);
    for (const o of oscs) { o.start(time); o.stop(end + 0.05); }
    v.kill = (t) => { env.gain.cancelScheduledValues(t); env.gain.setTargetAtTime(0, t, 0.01); for (const o of oscs) { try { o.stop(t + 0.05); } catch { /* 無視 */ } } };
  },

  // 高音質版：サンプルを重ねて鳴らす（読み込み前の楽器は電子音で鳴らす）
  playNoteHQ(instName, midi, time, dur, vel = 1, bus = this.musicBus, pan = 0) {
    const hq = HQ_INSTRUMENTS[instName];
    if (!hq || INSTRUMENTS[instName]?.drums) { this.playNote(instName, midi, time, dur, vel, bus, pan); return; }
    let played = false;
    for (const [bankName, oct, g, p] of hq.layers) {
      const bank = this.banks[bankName];
      if (!bank?.loaded || !bank.notes.length) continue;
      const inst = { env: [hq.env[0], 0, 1, hq.env[1]], gain: g, rev: 0, dly: 0 };
      this.playSample(inst, bank, midi + oct * 12, time, dur, vel, bus, Math.max(-1, Math.min(1, pan + p)), hq.rev);
      played = true;
    }
    if (!played) this.playNote(instName, midi, time, dur, vel, bus, pan);
  },

  playSample(inst, bank, midi, time, dur, vel, bus, pan, hall = 0) {
    const ctx = this.ctx;
    let best = bank.notes[0];
    for (const n of bank.notes) if (Math.abs(n.midi - midi) < Math.abs(best.midi - midi)) best = n;
    const [a, , , r] = inst.env;
    const end = time + dur + r;
    const v = this.allocVoice(time, end);
    const src = ctx.createBufferSource();
    src.buffer = best.buf;
    src.playbackRate.value = Math.pow(2, (midi - best.midi) / 12);
    const env = ctx.createGain();
    const peak = inst.gain * vel;
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(peak, time + a);
    env.gain.setValueAtTime(peak, time + Math.max(dur, a));
    env.gain.setTargetAtTime(0, time + Math.max(dur, a), Math.max(0.01, r / 4));
    src.connect(env);
    this.route(env, bus, inst.rev, inst.dly, pan);
    if (hall > 0) { const hg = this.ctx.createGain(); hg.gain.value = hall; env.connect(hg); hg.connect(this.hallIn); }
    src.start(time);
    src.stop(end + 0.05);
    v.kill = (t) => { env.gain.cancelScheduledValues(t); env.gain.setTargetAtTime(0, t, 0.01); try { src.stop(t + 0.05); } catch { /* 無視 */ } };
  },

  // ドラム（音名で種類が変わる）：C=バスドラ D=スネア E=ハイハット F=オープンハット G=低いタム A=高いタム B=シンバル
  playDrum(midi, time, vel, bus) {
    const ctx = this.ctx;
    const kind = ((midi % 12) + 12) % 12;
    const len = { 0: 0.35, 2: 0.22, 4: 0.06, 5: 0.3, 7: 0.35, 9: 0.28, 11: 1.4 }[kind] ?? 0.2;
    const v = this.allocVoice(time, time + len);
    const out = ctx.createGain();
    out.gain.value = vel;
    const nodes = [];
    const noiseHit = (type, freq, q, gain, dur) => {
      const src = ctx.createBufferSource(); src.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, time); g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(time, Math.random() * 0.5); src.stop(time + dur + 0.02);
      nodes.push(src);
    };
    const toneHit = (f0, f1, gain, dur, type = 'sine') => {
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, time); o.frequency.exponentialRampToValueAtTime(f1, time + dur * 0.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, time); g.gain.exponentialRampToValueAtTime(0.001, time + dur);
      o.connect(g); g.connect(out);
      o.start(time); o.stop(time + dur + 0.02);
      nodes.push(o);
    };
    let rev = 0.08;
    if (kind === 0 && this.hq) { toneHit(120, 38, 1.0, 0.45); toneHit(900, 120, 0.12, 0.03, 'triangle'); noiseHit('lowpass', 900, 1, 0.12, 0.03); }
    else if (kind === 0) { toneHit(160, 42, 0.9, 0.32); noiseHit('lowpass', 1200, 1, 0.15, 0.02); }
    else if (kind === 2) { toneHit(220, 160, 0.35, 0.12, 'triangle'); noiseHit('bandpass', 1900, 0.8, 0.55, 0.2); rev = 0.18; }
    else if (kind === 4) noiseHit('highpass', 7500, 1, 0.22, 0.05);
    else if (kind === 5) noiseHit('highpass', 6500, 1, 0.2, 0.28);
    else if ((kind === 7 || kind === 9) && this.hq && this.banks.taiko?.loaded) {
      // 高音質版：タムは和太鼓のサンプル
      const bank = this.banks.taiko;
      this.playSample({ env: [0.002, 0, 1, 0.3], gain: 0.7 * vel }, bank, kind === 7 ? 41 : 47, time, 0.3, 1, bus, kind === 7 ? -0.2 : 0.2, 0.3);
      return;
    }
    else if (kind === 7) { toneHit(130, 80, 0.6, 0.35); rev = 0.2; }
    else if (kind === 9) { toneHit(200, 130, 0.5, 0.28); rev = 0.2; }
    else if (kind === 11) { noiseHit('highpass', 4500, 0.6, 0.3, 1.3); rev = 0.3; }
    else noiseHit('bandpass', 3000, 1, 0.3, 0.1);
    this.route(out, bus, rev, 0);
    v.kill = (t) => { out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0, t, 0.01); };
  },

  // ---------------- 曲の再生 ----------------
  playSong(name, { restart = false } = {}) {
    if (!this.ready) { this.pendingSong = name; return; }
    if (this.currentSong === name && !restart && this.song) return;
    this.stopSong(0.3);
    const def = SONGS[name];
    if (!def) return;
    const c = (this.compiled[name] ||= compileSong(def));
    this.currentSong = name;
    const gain = this.ctx.createGain();
    gain.gain.value = 1;
    gain.connect(this.musicBus);
    this.song = { c, idx: 0, loop: 0, start: this.ctx.currentTime + 0.08, gain, name };
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  },

  stopSong(fade = 0.5) {
    clearInterval(this.timer);
    this.timer = null;
    const s = this.song;
    this.song = null;
    this.currentSong = null;
    if (s && this.ctx) {
      const t = this.ctx.currentTime;
      s.gain.gain.setTargetAtTime(0, t, Math.max(0.01, fade / 3));
      for (const v of this.voices) if (v.song === s) v.kill(t + fade);
      setTimeout(() => s.gain.disconnect(), fade * 1000 + 600);
    }
  },

  tick() {
    const s = this.song;
    if (!s || !this.ctx) return;
    const spb = 60 / s.c.bpm;
    const horizon = this.ctx.currentTime + 0.18;
    for (let guard = 0; guard < 512; guard++) {
      const ev = s.c.events[s.idx];
      if (!ev) break;
      const at = s.start + (s.loop * s.c.len + ev.t) * spb;
      if (at > horizon) break;
      if (at >= this.ctx.currentTime - 0.03) {
        const tr = s.c.tracks[ev.track];
        const dur = ev.d * spb * (ev.q / 8);
        const vel = (ev.vel / 15) * (tr.vol ?? 1);
        const hq = this.hq;
        for (const n of ev.notes) {
          const m = n + (tr.transpose || 0);
          if (hq) {
            // 高音質版：少しだけ人が弾いたようなゆれ（タイミングと強さ）
            const hAt = at + (Math.random() - 0.5) * 0.012, hv = vel * (0.92 + Math.random() * 0.12);
            this.playNoteHQ(tr.inst, m, hAt, dur, hv, s.gain, tr.pan || 0);
          } else this.playNote(tr.inst, m, at, dur, vel, s.gain, tr.pan || 0);
          const v = this.voices[this.voices.length - 1];
          if (v && !v.song) v.song = s;
        }
        // アレンジ：ベースの音に、ストリングスとコーラスの和音をそっと重ねる（長い音だけ）
        if (hq && HQ_BASS.has(tr.inst) && ev.d >= 1 && ev.notes.length) {
          const root = ev.notes[0] + (tr.transpose || 0);
          for (const [bankName, iv, g, p] of [['strings', 12, 0.12, -0.3], ['strings', 19, 0.09, 0.3], ['choir', 24, 0.07, 0]]) {
            const bank = this.banks[bankName];
            if (!bank?.loaded) continue;
            this.playSample({ env: [0.4, 0, 1, 0.9], gain: g }, bank, root + iv, at, ev.d * spb, vel, s.gain, p, 0.7);
          }
        }
      }
      s.idx++;
      if (s.idx >= s.c.events.length) {
        if (s.c.loop === false) { const name = s.name; setTimeout(() => { if (this.song === s) { this.song = null; this.currentSong = null; clearInterval(this.timer); this.onSongEnd?.(name); } }, (at - this.ctx.currentTime + 1) * 1000); break; }
        s.idx = 0; s.loop++;
      }
    }
  },

  // ---------------- 効果音 ----------------
  sfx(name) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime + 0.005, bus = this.sfxBus;
    const tone = (type, f0, f1, dur, gain, delay = 0, rev = 0.1) => {
      const st = t + delay;
      const v = this.allocVoice(st, st + dur);
      const o = ctx.createOscillator();
      if (this.waves[type]) o.setPeriodicWave(this.waves[type]); else o.type = type;
      o.frequency.setValueAtTime(f0, st);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), st + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, st); g.gain.exponentialRampToValueAtTime(0.001, st + dur);
      o.connect(g); this.route(g, bus, rev);
      o.start(st); o.stop(st + dur + 0.02);
      v.kill = (k) => { g.gain.cancelScheduledValues(k); g.gain.setTargetAtTime(0, k, 0.01); };
    };
    const noise = (type, freq, dur, gain, delay = 0, q = 1, sweep = 0, rev = 0.15) => {
      const st = t + delay;
      const v = this.allocVoice(st, st + dur);
      const src = ctx.createBufferSource(); src.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, st); f.Q.value = q;
      if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, sweep), st + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, st); g.gain.exponentialRampToValueAtTime(0.001, st + dur);
      src.connect(f); f.connect(g); this.route(g, bus, rev);
      src.start(st, Math.random()); src.stop(st + dur + 0.02);
      v.kill = (k) => { g.gain.cancelScheduledValues(k); g.gain.setTargetAtTime(0, k, 0.01); };
    };
    switch (name) {
      case 'cursor': tone('pulse25', 880, 880, 0.04, 0.08); break;
      case 'text': tone('pulse12', 1200, 1200, 0.02, 0.025, 0, 0); break;
      case 'ok': tone('pulse25', 660, 660, 0.05, 0.1); tone('pulse25', 990, 990, 0.08, 0.1, 0.05); break;
      case 'cancel': tone('pulse25', 520, 330, 0.1, 0.1); break;
      case 'error': tone('square', 160, 140, 0.15, 0.1); break;
      case 'buy': tone('sine', 1320, 1320, 0.08, 0.15); tone('sine', 1760, 1760, 0.2, 0.15, 0.07); break;
      case 'step': noise('lowpass', 400, 0.05, 0.05, 0, 1, 0, 0); break;
      case 'shot': noise('bandpass', 2400, 0.07, 0.35, 0, 1, 600); tone('square', 300, 80, 0.06, 0.1); break;
      case 'mg': for (let i = 0; i < 6; i++) { noise('bandpass', 2600, 0.05, 0.3, i * 0.07, 1.2, 700); } break;
      case 'cannon': noise('lowpass', 1800, 0.6, 0.9, 0, 0.7, 80, 0.3); tone('sine', 120, 40, 0.4, 0.7); break;
      case 'missile': noise('bandpass', 900, 0.7, 0.3, 0, 0.6, 3000, 0.2); tone('sawtooth', 200, 600, 0.5, 0.05); break;
      case 'beam': tone('sawtooth', 1800, 200, 0.5, 0.12, 0, 0.3); tone('square', 900, 120, 0.5, 0.08, 0.02, 0.3); break;
      case 'laser': tone('square', 2200, 600, 0.12, 0.1); tone('square', 2000, 500, 0.12, 0.08, 0.1); break;
      case 'flame': noise('bandpass', 700, 0.8, 0.5, 0, 0.5, 300, 0.2); break;
      case 'emp': tone('sine', 80, 1600, 0.4, 0.3, 0, 0.4); noise('highpass', 3000, 0.5, 0.2, 0.1); break;
      case 'explosion': noise('lowpass', 1400, 0.9, 1.0, 0, 0.7, 60, 0.35); tone('sine', 90, 30, 0.6, 0.8); break;
      case 'bigexplosion': noise('lowpass', 1600, 1.8, 1.0, 0, 0.6, 40, 0.5); tone('sine', 70, 25, 1.2, 0.9); noise('lowpass', 900, 1.2, 0.6, 0.25, 0.5, 40, 0.5); break;
      case 'hit': noise('lowpass', 2500, 0.15, 0.5, 0, 1, 300); tone('square', 180, 60, 0.1, 0.15); break;
      case 'metalhit': tone('triangle', 1400, 900, 0.18, 0.18); noise('highpass', 3500, 0.1, 0.3); break;
      case 'bite': noise('bandpass', 900, 0.12, 0.4, 0, 2, 300); tone('sawtooth', 220, 90, 0.12, 0.08); break;
      case 'press': tone('sine', 60, 30, 0.5, 1.0); noise('lowpass', 600, 0.5, 0.8, 0.02, 0.7, 60, 0.4); break;
      case 'drill': for (let i = 0; i < 8; i++) tone('sawtooth', 160 + i * 10, 140, 0.06, 0.08, i * 0.05); noise('bandpass', 1200, 0.5, 0.3, 0, 3); break;
      case 'miss': tone('sine', 900, 1800, 0.12, 0.08); break;
      case 'heal': [0, 4, 7, 12].forEach((s, i) => tone('triangle', 523 * Math.pow(2, s / 12), 523 * Math.pow(2, s / 12), 0.25, 0.12, i * 0.07, 0.4)); break;
      case 'repair': for (let i = 0; i < 4; i++) { tone('square', 700, 900, 0.05, 0.06, i * 0.12); noise('highpass', 4000, 0.04, 0.2, i * 0.12 + 0.03); } break;
      case 'levelup': [0, 4, 7, 12, 16].forEach((s, i) => tone('pulse25', 523 * Math.pow(2, s / 12), 523 * Math.pow(2, s / 12), 0.2, 0.12, i * 0.08, 0.3)); break;
      case 'encounter': for (let i = 0; i < 6; i++) tone('square', 300 + i * 150, 300 + i * 150, 0.06, 0.12, i * 0.05); noise('highpass', 2000, 0.4, 0.2, 0.3); break;
      case 'hatch': noise('bandpass', 500, 0.35, 0.3, 0, 2, 1500); tone('square', 120, 90, 0.2, 0.08, 0.3); break;
      case 'door': noise('bandpass', 700, 0.18, 0.25, 0, 2, 300); tone('triangle', 220, 180, 0.12, 0.08, 0.12); break;
      case 'warp': tone('sine', 300, 1200, 0.35, 0.12, 0, 0.4); break;
      case 'charge': tone('sawtooth', 100, 1600, 1.0, 0.1, 0, 0.4); tone('square', 200, 3200, 1.0, 0.05, 0, 0.4); break;
      case 'flee': [0, 1, 2].forEach((i) => tone('pulse25', 600 - i * 120, 500 - i * 120, 0.08, 0.1, i * 0.08)); break;
      case 'save': [0, 7, 12].forEach((s, i) => tone('sine', 660 * Math.pow(2, s / 12), 660 * Math.pow(2, s / 12), 0.3, 0.12, i * 0.1, 0.4)); break;
      case 'seal': [0, 5, 7, 12, 17, 19, 24].forEach((s, i) => tone('triangle', 262 * Math.pow(2, s / 12), 262 * Math.pow(2, s / 12), 0.6, 0.12, i * 0.12, 0.6)); break;
      default: break;
    }
  },
};
