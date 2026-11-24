// サウンドフォント（FluidR3_GM, CC BY 3.0）から必要な楽器・音程だけを取得して
// assets/soundfont/<楽器>/<音名>.mp3 に保存する。
// 取得元: https://github.com/gleitz/midi-js-soundfonts （FluidR3_GM を mp3 に書き出したもの）
// 使い方: npm run soundfont
import { writeFileSync, mkdirSync } from 'node:fs';
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
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'soundfont');
const index = {};
let total = 0;
for (const [key, inst] of Object.entries(INSTRUMENTS)) {
  mkdirSync(join(out, key), { recursive: true });
  index[key] = { gm: inst.gm, notes: [] };
  for (let oct = inst.from; oct <= inst.to; oct++) {
    for (const n of NAMES) {
      if (oct === inst.to && n !== 'C') continue;
      const name = `${n}${oct}`;
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
