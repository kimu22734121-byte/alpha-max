// 3Dモデルの読み込み。models/*.glb を優先し、読めなければ builders.js で組み立てる
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildModel, MODEL_BUILDERS } from '../models/builders.js';

const cache = new Map(); // id → 元になる Object3D
const ROLE_NAMES = ['primary', 'secondary', 'accent', 'dark', 'metal', 'skin', 'hair', 'glow', 'organic', 'visor', 'lens', 'leather'];

function prepare(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) { m.flatShading = true; m.needsUpdate = true; }
    }
  });
  return obj;
}

export async function loadModels(onProgress) {
  let ids = Object.keys(MODEL_BUILDERS);
  try {
    const res = await fetch('models/manifest.json');
    if (res.ok) ids = (await res.json()).models;
  } catch { /* マニフェストが無ければ builders の一覧を使う */ }
  const loader = new GLTFLoader();
  let done = 0;
  await Promise.all(ids.map(async (id) => {
    try {
      const gltf = await loader.loadAsync(`models/${id}.glb`);
      const root = gltf.scene.children.length === 1 ? gltf.scene.children[0] : gltf.scene;
      root.removeFromParent?.();
      cache.set(id, prepare(root));
    } catch {
      // GLBが無い・読めない時はその場で組み立てる
    }
    done++;
    onProgress?.(done / ids.length);
  }));
}

function getBase(id) {
  if (!cache.has(id)) cache.set(id, prepare(buildModel(id)));
  return cache.get(id);
}

// 色替えしたコピーを返す。マテリアルはインスタンスごとに複製（ダメージ時の点滅などで個別に変えるため）
export function getModel(id, colors = {}, opts = {}) {
  const base = getBase(id);
  const obj = base.clone(true);
  const matMap = new Map();
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    let m = matMap.get(src);
    if (!m) {
      m = src.clone();
      const role = ROLE_NAMES.find((r) => m.name === r || m.name.startsWith(r));
      if (role && colors[role] != null) {
        m.color.setHex(colors[role]);
        if (role === 'glow' || role === 'lens') m.emissive.setHex(colors[role]);
      }
      if (role === 'organic' && colors.organicGlow != null) m.emissive.setHex(colors.organicGlow);
      if (opts.metal && (role === 'primary' || role === 'secondary')) { m.metalness = 0.9; m.roughness = 0.25; }
      m.userData.role = role;
      m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null;
      m.userData.baseEmissiveIntensity = m.emissiveIntensity;
      matMap.set(src, m);
    }
    o.material = m;
  });
  obj.userData = { ...base.userData, ...obj.userData };
  return obj;
}

// マテリアルを一時的に光らせる（ダメージ時の点滅など）
export function flashModel(obj, color = 0xffffff, intensity = 1.5) {
  obj.traverse((o) => {
    if (!o.isMesh || !o.material.emissive) return;
    o.material.emissive.setHex(color);
    o.material.emissiveIntensity = intensity;
  });
}
export function resetFlash(obj) {
  obj.traverse((o) => {
    if (!o.isMesh || !o.material.emissive) return;
    const m = o.material;
    if (m.userData.baseEmissive) m.emissive.copy(m.userData.baseEmissive);
    m.emissiveIntensity = m.userData.baseEmissiveIntensity ?? 1;
  });
}
export function setGlow(obj, intensity, color) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (m.userData.role === 'glow') {
      m.emissiveIntensity = intensity;
      if (color != null) { m.color.setHex(color); m.emissive.setHex(color); }
      m.userData.baseEmissiveIntensity = intensity;
      m.userData.baseEmissive = m.emissive.clone();
    }
  });
}
export function setOpacity(obj, a) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.material.transparent = a < 1;
    o.material.opacity = a;
  });
}
export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) { m.map?.dispose(); m.dispose(); }
    }
  });
}

export { THREE };
