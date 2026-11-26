// マシン用武器の表（5カテゴリ × 10種類 = 50種類）
// cat: cannon=主砲 / mg=機銃 / missile=ミサイル / special=特殊兵器
// mount: back=肩・背中のスロット / arm=腕のスロット / any=通常の6か所のどこでも（特別機の専用武器） / core=アルファの胸のコア（ステラ・ブレイカー）
// target: one=単体 / group=敵グループ / all=敵全体
// elem: elec=電気（機械に強い） / fire=火（宇宙生物に強い）
// tier: 登場する章（1=第1章「土」）。第1弾で手に入るのは tier 1 のみ
// model: 3Dモデル（カテゴリの基本形を色・サイズ違いで使い回す。unique は専用デザイン）
export const WEAPONS = {
  // ---------------- 主砲（単体に大ダメージ） ----------------
  sc1: { name: 'ショートカノン', cat: 'cannon', mount: 'back', target: 'one', atk: 30, hit: 0, wt: 7, price: 400, tier: 1, model: 'wpn_cannon', color: 0x6a6f78, size: 0.85 },
  c75: { name: '75mmカノン', cat: 'cannon', mount: 'back', target: 'one', atk: 40, hit: 0, wt: 9, price: 1100, tier: 1, model: 'wpn_cannon', color: 0x5d6b4a, size: 0.95 },
  rg1: { name: 'レールガンRG-1', cat: 'cannon', mount: 'back', target: 'one', atk: 54, hit: 8, wt: 11, price: 2600, tier: 1, model: 'wpn_cannon', color: 0x3a5a8a, size: 1.05, elem: 'elec' },
  pc1: { name: 'プラズマキャノンPC-1', cat: 'cannon', mount: 'back', target: 'one', atk: 66, hit: -4, wt: 13, price: 5200, tier: 1, model: 'wpn_cannon', color: 0x8a3a8a, size: 1.1 },
  c105: { name: '105mmカノン', cat: 'cannon', mount: 'back', target: 'one', atk: 82, hit: 0, wt: 14, price: 8800, tier: 2, model: 'wpn_cannon', color: 0x6a5a3a, size: 1.15 },
  rg2: { name: 'レールガンRG-2', cat: 'cannon', mount: 'back', target: 'one', atk: 104, hit: 10, wt: 15, price: 15000, tier: 3, model: 'wpn_cannon', color: 0x2a4a9a, size: 1.2, elem: 'elec' },
  pc2: { name: 'プラズマキャノンPC-2', cat: 'cannon', mount: 'back', target: 'one', atk: 132, hit: -4, wt: 17, price: 26000, tier: 4, model: 'wpn_cannon', color: 0xa03aa0, size: 1.25 },
  hrg: { name: 'ヘビーレールガン', cat: 'cannon', mount: 'back', target: 'one', atk: 170, hit: 8, wt: 20, price: 42000, tier: 5, model: 'wpn_cannon', color: 0x1a2a5a, size: 1.35, elem: 'elec' },
  gpc: { name: 'ギガプラズマ', cat: 'cannon', mount: 'back', target: 'one', atk: 230, hit: -6, wt: 24, price: 70000, tier: 6, model: 'wpn_cannon', color: 0xd04ad0, size: 1.45 },

  // ---------------- 機銃（敵グループをまとめて攻撃） ----------------
  mg7: { name: '7mmマシンガン', cat: 'mg', mount: 'arm', target: 'group', atk: 11, hit: 5, wt: 3, price: 250, tier: 1, model: 'wpn_gatling', color: 0x5a5f68, size: 0.8 },
  gt1: { name: 'ガトリングG-1', cat: 'mg', mount: 'arm', target: 'group', atk: 15, hit: 0, wt: 5, price: 800, tier: 1, model: 'wpn_gatling', color: 0x6a5a3a, size: 0.95 },
  lm1: { name: 'レーザー機銃LM-1', cat: 'mg', mount: 'arm', target: 'group', atk: 19, hit: 12, wt: 4, price: 2200, tier: 1, model: 'wpn_gatling', color: 0x3a8a8a, size: 0.9, elem: 'elec' },
  v20: { name: '20mmバルカン', cat: 'mg', mount: 'arm', target: 'group', atk: 24, hit: 0, wt: 7, price: 3800, tier: 1, model: 'wpn_gatling', color: 0x4a4a4a, size: 1.05 },
  gt2: { name: 'ガトリングG-2', cat: 'mg', mount: 'arm', target: 'group', atk: 32, hit: 0, wt: 7, price: 7600, tier: 2, model: 'wpn_gatling', color: 0x7a6a3a, size: 1.1 },
  lm2: { name: 'レーザー機銃LM-2', cat: 'mg', mount: 'arm', target: 'group', atk: 40, hit: 14, wt: 6, price: 13000, tier: 3, model: 'wpn_gatling', color: 0x2a9a9a, size: 1.1, elem: 'elec' },
  v30: { name: '30mmバルカン', cat: 'mg', mount: 'arm', target: 'group', atk: 52, hit: 0, wt: 9, price: 21000, tier: 4, model: 'wpn_gatling', color: 0x3a3a3a, size: 1.2 },
  plg: { name: 'パルスガトリング', cat: 'mg', mount: 'arm', target: 'group', atk: 68, hit: 10, wt: 9, price: 36000, tier: 5, model: 'wpn_gatling', color: 0x4a6aca, size: 1.2, elem: 'elec' },
  hvg: { name: 'ヘビーバルカン', cat: 'mg', mount: 'arm', target: 'all', atk: 80, hit: 0, wt: 12, price: 60000, tier: 6, model: 'wpn_gatling', color: 0x2a2a2a, size: 1.35 },
  stormr: { name: 'ストームレイザー', cat: 'mg', mount: 'arm', target: 'all', atk: 120, hit: 20, wt: 8, price: 0, tier: 7, model: 'wpn_gatling', color: 0x8ae8ff, size: 1.2, unique: true },

  // ---------------- ミサイル（命中が高い） ----------------
  rpod: { name: 'ミサイルポッドMP-1', cat: 'missile', mount: 'back', target: 'all', atk: 25, hit: 20, wt: 6, price: 350, tier: 1, model: 'wpn_missile', color: 0x6a6a5a, size: 0.8 },
  hm1: { name: 'ホーミングミサイルHM-1', cat: 'missile', mount: 'back', target: 'one', atk: 34, hit: 35, wt: 7, price: 1200, tier: 1, model: 'wpn_missile', color: 0x5a6a7a, size: 0.9 },
  cm1: { name: 'クラスターミサイルCM-1', cat: 'missile', mount: 'back', target: 'group', atk: 24, hit: 22, wt: 9, price: 2400, tier: 1, model: 'wpn_missile', color: 0x7a5a3a, size: 1.0 },
  hm2: { name: 'ホーミングミサイルHM-2', cat: 'missile', mount: 'back', target: 'one', atk: 48, hit: 38, wt: 9, price: 4600, tier: 1, model: 'wpn_missile', color: 0x3a5a7a, size: 1.0 },
  cm2: { name: 'クラスターミサイルCM-2', cat: 'missile', mount: 'back', target: 'group', atk: 40, hit: 24, wt: 11, price: 9800, tier: 2, model: 'wpn_missile', color: 0x8a5a2a, size: 1.1 },
  sm1: { name: 'スマートミサイル', cat: 'missile', mount: 'back', target: 'one', atk: 76, hit: 45, wt: 11, price: 16000, tier: 3, model: 'wpn_missile', color: 0x4a7a9a, size: 1.1 },
  cm3: { name: 'クラスターミサイルCM-3', cat: 'missile', mount: 'back', target: 'all', atk: 58, hit: 26, wt: 14, price: 27000, tier: 4, model: 'wpn_missile', color: 0x9a4a1a, size: 1.2 },
  sm2: { name: 'スマートミサイルII', cat: 'missile', mount: 'back', target: 'one', atk: 120, hit: 50, wt: 14, price: 44000, tier: 5, model: 'wpn_missile', color: 0x2a6aaa, size: 1.25 },
  nova: { name: 'ノヴァミサイル', cat: 'missile', mount: 'back', target: 'all', atk: 110, hit: 30, wt: 18, price: 72000, tier: 6, model: 'wpn_missile', color: 0xe0a020, size: 1.35 },
  galaxia: { name: 'ギャラクシアン', cat: 'missile', mount: 'back', target: 'all', atk: 180, hit: 60, wt: 14, price: 0, tier: 7, model: 'wpn_missile', color: 0xf0f0ff, size: 1.3, unique: true },

  // ---------------- 特殊兵器（属性つき。エネルギーを使う） ----------------
  flm1: { name: '火炎放射器F-1', cat: 'special', mount: 'arm', target: 'group', atk: 18, hit: 10, wt: 5, price: 600, tier: 1, model: 'wpn_special', color: 0xa04a2a, size: 0.9, elem: 'fire', en: 6 },
  emp1: { name: 'EMPランチャー', cat: 'special', mount: 'back', target: 'one', atk: 36, hit: 15, wt: 7, price: 1500, tier: 1, model: 'wpn_special', color: 0x3a6aca, size: 1.0, elem: 'elec', en: 10 },
  tsl1: { name: 'テスラコイルT-1', cat: 'special', mount: 'arm', target: 'group', atk: 24, hit: 10, wt: 6, price: 2800, tier: 1, model: 'wpn_special', color: 0x5a5aea, size: 0.95, elem: 'elec', en: 12 },
  npm1: { name: 'ナパームランチャー', cat: 'special', mount: 'back', target: 'group', atk: 30, hit: 8, wt: 9, price: 4200, tier: 1, model: 'wpn_special', color: 0xca5a1a, size: 1.05, elem: 'fire', en: 12 },
  flm2: { name: '火炎放射器F-2', cat: 'special', mount: 'arm', target: 'group', atk: 38, hit: 10, wt: 7, price: 8800, tier: 2, model: 'wpn_special', color: 0xc03a1a, size: 1.05, elem: 'fire', en: 10 },
  emp2: { name: 'EMPキャノン', cat: 'special', mount: 'back', target: 'group', atk: 50, hit: 15, wt: 11, price: 15000, tier: 3, model: 'wpn_special', color: 0x2a4aea, size: 1.15, elem: 'elec', en: 16 },
  tsl2: { name: 'テスラコイルT-2', cat: 'special', mount: 'arm', target: 'all', atk: 56, hit: 12, wt: 9, price: 25000, tier: 4, model: 'wpn_special', color: 0x6a3aff, size: 1.15, elem: 'elec', en: 20 },
  inferno: { name: 'インフェルノ', cat: 'special', mount: 'back', target: 'all', atk: 76, hit: 10, wt: 14, price: 41000, tier: 5, model: 'wpn_special', color: 0xff4a0a, size: 1.25, elem: 'fire', en: 22 },
  thor: { name: 'サンダーボルト', cat: 'special', mount: 'back', target: 'all', atk: 100, hit: 15, wt: 15, price: 68000, tier: 6, model: 'wpn_special', color: 0x8aaaff, size: 1.3, elem: 'elec', en: 26 },
  solflare: { name: 'ソルフレア', cat: 'special', mount: 'back', target: 'all', atk: 160, hit: 25, wt: 12, price: 0, tier: 7, model: 'wpn_special', color: 0xffe08a, size: 1.3, elem: 'fire', en: 30, unique: true },

  // ---------------- 近接（5つ目のカテゴリ。腕に持つ。シャープタイプが得意） ----------------
  // style: blade=斬る / hammer=たたきつぶす / pile=杭を打ちこむ（敵の防御を半分むし）
  hblade: { name: 'ヒートブレード', cat: 'melee', style: 'blade', mount: 'arm', target: 'one', atk: 34, hit: 15, wt: 4, price: 900, tier: 1, model: 'wpn_blade', color: 0x8a4a2a, size: 0.9, elem: 'fire' },
  hammer1: { name: 'スレッジハンマー', cat: 'melee', style: 'hammer', mount: 'arm', target: 'one', atk: 46, hit: 0, wt: 6, price: 1300, tier: 1, model: 'wpn_hammer', color: 0x6a6a5a, size: 0.9 },
  pile1: { name: 'パイルバンカーP-1', cat: 'melee', style: 'pile', mount: 'arm', target: 'one', atk: 52, hit: 6, wt: 6, price: 2400, tier: 1, model: 'wpn_pile', color: 0x5a5a6a, size: 0.95, pierce: true },
  lzblade: { name: 'レーザーブレードLB', cat: 'melee', style: 'blade', mount: 'arm', target: 'one', atk: 46, hit: 18, wt: 5, price: 2800, tier: 1, model: 'wpn_blade', color: 0x3a8aaa, size: 1.0, elem: 'elec' },
  haxe: { name: 'ヒートアックス', cat: 'melee', style: 'hammer', mount: 'arm', target: 'one', atk: 78, hit: 4, wt: 7, price: 9500, tier: 2, model: 'wpn_hammer', color: 0xa04a2a, size: 1.05, elem: 'fire' },
  pzblade: { name: 'プラズマブレード', cat: 'melee', style: 'blade', mount: 'arm', target: 'one', atk: 95, hit: 20, wt: 6, price: 16000, tier: 3, model: 'wpn_blade', color: 0x9a3aaa, size: 1.15 },
  gigahammer: { name: 'ギガハンマー', cat: 'melee', style: 'hammer', mount: 'arm', target: 'group', atk: 110, hit: 0, wt: 10, price: 28000, tier: 4, model: 'wpn_hammer', color: 0x3a3a3a, size: 1.3 },
  pile3: { name: 'パイルバンカーP-3', cat: 'melee', style: 'pile', mount: 'arm', target: 'one', atk: 170, hit: 8, wt: 9, price: 45000, tier: 5, model: 'wpn_pile', color: 0x2a2a4a, size: 1.2, pierce: true },
  photon: { name: 'フォトンセイバー', cat: 'melee', style: 'blade', mount: 'arm', target: 'one', atk: 210, hit: 25, wt: 6, price: 70000, tier: 6, model: 'wpn_blade', color: 0x8ae8ff, size: 1.25, elem: 'elec' },
  valiant: { name: 'ヴァリアントエッジ', cat: 'melee', style: 'blade', mount: 'arm', target: 'all', atk: 300, hit: 30, wt: 6, price: 0, tier: 7, model: 'wpn_blade', color: 0xffe08a, size: 1.4, unique: true },

  // ---------------- 章ごとに増える武器（その章のお店・宝箱・ボスで手に入る） ----------------
  // 第2章「風」の惑星
  galemissile: { name: 'ゲイルミサイル', cat: 'missile', mount: 'back', target: 'group', atk: 46, hit: 28, wt: 10, price: 12000, tier: 3, model: 'wpn_missile', color: 0x6ab8d8, size: 1.1, chapter: 2 },
  windblade: { name: 'ウィンドブレード', cat: 'melee', style: 'blade', mount: 'arm', target: 'one', atk: 88, hit: 22, wt: 4, price: 11500, tier: 3, model: 'wpn_blade', color: 0x9ad8e8, size: 1.1, chapter: 2 },
  // 第3章「水」の惑星
  aquacannon: { name: 'アクアキャノン', cat: 'cannon', mount: 'back', target: 'one', atk: 128, hit: 6, wt: 15, price: 22000, tier: 4, model: 'wpn_cannon', color: 0x2a7ab8, size: 1.25, chapter: 3 },
  torpedo: { name: 'トーピードーTP-1', cat: 'missile', mount: 'back', target: 'one', atk: 98, hit: 40, wt: 12, price: 20000, tier: 4, model: 'wpn_missile', color: 0x3a5a7a, size: 1.15, chapter: 3 },
  tidalgat: { name: 'タイダルガトリング', cat: 'mg', mount: 'arm', target: 'group', atk: 46, hit: 6, wt: 7, price: 19000, tier: 4, model: 'wpn_gatling', color: 0x2a9ab8, size: 1.15, chapter: 3 },
  cryoray: { name: 'クライオレイ', cat: 'special', mount: 'back', target: 'group', atk: 58, hit: 14, wt: 11, price: 21000, tier: 4, model: 'wpn_special', color: 0x8ae8ff, size: 1.15, en: 16, chapter: 3 },
  hydrocutter: { name: 'ハイドロカッター', cat: 'melee', style: 'blade', mount: 'arm', target: 'one', atk: 120, hit: 20, wt: 6, price: 23000, tier: 4, model: 'wpn_blade', color: 0x4ac8e8, size: 1.2, chapter: 3 },
  shellbreaker: { name: 'シェルブレイカー【限定】', cat: 'melee', style: 'hammer', mount: 'arm', target: 'group', atk: 104, hit: 4, wt: 9, price: 0, tier: 4, model: 'wpn_hammer', color: 0xd8a040, size: 1.3, chapter: 3, limited: true },
  // 第4章
  magmacannon: { name: 'マグマキャノン', cat: 'cannon', mount: 'back', target: 'one', atk: 170, hit: 4, wt: 17, price: 34000, tier: 5, model: 'wpn_cannon', color: 0xc84a14, size: 1.3, elem: 'fire', chapter: 4 },
  lavagat: { name: 'ラーヴァガトリング', cat: 'mg', mount: 'arm', target: 'group', atk: 60, hit: 4, wt: 8, price: 30000, tier: 5, model: 'wpn_gatling', color: 0xff6a1a, size: 1.2, elem: 'fire', chapter: 4 },
  flaremissile: { name: 'フレアミサイル', cat: 'missile', mount: 'back', target: 'group', atk: 62, hit: 26, wt: 12, price: 31000, tier: 5, model: 'wpn_missile', color: 0xd84a2a, size: 1.2, elem: 'fire', chapter: 4 },
  heatsaber: { name: 'ヒートセイバー', cat: 'melee', mount: 'arm', target: 'one', atk: 165, hit: 18, wt: 6, price: 36000, tier: 5, model: 'wpn_blade', color: 0xff7a2a, size: 1.25, elem: 'fire', style: 'blade', chapter: 4 },
  // 第5章
  lumencannon: { name: 'ルーメンキャノン', cat: 'cannon', mount: 'back', target: 'one', atk: 215, hit: 10, wt: 17, price: 52000, tier: 6, model: 'wpn_cannon', color: 0xfff0a0, size: 1.35, elem: 'elec', chapter: 5 },
  prismgat: { name: 'プリズムガトリング', cat: 'mg', mount: 'arm', target: 'group', atk: 78, hit: 12, wt: 8, price: 46000, tier: 6, model: 'wpn_gatling', color: 0xa8d8ff, size: 1.2, elem: 'elec', chapter: 5 },
  halomissile: { name: 'ヘイローミサイル', cat: 'missile', mount: 'back', target: 'one', atk: 160, hit: 50, wt: 12, price: 48000, tier: 6, model: 'wpn_missile', color: 0xe8c050, size: 1.2, chapter: 5 },
  crystallance: { name: 'クリスタルランス', cat: 'melee', mount: 'arm', target: 'one', atk: 230, hit: 12, wt: 8, price: 55000, tier: 6, model: 'wpn_pile', color: 0xd8e4f0, size: 1.3, style: 'pile', pierce: true, chapter: 5 },
  // 第6章
  shadowcannon: { name: 'シャドウキャノン', cat: 'cannon', mount: 'back', target: 'one', atk: 255, hit: 6, wt: 18, price: 76000, tier: 6, model: 'wpn_cannon', color: 0x4a2a8a, size: 1.4, chapter: 6 },
  nightvulcan: { name: 'ナイトバルカン', cat: 'mg', mount: 'arm', target: 'all', atk: 70, hit: 6, wt: 10, price: 70000, tier: 6, model: 'wpn_gatling', color: 0x2a2434, size: 1.3, chapter: 6 },
  umbralnova: { name: 'アンブラノヴァ', cat: 'missile', mount: 'back', target: 'all', atk: 90, hit: 20, wt: 13, price: 74000, tier: 6, model: 'wpn_missile', color: 0x9a7aff, size: 1.3, elem: 'fire', chapter: 6 },
  voidscythe: { name: 'ヴォイドサイズ', cat: 'melee', mount: 'arm', target: 'group', atk: 160, hit: 10, wt: 8, price: 78000, tier: 6, model: 'wpn_blade', color: 0x6a4aca, size: 1.35, style: 'blade', chapter: 6 },
  // 第7章
  corebreaker: { name: 'コアブレイカー【限定】', cat: 'melee', mount: 'arm', target: 'one', atk: 320, hit: 24, wt: 8, price: 0, tier: 7, model: 'wpn_pile', color: 0xff4ad0, size: 1.4, elem: 'fire', style: 'pile', pierce: true, limited: true, chapter: 7 },
  starfall: { name: 'スターフォール', cat: 'missile', mount: 'back', target: 'all', atk: 120, hit: 30, wt: 13, price: 98000, tier: 7, model: 'wpn_missile', color: 0xffe0ff, size: 1.35, elem: 'elec', chapter: 7 },
};

