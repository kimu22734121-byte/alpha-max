// フィールドに置く3Dの物：町の建物・建物の上のアイコン・家具・宝箱・「調べられる」目印
import * as THREE from 'three';
import { getModel } from '../core/assets.js';
import { buildBuilding } from '../models/builders.js';
import { heightAt } from '../core/map-renderer.js';

// 施設ごとの建物の形と色（形は使い回して、色と大きさを変える）
const BUILDING_STYLE = {
  home: { style: 'gable', colors: { primary: 0xc8b090, secondary: 0xa84a2a } },
  inn: { style: 'twostory', colors: { primary: 0xd8c8a8, secondary: 0x2e5a7a } },
  bar: { style: 'flat', colors: { primary: 0x6a4a5a, secondary: 0x3a2a34, accent: 0xff6ab0 } },
  office: { style: 'tower', colors: { primary: 0xa89a7a, secondary: 0x6a5a2a, accent: 0xd8a040 } },
  weapon: { style: 'flat', colors: { primary: 0x8a6a5a, secondary: 0x6a2a2a, accent: 0xc8402a } },
  parts: { style: 'hangar', colors: { primary: 0x8a9a8a, secondary: 0x3a6a5a } },
  item: { style: 'gable', colors: { primary: 0xd8d0b8, secondary: 0x5a7a2c } },
  garage: { style: 'hangar', colors: { primary: 0x7a7e86, secondary: 0x4a4e56, accent: 0xe8b030 } },
  // 町ごとの特別な店（shops.js のキー）
  junk: { style: 'flat', colors: { primary: 0x7a6a5a, secondary: 0x5a4a3a, accent: 0xc8902a } },
  frame: { style: 'hangar', colors: { primary: 0x9a8a6a, secondary: 0x6a4a2a, accent: 0xe8b030 } },
  market: { style: 'twostory', colors: { primary: 0xd8c890, secondary: 0x8a3a2a, accent: 0xe8c040 } },
};
// 町ごとに少し色合いを変える
const TOWN_TINT = { town1: 1.0, town2: 0.85, town3: 0.95, town4: 1.15, town5: 1.1, town6: 1.0, town7: 1.15, town8: 1.0, town9: 1.1 };

// ---------------- 建物の上に浮かぶアイコン ----------------
const iconCache = {};
function drawIconCanvas(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  // 丸い看板
  g.fillStyle = 'rgba(20,16,12,0.85)'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill();
  g.lineWidth = 7; g.strokeStyle = '#ffcf6a'; g.beginPath(); g.arc(64, 64, 55, 0, 7); g.stroke();
  g.fillStyle = '#fff3d6'; g.strokeStyle = '#fff3d6'; g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round';
  const R = (x, y, w, h) => g.fillRect(x, y, w, h);
  if (kind === 'inn') { // ベッド
    R(26, 70, 76, 14); R(26, 50, 10, 40); R(92, 62, 10, 28); g.fillStyle = '#9fd0ff'; R(38, 58, 22, 12); g.fillStyle = '#fff3d6'; R(60, 60, 34, 10);
  } else if (kind === 'weapon') { // 銃
    R(26, 50, 72, 16); R(90, 46, 12, 8); R(40, 64, 18, 30); R(58, 66, 10, 12); g.fillStyle = '#ffcf6a'; R(30, 54, 50, 4);
  } else if (kind === 'parts') { // 歯車
    g.save(); g.translate(64, 64);
    for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); R(-8, -42, 16, 16); }
    g.beginPath(); g.arc(0, 0, 28, 0, 7); g.fill(); g.fillStyle = 'rgba(20,16,12,1)'; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); g.restore();
  } else if (kind === 'item') { // 救急箱
    R(28, 40, 72, 52); g.fillStyle = 'rgba(20,16,12,1)'; R(50, 32, 28, 10); g.fillStyle = '#ff4a4a'; R(56, 50, 16, 34); R(47, 59, 34, 16);
  } else if (kind === 'garage') { // ロボット
    R(48, 26, 32, 22); g.fillStyle = '#5ff2ff'; R(56, 32, 16, 7); g.fillStyle = '#fff3d6'; R(40, 52, 48, 30); R(28, 54, 10, 26); R(90, 54, 10, 26); R(44, 84, 14, 18); R(70, 84, 14, 18);
  } else if (kind === 'bar') { // ジョッキ
    R(36, 40, 44, 54); g.beginPath(); g.arc(88, 66, 14, -Math.PI / 2, Math.PI / 2); g.stroke(); g.fillStyle = '#ffcf6a'; R(42, 52, 32, 36); g.fillStyle = '#fff3d6';
    g.beginPath(); g.arc(46, 40, 10, 0, 7); g.arc(62, 36, 11, 0, 7); g.arc(76, 40, 10, 0, 7); g.fill();
  } else if (kind === 'office') { // 賞金首（ドクロの手配書）
    R(30, 24, 68, 82); g.fillStyle = 'rgba(20,16,12,1)'; g.beginPath(); g.arc(64, 58, 20, 0, 7); g.fill(); R(54, 70, 20, 14);
    g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(56, 56, 6, 0, 7); g.arc(72, 56, 6, 0, 7); g.fill(); g.fillStyle = '#c83a2a'; R(38, 92, 52, 8);
  } else if (kind === 'home') { // レンチ（修理屋）
    g.save(); g.translate(64, 64); g.rotate(-Math.PI / 4); R(-7, -30, 14, 60);
    g.beginPath(); g.arc(0, -34, 16, 0, 7); g.fill(); g.fillStyle = 'rgba(20,16,12,1)'; R(-6, -54, 12, 20); g.restore();
  }
  return c;
}
function drawIcon(kind) {
  const t = new THREE.CanvasTexture(drawIconCanvas(kind)); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function makeIconSprite(kind) {
  iconCache[kind] ||= drawIcon(kind);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconCache[kind], depthTest: false, transparent: true }));
  sp.scale.setScalar(1.25);
  sp.renderOrder = 10;
  return sp;
}

