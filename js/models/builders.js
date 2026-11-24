// ローポリ3Dモデルの作り方。
// - ゲーム内では models/*.glb を優先して読み込み、無い場合はここで直接組み立てる
// - tools/export-glb.mjs がこのファイルを使って models/*.glb を書き出す
// 共通ルール：+Z が正面、Y が上。マテリアル名（primary / secondary / accent / dark / metal /
// skin / glow / organic / visor）で後から色替えできる。
// 空ノード socket_* は取り付け位置、muzzle は発射位置。
import * as THREE from 'three';

const DEFAULT_COLORS = {
  primary: 0x8a8f99,
  secondary: 0x5a606b,
  accent: 0xd8a032,
  dark: 0x2a2d33,
  metal: 0x9aa3ad,
  skin: 0xf1c7a0,
  hair: 0x5b3a22,
  glow: 0x5ff2ff,
  organic: 0x8b3fa8,
  visor: 0x1b4a63,
  lens: 0xffb43a,
  leather: 0x6b4426,
};

function makeMats(colors = {}) {
  const cache = {};
  return (role) => {
    if (cache[role]) return cache[role];
    const color = colors[role] ?? DEFAULT_COLORS[role] ?? 0xffffff;
    const o = { name: role, color, roughness: 0.75, metalness: 0.1, flatShading: true };
    if (role === 'metal' || role === 'dark') { o.metalness = 0.45; o.roughness = 0.5; }
    if (role === 'glow' || role === 'lens') { o.emissive = color; o.emissiveIntensity = role === 'glow' ? 1.4 : 0.8; }
    if (role === 'organic') { o.emissive = colors.organicGlow ?? 0x3a0a4a; o.emissiveIntensity = 0.6; o.roughness = 0.35; }
    if (role === 'visor') { o.metalness = 0.6; o.roughness = 0.15; o.emissive = color; o.emissiveIntensity = 0.3; }
    cache[role] = new THREE.MeshStandardMaterial(o);
    return cache[role];
  };
}

// ---- 形のヘルパー ----
// 同じ寸法の形は使い回す（GLBが小さくなる）。UVは使わないので消す
const GEO_CACHE = new Map();
function geo(key, make) {
  let g = GEO_CACHE.get(key);
  if (!g) { g = make(); g.deleteAttribute('uv'); GEO_CACHE.set(key, g); }
  return g;
}
const r3 = (v) => Math.round(v * 1000) / 1000;
const Bx = (w, h, d) => geo(`b${r3(w)},${r3(h)},${r3(d)}`, () => new THREE.BoxGeometry(r3(w), r3(h), r3(d)));
const Cy = (rt, rb, h, s = 8) => geo(`c${r3(rt)},${r3(rb)},${r3(h)},${s}`, () => new THREE.CylinderGeometry(r3(rt), r3(rb), r3(h), s));
const Sp = (r, d = 1) => geo(`s${r3(r)},${d}`, () => new THREE.IcosahedronGeometry(r3(r), d));
const Co = (r, h, s = 8) => geo(`o${r3(r)},${r3(h)},${s}`, () => new THREE.ConeGeometry(r3(r), r3(h), s));
const To = (r, t, rs = 6, ts = 12) => geo(`t${r3(r)},${r3(t)},${rs},${ts}`, () => new THREE.TorusGeometry(r3(r), r3(t), rs, ts));

function add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, name) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (name) m.name = name;
  parent.add(m);
  return m;
}
function grp(parent, name, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.name = name || '';
  g.position.set(x, y, z);
  if (parent) parent.add(g);
  return g;
}
function socket(parent, name, x, y, z) { return grp(parent, name, x, y, z); }

// =====================================================================
// キャラクター（2〜3頭身のデフォルメ）
// =====================================================================
function chibiBase(m, o = {}) {
  const bulk = o.bulk ?? 1;
  const root = grp(null, 'char');
  root.userData.kind = 'char';
  // 脚
  for (const side of [-1, 1]) {
    const leg = grp(root, side < 0 ? 'legR' : 'legL', 0.085 * bulk * side, 0.27, 0);
    add(leg, Bx(0.12 * bulk, 0.22, 0.14), m(o.legRole || 'secondary'), 0, -0.11, 0);
    add(leg, Bx(0.14 * bulk, 0.08, 0.21), m('dark'), 0, -0.23, 0.03);
  }
  // 胴
  const torso = grp(root, 'torso', 0, 0.26, 0);
  add(torso, Bx(0.33 * bulk, 0.32, 0.23 * Math.min(bulk, 1.2)), m('primary'), 0, 0.16, 0);
  // 腕
  for (const side of [-1, 1]) {
    const arm = grp(torso, side < 0 ? 'armR' : 'armL', (0.2 * bulk + 0.01) * side, 0.29, 0);
    add(arm, Bx(0.1 * bulk, 0.24, 0.11 * bulk), m(o.armRole || 'primary'), 0, -0.11, 0);
    add(arm, Sp(0.058 * bulk, 0), m(o.handRole || 'skin'), 0, -0.26, 0.01);
  }
  // 頭（大きめ）
  const head = grp(root, 'head', 0, 0.6, 0);
  add(head, Sp(0.215, 1), m('skin'), 0, 0.19, 0);
  // 目
  for (const side of [-1, 1]) add(head, Bx(0.045, 0.07, 0.02), m('dark'), 0.075 * side, 0.18, 0.205);
  return { root, torso, head };
}

