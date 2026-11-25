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

  // ---- 武器の取り付け（6か所＋アルファの胸のコア）----
  // 肩・背中の取り付け点は、腕の付け根（socket_armR/L）の位置から計算する（どのボディでも頭と重ならない間隔になるように）
  const legend = P('body').model === 'body_legend';
  const armSock = body.getObjectByName('socket_armR');
  const ax = armSock ? Math.abs(armSock.position.x) : 0.6, ay = armSock ? armSock.position.y : 0.55;
  const mountNodes = {};
  const mountNode = (info) => {
    const key = `${info.place}${info.side || ''}`;
    if (mountNodes[key]) return mountNodes[key];
    const g = new THREE.Group();
    g.name = `mount_${key}`;
    const sx = info.side === 'R' ? -1 : 1; // 右＝モデルの -x 側
    if (info.place === 'shoulder') g.position.set(sx * (ax * 0.95 + 0.04), ay + 0.42, 0.02); // 肩の上：頭の横を通る間隔
    else if (info.place === 'back') g.position.set(legend ? sx * 0.5 : sx * ax * 0.6, legend ? 0.3 : ay + 0.12, legend ? -0.2 : -0.52); // 背中：頭より後ろ・下
    else if (info.place === 'core') { const core = body.getObjectByName('core'); g.position.copy(core ? core.position : new THREE.Vector3(0, 0.52, 0.39)); }
    body.add(g);
    mountNodes[key] = g;
    return g;
  };
  const weapons = [];
  const sealStage = spec.sealStage ?? 0;
  (spec.weapons || []).forEach((w, i) => {
    if (!w) return;
    const def = WEAPONS[w.id];
    if (!def) return;
    const info = SLOT_INFO[i];
    if (!info) return;
    // 胸のコアのステラ・ブレイカー：封印の段階で光と形が変わる発射口
    if (info.core) {
      if (!legend) return;
      const obj = buildStellaEmitter(sealStage);
      mountNode(info).add(obj);
      weapons.push({ slot: i, obj, def, muzzle: obj.getObjectByName('muzzle') || obj, core: true });
      return;
    }
    const obj = getModel(def.model, { primary: def.color, secondary: new THREE.Color(def.color).multiplyScalar(0.6).getHex(), ...(def.glow ? { glow: def.glow, accent: def.glow } : {}) });
    obj.scale.setScalar(def.size || 1);
    enhanceWeapon(obj, w.plus || 0, def.color);
    let mount;
    if (info.place === 'hand') {
      const arm = info.side === 'R' ? armR : armL;
      mount = arm.getObjectByName('socket_hand') || arm;
      obj.scale.multiplyScalar(0.85);
    } else {
      mount = mountNode(info);
      // 武器のモデルごとの取り付けの設定（位置と角度）。長い砲身は少し上向き、ミサイルは斜め上
      const cfg = { ...WEAPON_MOUNT.default, ...(WEAPON_MOUNT[def.model] || {}), ...(WEAPON_MOUNT[def.model]?.[info.place] || {}) };
      obj.position.set(0, cfg.y, cfg.z);
      obj.rotation.x = info.place === 'back' ? cfg.rxBack : cfg.rx;
      obj.scale.multiplyScalar(info.place === 'shoulder' ? cfg.scaleShoulder : 1);
    }
    mount.add(obj);
    weapons.push({ slot: i, obj, def, muzzle: obj.getObjectByName('muzzle') || obj, place: info.place, side: info.side });
  });
  // 頭と重なっていないかを調べて、重なっていれば外側・後ろ・下へずらす（揺れや反動の分の余白つき）
  fixHeadOverlap(root, head, weapons);
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
  // 完全解放（アルファマックス）：翼が光で大きく広がる
  if (spec.wingSpread && (wR || wL)) {
    for (const [wg, sx] of [[wR, -1], [wL, 1]]) {
      if (!wg) continue;
      wg.scale.setScalar(1.35);
      const light = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2), new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      light.position.set(sx * 0.25, 1.1, -0.05);
      light.name = 'lightWing';
      wg.add(light);
    }
    root.userData.wingBase = [(wR?.rotation.z || 0) - 0.25, (wL?.rotation.z || 0) + 0.25];
  }
  if (spec.glow != null) setGlow(root, spec.glow);
  return root;
}

