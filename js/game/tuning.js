// バランス調整（開発者の部屋）。数値の表を上書きして、ブラウザ（localStorage）に保存する
// GitHub には書き込まない。「数値を書き出す」でテキストにして、Claude Code に貼って設定ファイルへ反映してもらう
// どの表を調整できるかは js/data/catalog.js（データの入口）から自動で決まる。新しく足したものも自動で調整画面に出る
import { RANGES } from '../data/weapons.js';
import { CATALOG } from '../data/catalog.js';

const KEY = 'alphamax.tuning';
// 表ごとに調整できる項目。row に無い項目は extra（種類ごと）に書いたものだけ足せる
// 'colors.primary' のような書き方は、入れ子の値（マシンの色）
const FIELDS = {
  machines: { fields: ['colors.primary', 'colors.secondary', 'colors.accent', 'colors.glow', 'glowK'] },
  weapons: { fields: ['price', 'atk', 'hit', 'en', 'wt', 'target', 'sealAtk.1', 'sealAtk.2', 'sealAtk.3', 'sealAtk.4', 'sealAtk.5'], extra: () => ['en'] },
  foot: {
    fields: ['price', 'sell', 'atk', 'def', 'hit', 'eva', 'spd', 'hp', 'crit', 'target'],
    extra: (row) => (row.slot === 'weapon' ? ['atk', 'hit', 'crit', 'target'] : row.slot === 'acc' ? ['atk', 'def', 'hit', 'eva', 'spd', 'hp', 'crit'] : ['def', 'eva', 'hp', 'spd']),
  },
  parts: {
    fields: ['price', 'armor', 'def', 'hit', 'eva', 'spd', 'wt', 'slots', 'maxSlots', 'cap', 'en', 'atkMul'],
    extra: (row) => ({ legs: ['spd', 'eva'], arm: ['hit', 'eva'], body: ['slots', 'maxSlots'], engine: ['cap', 'en'], head: ['hit'] }[row.slot] || []),
  },
  items: { fields: ['price', 'amount'] },
  enemies: { fields: ['hp', 'atk', 'def', 'hit', 'eva', 'spd', 'exp', 'gear'] },
};
export const TUNE_TABLES = Object.fromEntries(Object.entries(FIELDS).map(([k, f]) => [k, { ...CATALOG[k], ...f }]));
export const FIELD_NAMES = {
  price: '値段', sell: '売値', atk: '攻撃', def: '防御', hit: '命中', eva: '回避', spd: '素早さ・スピード', hp: '体力', crit: '会心率', en: 'EN（エネルギー消費・量）', wt: '重さ',
  armor: '装甲', cap: '積める重さ', atkMul: '攻撃倍率', amount: '効果量', exp: '経験値', gear: 'ギア', slots: '武器スロット数', maxSlots: '武器スロットの上限', target: '攻撃範囲',
  'sealAtk.1': '威力（第3章）', 'sealAtk.2': '威力（第4章）', 'sealAtk.3': '威力（第5章）', 'sealAtk.4': '威力（第6章）', 'sealAtk.5': '威力（第6章クリア後・最強）', 'colors.primary': '本体の色', 'colors.secondary': 'サブの色', 'colors.accent': 'アクセントの色', 'colors.glow': '光の色', glowK: '光の強さ',
};
export const CHOICES = { target: { one: '単体', group: 'グループ', all: '全体' } };
export const isColor = (f) => f.startsWith('colors.');
export const stepOf = (f) => (f === 'atkMul' || f === 'glowK' ? 0.05 : 1);

const getv = (row, f) => f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), row);
function setv(row, f, v) {
  const ks = f.split('.');
  let o = row;
  for (const k of ks.slice(0, -1)) o = (o[k] ||= {});
  if (v === undefined) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
}

// 起動したときの値（＝初期値）。null は「もともと無い項目」
const DEFAULTS = {};
function fieldList(tk, row) {
  const t = TUNE_TABLES[tk];
  const extra = t.extra ? t.extra(row) : [];
  return t.fields.filter((f) => {
    const v = getv(row, f);
    if (f === 'target') return (tk === 'weapons' && !row.modes) || row.slot === 'weapon';
    return typeof v === 'number' || extra.includes(f);
  });
}
for (const [tk, t] of Object.entries(TUNE_TABLES)) {
  DEFAULTS[tk] = {};
  for (const [id, row] of Object.entries(t.table)) {
    if (row.devOnly) continue;
    DEFAULTS[tk][id] = {};
    for (const f of fieldList(tk, row)) DEFAULTS[tk][id][f] = getv(row, f) ?? null;
  }
}
let overrides = {};

function store() { try { localStorage.setItem(KEY, JSON.stringify(overrides)); } catch (e) { console.warn(e); } }
export function applyTuning() {
  try { overrides = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { overrides = {}; }
  for (const [tk, rows] of Object.entries(overrides)) {
    const t = TUNE_TABLES[tk];
    if (!t) continue;
    for (const [id, fs] of Object.entries(rows)) for (const [f, v] of Object.entries(fs)) if (t.table[id] && f in (DEFAULTS[tk][id] || {})) setv(t.table[id], f, v);
  }
}
export const fieldsOf = (tk, id) => Object.keys(DEFAULTS[tk][id] || {});
export const defaultOf = (tk, id, f) => DEFAULTS[tk][id]?.[f];
export const valueOf = (tk, id, f) => {
  const v = getv(TUNE_TABLES[tk].table[id], f);
  return f === 'target' ? v || 'one' : v ?? 0;
};
export const isChanged = (tk, id, f) => overrides[tk]?.[id]?.[f] !== undefined;
export const changedCount = (tk, id) => (id ? Object.keys(overrides[tk]?.[id] || {}).length : Object.values(overrides[tk] || {}).reduce((a, r) => a + Object.keys(r).length, 0));
export const totalChanged = () => Object.keys(TUNE_TABLES).reduce((a, tk) => a + changedCount(tk), 0);

export function setTuning(tk, id, f, v) {
  const row = TUNE_TABLES[tk].table[id];
  const def = DEFAULTS[tk][id][f];
  const same = v === def || (def == null && (v === 0 || (f === 'target' && v === 'one')));
  setv(row, f, same && def == null ? undefined : v);
  if (same) {
    delete overrides[tk]?.[id]?.[f];
    if (overrides[tk]?.[id] && !Object.keys(overrides[tk][id]).length) delete overrides[tk][id];
  } else ((overrides[tk] ||= {})[id] ||= {})[f] = v;
  store();
}
export function resetTuning() {
  for (const [tk, rows] of Object.entries(DEFAULTS)) {
    for (const [id, fs] of Object.entries(rows)) for (const [f, v] of Object.entries(fs)) setv(TUNE_TABLES[tk].table[id], f, v == null ? undefined : v);
  }
  overrides = {};
  try { localStorage.removeItem(KEY); } catch { /* 何もしない */ }
}

export const showValue = (f, v) => (v == null ? '―' : isColor(f) ? `0x${Number(v).toString(16).padStart(6, '0')}` : CHOICES[f] ? CHOICES[f][v] || v : v);

// 変更した数値の一覧（Claude Code に貼る用）。37番のバランス調整・38番のロボット調整・41番のキャラ調整をまとめて書き出す
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
        let s = `${f}: ${showValue(f, DEFAULTS[tk][id][f])} → ${showValue(f, v)}`;
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