function buildRen(colors) {
  const m = makeMats({ primary: 0xd9782d, secondary: 0x8c4f22, hair: 0x4a2e1a, ...colors });
  const { root, torso, head } = chibiBase(m);
  // 髪（ツンツン）
  const cap = add(head, Sp(0.205, 1), m('hair'), 0, 0.27, -0.04); cap.scale.set(1.06, 0.72, 1.06);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(head, Co(0.06, 0.16, 5), m('hair'), Math.cos(a) * 0.12, 0.4, Math.sin(a) * 0.1 - 0.03, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6);
  }
  // ゴーグル
  add(head, To(0.205, 0.018, 4, 16), m('leather'), 0, 0.27, 0, Math.PI / 2 - 0.15, 0, 0);
  for (const s of [-1, 1]) {
    add(head, Cy(0.05, 0.05, 0.05, 10), m('metal'), 0.07 * s, 0.3, 0.19, Math.PI / 2 - 0.3, 0, 0);
    add(head, Cy(0.038, 0.038, 0.052, 10), m('lens'), 0.07 * s, 0.3, 0.2, Math.PI / 2 - 0.3, 0, 0);
  }
  // 腰の工具ベルト
  add(torso, Bx(0.36, 0.06, 0.25), m('leather'), 0, 0.03, 0);
  add(torso, Bx(0.03, 0.17, 0.03), m('metal'), 0.17, -0.03, 0.08, 0, 0, 0.2);
  add(torso, To(0.035, 0.012, 4, 8), m('metal'), 0.185, 0.06, 0.08, 0, Math.PI / 2, 0);
  add(torso, Bx(0.08, 0.07, 0.05), m('leather'), -0.15, 0.0, 0.12);
  // 油汚れ
  add(torso, Bx(0.07, 0.05, 0.01), m('dark'), 0.06, 0.22, 0.118);
  add(torso, Bx(0.05, 0.04, 0.01), m('dark'), -0.1, 0.12, 0.118);
  return root;
}

function buildShion(colors) {
  const m = makeMats({ primary: 0x24324f, secondary: 0x1a2438, accent: 0xe8eef5, ...colors });
  const { root, torso, head } = chibiBase(m, { handRole: 'accent' });
  const helm = add(head, Sp(0.235, 1), m('accent'), 0, 0.2, -0.01);
  helm.scale.set(1, 1.02, 1.03);
  const visor = add(head, Sp(0.2, 1), m('visor'), 0, 0.18, 0.07);
  visor.scale.set(1.0, 0.62, 0.9);
  add(head, Bx(0.05, 0.03, 0.3), m('primary'), 0, 0.43, -0.03); // 中央の線
  add(head, Bx(0.02, 0.12, 0.02), m('metal'), 0.2, 0.36, -0.05, 0, 0, -0.2); // アンテナ
  // スーツのライン
  add(torso, Bx(0.035, 0.32, 0.01), m('accent'), 0, 0.16, 0.118);
  add(torso, Bx(0.34, 0.03, 0.24), m('accent'), 0, 0.27, 0);
  // 背中の生命維持パック
  add(torso, Bx(0.22, 0.2, 0.08), m('secondary'), 0, 0.18, -0.15);
  add(torso, Cy(0.02, 0.02, 0.12), m('glow', 0), 0.07, 0.18, -0.19);
  return root;
}

function buildGald(colors) {
  const m = makeMats({ primary: 0x4d5a36, secondary: 0x353b2a, accent: 0xb33a2a, hair: 0x22201c, skin: 0xd7a07a, ...colors });
  const { root, torso, head } = chibiBase(m, { bulk: 1.35, armRole: 'secondary' });
  // 胸アーマーと肩当て
  add(torso, Bx(0.5, 0.26, 0.34), m('primary'), 0, 0.2, 0.01);
  for (const s of [-1, 1]) {
    add(torso, Bx(0.2, 0.12, 0.24), m('primary'), 0.29 * s, 0.33, 0, 0, 0, 0.25 * s);
    add(torso, Bx(0.12, 0.04, 0.2), m('metal'), 0.31 * s, 0.4, 0, 0, 0, 0.25 * s);
  }
  add(torso, Bx(0.5, 0.07, 0.35), m('leather'), 0, 0.03, 0);
  add(torso, Bx(0.08, 0.1, 0.06), m('metal'), 0.16, 0.0, 0.18);
  // 短髪とバンダナ、傷
  const hair = add(head, Sp(0.2, 1), m('hair'), 0, 0.3, -0.04); hair.scale.set(1.0, 0.45, 1.0);
  add(head, To(0.21, 0.025, 4, 16), m('accent'), 0, 0.27, 0, Math.PI / 2 - 0.1, 0, 0);
  add(head, Bx(0.012, 0.09, 0.01), m('accent'), -0.08, 0.13, 0.2, 0, 0, 0.4);
  // 少し大きく
  root.scale.setScalar(1.12);
  return root;
}

function buildNpc(variant, colors) {
  const palettes = {
    a: { primary: 0x6c7a5a, secondary: 0x3f4636, hair: 0x5b3a22 },
    b: { primary: 0x7a5f8a, secondary: 0x4a3a55, hair: 0xd8d2c0 },
    pirate: { primary: 0x5a2222, secondary: 0x2e1d1d, accent: 0xc23a2a, hair: 0x1d1d1d },
    clerk: { primary: 0x2f5f7a, secondary: 0x223344, hair: 0x7a4a2a, accent: 0xf0f0f0 },
  };
  const m = makeMats({ ...palettes[variant], ...colors });
  const { root, torso, head } = chibiBase(m);
  if (variant === 'a') {
    const cap = add(head, Sp(0.21, 1), m('secondary'), 0, 0.27, -0.02); cap.scale.set(1.05, 0.55, 1.05);
    add(head, Bx(0.22, 0.03, 0.14), m('secondary'), 0, 0.27, 0.22);
  } else if (variant === 'b') {
    const hood = add(head, Sp(0.24, 1), m('primary'), 0, 0.2, -0.04); hood.scale.set(1.05, 1.05, 1.0);
    add(head, Sp(0.19, 1), m('skin'), 0, 0.18, 0.06).scale.set(0.95, 0.9, 0.8);
    for (const s of [-1, 1]) add(head, Bx(0.045, 0.07, 0.02), m('dark'), 0.075 * s, 0.18, 0.215);
    add(torso, Bx(0.38, 0.12, 0.27), m('primary'), 0, -0.02, 0); // ローブの裾
  } else if (variant === 'pirate') {
    const ban = add(head, Sp(0.212, 1), m('accent'), 0, 0.27, -0.02); ban.scale.set(1.05, 0.6, 1.05);
    add(head, Co(0.05, 0.14, 4), m('accent'), -0.05, 0.26, -0.2, -1.2, 0, 0);
    add(head, Bx(0.07, 0.06, 0.02), m('dark'), 0.075, 0.18, 0.215); // 眼帯
    add(head, Bx(0.3, 0.015, 0.01), m('dark'), 0, 0.22, 0.2, 0, 0, 0.3);
    add(torso, Bx(0.37, 0.3, 0.26), m('secondary'), 0, 0.12, -0.01); // コート
  } else if (variant === 'clerk') {
    const hair = add(head, Sp(0.205, 1), m('hair'), 0, 0.27, -0.04); hair.scale.set(1.06, 0.7, 1.06);
    for (const s of [-1, 1]) add(head, To(0.04, 0.008, 4, 10), m('dark'), 0.075 * s, 0.18, 0.215);
    add(torso, Bx(0.2, 0.2, 0.01), m('accent'), 0, 0.17, 0.118);
    add(torso, Bx(0.04, 0.12, 0.01), m('primary'), 0, 0.19, 0.122);
  }
  return root;
}

