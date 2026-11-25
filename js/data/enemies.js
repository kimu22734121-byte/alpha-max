// 敵の表
// type: machine=乗っ取られた機械（電気に弱い／ギアと素材が多め） / bio=宇宙生物（火に弱い／経験値が多め） / pirate=宇宙海賊
// atk は生身への攻撃力。マシンへの攻撃は x2 してから防御を引く（装甲が一桁大きいので）
// fx: 攻撃演出（shot / bite / claw / missile / beam / drill / press / laser）
// drops: [素材ID, 確率, 個数] / loot: [武器・パーツ・道具のID, 確率]
// flee: 毎ターン逃げる確率（レア敵用）
// 同じ形の色違いで強い版を作る（colors で色替え）
export const ENEMIES = {
  // ---------------- 開発者の部屋の試し撃ち用の的（devOnly：一覧や調整には出さない） ----------------
  dummy: { name: '試し撃ちの的', model: 'f_target', type: 'dummy', devOnly: true, hp: 999999, atk: 0, def: 0, hit: 0, eva: 0, spd: 0, exp: 0, gear: 0, fx: 'shot', desc: '何度撃っても壊れない的' },
  dummyB: { name: '試し撃ちの的B', model: 'f_target', colors: { primary: 0x3a6ad8 }, type: 'dummy', devOnly: true, hp: 999999, atk: 0, def: 0, hit: 0, eva: 0, spd: 0, exp: 0, gear: 0, fx: 'shot', desc: '何度撃っても壊れない的（別の種類）' },

  // ---------------- フィールド（6種類） ----------------
  hijackbot: {
    name: 'ハイジャックボット', model: 'en_bot', type: 'machine',
    hp: 34, atk: 11, def: 5, hit: 80, eva: 4, spd: 6, exp: 6, gear: 24, fx: 'claw',
    drops: [['scrap', 0.6, 1], ['cell', 0.05, 1]],
    desc: '宇宙生物に取りつかれた作業ロボット',
  },
  sweeper: {
    name: 'スイーパードローン', model: 'en_drone', type: 'machine', flying: true,
    hp: 22, atk: 9, def: 3, hit: 85, eva: 14, spd: 12, exp: 5, gear: 18, fx: 'laser',
    drops: [['scrap', 0.5, 1]],
    desc: '寄生された掃除ドローン。空を飛ぶ',
  },
  grub: {
    name: 'デザートグラブ', model: 'en_crawler', type: 'bio',
    hp: 26, atk: 10, def: 3, hit: 85, eva: 6, spd: 8, exp: 10, gear: 6, fx: 'bite',
    drops: [['bio', 0.5, 1]],
    desc: '砂の中を泳ぐ小さな宇宙生物',
  },
  rockspider: {
    name: 'ロックスパイダー', model: 'en_spider', type: 'bio',
    hp: 40, atk: 13, def: 6, hit: 85, eva: 8, spd: 10, exp: 14, gear: 9, fx: 'bite',
    drops: [['bio', 0.6, 1]],
    desc: '岩場にひそむ多脚の宇宙生物',
  },
  pirate: {
    name: '宇宙海賊チンピラ', model: 'npc_pirate', type: 'pirate',
    hp: 44, atk: 14, def: 6, hit: 85, eva: 8, spd: 9, exp: 14, gear: 45, fx: 'shot',
    drops: [['scrap', 0.3, 1]], loot: [['helmet', 0.06], ['kitS', 0.25]],
    desc: '荒野をうろつく宇宙海賊の下っ端',
  },
  armorbot: {
    name: 'アーマーボット', model: 'en_bot', type: 'machine', colors: { primary: 0xa83a2a, secondary: 0x3a2a2a, organic: 0x5a2a9a },
    hp: 72, atk: 17, def: 11, hit: 82, eva: 2, spd: 5, exp: 22, gear: 60, fx: 'claw', scale: 1.15,
    drops: [['scrap', 0.8, 2], ['alloy', 0.12, 1], ['cell', 0.1, 1]], loot: [['arm_heavy', 0.03]],
    desc: '装甲を厚くした警備ロボの成れの果て',
  },
  // ---- レア敵 ----
  metalbeetle: {
    name: 'メタルビートル', model: 'en_beetle', type: 'machine', rare: true,
    hp: 10, atk: 6, def: 120, hit: 70, eva: 30, spd: 30, exp: 480, gear: 10, fx: 'bite', flee: 0.45, minDamage: 1,
    drops: [['alloy', 0.5, 1]], loot: [['beetlehorn', 0.25]],
    desc: 'すぐ逃げる銀色の甲虫。倒すと経験値がたくさん',
  },
  golddrone: {
    name: 'ゴールドドローン', model: 'en_drone', type: 'machine', rare: true, flying: true,
    colors: { primary: 0xf0c030, secondary: 0xb08a20, organic: 0xffe070, glow: 0xffffff }, metal: true,
    hp: 30, atk: 8, def: 30, hit: 70, eva: 25, spd: 26, exp: 30, gear: 1800, fx: 'laser', flee: 0.4,
    drops: [['cell', 0.6, 1]], loot: [['gearmagnet', 0.25]],
    desc: '金ピカのドローン。倒すとギアがたくさん',
  },

  // ---------------- 荒野の東側（坑道を抜けた先）は少し強い色違い ----------------
  hijackbot2: {
    name: 'ハイジャックボットII', model: 'en_bot', type: 'machine', colors: { primary: 0x3a8a8a, secondary: 0x2a3a3a },
    hp: 62, atk: 16, def: 9, hit: 82, eva: 4, spd: 7, exp: 18, gear: 50, fx: 'claw', scale: 1.1,
    drops: [['scrap', 0.7, 1], ['cell', 0.1, 1]],
    desc: '東の荒野に多い、装甲を足された作業ロボット',
  },
  grub2: {
    name: 'サンドグラブ', model: 'en_crawler', type: 'bio', colors: { primary: 0x9a7a3a, organic: 0xc08a3a },
    hp: 50, atk: 15, def: 6, hit: 86, eva: 8, spd: 9, exp: 22, gear: 10, fx: 'bite', scale: 1.15,
    drops: [['bio', 0.6, 1]],
    desc: '大きく育ったデザートグラブ',
  },

  // ---------------- 坑道（マシンで進む序盤のダンジョン, 4種類） ----------------
  minebot: {
    name: 'マイニングボット', model: 'en_bot', type: 'machine', colors: { primary: 0xb08a2a, secondary: 0x4a4030, organic: 0x7a3a9a },
    hp: 48, atk: 13, def: 8, hit: 82, eva: 2, spd: 5, exp: 12, gear: 40, fx: 'claw',
    drops: [['scrap', 0.7, 1], ['alloy', 0.08, 1]],
    desc: '坑道で使われていた採掘ロボット',
  },
  cavegrub: {
    name: 'ケイブワーム', model: 'en_crawler', type: 'bio', colors: { primary: 0x6a6a6a, organic: 0x8a7a9a },
    hp: 38, atk: 12, def: 5, hit: 85, eva: 6, spd: 8, exp: 14, gear: 6, fx: 'bite',
    drops: [['bio', 0.5, 1]],
    desc: '暗い坑道に住む灰色の虫',
  },
  cavedrone: {
    name: 'ランプドローン', model: 'en_drone', type: 'machine', flying: true, colors: { primary: 0x5a5040, glow: 0xffd060 },
    hp: 30, atk: 11, def: 4, hit: 85, eva: 14, spd: 12, exp: 9, gear: 26, fx: 'laser',
    drops: [['cell', 0.12, 1], ['scrap', 0.4, 1]],
    desc: '坑道を照らしていた照明ドローン',
  },
  // ロックスパイダーも坑道に出る

  // ---------------- 墜落した宇宙船（生身専用, 3種類＋小ボス） ----------------
  shippirate: {
    name: '海賊の残党', model: 'npc_pirate', type: 'pirate', colors: { primary: 0x3a3a5a, accent: 0x8a2a2a },
    hp: 46, atk: 13, def: 6, hit: 85, eva: 8, spd: 9, exp: 18, gear: 50, fx: 'shot',
    drops: [['scrap', 0.3, 1]], loot: [['knife', 0.08], ['kitS', 0.3]],
    desc: '墜落した海賊船に取り残された下っ端',
  },
  nestspider: {
    name: 'ネストスパイダー', model: 'en_spider', type: 'bio', colors: { primary: 0x4a2a5a, organic: 0x8a3aaa },
    hp: 36, atk: 12, def: 5, hit: 86, eva: 10, spd: 11, exp: 20, gear: 8, fx: 'bite', scale: 0.8,
    drops: [['bio', 0.6, 1]],
    desc: '船内に巣を作った宇宙生物の子ども',
  },
  shipslime: {
    name: 'ヴォイドスライム', model: 'en_blob', type: 'bio', colors: { organic: 0x5a4aca, organicGlow: 0x1a1060 },
    hp: 52, atk: 13, def: 6, hit: 84, eva: 3, spd: 5, exp: 24, gear: 10, fx: 'bite', scale: 0.75,
    drops: [['bio', 0.6, 1], ['cell', 0.1, 1]],
    desc: '宇宙船の燃料を吸った不定形の生物',
  },
  nestqueen: {
    name: 'ネストクイーン', model: 'en_spider', type: 'bio', boss: true, flag: 'shipBoss', colors: { primary: 0x5a1a4a, organic: 0xc03ab0, glow: 0xff4ae0 },
    hp: 380, atk: 15, def: 8, hit: 88, eva: 6, spd: 10, exp: 320, gear: 400, fx: 'bite', scale: 1.4,
    skills: [{ name: '毒の糸', mul: 0.8, target: 'all', chance: 0.25, fx: 'beam' }, { name: 'のしかかり', mul: 1.6, target: 'one', chance: 0.25, fx: 'press' }],
    drops: [['core', 1, 1], ['bio', 1, 3]], loot: [['queenfang', 1], ['megaheal', 1]],
    desc: '墜落した宇宙船の奥に巣を作った宇宙生物の女王（生身で戦う小ボス）',
  },

  // ---------------- 廃工場（最後のダンジョン, 4種類） ----------------
  pressbot: {
    name: 'プレスボット', model: 'en_bot', type: 'machine', colors: { primary: 0x5a7a9a, secondary: 0x2a3a4a },
    hp: 84, atk: 19, def: 13, hit: 82, eva: 2, spd: 6, exp: 26, gear: 70, fx: 'claw', scale: 1.2,
    drops: [['scrap', 0.8, 2], ['alloy', 0.2, 1]],
    desc: '工場のプレス作業ロボ。腕の一撃が重い',
  },
  sludge: {
    name: 'スラッジ', model: 'en_blob', type: 'bio',
    hp: 68, atk: 16, def: 7, hit: 85, eva: 4, spd: 5, exp: 32, gear: 14, fx: 'bite',
    drops: [['bio', 0.7, 2]],
    desc: '廃液とがらくたを取りこんだ宇宙生物',
  },
  turret: {
    name: '寄生タレット', model: 'en_turret', type: 'machine',
    hp: 92, atk: 22, def: 16, hit: 88, eva: 0, spd: 7, exp: 30, gear: 80, fx: 'shot',
    drops: [['scrap', 0.7, 2], ['cell', 0.25, 1]], loot: [['lm1', 0.04]],
    desc: '防衛タレットに宇宙生物が根を張ったもの',
  },
  toxicgrub: {
    name: 'トキシックグラブ', model: 'en_crawler', type: 'bio', colors: { primary: 0x3a7a3a, organic: 0x6aaa2a, organicGlow: 0x1a4a0a },
    hp: 56, atk: 18, def: 6, hit: 88, eva: 8, spd: 10, exp: 28, gear: 10, fx: 'bite', scale: 1.2,
    drops: [['bio', 0.6, 1]],
    desc: '工場の廃液で育った毒々しいグラブ',
  },

  // ---------------- 賞金首 ----------------
  rustdriller: {
    name: 'ラストドリラー', model: 'boss_driller', type: 'machine', boss: true, bounty: 'rustdriller',
    hp: 420, atk: 15, def: 10, hit: 85, eva: 0, spd: 5, exp: 240, gear: 300, fx: 'drill', scale: 0.85,
    skills: [{ name: 'ドリルラッシュ', mul: 1.5, target: 'one', chance: 0.3, fx: 'drill' }, { name: '岩盤くだき', mul: 0.8, target: 'all', chance: 0.2, fx: 'press' }],
    drops: [['core', 1, 1], ['scrap', 1, 4]], loot: [['drillknuckle', 1], ['arm_heavy', 1]],
    desc: '宇宙生物に乗っ取られた採掘マシン。岩場に出る',
  },
  skywraith: {
    name: 'スカイレイス', model: 'boss_skywraith', type: 'machine', boss: true, bounty: 'skywraith', flying: true,
    hp: 640, atk: 17, def: 9, hit: 88, eva: 22, spd: 14, exp: 420, gear: 500, fx: 'laser', scale: 0.85,
    skills: [{ name: '急降下', mul: 1.6, target: 'one', chance: 0.3, fx: 'drill' }, { name: 'ミサイル雨', mul: 0.9, target: 'all', chance: 0.25, fx: 'missile' }],
    drops: [['core', 1, 1], ['cell', 1, 2]], loot: [['hm2', 1]],
    desc: '乗っ取られた輸送ドローンの群れのリーダー。空から襲う',
  },
  grindtitan: {
    name: 'グラインドタイタン', model: 'boss_titan', type: 'machine', boss: true, bounty: 'grindtitan', final: true,
    hp: 1600, atk: 22, def: 16, hit: 88, eva: 0, spd: 6, exp: 1200, gear: 900, fx: 'press', acts: 2, scale: 0.8,
    skills: [{ name: 'グラインドプレス', mul: 1.0, target: 'all', chance: 0.25, fx: 'press' }, { name: 'コアビーム', mul: 1.8, target: 'one', chance: 0.2, fx: 'beam' }],
    drops: [['core', 1, 2], ['alloy', 1, 3]], loot: [['titanfinger', 1], ['pc1', 1]],
    desc: '廃工場の奥で宇宙生物に乗っ取られた巨大な工業用ロボット',
  },

  // ================================================================ 第2章「風」の惑星
  // ---------------- 疾風高原（フィールド, 6種類＋浮島・北の強い版） ----------------
  galehawk: {
    name: 'ゲイルホーク', model: 'en_bird', type: 'bio', flying: true,
    hp: 92, atk: 23, def: 9, hit: 86, eva: 18, spd: 16, exp: 40, gear: 22, fx: 'claw',
    drops: [['bio', 0.6, 1]],
    desc: '強風に乗って急降下する、翼に機械を取りこんだ鳥の宇宙生物',
  },
  kitedrone: {
    name: 'カイトドローン', model: 'en_drone', type: 'machine', flying: true, colors: { primary: 0xe8ecf0, secondary: 0x3a8a9a, glow: 0x6ae8ff },
    hp: 80, atk: 21, def: 10, hit: 86, eva: 16, spd: 15, exp: 30, gear: 70, fx: 'laser',
    drops: [['scrap', 0.6, 1], ['cell', 0.12, 1]],
    desc: '風を測っていた観測ドローン。今は寄生されて人を襲う',
  },
  grassworm: {
    name: 'グラスクローラー', model: 'en_crawler', type: 'bio', colors: { primary: 0x4a8a3a, organic: 0x7ac04a, organicGlow: 0x2a5a1a },
    hp: 110, atk: 24, def: 10, hit: 86, eva: 6, spd: 9, exp: 44, gear: 16, fx: 'bite', scale: 1.2,
    drops: [['bio', 0.6, 1]],
    desc: '草原の地面の下を泳ぐ、緑色の大きな虫',
  },
  skypirate: {
    name: '空賊の斬り込み隊', model: 'npc_pirate', type: 'pirate', colors: { primary: 0x2a6a7a, accent: 0xe8e0c8 },
    hp: 120, atk: 26, def: 12, hit: 86, eva: 10, spd: 11, exp: 46, gear: 110, fx: 'shot',
    drops: [['scrap', 0.4, 1]], loot: [['railpistol', 0.03], ['kitM', 0.25]],
    desc: '飛行船から降りてくる空賊の下っ端',
  },
  millbot: {
    name: 'ミルボット', model: 'en_bot', type: 'machine', colors: { primary: 0xe8e0cc, secondary: 0xb84a32, organic: 0x4a9ab8 },
    hp: 140, atk: 27, def: 15, hit: 82, eva: 3, spd: 7, exp: 52, gear: 120, fx: 'claw', scale: 1.1,
    drops: [['scrap', 0.8, 2], ['alloy', 0.15, 1]], loot: [['arm_gale', 0.02]],
    desc: '風車の整備ロボットに宇宙生物が取りついたもの',
  },
  cloudspider: {
    name: 'クラウドスパイダー', model: 'en_spider', type: 'bio', colors: { primary: 0xd8dce4, organic: 0x8ab8e8, glow: 0x6ae8ff },
    hp: 100, atk: 25, def: 10, hit: 88, eva: 12, spd: 12, exp: 48, gear: 14, fx: 'bite',
    drops: [['bio', 0.6, 1]],
    desc: '雲のような白い糸を張って、風に乗って飛んでくる',
  },
  stormhawk: {
    name: 'ストームホーク', model: 'en_bird', type: 'bio', flying: true, colors: { primary: 0x3a4a6a, secondary: 0x1a2232, organic: 0x8a6ae8, glow: 0xffe060 },
    hp: 150, atk: 32, def: 12, hit: 88, eva: 20, spd: 18, exp: 70, gear: 30, fx: 'claw', scale: 1.15,
    drops: [['bio', 0.7, 1], ['cell', 0.08, 1]],
    desc: '嵐の中を飛ぶ、ゲイルホークの強い群れ',
  },
  millbot2: {
    name: 'ミルボットII', model: 'en_bot', type: 'machine', colors: { primary: 0x6a7a8a, secondary: 0x2a3440, organic: 0x8a6ae8 },
    hp: 210, atk: 34, def: 19, hit: 84, eva: 3, spd: 8, exp: 78, gear: 170, fx: 'claw', scale: 1.25,
    drops: [['scrap', 0.8, 2], ['alloy', 0.25, 1]],
    desc: '発電塔の警備ロボットの成れの果て',
  },

  // ---------------- 風鳴りの洞窟（マシンで進む, 3種類＋クラウドスパイダー） ----------------
  howlbat: {
    name: 'ハウルバット', model: 'en_bird', type: 'bio', flying: true, colors: { primary: 0x3a3440, secondary: 0x1a161e, organic: 0x9a4ac8, glow: 0xff6a6a },
    hp: 120, atk: 28, def: 10, hit: 88, eva: 18, spd: 17, exp: 54, gear: 16, fx: 'bite', scale: 0.8,
    drops: [['bio', 0.6, 1]],
    desc: '洞窟の風の音にまぎれて飛ぶ、こうもりのような宇宙生物',
  },
  echobot: {
    name: 'エコーボット', model: 'en_bot', type: 'machine', colors: { primary: 0x4a6a8a, secondary: 0x2a3a4a, organic: 0x6ad8ff },
    hp: 170, atk: 30, def: 17, hit: 84, eva: 2, spd: 6, exp: 60, gear: 140, fx: 'claw', scale: 1.15,
    drops: [['scrap', 0.8, 2], ['cell', 0.15, 1]],
    desc: '風の音を測っていた調査ロボット',
  },
  crystalworm: {
    name: 'クリスタルワーム', model: 'en_crawler', type: 'bio', colors: { primary: 0x6ab8e8, organic: 0xbfe8ff, organicGlow: 0x2a6aa0 },
    hp: 150, atk: 29, def: 14, hit: 86, eva: 6, spd: 8, exp: 62, gear: 20, fx: 'bite', scale: 1.2,
    drops: [['bio', 0.6, 1], ['relic', 0.04, 1]],
    desc: '洞窟の水晶を食べて体が透きとおった虫',
  },

  // ---------------- 浮遊研究所（生身専用, 3種類＋小ボス） ----------------
  labslime: {
    name: 'ラボスライム', model: 'en_blob', type: 'bio', colors: { organic: 0x4ae0c0, organicGlow: 0x0a5040 },
    hp: 150, atk: 22, def: 9, hit: 86, eva: 4, spd: 6, exp: 58, gear: 20, fx: 'bite', scale: 0.8,
    drops: [['bio', 0.6, 1], ['cell', 0.1, 1]],
    desc: '実験槽から逃げ出した不定形の生物',
  },
  secdrone: {
    name: '警備ドローン', model: 'en_drone', type: 'machine', flying: true, colors: { primary: 0xd8e0e4, secondary: 0x4a5462, glow: 0xff4a4a },
    hp: 120, atk: 24, def: 11, hit: 88, eva: 16, spd: 15, exp: 50, gear: 90, fx: 'laser',
    drops: [['scrap', 0.6, 1], ['cell', 0.15, 1]], loot: [['kitM', 0.2]],
    desc: '研究所を守っていた警備ドローン。侵入者を撃つ',
  },
  testchimera: {
    name: '実験体キメラ', model: 'en_spider', type: 'bio', colors: { primary: 0x8a9aa8, organic: 0x4ae0c0, glow: 0xff6ab0 },
    hp: 180, atk: 26, def: 11, hit: 87, eva: 10, spd: 12, exp: 66, gear: 24, fx: 'claw', scale: 0.9,
    drops: [['bio', 0.7, 1]],
    desc: '宇宙生物と機械をつなぎ合わせた実験の失敗作',
  },
  galechimera: {
    name: 'ゲイルキメラ', model: 'en_bird', type: 'bio', boss: true, flag: 'labBoss', flying: true, colors: { primary: 0xd8e0e4, secondary: 0x3a8a9a, organic: 0x4ae0c0, glow: 0xff4ae0 },
    hp: 1400, atk: 30, def: 13, hit: 90, eva: 12, spd: 15, exp: 1400, gear: 1200, fx: 'claw', scale: 1.8,
    skills: [{ name: '烈風のつばさ', mul: 0.85, target: 'all', chance: 0.3, fx: 'beam' }, { name: 'かぎ爪の急降下', mul: 1.7, target: 'one', chance: 0.25, fx: 'drill' }],
    drops: [['core', 1, 2], ['bio', 1, 3]], loot: [['galefeather', 1], ['megaheal', 1]],
    desc: '浮遊研究所で作られた、風をあやつる合成生物（生身で戦う小ボス）',
  },

  // ---------------- 嵐の塔（最後のダンジョン, 3種類＋ストームホーク） ----------------
  turbinegolem: {
    name: 'タービンゴーレム', model: 'en_bot', type: 'machine', colors: { primary: 0x5a6a7a, secondary: 0x2a3440, organic: 0x6ad8ff, glow: 0x9ae8ff },
    hp: 260, atk: 38, def: 22, hit: 84, eva: 2, spd: 7, exp: 96, gear: 220, fx: 'press', scale: 1.4,
    drops: [['scrap', 0.9, 2], ['alloy', 0.3, 1]],
    desc: '塔の風力タービンを守る巨大な作業ロボット',
  },
  stormturret: {
    name: 'ストームタレット', model: 'en_turret', type: 'machine', colors: { primary: 0x4a5a6a, glow: 0x9ae8ff },
    hp: 240, atk: 40, def: 24, hit: 90, eva: 0, spd: 8, exp: 90, gear: 240, fx: 'laser',
    drops: [['scrap', 0.7, 2], ['cell', 0.3, 1]], loot: [['lm2', 0.03]],
    desc: '雷を撃つ防衛タレットに宇宙生物が根を張ったもの',
  },
  cycloneslime: {
    name: 'サイクロンスライム', model: 'en_blob', type: 'bio', colors: { organic: 0x8a9ae8, organicGlow: 0x2a3a8a },
    hp: 200, atk: 34, def: 12, hit: 87, eva: 8, spd: 9, exp: 92, gear: 30, fx: 'bite',
    drops: [['bio', 0.7, 2]],
    desc: '渦を巻いて動く、雲のような宇宙生物',
  },

  // ---------------- 第2章の賞金首 ----------------
  windraptor: {
    name: 'ウィンドラプター', model: 'en_bird', type: 'bio', boss: true, bounty: 'windraptor', flying: true, colors: { primary: 0x8a5a3a, secondary: 0x4a2e1e, organic: 0xe8a04a, glow: 0xffe060 },
    hp: 1900, atk: 30, def: 14, hit: 88, eva: 16, spd: 16, exp: 1300, gear: 900, fx: 'claw', scale: 2.2,
    skills: [{ name: '竜巻おこし', mul: 0.9, target: 'all', chance: 0.25, fx: 'beam' }, { name: '急降下', mul: 1.7, target: 'one', chance: 0.3, fx: 'drill' }],
    drops: [['core', 1, 1], ['bio', 1, 4]], loot: [['raptortalon', 1]],
    desc: '疾風高原の空を支配する巨大な猛禽。宇宙生物に体を作り変えられている',
  },
  aerofort: {
    name: 'エアロフォートレス', model: 'boss_skywraith', type: 'machine', boss: true, bounty: 'aerofort', flying: true, colors: { primary: 0x6a5a4a, secondary: 0x3a2e24, organic: 0x9a3ac8, glow: 0xff8a3a },
    hp: 3000, atk: 36, def: 18, hit: 88, eva: 12, spd: 12, exp: 2200, gear: 1600, fx: 'missile', scale: 1.0,
    skills: [{ name: '一斉砲撃', mul: 1.0, target: 'all', chance: 0.3, fx: 'missile' }, { name: '主砲', mul: 1.9, target: 'one', chance: 0.2, fx: 'beam' }],
    drops: [['core', 1, 2], ['alloy', 1, 3]], loot: [['sm1', 1]],
    desc: '空賊の砲艦が宇宙生物に乗っ取られ、空の要塞になったもの',
  },
  coreguardian: {
    name: 'コアガーディアン', model: 'boss_titan', type: 'machine', boss: true, bounty: 'coreguardian', final: true, colors: { primary: 0x6a7a8a, secondary: 0x2a3440, organic: 0x6a3ac8, glow: 0x9ae8ff },
    hp: 5200, atk: 44, def: 26, hit: 90, eva: 2, spd: 9, exp: 4200, gear: 2600, fx: 'press', acts: 2, scale: 0.9,
    skills: [{ name: 'テンペストプレス', mul: 1.0, target: 'all', chance: 0.25, fx: 'press' }, { name: '雷撃コア', mul: 1.9, target: 'one', chance: 0.2, fx: 'beam' }, { name: '暴風壁', mul: 0.7, target: 'all', chance: 0.15, fx: 'beam' }],
    drops: [['core', 1, 3], ['relic', 1, 1]], loot: [['stormcore', 1], ['rg2', 1]],
    desc: '嵐の塔の中枢「風の制御コア」を守る番人。1ターンに2回動く',
  },

  // ================================================================ 第3章「水」の惑星
  // ---------------- 蒼海諸島（フィールド, 6種類＋北の海の強い版・海の底の敵） ----------------
  reefcrab: {
    name: 'リーフクラブ', model: 'en_crab', type: 'bio',
    hp: 180, atk: 36, def: 18, hit: 86, eva: 4, spd: 9, exp: 90, gear: 40, fx: 'claw',
    drops: [['bio', 0.6, 1], ['alloy', 0.08, 1]],
    desc: '機械の部品を甲羅にしたカニの宇宙生物。かたい',
  },
  jellydrone: {
    name: 'クラゲドローン', model: 'en_drone', type: 'machine', flying: true, colors: { primary: 0xe8d8f0, secondary: 0x8a5aca, organic: 0xff8ad8, glow: 0xff8ad8 },
    hp: 150, atk: 34, def: 14, hit: 88, eva: 16, spd: 15, exp: 74, gear: 130, fx: 'laser',
    drops: [['scrap', 0.6, 1], ['cell', 0.15, 1]],
    desc: 'クラゲのような触手を垂らした海の観測ドローン',
  },
  seaworm: {
    name: 'シーワーム', model: 'en_crawler', type: 'bio', colors: { primary: 0x2a8ab8, organic: 0x6ad8e8, organicGlow: 0x1a4a6a },
    hp: 200, atk: 38, def: 14, hit: 86, eva: 6, spd: 9, exp: 96, gear: 26, fx: 'bite', scale: 1.25,
    drops: [['bio', 0.6, 1]],
    desc: '砂浜の下から飛び出す、青く光る大きな虫',
  },
  diverpirate: {
    name: '海賊の潜水兵', model: 'npc_pirate', type: 'pirate', colors: { primary: 0x1a4a6a, accent: 0xe8c040 },
    hp: 210, atk: 40, def: 17, hit: 87, eva: 10, spd: 11, exp: 92, gear: 200, fx: 'shot',
    drops: [['scrap', 0.4, 1]], loot: [['harpoongun', 0.03], ['kitL', 0.15]],
    desc: '潜水服を着た宇宙海賊。海から上がってくる',
  },
  buoybot: {
    name: 'ブイボット', model: 'en_bot', type: 'machine', colors: { primary: 0xe8c040, secondary: 0xd84a2a, organic: 0x4ab0e0 },
    hp: 240, atk: 41, def: 21, hit: 82, eva: 3, spd: 7, exp: 104, gear: 220, fx: 'claw', scale: 1.15,
    drops: [['scrap', 0.8, 2], ['alloy', 0.2, 1]], loot: [['arm_hydro', 0.02]],
    desc: '海の浮標を整備していたロボット。宇宙生物に取りつかれた',
  },
  flyingfish: {
    name: 'スカイフィッシュ', model: 'en_bird', type: 'bio', flying: true, colors: { primary: 0x6ab8e8, secondary: 0x2a6a9a, organic: 0xe8f4ff, glow: 0xffe060 },
    hp: 150, atk: 37, def: 12, hit: 88, eva: 20, spd: 18, exp: 86, gear: 30, fx: 'bite', scale: 0.85,
    drops: [['bio', 0.6, 1]],
    desc: 'ひれを翼にして海の上を飛ぶ魚の宇宙生物',
  },
  armorcrab: {
    name: 'アーマークラブ', model: 'en_crab', type: 'bio', colors: { primary: 0x5a6a7a, secondary: 0x2a3440, organic: 0xff6a4a, glow: 0xff6a4a },
    hp: 300, atk: 46, def: 26, hit: 86, eva: 3, spd: 9, exp: 140, gear: 60, fx: 'claw', scale: 1.2,
    drops: [['bio', 0.6, 1], ['alloy', 0.2, 1]],
    desc: '鉄の板を何枚も背負った、北の海のカニ',
  },
  stormeel: {
    name: 'ストームイール', model: 'en_eel', type: 'bio', flying: true,
    hp: 260, atk: 46, def: 16, hit: 88, eva: 14, spd: 16, exp: 136, gear: 44, fx: 'bite',
    drops: [['bio', 0.7, 1], ['cell', 0.1, 1]],
    desc: '電気をまとって空中を泳ぐうなぎの宇宙生物',
  },
  // ---------------- 潮騒の地下水路（マシンで進む, 3種類） ----------------
  cavecrab: {
    name: 'ケイブクラブ', model: 'en_crab', type: 'bio', colors: { primary: 0x6a6a7a, organic: 0x4ae0d0, glow: 0x4ae0d0 }, scale: 0.9,
    hp: 230, atk: 42, def: 22, hit: 86, eva: 4, spd: 8, exp: 110, gear: 40, fx: 'claw',
    drops: [['bio', 0.6, 1]],
    desc: '暗い水路にすむ、目の光るカニ',
  },
  glowslug: {
    name: 'グローナメクジ', model: 'en_blob', type: 'bio', colors: { organic: 0x6ae8a0, organicGlow: 0x1a6a4a },
    hp: 260, atk: 40, def: 14, hit: 86, eva: 3, spd: 6, exp: 118, gear: 36, fx: 'bite', scale: 0.85,
    drops: [['bio', 0.7, 2]],
    desc: '水路の壁をはう、緑に光る軟体生物',
  },
  pipebot: {
    name: 'パイプボット', model: 'en_bot', type: 'machine', colors: { primary: 0x5a7a8a, secondary: 0x2a3a44, organic: 0x4ae0d0 },
    hp: 300, atk: 44, def: 24, hit: 84, eva: 2, spd: 7, exp: 124, gear: 260, fx: 'claw', scale: 1.2,
    drops: [['scrap', 0.8, 2], ['cell', 0.2, 1]],
    desc: '水路を掃除していた作業ロボット',
  },
  // ---------------- 海上プラント（生身専用, 3種類＋小ボス） ----------------
  plantdiver: {
    name: 'プラントの海賊', model: 'npc_pirate', type: 'pirate', colors: { primary: 0x3a3a4a, accent: 0xe8c040 },
    hp: 230, atk: 32, def: 13, hit: 87, eva: 10, spd: 12, exp: 110, gear: 180, fx: 'shot',
    drops: [['scrap', 0.4, 1]], loot: [['kitL', 0.2]],
    desc: 'プラントを占拠した宇宙海賊',
  },
  oilslime: {
    name: 'オイルスライム', model: 'en_blob', type: 'bio', colors: { organic: 0x2a2a34, organicGlow: 0x8a4aca },
    hp: 260, atk: 30, def: 12, hit: 86, eva: 4, spd: 6, exp: 120, gear: 30, fx: 'bite', scale: 0.85,
    drops: [['bio', 0.6, 1], ['cell', 0.1, 1]],
    desc: 'プラントの油を吸って黒くなった不定形の生物',
  },
  rigturret: {
    name: 'プラント砲台', model: 'en_turret', type: 'machine', colors: { primary: 0xa85a2a, glow: 0xff8a3a },
    hp: 280, atk: 34, def: 18, hit: 90, eva: 0, spd: 8, exp: 114, gear: 240, fx: 'shot',
    drops: [['scrap', 0.7, 2]],
    desc: 'プラントの防衛砲台。宇宙生物が根を張っている',
  },
  abysssquid: {
    name: 'アビススクイッド', model: 'en_spider', type: 'bio', boss: true, flag: 'plantBoss', colors: { primary: 0xc84a8a, organic: 0xff8ad8, glow: 0x6ae8ff },
    hp: 2600, atk: 38, def: 16, hit: 90, eva: 8, spd: 13, exp: 2600, gear: 2200, fx: 'bite', scale: 1.6,
    skills: [{ name: 'すみの嵐', mul: 0.85, target: 'all', chance: 0.3, fx: 'beam' }, { name: '八本足のしめつけ', mul: 1.7, target: 'one', chance: 0.25, fx: 'press' }],
    drops: [['core', 1, 2], ['bio', 1, 4]], loot: [['inkcloak', 1], ['megaheal', 1]],
    desc: 'プラントの貯水槽に巣くう巨大なイカの宇宙生物（生身で戦う小ボス）',
  },
  // ---------------- 水没都市（最後のダンジョン, 3種類＋ストームイール） ----------------
  abyssknight: {
    name: 'アビスナイト', model: 'en_bot', type: 'machine', colors: { primary: 0x2a4a5a, secondary: 0x14242c, organic: 0x4ae0d0, glow: 0x4ae0d0 },
    hp: 380, atk: 52, def: 30, hit: 86, eva: 3, spd: 8, exp: 170, gear: 330, fx: 'press', scale: 1.35,
    drops: [['scrap', 0.9, 2], ['alloy', 0.3, 1]],
    desc: '水没した都市を守っていた警備ロボット',
  },
  lanterneel: {
    name: 'ランタンイール', model: 'en_eel', type: 'bio', flying: true, colors: { primary: 0x14242c, secondary: 0x0a1418, organic: 0xffe060, glow: 0xffe060 },
    hp: 320, atk: 50, def: 18, hit: 88, eva: 14, spd: 16, exp: 160, gear: 50, fx: 'bite',
    drops: [['bio', 0.7, 1], ['relic', 0.04, 1]],
    desc: '暗い海の底で光をともして獲物を誘う',
  },
  deepslime: {
    name: 'ディープスライム', model: 'en_blob', type: 'bio', colors: { organic: 0x2a6aca, organicGlow: 0x0a1a4a },
    hp: 340, atk: 48, def: 16, hit: 87, eva: 6, spd: 8, exp: 164, gear: 44, fx: 'bite',
    drops: [['bio', 0.7, 2]],
    desc: '深い海の水圧に耐える、青黒い不定形の生物',
  },

  // ---------------- 第3章の賞金首 ----------------
  shellcrusher: {
    name: 'シェルクラッシャー', model: 'en_crab', type: 'bio', boss: true, bounty: 'shellcrusher', colors: { primary: 0xd8a040, secondary: 0x6a4a2a, organic: 0x8a4ac8, glow: 0xff4a4a },
    hp: 3400, atk: 42, def: 26, hit: 88, eva: 2, spd: 10, exp: 2400, gear: 1800, fx: 'claw', scale: 2.0,
    skills: [{ name: 'ハサミのたたきつけ', mul: 1.8, target: 'one', chance: 0.3, fx: 'press' }, { name: '甲羅の回転', mul: 0.9, target: 'all', chance: 0.2, fx: 'drill' }],
    drops: [['core', 1, 2], ['alloy', 1, 3]], loot: [['shellbreaker', 1]],
    desc: '沈んだ採掘機の甲羅を背負った巨大ガニ。南の砂浜に出る',
  },
  vortexeel: {
    name: 'ヴォルテックスイール', model: 'en_eel', type: 'bio', boss: true, bounty: 'vortexeel', flying: true, colors: { primary: 0x3a2a6a, secondary: 0x1a1432, organic: 0x6ae8ff, glow: 0xffe060 },
    hp: 5200, atk: 48, def: 20, hit: 90, eva: 14, spd: 17, exp: 3600, gear: 2600, fx: 'bite', scale: 2.0,
    skills: [{ name: '渦潮', mul: 1.0, target: 'all', chance: 0.3, fx: 'beam' }, { name: '放電のかみつき', mul: 1.8, target: 'one', chance: 0.25, fx: 'laser' }],
    drops: [['core', 1, 2], ['cell', 1, 3]], loot: [['eelwhip', 1]],
    desc: '海の底の渦の中にひそむ巨大なうなぎ。水中ユニットがないと近づけない',
  },
  abyssleviathan: {
    name: 'アビスリヴァイア', model: 'en_eel', type: 'bio', boss: true, bounty: 'abyssleviathan', final: true, flying: true, colors: { primary: 0x0e2a3a, secondary: 0x06141c, organic: 0x9a4aff, glow: 0x6ae8ff },
    hp: 8800, atk: 56, def: 30, hit: 92, eva: 6, spd: 12, exp: 7000, gear: 4000, fx: 'bite', acts: 2, scale: 3.0,
    skills: [{ name: '深淵の大渦', mul: 1.0, target: 'all', chance: 0.25, fx: 'beam' }, { name: '海を裂くかみつき', mul: 2.0, target: 'one', chance: 0.2, fx: 'drill' }, { name: '水圧の波', mul: 0.75, target: 'all', chance: 0.15, fx: 'press' }],
    drops: [['core', 1, 3], ['relic', 1, 2]], loot: [['abysscore', 1], ['aquacannon', 1]],
    desc: '水没した都市の最深部にすむ、海の寄生体の親玉。1ターンに2回動く',
  },
};

