// 第5章「光」と第6章「闇」の空と景色（v1.1〜。クライマックスへ向かう雰囲気）
//  光＝「天上の聖域」：群青から金色へ移る黄昏の空、天に浮かぶ巨大な光の輪（星の門）と輝く星、
//      大地から天へ伸びる光の柱、宙に浮いて回る水晶のかけら、天へ昇っていく光の粒
//  闇＝「終焉の夜」：血のように赤い地平線、黒い太陽と赤いコロナ（日食）、地平線の巨大な触手の影、
//      赤い稲妻（画面が光り、雷が地面に落ちる）、降りしきる灰と舞い上がる赤い火の粉、地面の赤く光る裂け目
//  虹＝第7章「虹の深淵」（v1.2〜）：マザーコアが6つの星の光を吸い込み、世界じゅうが虹色に燃える最終決戦の地。
//      宇宙色の空にゆらめく虹のオーロラ、天の「マザーコアの眼」と七色の環、流れ星、七色の光の柱と水晶、
//      地面の七色の紋章、ときどき広がる虹の衝撃波、色が移り変わる光
// world.js（フィールド・町・ダンジョン）と battle.js（戦闘の背景）が使う。数字はこのファイルの LOOK に集める
import * as THREE from 'three';
import { TILES } from '../data/tiles.js';
import { heightAt } from '../core/map-renderer.js';

export const CLIMAX = new Set(['light', 'dark', 'core']);

const LOOK = {
  light: {
    sky: [[0, 0xffe0a0], [0.18, 0xf8b880], [0.42, 0x9a7ad8], [1, 0x14205a]], // 地平線→天頂
    pillar: 0xffe8a0, glyph: 0xd88a10, crystal: 0xbfe8ff, mote: 0xfff2b0, mote2: 0xa8d8ff,
  },
  dark: {
    sky: [[0, 0x8a0a1a], [0.12, 0x4a0614], [0.35, 0x1a0412], [1, 0x030106]],
    corona: 0xff2a3a, bolt: 0xffb0c0, ash: 0x8a7a80, ember: 0xff3a2a, crack: 0xff2a40,
  },
  core: {
    sky: [[0, 0xff8ad8], [0.14, 0x9a5aff], [0.38, 0x2a1a8a], [1, 0x05021a]],
    hueSpeed: 0.06, // 色が移り変わる速さ（1秒に何周）
  },
};
const HUE = new THREE.Color();
const hue = (h, s = 1, l = 0.6) => HUE.setHSL(((h % 1) + 1) % 1, s, l);

const rng = (x, y, s) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
const rand = (a, b) => a + Math.random() * (b - a);

let glowTex = null;
function glow() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
const add = (color, opacity = 1, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, ...extra });
const sprite = (color, size, opacity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); s.scale.setScalar(size); return s; };

