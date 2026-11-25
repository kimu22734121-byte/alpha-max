// 生身のキャラの見た目：装備に合わせて変わる（装備画面・町やフィールド・戦闘のすべてで使う）
// 武器＝手に持つもの、頭＝キャップ・ヘルメット・バイザー、体＝ベスト・アーマー、手＝グローブ・ガントレット、足＝ブーツ、
// アクセサリー＝マント・ゴーグル・スカーフ・バッジなど。専用の最強装備は白と金の光る見た目。
// 部品はローポリの箱・球だけで、形と材質は使い回す（スマホでも軽く）
// 装備のデータに look: { kind, color, accent, glow } を書くとその見た目になる。書かなければ部位・強さ・名前から自動で決まる
import * as THREE from 'three';
import { getModel } from '../core/assets.js';
import { CHARACTERS } from '../data/characters.js';
import { FOOT_GEAR, FOOT_CATS, SETS } from '../data/footgear.js';
import { setOf } from '../game/state.js';

// ---- 形と材質の使い回し ----
let LIT = false; // 最終段階の専用防具を作っている間は光を強く
const GEO = new Map(), MAT = new Map();
const geo = (key, make) => { if (!GEO.has(key)) GEO.set(key, make()); return GEO.get(key); };
const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const sph = (r, half = false) => geo(`s${r},${half}`, () => new THREE.SphereGeometry(r, 10, half ? 5 : 8, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI));
const tor = (r, t) => geo(`t${r},${t}`, () => new THREE.TorusGeometry(r, t, 4, 14));
const cone = (r, h) => geo(`c${r},${h}`, () => new THREE.ConeGeometry(r, h, 6));
function mat(color, glow = 0) {
  glow = glow && LIT ? glow * 1.8 : glow;
  const k = `${color}:${glow}`;
  if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: glow ? 0.4 : 0.7, metalness: glow ? 0.3 : 0.15, emissive: glow ? color : 0x000000, emissiveIntensity: glow }));
  return MAT.get(k);
}
function put(parent, g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z); o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  parent.add(o);
  return o;
}

// ---- 装備 → 見た目（kind と色）----
const TIER_COLORS = { 1: [0x7a6248, 0x4a3e30], 2: [0x5e6a4a, 0x3a3f30], 3: [0x3e5068, 0x262e3a], 4: [0x6a5a7a, 0x3a3048], 5: [0xb8c0cc, 0x5a6270], 6: [0x2a2a32, 0xc8a040] };
const AURA = { ren: 0xffd86a, shion: 0xff3a4a, gina: 0xff9a3a };
export function lookOf(id) {
  const g = FOOT_GEAR[id];
  if (!g) return null;
  const [color, accent] = TIER_COLORS[Math.min(6, g.tier || 1)] || TIER_COLORS[1];
  // 各キャラ専用の最強装備：白と金に光るライン
  // 最終段階（stage 2）はさらに強く光る
  const base = g.only ? { color: 0xf4f2ea, accent: 0xe8c24a, glow: AURA[g.only], legend: true, stage2: (g.stage || 1) >= 2 } : { color, accent, glow: (g.tier || 1) >= 5 ? 0x7af0ff : 0 };
  if (g.look) return { ...base, ...g.look };
  const n = g.name;
  let kind;
  if (g.slot === 'head') kind = /キャップ|帽/.test(n) ? (/三角/.test(n) ? 'tricorn' : 'cap') : /ゴーグル/.test(n) ? 'goggles' : /バイザー|ナノ|エース/.test(n) ? 'visor' : g.only === 'gina' ? 'horned' : 'helmet';
  else if (g.slot === 'body') kind = /作業着/.test(n) ? 'none' : /ベスト/.test(n) ? 'vest' : /スーツ/.test(n) ? 'suit' : /ヘビー|バスティオン/.test(n) ? 'heavy' : 'armor';
  else if (g.slot === 'hands') kind = /ガントレット|パワー|マニピュ/.test(n) ? 'gauntlet' : 'glove';
  else if (g.slot === 'feet') kind = /ジェット|スラスター|グラビティ/.test(n) ? 'jet' : 'boots';
  else if (g.slot === 'acc') kind = 'badge';
  return { ...base, kind };
}