// =====================================================================
// マシンのパーツ（ガングリフォン風のずんぐり重厚な歩行戦車）
// =====================================================================
function buildLegsBiped(colors) {
  const m = makeMats(colors);
  const root = grp(null, 'legs');
  root.userData = { kind: 'legs', legType: 'biped' };
  add(root, Bx(0.8, 0.3, 0.6), m('secondary'), 0, 1.02, 0);
  add(root, Bx(0.5, 0.18, 0.5), m('dark'), 0, 0.85, 0);
  for (const s of [-1, 1]) {
    const leg = grp(root, s < 0 ? 'legR' : 'legL', 0.42 * s, 1.0, 0);
    add(leg, Bx(0.22, 0.22, 0.22), m('metal'), 0, 0, 0, 0, 0, Math.PI / 4 * 0); // 股関節
    const thigh = grp(leg, '', 0.04 * s, 0, 0);
    thigh.rotation.x = -0.45;
    add(thigh, Bx(0.3, 0.55, 0.38), m('primary'), 0, -0.27, 0);
    add(thigh, Bx(0.32, 0.12, 0.2), m('accent'), 0, -0.1, 0.18);
    const shin = grp(thigh, '', 0, -0.52, 0);
    shin.rotation.x = 0.95;
    add(shin, Sp(0.13, 0), m('dark'), 0, 0, 0);
    add(shin, Bx(0.26, 0.5, 0.3), m('primary'), 0, -0.25, -0.02);
    add(shin, Cy(0.05, 0.05, 0.4), m('metal'), 0, -0.25, -0.2);
    const foot = grp(shin, '', 0, -0.5, 0);
    foot.rotation.x = -0.5;
    add(foot, Bx(0.36, 0.12, 0.6), m('secondary'), 0, -0.04, 0.08);
    add(foot, Bx(0.34, 0.06, 0.18), m('dark'), 0, -0.06, 0.42);
  }
  socket(root, 'socket_body', 0, 1.15, 0);
  return root;
}

function buildLegsQuad(colors) {
  const m = makeMats(colors);
  const root = grp(null, 'legs');
  root.userData = { kind: 'legs', legType: 'quad' };
  add(root, Bx(1.0, 0.3, 1.0), m('secondary'), 0, 0.9, 0);
  const names = ['legR', 'legL', 'legBR', 'legBL'];
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => {
    const leg = grp(root, names[i], 0.45 * sx, 0.88, 0.4 * sz);
    const up = grp(leg, '');
    up.rotation.set(0.5 * sz, 0, -0.7 * sx);
    add(up, Bx(0.2, 0.55, 0.22), m('primary'), 0, -0.27, 0);
    const low = grp(up, '', 0, -0.52, 0);
    low.rotation.z = 1.2 * sx;
    low.rotation.x = -0.6 * sz;
    add(low, Bx(0.18, 0.55, 0.2), m('primary'), 0, -0.27, 0);
    add(low, Bx(0.26, 0.08, 0.3), m('dark'), 0, -0.56, 0);
  });
  socket(root, 'socket_body', 0, 1.05, 0);
  return root;
}

function buildLegsTread(colors) {
  const m = makeMats(colors);
  const root = grp(null, 'legs');
  root.userData = { kind: 'legs', legType: 'tread' };
  add(root, Bx(0.8, 0.35, 0.8), m('secondary'), 0, 0.62, 0);
  for (const s of [-1, 1]) {
    const t = grp(root, s < 0 ? 'legR' : 'legL', 0.55 * s, 0.3, 0);
    add(t, Bx(0.34, 0.42, 1.4), m('dark'), 0, 0, 0);
    add(t, Bx(0.36, 0.12, 1.2), m('primary'), 0, 0.24, 0);
    for (let i = 0; i < 4; i++) add(t, Cy(0.16, 0.16, 0.38, 10), m('metal'), 0, -0.05, -0.5 + i * 0.33, 0, 0, Math.PI / 2);
  }
  socket(root, 'socket_body', 0, 0.8, 0);
  return root;
}

function buildLegsHover(colors) {
  const m = makeMats(colors);
  const root = grp(null, 'legs');
  root.userData = { kind: 'legs', legType: 'hover', hover: true };
  add(root, Cy(0.55, 0.75, 0.45, 6), m('primary'), 0, 0.55, 0);
  add(root, Cy(0.7, 0.7, 0.06, 6), m('glow'), 0, 0.3, 0);
  add(root, Cy(0.4, 0.55, 0.2, 6), m('secondary'), 0, 0.85, 0);
  for (const s of [-1, 1]) add(root, Bx(0.12, 0.3, 0.6), m('accent'), 0.72 * s, 0.55, 0, 0, 0, 0.3 * s);
  socket(root, 'socket_body', 0, 0.95, 0);
  return root;
}