// ---------------------------------------------------------------- 空（カメラについて動く大きな球）
function buildSky(biome, R) {
  const L = LOOK[biome];
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(R, 32, 20);
  const pos = geo.attributes.position, cols = [];
  const stops = L.sky.map(([k, c]) => [k, new THREE.Color(c)]);
  for (let i = 0; i < pos.count; i++) {
    const k = Math.max(0, pos.getY(i) / R);
    let c = stops[stops.length - 1][1];
    for (let j = 1; j < stops.length; j++) if (k <= stops[j][0]) { c = stops[j - 1][1].clone().lerp(stops[j][1], (k - stops[j - 1][0]) / (stops[j][0] - stops[j - 1][0])); break; }
    if (pos.getY(i) < 0) c = stops[0][1].clone().multiplyScalar(0.6);
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -10;
  group.add(dome);
  const anim = [];
  // 星
  const sg = new THREE.BufferGeometry(), sp = [];
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2, e = rand(biome === 'light' ? 0.5 : 0.15, 1.45);
    sp.push(Math.cos(a) * Math.cos(e) * R * 0.95, Math.sin(e) * R * 0.95, Math.sin(a) * Math.cos(e) * R * 0.95);
  }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  if (biome === 'core') sg.setAttribute('color', new THREE.Float32BufferAttribute(sp.map((_, i) => (i % 3 === 0 ? hue(Math.random()).r : i % 3 === 1 ? HUE.g : HUE.b)), 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: biome === 'light' ? 0xfff8e0 : biome === 'core' ? 0xffffff : 0xff9aa8, vertexColors: biome === 'core', size: R * (biome === 'core' ? 0.009 : 0.006), transparent: true, opacity: 0.9, fog: false, depthWrite: false }));
  stars.renderOrder = -9;
  group.add(stars);
  const far = R * 0.85;
  if (biome === 'light') {
    // 星の門：天に浮かぶ巨大な光の輪（3重にゆっくり回る）と、真ん中で輝く星
    const gate = new THREE.Group();
    gate.position.set(0, far * 0.55, -far * 0.8);
    gate.lookAt(0, 0, 0);
    const core = sprite(0xffffff, R * 0.22); gate.add(core);
    const halo = sprite(0xffd890, R * 0.6, 0.55); gate.add(halo);
    [[0.16, 0.006, 0xfff0c0, 0.9], [0.22, 0.004, 0xa8d8ff, 0.7], [0.3, 0.008, 0xffd070, 0.5]].forEach(([r, t, c, o], i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R * r, R * t, 6, 96), add(c, o));
      ring.rotation.x = i * 0.5; ring.rotation.y = i * 0.7;
      gate.add(ring); anim.push((tt) => { ring.rotation.z = tt * (0.05 + i * 0.03) * (i % 2 ? -1 : 1); ring.rotation.x = i * 0.5 + Math.sin(tt * 0.2 + i) * 0.15; });
    });
    // 光の筋（門から地上へ降りる）
    for (let i = 0; i < 7; i++) {
      const ray = new THREE.Mesh(new THREE.ConeGeometry(R * 0.06, far * 0.9, 12, 1, true), add(0xffe8b0, 0.08));
      ray.position.copy(gate.position).multiplyScalar(0.5);
      ray.lookAt(gate.position); ray.rotateX(Math.PI / 2);
      ray.rotateZ((i - 3) * 0.09);
      group.add(ray); anim.push((tt) => { ray.material.opacity = 0.05 + 0.04 * Math.sin(tt * 0.7 + i * 1.3); });
    }
    anim.push((tt) => { core.material.opacity = 0.85 + 0.15 * Math.sin(tt * 1.7); halo.scale.setScalar(R * (0.58 + 0.04 * Math.sin(tt * 0.9))); });
    group.add(gate);
    // 空に浮かぶ遠い遺跡の島（逆さの尖塔）
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand(-0.2, 0.2), r = far * rand(0.6, 0.9);
      const isle = new THREE.Group();
      const m = new THREE.MeshBasicMaterial({ color: 0x6a5a8a, fog: false, transparent: true, opacity: 0.85, depthWrite: false });
      const top = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.035, R * 0.03, R * 0.01, 7), m);
      const under = new THREE.Mesh(new THREE.ConeGeometry(R * 0.03, R * 0.07, 7), m); under.rotation.x = Math.PI; under.position.y = -R * 0.04;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(R * 0.006, R * 0.05, 5), m); spire.position.y = R * 0.03;
      isle.add(top, under, spire);
      const y = far * rand(0.12, 0.3);
      isle.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      group.add(isle); anim.push((tt) => { isle.position.y = y + Math.sin(tt * 0.3 + i) * R * 0.006; });
    }
  } else if (biome === 'core') {
    // 天の「マザーコアの眼」：白く燃える核と、七色に回る環
    const eye = new THREE.Group();
    eye.position.set(-far * 0.15, far * 0.5, -far * 0.82);
    eye.lookAt(0, 0, 0);
    const core = sprite(0xffffff, R * 0.2); eye.add(core);
    const halo = sprite(0xff8ad8, R * 0.7, 0.6); eye.add(halo);
    const rings = [];
    for (let i = 0; i < 7; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R * (0.12 + i * 0.025), R * 0.005, 6, 96), add(hue(i / 7).getHex(), 0.85));
      ring.rotation.set(i * 0.35, i * 0.5, 0);
      eye.add(ring); rings.push(ring);
    }
    anim.push((tt) => {
      rings.forEach((r, i) => { r.rotation.z = tt * (0.08 + i * 0.02) * (i % 2 ? -1 : 1); r.rotation.x = i * 0.35 + Math.sin(tt * 0.3 + i) * 0.25; r.material.color.copy(hue(i / 7 + tt * LOOK.core.hueSpeed)); });
      halo.material.color.copy(hue(tt * LOOK.core.hueSpeed, 1, 0.65)); halo.scale.setScalar(R * (0.65 + 0.08 * Math.sin(tt * 1.2)));
      core.scale.setScalar(R * (0.18 + 0.03 * Math.sin(tt * 2.4)));
    });
    group.add(eye);
    // 虹のオーロラ：地平線をぐるりと囲む、ゆらめく七色の幕（上へ行くほど消える）
    for (let a = 0; a < 3; a++) {
      const SEG = 72, geo2 = new THREE.PlaneGeometry(1, 1, SEG, 1);
      const p2 = geo2.attributes.position, col = [];
      const r0 = far * (0.7 + a * 0.08), h0 = far * (0.18 + a * 0.05), y0 = far * (0.05 + a * 0.06), a0 = a * 1.3, span = Math.PI * 1.3;
      const base = [];
      for (let i = 0; i < p2.count; i++) {
        const u = p2.getX(i) + 0.5, top = p2.getY(i) > 0;
        const ang = a0 + u * span;
        base.push([ang, top]);
        hue(u * 1.5 + a * 0.2, 1, top ? 0.0 : 0.55);
        col.push(HUE.r, HUE.g, HUE.b);
      }
      geo2.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const cur = new THREE.Mesh(geo2, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      cur.frustumCulled = false; group.add(cur);
      anim.push((tt) => {
        base.forEach(([ang, top], i) => {
          const w = Math.sin(ang * 3 + tt * 0.6 + a) * far * 0.04;
          p2.setXYZ(i, Math.cos(ang) * (r0 + w), y0 + (top ? h0 * (1 + 0.25 * Math.sin(ang * 5 + tt * 0.9)) : 0), Math.sin(ang) * (r0 + w));
        });
        p2.needsUpdate = true;
        cur.rotation.y = tt * 0.01 * (a % 2 ? -1 : 1);
      });
    }
    // 流れ星（七色の尾を引く）
    const shoot = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.003, 0, R * 0.12, 6), add(0xffffff, 0));
      group.add(m); shoot.push({ m, t: rand(0, 3), dur: 0 });
    }
    anim.push((tt, dt = 0.016) => {
      for (const st of shoot) {
        st.t -= dt;
        if (st.t <= 0 && !st.dur) { st.dur = 0.9; st.from = new THREE.Vector3(rand(-1, 1) * far * 0.8, far * rand(0.45, 0.8), -far * rand(0.3, 0.8)); st.dir = new THREE.Vector3(rand(-0.6, 0.6), -0.45, rand(0.1, 0.4)).normalize(); st.m.material.color.copy(hue(Math.random(), 1, 0.7)); st.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), st.dir.clone().negate()); st.life = 0; }
        if (st.dur) {
          st.life += dt; const k = st.life / st.dur;
          st.m.position.copy(st.from).addScaledVector(st.dir, far * 0.6 * k);
          st.m.material.opacity = Math.sin(Math.min(1, k) * Math.PI);
          if (k >= 1) { st.dur = 0; st.t = rand(0.5, 2.5); st.m.material.opacity = 0; }
        }
      }
    });
  } else {
    // 日食：黒い太陽と赤いコロナ
    const ecl = new THREE.Group();
    ecl.position.set(far * 0.25, far * 0.42, -far * 0.85);
    ecl.lookAt(0, 0, 0);
    const corona = sprite(LOOK.dark.corona, R * 0.42, 0.9); ecl.add(corona);
    const corona2 = sprite(0xff8a3a, R * 0.24, 0.8); ecl.add(corona2);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R * 0.075, 48), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, depthWrite: false }));
    disc.position.z = R * 0.01; disc.renderOrder = 2; ecl.add(disc);
    const rim = new THREE.Mesh(new THREE.RingGeometry(R * 0.075, R * 0.081, 64), add(0xffd0b0, 1)); rim.position.z = R * 0.011; rim.renderOrder = 3; ecl.add(rim);
    anim.push((tt) => { corona.scale.setScalar(R * (0.4 + 0.05 * Math.sin(tt * 0.8))); corona.material.rotation = tt * 0.05; corona2.material.opacity = 0.6 + 0.25 * Math.sin(tt * 1.3); });
    group.add(ecl);
    // 地平線の巨大な触手の影（マザーコアの気配）
    const tm = new THREE.MeshBasicMaterial({ color: 0x050106, fog: false, depthWrite: false });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + rand(-0.15, 0.15), r = far * rand(0.75, 0.92);
      const h = far * rand(0.16, 0.42);
      const pts = [];
      for (let k = 0; k <= 8; k++) pts.push(new THREE.Vector2(R * 0.022 * (1 - k / 8.5) + R * 0.002, (k / 8) * h));
      const t = new THREE.Mesh(new THREE.LatheGeometry(pts, 6), tm);
      t.position.set(Math.cos(a) * r, -far * 0.02, Math.sin(a) * r);
      const sway = rand(0.08, 0.2), ph = rand(0, 6);
      group.add(t); anim.push((tt) => { t.rotation.z = Math.sin(tt * 0.25 + ph) * sway; t.rotation.x = Math.cos(tt * 0.2 + ph) * sway * 0.6; });
    }
  }
  let last = 0;
  return { group, update: (tt) => { const dt = Math.min(0.1, Math.max(0, tt - last)); last = tt; anim.forEach((f) => f(tt, dt)); } };
}

