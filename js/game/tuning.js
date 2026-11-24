// バランス調整（開発者の部屋）。数値の表を上書きして、ブラウザ（localStorage）に保存する
// GitHub には書き込まない。「数値を書き出す」でテキストにして、Claude Code に貼って設定ファイルへ反映してもらう
import { WEAPONS, RANGES } from '../data/weapons.js';
import { FOOT_GEAR } from '../data/footgear.js';
import { PARTS } from '../data/parts.js';
import { ITEMS } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';

const KEY = 'alphamax.tuning';
export const TUNE_TABLES = {
  weapons: { name: 'マシンの武器', table: WEAPONS, file: 'js/data/weapons.js（WEAPONS）', fields: ['price', 'atk', 'hit', 'en', 'wt'] },
  foot: { name: '生身の装備（武器・防具・アクセサリー）', table: FOOT_GEAR, file: 'js/data/footgear.js（FOOT_GEAR）', fields: ['price', 'sell', 'atk', 'def', 'hit', 'eva', 'spd', 'hp', 'crit'] },
  parts: { name: 'マシンのパーツ', table: PARTS, file: 'js/data/parts.js（PARTS）', fields: ['price', 'armor', 'def', 'hit', 'eva', 'spd', 'wt', 'cap', 'en', 'atkMul'] },
  items: { name: '道具', table: ITEMS, file: 'js/data/items.js（ITEMS）', fields: ['price', 'amount'] },
  enemies: { name: '敵', table: ENEMIES, file: 'js/data/enemies.js（ENEMIES）', fields: ['hp', 'atk', 'def', 'hit', 'eva', 'spd', 'exp', 'gear'] },
};
export const FIELD_NAMES = { price: '値段', sell: '売値', atk: '攻撃', def: '防御', hit: '命中', eva: '回避', spd: '素早さ', hp: '体力', crit: '会心率', en: 'EN', wt: '重さ', armor: '装甲', cap: '積める重さ', atkMul: '攻撃倍率', amount: '効果量', exp: '経験値', gear: 'ギア' };

// 起動したときの値（＝初期値）
const DEFAULTS = {};
for (const [tk, t] of Object.entries(TUNE_TABLES)) {
  DEFAULTS[tk] = {};
  for (const [id, row] of Object.entries(t.table)) {
    DEFAULTS[tk][id] = {};
    for (const f of t.fields) if (typeof row[f] === 'number') DEFAULTS[tk][id][f] = row[f];
  }
}
let overrides = {};

function store() { try { localStorage.setItem(KEY, JSON.stringify(overrides)); } catch (e) { console.warn(e); } }
export function applyTuning() {
  try { overrides = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { overrides = {}; }
  for (const [tk, rows] of Object.entries(overrides)) {
    const t = TUNE_TABLES[tk];
    if (!t) continue;
    for (const [id, fs] of Object.entries(rows)) for (const [f, v] of Object.entries(fs)) if (t.table[id] && DEFAULTS[tk][id]?.[f] != null) t.table[id][f] = v;
  }
}
export const fieldsOf = (tk, id) => Object.keys(DEFAULTS[tk][id] || {});
export const defaultOf = (tk, id, f) => DEFAULTS[tk][id]?.[f];
export const isChanged = (tk, id, f) => overrides[tk]?.[id]?.[f] != null;
export const changedCount = (tk, id) => (id ? Object.keys(overrides[tk]?.[id] || {}).length : Object.values(overrides[tk] || {}).reduce((a, r) => a + Object.keys(r).length, 0));

export function setTuning(tk, id, f, v) {
  const t = TUNE_TABLES[tk];
  t.table[id][f] = v;
  if (v === DEFAULTS[tk][id][f]) {
    delete overrides[tk]?.[id]?.[f];
    if (overrides[tk]?.[id] && !Object.keys(overrides[tk][id]).length) delete overrides[tk][id];
  } else ((overrides[tk] ||= {})[id] ||= {})[f] = v;
  store();
}
export function resetTuning() {
  for (const [tk, rows] of Object.entries(DEFAULTS)) for (const [id, fs] of Object.entries(rows)) Object.assign(TUNE_TABLES[tk].table[id], fs);
  overrides = {};
  try { localStorage.removeItem(KEY); } catch { /* 何もしない */ }
}

// 変更した数値の一覧（Claude Code に貼る用）
export function exportTuning() {
  const d = new Date();
  const lines = [`# Alpha Max バランス調整の書き出し（${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}）`,
    'Claude Code へ：次の数値を設定ファイルに反映してください。', ''];
  let n = 0;
  for (const [tk, rows] of Object.entries(overrides)) {
    const t = TUNE_TABLES[tk];
    if (!t || !Object.keys(rows).length) continue;
    lines.push(`## ${t.name}：${t.file}`);
    for (const [id, fs] of Object.entries(rows)) {
      const row = t.table[id];
      const parts = Object.entries(fs).map(([f, v]) => {
        n++;
        let s = `${f}: ${DEFAULTS[tk][id][f]} → ${v}`;
        // マシンの武器は範囲のルール（weapons.js の RANGES）で atk・en を変えているので、表に書く値も添える
        if (tk === 'weapons' && !row.noRule && RANGES[row.target]) {
          const r = RANGES[row.target];
          if (f === 'atk') s += `（weapons.js に書く値 ${Math.round(v / r.atkRate)}）`;
          if (f === 'en' && r.enAdd) s += `（weapons.js に書く値 ${v - r.enAdd - Math.round((row.tier - 1) * 2)}）`;
        }
        return s;
      });
      lines.push(`- ${id}（${row.name}）：${parts.join('、')}`);
    }
    lines.push('');
  }
  if (!n) lines.push('（変更した数値はありません）');
  return lines.join('\n');
}