// ボディ（フレーム）。hatch はコクピットのハッチ（後ろ側の辺を軸に開く）
function buildBody(colors, heavy = false) {
  const m = makeMats(colors);
  const k = heavy ? 1.15 : 1;
  const root = grp(null, 'body');
  root.userData = { kind: 'body' };
  add(root, Bx(1.1 * k, 0.7, 0.95 * k), m('primary'), 0, 0.35, 0);
  add(root, Bx(1.0 * k, 0.25, 0.7), m('primary'), 0, 0.72, -0.08);
  // 前面の傾斜装甲
  add(root, Bx(0.95 * k, 0.45, 0.12), m('secondary'), 0, 0.42, 0.5, -0.45, 0, 0);
  add(root, Bx(1.18 * k, 0.12, 1.0 * k), m('dark'), 0, 0.03, 0);
  // サイドスカート
  for (const s of [-1, 1]) {
    add(root, Bx(0.12, 0.5, 0.8 * k), m('secondary'), 0.58 * k * s, 0.3, 0);
    add(root, Bx(0.04, 0.04, 0.6), m('glow'), 0.645 * k * s, 0.42, 0.05); // 封印のライン
  }
  add(root, Bx(0.6, 0.04, 0.04), m('glow'), 0, 0.62, 0.48, -0.45, 0, 0);
  // 排気
  for (const s of [-1, 1]) add(root, Cy(0.07, 0.09, 0.3), m('dark'), 0.3 * s, 0.85, -0.38);
  // ハッチ
  const hatch = grp(root, 'hatch', 0, 0.86, -0.05);
  add(hatch, Bx(0.55, 0.08, 0.5), m('accent'), 0, 0.02, 0.25);
  add(hatch, Bx(0.3, 0.03, 0.2), m('visor'), 0, 0.07, 0.28);
  if (heavy) {
    add(root, Bx(1.35, 0.2, 0.5), m('secondary'), 0, 0.6, -0.2);
    for (const s of [-1, 1]) add(root, Bx(0.18, 0.7, 0.18), m('metal'), 0.62 * s, 0.6, -0.4);
  }
  socket(root, 'socket_head', 0, 0.82, 0.32);
  socket(root, 'socket_armR', -0.66 * k, 0.5, 0.05);
  socket(root, 'socket_armL', 0.66 * k, 0.5, 0.05);
  socket(root, 'socket_back1', 0, 0.9, -0.42);
  socket(root, 'socket_back2', -0.42 * k, 0.88, -0.42);
  socket(root, 'socket_back3', 0.42 * k, 0.88, -0.42);
  return root;
}

function buildHead(colors, variant) {
  const m = makeMats(colors);
  const root = grp(null, 'head');
  root.userData = { kind: 'head' };
  if (variant === 'radar') {
    add(root, Bx(0.34, 0.22, 0.4), m('secondary'), 0, 0.11, 0);
    add(root, Bx(0.2, 0.06, 0.04), m('glow'), 0, 0.12, 0.21);
    const radar = grp(root, 'radar', 0, 0.28, -0.05);
    add(radar, Cy(0.03, 0.03, 0.14), m('metal'), 0, -0.04, 0);
    add(radar, Cy(0.22, 0.05, 0.06, 10), m('accent'), 0, 0.05, 0, 0.5, 0, 0);
  } else if (variant === 'heavy') {
    add(root, Bx(0.46, 0.28, 0.44), m('primary'), 0, 0.14, 0);
    add(root, Bx(0.4, 0.05, 0.05), m('glow'), 0, 0.15, 0.22);
    add(root, Bx(0.5, 0.08, 0.3), m('secondary'), 0, 0.3, -0.03);
  } else {
    // センサーヘッド（モノアイ＋アンテナ）
    add(root, Bx(0.36, 0.24, 0.42), m('primary'), 0, 0.12, 0);
    add(root, Bx(0.38, 0.08, 0.2), m('secondary'), 0, 0.26, -0.05);
    add(root, Cy(0.07, 0.07, 0.06, 10), m('dark'), 0, 0.12, 0.21, Math.PI / 2, 0, 0);
    add(root, Cy(0.045, 0.045, 0.07, 10), m('glow'), 0, 0.12, 0.225, Math.PI / 2, 0, 0, 'eye');
    add(root, Cy(0.012, 0.012, 0.4), m('metal'), 0.14, 0.4, -0.1, -0.2, 0, -0.1);
    add(root, Bx(0.04, 0.12, 0.1), m('accent'), -0.17, 0.2, 0.05);
  }
  return root;
}

// 右腕として作る（左腕は scale.x=-1 で反転）。socket_hand に腕武器を付ける
function buildArm(colors, variant) {
  const m = makeMats(colors);
  const root = grp(null, 'arm');
  root.userData = { kind: 'arm' };
  const k = variant === 'heavy' ? 1.25 : variant === 'light' ? 0.8 : variant === 'power' ? 1.15 : 1;
  add(root, Bx(0.34 * k, 0.34 * k, 0.44 * k), m('primary'), -0.12 * k, 0.05, 0);
  add(root, Bx(0.36 * k, 0.1, 0.3 * k), m('accent'), -0.12 * k, 0.25 * k, 0);
  const upper = grp(root, 'upper', -0.14 * k, -0.1, 0);
  add(upper, Bx(0.18 * k, 0.4, 0.2 * k), m('dark'), 0, -0.2, 0);
  const fore = grp(upper, 'fore', 0, -0.4, 0);
  add(fore, Bx(0.24 * k, 0.24 * k, 0.5 * k), m('primary'), 0, 0, 0.15);
  if (variant === 'power') {
    for (const s of [-1, 1]) add(fore, Cy(0.03, 0.03, 0.45), m('metal'), 0.12 * s, 0.16, 0.1, Math.PI / 2, 0, 0);
    add(root, Cy(0.18, 0.18, 0.2, 8), m('metal'), -0.12 * k, 0.05, 0, 0, 0, Math.PI / 2);
  }
  if (variant === 'heavy') add(fore, Bx(0.3 * k, 0.12, 0.4), m('secondary'), 0, 0.17, 0.12);
  socket(fore, 'socket_hand', 0, -0.05, 0.42 * k);
  return root;
}