// 稲妻（ギザギザの光の線）。from から to へ
function boltMesh(from, to, width) {
  const pts = [], n = 10;
  for (let i = 0; i <= n; i++) {
    const p = from.clone().lerp(to, i / n);
    if (i > 0 && i < n) { const d = from.distanceTo(to) * 0.06; p.x += rand(-d, d); p.z += rand(-d, d); }
    pts.push(p);
  }
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(width, len, width), add(LOOK.dark.bolt, 1));
    seg.position.copy(a).lerp(b, 0.5);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(seg);
  }
  return g;
}

// 舞う粒（光の粒が昇る／灰が降る／火の粉が昇る）
function particles(n, color, size, opacity) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  // color が null のときは1粒ずつ七色（虹の深淵）
  if (color == null) { const c = []; for (let i = 0; i < n; i++) { hue(i / n * 3); c.push(HUE.r, HUE.g, HUE.b); } geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glow(), color: color ?? 0xffffff, vertexColors: color == null, size, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  pts.frustumCulled = false;
  const v = Array.from({ length: n }, () => ({ life: Math.random() * 5, max: 0, ph: Math.random() * 6 }));
  return { pts, v, pos: geo.attributes.position };
}
function stepParticles(P, dt, t, cx, cz, groundY, spec) {
  const a = P.pos.array;
  P.v.forEach((u, i) => {
    u.life += dt;
    if (u.life > u.max) {
      u.life = 0; u.max = rand(spec.life[0], spec.life[1]);
      a[i * 3] = cx + rand(-spec.r, spec.r); a[i * 3 + 2] = cz + rand(-spec.r * 0.8, spec.r * 0.8);
      a[i * 3 + 1] = groundY + (spec.vy > 0 ? rand(0, 1.5) : rand(spec.top * 0.5, spec.top));
    }
    a[i * 3 + 1] += spec.vy * dt;
    a[i * 3] += (Math.sin(t * 0.9 + u.ph) * 0.4 + (spec.vx || 0)) * dt;
    a[i * 3 + 2] += Math.cos(t * 0.7 + u.ph) * 0.3 * dt;
  });
  P.pos.needsUpdate = true;
}


