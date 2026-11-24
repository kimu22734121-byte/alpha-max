// マシン（ロボット）の組み立て。部位ごとのモデルを socket_* に取り付ける
// パーツや武器を付け替えると見た目も変わる
import * as THREE from 'three';
import { getModel, setGlow } from '../core/assets.js';
import { PARTS, SLOT_INFO } from '../data/parts.js';
import { WEAPONS } from '../data/weapons.js';

const ringGeo = new THREE.TorusGeometry(0.16, 0.025, 6, 16);
const finGeo = new THREE.BoxGeometry(0.03, 0.18, 0.4);

// 武器強化の見た目：+3から少し光り、+5で輝いて形も変わる
function enhanceWeapon(obj, plus, color) {
  if (plus < 3) return;
  const glowCol = plus >= 5 ? 0xffd36a : 0x6af0ff;
  const mat = new THREE.MeshStandardMaterial({ name: 'glow', color: glowCol, emissive: glowCol, emissiveIntensity: plus >= 5 ? 2.2 : 0.9, flatShading: true });
  mat.userData.role = 'glow';
  mat.userData.baseEmissive = mat.emissive.clone();
  mat.userData.baseEmissiveIntensity = mat.emissiveIntensity;
  const muzzle = obj.getObjectByName('muzzle');
  const z = muzzle ? muzzle.position.z : 0.6;
  const ring = new THREE.Mesh(ringGeo, mat);
  ring.position.set(0, muzzle?.position.y ?? 0, z * 0.7);
  obj.add(ring);
  if (plus >= 5) {
    for (const s of [-1, 1]) {
      const fin = new THREE.Mesh(finGeo, mat);
      fin.position.set(0.18 * s, 0.05, z * 0.35);
      fin.rotation.z = 0.35 * s;
      obj.add(fin);
    }
    const ring2 = new THREE.Mesh(ringGeo, mat);
    ring2.position.set(0, muzzle?.position.y ?? 0, z * 0.45);
    ring2.scale.setScalar(1.2);
    obj.add(ring2);
    obj.userData.plus5 = true;
  }
  void color;
}

// spec: { parts:{head,body,armR,armL,legs}, colors, weapons:[{id, plus}|null ×5], glow }
export function buildMachineModel(spec) {
  const root = new THREE.Group();
  root.name = 'machine';
  const c = spec.colors || {};
  const P = (slot) => PARTS[spec.parts[slot]];
  const legs = getModel(P('legs').model, c);
  root.add(legs);
  const body = getModel(P('body').model, c);
  (legs.getObjectByName('socket_body') || legs).add(body);
  const head = getModel(P('head').model, c);
  (body.getObjectByName('socket_head') || body).add(head);
  const armR = getModel(P('armR').model, c);
  (body.getObjectByName('socket_armR') || body).add(armR);
  const armL = getModel(P('armL').model, c);
  armL.scale.x = -1;
  (body.getObjectByName('socket_armL') || body).add(armL);

  const weapons = [];
  (spec.weapons || []).forEach((w, i) => {
    if (!w) return;
    const def = WEAPONS[w.id];
    if (!def) return;
    const info = SLOT_INFO[i];
    const obj = getModel(def.model, { primary: def.color, secondary: new THREE.Color(def.color).multiplyScalar(0.6).getHex(), ...(def.glow ? { glow: def.glow, accent: def.glow } : {}) });
    obj.scale.setScalar(def.size || 1);
    enhanceWeapon(obj, w.plus || 0, def.color);
    let mount;
    if (info.mount === 'arm') {
      const arm = info.side === 'R' ? armR : armL;
      mount = arm.getObjectByName('socket_hand') || arm;
      obj.scale.multiplyScalar(0.85);
    } else {
      mount = body.getObjectByName(info.socket) || body;
      obj.position.y = 0.12;
      obj.position.z = -0.1;
      if (def.cat === 'missile') obj.rotation.x = -0.25;
    }
    mount.add(obj);
    weapons.push({ slot: i, obj, def, muzzle: obj.getObjectByName('muzzle') || obj });
  });

  root.userData = {
    kind: 'machine',
    legs, body, head, armR, armL, weapons,
    hatch: body.getObjectByName('hatch'),
    legType: legs.userData.legType,
    hover: !!legs.userData.hover,
    radar: head.getObjectByName('radar'),
  };
  const wR = body.getObjectByName('wingR'), wL = body.getObjectByName('wingL');
  if (wR || wL) { root.userData.wings = [wR, wL]; root.userData.wingBase = [wR?.rotation.z || 0, wL?.rotation.z || 0]; }
  if (spec.glow != null) setGlow(root, spec.glow);
  return root;
}