// ---- 武器（カテゴリごとの基本形。色とサイズで使い回す） ----
function buildWeapon(colors, kind) {
  const m = makeMats({ primary: 0x575d66, secondary: 0x3a3e45, ...colors });
  const root = grp(null, 'weapon');
  root.userData = { kind: 'weapon', weaponKind: kind };
  if (kind === 'cannon') {
    add(root, Bx(0.3, 0.26, 0.5), m('primary'), 0, 0, 0);
    add(root, Cy(0.07, 0.08, 1.1, 8), m('secondary'), 0, 0.02, 0.75, Math.PI / 2, 0, 0);
    add(root, Bx(0.18, 0.16, 0.16), m('dark'), 0, 0.02, 1.3);
    add(root, Bx(0.08, 0.06, 0.3), m('accent'), 0, 0.16, 0.05);
    socket(root, 'muzzle', 0, 0.02, 1.4);
  } else if (kind === 'gatling') {
    add(root, Cy(0.13, 0.13, 0.4, 8), m('primary'), 0, 0, 0.05, Math.PI / 2, 0, 0);
    const barrels = grp(root, 'barrels', 0, 0, 0.45);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(barrels, Cy(0.025, 0.025, 0.6, 6), m('secondary'), Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0, Math.PI / 2, 0, 0);
    }
    add(barrels, Cy(0.11, 0.11, 0.04, 8), m('dark'), 0, 0, 0.25, Math.PI / 2, 0, 0);
    add(root, Bx(0.12, 0.18, 0.2), m('accent'), 0, -0.15, -0.05);
    socket(root, 'muzzle', 0, 0, 0.8);
  } else if (kind === 'missile') {
    add(root, Bx(0.55, 0.4, 0.5), m('primary'), 0, 0, 0);
    add(root, Bx(0.57, 0.08, 0.52), m('accent'), 0, 0.22, 0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      add(root, Cy(0.065, 0.065, 0.05, 8), m('dark'), -0.17 + i * 0.17, -0.08 + j * 0.17, 0.25, Math.PI / 2, 0, 0);
      add(root, Co(0.05, 0.06, 6), m('glow'), -0.17 + i * 0.17, -0.08 + j * 0.17, 0.27, Math.PI / 2, 0, 0);
    }
    socket(root, 'muzzle', 0, 0.05, 0.3);
  } else if (kind === 'special') {
    add(root, Cy(0.12, 0.12, 0.5, 8), m('primary'), 0, 0.05, -0.05, Math.PI / 2, 0, 0);
    add(root, Cy(0.05, 0.09, 0.35, 8), m('secondary'), 0, 0.05, 0.35, Math.PI / 2, 0, 0);
    for (let i = 0; i < 3; i++) add(root, To(0.1, 0.02, 4, 10), m('glow'), 0, 0.05, 0.25 + i * 0.09);
    add(root, Bx(0.1, 0.14, 0.24), m('accent'), 0, -0.12, -0.05);
    socket(root, 'muzzle', 0, 0.05, 0.6);
  } else if (kind === 'alpha_buster') {
    // 限定武器：アルファ専用ツインレール砲
    add(root, Bx(0.38, 0.3, 0.6), m('primary'), 0, 0, -0.05);
    for (const s of [-1, 1]) {
      add(root, Bx(0.07, 0.1, 1.6), m('secondary'), 0.11 * s, 0.02, 0.9);
      add(root, Bx(0.02, 0.05, 1.5), m('glow'), 0.07 * s, 0.02, 0.9);
      add(root, Bx(0.02, 0.22, 0.3), m('accent'), 0.22 * s, 0.1, 0.0, 0, 0, 0.3 * s);
    }
    add(root, Sp(0.1, 0), m('glow'), 0, 0.02, 0.2);
    for (let i = 0; i < 3; i++) add(root, Bx(0.32, 0.03, 0.05), m('accent'), 0, 0.09, 0.5 + i * 0.4);
    socket(root, 'muzzle', 0, 0.02, 1.75);
  }
  return root;
}

// =====================================================================
// 敵（宇宙生物に乗っ取られたマシン＋宇宙生物）
// =====================================================================
function tentacles(parent, m, count, len, r, baseY, spread = 0.25, prefix = 'tentacle') {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    let g = grp(parent, `${prefix}${i}`, Math.cos(a) * spread, baseY, Math.sin(a) * spread);
    g.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
    for (let j = 0; j < len; j++) {
      const rr = r * (1 - j / (len + 1));
      add(g, Cy(rr * 0.8, rr, 0.16, 5), m('organic'), 0, -0.08, 0);
      const n = grp(g, '', 0, -0.16, 0);
      n.rotation.x = 0.25;
      g = n;
    }
  }
}
function tumors(parent, m, pts) {
  for (const [x, y, z, r] of pts) add(parent, Sp(r, 1), m('organic'), x, y, z);
}

function buildEnBot(colors) {
  const m = makeMats({ primary: 0xc9a227, secondary: 0x5b5340, ...colors });
  const root = grp(null, 'enemy');
  root.userData = { kind: 'enemy' };
  for (const s of [-1, 1]) {
    const leg = grp(root, s < 0 ? 'legR' : 'legL', 0.25 * s, 0.4, 0);
    add(leg, Bx(0.2, 0.4, 0.26), m('secondary'), 0, -0.2, 0);
    add(leg, Bx(0.26, 0.1, 0.36), m('dark'), 0, -0.36, 0.04);
  }
  const body = grp(root, 'torso', 0, 0.45, 0);
  body.rotation.x = 0.15;
  add(body, Bx(0.75, 0.6, 0.6), m('primary'), 0, 0.3, 0);
  add(body, Bx(0.6, 0.12, 0.62), m('dark'), 0, 0.05, 0);
  for (let i = 0; i < 4; i++) add(body, Bx(0.1, 0.5, 0.02), m('dark'), -0.3 + i * 0.2, 0.32, 0.31, 0, 0, 0.6); // 警告ストライプ
  add(body, Bx(0.4, 0.22, 0.3), m('secondary'), 0, 0.72, 0.05);
  add(body, Sp(0.07, 0), m('glow'), 0, 0.73, 0.21, 0, 0, 0, 'eye');
  // クローアーム
  const arm = grp(body, 'armR', -0.45, 0.4, 0.05);
  add(arm, Bx(0.14, 0.14, 0.5), m('secondary'), 0, 0, 0.2);
  for (const s of [-1, 1]) add(arm, Bx(0.05, 0.05, 0.25), m('metal'), 0.05 * s, 0, 0.5, 0, 0.4 * s, 0);
  tumors(body, m, [[0.3, 0.6, -0.1, 0.18], [0.15, 0.75, -0.2, 0.13], [0.4, 0.3, 0.2, 0.1], [-0.2, 0.62, -0.28, 0.12]]);
  tentacles(body, m, 3, 4, 0.07, 0.55, 0.25);
  const arm2 = body.getObjectByName('tentacle0'); if (arm2) arm2.position.set(0.4, 0.5, 0);
  return root;
}

