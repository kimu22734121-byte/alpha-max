// 道具・素材・生身の装備
// use: hp=体力回復 / armor=装甲回復 / en=エネルギー回復 / maint=装甲＋エネルギー / revive=気絶から復帰 / allheal=全員まとめて
// amount: 回復量（9999 は全回復）
export const ITEMS = {
  kitS: { name: '救急キットS', use: 'hp', amount: 40, price: 30, desc: '仲間1人の体力を40回復' },
  kitM: { name: '救急キットM', use: 'hp', amount: 120, price: 120, desc: '仲間1人の体力を120回復' },
  kitL: { name: '救急キットL', use: 'hp', amount: 9999, price: 480, desc: '仲間1人の体力を全回復' },
  repS: { name: '修理キットS', use: 'armor', amount: 60, price: 50, desc: 'マシン1台の装甲を60回復' },
  repM: { name: '修理キットM', use: 'armor', amount: 200, price: 200, desc: 'マシン1台の装甲を200回復' },
  repL: { name: '修理キットL', use: 'armor', amount: 9999, price: 800, desc: 'マシン1台の装甲を全回復' },
  batS: { name: 'バッテリーS', use: 'en', amount: 30, price: 60, desc: 'マシン1台のエネルギーを30回復' },
  batM: { name: 'バッテリーM', use: 'en', amount: 70, price: 220, desc: 'マシン1台のエネルギーを70回復' },
  batL: { name: 'バッテリーL', use: 'en', amount: 9999, price: 600, desc: 'マシン1台のエネルギーを全回復' },
  maint: { name: 'フルメンテキット', use: 'maint', amount: 9999, price: 1500, desc: 'マシン1台の装甲とエネルギーを全回復' },
  revive: { name: '気つけスプレー', use: 'revive', amount: 0.5, price: 300, desc: '気絶した仲間を体力半分で起こす' },
  megaheal: { name: 'メガリカバリー', use: 'allheal', amount: 9999, price: 5000, rare: true, desc: '全員の体力とマシンの装甲をまとめて全回復（ボス戦用）' },
};

// 敵を倒すと拾える素材。武器強化と改造に使う
export const MATERIALS = {
  scrap: { name: 'スクラップ', desc: 'マシンの残骸。機械系の敵からよく取れる' },
  bio: { name: '生体サンプル', desc: '宇宙生物の組織。生物系の敵から取れる' },
  cell: { name: 'エネルギーセル', desc: '乗っ取られた機械の動力。少しめずらしい' },
  alloy: { name: '硬化合金', desc: '頑丈な機械から取れる合金' },
  core: { name: '寄生コア', desc: '賞金首の体内にあった謎の核。強化の切り札' },
};

// 生身の武器・防具
export const FOOT_GEAR = {
  wrench: { name: 'モンキーレンチ', type: 'weapon', atk: 6, hit: 0, price: 0, desc: 'レン愛用の工具。殴るとけっこう痛い' },
  handgun: { name: 'ハンドガン', type: 'weapon', atk: 10, hit: 8, price: 300 },
  shotgun: { name: 'ショットガン', type: 'weapon', atk: 16, hit: -4, price: 900, target: 'group' },
  rifle: { name: 'アサルトライフル', type: 'weapon', atk: 18, hit: 2, price: 1400 },
  lblade: { name: 'レーザーブレード', type: 'weapon', atk: 24, hit: 4, price: 2800, elem: 'elec' },
  workwear: { name: '作業着', type: 'armor', def: 3, eva: 0, price: 0 },
  vest: { name: '防弾ベスト', type: 'armor', def: 7, eva: 0, price: 500 },
  pilotsuit: { name: 'パイロットスーツ', type: 'armor', def: 5, eva: 6, price: 1200 },
  heavyarmor: { name: 'ヘビーアーマー', type: 'armor', def: 12, eva: -3, price: 2400 },
};
