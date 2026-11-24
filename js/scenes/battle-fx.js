// 戦闘の演出（弾・ミサイル・ビーム・炎・爆発・ダメージ数字・カメラの揺れ）
import * as THREE from 'three';
import { tween, Ease, rand } from '../core/tween.js';

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.35, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function smokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 6; i++) {
    const x = 20 + Math.random() * 24, y = 20 + Math.random() * 24, r = 12 + Math.random() * 10;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class BattleFX {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.parts = [];
    this.glowTex = glowTexture();
    this.smokeTex = smokeTexture();
    this.shake = 0;
    this.box = new THREE.BoxGeometry(1, 1, 1);
    this.numLayer = document.createElement('div');
    this.numLayer.className = 'dmg-layer';
    document.body.appendChild(this.numLayer);
  }

  dispose() {
    for (const p of this.parts) this.scene.remove(p.obj);
    this.parts = [];
    this.numLayer.remove();
  }

  sprite(color, size, opacity = 1, additive = true, tex = this.glowTex) {
    const m = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    const s = new THREE.Sprite(m);
    s.scale.setScalar(size);
    this.scene.add(s);
    return s;
  }

  // 寿命つきの粒。update(dt) で動く
  particle(obj, life, upd) {
    this.parts.push({ obj, life, t: 0, upd });
  }

  update(dt) {
    for (const p of [...this.parts]) {
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { this.scene.remove(p.obj); p.obj.material?.dispose?.(); this.parts.splice(this.parts.indexOf(p), 1); continue; }
      p.upd?.(p, k, dt);
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.25;
      this.camera.position.x += rand(-s, s);
      this.camera.position.y += rand(-s, s);
    }
  }

  flash(pos, color = 0xffd080, size = 2, life = 0.25) {
    const s = this.sprite(color, size * 0.4);
    s.position.copy(pos);
    this.particle(s, life, (p, k) => { s.scale.setScalar(size * (0.4 + k)); s.material.opacity = 1 - k; });
  }

  smoke(pos, size = 1, life = 1.2, color = 0x777777) {
    const s = this.sprite(color, size, 0.7, false, this.smokeTex);
    s.position.copy(pos);
    const vy = rand(0.4, 1.0), vx = rand(-0.3, 0.3), vz = rand(-0.3, 0.3);
    this.particle(s, life, (p, k, dt) => { s.position.x += vx * dt; s.position.y += vy * dt; s.position.z += vz * dt; s.scale.setScalar(size * (1 + k * 1.5)); s.material.opacity = 0.7 * (1 - k); });
  }

  debris(pos, n = 8, color = 0x555555, speed = 4) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.box, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
      m.scale.setScalar(rand(0.06, 0.16));
      m.position.copy(pos);
      this.scene.add(m);
      const v = new THREE.Vector3(rand(-1, 1), rand(0.6, 1.6), rand(-1, 1)).normalize().multiplyScalar(rand(speed * 0.5, speed));
      const spin = rand(-10, 10);
      this.particle(m, rand(0.6, 1.1), (p, k, dt) => {
        v.y -= 12 * dt;
        m.position.addScaledVector(v, dt);
        if (m.position.y < 0.05) { m.position.y = 0.05; v.multiplyScalar(0.4); v.y = Math.abs(v.y) * 0.3; }
        m.rotation.x += spin * dt; m.rotation.y += spin * dt;
      });
    }
  }

  explosion(pos, scale = 1, color = 0xffa040) {
    this.flash(pos, 0xffffff, 1.6 * scale, 0.18);
    this.flash(pos, color, 3.2 * scale, 0.5);
    for (let i = 0; i < 6 * scale; i++) {
      const s = this.sprite(i % 2 ? 0xff7a20 : 0xffd060, 0.8 * scale);
      const dir = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize();
      s.position.copy(pos);
      this.particle(s, rand(0.3, 0.6), (p, k, dt) => { s.position.addScaledVector(dir, dt * 3 * scale * (1 - k)); s.material.opacity = 1 - k; s.scale.setScalar(0.8 * scale * (1 + k)); });
    }
    for (let i = 0; i < 4 * scale; i++) this.smoke(pos.clone().add(new THREE.Vector3(rand(-0.4, 0.4), rand(0, 0.4), rand(-0.4, 0.4))), 1.2 * scale, rand(0.9, 1.6), 0x4a4440);
    this.debris(pos, Math.round(5 * scale), 0x4a4a4a, 4 * scale);
    const light = new THREE.PointLight(color, 40 * scale, 8 * scale, 2);
    light.position.copy(pos);
    this.scene.add(light);
    this.particle(light, 0.35, (p, k) => { light.intensity = 40 * scale * (1 - k); });
    this.shake = Math.max(this.shake, 0.5 * scale);
  }

  sparks(pos, color = 0x9affff, n = 10) {
    for (let i = 0; i < n; i++) {
      const s = this.sprite(color, 0.25);
      s.position.copy(pos);
      const v = new THREE.Vector3(rand(-1, 1), rand(0, 1.5), rand(-1, 1)).multiplyScalar(3);
      this.particle(s, rand(0.3, 0.7), (p, k, dt) => { v.y -= 6 * dt; s.position.addScaledVector(v, dt); s.material.opacity = 1 - k; });
    }
  }

  ring(pos, color = 0x6aa0ff, size = 3, life = 0.6) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(pos); m.rotation.x = Math.PI / 2;
    this.scene.add(m);
    this.particle(m, life, (p, k) => { m.scale.setScalar(0.2 + size * k); m.material.opacity = 1 - k; });
  }

  // 機銃の曳光弾
  async tracers(from, to, color = 0xffe08a, n = 8, spread = 0.4) {
    const ps = [];
    for (let i = 0; i < n; i++) {
      ps.push(new Promise((resolve) => {
        setTimeout(() => {
          const m = new THREE.Mesh(this.box, new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending }));
          m.scale.set(0.05, 0.05, 0.6);
          const tgt = to.clone().add(new THREE.Vector3(rand(-spread, spread), rand(-spread, spread) * 0.6, rand(-spread, spread)));
          m.position.copy(from);
          m.lookAt(tgt);
          this.scene.add(m);
          this.flash(from, 0xffe0a0, 0.6, 0.08);
          const start = from.clone();
          this.particle(m, 0.16, (p, k) => { m.position.lerpVectors(start, tgt, k); });
          setTimeout(() => { this.flash(tgt, 0xffc060, 0.5, 0.12); if (Math.random() < 0.5) this.sparks(tgt, 0xffd080, 3); resolve(); }, 160);
        }, i * 60);
      }));
    }
    await Promise.all(ps);
  }

  // 主砲の砲弾
  async shell(from, to, color = 0xffb040) {
    this.flash(from, 0xffffff, 1.4, 0.15);
    this.smoke(from, 0.8, 0.8, 0x888888);
    const s = this.sprite(color, 0.5);
    const start = from.clone();
    await tween(0.22, (k) => { s.position.lerpVectors(start, to, k); s.position.y += Math.sin(k * Math.PI) * 0.3; }, Ease.linear);
    this.scene.remove(s);
  }

  // ミサイル（煙をひいて曲がりながら飛ぶ）
  async missile(from, to, delay = 0) {
    if (delay) await tween(delay, () => {});
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 6), new THREE.MeshStandardMaterial({ color: 0xdddddd, emissive: 0x442200 }));
    this.scene.add(m);
    const glow = this.sprite(0xffa040, 0.4);
    const ctrl = from.clone().lerp(to, 0.5).add(new THREE.Vector3(rand(-2, 2), rand(2, 3.5), rand(-1, 1)));
    const pt = new THREE.Vector3(), prev = from.clone();
    let lastSmoke = 0;
    await tween(0.6 + rand(0, 0.15), (k) => {
      const a = from.clone().lerp(ctrl, k), b = ctrl.clone().lerp(to, k);
      pt.copy(a.lerp(b, k));
      m.position.copy(pt);
      const dir = pt.clone().sub(prev);
      if (dir.lengthSq() > 1e-6) { m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); }
      prev.copy(pt);
      glow.position.copy(pt);
      if (k - lastSmoke > 0.04) { lastSmoke = k; this.smoke(pt.clone(), 0.35, 0.7, 0xaaaaaa); }
    }, Ease.in);
    this.scene.remove(m, glow);
    m.geometry.dispose();
  }

  // ビーム（レールガン・レーザー・コアビーム）
  async beam(from, to, color = 0x6af0ff, width = 0.14, life = 0.45) {
    const len = from.distanceTo(to);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(width, width, len, 8, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(from).lerp(to, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    this.scene.add(m);
    this.flash(from, color, 1.5, 0.3);
    this.particle(m, life, (p, k) => { m.scale.x = m.scale.z = 1 + Math.sin(k * Math.PI) * 1.5; m.material.opacity = 1 - k; });
    await tween(0.08, () => {});
    this.flash(to, color, 2.2, 0.4);
    this.sparks(to, color, 12);
  }

  // 火炎放射
  async flame(from, to) {
    for (let i = 0; i < 26; i++) {
      const s = this.sprite(i % 3 ? 0xff6a10 : 0xffd040, 0.4);
      s.position.copy(from);
      const tgt = to.clone().add(new THREE.Vector3(rand(-0.6, 0.6), rand(-0.3, 0.6), rand(-0.6, 0.6)));
      const st = from.clone();
      this.particle(s, 0.5, (p, k) => { s.position.lerpVectors(st, tgt, k); s.scale.setScalar(0.4 + k * 1.4); s.material.opacity = 1 - k * 0.8; });
      await tween(0.025, () => {});
    }
    this.smoke(to, 1.2, 1.2, 0x333333);
  }

  // 電磁パルス・電気
  async emp(from, to) {
    await this.beam(from, to, 0x7aa0ff, 0.06, 0.3);
    this.ring(to, 0x7aa0ff, 2.5, 0.5);
    this.sparks(to, 0xaaccff, 14);
  }

  claw(pos, color = 0xffffff) {
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1.2), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.copy(pos).add(new THREE.Vector3((i - 1) * 0.25, 0, 0.3));
      m.rotation.z = 0.6;
      m.lookAt(this.camera.position);
      m.rotateZ(0.7);
      this.scene.add(m);
      this.particle(m, 0.3, (p, k) => { m.material.opacity = 1 - k; m.scale.y = 0.5 + k; });
    }
  }

  // ダメージの数字（画面上に出す）
  number(pos, text, cls = '') {
    const v = pos.clone().project(this.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth, y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    const el = document.createElement('div');
    el.className = `dmg ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    this.numLayer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }
}