// ---- 部位ごとの部品 ----
function headPiece(head, L) {
  LIT = !!L.stage2;
  const c = mat(L.color), a = mat(L.accent), gl = L.glow ? mat(L.glow, 1.6) : a;
  const g = new THREE.Group(); g.name = 'gearHead';
  if (L.kind === 'cap') { put(g, sph(0.226, true), c, 0, 0.2, -0.01).scale.set(1, 0.7, 1); put(g, box(0.26, 0.02, 0.14), a, 0, 0.21, 0.19); }
  else if (L.kind === 'tricorn') { put(g, geo('tri', () => new THREE.CylinderGeometry(0.3, 0.3, 0.04, 3)), c, 0, 0.33, 0); put(g, sph(0.2, true), c, 0, 0.32, 0).scale.set(1, 0.7, 1); put(g, box(0.06, 0.06, 0.02), a, 0, 0.4, 0.17); }
  else if (L.kind === 'goggles') { put(g, tor(0.21, 0.02), a, 0, 0.27, 0, Math.PI / 2 - 0.15); for (const s of [-1, 1]) put(g, sph(0.045), gl, 0.07 * s, 0.3, 0.19); }
  else if (L.kind !== 'none') {
    // ヘルメット（頭の上半分を覆う）
    put(g, sph(0.245, true), c, 0, 0.15, -0.01).scale.set(1, 1.05, 1.02);
    put(g, box(0.05, 0.03, 0.42), a, 0, 0.4, 0);
    if (L.kind === 'visor') put(g, box(0.34, 0.07, 0.06), gl, 0, 0.2, 0.2);
    if (L.kind === 'horned') for (const s of [-1, 1]) put(g, cone(0.045, 0.2), a, 0.2 * s, 0.38, 0, 0, 0, -0.6 * s);
    if (L.legend) { put(g, box(0.06, 0.16, 0.04), gl, 0, 0.42, 0.12); }
  }
  head.add(g);
}
function bodyPiece(torso, L, b) {
  LIT = !!L.stage2;
  if (L.kind === 'none') return;
  const c = mat(L.color), a = mat(L.accent), gl = L.glow ? mat(L.glow, 1.6) : a;
  const g = new THREE.Group(); g.name = 'gearBody';
  const w = 0.35 * b;
  if (L.kind === 'suit') { put(g, box(w, 0.3, 0.25), c, 0, 0.16, 0); put(g, box(0.04, 0.3, 0.01), a, 0, 0.16, 0.13); }
  else {
    put(g, box(w + (L.kind === 'heavy' ? 0.06 : 0), 0.26, 0.27), c, 0, 0.17, 0);
    put(g, box(w * 0.7, 0.05, 0.02), a, 0, 0.23, 0.14);
    if (L.kind === 'armor' || L.kind === 'heavy') for (const s of [-1, 1]) put(g, box(0.13 * b, L.kind === 'heavy' ? 0.12 : 0.08, 0.24), a, (0.2 * b + 0.02) * s, 0.31, 0, 0, 0, 0.25 * s);
  }
  if (L.legend || L.glow) put(g, sph(0.04), gl, 0, 0.2, 0.15);
  if (L.legend) for (const s of [-1, 1]) put(g, box(0.02, 0.22, 0.01), gl, 0.1 * s, 0.15, 0.142);
  torso.add(g);
}
function handPiece(arm, L, b) {
  LIT = !!L.stage2;
  const c = mat(L.color), a = mat(L.accent), gl = L.glow ? mat(L.glow, 1.4) : a;
  const g = new THREE.Group(); g.name = 'gearHand';
  put(g, sph(0.07 * b), c, 0, -0.26, 0.01);
  if (L.kind === 'gauntlet') { put(g, box(0.13 * b, 0.14, 0.14 * b), a, 0, -0.16, 0); if (L.glow) put(g, box(0.02, 0.1, 0.02), gl, 0, -0.16, 0.075 * b); }
  arm.add(g);
}
function footPiece(leg, L, b) {
  LIT = !!L.stage2;
  const c = mat(L.color), a = mat(L.accent), gl = L.glow ? mat(L.glow, 1.6) : a;
  const g = new THREE.Group(); g.name = 'gearFoot';
  put(g, box(0.165 * b, 0.13, 0.24), c, 0, -0.205, 0.03);
  put(g, box(0.17 * b, 0.03, 0.25), a, 0, -0.15, 0.03);
  if (L.kind === 'jet') put(g, box(0.08, 0.05, 0.04), gl, 0, -0.2, -0.1);
  leg.add(g);
}
function accPiece(obj, torso, head, L, b) {
  LIT = false;
  const c = mat(L.color), a = mat(L.accent), gl = mat(L.glow || 0x9fe8ff, 1.4);
  if (L.kind === 'cape') { const cape = put(torso, box(0.36 * b, 0.46, 0.02), c, 0, 0.06, -0.14 * Math.min(b, 1.2), 0.12); cape.name = 'cape'; }
  else if (L.kind === 'scarf') { put(torso, tor(0.15 * b, 0.035), c, 0, 0.32, 0, Math.PI / 2); put(torso, box(0.06, 0.16, 0.03), c, 0.05, 0.22, -0.13, 0.2); }
  else if (L.kind === 'goggles') { put(head, tor(0.21, 0.018), a, 0, 0.27, 0, Math.PI / 2 - 0.15); for (const s of [-1, 1]) put(head, sph(0.04), gl, 0.07 * s, 0.3, 0.19); }
  else if (L.kind === 'monocle') put(head, sph(0.045), gl, 0.08, 0.19, 0.2);
  else if (L.kind === 'belt') put(torso, box(0.36 * b, 0.06, 0.26), a, 0, 0.02, 0);
  else if (L.kind === 'pack') put(torso, box(0.2 * b, 0.2, 0.08), c, 0, 0.18, -0.16);
  else if (L.kind === 'badge') put(torso, box(0.05, 0.05, 0.02), gl, -0.08 * b, 0.26, 0.13);
  void obj;
}

