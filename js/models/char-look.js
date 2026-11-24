// 生身のキャラの見た目：専用防具で色が変わり、4つそろうと光をまとう。手には装備中の武器を持つ
import * as THREE from 'three';
import { getModel } from '../core/assets.js';
import { CHARACTERS } from '../data/characters.js';
import { FOOT_GEAR, FOOT_CATS, SETS } from '../data/footgear.js';
import { setOf } from '../game/state.js';

export function buildCharModel(m) {
  const body = FOOT_GEAR[m.equip?.body];
  const look = body?.set ? SETS[body.set].look : {};
  const obj = getModel(CHARACTERS[m.id].model, look);
  // 手に持つ武器
  const w = FOOT_GEAR[m.equip?.weapon];
  const wm = w && (w.model || FOOT_CATS[w.cat]?.model);
  const arm = obj.getObjectByName('armR');
  if (wm && arm) {
    const wo = getModel(wm, w.final ? { glow: { ren: 0xffd86a, shion: 0xff2a3a, gina: 0xff7a2a }[w.final] } : {});
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
