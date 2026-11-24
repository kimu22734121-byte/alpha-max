// 生身の装備（武器・頭・体・手・足・アクセサリー）
// slot: weapon / head / body / hands / feet / acc
// cat（武器だけ）: handgun / shotgun / rifle / sniper / laser / blade / rod / tool / bomb / heavy
// target: one=単体 / group=グループ / all=全体（無いときは単体）
// 数値: atk 攻撃 / def 防御 / hit 命中 / eva 回避 / spd 素早さ / hp 最大体力 / crit 会心率(%)
// tier: 強さの段階（1〜3＝第1章、4〜＝第2章以降のお店。7＝専用の最強装備）
// limited: お店では売らない限定品（宝箱・敵のドロップ）。from に入手先
// only: 装備できるキャラ（専用装備）。set: セット効果の名前（SETS）
// model: 手に持つ武器の3Dモデル（js/models/builders.js の fw_*）
export const FOOT_SLOTS = {
  weapon: { name: '武器', icon: '🔫' },
  head: { name: '頭', icon: '⛑' },
  body: { name: '体', icon: '🦺' },
  hands: { name: '手', icon: '🧤' },
  feet: { name: '足', icon: '👢' },
  acc: { name: 'アクセサリー', icon: '💍' },
};
export const FOOT_CATS = {
  handgun: { name: 'ハンドガン', model: 'fw_pistol' },
  shotgun: { name: 'ショットガン', model: 'fw_rifle' },
  rifle: { name: 'ライフル', model: 'fw_rifle' },
  sniper: { name: 'スナイパー', model: 'fw_rifle' },
  laser: { name: 'レーザーガン', model: 'fw_pistol' },
  blade: { name: 'ブレード', model: 'fw_blade' },
  rod: { name: 'スタンロッド', model: 'fw_rod' },
  tool: { name: '工具', model: 'fw_tool' },
  bomb: { name: '爆弾・ランチャー', model: 'fw_launcher' },
  heavy: { name: '重火器', model: 'fw_gatling' },
};