// 肩・背中の武器のモデルごとの取り付け設定。y・z＝取り付け点からのずれ、rx＝肩の角度、rxBack＝背中の角度（マイナスで砲身が上を向く）
const WEAPON_MOUNT = {
  default: { y: 0.08, z: 0.0, rx: 0, rxBack: -0.35, scaleShoulder: 0.9 },
  wpn_cannon: { z: 0.05, rx: 0, rxBack: -0.45 },
  wpn_missile: { y: 0.04, rx: -0.15, rxBack: -0.3 },
  wpn_special: { rx: -0.05, rxBack: -0.35 },
  wpn_alpha_lance: { z: 0.05, rxBack: -0.5 },
  wpn_omega_buster: { z: 0.05, rxBack: -0.5 },
  wpn_alpha_aurora: { rx: -0.15, rxBack: -0.3 },
  wpn_omega_nova: { rx: -0.15, rxBack: -0.3 },
};

// 頭と肩・背中の武器が重なっていたら、外側・後ろ・下へずらす
function fixHeadOverlap(root, head, weapons) {
  root.updateMatrixWorld(true);
  const hb = new THREE.Box3().setFromObject(head).expandByScalar(0.06); // 揺れ・反動の分の余白
  let fixed = 0;
  for (const wp of weapons) {
    if (wp.core || wp.place === 'hand' || !wp.place) continue;
    const sx = wp.side === 'R' ? -1 : 1;
    for (let k = 0; k < 24; k++) {
      const wb = new THREE.Box3().setFromObject(wp.obj);
      if (!wb.intersectsBox(hb)) break;
      wp.obj.position.x += sx * 0.04;
      if (wp.place === 'back') { wp.obj.position.z -= 0.03; wp.obj.position.y -= 0.02; }
      wp.obj.updateMatrixWorld(true);
      fixed++;
    }
  }
  root.userData.overlapFixed = fixed;
}

// アルファの胸のコアの発射口（ステラ・ブレイカー）。封印の段階で光の輪の数と大きさが増える
function buildStellaEmitter(stage) {
  const g = new THREE.Group();
  g.name = 'stella';
  const k = 0.7 + stage * 0.15;
  const glow = new THREE.MeshStandardMaterial({ color: 0xbff4ff, emissive: 0xbff4ff, emissiveIntensity: stage ? 1.2 + stage * 0.5 : 0.2, flatShading: true });
  glow.userData.role = 'glow';
  glow.userData.baseEmissive = glow.emissive.clone();
  glow.userData.baseEmissiveIntensity = glow.emissiveIntensity;
  const gold = new THREE.MeshStandardMaterial({ color: stage ? 0xe8c24a : 0x6a5a3a, metalness: 0.6, roughness: 0.3, flatShading: true });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.07 * k, 0), glow);
  crystal.position.z = 0.06;
  g.add(crystal);
  for (let i = 0; i < Math.max(1, stage); i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1 * k + i * 0.035, 0.012, 4, 20), i % 2 ? glow : gold);
    ring.position.z = 0.04 + i * 0.03;
    g.add(ring);
  }
  if (stage >= 3) for (const s of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12 * k, 0.08), gold); fin.position.set(s * 0.15 * k, 0, 0.06); fin.rotation.z = s * 0.5; g.add(fin); }
  const muzzle = new THREE.Group(); muzzle.name = 'muzzle'; muzzle.position.z = 0.12; g.add(muzzle);
  g.userData.stage = stage;
  return g;
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
