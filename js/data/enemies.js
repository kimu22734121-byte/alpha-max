// 敵の表
// type: machine=乗っ取られた機械（電気に弱い／ギアと素材が多め） / bio=宇宙生物（火に弱い／経験値が多め） / pirate=宇宙海賊
// atk は生身への攻撃力。マシンへの攻撃は x2 してから防御を引く（装甲が一桁大きいので）
// fx: 攻撃演出（shot / bite / claw / missile / beam / drill / press / laser）
// drops: [素材ID, 確率, 個数] / loot: [武器・パーツ・道具のID, 確率]
// flee: 毎ターン逃げる確率（レア敵用）
// 同じ形の色違いで強い版を作る（colors で色替え）
export const ENEMIES = {
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
    drops: [['scrap', 0.3, 1]], loot: [['kitS', 0.25]],
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
    drops: [['alloy', 0.5, 1]],
    desc: 'すぐ逃げる銀色の甲虫。倒すと経験値がたくさん',
  },
  golddrone: {
    name: 'ゴールドドローン', model: 'en_drone', type: 'machine', rare: true, flying: true,
    colors: { primary: 0xf0c030, secondary: 0xb08a20, organic: 0xffe070, glow: 0xffffff }, metal: true,
    hp: 30, atk: 8, def: 30, hit: 70, eva: 25, spd: 26, exp: 30, gear: 1800, fx: 'laser', flee: 0.4,
    drops: [['cell', 0.6, 1]],
    desc: '金ピカのドローン。倒すとギアがたくさん',
  },

  // ---------------- ダンジョン（廃工場, 4種類） ----------------
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
    drops: [['core', 1, 1], ['scrap', 1, 4]], loot: [['arm_heavy', 1]],
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
    drops: [['core', 1, 2], ['alloy', 1, 3]], loot: [['pc1', 1]],
    desc: '廃工場の奥で宇宙生物に乗っ取られた巨大な工業用ロボット',
  },
};

// 賞金首（ハンターオフィスの手配書）
export const BOUNTIES = {
  rustdriller: { enemy: 'rustdriller', reward: 2000, where: 'ガラン荒野 北の岩場', rank: 'C', note: '一番弱い賞金首。採掘マシンが乗っ取られたもの。電気がよく効く' },
  skywraith: { enemy: 'skywraith', reward: 3500, where: 'ガラン荒野 東の遺跡（空）', rank: 'B', note: '輸送ドローンの群れのリーダー。素早いのでミサイルで狙え' },
  grindtitan: { enemy: 'grindtitan', reward: 8000, where: '廃工場 最奥', rank: 'A', note: '巨大な工業用ロボット。1ターンに2回動く。回復アイテムを多めに' },
};

export const ELEMENT_RATE = 1.6; // 弱点属性のダメージ倍率
export const WEAKNESS = { machine: 'elec', bio: 'fire', pirate: null };
