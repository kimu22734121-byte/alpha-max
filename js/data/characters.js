import { START_EQUIP } from './footgear.js';
// 仲間の表。base は Lv1 の値、grow は1レベルごとの上がり幅
export const CHARACTERS = {
  ren: {
    defaultName: 'レン',
    role: 'mechanic',
    roleName: 'メカニック',
    model: 'ren',
    desc: '辺境の修理屋。明るい機械オタク。戦闘中のマシン修理と改造が得意',
    base: { hp: 52, atk: 8, def: 6, hit: 8, eva: 6, spd: 7 },
    grow: { hp: 9, atk: 2, def: 1.8, hit: 1.4, eva: 1, spd: 1 },
    equip: START_EQUIP.ren,
    skill: { id: 'repair', name: '修理', desc: 'マシンの装甲をその場で直す' },
  },
  shion: {
    defaultName: 'シオン',
    role: 'pilot',
    roleName: 'パイロット',
    model: 'shion',
    desc: '元宇宙軍のエース。クールで無口だが腕は確か。命中と回避が高い',
    base: { hp: 46, atk: 7, def: 5, hit: 16, eva: 13, spd: 11 },
    grow: { hp: 8, atk: 1.8, def: 1.4, hit: 2.4, eva: 2, spd: 1.5 },
    equip: START_EQUIP.shion,
    skill: { id: 'snipe', name: '狙い撃ち', desc: '必ず当たり、会心が出やすい攻撃' },
  },
  gina: {
    defaultName: 'ジーナ',
    role: 'soldier',
    roleName: 'ソルジャー',
    model: 'gina',
    desc: '賞金稼ぎの傭兵。がっしりした体格の頼れる姉御肌。生身でも強い',
    base: { hp: 74, atk: 15, def: 10, hit: 6, eva: 4, spd: 6 },
    grow: { hp: 12, atk: 3, def: 2.4, hit: 1, eva: 0.8, spd: 0.8 },
    equip: START_EQUIP.gina,
    skill: { id: 'rampage', name: '猛攻', desc: '生身で強烈な一撃。マシンの時は威力1.5倍' },
  },
};

export const LEVEL = {
  max: 99, // 第1弾の上限（今後レアアイテムで999まで解放）
  hpMax: 999,
  // レベル L になるのに必要な累計経験値
  expFor(L) { return L <= 1 ? 0 : Math.round(9 * Math.pow(L - 1, 2.15) + 11 * (L - 1)); },
};