function buildEnDrone(colors) {
  const m = makeMats({ primary: 0x7d8790, secondary: 0x4a5058, ...colors });
  const root = grp(null, 'enemy');
  root.userData = { kind: 'enemy', flying: true };
  const core = grp(root, 'core', 0, 0.9, 0);
  add(core, Cy(0.45, 0.35, 0.22, 8), m('primary'), 0, 0, 0);
  add(core, Cy(0.25, 0.3, 0.12, 8), m('secondary'), 0, 0.16, 0);
  add(core, Sp(0.09, 0), m('glow'), 0, -0.02, 0.36, 0, 0, 0, 'eye');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * 0.55, z = Math.sin(a) * 0.55;
    add(core, Bx(0.08, 0.06, 0.4), m('secondary'), x * 0.6, 0.02, z * 0.6, 0, -a + Math.PI / 2, 0);
    add(core, Cy(0.2, 0.2, 0.05, 10), m('dark'), x, 0.06, z);
    const rotor = grp(core, `rotor${i}`, x, 0.1, z);
    add(rotor, Bx(0.38, 0.015, 0.05), m('metal'));
    add(rotor, Bx(0.05, 0.015, 0.38), m('metal'));
  }
  const sac = add(core, Sp(0.2, 1), m('organic'), 0, -0.2, 0);
  sac.scale.set(1, 1.2, 1);
  tentacles(core, m, 4, 4, 0.05, -0.3, 0.1);
  return root;
}

function buildEnCrawler(colors) {
  const m = makeMats({ organic: 0xa04a6a, primary: 0x7a3a50, ...colors });
  const root = grp(null, 'enemy');
  root.userData = { kind: 'enemy' };
  const body = grp(root, 'torso', 0, 0.25, 0);
  const segs = [[0, 0.22, 0.35], [0, 0.2, 0.05], [0, 0.17, -0.22], [0, 0.13, -0.44]];
  segs.forEach(([x, r, z], i) => {
    const s = add(body, Sp(r, 1), m(i === 0 ? 'primary' : 'organic'), x, r * 0.6, z, 0, 0, 0, `seg${i}`);
    s.scale.set(1.1, 0.85, 1);
    add(body, Co(0.04, 0.14, 4), m('dark'), 0, r * 1.35, z, -0.3, 0, 0);
  });
  for (const s of [-1, 1]) {
    add(body, Co(0.04, 0.2, 4), m('dark'), 0.1 * s, 0.1, 0.6, Math.PI / 2, 0, -0.4 * s);
    add(body, Sp(0.04, 0), m('glow'), 0.09 * s, 0.25, 0.52);
  }
  return root;
}

function buildEnSpider(colors) {
  const m = makeMats({ primary: 0x6b5a48, organic: 0x9a5a3a, ...colors });
  const root = grp(null, 'enemy');
  root.userData = { kind: 'enemy' };
  const body = grp(root, 'torso', 0, 0.45, 0);
  add(body, Sp(0.38, 1), m('organic'), 0, 0.15, -0.3).scale.set(1, 0.8, 1.2);
  add(body, Sp(0.22, 1), m('primary'), 0, 0.05, 0.15);
  for (let i = 0; i < 4; i++) add(body, Sp(0.035, 0), m('glow'), -0.09 + i * 0.06, 0.12, 0.35);
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const k = i % 3;
    const leg = grp(body, `leg${i}`, 0.15 * side, 0.05, 0.12 - k * 0.2);
    leg.rotation.set(0, (k - 1) * 0.5 * side, 0.9 * side);
    add(leg, Bx(0.06, 0.45, 0.06), m('primary'), 0, 0.22, 0);
    const low = grp(leg, '', 0, 0.44, 0);
    low.rotation.z = -2.3 * side;
    add(low, Bx(0.05, 0.55, 0.05), m('dark'), 0, 0.27, 0);
  }
  return root;
}

function buildEnTurret(colors) {
  const m = makeMats({ primary: 0x5f6a74, secondary: 0x3b424a, ...colors });
  const root = grp(null, 'enemy');
  root.userData = { kind: 'enemy' };
  add(root, Cy(0.5, 0.6, 0.35, 8), m('secondary'), 0, 0.17, 0);
  const head = grp(root, 'head', 0, 0.5, 0);
  add(head, Bx(0.6, 0.35, 0.6), m('primary'), 0, 0.1, 0);
  for (const s of [-1, 1]) add(head, Cy(0.05, 0.05, 0.7, 6), m('dark'), 0.14 * s, 0.1, 0.55, Math.PI / 2, 0, 0);
  add(head, Sp(0.07, 0), m('glow'), 0, 0.22, 0.3, 0, 0, 0, 'eye');
  tumors(root, m, [[0.35, 0.3, 0.2, 0.14], [-0.3, 0.2, -0.3, 0.16], [0.2, 0.7, -0.25, 0.1]]);
  tentacles(root, m, 3, 3, 0.06, 0.4, 0.45);
  return root;
}