export function buildCharModel(m) {
  const ch = CHARACTERS[m.id];
  const b = ch.bulk || 1;
  const eq = m.equip || {};
  const body = FOOT_GEAR[eq.body];
  const look = body?.set ? SETS[body.set].look : {};
  const obj = getModel(ch.model, look);
  const torso = obj.getObjectByName('torso'), head = obj.getObjectByName('head');
  // 頭・体・手・足・アクセサリー
  const H = lookOf(eq.head); if (H && head) headPiece(head, H);
  const B = lookOf(eq.body); if (B && torso && !body?.set) bodyPiece(torso, B, b); else if (B?.legend && torso) bodyPiece(torso, { ...B, kind: 'armor' }, b);
  const Hd = lookOf(eq.hands); if (Hd) for (const n of ['armR', 'armL']) { const a = obj.getObjectByName(n); if (a) handPiece(a, Hd, b); }
  const F = lookOf(eq.feet); if (F) for (const n of ['legR', 'legL']) { const l = obj.getObjectByName(n); if (l) footPiece(l, F, b); }
  const A = lookOf(eq.acc); if (A && torso && head) accPiece(obj, torso, head, A, b);
  // 手に持つ武器
  const w = FOOT_GEAR[eq.weapon];
  const wm = w && (w.model || FOOT_CATS[w.cat]?.model);
  const arm = obj.getObjectByName('armR');
  if (wm && arm) {
    const wo = getModel(wm, w.final ? { glow: AURA[w.final] } : {});
    wo.position.set(0, -0.26, 0.04);
    arm.add(wo);
    obj.userData.handWeapon = wo;
    obj.userData.handMuzzle = wo.getObjectByName('muzzle') || wo;
  }
  // 専用防具が4つそろったら足元に光の輪
  const set = setOf(m);
  if (set) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.42, 32), new THREE.MeshBasicMaterial({ color: set.aura, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.name = 'setAura';
    obj.add(ring);
  }
  return obj;
}