// 歩くアニメーション（脚の付け根を振る）。t は経過時間、speed は 0..1
export function animateMachine(obj, t, speed) {
  const u = obj.userData;
  if (!u.legs) return;
  const swing = Math.sin(t * 9) * 0.45 * speed;
  const L = u.legs.getObjectByName('legL'), R = u.legs.getObjectByName('legR');
  if (u.legType === 'biped') {
    if (L) L.rotation.x = swing;
    if (R) R.rotation.x = -swing;
    u.body.position.y = Math.abs(Math.sin(t * 9)) * 0.06 * speed;
  } else if (u.legType === 'quad') {
    const BL = u.legs.getObjectByName('legBL'), BR = u.legs.getObjectByName('legBR');
    if (L) L.rotation.x = swing * 0.6; if (BR) BR.rotation.x = swing * 0.6;
    if (R) R.rotation.x = -swing * 0.6; if (BL) BL.rotation.x = -swing * 0.6;
  } else if (u.legType === 'hover') {
    u.legs.position.y = 0.15 + Math.sin(t * 3) * 0.05;
  } else if (u.legType === 'tread') {
    u.body.position.y = Math.sin(t * 30) * 0.01 * speed;
  } else if (u.legType === 'wheel') {
    for (const n of ['wheelF', 'wheelB']) { const w = u.legs.getObjectByName(n); if (w) w.rotation.x += speed * 0.35; }
    u.body.position.y = Math.sin(t * 20) * 0.01 * speed;
  }
  // 伝説の機体の翼（ゆっくり開いたり閉じたり）
  if (u.wings) {
    const k = 0.08 * Math.sin(t * 1.6) + speed * 0.15;
    if (u.wings[0]) u.wings[0].rotation.z = u.wingBase[0] - k;
    if (u.wings[1]) u.wings[1].rotation.z = u.wingBase[1] + k;
  }
  if (u.radar) u.radar.rotation.y = t * 2;
}

// キャラの歩くアニメーション
export function animateChar(obj, t, speed) {
  const L = obj.getObjectByName('legL'), R = obj.getObjectByName('legR');
  const aL = obj.getObjectByName('armL'), aR = obj.getObjectByName('armR');
  const s = Math.sin(t * 12) * 0.7 * speed;
  if (L) L.rotation.x = s;
  if (R) R.rotation.x = -s;
  if (aL) aL.rotation.x = -s * 0.8;
  if (aR) aR.rotation.x = s * 0.8;
  const head = obj.getObjectByName('head');
  if (head) head.position.y = 0.6 + Math.abs(Math.sin(t * 12)) * 0.025 * speed + Math.sin(t * 2) * 0.005;
}

// 敵のアイドル（触手・ローター・浮遊）
export function animateEnemy(obj, t) {
  obj.traverse((o) => {
    if (o.name.startsWith('rotor')) o.rotation.y = t * 25;
    else if (o.name.startsWith('tentacle')) { o.rotation.x = Math.sin(t * 2 + o.id) * 0.4; o.rotation.z = Math.cos(t * 1.7 + o.id) * 0.3; }
    else if (o.name === 'drill') o.rotation.z = t * 12;
    else if (o.name === 'barrels') o.rotation.z = t * 3;
    else if (o.name === 'wingL' || o.name === 'wingR') o.rotation.z = (o.name === 'wingL' ? 1 : -1) * (0.2 + Math.sin(t * 3) * 0.15);
  });
  const core = obj.getObjectByName('core');
  if (core && obj.userData.flying) core.position.y = (obj.userData.coreY ??= core.position.y) + Math.sin(t * 2.2) * 0.12;
}
