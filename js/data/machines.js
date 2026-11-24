// 集められるマシンの表
// 第1章：仲間用の通常マシン3台（バランス・シャープ・重厚）＋シークレット「オメガ」＋伝説の機体「アルファ」
// 全体では通常マシン8〜10台＋特別な2台（アルファ・オメガ）が目標
// タイプはボディ（parts.js の mtype）で決まる。脚を替えると戦車型・バイク型などにもなる
// pilot: mechanic=メカニック専用 / any=誰でも乗れる
// start: 最初の置き場所 / owned: 最初から持っているか（false なら加入・発見イベントで手に入る）
export const MACHINES = {
  hound: {
    name: 'ハウンド',
    desc: 'レンが廃品を組み上げた相棒。バランスタイプ',
    pilot: 'any',
    owned: true,
    colors: { primary: 0xd9893a, secondary: 0x5a5f68, accent: 0xf0c040, glow: 0x7af0ff },
    parts: { head: 'head_sensor', body: 'body_balance', armR: 'arm_std', armL: 'arm_std', legs: 'legs_biped', engine: 'eng_turbo' },
    weapons: [{ id: 'mg7' }, null, { id: 'sc1' }, null, null],
    start: { type: 'garage', town: 'town1' },
  },
  falco: {
    name: 'ファルコ',
    desc: 'シオンの乗機。軽くて速いシャープタイプ',
    pilot: 'any',
    owned: false,
    colors: { primary: 0x2c416e, secondary: 0xe8eef5, accent: 0x7ad0ff, glow: 0x7af0ff },
    parts: { head: 'head_sharp', body: 'body_sharp', armR: 'arm_sharp', armL: 'arm_sharp', legs: 'legs_sharp', engine: 'eng_v6' },
    weapons: [{ id: 'lm1' }, { id: 'hblade' }, { id: 'hm1' }, null, null],
    start: { type: 'garage', town: 'town2' },
  },
  goliath: {
    name: 'ゴライアス',
    desc: 'ジーナの乗機。装甲の厚い重厚タイプ（戦車型）',
    pilot: 'any',
    owned: false,
    colors: { primary: 0x5a6438, secondary: 0x34362c, accent: 0xc0402c, glow: 0xffb04a },
    parts: { head: 'head_heavy', body: 'body_heavy', armR: 'arm_power', armL: 'arm_heavy', legs: 'legs_tread', engine: 'eng_heavy' },
    weapons: [{ id: 'v20' }, { id: 'gt1' }, { id: 'c75' }, null, null],
    start: { type: 'garage', town: 'town3' },
  },
  omega: {
    name: 'オメガ',
    desc: 'レンの家の地下に眠っていた漆黒の機体。アルファの兄弟機',
    pilot: 'any',
    owned: false,
    secret: true, // 初心者救済用のシークレットマシン（制限なしで誰でも乗れる）
    colors: { primary: 0x15161b, secondary: 0x2a2c33, accent: 0xc4cad4, glow: 0xff2a3a, dark: 0x0c0c10 },
    parts: { head: 'head_omega', body: 'body_omega', armR: 'arm_omega', armL: 'arm_omega', legs: 'legs_omega', engine: 'eng_omega' },
    weapons: [{ id: 'omega_storm' }, { id: 'lzblade' }, { id: 'omega_buster' }, { id: 'omega_nova' }, { id: 'hm2' }],
    start: { type: 'map', map: 'basement', x: 11, y: 4 },
    particle: 0xff3a4a,
  },
  alpha: {
    name: 'アルファ',
    desc: '伝説の機体。メカニック専用。封印が解けるたびに力を取り戻す',
    fixedName: true,
    pilot: 'mechanic',
    owned: false, // 第1章では修理中（封印で動かない）。グラインドタイタンを倒すと目覚める
    colors: { primary: 0xf2f2f6, secondary: 0xd8dce4, accent: 0xd8aa3a, glow: 0x9fe8ff, dark: 0x3a3e48 },
    brokenColors: { primary: 0x8a8478, secondary: 0x6e685e, accent: 0x6a5a3a, glow: 0x30383c, dark: 0x2a2a2a },
    parts: { head: 'head_alpha', body: 'body_alpha', armR: 'arm_alpha', armL: 'arm_alpha', legs: 'legs_alpha', engine: 'eng_alpha' },
    weapons: [{ id: 'lm1' }, { id: 'lzblade' }, { id: 'rg1' }, { id: 'hm1' }, null],
    start: { type: 'shop', town: 'town1' },
    particle: 0x9fe8ff,
    seal: [
      { name: '封印（起動できない）', mul: 0.6, glow: 0 },
      { name: '第一封印 解放', mul: 1.0, glow: 1.4 },
      { name: '第二封印 解放', mul: 1.3, glow: 2.0 },
      { name: '第三封印 解放', mul: 1.7, glow: 2.6 },
      { name: 'アルファマックス', mul: 2.5, glow: 3.6, finalName: 'アルファマックス' },
    ],
  },
};