// ---------------------------------------------------------------- 虹の深淵（第7章）の共通の飾り
// 七色に移り変わる光（hemi の色）・虹の衝撃波（足元から広がる七色の輪）
function rainbowLight(ups, hemi, sun) {
  const base = { hemi: hemi.intensity, sun: sun.intensity };
  ups.push((dt, t) => {
    hemi.color.copy(hue(t * LOOK.core.hueSpeed, 0.55, 0.75));
    hemi.groundColor.copy(hue(t * LOOK.core.hueSpeed + 0.5, 0.7, 0.35));
    sun.color.copy(hue(t * LOOK.core.hueSpeed + 0.15, 0.4, 0.85));
    hemi.intensity = base.hemi * (1 + 0.08 * Math.sin(t * 1.7));
  });
}
function rainbowWaves(root, ups, getCenter, every = [5, 8], maxR = 22) {
  const geo = new THREE.RingGeometry(0.92, 1, 64);
  const rings = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(geo, add(hue(i / 7).getHex(), 0)); m.rotation.x = -Math.PI / 2; root.add(m); return m; });
  let next = rand(1.5, 3), life = -1, cx = 0, cz = 0, cy = 0;
  ups.push((dt, t) => {
    next -= dt;
    if (next <= 0) { next = rand(every[0], every[1]); life = 0; [cx, cy, cz] = getCenter(); }
    if (life < 0) return;
    life += dt;
    const k = life / 2.2;
    rings.forEach((m, i) => {
      const r = Math.max(0.1, (k - i * 0.03) * maxR);
      m.position.set(cx, cy + 0.06 + i * 0.004, cz); m.scale.setScalar(r);
      m.material.opacity = k < 1 ? (1 - k) * 0.85 : 0;
      m.material.color.copy(hue(i / 7 + t * LOOK.core.hueSpeed));
    });
    if (k >= 1) life = -1;
  });
}
// 七色に光る InstancedMesh（色を少しずつ回す）
function cycleColors(im, n, ph, ups, l = 0.6) {
  for (let i = 0; i < n; i++) im.setColorAt(i, hue(ph[i]));
  ups.push((dt, t) => { for (let i = 0; i < n; i++) im.setColorAt(i, hue(ph[i] + t * LOOK.core.hueSpeed * 2, 1, l)); im.instanceColor.needsUpdate = true; });
}