// 攻撃の範囲（技ではなく武器ごとに決まる）
// 全体の武器は1体あたりの威力を低め・エネルギー消費を多めに、単体の武器は威力を高めにする
// （ザコ戦は全体、ボス戦は単体の大ダメージ、と使い分けられるように）
// ================================================================ 特別機の専用武器（only でその機体だけ）
// 強さの目安（noRule：範囲ルールをかけない数値）。同じ時期の通常の武器より約5割上（v0.9.1 で引き上げ）。ステラ・ブレイカーよりは下
//   アルファ＝バランス型（どの範囲も少し上）／オメガ＝単体が強い（第1章で手に入る）／ガイア＝グループが強い（第2章以降）
// rank：専用武器の強さの順位（1＝最強）。sig：発射の演出の種類（battle.js の signatureFire）
Object.assign(WEAPONS, {
  // ---- アルファ（白と金・青白い光）。第一封印の解放（第1章の最後）から使える
  alpha_lance: { name: 'ルミナス・ランス', cat: 'cannon', mount: 'any', target: 'one', atk: 315, hit: 20, wt: 10, price: 0, tier: 4, model: 'wpn_alpha_lance', color: 0xf4f2ea, glow: 0x9fe8ff, size: 1.0, unique: true, only: 'alpha', elem: 'elec', noRule: true, rank: 2, sig: 'lance', sfx: 'beam' },
  alpha_halo: { name: 'ヘイロー・ガトリング', cat: 'mg', mount: 'any', target: 'group', atk: 111, hit: 22, wt: 6, price: 0, tier: 4, model: 'wpn_alpha_halo', color: 0xf4f2ea, glow: 0xffd86a, size: 1.0, unique: true, only: 'alpha', noRule: true, rank: 6, sig: 'halo', sfx: 'laser' },
  alpha_aurora: { name: 'オーロラ・ミサイル', cat: 'missile', mount: 'any', target: 'all', atk: 75, hit: 40, wt: 8, en: 18, price: 0, tier: 4, model: 'wpn_alpha_aurora', color: 0xf4f2ea, glow: 0x9fe8ff, size: 1.0, unique: true, only: 'alpha', noRule: true, rank: 8, sig: 'aurora', sfx: 'missile' },
  // ---- オメガ（漆黒と赤）。第1章の地下で手に入る
  omega_buster: { name: 'オメガバスター', cat: 'cannon', mount: 'any', target: 'one', atk: 228, hit: 25, wt: 9, price: 0, tier: 3, model: 'wpn_omega_buster', color: 0x15151c, glow: 0xff2a3a, size: 1.0, unique: true, only: 'omega', elem: 'elec', noRule: true, rank: 4, sig: 'crimson', sfx: 'cannon' },
  omega_storm: { name: 'オメガストーム', cat: 'mg', mount: 'any', target: 'group', atk: 87, hit: 20, wt: 5, price: 0, tier: 3, model: 'wpn_omega_storm', color: 0x15151c, glow: 0xff2a3a, size: 1.0, unique: true, only: 'omega', noRule: true, rank: 7, sig: 'storm', sfx: 'mg' },
  omega_nova: { name: 'オメガノヴァ', cat: 'missile', mount: 'any', target: 'all', atk: 60, hit: 40, wt: 8, en: 18, price: 0, tier: 3, model: 'wpn_omega_nova', color: 0x2a0a10, glow: 0xff2a3a, size: 1.0, unique: true, only: 'omega', noRule: true, rank: 10, sig: 'nova', sfx: 'missile' },
  // ---- ガイア（深紅と鋼の赤・大地）。第2章以降の隠し場所
  gaia_pile: { name: 'テラ・パイル', cat: 'melee', style: 'pile', pierce: true, mount: 'any', target: 'one', atk: 263, hit: 8, wt: 12, price: 0, tier: 4, model: 'wpn_gaia_pile', color: 0x8a2a20, glow: 0xff7a2a, size: 1.0, unique: true, only: 'gaia', noRule: true, rank: 3, sig: 'terra', sfx: 'press' },
  gaia_claymore: { name: 'ガイア・クレイモア', cat: 'melee', style: 'blade', mount: 'any', target: 'group', atk: 203, hit: 6, wt: 12, price: 0, tier: 4, model: 'wpn_gaia_claymore', color: 0x8a2a20, glow: 0xff7a2a, size: 1.0, unique: true, only: 'gaia', elem: 'fire', noRule: true, rank: 5, sig: 'claymore', sfx: 'metalhit' },
  gaia_quake: { name: 'アース・クエイク', cat: 'special', mount: 'any', target: 'all', atk: 66, hit: 30, wt: 10, en: 20, price: 0, tier: 4, model: 'wpn_gaia_quake', color: 0x6a3a2a, glow: 0xff9a3a, size: 1.0, unique: true, only: 'gaia', noRule: true, rank: 9, sig: 'quake', sfx: 'press' },
  // ---- アルファの第7の専用スロット（胸のコア）にだけ付く、ゲーム中で最強の武器
  // 範囲は撃つ前に切り替える（modes の倍率：単体が最大、全体が最小）。威力は章ごとに5段階で進化（v1.5〜。sealAtk[段階] が単体の威力。0 はまだ撃てない）
  //  段階（state.js の stellaStage）：第1・2章＝0（撃てない）、第3章＝1、第4章＝2、第5章＝3、第6章＝4、第6章クリア後＝5（最強）
  stella: { name: 'ステラ・ブレイカー', cat: 'cannon', mount: 'core', target: 'one', modes: { one: 1.0, group: 0.72, all: 0.52 }, sealAtk: [0, 420, 560, 720, 880, 1050], atk: 300, hit: 50, wt: 0, en: 30, price: 0, tier: 7, model: null, color: 0xf4f2ea, glow: 0xbff4ff, unique: true, only: 'alpha', noRule: true, rank: 1, sig: 'stella', sfx: 'beam',
    stageNames: ['封印（まだ撃てない）', '目覚めの光', '白金の光', '星光の奔流', '闇を裂く光', 'アルファマックス・ステラ'] },
});

