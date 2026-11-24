// 集められるマシンの表（第1弾は2台。全部で8〜10台にする予定）
// type: walker=歩行戦車 / tank=タンク型 / bike=バイク型 / artillery=砲台型（今後追加）
// pilot: mechanic=メカニック専用 / any=誰でも乗れる
// seal: 伝説の機体の封印（ストーリーで解放される段階と、そのときの強化倍率）
export const MACHINES = {
  alpha: {
    name: 'アルファ',
    fixedName: true,
    type: 'walker',
    pilot: 'mechanic',
    colors: { primary: 0xe6e8ea, secondary: 0x9aa3ad, accent: 0xd8462a, glow: 0x5ff2ff },
    parts: { head: 'head_alpha', body: 'body_alpha', armR: 'arm_std', armL: 'arm_std', legs: 'legs_biped', engine: 'eng_alpha' },
    weapons: [{ id: 'mg7' }, null, { id: 'sc1' }, null, null],
    start: { type: 'garage', town: 'town1' },
    seal: [
      { name: '封印', mul: 1.0, glow: 0.25 },
      { name: '第一封印 解放', mul: 1.25, glow: 1.2 },
      { name: '第二封印 解放', mul: 1.5, glow: 1.8 },
      { name: '第三封印 解放', mul: 1.8, glow: 2.4 },
      { name: 'アルファマックス', mul: 2.5, glow: 3.5, finalName: 'アルファマックス' },
    ],
  },
  juggernaut: {
    name: 'ジャガーノート',
    type: 'walker',
    pilot: 'any',
    hidden: true, // 序盤の隠し場所にある初心者救済用の最強機体
    colors: { primary: 0x3d434b, secondary: 0x23272d, accent: 0xe0a020, glow: 0xff7a3a },
    parts: { head: 'head_heavy', body: 'body_jg', armR: 'arm_heavy', armL: 'arm_heavy', legs: 'legs_tread', engine: 'eng_jg' },
    weapons: [{ id: 'gt1' }, { id: 'mg7' }, { id: 'c75' }, { id: 'hm1' }, null],
    start: { type: 'map', map: 'field1', x: 53, y: 36 },
  },
};