// ---------------------------------------------------------------- フィールド・町・ダンジョン
// lights: { hemi, sun, scene } 稲妻で一瞬明るくする
export function addClimaxWorld(scene, map, { indoor, dark, hemi, sun }) {
  const biome = map.biome;
  if (!CLIMAX.has(biome) || indoor) return null;
  const L = LOOK[biome];
  const root = new THREE.Group(); scene.add(root);
  const ups = [];
  const outdoor = !dark;
  // 空（屋外だけ）
  let sky = null;
  if (outdoor) { sky = buildSky(biome, 200); root.add(sky.group); scene.background = null; }
  // 置く場所：歩ける地面（道・建物・入口は避ける）
  const W = map.width, H = map.height;
  const walk = (x, y) => { const t = TILES[map.grid[y]?.[x]]; return !!t?.walk && !t.step && ![5, 6, 7].includes(map.grid[y][x]); };
  const spots = (every, seed) => {
    const out = [];
    for (let y = 2; y < H - 2; y += every) for (let x = 2; x < W - 2; x += every) {
      const xx = x + Math.floor(rng(x, y, seed) * every), yy = y + Math.floor(rng(y, x, seed + 1) * every);
      if (xx < W && yy < H && walk(xx, yy) && rng(xx, yy, seed + 2) < 0.7) out.push([xx + 0.5, yy + 0.5]);
    }
    return out;
  };
  const town = map.type === 'town';
  const dummy = new THREE.Object3D();
  if (biome === 'light') {
    // 大地から天へ伸びる光の柱（足元に光の輪）
    const ps = outdoor ? spots(town ? 16 : 11, 3) : [];
    if (ps.length) {
      const pill = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.34, 46, 10, 1, true), add(L.pillar, 0.14), ps.length);
      const pill2 = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 46, 6, 1, true), add(0xffffff, 0.5), ps.length);
      const ring = new THREE.InstancedMesh(new THREE.RingGeometry(0.55, 1.05, 24), add(L.pillar, 0.5), ps.length);
      ps.forEach(([x, z], i) => {
        const y = heightAt(map, x, z);
        dummy.position.set(x, y + 23, z); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); pill.setMatrixAt(i, dummy.matrix); pill2.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, y + 0.04, z); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.updateMatrix(); ring.setMatrixAt(i, dummy.matrix);
      });
      for (const m of [pill, pill2, ring]) { m.frustumCulled = false; root.add(m); }
      ups.push((dt, t) => { pill.material.opacity = 0.1 + 0.05 * Math.sin(t * 1.3); pill2.material.opacity = 0.35 + 0.2 * Math.sin(t * 2.1); ring.material.opacity = 0.35 + 0.2 * Math.sin(t * 2.6); });
    }
    // 地面に光る紋章（金の二重の輪と六角形）。上から見てもわかる
    const gs = outdoor ? spots(town ? 12 : 8, 31) : spots(7, 31);
    if (gs.length) {
      const mk = (geo, op) => { const m = new THREE.InstancedMesh(geo, add(L.glyph, op), gs.length); m.frustumCulled = false; root.add(m); return m; };
      const g1 = mk(new THREE.RingGeometry(1.05, 1.17, 40), 0.7), g2 = mk(new THREE.RingGeometry(0.82, 0.86, 40), 0.6), g3 = mk(new THREE.RingGeometry(0.5, 0.6, 6), 0.8);
      gs.forEach(([x, z], i) => {
        dummy.position.set(x, heightAt(map, x, z) + 0.035, z); dummy.rotation.set(-Math.PI / 2, 0, rng(x, z, 9) * 6); dummy.scale.setScalar(0.6 + rng(z, x, 8) * 0.5); dummy.updateMatrix();
        for (const m of [g1, g2, g3]) m.setMatrixAt(i, dummy.matrix);
      });
      dummy.scale.setScalar(1);
      ups.push((dt, t) => { g1.material.opacity = 0.45 + 0.3 * Math.sin(t * 1.5); g3.material.opacity = 0.5 + 0.35 * Math.sin(t * 1.5 + 1.5); });
    }
    // 宙に浮いて回る水晶のかけら
    const cs = spots(town ? 10 : 7, 11);
    if (cs.length) {
      const cr = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: L.crystal, emissive: L.crystal, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, flatShading: true }), cs.length);
      cr.frustumCulled = false; root.add(cr);
      const base = cs.map(([x, z], i) => ({ x, z, y: heightAt(map, x, z) + 1.6 + rng(x, z, 5) * 2.2, ph: i * 1.7, s: 0.7 + rng(z, x, 6) * 1.1 }));
      ups.push((dt, t) => {
        base.forEach((b, i) => {
          dummy.position.set(b.x, b.y + Math.sin(t * 0.9 + b.ph) * 0.3, b.z);
          dummy.rotation.set(0.4, t * 0.8 + b.ph, 0.2); dummy.scale.set(b.s, b.s * 1.8, b.s); dummy.updateMatrix(); cr.setMatrixAt(i, dummy.matrix);
        });
        cr.instanceMatrix.needsUpdate = true;
      });
    }
    // 天へ昇る光の粒（金と青）
    const P1 = particles(140, L.mote, 0.32, 0.9), P2 = particles(60, L.mote2, 0.24, 0.8);
    root.add(P1.pts, P2.pts);
    ups.push((dt, t, p, gy) => { stepParticles(P1, dt, t, p.x, p.y, gy, { r: 12, life: [3, 6], vy: 1.4, top: 6 }); stepParticles(P2, dt, t, p.x, p.y, gy, { r: 10, life: [3, 5], vy: 2.2, top: 6 }); });
  } else if (biome === 'core') {
    rainbowLight(ups, hemi, sun);
    // 七色の光の柱（ダンジョンの中は低め）
    const ps = spots(town ? 14 : outdoor ? 9 : 10, 3);
    if (ps.length) {
      const H2 = outdoor ? 50 : 6;
      const pill = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.38, H2, 10, 1, true), add(0xffffff, 0.22), ps.length);
      const ring = new THREE.InstancedMesh(new THREE.RingGeometry(0.5, 1.0, 24), add(0xffffff, 0.6), ps.length);
      ps.forEach(([x, z], i) => {
        const y = heightAt(map, x, z);
        dummy.position.set(x, y + H2 / 2, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); pill.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, y + 0.05, z); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.updateMatrix(); ring.setMatrixAt(i, dummy.matrix);
      });
      const ph = ps.map(([x, z]) => (x + z) / 40);
      cycleColors(pill, ps.length, ph, ups); cycleColors(ring, ps.length, ph, ups);
      for (const m of [pill, ring]) { m.frustumCulled = false; root.add(m); }
      ups.push((dt, t) => { pill.material.opacity = 0.16 + 0.08 * Math.sin(t * 1.5); });
    }
    // 地面の七色の紋章（二重の輪と六角形）
    const gs = spots(town ? 11 : 7, 31);
    if (gs.length) {
      const mk = (geo) => { const m = new THREE.InstancedMesh(geo, add(0xffffff, 0.9, { blending: THREE.NormalBlending }), gs.length); m.frustumCulled = false; root.add(m); return m; };
      const g1 = mk(new THREE.RingGeometry(1.05, 1.17, 40)), g2 = mk(new THREE.RingGeometry(0.82, 0.86, 40)), g3 = mk(new THREE.RingGeometry(0.5, 0.6, 6));
      gs.forEach(([x, z], i) => {
        dummy.position.set(x, heightAt(map, x, z) + 0.035, z); dummy.rotation.set(-Math.PI / 2, 0, rng(x, z, 9) * 6); dummy.scale.setScalar(0.6 + rng(z, x, 8) * 0.5); dummy.updateMatrix();
        for (const m of [g1, g2, g3]) m.setMatrixAt(i, dummy.matrix);
      });
      dummy.scale.setScalar(1);
      const ph = gs.map(([x, z]) => (x - z) / 30);
      cycleColors(g1, gs.length, ph, ups); cycleColors(g2, gs.length, ph.map((v) => v + 0.33), ups); cycleColors(g3, gs.length, ph.map((v) => v + 0.66), ups);
    }
    // 宙に浮いて回るプリズムの水晶
    const cs = spots(town ? 9 : 6, 11);
    if (cs.length) {
      const cr = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6a6a6a, transparent: true, opacity: 0.9, flatShading: true }), cs.length);
      cr.frustumCulled = false; root.add(cr);
      const base = cs.map(([x, z], i) => ({ x, z, y: heightAt(map, x, z) + 1.4 + rng(x, z, 5) * (outdoor ? 2.6 : 1.2), ph: i * 1.7, s: 0.7 + rng(z, x, 6) * 1.1 }));
      cycleColors(cr, cs.length, base.map((b) => b.ph / 7), ups, 0.65);
      ups.push((dt, t) => {
        base.forEach((b, i) => {
          dummy.position.set(b.x, b.y + Math.sin(t * 1.1 + b.ph) * 0.35, b.z);
          dummy.rotation.set(0.4, t * 1.1 + b.ph, 0.2); dummy.scale.set(b.s, b.s * 1.8, b.s); dummy.updateMatrix(); cr.setMatrixAt(i, dummy.matrix);
        });
        cr.instanceMatrix.needsUpdate = true;
      });
    }
    // 七色の光の粒（らせんを描いて昇る）
    const P1 = particles(220, null, 0.34, 0.95);
    root.add(P1.pts);
    ups.push((dt, t, p, gy) => stepParticles(P1, dt, t, p.x, p.y, gy, { r: 12, life: [3, 6], vy: 1.6, top: 6 }));
    // 虹の衝撃波（ときどき足元から七色の輪が広がる）
    let pl = null;
    rainbowWaves(root, ups, () => [pl.x, heightAt(map, pl.x, pl.y), pl.y], [5, 9], outdoor ? 24 : 12);
    ups.unshift((dt, t, p) => { pl = p; });
  } else {
    // 地面の赤く光る裂け目
    const ks = spots(town ? 9 : 6, 21);
    if (ks.length) {
      const ck = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.09), new THREE.MeshBasicMaterial({ color: L.crack, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), ks.length * 3);
      let n = 0;
      ks.forEach(([x, z]) => {
        let a = rng(x, z, 1) * Math.PI, px = x, pz = z;
        for (let k = 0; k < 3; k++) {
          const len = 0.6 + rng(x + k, z, 2) * 0.9;
          dummy.position.set(px + Math.cos(a) * len / 2, heightAt(map, px, pz) + 0.03, pz + Math.sin(a) * len / 2);
          dummy.rotation.set(-Math.PI / 2, 0, -a); dummy.scale.set(len, 1 + rng(z, x + k, 3), 1); dummy.updateMatrix();
          ck.setMatrixAt(n++, dummy.matrix);
          px += Math.cos(a) * len; pz += Math.sin(a) * len; a += (rng(x, z + k, 4) - 0.5) * 1.6;
        }
      });
      ck.frustumCulled = false; root.add(ck);
      ups.push((dt, t) => { ck.material.opacity = 0.55 + 0.35 * Math.sin(t * 1.8); });
    }
    // 降る灰と舞い上がる火の粉
    const ash = particles(170, L.ash, 0.16, 0.7), emb = particles(70, L.ember, 0.22, 0.95);
    ash.pts.material.blending = THREE.NormalBlending;
    root.add(ash.pts, emb.pts);
    ups.push((dt, t, p, gy) => { stepParticles(ash, dt, t, p.x, p.y, gy, { r: 12, life: [3, 6], vy: -1.1, vx: 0.6, top: 7 }); stepParticles(emb, dt, t, p.x, p.y, gy, { r: 10, life: [2, 4], vy: 1.6, top: 4 }); });
    // 赤い稲妻：ときどき空が光り、雷が近くの地面に落ちる（ダンジョンの中は遠くで光るだけ）
    const flash = new THREE.PointLight(0xff4a6a, 0, 40, 1.2); root.add(flash);
    const base = { hemi: hemi.intensity, hemiC: hemi.color.clone(), sun: sun.intensity, bg: scene.background?.clone?.(), fog: scene.fog?.color.clone() };
    const flashCol = new THREE.Color(0xff6a8a);
    let next = rand(2, 5), f = 0, bolt = null, boltLife = 0, scorch = null;
    ups.push((dt, t, p, gy, cam) => {
      next -= dt;
      if (next <= 0) {
        next = rand(4, 9); f = 1;
        if (outdoor) {
          const a = rand(0, Math.PI * 2), r = rand(7, 16);
          const gx = p.x + Math.cos(a) * r, gz = p.y + Math.sin(a) * r * 0.7 - 3;
          const g = heightAt(map, gx, gz);
          if (bolt) { root.remove(bolt); bolt.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); }
          bolt = boltMesh(new THREE.Vector3(gx + rand(-4, 4), g + 40, gz - 6), new THREE.Vector3(gx, g, gz), 0.18);
          root.add(bolt); boltLife = 0.35;
          flash.position.set(gx, g + 4, gz);
          if (!scorch) { scorch = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20), add(0xff3a4a, 0)); scorch.rotation.x = -Math.PI / 2; root.add(scorch); }
          scorch.position.set(gx, g + 0.05, gz); scorch.material.opacity = 0.9;
        }
      }
      if (f > 0) {
        f = Math.max(0, f - dt * 3.2);
        const k = f > 0.6 ? 1 : f > 0.4 ? 0.2 : f > 0.2 ? 0.8 : f; // 2回ぴかっと光る
        hemi.intensity = base.hemi + k * (outdoor ? 1.6 : 0.6); hemi.color.copy(base.hemiC).lerp(flashCol, k * 0.6);
        sun.intensity = base.sun + k * (outdoor ? 1.2 : 0.3);
        flash.intensity = outdoor ? k * 120 : 0;
        if (base.fog && scene.fog) scene.fog.color.copy(base.fog).lerp(flashCol, k * (outdoor ? 0.35 : 0.15));
        if (base.bg && scene.background?.isColor) scene.background.copy(base.bg).lerp(flashCol, k * 0.25);
      }
      if (bolt) { boltLife -= dt; bolt.visible = boltLife > 0 && (boltLife > 0.2 || boltLife % 0.1 > 0.05); if (boltLife <= 0) { root.remove(bolt); bolt.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); bolt = null; } }
      if (scorch) scorch.material.opacity = Math.max(0, scorch.material.opacity - dt * 0.4);
    });
  }
  return {
    update(dt, t, p, camera) {
      if (sky) { sky.group.position.copy(camera.position); sky.update(t); }
      const gy = heightAt(map, p.x, p.y);
      for (const f of ups) f(dt, t, p, gy, camera);
    },
  };
}