function buildEnBlob(colors) {
  const m = makeMats({ organic: 0x5a9a3a, organicGlow: 0x1a4a0a, ...colors });
  const root = grp(null, 'enemy');
  root.userData = { kind: 'enemy' };
  const body = grp(root, 'torso', 0, 0, 0);
  add(body, Sp(0.5, 1), m('organic'), 0, 0.35, 0).scale.set(1.2, 0.75, 1.1);
  add(body, Sp(0.25, 1), m('organic'), 0.35, 0.18, 0.25);
  add(body, Sp(0.2, 1), m('organic'), -0.4, 0.15, -0.1);
  add(body, Sp(0.12, 1), m('glow'), 0, 0.55, 0.38, 0, 0, 0, 'eye');
  add(body, Bx(0.25, 0.08, 0.2), m('metal'), -0.2, 0.62, 0.1, 0.4, 0.5, 0.2);
  add(body, Cy(0.04, 0.04, 0.4), m('dark'), 0.25, 0.65, -0.15, 0.5, 0, 0.7);
  return root;
}

function buildEnBeetle(colors) {
  const m = makeMats({ primary: 0xc8d4de, secondary: 0x8a96a2, ...colors });
  const root = grp(null, 'enemy');
  root.userData = { kind: 'enemy' };
  const body = grp(root, 'torso', 0, 0.2, 0);
  for (const s of [-1, 1]) {
    const shell = add(body, Sp(0.3, 1), m('primary'), 0.13 * s, 0.18, -0.05);
    shell.scale.set(0.55, 0.6, 1.1);
  }
  add(body, Sp(0.16, 1), m('secondary'), 0, 0.12, 0.33);
  add(body, Co(0.05, 0.35, 5), m('accent'), 0, 0.3, 0.45, 0.9, 0, 0);
  for (const s of [-1, 1]) add(body, Sp(0.035, 0), m('glow'), 0.07 * s, 0.17, 0.46);
  for (let i = 0; i < 6; i++) {
    const s = i < 3 ? -1 : 1;
    add(body, Bx(0.03, 0.03, 0.25), m('dark'), 0.25 * s, 0.03, 0.15 - (i % 3) * 0.17, 0, 0.9 * s, 0);
  }
  return root;
}

function buildBossDriller(colors) {
  const m = makeMats({ primary: 0xb06a2a, secondary: 0x5a4030, ...colors });
  const root = grp(null, 'enemy');
  root.userData = { kind: 'enemy', boss: true };
  for (const s of [-1, 1]) {
    add(root, Bx(0.6, 0.7, 3.0), m('dark'), 1.0 * s, 0.35, 0);
    for (let i = 0; i < 5; i++) add(root, Cy(0.3, 0.3, 0.64, 10), m('metal'), 1.0 * s, 0.3, -1.1 + i * 0.55, 0, 0, Math.PI / 2);
  }
  add(root, Bx(1.7, 0.8, 2.6), m('primary'), 0, 0.95, -0.1);
  add(root, Bx(1.2, 0.7, 1.0), m('secondary'), 0, 1.6, -0.6);
  add(root, Bx(1.0, 0.3, 0.05), m('visor'), 0, 1.7, -0.08);
  const drill = grp(root, 'drill', 0, 1.0, 1.4);
  add(drill, Co(0.65, 1.8, 8), m('metal'), 0, 0, 0.9, Math.PI / 2, 0, 0);
  for (let i = 0; i < 4; i++) add(drill, To(0.55 - i * 0.13, 0.05, 4, 8), m('accent'), 0, 0, 0.25 + i * 0.4);
  add(root, Cy(0.75, 0.75, 0.3, 10), m('secondary'), 0, 1.0, 1.3, Math.PI / 2, 0, 0);
  tumors(root, m, [[0.5, 1.5, 0.3, 0.35], [-0.6, 1.4, 0.5, 0.28], [0.2, 2.0, -0.6, 0.4], [-0.4, 1.9, -1.0, 0.3], [0.7, 1.3, -1.2, 0.3]]);
  for (const [x, y, z] of [[0.45, 1.75, 0.5], [0.6, 1.6, 0.3], [-0.5, 1.6, 0.7]]) add(root, Sp(0.08, 0), m('glow'), x, y, z);
  const tg = grp(root, 'tentacles', 0, 1.8, -0.5);
  tentacles(tg, m, 5, 5, 0.12, 0.2, 0.5);
  tg.rotation.x = Math.PI;
  return root;
}

function buildBossSkyWraith(colors) {
  const m = makeMats({ primary: 0x5a6a7a, secondary: 0x2e3a46, organic: 0x6a2a8a, ...colors });
  const root = grp(null, 'enemy');
  root.userData = { kind: 'enemy', boss: true, flying: true };
  const core = grp(root, 'core', 0, 1.6, 0);
  add(core, Bx(1.0, 0.6, 2.6), m('primary'), 0, 0, 0);
  add(core, Bx(0.8, 0.4, 0.8), m('secondary'), 0, 0.25, 1.1, 0.3, 0, 0);
  add(core, Bx(0.7, 0.1, 0.05), m('glow'), 0, 0.2, 1.5, 0.3, 0, 0, 'eye');
  for (let i = 0; i < 4; i++) {
    const sx = i % 2 ? 1 : -1, sz = i < 2 ? 1 : -1;
    add(core, Bx(0.9, 0.12, 0.2), m('secondary'), 0.85 * sx, 0, 0.8 * sz);
    add(core, To(0.45, 0.08, 4, 12), m('dark'), 1.4 * sx, 0.05, 0.8 * sz, Math.PI / 2, 0, 0);
    const rotor = grp(core, `rotor${i}`, 1.4 * sx, 0.05, 0.8 * sz);
    add(rotor, Bx(0.8, 0.02, 0.1), m('metal'));
    add(rotor, Bx(0.1, 0.02, 0.8), m('metal'));
  }
  // 膜（宇宙生物の翼）
  for (const s of [-1, 1]) {
    const wing = add(core, Bx(1.6, 0.03, 1.2), m('organic'), 1.3 * s, -0.05, -0.1, 0, 0, 0.2 * s, s < 0 ? 'wingR' : 'wingL');
    wing.scale.set(1, 1, 1);
  }
  for (const s of [-1, 1]) {
    const claw = grp(core, '', 0.35 * s, -0.4, 0.3);
    add(claw, Bx(0.1, 0.6, 0.1), m('dark'), 0, -0.2, 0);
    add(claw, Bx(0.1, 0.1, 0.4), m('metal'), 0, -0.5, 0.15);
  }
  tumors(core, m, [[0, -0.35, -0.6, 0.35], [0.3, 0.4, -0.8, 0.25]]);
  tentacles(core, m, 5, 5, 0.08, -0.5, 0.3);
  return root;
}