export const RANGES = {
  one: { name: '単体', short: '単', atkRate: 1.15, enAdd: 0 },
  group: { name: 'グループ', short: 'G', atkRate: 1.0, enAdd: 0 },
  all: { name: '全体', short: '全', atkRate: 0.62, enAdd: 8 },
};
for (const w of Object.values(WEAPONS)) {
  if (w.noRule) continue;
  const r = RANGES[w.target];
  w.atk = Math.round(w.atk * r.atkRate);
  if (r.enAdd) w.en = (w.en || 0) + r.enAdd + Math.round((w.tier - 1) * 2);
}

export const WEAPON_CATS = {
  cannon: { name: '主砲', icon: '◆' },
  mg: { name: '機銃', icon: '≡' },
  missile: { name: 'ミサイル', icon: '▲' },
  special: { name: '特殊', icon: '✦' },
  melee: { name: '近接', icon: '†' },
};

// 武器強化（+1〜+5）。plus が1上がるごとに攻撃力が上がる
export const UPGRADE = {
  maxPlus: 5, // 第1弾の上限。フィールドが増えたら解放する
  atkRate: 0.12, // +1ごとに攻撃力 +12%
  // n → n+1 に必要なもの。gear は武器の値段に対する割合
  costs: [
    { gearRate: 0.3, materials: { scrap: 2 } },
    { gearRate: 0.45, materials: { scrap: 3, bio: 1 } },
    { gearRate: 0.6, materials: { scrap: 3, cell: 1, alloy: 1 } },
    { gearRate: 0.8, materials: { cell: 2, alloy: 2 } },
    { gearRate: 1.0, materials: { alloy: 3, core: 1 } },
  ],
  minGear: 150,
};