// ---------------------------------------------------------------- 戦闘の背景
export function addClimaxBattle(scene, biome, { indoor, hemi, sun }) {
  if (!CLIMAX.has(biome)) return null;
  const L = LOOK[biome];
  const root = new THREE.Group(); scene.add(root);
  const ups = [];
  const sky = indoor ? null : buildSky(biome, 140);
  if (sky) root.add(sky.group);
  if (biome === 'light') {
    if (!indoor) for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2, r = rand(20, 34);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 70, 10, 1, true), add(L.pillar, 0.1));
      p.position.set(Math.cos(a) * r, 35, Math.sin(a) * r); root.add(p);
      ups.push((dt, t) => { p.material.opacity = 0.07 + 0.04 * Math.sin(t * 1.2 + i); });
    }
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2), r = rand(9, 18), y = rand(2, 7), s = rand(0.4, 1.0);
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), new THREE.MeshStandardMaterial({ color: L.crystal, emissive: L.crystal, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, flatShading: true }));
      c.scale.y = 1.8; c.position.set(Math.cos(a) * r, y, Math.sin(a) * r); root.add(c);
      ups.push((dt, t) => { c.rotation.y = t * 0.7 + i; c.position.y = y + Math.sin(t + i) * 0.4; });
    }
    const P = particles(160, L.mote, 0.4, 0.9); root.add(P.pts);
    ups.push((dt, t) => stepParticles(P, dt, t, 0, 0, 0, { r: 16, life: [3, 6], vy: 1.6, top: 8 }));
  } else if (biome === 'core') {
    rainbowLight(ups, hemi, sun);
    const pills = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.2, r = rand(18, 30);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 80, 10, 1, true), add(0xffffff, 0.18));
      p.position.set(Math.cos(a) * r, 40, Math.sin(a) * r); root.add(p); pills.push(p);
    }
    ups.push((dt, t) => pills.forEach((p, i) => { p.material.color.copy(hue(i / 14 + t * LOOK.core.hueSpeed * 2)); p.material.opacity = 0.13 + 0.07 * Math.sin(t * 1.4 + i); }));
    for (let i = 0; i < 20; i++) {
      const a = rand(0, Math.PI * 2), r = rand(9, 18), y = rand(2, 8), s2 = rand(0.4, 1.1);
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(s2, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5, transparent: true, opacity: 0.9, flatShading: true }));
      c.scale.y = 1.8; c.position.set(Math.cos(a) * r, y, Math.sin(a) * r); root.add(c);
      ups.push((dt, t) => { c.rotation.y = t * 0.9 + i; c.position.y = y + Math.sin(t + i) * 0.5; hue(i / 20 + t * LOOK.core.hueSpeed * 2, 1, 0.6); c.material.color.copy(HUE); c.material.emissive.copy(HUE); });
    }
    const P = particles(240, null, 0.45, 0.95); root.add(P.pts);
    ups.push((dt, t) => stepParticles(P, dt, t, 0, 0, 0, { r: 16, life: [3, 6], vy: 1.8, top: 8 }));
    rainbowWaves(root, ups, () => [0, 0, 0], [4, 7], 30);
  } else {
    const ash = particles(200, L.ash, 0.2, 0.7), emb = particles(80, L.ember, 0.26, 0.95);
    ash.pts.material.blending = THREE.NormalBlending;
    root.add(ash.pts, emb.pts);
    ups.push((dt, t) => { stepParticles(ash, dt, t, 0, 0, 0, { r: 16, life: [3, 6], vy: -1.2, vx: 0.7, top: 10 }); stepParticles(emb, dt, t, 0, 0, 0, { r: 14, life: [2, 4], vy: 1.8, top: 4 }); });
    const base = { hemi: hemi.intensity, sun: sun.intensity };
    let next = rand(2, 4), f = 0, bolt = null, life = 0;
    ups.push((dt) => {
      next -= dt;
      if (next <= 0) {
        next = rand(4, 8); f = 1;
        if (!indoor) {
          const a = rand(-2.4, -0.7), r = rand(40, 70);
          const to = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
          if (bolt) { root.remove(bolt); bolt.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); }
          bolt = boltMesh(to.clone().add(new THREE.Vector3(rand(-10, 10), 70, 0)), to, 0.7); root.add(bolt); life = 0.35;
        }
      }
      if (f > 0) { f = Math.max(0, f - dt * 3.2); const k = f > 0.6 ? 1 : f > 0.4 ? 0.2 : f > 0.2 ? 0.8 : f; hemi.intensity = base.hemi + k * 1.4; sun.intensity = base.sun + k; }
      if (bolt) { life -= dt; bolt.visible = life > 0; if (life <= 0) { root.remove(bolt); bolt.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); bolt = null; } }
    });
  }
  return {
    update(dt, t, camera) {
      if (sky) { sky.group.position.copy(camera.position); sky.update(t); }
      for (const f of ups) f(dt, t);
    },
  };
}