function buildBossTitan(colors) {
  const m = makeMats({ primary: 0xd0a030, secondary: 0x5a5048, ...colors });
  const root = grp(null, 'enemy');
  root.userData = { kind: 'enemy', boss: true };
  for (const s of [-1, 1]) {
    const leg = grp(root, s < 0 ? 'legR' : 'legL', 0.85 * s, 1.6, 0);
    add(leg, Bx(0.75, 1.0, 0.85), m('secondary'), 0, -0.4, 0);
    add(leg, Bx(0.8, 0.8, 0.9), m('primary'), 0, -1.15, 0.05);
    add(leg, Bx(1.0, 0.25, 1.3), m('dark'), 0, -1.5, 0.15);
  }
  const torso = grp(root, 'torso', 0, 1.7, 0);
  add(torso, Bx(2.4, 1.6, 1.6), m('primary'), 0, 0.85, 0);
  add(torso, Bx(2.6, 0.3, 1.7), m('dark'), 0, 0.05, 0);
  for (let i = 0; i < 6; i++) add(torso, Bx(0.18, 1.2, 0.02), m('dark'), -1.0 + i * 0.4, 0.85, 0.81, 0, 0, 0.6);
  add(torso, Sp(0.3, 1), m('glow'), 0, 0.9, 0.85, 0, 0, 0, 'core');
  // 頭（宇宙生物の目の集まり）
  const head = grp(torso, 'head', 0, 1.75, 0.2);
  add(head, Bx(0.9, 0.5, 0.8), m('secondary'), 0, 0.2, 0);
  tumors(head, m, [[0, 0.5, 0.1, 0.35], [0.3, 0.6, -0.1, 0.22], [-0.3, 0.55, -0.05, 0.25]]);
  for (const [x, y, z] of [[0, 0.55, 0.42], [0.22, 0.4, 0.42], [-0.2, 0.42, 0.42], [0.1, 0.75, 0.3]]) add(head, Sp(0.09, 0), m('glow'), x, y, z);
  // プレスアーム
  for (const s of [-1, 1]) {
    const arm = grp(torso, s < 0 ? 'armR' : 'armL', 1.5 * s, 1.3, 0);
    add(arm, Bx(0.7, 0.7, 0.8), m('secondary'), 0.1 * s, 0, 0);
    add(arm, Bx(0.4, 1.1, 0.45), m('dark'), 0.15 * s, -0.8, 0);
    add(arm, Bx(0.9, 0.7, 1.1), m('primary'), 0.15 * s, -1.55, 0.15);
    add(arm, Bx(0.95, 0.12, 1.15), m('metal'), 0.15 * s, -1.95, 0.15);
  }
  for (const s of [-1, 1]) add(torso, Cy(0.15, 0.15, 1.0), m('metal'), 0.7 * s, 2.0, -0.6);
  tumors(torso, m, [[0.9, 1.5, -0.5, 0.45], [-1.0, 1.2, -0.6, 0.35], [0.5, 0.4, 0.75, 0.2], [-0.7, 0.6, 0.78, 0.22]]);
  const tg = grp(torso, 'tentacles', 0, 1.0, -0.8);
  tentacles(tg, m, 6, 6, 0.14, 0, 0.6);
  tg.rotation.x = -2.2;
  return root;
}

// =====================================================================
// モデル一覧（id → 作り方）。tools/export-glb.mjs はこの一覧を全部書き出す
// =====================================================================
export const MODEL_BUILDERS = {
  // キャラ
  ren: buildRen,
  shion: buildShion,
  gald: buildGald,
  npc_a: (c) => buildNpc('a', c),
  npc_b: (c) => buildNpc('b', c),
  npc_pirate: (c) => buildNpc('pirate', c),
  npc_clerk: (c) => buildNpc('clerk', c),
  // マシンパーツ
  legs_biped: buildLegsBiped,
  legs_quad: buildLegsQuad,
  legs_tread: buildLegsTread,
  legs_hover: buildLegsHover,
  body_std: (c) => buildBody(c, false),
  body_heavy: (c) => buildBody(c, true),
  head_sensor: (c) => buildHead(c, 'sensor'),
  head_radar: (c) => buildHead(c, 'radar'),
  head_heavy: (c) => buildHead(c, 'heavy'),
  arm_std: (c) => buildArm(c, 'std'),
  arm_heavy: (c) => buildArm(c, 'heavy'),
  arm_light: (c) => buildArm(c, 'light'),
  arm_power: (c) => buildArm(c, 'power'),
  // 武器
  wpn_cannon: (c) => buildWeapon(c, 'cannon'),
  wpn_gatling: (c) => buildWeapon(c, 'gatling'),
  wpn_missile: (c) => buildWeapon(c, 'missile'),
  wpn_special: (c) => buildWeapon(c, 'special'),
  wpn_alpha_buster: (c) => buildWeapon(c, 'alpha_buster'),
  // 敵
  en_bot: buildEnBot,
  en_drone: buildEnDrone,
  en_crawler: buildEnCrawler,
  en_spider: buildEnSpider,
  en_turret: buildEnTurret,
  en_blob: buildEnBlob,
  en_beetle: buildEnBeetle,
  boss_driller: buildBossDriller,
  boss_skywraith: buildBossSkyWraith,
  boss_titan: buildBossTitan,
};

export function buildModel(id, colors) {
  const fn = MODEL_BUILDERS[id];
  if (!fn) throw new Error(`unknown model: ${id}`);
  const obj = fn(colors || {});
  obj.userData.modelId = id;
  return obj;
}