export const FOOT_GEAR = {
  // ================================================================ 武器（約20種類＋限定）
  // ---- 第1章
  wrench: { name: 'モンキーレンチ', slot: 'weapon', cat: 'tool', atk: 6, hit: 0, price: 0, tier: 1, desc: 'レン愛用の工具。殴るとけっこう痛い' },
  handgun: { name: 'ハンドガン', slot: 'weapon', cat: 'handgun', atk: 10, hit: 8, price: 300, tier: 1, desc: '扱いやすい拳銃' },
  stunrod: { name: 'スタンロッド', slot: 'weapon', cat: 'rod', atk: 9, hit: 6, elem: 'elec', price: 450, tier: 1, desc: '電気ショックの警棒。機械の敵に効く' },
  pipebomb: { name: 'パイプ爆弾', slot: 'weapon', cat: 'bomb', atk: 7, hit: 4, target: 'all', price: 600, tier: 1, desc: '手作りの爆弾。敵全体に小さなダメージ' },
  knife: { name: 'コンバットナイフ', slot: 'weapon', cat: 'blade', atk: 13, hit: 6, price: 700, tier: 1, desc: '頑丈な軍用ナイフ' },
  shotgun: { name: 'ショットガン', slot: 'weapon', cat: 'shotgun', atk: 16, hit: -4, target: 'group', price: 900, tier: 2, desc: '散弾で敵のグループをまとめて撃つ' },
  rifle: { name: 'アサルトライフル', slot: 'weapon', cat: 'rifle', atk: 18, hit: 2, price: 1400, tier: 2, desc: '連射のきく小銃' },
  magnum: { name: 'マグナム', slot: 'weapon', cat: 'handgun', atk: 21, hit: 4, price: 1700, tier: 2, desc: '大口径のリボルバー' },
  grenadel: { name: 'グレネードランチャー', slot: 'weapon', cat: 'bomb', atk: 15, hit: 2, target: 'all', price: 2300, tier: 2, desc: '榴弾で敵全体を吹き飛ばす' },
  handgat: { name: 'ハンドガトリング', slot: 'weapon', cat: 'heavy', atk: 19, hit: -2, target: 'group', price: 2400, tier: 2, desc: '抱えて撃つ小型ガトリング。一列をまとめて撃ち抜く' },
  sniper1: { name: 'スナイパーライフル', slot: 'weapon', cat: 'sniper', atk: 26, hit: 20, price: 2600, tier: 3, desc: '遠くの一体を確実に撃ち抜く' },
  lblade: { name: 'レーザーブレード', slot: 'weapon', cat: 'blade', atk: 24, hit: 4, elem: 'elec', price: 2800, tier: 3, desc: '光の刃。機械の敵に効く' },
  lasergun: { name: 'レーザーガン', slot: 'weapon', cat: 'laser', atk: 26, hit: 10, elem: 'elec', price: 3200, tier: 3, desc: '熱線を撃つ銃' },
  riotgun: { name: 'ライオットショット', slot: 'weapon', cat: 'shotgun', atk: 28, hit: -2, target: 'group', price: 3800, tier: 3, desc: '暴徒鎮圧用の大型散弾銃' },
  greatsword: { name: 'グレートソード', slot: 'weapon', cat: 'blade', atk: 32, hit: -4, target: 'group', price: 4600, tier: 3, desc: '大きな剣で周りの敵をなぎ払う' },
  clusterbomb: { name: 'クラスター爆弾', slot: 'weapon', cat: 'bomb', atk: 22, hit: 2, target: 'all', price: 4400, tier: 3, desc: '小さな爆弾がばらまかれる' },
  // ---- 第2章以降（お店に並ぶのは先の章から）
  railpistol: { name: 'レールピストル', slot: 'weapon', cat: 'handgun', atk: 42, hit: 10, elem: 'elec', price: 9000, tier: 4, desc: '電磁加速の拳銃' },
  shockrod: { name: 'ショックロッドII', slot: 'weapon', cat: 'rod', atk: 38, hit: 8, elem: 'elec', target: 'group', price: 8800, tier: 4, desc: '放電で周りの敵をしびれさせる' },
  plasmarifle: { name: 'プラズマライフル', slot: 'weapon', cat: 'laser', atk: 52, hit: 8, elem: 'fire', price: 14000, tier: 5, desc: '高熱のプラズマ弾。宇宙生物に効く' },
  stormgat: { name: 'ストームガトリング', slot: 'weapon', cat: 'heavy', atk: 50, hit: 0, target: 'group', price: 15000, tier: 5, desc: '嵐のような連射' },
  antimat: { name: '対物スナイパー', slot: 'weapon', cat: 'sniper', atk: 72, hit: 24, price: 21000, tier: 6, desc: 'マシンの装甲も貫く大型ライフル' },
  mortar: { name: '携帯迫撃砲', slot: 'weapon', cat: 'bomb', atk: 46, hit: 0, target: 'all', price: 19000, tier: 6, desc: '空から砲弾を降らせる' },
  // ---- 限定（宝箱・ドロップ）
  drillknuckle: { name: 'ドリルナックル', slot: 'weapon', cat: 'rod', atk: 20, hit: 2, price: 0, sell: 900, tier: 2, limited: true, from: 'ラストドリラーのドロップ', desc: 'ラストドリラーの破片から作った拳。回転するドリルで殴る' },
  queenfang: { name: 'クイーンファング', slot: 'weapon', cat: 'blade', atk: 30, hit: 6, elem: 'fire', target: 'group', price: 0, sell: 1800, tier: 3, limited: true, from: '墜落した宇宙船（ネストクイーン）', desc: 'ネストクイーンの牙の刃。熱を帯び、周りをなぎ払う' },
  titanfinger: { name: 'タイタンフィンガー', slot: 'weapon', cat: 'bomb', atk: 30, hit: 4, target: 'all', price: 0, sell: 2400, tier: 3, limited: true, from: 'グラインドタイタンのドロップ', desc: '巨大ロボの指を改造した小型砲。敵全体を撃つ' },
  oldrevolver: { name: '古いリボルバー', slot: 'weapon', cat: 'handgun', atk: 19, hit: 14, crit: 8, price: 0, sell: 700, tier: 2, limited: true, from: 'フィールドの宝箱', desc: '誰かの形見らしい古い銃。不思議とよく当たる' },

  // ================================================================ 頭（5＋限定）
  cap: { name: '作業キャップ', slot: 'head', def: 1, price: 100, tier: 1, desc: '日よけの帽子' },
  helmet: { name: 'ヘルメット', slot: 'head', def: 3, price: 500, tier: 1, desc: '頭を守る基本の防具' },
  combathelm: { name: 'コンバットヘルム', slot: 'head', def: 5, hit: 2, price: 1500, tier: 2, desc: '照準補助つきのヘルメット' },
  visorhelm: { name: 'バイザーヘルム', slot: 'head', def: 7, hit: 4, eva: 2, price: 3400, tier: 3, desc: '暗視バイザーつき' },
  nanohelm: { name: 'ナノヘルム', slot: 'head', def: 12, hit: 5, eva: 4, price: 9500, tier: 5, desc: 'ナノ素材の軽いヘルメット' },
  piratehat: { name: '海賊の三角帽', slot: 'head', def: 4, eva: 4, crit: 3, price: 0, sell: 600, tier: 2, limited: true, from: '墜落した宇宙船の宝箱', desc: '宇宙海賊の船長の帽子' },
  // ================================================================ 体（6）
  workwear: { name: '作業着', slot: 'body', def: 3, price: 0, tier: 1, desc: '油のしみた作業着' },
  vest: { name: '防弾ベスト', slot: 'body', def: 7, price: 500, tier: 1, desc: '弾をとめるベスト' },
  pilotsuit: { name: 'パイロットスーツ', slot: 'body', def: 5, eva: 6, price: 1200, tier: 2, desc: '動きやすい耐圧スーツ' },
  heavyarmor: { name: 'ヘビーアーマー', slot: 'body', def: 12, eva: -3, price: 2400, tier: 2, desc: '重いが頑丈な鎧' },
  compvest: { name: '複合装甲ベスト', slot: 'body', def: 16, eva: 1, price: 4600, tier: 3, desc: 'セラミックと合金の板を重ねたベスト' },
  nanosuit: { name: 'ナノスーツ', slot: 'body', def: 26, eva: 6, hp: 20, price: 13000, tier: 5, desc: '体の動きに合わせて硬くなるスーツ' },
  // ================================================================ 手（5）
  gloves: { name: '革手袋', slot: 'hands', def: 1, hit: 1, price: 150, tier: 1, desc: '滑り止めの手袋' },
  tacgloves: { name: 'タクティカルグローブ', slot: 'hands', def: 2, hit: 3, price: 900, tier: 2, desc: '射撃用の手袋' },
  gauntlet: { name: 'ガントレット', slot: 'hands', def: 5, atk: 2, price: 2200, tier: 2, desc: '金属の籠手' },
  powergloves: { name: 'パワーグローブ', slot: 'hands', def: 4, atk: 5, price: 4200, tier: 3, desc: '握力を増す機械仕掛けの手袋' },
  nanogloves: { name: 'ナノグローブ', slot: 'hands', def: 7, atk: 8, hit: 5, price: 10500, tier: 5, desc: 'ナノ素材の手袋' },
  // ================================================================ 足（5）
  boots: { name: '作業ブーツ', slot: 'feet', def: 1, price: 0, tier: 1, desc: '安全靴' },
  runshoes: { name: 'ランニングシューズ', slot: 'feet', eva: 3, spd: 2, price: 600, tier: 1, desc: '軽い靴' },
  combatboots: { name: 'コンバットブーツ', slot: 'feet', def: 4, eva: 1, price: 1500, tier: 2, desc: '戦闘用の頑丈な靴' },
  jetboots: { name: 'ジェットブーツ', slot: 'feet', def: 3, eva: 6, spd: 4, price: 3900, tier: 3, desc: '小さな噴射口で身軽に動ける' },
  gravboots: { name: 'グラビティブーツ', slot: 'feet', def: 8, eva: 8, spd: 6, price: 11000, tier: 5, desc: '重力を操る靴' },
  // ================================================================ アクセサリー（10）
  charm: { name: 'お守り', slot: 'acc', look: { kind: 'badge' }, hp: 10, price: 300, tier: 1, desc: '最大体力+10' },
  scope: { name: '照準スコープ', slot: 'acc', look: { kind: 'monocle', glow: 0x7affb0 }, hit: 6, price: 800, tier: 1, desc: '命中+6' },
  guardcharm: { name: '守りの護符', slot: 'acc', look: { kind: 'badge', glow: 0xffe08a }, def: 5, price: 1200, tier: 2, desc: '防御+5' },
  luckycoin: { name: '幸運のコイン', slot: 'acc', look: { kind: 'badge', glow: 0xffd040 }, crit: 6, price: 1400, tier: 2, desc: '会心率+6%' },
  hpring: { name: 'ライフリング', slot: 'acc', look: { kind: 'none' }, hp: 30, price: 1800, tier: 2, desc: '最大体力+30' },
  powerbelt: { name: 'パワーベルト', slot: 'acc', look: { kind: 'belt', accent: 0x8a5a2a }, atk: 5, price: 2200, tier: 3, desc: '攻撃+5' },
  reflexchip: { name: '反射神経チップ', slot: 'acc', look: { kind: 'goggles', accent: 0x3a3a44, glow: 0x6af0ff }, eva: 5, spd: 3, price: 2600, tier: 3, desc: '回避+5・素早さ+3' },
  medpack: { name: '自動救急パック', slot: 'acc', look: { kind: 'pack', color: 0xe8e8e0 }, regen: 0.1, price: 3000, tier: 3, desc: '戦闘のあと体力が最大の10%回復する' },
  cape: { name: '旅人のマント', slot: 'acc', look: { kind: 'cape', color: 0x8a3a2a }, def: 2, eva: 3, price: 1600, tier: 2, desc: '砂ぼこりをよけるマント。防御+2・回避+3' },
  scarf: { name: 'レッドスカーフ', slot: 'acc', look: { kind: 'scarf', color: 0xc8302a }, hit: 2, spd: 2, price: 1100, tier: 1, desc: '風になびく赤いスカーフ。命中+2・素早さ+2' },
  beetlehorn: { name: 'ビートルホーン', slot: 'acc', look: { kind: 'badge', glow: 0xc0c8d0 }, spd: 8, eva: 8, price: 0, sell: 2500, tier: 3, limited: true, from: 'メタルビートルのドロップ', desc: 'メタルビートルの角。素早さ+8・回避+8' },
  gearmagnet: { name: 'ギアマグネット', slot: 'acc', look: { kind: 'pack', color: 0xd8a030 }, gearUp: 0.2, price: 0, sell: 2500, tier: 3, limited: true, from: 'ゴールドドローンのドロップ', desc: '戦闘で手に入るギアが20%増える' },

  // ================================================================ 各キャラ専用の最強装備（第4章以降で入手。第1〜3章では手に入らない）
  // 専用武器は2段階で進化する（EVOLVE）。範囲でキャラの役割を分ける：レン＝全体／シオン＝単体／ジーナ＝グループ
  ren_w1: { name: 'ギアワークス・ランチャー', slot: 'weapon', cat: 'bomb', atk: 64, hit: 10, target: 'all', only: 'ren', price: 0, sell: 0, tier: 7, stage: 1, model: 'fw_ren1', from: '第4章「火」の惑星：溶鉱炉の奥の隠し部屋', desc: 'レン特製の工具型ランチャー。レンチの柄からマイクロミサイルと仕掛け爆弾を一斉にばらまく（全体攻撃）' },
  ren_w2: { name: 'グランドギア・オーバードライブ', slot: 'weapon', cat: 'bomb', atk: 128, hit: 20, target: 'all', crit: 10, only: 'ren', price: 0, sell: 0, tier: 7, stage: 2, final: 'ren', model: 'fw_ren2', from: 'ギアワークス・ランチャーを進化（第6章）', desc: '黄金の歯車が回る最終形。自動砲台とミサイルの雨で敵全体を焼き払う（全体攻撃・専用演出）' },
  shion_w1: { name: 'リンクライフル「ヴェスパー」', slot: 'weapon', cat: 'sniper', atk: 96, hit: 40, crit: 15, link: 'omega', only: 'shion', price: 0, sell: 0, tier: 7, stage: 1, model: 'fw_shion1', from: '第4章：沈んだ軍の研究所のボス', desc: 'オメガの照準システムと連動する狙撃銃。オメガが仲間にいると威力+30%（単体攻撃）' },
  shion_w2: { name: 'ヴェスパー・オメガリンク', slot: 'weapon', cat: 'sniper', atk: 190, hit: 60, crit: 25, link: 'omega', only: 'shion', price: 0, sell: 0, tier: 7, stage: 2, final: 'shion', model: 'fw_shion2', from: 'リンクライフル「ヴェスパー」を進化（第6章）', desc: 'オメガの赤い光をまとう最終形。一体を空ごと撃ち抜く（単体攻撃・専用演出）' },
  gina_w1: { name: '大剣「ベヒモス」', slot: 'weapon', cat: 'blade', atk: 84, hit: 4, target: 'group', only: 'gina', price: 0, sell: 0, tier: 7, stage: 1, model: 'fw_gina1', from: '第4章：傭兵の墓場の奥', desc: 'ジーナの背丈ほどもある大型ブレード。周りの敵をまとめてなぎ払う（グループ攻撃）' },
  gina_w2: { name: '大剣「ベヒモス・ラグナ」', slot: 'weapon', cat: 'blade', atk: 168, hit: 12, target: 'group', crit: 10, only: 'gina', price: 0, sell: 0, tier: 7, stage: 2, final: 'gina', model: 'fw_gina2', from: '大剣「ベヒモス」を進化（第6章）', desc: '刃に炎の筋が走る最終形。回転斬りの衝撃波で一列ごと吹き飛ばす（グループ攻撃・専用演出）' },
  // レン：作業用アーマー（4つそろえると「メカニック・マスター」）
  ren_head: { name: 'マスターゴーグル', slot: 'head', def: 14, hit: 10, only: 'ren', set: 'ren', price: 0, sell: 0, tier: 7, from: '第5章：古代工房の隠し部屋', desc: '機械の弱点が見えるゴーグル' },
  ren_body: { name: 'ギアワークス・アーマー', slot: 'body', def: 34, hp: 40, only: 'ren', set: 'ren', price: 0, sell: 0, tier: 7, from: '第5章：古代工房の奥', desc: '工具と小型アームを内蔵した作業用アーマー' },
  ren_hands: { name: 'マニピュレーターグローブ', slot: 'hands', def: 10, atk: 10, only: 'ren', set: 'ren', price: 0, sell: 0, tier: 7, from: '第6章：ボスのドロップ', desc: '細かい作業も力仕事もこなす機械の手' },
  ren_feet: { name: 'マグネットブーツ', slot: 'feet', def: 10, eva: 6, spd: 6, only: 'ren', set: 'ren', price: 0, sell: 0, tier: 7, from: '第6章：浮遊ドックの隠し部屋', desc: 'どんな足場にも吸いつく磁力の靴' },
  // シオン：パイロットスーツ（4つそろえると「エース・リンク」）
  shion_head: { name: 'エースヘルメット', slot: 'head', def: 12, hit: 16, only: 'shion', set: 'shion', price: 0, sell: 0, tier: 7, from: '第5章：宇宙軍の旧基地', desc: 'オメガの照準データを映すヘルメット' },
  shion_body: { name: 'オメガリンク・スーツ', slot: 'body', def: 28, eva: 14, only: 'shion', set: 'shion', price: 0, sell: 0, tier: 7, from: '第5章：宇宙軍の旧基地の奥', desc: '黒と赤のパイロットスーツ。オメガと神経をつなぐ' },
  shion_hands: { name: 'トリガーグローブ', slot: 'hands', def: 8, hit: 12, crit: 6, only: 'shion', set: 'shion', price: 0, sell: 0, tier: 7, from: '第6章：ボスのドロップ', desc: '引き金の重さが消える手袋' },
  shion_feet: { name: 'スラスターブーツ', slot: 'feet', def: 8, eva: 12, spd: 10, only: 'shion', set: 'shion', price: 0, sell: 0, tier: 7, from: '第6章：浮遊ドックの隠し部屋', desc: '小さな推進器つきのブーツ' },
  // ジーナ：重厚アーマー（4つそろえると「バスティオン」）
  gina_head: { name: 'バスティオン・ヘルム', slot: 'head', def: 18, hp: 20, only: 'gina', set: 'gina', price: 0, sell: 0, tier: 7, from: '第5章：傭兵の墓場', desc: '角の生えた重いヘルム' },
  gina_body: { name: 'バスティオン・アーマー', slot: 'body', def: 44, hp: 60, eva: -4, only: 'gina', set: 'gina', price: 0, sell: 0, tier: 7, from: '第5章：傭兵の墓場の奥', desc: '要塞のような重装甲。大剣を背負う金具つき' },
  gina_hands: { name: 'バスティオン・ガントレット', slot: 'hands', def: 14, atk: 14, only: 'gina', set: 'gina', price: 0, sell: 0, tier: 7, from: '第6章：ボスのドロップ', desc: '大剣を振り回せる怪力の籠手' },
  gina_feet: { name: 'バスティオン・グリーヴ', slot: 'feet', def: 14, hp: 20, only: 'gina', set: 'gina', price: 0, sell: 0, tier: 7, from: '第6章：浮遊ドックの隠し部屋', desc: '地面に根を張るような重い脚甲' },
};

