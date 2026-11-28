// 道具・素材・生身の装備
// use: hp=体力回復 / armor=装甲回復 / en=エネルギー回復 / maint=装甲＋エネルギー / revive=気絶から復帰 / allheal=全員まとめて / warp=町へ移動 / repel=敵よけ
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
  warpunit: { name: 'ワープユニット', use: 'warp', amount: 0, price: 120, desc: '一度行った町へ一瞬で移動する。ダンジョンの中なら、入口の外へ出るだけもできる（戦闘中は使えない）' },
  // 敵よけ：使ってから steps 歩のあいだ、敵に出会う確率が rate 倍になる（賞金首・ボスには効かない）
  repelS: { name: '敵よけスプレー', use: 'repel', amount: 500, rate: 0.3, price: 180, desc: '500歩のあいだ、敵に出会いにくくなる（出会う確率が3割に）' },
  repelL: { name: 'ジャミングユニット', use: 'repel', amount: 1200, rate: 0.1, price: 650, desc: '1200歩のあいだ、敵にほとんど出会わなくなる（出会う確率が1割に）' },
  megaheal: { name: 'メガリカバリー', use: 'allheal', amount: 9999, price: 5000, rare: true, desc: '全員の体力とマシンの装甲をまとめて全回復（ボス戦用）' },
};

// 敵を倒すと拾える素材。武器強化と改造に使う
export const MATERIALS = {
  scrap: { name: 'スクラップ', desc: 'マシンの残骸。機械系の敵からよく取れる' },
  bio: { name: '生体サンプル', desc: '宇宙生物の組織。生物系の敵から取れる' },
  cell: { name: 'エネルギーセル', desc: '乗っ取られた機械の動力。少しめずらしい' },
  alloy: { name: '硬化合金', desc: '頑丈な機械から取れる合金' },
  core: { name: '寄生コア', desc: '賞金首の体内にあった謎の核。強化の切り札' },
  relic: { name: '古代の結晶', desc: '光の惑星の遺跡で見つかる結晶。専用武器の進化に使うらしい（第5章）' },
};

// 生身の装備は js/data/footgear.js（武器・頭・体・手・足・アクセサリー）
export { FOOT_GEAR } from './footgear.js';