// ---------------- 看板（入口の上に付ける。アイコン＋店名） ----------------
const LABEL = { inn: '宿屋', weapon: '武器屋', parts: 'パーツ屋', item: '道具屋', garage: 'ガレージ', bar: '酒場', office: 'ハンター', home: '修理屋' };
const SIGN_COLOR = { inn: '#2e5a7a', weapon: '#7a2420', parts: '#2e6a54', item: '#4e6a22', garage: '#5a5e66', bar: '#6a2a5a', office: '#7a5a1e', home: '#8a4020' };
function signTexture(fac, name) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = SIGN_COLOR[fac] || '#444'; g.fillRect(0, 0, 512, 160);
  g.strokeStyle = '#ffcf6a'; g.lineWidth = 10; g.strokeRect(6, 6, 500, 148);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(12, 12, 488, 50);
  // アイコン
  const ic = drawIconCanvas(fac);
  g.drawImage(ic, 14, 16, 128, 128);
  g.fillStyle = '#fff6dc';
  g.font = `bold ${name.length > 4 ? 64 : 80}px "DotGothic16", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;
  g.textBaseline = 'middle'; g.textAlign = 'center';
  g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(name, 330, 84);
  g.fillText(name, 330, 84);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function makeSign(fac, name, width) {
  const grp = new THREE.Group();
  const tex = signTexture(fac, name);
  const w = Math.min(width, 3.4), h = w * 160 / 512;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.6 }));
  face.position.z = 0.07;
  grp.add(face);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.12), new THREE.MeshStandardMaterial({ color: 0x2a2018, metalness: 0.4 }));
  grp.add(frame);
  for (const s2 of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), new THREE.MeshStandardMaterial({ color: 0x3a3028 }));
    arm.position.set(s2 * w * 0.4, h / 2 + 0.05, -0.15); grp.add(arm);
  }
  // 看板を照らすライト
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff0c0 }));
  lamp.position.set(0, h / 2 + 0.1, 0.12); grp.add(lamp);
  grp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return grp;
}

// ---------------- 町の建物 ----------------
export function addBuildings(scene, map) {
  const list = [];
  for (const b of map.buildings || []) {
    const st = BUILDING_STYLE[b.shop] || BUILDING_STYLE[b.facility] || BUILDING_STYLE.item;
    const k = TOWN_TINT[map.id] ?? 1;
    const colors = Object.fromEntries(Object.entries(st.colors).map(([r, c]) => [r, new THREE.Color(c).multiplyScalar(r === 'primary' ? k : 1).getHex()]));
    const obj = buildBuilding({ style: st.style, w: b.w, d: b.h, colors });
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    obj.position.set(b.x + b.w / 2, heightAt(map, b.door[0] + 0.5, b.door[1] + 1.2), b.y + b.h / 2);
    // 入口の上に看板（アイコン＋店名）。遠くからでも見える大きさ
    const sign = makeSign(b.facility, b.title || LABEL[b.facility] || b.label, b.w - 0.6);
    sign.position.set((b.door[0] + 0.5) - (b.x + b.w / 2), 1.75, obj.userData.frontZ + 0.12);
    obj.add(sign);
    scene.add(obj);
    const mats = [];
    obj.traverse((o) => { if (o.isMesh) mats.push(o.material); });
    list.push({ b, obj, mats, faded: false });
  }
  return list;
}

// プレイヤーが建物の裏にいる時は建物を半透明にする
export function updateBuildings(list, px, pz) {
  for (const it of list) {
    const b = it.b;
    const behind = px > b.x - 0.3 && px < b.x + b.w + 0.3 && pz < b.y + b.h - 0.4 && pz > b.y - 3.2;
    if (behind !== it.faded) {
      it.faded = behind;
      for (const m of it.mats) { m.transparent = behind; m.opacity = behind ? 0.3 : 1; m.depthWrite = !behind; }
    }
  }
}

// ---------------- フィールドの建造物（町の外観・ダンジョンの入口・遺跡） ----------------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, ...o });
const GLOW = (c, k = 1.6) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k });
function box(g, w, h, d, mat, x, y, z, ry = 0, rz = 0, rx = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
}
function cyl(g, rt, rb, h, seg, mat, x, y, z, rx = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m;
}
// 窓の光る建物
function house(g, w, h, d, x, z, wall, roof, win, roofType = 'flat') {
  box(g, w, h, d, wall, x, h / 2, z);
  if (roofType === 'gable') { const r = box(g, w + 0.15, 0.12, d * 0.62, roof, x, h + 0.18, z - d * 0.22, 0, 0, 0.6); r.rotation.set(0.6, 0, 0); const r2 = box(g, w + 0.15, 0.12, d * 0.62, roof, x, h + 0.18, z + d * 0.22); r2.rotation.set(-0.6, 0, 0); }
  else box(g, w + 0.1, 0.1, d + 0.1, roof, x, h + 0.05, z);
  const n = Math.max(1, Math.floor(w / 0.45));
  for (let i = 0; i < n; i++) for (let j = 0; j < Math.max(1, Math.floor(h / 0.55)); j++) if ((i + j) % 2 === 0 || h > 1) box(g, 0.16, 0.18, 0.03, win, x - w / 2 + 0.25 + i * (w - 0.5) / Math.max(1, n - 1 || 1), 0.4 + j * 0.5, z + d / 2 + 0.01);
}
function gate(g, wallMat, lampMat, w = 1.6, h = 1.6) {
  for (const s2 of [-1, 1]) { box(g, 0.35, h, 0.35, wallMat, s2 * w / 2, h / 2, 0.2); box(g, 0.2, 0.2, 0.2, lampMat, s2 * w / 2, h + 0.15, 0.2); }
  box(g, w + 0.5, 0.3, 0.4, wallMat, 0, h, 0.2);
}
const STRUCT = {
  // 町1：ドームに覆われた辺境コロニー
  dome() {
    const g = new THREE.Group();
    const wall = M(0x5a6a7a, { metalness: 0.5 }), win = GLOW(0xffd98a, 1.4), roof = M(0x8a4a2c), lamp = GLOW(0x9fe8ff, 2);
    const cz = -1.9;
    for (let i = 0; i < 18; i++) {
      const a = Math.PI * (1.08 + (i / 17) * 0.84) - Math.PI / 2 * 0;
      const ang = -Math.PI + (i / 17) * Math.PI * 2;
      if (Math.abs(ang - Math.PI / 2) < 0.35) continue; // 正面（門の所）は空ける
      box(g, 0.9, 0.7, 0.3, wall, Math.cos(ang) * 2.9, 0.35, cz + Math.sin(ang) * 2.2, -ang + Math.PI / 2);
      void a;
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xaad8ff, transparent: true, opacity: 0.28, metalness: 0.6, roughness: 0.1, depthWrite: false }));
    dome.scale.set(1, 0.85, 0.78); dome.position.set(0, 0.4, cz); g.add(dome);
    for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.04, 4, 24, Math.PI), wall); r.rotation.set(0, (i / 5) * Math.PI, 0); r.scale.set(1, 0.85, 0.78); r.position.set(0, 0.4, cz); g.add(r); }
    house(g, 0.9, 0.8, 0.8, -1.3, cz + 0.5, M(0xc8b090), roof, win, 'gable');
    house(g, 0.8, 1.3, 0.8, 1.2, cz + 0.3, M(0xa89a7a), M(0x6a5a2a), win);
    house(g, 1.1, 0.7, 0.7, 0.1, cz - 1.0, M(0x8a9a8a), M(0x3a6a5a), win);
    // 塔とアンテナ
    cyl(g, 0.18, 0.25, 2.6, 8, wall, -0.2, 1.3, cz - 0.2); cyl(g, 0.02, 0.02, 0.8, 4, M(0x9aa0a8), -0.2, 3.0, cz - 0.2);
    box(g, 0.14, 0.14, 0.14, lamp, -0.2, 3.45, cz - 0.2).userData.blink = true;
    cyl(g, 0.1, 0.12, 0.9, 6, M(0x4a3a2a), 1.4, 1.75, cz + 0.2);
    gate(g, wall, lamp, 1.4, 1.2);
    return g;
  },
  // 町2：鉱山町（木の柵・採掘やぐら・煙突）
  mining() {
    const g = new THREE.Group();
    const wood = M(0x6a4a2a), stone = M(0x7a6a58), win = GLOW(0xffb060, 1.5), roof = M(0x5a3a22), lamp = GLOW(0xffa040, 2);
    for (let i = -6; i <= 6; i++) { if (Math.abs(i) <= 1) continue; const ang = (i / 6) * Math.PI * 0.95; cyl(g, 0.08, 0.1, 0.9 + (i % 2) * 0.2, 5, wood, Math.sin(ang) * 2.8, 0.45, -1.9 + Math.cos(ang) * 1.9); }
    for (let i = 0; i < 10; i++) { const ang = Math.PI * 0.55 + (i / 9) * Math.PI * 0.9; cyl(g, 0.08, 0.1, 1.0, 5, wood, Math.cos(ang) * 2.8, 0.5, -1.9 - Math.sin(ang) * 1.9); }
    house(g, 0.9, 0.9, 0.8, -1.4, -1.4, stone, roof, win, 'gable');
    house(g, 0.8, 0.7, 0.8, 1.3, -1.2, M(0x8a7a62), roof, win, 'gable');
    house(g, 1.2, 1.4, 0.8, 0.1, -2.7, stone, M(0x4a3a2a), win);
    // 採掘やぐら（ヘッドフレーム）
    for (const s2 of [-1, 1]) { const b = box(g, 0.12, 3.0, 0.12, wood, 1.3 + s2 * 0.4, 1.4, -2.9, 0, s2 * 0.15); void b; }
    box(g, 1.0, 0.12, 0.12, wood, 1.3, 2.0, -2.9); box(g, 0.9, 0.12, 0.12, wood, 1.3, 1.0, -2.9);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 6, 16), M(0x8a8a8a, { metalness: 0.6 })); wheel.position.set(1.3, 2.9, -2.9); g.add(wheel); wheel.userData.spin = true;
    for (const [x, z, h] of [[-1.7, -1.6, 1.2], [0.4, -2.9, 1.9]]) { cyl(g, 0.12, 0.15, h, 6, stone, x, h / 2 + 0.4, z); g.userData.smoke = [...(g.userData.smoke || []), [x, h + 0.5, z]]; }
    gate(g, wood, lamp, 1.5, 1.3);
    return g;
  },
  // 町3：中継ステーション（金属の壁・通信塔・発着場・青い光）
  station() {
    const g = new THREE.Group();
    const metal = M(0x7a8490, { metalness: 0.7, roughness: 0.4 }), dark = M(0x3a4250, { metalness: 0.6 }), win = GLOW(0x9fdcff, 1.6), lamp = GLOW(0x4aa0ff, 2.2);
    for (let i = -3; i <= 3; i++) { if (i === 0) continue; box(g, 0.8, 0.9, 0.25, metal, i * 0.85, 0.45, 0.0); }
    for (const s2 of [-1, 1]) box(g, 0.25, 0.9, 3.4, metal, s2 * 2.8, 0.45, -1.8);
    box(g, 5.8, 0.9, 0.25, metal, 0, 0.45, -3.6);
    // 円筒のモジュール
    for (const [x, z] of [[-1.4, -1.5], [-1.4, -2.6]]) { const c = cyl(g, 0.45, 0.45, 1.4, 10, metal, x, 0.5, z, 0, Math.PI / 2); void c; box(g, 0.9, 0.06, 0.05, win, x, 0.6, z + 0.46); }
    house(g, 1.0, 1.6, 0.9, 0.3, -2.4, metal, dark, win);
    // 通信塔とアンテナ皿
    cyl(g, 0.12, 0.22, 3.4, 6, dark, 1.6, 1.7, -2.6); box(g, 0.14, 0.14, 0.14, lamp, 1.6, 3.5, -2.6).userData.blink = true;
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.3, 12, 1, true), M(0xd8dce4, { side: THREE.DoubleSide, metalness: 0.5 })); dish.position.set(1.6, 2.8, -2.3); dish.rotation.x = -1.1; g.add(dish);
    // 発着場
    cyl(g, 0.9, 0.9, 0.08, 12, dark, 1.3, 0.06, -1.0);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(g, 0.08, 0.05, 0.08, lamp, 1.3 + Math.cos(a) * 0.8, 0.12, -1.0 + Math.sin(a) * 0.8); }
    gate(g, metal, lamp, 1.5, 1.4);
    return g;
  },
  // 坑道の入口：岩の口がぽっかり開いて奥が暗い
  cave() {
    const g = new THREE.Group();
    const rock = M(0x6a5038), rock2 = M(0x7a6248);
    const rocks = [[-1.0, 0.6, -0.9, 0.9], [1.0, 0.6, -0.9, 0.9], [0, 1.4, -1.1, 0.95], [-0.6, 1.2, -1.2, 0.7], [0.6, 1.2, -1.2, 0.7], [-1.4, 0.4, -1.6, 0.8], [1.4, 0.4, -1.6, 0.8], [0, 0.8, -1.9, 1.3]];
    for (const [x, y, z, r] of rocks) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), Math.random() < 0.5 ? rock : rock2); m.position.set(x, y, z); m.rotation.set(Math.random(), Math.random(), 0); g.add(m); }
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.75, 12), new THREE.MeshBasicMaterial({ color: 0x050403 }));
    hole.position.set(0, 0.62, -0.25); hole.scale.y = 1.15; g.add(hole);
    const deep = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }));
    deep.position.set(0, 0.62, -0.75); g.add(deep);
    // 線路と木の支え
    for (const s2 of [-1, 1]) box(g, 0.12, 1.3, 0.12, M(0x5a4028), s2 * 0.78, 0.65, -0.2);
    box(g, 1.8, 0.14, 0.16, M(0x5a4028), 0, 1.3, -0.2);
    box(g, 0.14, 0.14, 0.14, GLOW(0xffb04a, 2), 0.75, 1.45, -0.05).userData.blink = true;
    for (const s2 of [-1, 1]) box(g, 0.05, 0.04, 1.4, M(0x9aa0a8, { metalness: 0.7 }), s2 * 0.25, 0.04, 0.2);
    return g;
  },
  // 墜落した宇宙船の残骸
  wreck() {
    const g = new THREE.Group();
    const hull = M(0x6a6e7e, { metalness: 0.6 }), burnt = M(0x2a2a30), glow = GLOW(0xff7a3a, 1.8);
    const body = cyl(g, 0.9, 1.2, 4.0, 8, hull, 0.3, 0.7, -1.4, 0, Math.PI / 2 - 0.25); body.rotation.y = 0.5;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 8), hull); nose.position.set(-1.6, 0.25, -0.3); nose.rotation.set(0.2, 0.5, Math.PI / 2 + 0.3); g.add(nose);
    box(g, 2.4, 0.1, 1.0, burnt, 1.6, 1.2, -2.2, 0.4, 0.6);
    box(g, 1.2, 0.1, 0.8, hull, -0.4, 0.2, 0.6, 1.1, 0.3);
    box(g, 0.5, 0.5, 0.06, M(0x1a1a20), -0.1, 0.5, -0.4, 0.5);
    box(g, 0.3, 0.12, 0.05, glow, 0.9, 1.25, -0.7, 0.5).userData.blink = true;
    for (let i = 0; i < 6; i++) box(g, 0.2 + Math.random() * 0.3, 0.1, 0.2 + Math.random() * 0.3, burnt, -2 + Math.random() * 4, 0.05, -1 + Math.random() * 2, Math.random() * 3);
    g.userData.smoke = [[0.8, 1.6, -1.6], [-0.8, 1.0, -0.6]];
    return g;
  },
  // 廃工場：錆びた壁・煙突・崩れた鉄骨
  factory() {
    const g = new THREE.Group();
    const rust = M(0x7a4a2a, { metalness: 0.5 }), rust2 = M(0x5a3a22, { metalness: 0.5 }), steel = M(0x4a4e56, { metalness: 0.7 }), hazard = M(0xd8a020);
    box(g, 4.4, 2.0, 2.6, rust, 0, 1.0, -1.9);
    for (let i = 0; i < 9; i++) box(g, 0.06, 1.9, 0.04, rust2, -2.0 + i * 0.5, 1.0, -0.58);
    box(g, 4.6, 0.25, 2.8, steel, 0, 2.05, -1.9);
    box(g, 1.4, 1.2, 0.06, M(0x101010), 0, 0.6, -0.56);
    for (let i = 0; i < 5; i++) box(g, 0.28, 0.12, 0.05, i % 2 ? hazard : M(0x1a1a1a), -0.56 + i * 0.28, 1.28, -0.54);
    for (const [x, h] of [[-1.5, 3.2], [1.2, 2.6]]) { cyl(g, 0.25, 0.32, h, 8, rust2, x, h / 2 + 1.0, -2.6); g.userData.smoke = [...(g.userData.smoke || []), [x, h + 1.2, -2.6]]; }
    // 崩れた鉄骨
    box(g, 0.12, 2.2, 0.12, steel, 2.6, 1.0, -0.8, 0, -0.5); box(g, 0.12, 1.8, 0.12, steel, 2.9, 0.8, -1.6, 0, 0.3); box(g, 1.6, 0.1, 0.1, steel, 2.5, 1.3, -1.2, 0.3, 0.4);
    box(g, 0.12, 1.6, 0.12, steel, -2.7, 0.7, -0.9, 0, 0.6);
    box(g, 0.16, 0.16, 0.16, GLOW(0xb04aff, 2), 0, 1.6, -0.5).userData.blink = true;
    return g;
  },
  // ---------------- 第2章「風」の惑星 ----------------
  // 町4：丘の上の風車の町（白い壁・赤い屋根・回る風車）
  windmill() {
    const g = new THREE.Group();
    const wall = M(0xe8e0cc), roof = M(0xb84a32), win = GLOW(0xffe0a0, 1.3), wood = M(0x7a5a3a), lamp = GLOW(0xffd070, 2);
    for (let i = -5; i <= 5; i++) { if (Math.abs(i) <= 1) continue; const ang = (i / 5) * Math.PI * 0.95; box(g, 0.5, 0.5, 0.18, M(0xb8b0a0), Math.sin(ang) * 2.8, 0.25, -1.9 + Math.cos(ang) * 1.9, ang); }
    house(g, 0.9, 0.8, 0.8, -1.4, -1.3, wall, roof, win, 'gable');
    house(g, 0.8, 1.0, 0.8, 1.3, -1.2, wall, roof, win, 'gable');
    house(g, 1.1, 0.7, 0.8, 0.0, -2.6, M(0xd8d0bc), roof, win, 'gable');
    for (const [x, z, k] of [[-1.6, -2.8, 1.0], [1.7, -2.6, 0.85], [0.2, -3.6, 1.2]]) g.add(windmillObj(k, x, z));
    gate(g, wood, lamp, 1.5, 1.3);
    return g;
  },
  // 町5：浮遊島の町（岩の島の上の家・下にぶら下がる岩と鎖・浮遊装置の青い光）
  anchor() {
    const g = new THREE.Group();
    const rock = M(0x7a7268), grass = M(0x6aa04a), wall = M(0xd8d4c8), roof = M(0x3a6a9a), win = GLOW(0xbfe8ff, 1.5), glow = GLOW(0x6ad8ff, 2.2);
    const top = cyl(g, 2.6, 2.2, 0.5, 9, grass, 0, 0.1, -1.9);
    void top;
    const under = new THREE.Mesh(new THREE.ConeGeometry(2.3, 2.6, 9), rock); under.rotation.x = Math.PI; under.position.set(0, -1.45, -1.9); g.add(under);
    house(g, 0.9, 0.9, 0.8, -1.1, -1.4, wall, roof, win, 'gable');
    house(g, 0.8, 1.2, 0.8, 1.0, -1.6, wall, roof, win);
    house(g, 0.9, 0.7, 0.7, 0.0, -2.9, wall, roof, win, 'gable');
    // 浮遊装置（島の下で光る輪）と、つなぎとめる鎖
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.08, 6, 20), glow); ring.rotation.x = Math.PI / 2; ring.position.set(0, -2.4, -1.9); g.add(ring); ring.userData.blink = true;
    for (const s2 of [-1, 1]) { const ch = cyl(g, 0.04, 0.04, 2.4, 4, M(0x5a5e66, { metalness: 0.7 }), s2 * 1.8, 1.2, -2.2, 0, s2 * 0.25); void ch; }
    cyl(g, 0.12, 0.16, 2.6, 6, M(0x6a6e76, { metalness: 0.6 }), 1.6, 1.3, -2.4); box(g, 0.14, 0.14, 0.14, glow, 1.6, 2.7, -2.4).userData.blink = true;
    gate(g, M(0x6a5a4a), glow, 1.4, 1.2);
    g.userData.bob = 0.06;
    return g;
  },
  // 町6：空港の町（滑走路・管制塔・つながれた飛行船）
  airport() {
    const g = new THREE.Group();
    const metal = M(0xb8c0c8, { metalness: 0.5, roughness: 0.5 }), dark = M(0x4a5462, { metalness: 0.5 }), win = GLOW(0xbfe8ff, 1.5), lamp = GLOW(0xff8a3a, 2.2), stripe = M(0xe8e8e0);
    box(g, 5.6, 0.06, 1.2, M(0x5a5e66), 0, 0.03, -3.2);
    for (let i = 0; i < 7; i++) box(g, 0.4, 0.07, 0.08, stripe, -2.4 + i * 0.8, 0.05, -3.2);
    house(g, 1.4, 0.9, 0.9, -1.3, -1.4, metal, dark, win);
    house(g, 0.9, 0.7, 0.8, 0.9, -1.3, M(0xd8c8a8), M(0x8a3a2a), win, 'gable');
    // 管制塔
    cyl(g, 0.2, 0.3, 2.8, 8, metal, 1.9, 1.4, -2.2); cyl(g, 0.45, 0.35, 0.4, 8, win, 1.9, 2.9, -2.2); box(g, 0.14, 0.14, 0.14, lamp, 1.9, 3.25, -2.2).userData.blink = true;
    // つながれた飛行船
    const blimp = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M(0xe8dcc0)); env.scale.set(1.7, 0.6, 0.6); blimp.add(env);
    const gond = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.3), dark); gond.position.y = -0.65; blimp.add(gond);
    for (const s2 of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.5), M(0xb84a32)); fin.position.set(-1.6, 0, s2 * 0.25); blimp.add(fin); }
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.08), dark); prop.position.set(-1.85, 0, 0); prop.userData.spinX = true; blimp.add(prop);
    blimp.position.set(-0.6, 3.0, -3.4); g.add(blimp); blimp.userData.bobObj = true;
    cyl(g, 0.02, 0.02, 2.0, 4, M(0x5a5e66), -0.6, 1.6, -3.3);
    gate(g, metal, lamp, 1.5, 1.4);
    return g;
  },
  // 着陸した宇宙船（第1章から第2章へ乗ってきた船。白い船体に青い窓）
  shuttle() {
    const g = new THREE.Group();
    const hull = M(0xe8ecf0, { metalness: 0.5, roughness: 0.4 }), dark = M(0x3a4250, { metalness: 0.6 }), win = GLOW(0x9fdcff, 1.6), fire = GLOW(0xff9a4a, 2);
    const body = cyl(g, 0.9, 1.1, 4.2, 10, hull, 0, 1.3, -1.6, Math.PI / 2, 0); void body;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 10), hull); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.3, 1.2); g.add(nose);
    box(g, 1.0, 0.25, 0.5, win, 0, 1.75, 0.6, 0, 0, -0.3);
    for (const s2 of [-1, 1]) {
      box(g, 1.6, 0.12, 1.2, hull, s2 * 1.3, 1.0, -2.4, 0, s2 * -0.2);
      box(g, 0.12, 1.0, 0.8, dark, s2 * 0.5, 2.2, -3.4, 0, s2 * 0.3);
      cyl(g, 0.08, 0.1, 1.0, 5, dark, s2 * 0.7, 0.45, -1.0);
      cyl(g, 0.08, 0.1, 1.0, 5, dark, s2 * 0.7, 0.45, -2.6);
    }
    cyl(g, 0.45, 0.55, 0.5, 10, dark, 0, 1.3, -3.9, Math.PI / 2, 0);
    const flame = cyl(g, 0.3, 0.05, 0.5, 8, fire, 0, 1.3, -4.3, Math.PI / 2, 0); flame.userData.blink = true;
    box(g, 0.7, 0.06, 1.2, dark, 0, 0.35, 0.2, 0, 0, -0.45);
    for (let i = 0; i < 4; i++) box(g, 0.2, 0.12, 0.05, win, -0.5 + i * 0.33, 1.6, -1.6 + 1.0, 0, 0);
    return g;
  },
  // 空港の飛行船（ゆっくり上下・プロペラが回る）
  blimp() {
    const g = new THREE.Group();
    const dark = M(0x4a5462, { metalness: 0.5 });
    const ship = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), M(0xe8dcc0)); env.scale.set(3.2, 1.1, 1.1); ship.add(env);
    for (let i = -2; i <= 2; i++) { const band = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.03, 4, 18), M(0xb84a32)); band.rotation.y = Math.PI / 2; band.scale.set(1, 1.08, 1.08); band.position.x = i * 1.1; ship.add(band); }
    const gond = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.6), M(0x7a5a3a)); gond.position.y = -1.25; ship.add(gond);
    for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.03), GLOW(0xffd88a, 1.4)); w.position.set(-0.6 + i * 0.4, -1.2, 0.31); ship.add(w); }
    for (const s2 of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.9), M(0xb84a32)); fin.position.set(-3.0, 0, s2 * 0.45); ship.add(fin); }
    const fin2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.06), M(0xb84a32)); fin2.position.set(-3.0, 0.45, 0); ship.add(fin2);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.12), dark); prop.position.set(-3.5, 0, 0); prop.userData.spinX = true; ship.add(prop);
    ship.position.y = 3.2; ship.userData.bobObj = true;
    g.add(ship);
    cyl(g, 0.05, 0.05, 2.0, 5, dark, 0.8, 1.0, 0); cyl(g, 0.25, 0.3, 0.3, 8, dark, 0.8, 0.15, 0);
    return g;
  },
  // 浮遊島の町の真ん中の浮遊装置（光る輪が回る）
  beacon() {
    const g = new THREE.Group();
    const metal = M(0x8a96a2, { metalness: 0.6 }), glow = GLOW(0x6ad8ff, 2.2);
    cyl(g, 0.6, 0.8, 0.4, 10, metal, 0, 0.2, 0);
    cyl(g, 0.18, 0.25, 2.4, 8, metal, 0, 1.4, 0);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), glow); orb.position.y = 2.8; g.add(orb); orb.userData.blink = true;
    const rg = new THREE.Group(); rg.position.y = 1.8; rg.userData.spinY = true; g.add(rg);
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.8 + i * 0.25, 0.03, 4, 24), glow); r.rotation.x = Math.PI / 2 + i * 0.4; rg.add(r); }
    return g;
  },
  // ---------------- 第3章「水」の惑星 ----------------
  // 町7：港町（桟橋・倉庫・回る灯台）
  harbor() {
    const g = new THREE.Group();
    const wall = M(0xe8e4d8), roof = M(0x2a6a9a), win = GLOW(0xffe0a0, 1.3), wood = M(0x7a5a3a), lamp = GLOW(0xffd070, 2);
    house(g, 1.0, 0.8, 0.8, -1.4, -1.4, wall, roof, win, 'gable');
    house(g, 1.4, 1.0, 0.9, 0.6, -1.5, M(0xc8b090), M(0x8a3a2a), win);
    house(g, 0.8, 0.7, 0.7, -0.4, -2.7, wall, roof, win, 'gable');
    for (const [x, z, w] of [[-2.4, -0.4, 1.6], [2.2, -0.6, 1.8]]) { box(g, w, 0.08, 0.5, wood, x, 0.05, z); for (let i = 0; i < 3; i++) cyl(g, 0.05, 0.05, 0.5, 5, wood, x - w / 2 + 0.2 + i * (w - 0.4) / 2, -0.15, z + 0.2); }
    g.add(lighthouseObj(1.0, 2.0, -2.8));
    box(g, 0.6, 0.3, 0.4, M(0xd84a3a), -2.6, 0.2, -0.4);
    gate(g, wood, lamp, 1.5, 1.3);
    return g;
  },
  // 町8：水上集落（高床の家と桟橋）
  stilts() {
    const g = new THREE.Group();
    const wood = M(0x8a6a44), wood2 = M(0x6a4a2a), roof = M(0x4a8a5a), win = GLOW(0xffd88a, 1.3), lamp = GLOW(0xffb060, 2);
    for (const [x, z, k] of [[-1.5, -1.5, 1], [0.4, -2.4, 1.2], [1.6, -1.2, 0.9], [-0.6, -3.4, 0.8]]) {
      for (const [dx, dz] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) cyl(g, 0.05, 0.05, 1.0, 5, wood2, x + dx * k, 0.1, z + dz * k);
      box(g, 1.0 * k, 0.08, 0.9 * k, wood, x, 0.6, z);
      const hb = new THREE.Group(); hb.position.y = 0.6; g.add(hb);
      house(hb, 0.8 * k, 0.6 * k, 0.7 * k, x, z, M(0xd8c8a0), roof, win, 'gable');
    }
    box(g, 0.4, 0.06, 3.0, wood, 0, 0.3, -1.0);
    gate(g, wood2, lamp, 1.4, 1.2);
    return g;
  },
  // 町9：海上ドーム都市（青いガラスのドームとリング）
  aquadome() {
    const g = new THREE.Group();
    const metal = M(0xb8c8d0, { metalness: 0.6, roughness: 0.3 }), glow = GLOW(0x4ae0ff, 2), win = GLOW(0xbfeaff, 1.5);
    cyl(g, 3.0, 3.2, 0.5, 18, metal, 0, 0.1, -2.0);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8ad8ff, transparent: true, opacity: 0.3, metalness: 0.6, roughness: 0.1, depthWrite: false }));
    dome.position.set(0, 0.35, -2.0); g.add(dome);
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.04, 4, 28, Math.PI), metal); r.rotation.y = (i / 4) * Math.PI; r.position.set(0, 0.35, -2.0); g.add(r); }
    house(g, 0.8, 1.6, 0.8, -0.8, -2.2, metal, M(0x2a4a5a), win);
    house(g, 0.7, 1.1, 0.7, 0.8, -1.6, metal, M(0x2a4a5a), win);
    cyl(g, 0.12, 0.18, 2.8, 8, metal, 0.2, 1.7, -2.8);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.06, 6, 32), glow); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.38, -2.0); g.add(ring); ring.userData.blink = true;
    gate(g, metal, glow, 1.5, 1.3);
    return g;
  },
  // 海上プラント（鉄の脚で立つ採掘リグ。炎の煙突）
  rig() {
    const g = new THREE.Group();
    const steel = M(0x6a7480, { metalness: 0.6 }), rust = M(0xa85a2a, { metalness: 0.4 }), hazard = M(0xe8c020), fire = GLOW(0xff8a3a, 2.4);
    for (const [x, z] of [[-1.6, -1.0], [1.6, -1.0], [-1.6, -3.0], [1.6, -3.0]]) cyl(g, 0.15, 0.2, 2.2, 6, steel, x, 0.2, z);
    box(g, 4.0, 0.25, 2.8, rust, 0, 1.3, -2.0);
    box(g, 1.8, 1.0, 1.2, steel, -0.8, 1.9, -2.4);
    for (let i = 0; i < 5; i++) box(g, 0.3, 0.1, 0.05, i % 2 ? hazard : M(0x1a1a1a), -1.4 + i * 0.3, 1.5, -0.6);
    // 掘削やぐら
    for (const s2 of [-1, 1]) box(g, 0.08, 2.6, 0.08, steel, 1.0 + s2 * 0.3, 2.7, -2.0, 0, s2 * 0.1);
    box(g, 0.7, 0.08, 0.08, steel, 1.0, 3.6, -2.0);
    cyl(g, 0.1, 0.12, 1.6, 6, steel, -1.6, 2.2, -1.2, 0, 0.3);
    const f = cyl(g, 0.15, 0.02, 0.4, 6, fire, -1.85, 3.1, -1.2); f.userData.blink = true;
    box(g, 0.6, 0.06, 1.6, steel, 0, 0.7, -0.2, 0, 0, -0.5);
    g.userData.smoke = [[-1.9, 3.3, -1.2]];
    return g;
  },
  // 水没した都市の入口（傾いて海から突き出たビル）
  sunken() {
    const g = new THREE.Group();
    const conc = M(0x7a8a90), conc2 = M(0x5a6a72), algae = M(0x3a7a5a), glow = GLOW(0x4ae0d0, 1.6);
    box(g, 1.3, 3.4, 1.2, conc, -1.3, 1.0, -2.0, 0, 0.2);
    box(g, 1.0, 2.4, 1.0, conc2, 1.2, 0.6, -2.6, 0.4, -0.25);
    box(g, 0.9, 1.6, 0.9, conc, 0.1, 0.3, -3.3, 0.2, 0.1);
    for (let i = 0; i < 4; i++) box(g, 0.18, 0.2, 0.03, glow, -1.6 + (i % 2) * 0.5, 1.4 + Math.floor(i / 2) * 0.6, -1.39, 0, 0.2).userData.blink = i === 0;
    box(g, 1.4, 0.08, 1.3, algae, -1.3, 0.05, -2.0);
    box(g, 1.4, 1.1, 0.12, M(0x0a1418), 0, 0.3, -0.8);
    gate(g, conc2, glow, 1.6, 1.2);
    return g;
  },
  // 灯台（フィールドの飾り）
  lighthouse() { const g = new THREE.Group(); g.add(lighthouseObj(1.3, 0, 0)); return g; },
  // ブイ（海に浮かぶ飾り。ゆれる）
  buoy() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.6, 8), M(0xe84a2a)); b.position.y = 0.2; g.add(b);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 4), M(0x3a3a3a)); t.position.y = 0.8; g.add(t);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), GLOW(0xffe060, 2)); l.position.y = 1.1; l.userData.blink = true; g.add(l);
    g.userData.bob = 0.12;
    return g;
  },
  // 1本だけの風車（フィールドの飾り）
  mill() { const g = new THREE.Group(); g.add(windmillObj(1.3, 0, 0)); return g; },
  // 嵐の塔：らせんの塔のまわりを雲と稲妻が回る
  tower() {
    const g = new THREE.Group();
    const stone = M(0x5a6470, { metalness: 0.3 }), dark = M(0x2a323c), glow = GLOW(0x9ad8ff, 2.4), bolt = GLOW(0xe8f4ff, 3);
    for (let i = 0; i < 6; i++) cyl(g, 1.3 - i * 0.16, 1.4 - i * 0.16, 1.1, 8, i % 2 ? stone : dark, 0, 0.55 + i * 1.05, -2.0);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 8), stone); top.position.set(0, 7.0, -2.0); g.add(top);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), glow); orb.position.set(0, 7.8, -2.0); g.add(orb); orb.userData.blink = true;
    const ringG = new THREE.Group(); ringG.position.set(0, 4.2, -2.0); g.add(ringG); ringG.userData.spinY = true;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const c = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 5), M(0x6a7480, { transparent: true, opacity: 0.85 })); c.scale.set(1.4, 0.5, 1); c.position.set(Math.cos(a) * 2.0, Math.sin(i) * 0.4, Math.sin(a) * 2.0); ringG.add(c); }
    for (let i = 0; i < 3; i++) { const b = box(g, 0.06, 1.6, 0.06, bolt, -1.6 + i * 1.5, 5.2 - i * 0.6, -1.0, 0, 0.5 - i * 0.4); b.userData.blink = true; }
    box(g, 1.2, 1.2, 0.1, M(0x0a0c10), 0, 0.6, -0.65);
    gate(g, stone, glow, 1.6, 1.4);
    return g;
  },
  // 浮遊研究施設：白い円盤の建物が浮いている（入口へは光の橋）
  lab() {
    const g = new THREE.Group();
    const white = M(0xe0e6ea, { metalness: 0.4, roughness: 0.4 }), teal = GLOW(0x4ae0d0, 1.8), dark = M(0x3a4450);
    const disk = cyl(g, 2.2, 1.6, 0.6, 14, white, 0, 2.0, -2.0); void disk;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xaad8e0, { transparent: true, opacity: 0.5, metalness: 0.6 })); dome.position.set(0, 2.3, -2.0); g.add(dome);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.06, 6, 28), teal); ring.rotation.x = Math.PI / 2; ring.position.set(0, 2.0, -2.0); g.add(ring);
    const under = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.2, 10), dark); under.rotation.x = Math.PI; under.position.set(0, 1.1, -2.0); g.add(under);
    box(g, 0.6, 0.06, 1.6, teal, 0, 0.9, -0.5, 0, 0, -0.55);
    box(g, 0.8, 0.9, 0.08, M(0x0a0c10), 0, 2.0, -0.75);
    g.userData.bob = 0.12;
    return g;
  },
  // 空に浮かぶ岩（フィールドの飾り。ゆっくり上下する）
  floatrock(small) {
    const g = new THREE.Group();
    const k = small ? 0.6 : 1.2;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * k, 1.0 * k, 0.3 * k, 7), M(0x6aa04a)); g.add(top);
    const under = new THREE.Mesh(new THREE.ConeGeometry(1.0 * k, 1.8 * k, 7), M(0x7a7268)); under.rotation.x = Math.PI; under.position.y = -1.0 * k; g.add(under);
    const tr = new THREE.Mesh(new THREE.ConeGeometry(0.35 * k, 0.9 * k, 6), M(0x3e7a3a)); tr.position.set(0.3 * k, 0.6 * k, 0); g.add(tr);
    const outer = new THREE.Group(); outer.add(g);
    outer.userData.bob = 0.3;
    return outer;
  },
  // 廃墟：傾いた建物と瓦礫
  ruin(small) {
    const g = new THREE.Group();
    const conc = M(0x8a8276), conc2 = M(0x6a645a);
    const k = small ? 0.6 : 1;
    box(g, 1.4 * k, 2.2 * k, 1.2 * k, conc, -0.6 * k, 1.0 * k, 0, 0, 0.18);
    box(g, 1.0 * k, 1.4 * k, 1.0 * k, conc2, 0.9 * k, 0.6 * k, 0.3 * k, 0.4, -0.25);
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.2, 0), conc2); m.position.set((Math.random() - 0.5) * 3 * k, 0.1, (Math.random() - 0.5) * 2 * k); g.add(m); }
    for (let i = 0; i < 3; i++) box(g, 0.16, 0.14, 0.03, GLOW(0x5a5a50, 0.2), -0.9 * k + i * 0.3 * k, 1.3 * k, 0.61 * k, 0, 0.18);
    return g;
  },
};
// 灯台（白と赤のしま模様、上で光が回る）
function lighthouseObj(k, x, z) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry((0.32 - i * 0.04) * k, (0.36 - i * 0.04) * k, 0.7 * k, 10), M(i % 2 ? 0xd84a3a : 0xf4f0e6)); c.position.y = (0.35 + i * 0.7) * k; g.add(c); }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * k, 0.26 * k, 0.4 * k, 10), new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: 0xffe060, emissiveIntensity: 1.8 })); top.position.y = 3.0 * k; g.add(top);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.32 * k, 0.4 * k, 10), M(0x3a3a3a)); cap.position.y = 3.4 * k; g.add(cap);
  const beam = new THREE.Group(); beam.position.y = 3.0 * k; beam.userData.spinY = true; g.add(beam);
  const ray = new THREE.Mesh(new THREE.ConeGeometry(0.35 * k, 3.0 * k, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4b0, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
  ray.rotation.z = Math.PI / 2; ray.position.x = 1.5 * k; beam.add(ray);
  g.position.set(x, 0, z);
  return g;
}
// 風車（塔と4枚の羽。羽は spin で回る）
function windmillObj(k, x, z) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * k, 0.45 * k, 2.2 * k, 8), M(0xeae4d4)); body.position.y = 1.1 * k; g.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.4 * k, 0.5 * k, 8), M(0xb84a32)); cap.position.y = 2.45 * k; g.add(cap);
  const hub = new THREE.Group(); hub.position.set(0, 2.0 * k, 0.42 * k); hub.userData.spin = true; g.add(hub);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.18 * k, 1.3 * k, 0.03), M(0xf4f0e6)); b.position.y = 0.65 * k; const arm = new THREE.Group(); arm.rotation.z = (i / 4) * Math.PI * 2; arm.add(b); hub.add(arm); }
  g.position.set(x, 0, z);
  return g;
}
export function addStructures(scene, map, heightAt) {
  const list = [];
  for (const st of map.structures || []) {
    const fn = st.kind === 'town' ? STRUCT[st.style] : STRUCT[st.kind];
    if (!fn) continue;
    const obj = fn(st.small);
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const x = st.x + 0.5, z = st.y + 0.5;
    obj.position.set(x, heightAt(map, x, z) - 0.05 + (st.lift || 0), z);
    if (st.rot) obj.rotation.y = st.rot;
    scene.add(obj);
    const blink = [], spin = [], spinY = [], spinX = [], bobs = [];
    obj.traverse((o) => { if (o.userData.blink) blink.push(o); if (o.userData.spin) spin.push(o); if (o.userData.spinY) spinY.push(o); if (o.userData.spinX) spinX.push(o); if (o.userData.bobObj) bobs.push({ o, y: o.position.y }); });
    // 浮かぶ物（浮遊島の町・研究施設・浮かぶ岩）はゆっくり上下する
    const fl = obj.children.length === 1 && obj.children[0].userData.bob ? obj.children[0] : null;
    if (obj.userData.bob) bobs.push({ o: obj, y: obj.position.y, k: obj.userData.bob });
    if (fl) bobs.push({ o: fl, y: fl.position.y, k: fl.userData.bob });
    list.push({ data: st, obj, x, z, blink, spin, spinY, spinX, bobs, smoke: obj.userData.smoke || [], smokeT: 0 });
  }
  return list;
}
export function updateStructures(list, t, dt, scene, tex) {
  for (const s of list) {
    for (const b of s.blink) b.visible = Math.sin(t * 3 + s.x) > -0.3;
    for (const w of s.spin) w.rotation.z = t * 1.5;
    for (const w of s.spinY) w.rotation.y = t * 0.5;
    for (const w of s.spinX) w.rotation.x = t * 12;
    for (const b of s.bobs) b.o.position.y = b.y + Math.sin(t * 0.9 + s.x) * (b.k ?? 0.15);
    // 煙突・残骸の煙
    s.smokeT += dt;
    if (s.smoke.length && s.smokeT > 0.35) {
      s.smokeT = 0;
      for (const [x, y, z] of s.smoke) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x6a645c, transparent: true, opacity: 0.5, depthWrite: false }));
        const wp = new THREE.Vector3(x, y, z).applyMatrix4(s.obj.matrixWorld);
        sp.position.copy(wp); sp.scale.setScalar(0.4);
        sp.userData.life = 0;
        scene.add(sp);
        (s.puffs ||= []).push(sp);
      }
    }
    for (const sp of [...(s.puffs || [])]) {
      sp.userData.life += dt;
      sp.position.y += dt * 0.6; sp.position.x += dt * 0.2;
      sp.scale.setScalar(0.4 + sp.userData.life * 0.8);
      sp.material.opacity = 0.5 * (1 - sp.userData.life / 2.2);
      if (sp.userData.life > 2.2) { scene.remove(sp); sp.material.dispose(); s.puffs.splice(s.puffs.indexOf(sp), 1); }
    }
  }
}

// ---------------- 家具 ----------------
export function addProps(scene, map, isTaken) {
  const list = [];
  for (const p of map.props || []) {
    let obj = null;
    if (p.model) {
      obj = getModel(p.model, p.colors || {});
      obj.position.set(p.x, p.y0 || 0, p.y);
      obj.rotation.y = p.rot || 0;
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(obj);
    }
    list.push({ data: p, obj, x: p.x, z: p.y, taken: isTaken(p) });
  }
  return list;
}

// ---------------- 宝箱 ----------------
export function addChests(scene, map, isOpened) {
  return (map.chests || []).map((c) => {
    const obj = getModel(c.big ? 'chest_big' : 'chest', c.secret ? { primary: 0x2a2a3a, accent: 0xc0c8d8, glow: 0xff7af0 } : {});
    obj.position.set(c.x + 0.5, 0, c.y + 0.5);
    obj.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const opened = isOpened(c);
    const lid = obj.getObjectByName('lid');
    if (opened && lid) lid.rotation.x = -1.9;
    scene.add(obj);
    return { data: c, obj, lid, x: c.x + 0.5, z: c.y + 0.5, opened };
  });
}

// 調べられる物の上に出る光の目印
export function makeSparkle(tex, color = 0xffe08a) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.scale.setScalar(0.45);
  return sp;
}

// 建造物を1つだけ組み立てる（宇宙船で星から星へ飛ぶ演出などで使う）
export const buildStruct = (kind, arg) => STRUCT[kind]?.(arg) || null;
