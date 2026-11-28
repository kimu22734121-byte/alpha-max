// サウンドフォント（FluidR3_GM, CC BY 3.0）から必要な楽器・音程だけを取得して
// assets/soundfont/<楽器>/<音名>.mp3 に保存する。
// 取得元: https://github.com/gleitz/midi-js-soundfonts （FluidR3_GM を mp3 に書き出したもの）
// 使い方: npm run soundfont
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM';
// 4半音おき（C, E, A♭）に取り、間はピッチを変えて鳴らす
const NAMES = ['C', 'E', 'Ab'];
const INSTRUMENTS = {
  piano: { gm: 'acoustic_grand_piano', from: 2, to: 6 },
  strings: { gm: 'string_ensemble_1', from: 2, to: 6 },
  brass: { gm: 'brass_section', from: 2, to: 5 },
  bass: { gm: 'electric_bass_finger', from: 1, to: 4 },
  guitar: { gm: 'overdriven_guitar', from: 2, to: 5 },
  pad: { gm: 'pad_2_warm', from: 2, to: 5 },
  harp: { gm: 'orchestral_harp', from: 3, to: 6 },
  // 高音質版（アレンジ）で使う楽器（v2.1〜）。「せってい」の「音」で高音質を選んだときだけ読み込む
  flute: { gm: 'flute', from: 4, to: 7, hq: true },
  violin: { gm: 'violin', from: 3, to: 7, hq: true },
  horn: { gm: 'french_horn', from: 2, to: 5, hq: true },
  trumpet: { gm: 'trumpet', from: 3, to: 6, hq: true },
  choir: { gm: 'choir_aahs', from: 3, to: 6, hq: true },
  glock: { gm: 'glockenspiel', from: 5, to: 7, hq: true },
  marimba: { gm: 'marimba', from: 3, to: 6, hq: true },
  abass: { gm: 'acoustic_bass', from: 1, to: 4, hq: true },
  cello: { gm: 'cello', from: 2, to: 5, hq: true },
  timpani: { gm: 'timpani', from: 2, to: 4, hq: true },
  epiano: { gm: 'electric_piano_1', from: 2, to: 6, hq: true },
  oboe: { gm: 'oboe', from: 3, to: 6, hq: true },
  organ: { gm: 'church_organ', from: 2, to: 6, hq: true },
  pizz: { gm: 'pizzicato_strings', from: 2, to: 6, hq: true },
  taiko: { gm: 'taiko_drum', from: 2, to: 4, hq: true },
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'soundfont');
const index = {};
let total = 0;
for (const [key, inst] of Object.entries(INSTRUMENTS)) {
  mkdirSync(join(out, key), { recursive: true });
  index[key] = { gm: inst.gm, notes: [], ...(inst.hq ? { hq: true } : {}) };
  for (let oct = inst.from; oct <= inst.to; oct++) {
    for (const n of NAMES) {
      if (oct === inst.to && n !== 'C') continue;
      const name = `${n}${oct}`;
      const file = join(out, key, `${name}.mp3`);
      if (existsSync(file)) { index[key].notes.push(name); total += readFileSync(file).length; continue; } // 取得済み
      const res = await fetch(`${BASE}/${inst.gm}-mp3/${name}.mp3`);
      if (!res.ok) { console.warn(`skip ${inst.gm} ${name}: ${res.status}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(join(out, key, `${name}.mp3`), buf);
      index[key].notes.push(name);
      total += buf.length;
    }
  }
  console.log(`${key} (${inst.gm}): ${index[key].notes.length} 音`);
}
writeFileSync(join(out, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`合計 ${(total / 1024).toFixed(0)} KB`);