// 賞金首（ハンターオフィスの手配書）
export const BOUNTIES = {
  rustdriller: { enemy: 'rustdriller', reward: 2000, where: 'ガラン荒野 北の岩場', rank: 'C', note: '一番弱い賞金首。採掘マシンが乗っ取られたもの。電気がよく効く' },
  skywraith: { enemy: 'skywraith', reward: 3500, where: 'ガラン荒野 東の遺跡（空）', rank: 'B', note: '輸送ドローンの群れのリーダー。素早いのでミサイルで狙え' },
  grindtitan: { enemy: 'grindtitan', reward: 8000, where: '廃工場 最奥', rank: 'A', note: '巨大な工業用ロボット。1ターンに2回動く。回復アイテムを多めに' },
  // 第2章「風」の惑星
  windraptor: { enemy: 'windraptor', reward: 9000, where: '疾風高原 風車の丘の西の空', rank: 'B', chapter: 2, note: '巨大な猛禽の宇宙生物。火がよく効く。全体攻撃に注意' },
  aerofort: { enemy: 'aerofort', reward: 14000, where: '疾風高原 北のがけの上空', rank: 'A', chapter: 2, note: '空賊の砲艦の成れの果て。電気がよく効く。装甲が厚いので主砲で' },
  coreguardian: { enemy: 'coreguardian', reward: 24000, where: '嵐の塔 最上階', rank: 'S', chapter: 2, note: '風の制御コアの番人。1ターンに2回動く。回復アイテムを多めに' },
  // 第3章「水」の惑星
  shellcrusher: { enemy: 'shellcrusher', reward: 16000, where: '蒼海諸島 南の島の砂浜', rank: 'A', chapter: 3, note: '巨大なカニ。防御がとても高いので、パイルバンカーや主砲で。火がよく効く' },
  vortexeel: { enemy: 'vortexeel', reward: 24000, where: '蒼海諸島 北西の海の底（水中ユニットが必要）', rank: 'S', chapter: 3, note: '海の底の渦にひそむ大うなぎ。素早い。ミサイルなら当たりやすい' },
  abyssleviathan: { enemy: 'abyssleviathan', reward: 40000, where: '水没都市 最深部', rank: 'SS', chapter: 3, note: '海の寄生体の親玉。1ターンに2回動く。回復アイテムを多めに' },
};

export const ELEMENT_RATE = 1.6; // 弱点属性のダメージ倍率
export const WEAKNESS = { machine: 'elec', bio: 'fire', pirate: null };
