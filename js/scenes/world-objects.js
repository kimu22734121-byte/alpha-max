// フィールドに置く3Dの物：町の建物・建物の上のアイコン・家具・宝箱・「調べられる」目印
import * as THREE from 'three';
import { getModel } from '../core/assets.js';
import { buildBuilding } from '../models/builders.js';

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
};
// 町ごとに少し色合いを変える
const TOWN_TINT = { town1: 1.0, town2: 0.85, town3: 0.95 };

// ---------------- 建物の上に浮かぶアイコン ----------------
const iconCache = {};
function drawIcon(kind) {
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
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function makeIconSprite(kind) {
  iconCache[kind] ||= drawIcon(kind);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconCache[kind], depthTest: false, transparent: true }));
  sp.scale.setScalar(1.25);
  sp.renderOrder = 10;
  return sp;
}

// ---------------- 町の建物 ----------------
export function addBuildings(scene, map) {
  const list = [];
  for (const b of map.buildings || []) {
    const st = BUILDING_STYLE[b.facility] || BUILDING_STYLE.item;
    const k = TOWN_TINT[map.id] ?? 1;
    const colors = Object.fromEntries(Object.entries(st.colors).map(([r, c]) => [r, new THREE.Color(c).multiplyScalar(r === 'primary' ? k : 1).getHex()]));
    const obj = buildBuilding({ style: st.style, w: b.w, d: b.h, colors });
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    obj.position.set(b.x + b.w / 2, 0, b.y + b.h / 2);
    scene.add(obj);
    const icon = makeIconSprite(b.facility);
    icon.position.set(b.x + b.w / 2, obj.userData.height + 0.9, b.y + b.h / 2);
    scene.add(icon);
    const mats = [];
    obj.traverse((o) => { if (o.isMesh) mats.push(o.material); });
    list.push({ b, obj, icon, mats, baseY: icon.position.y, faded: false });
  }
  return list;
}

// プレイヤーが建物の裏にいる時は建物を半透明にする
export function updateBuildings(list, px, pz, t) {
  for (const it of list) {
    const b = it.b;
    const behind = px > b.x - 0.3 && px < b.x + b.w + 0.3 && pz < b.y + b.h - 0.4 && pz > b.y - 3.2;
    if (behind !== it.faded) {
      it.faded = behind;
      for (const m of it.mats) { m.transparent = behind; m.opacity = behind ? 0.3 : 1; m.depthWrite = !behind; }
    }
    it.icon.position.y = it.baseY + Math.sin(t * 2 + b.x) * 0.12;
  }
}

// ---------------- 家具 ----------------
export function addProps(scene, map, isTaken) {
  const list = [];
  for (const p of map.props || []) {
    let obj = null;
    if (p.model) {
      obj = getModel(p.model);
      obj.position.set(p.x, 0, p.y);
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