// 4つそろえたときのセット効果（頭・体・手・足）
// look：見た目の色（体の専用防具を着ると色が変わり、4つそろうと光をまとう）
export const SETS = {
  ren: { name: 'メカニック・マスター', desc: '攻撃+10・修理の回復量1.5倍・戦闘のあとマシンの装甲が10%回復', bonus: { atk: 10 }, repairMul: 1.5, machineRegen: 0.1, look: { primary: 0xe8c24a, secondary: 0x5a3a1a, leather: 0x2a2a2a, metal: 0xffe08a }, aura: 0xffd86a },
  shion: { name: 'エース・リンク', desc: '会心率+20%・回避+15・オメガ連動の威力がさらに上がる', bonus: { crit: 20, eva: 15 }, linkMul: 1.5, look: { primary: 0x14141c, secondary: 0x0a0a10, accent: 0xff2a3a }, aura: 0xff3a4a },
  gina: { name: 'バスティオン', desc: '受けるダメージ25%減・最大体力+25%', dmgCut: 0.25, hpMul: 1.25, look: { primary: 0x6a6e78, secondary: 0x2a2c32, accent: 0xff7a2a }, aura: 0xff9a3a },
};

// 専用武器の進化（第1段階 → 最終段階）。第5章までに素材を集め、第6章で進化できる
export const EVOLVE = {
  ren_w1: { to: 'ren_w2', mats: { relic: 3, core: 6, alloy: 30, cell: 20 }, gear: 60000 },
  shion_w1: { to: 'shion_w2', mats: { relic: 3, core: 6, cell: 30, alloy: 15 }, gear: 60000 },
  gina_w1: { to: 'gina_w2', mats: { relic: 3, core: 6, alloy: 30, bio: 20 }, gear: 60000 },
};

// キャラごとの得意な攻撃範囲（その範囲の武器は威力が上がる）
export const FAVORITE_RANGE = { ren: 'all', shion: 'one', gina: 'group' };
export const FAVORITE_BONUS = 1.15;

// 古いセーブの「防具」を新しい「体」に移す、最初の装備
export const START_EQUIP = {
  ren: { weapon: 'wrench', head: null, body: 'workwear', hands: null, feet: 'boots', acc: null },
  shion: { weapon: 'handgun', head: null, body: 'pilotsuit', hands: 'gloves', feet: null, acc: null },
  gina: { weapon: 'rifle', head: 'helmet', body: 'heavyarmor', hands: null, feet: null, acc: null },
};
