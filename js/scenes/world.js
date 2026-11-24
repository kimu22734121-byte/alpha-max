// フィールド探索（町・荒野・ダンジョン）。2Dタイルの地面＋3Dのキャラ・マシン・敵
import * as THREE from 'three';
import { engine } from '../core/engine.js';
import { input } from '../core/input.js';
import { ui, esc } from '../core/ui.js';
import { hud } from '../core/hud.js';
import { audio } from '../core/audio.js';
import { tween, Ease, wait, randInt } from '../core/tween.js';
import { getModel, disposeObject } from '../core/assets.js';
import { createMapView } from '../core/map-renderer.js';
import { buildMachineModel, animateMachine, animateChar, animateEnemy } from '../models/mech.js';
import { MAPS } from '../data/maps.js';
import { TILES, tileAt, isWalkable } from '../data/tiles.js';
import { CHARACTERS } from '../data/characters.js';
import { MACHINES } from '../data/machines.js';
import { ENEMIES, BOUNTIES } from '../data/enemies.js';
import {
  G, partyMembers, machineStats, machineName, canPilot, machinesOnMap, hiddenMachinesOnMap, weaponByUid,
} from '../game/state.js';
import { flow } from '../game/flow.js';
import { openFacility, openFieldMenu, autosave, settings } from './menus.js';

const MACHINE_SCALE = 0.72;
const CHAR_SCALE = 0.9;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function machineSpec(mc) {
  return {
    parts: mc.parts,
    colors: MACHINES[mc.id].colors,
    weapons: mc.slots.map((uid) => (uid ? weaponByUid(uid) : null)),
    glow: mc.id === 'alpha' ? MACHINES.alpha.seal[G.seal].glow : undefined,
  };
}
export const inMachine = (m) => !!(m.machine && G.machines[m.machine]?.loc.type === 'party');

export class WorldScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
    this.raycaster = new THREE.Raycaster();
    this.busy = false;
    this.t = 0;
    input.on('action', () => { if (this.active && !this.busy && !ui.busy) this.onAction(); });
    input.on('menu', () => { if (this.active && !this.busy && !ui.busy) this.onMenu(); });
    input.on('tap', (p) => { if (this.active && !this.busy && !ui.busy) this.onTap(p); });
  }

  get map() { return MAPS[G.pos.map]; }

  async enter(opts = {}) {
    this.active = true;
    this.build();
    hud.show();
    audio.playSong(this.map.bgm);
    this.lock(true);
    await ui.fade(false, 0.45);
    if (opts.banner) ui.banner(esc(this.map.name), esc(this.map.subtitle || ''));
    if (opts.after) await opts.after(this);
    if (this.active) this.lock(false);
    hud.update(true);
  }

  async exit() {
    this.active = false;
    input.setEnabled(false);
    hud.hide();
  }

  lock(v) {
    this.busy = v;
    input.setEnabled(!v);
  }

  // ---------------------------------------------------------------- 組み立て
  clear() {
    for (const o of [...this.scene.children]) { this.scene.remove(o); disposeObject(o); }
    this.mapView?.dispose();
  }

  build() {
    this.clear();
    const map = this.map;
    const dark = !!map.dark;
    this.scene.background = new THREE.Color(dark ? 0x101014 : 0x2a2018);
    this.scene.fog = new THREE.Fog(dark ? 0x101014 : (map.type === 'town' ? 0x4a4640 : 0xb89868), 22, 46);
    const hemi = new THREE.HemisphereLight(dark ? 0x8a90a8 : 0xfff2dc, dark ? 0x201820 : 0x6a5038, dark ? 0.55 : 1.0);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(dark ? 0xb0b8ff : 0xfff0d0, dark ? 0.5 : 1.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0015;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    if (dark) {
      this.lamp = new THREE.PointLight(0xffd8a0, 18, 9, 1.6);
      this.scene.add(this.lamp);
    } else this.lamp = null;

    this.mapView = createMapView(map, settings.mapMode, engine.renderer);
    this.scene.add(this.mapView.group);

    // 町の上にドームの骨組み（雰囲気用）
    // （ドームの骨組みは視界をさえぎるので表示しない。addDome は今後の3Dマップ用に残す）

    // NPC
    this.npcs = (map.npcs || []).map((n) => {
      const obj = getModel(n.model, n.colors || {});
      obj.scale.setScalar(CHAR_SCALE);
      obj.position.set(n.x + 0.5, 0, n.y + 0.5);
      obj.rotation.y = 0;
      obj.userData.entity = { kind: 'npc', data: n };
      this.scene.add(obj);
      return { data: n, obj, x: n.x + 0.5, z: n.y + 0.5 };
    });

    // 賞金首のシンボル
    this.symbols = (map.symbols || []).filter((s) => !G.bounties[s.bounty]).map((s) => {
      const def = ENEMIES[s.enemies[0][0]];
      const obj = getModel(s.model, def.colors || {});
      obj.scale.setScalar(s.scale || 0.5);
      obj.position.set(s.x + 0.5, 0, s.y + 0.5);
      obj.rotation.y = Math.PI * 0.15;
      obj.userData.entity = { kind: 'symbol', data: s };
      this.scene.add(obj);
      // 足元の赤いマーカー
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 24), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.6 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(s.x + 0.5, 0.02, s.y + 0.5);
      this.scene.add(ring);
      return { data: s, obj, ring, x: s.x + 0.5, z: s.y + 0.5 };
    });

    // 停めてあるマシン・まだ見つけていないマシン
    this.parked = [];
    for (const mc of [...machinesOnMap(map.id), ...hiddenMachinesOnMap(map.id)]) this.addParked(mc);

    // パーティ（先頭＋ついてくる仲間）
    this.buildParty();
    this.trail = [];
    const p = G.pos;
    for (let i = 0; i < 80; i++) this.trail.push({ x: p.x - Math.sin(p.dir || 0) * i * 0.05, z: p.y - Math.cos(p.dir || 0) * i * 0.05 });
    this.updateFollowers(0, true);
    this.lastTile = `${Math.floor(p.x)},${Math.floor(p.y)}`;
    this.updateCamera(1);
  }

  addDome(map) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x6a8aa8, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.35 });
    const g = new THREE.Group();
    const R = map.width * 0.62;
    for (let i = 0; i < 6; i++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 4, 40, Math.PI), mat);
      arc.rotation.y = (i / 6) * Math.PI;
      g.add(arc);
    }
    g.position.set(map.width / 2, -2, map.height / 2);
    g.scale.set(1, 0.55, map.height / map.width + 0.15);
    this.scene.add(g);
  }

  makeAvatar(m) {
    if (inMachine(m)) {
      const mc = G.machines[m.machine];
      const obj = buildMachineModel(machineSpec(mc));
      obj.scale.setScalar(MACHINE_SCALE);
      obj.userData.entity = { kind: 'myMachine', mc, member: m };
      return { member: m, obj, kind: 'machine', mc };
    }
    const obj = getModel(CHARACTERS[m.id].model);
    obj.scale.setScalar(CHAR_SCALE);
    obj.userData.entity = { kind: 'member', member: m };
    return { member: m, obj, kind: 'char' };
  }

  buildParty() {
    for (const a of this.avatars || []) { this.scene.remove(a.obj); }
    this.avatars = partyMembers().map((m) => this.makeAvatar(m));
    const p = G.pos;
    for (const a of this.avatars) {
      a.obj.position.set(p.x, 0, p.y);
      a.obj.rotation.y = p.dir || 0;
      this.scene.add(a.obj);
    }
  }

  addParked(mc) {
    const obj = buildMachineModel(machineSpec(mc));
    obj.scale.setScalar(MACHINE_SCALE);
    obj.position.set(mc.loc.x, 0, mc.loc.y);
    obj.rotation.y = mc.loc.dir || 0;
    obj.userData.entity = { kind: mc.owned ? 'parked' : 'hiddenMachine', mc };
    if (!mc.owned) obj.traverse((o) => { if (o.isMesh) { o.material.color.multiplyScalar(0.55); } });
    this.scene.add(obj);
    this.parked.push({ mc, obj });
  }

  // ---------------------------------------------------------------- 毎フレーム
  update(dt) {
    this.t += dt;
    const t = this.t;
    if (!this.avatars) return;
    const lead = this.avatars[0];
    let moving = 0;
    if (!this.busy && !ui.busy) {
      const mv = input.getMove();
      const mag = Math.hypot(mv.x, mv.y);
      if (mag > 0.05) {
        const speed = (lead.kind === 'machine' ? 4.4 : 3.6) * Math.min(1, mag * 1.2);
        const dx = mv.x * speed * dt / Math.max(mag, 1), dz = mv.y * speed * dt / Math.max(mag, 1);
        const r = lead.kind === 'machine' ? 0.4 : 0.26;
        const p = G.pos;
        let nx = p.x + dx, ny = p.y;
        if (this.canStand(nx, ny, r)) p.x = nx;
        nx = p.x; ny = p.y + dz;
        if (this.canStand(nx, ny, r)) p.y = ny;
        const target = Math.atan2(mv.x, mv.y);
        p.dir = target;
        moving = Math.min(1, mag * 1.3);
        const last = this.trail[0];
        if (Math.hypot(p.x - last.x, p.y - last.z) > 0.05) {
          this.trail.unshift({ x: p.x, z: p.y });
          if (this.trail.length > 200) this.trail.pop();
        }
        this.checkTile();
      }
    }
    // 先頭の見た目
    const p = G.pos;
    lead.obj.position.x = p.x; lead.obj.position.z = p.y;
    lead.obj.rotation.y = turnTo(lead.obj.rotation.y, p.dir || 0, dt * 12);
    this.animAvatar(lead, t, moving);
    this.updateFollowers(dt, false, moving);
    // NPC・シンボル
    for (const n of this.npcs) animateChar(n.obj, t + n.x, 0);
    for (const s of this.symbols) {
      animateEnemy(s.obj, t);
      const fly = s.obj.userData.flying;
      s.obj.position.y = fly ? 0.6 + Math.sin(t * 2) * 0.15 : 0;
      s.obj.rotation.y = Math.PI * 0.15 + Math.sin(t * 0.6) * 0.4;
      s.ring.material.opacity = 0.35 + Math.sin(t * 4) * 0.25;
    }
    for (const pk of this.parked) animateMachine(pk.obj, t, 0);
    this.updateCamera(dt);
    if (Math.floor(t * 4) !== this.hudTick) { this.hudTick = Math.floor(t * 4); hud.update(); this.updateActionLabel(); }
    // 賞金首にぶつかったら
    if (!this.busy && !ui.busy) {
      for (const s of this.symbols) {
        if (Math.hypot(s.x - p.x, s.z - p.y) < 1.1) { this.challengeSymbol(s); break; }
      }
    }
  }

  animAvatar(a, t, moving) {
    if (a.kind === 'machine') animateMachine(a.obj, t, moving);
    else animateChar(a.obj, t, moving);
  }

  updateFollowers(dt, snap = false, moving = 0) {
    let dist = 0;
    for (let i = 1; i < this.avatars.length; i++) {
      const a = this.avatars[i];
      const prevKind = this.avatars[i - 1].kind;
      dist += (a.kind === 'machine' || prevKind === 'machine') ? 1.5 : 1.0;
      const pt = this.trailAt(dist);
      const o = a.obj;
      if (snap) { o.position.set(pt.x, 0, pt.z); continue; }
      const dx = pt.x - o.position.x, dz = pt.z - o.position.z;
      const d = Math.hypot(dx, dz);
      o.position.x += dx * Math.min(1, dt * 10);
      o.position.z += dz * Math.min(1, dt * 10);
      if (d > 0.01) o.rotation.y = turnTo(o.rotation.y, Math.atan2(dx, dz), dt * 10);
      this.animAvatar(a, this.t + i * 0.3, moving && d > 0.02 ? moving : 0);
    }
  }

  trailAt(dist) {
    let acc = 0;
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1], b = this.trail[i];
      const seg = Math.hypot(a.x - b.x, a.z - b.z);
      if (acc + seg >= dist) { const k = (dist - acc) / (seg || 1); return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k }; }
      acc += seg;
    }
    return this.trail[this.trail.length - 1];
  }

  updateCamera(dt) {
    const p = G.pos;
    const town = this.map.type === 'town';
    const off = town ? V(0, 11, 8.2) : V(0, 13, 9.6);
    const target = V(p.x, 0, p.y - 0.6);
    const want = target.clone().add(off);
    const k = Math.min(1, dt * 6);
    this.camera.position.lerp(want, k);
    this.camLook = this.camLook ? this.camLook.lerp(target, k) : target;
    this.camera.lookAt(this.camLook);
    this.sun.position.set(p.x - 8, 18, p.y + 6);
    this.sun.target.position.set(p.x, 0, p.y);
    if (this.lamp) this.lamp.position.set(p.x, 2.5, p.y + 0.5);
  }

  canStand(x, z, r) {
    const map = this.map;
    for (const [ox, oz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      if (!isWalkable(map, Math.floor(x + ox), Math.floor(z + oz))) return false;
    }
    for (const n of this.npcs) if (Math.hypot(n.x - x, n.z - z) < 0.55) return false;
    for (const pk of this.parked) if (Math.hypot(pk.mc.loc.x - x, pk.mc.loc.y - z) < 0.75) return false;
    return true;
  }

  // ---------------------------------------------------------------- タイルの処理
  async checkTile() {
    const p = G.pos;
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    const key = `${tx},${ty}`;
    if (key === this.lastTile) return;
    this.lastTile = key;
    const map = this.map;
    const tile = tileAt(map, tx, ty);
    const info = TILES[tile];
    if (info?.step === 'door') {
      const b = (map.buildings || []).find((bb) => bb.door[0] === tx && bb.door[1] === ty);
      if (b) {
        this.lock(true);
        const mapBefore = G.pos.map;
        await openFacility(b.facility, this);
        if (G.pos.map !== mapBefore || !this.active) return; // ガレージから出発した
        // ドアから一歩下がる
        G.pos.y = ty + 1.5; G.pos.x = tx + 0.5; G.pos.dir = 0;
        this.lastTile = `${tx},${ty + 1}`;
        this.trail.unshift({ x: G.pos.x, z: G.pos.y });
        hud.update(true);
        if (this.active) this.lock(false);
      }
      return;
    }
    if (info?.step === 'warp') {
      const w = (map.warps || []).find((ww) => ww.x === tx && ww.y === ty);
      if (w) { this.warp(w); return; }
    }
    // エンカウント
    if (map.encounter && info?.enc) {
      const enc = map.encounter;
      G.steps++;
      G.encounterIn -= info.enc === 'road' ? (enc.roadRate ?? 0.5) : 1;
      if (G.encounterIn <= 0) {
        G.encounterIn = randInt(enc.steps[0], enc.steps[1]);
        const table = enc.tables[info.enc] || enc.tables[Object.keys(enc.tables)[0]];
        const group = pickWeighted(table);
        this.startBattle({ enemies: group.enemies, terrain: info.enc });
      }
    }
  }

  async warp(w) {
    this.lock(true);
    audio.sfx('warp');
    await ui.fade(true, 0.35);
    const toMap = MAPS[w.to];
    const fromMap = this.map;
    // 町に入る時：乗っているマシンは入口のガレージに預ける
    let note = null;
    if (toMap.type === 'town') {
      const riding = Object.values(G.machines).filter((mc) => mc.loc.type === 'party');
      for (const mc of riding) mc.loc = { type: 'garage', town: toMap.id };
      if (riding.length) note = 'マシンを入口のガレージに預けた';
    } else if (!toMap.machineAllowed) {
      // 生身でしか入れない場所：マシンは入口に停めておく
      Object.values(G.machines).filter((mc) => mc.loc.type === 'party').forEach((mc, i) => {
        mc.loc = { type: 'map', map: fromMap.id, x: G.pos.x + (i - 1) * 1.6, y: G.pos.y + 1.2, dir: 0 };
      });
    }
    G.pos = { map: w.to, x: w.tx + 0.5, y: w.ty + 0.5, dir: w.dir === 'up' ? Math.PI : 0 };
    G.encounterIn = Math.max(G.encounterIn, 6);
    if (toMap.type === 'town') G.lastTown = toMap.id;
    autosave();
    this.build();
    audio.playSong(toMap.bgm);
    await ui.fade(false, 0.35);
    ui.banner(esc(toMap.name), esc(toMap.subtitle || ''));
    if (note) ui.toast(note);
    hud.update(true);
    this.lock(false);
  }

  // ---------------------------------------------------------------- 戦闘へ
  async startBattle(opts) {
    this.lock(true);
    audio.sfx('encounter');
    await flashScreen();
    flow.startBattle(opts);
  }

  async challengeSymbol(s) {
    this.lock(true);
    const def = ENEMIES[s.data.enemies[0][0]];
    const b = BOUNTIES[s.data.bounty];
    await ui.say([{ name: '', text: `賞金首「${def.name}」だ！` }, { name: '', text: `賞金 ${b.reward.toLocaleString()} ギア。${def.desc}` }]);
    const ok = await ui.confirm('戦いますか？', '戦う', 'やめておく');
    if (!ok) {
      // 少し離れる
      const p = G.pos;
      const dx = p.x - s.x, dz = p.y - s.z, d = Math.hypot(dx, dz) || 1;
      for (const k of [2.4, 2.0, 1.6]) { const nx = s.x + (dx / d) * k, nz = s.z + (dz / d) * k; if (this.canStand(nx, nz, 0.4)) { p.x = nx; p.y = nz; break; } }
      this.lock(false);
      return;
    }
    this.startBattle({ enemies: s.data.enemies, terrain: tileTerrain(this.map, s.data), boss: true, symbol: s.data });
  }

  // ---------------------------------------------------------------- 調べる・タップ
  nearest(maxDist = 1.7) {
    const p = G.pos;
    const cands = [];
    for (const n of this.npcs) cands.push({ kind: 'npc', d: Math.hypot(n.x - p.x, n.z - p.y), ref: n });
    for (const pk of this.parked) cands.push({ kind: pk.mc.owned ? 'parked' : 'hiddenMachine', d: Math.hypot(pk.mc.loc.x - p.x, pk.mc.loc.y - p.y) - 0.5, ref: pk });
    for (const s of this.symbols) cands.push({ kind: 'symbol', d: Math.hypot(s.x - p.x, s.z - p.y) - 0.6, ref: s });
    // ドア
    const tx = Math.floor(p.x), ty = Math.floor(p.y);
    for (const b of this.map.buildings || []) {
      const d = Math.hypot(b.door[0] + 0.5 - p.x, b.door[1] + 0.5 - p.y);
      cands.push({ kind: 'door', d, ref: b });
    }
    cands.sort((a, b) => a.d - b.d);
    const c = cands[0];
    if (c && c.d <= maxDist) return c;
    // 崩れた岩（隠し通路）
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (tileAt(this.map, tx + dx, ty + dy) === 21) return { kind: 'crumble' };
    return null;
  }

  updateActionLabel() {
    const c = this.nearest();
    const lead = this.avatars?.[0];
    let label = '調べる';
    if (c?.kind === 'npc') label = '話す';
    else if (c?.kind === 'parked' || c?.kind === 'hiddenMachine') label = '乗る';
    else if (c?.kind === 'door') label = '入る';
    else if (lead?.kind === 'machine') label = '降りる';
    hud.setAction(label);
  }

  async onAction() {
    const c = this.nearest();
    this.lock(true);
    try {
      if (!c) {
        if (this.avatars[0].kind === 'machine') await this.askUnboard();
        else ui.toast('とくに何もないようだ');
      } else await this.interact(c.kind, c.ref);
    } finally { if (this.active) this.lock(false); }
  }

  async interact(kind, ref) {
    if (kind === 'npc') await this.talk(ref);
    else if (kind === 'parked') await this.askBoard(ref.mc, ref.obj);
    else if (kind === 'hiddenMachine') await this.discoverMachine(ref);
    else if (kind === 'symbol') { this.lock(false); await this.challengeSymbol(ref); }
    else if (kind === 'door') {
      await openFacility(ref.facility, this);
      hud.update(true);
    } else if (kind === 'crumble') await ui.say('岩がもろく崩れている。……すき間を通り抜けられそうだ。');
    else if (kind === 'myMachine') await this.askUnboard();
  }

  async onTap(pt) {
    const ndc = new THREE.Vector2((pt.x / window.innerWidth) * 2 - 1, -(pt.y / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const objs = [...this.npcs.map((n) => n.obj), ...this.parked.map((p) => p.obj), ...this.symbols.map((s) => s.obj), ...this.avatars.map((a) => a.obj)];
    const hits = this.raycaster.intersectObjects(objs, true);
    if (!hits.length) return;
    let o = hits[0].object;
    while (o && !o.userData.entity) o = o.parent;
    if (!o) return;
    const ent = o.userData.entity;
    const p = G.pos;
    const dist = o.position.distanceTo(V(p.x, 0, p.y));
    this.lock(true);
    try {
      if (ent.kind === 'myMachine') { if (ent.member === this.avatars[0].member) await this.askUnboard(); }
      else if (ent.kind === 'parked' || ent.kind === 'hiddenMachine') {
        if (dist > 3) ui.toast('もっと近づこう');
        else if (ent.kind === 'parked') await this.askBoard(ent.mc, o);
        else await this.discoverMachine(this.parked.find((pk) => pk.obj === o));
      } else if (ent.kind === 'npc') {
        if (dist > 2.6) ui.toast('もっと近づこう');
        else await this.talk(this.npcs.find((n) => n.obj === o));
      } else if (ent.kind === 'symbol') {
        if (dist > 3.5) ui.toast('賞金首だ。近づくと戦闘になる');
        else { this.lock(false); await this.challengeSymbol(this.symbols.find((s) => s.obj === o)); }
      }
    } finally { if (this.active) this.lock(false); }
  }

  async talk(n) {
    const p = G.pos;
    n.obj.rotation.y = Math.atan2(p.x - n.x, p.y - n.z);
    this.avatars[0].obj.rotation.y = Math.atan2(n.x - p.x, n.z - p.y);
    G.pos.dir = this.avatars[0].obj.rotation.y;
    const lines = n.data.lines.map((l) => ({ name: n.data.name, text: l.replace(/レン/g, G.members.ren.name) }));
    await ui.say(lines);
  }

  // ---------------------------------------------------------------- 乗る・降りる
  async askBoard(mc, obj) {
    let pilot = partyMembers().find((m) => m.machine === mc.id);
    const name = machineName(mc);
    if (mc.broken) { await ui.say(`${name}は大破している。ガレージで修理しないと動かない。`); return; }
    if (!pilot) {
      const cands = partyMembers().filter((m) => canPilot(m, mc) && !inMachine(m));
      if (!cands.length) { await ui.say('乗れる仲間がいない。'); return; }
      const v = await ui.menu({ title: `${esc(name)}に誰が乗る？`, items: cands.map((m) => ({ label: esc(m.name), value: m.id, right: m.machine ? `今：${esc(machineName(G.machines[m.machine]))}` : '生身' })) });
      if (!v) return;
      pilot = G.members[v];
      pilot.machine = mc.id;
    } else if (inMachine(pilot)) { return; } else {
      const ok = await ui.menu({ title: esc(name), items: [{ label: '乗る', value: true }, { label: 'やめる', value: false }] });
      if (!ok) return;
    }
    await this.boardAnim(pilot, mc, obj);
  }

  async boardAnim(pilot, mc, obj) {
    const av = this.avatars.find((a) => a.member === pilot);
    const hatch = obj.userData.hatch;
    audio.sfx('hatch');
    if (hatch) await tween(0.35, (t) => { hatch.rotation.x = -1.8 * t; });
    const start = av.obj.position.clone();
    const target = hatch ? hatch.getWorldPosition(new THREE.Vector3()) : obj.position.clone().add(V(0, 1.4, 0));
    await tween(0.55, (t) => {
      av.obj.position.lerpVectors(start, target, t);
      av.obj.position.y += Math.sin(t * Math.PI) * 0.9;
      av.obj.scale.setScalar(CHAR_SCALE * (1 - t * 0.6));
    }, Ease.inOut);
    av.obj.visible = false;
    if (hatch) await tween(0.3, (t) => { hatch.rotation.x = -1.8 * (1 - t); });
    audio.sfx('ok');
    // 乗り込み完了：停めてあったマシンが先頭の位置になる
    mc.loc = { type: 'party' };
    if (pilot === partyMembers()[0]) { G.pos.x = obj.position.x; G.pos.y = obj.position.z; G.pos.dir = obj.rotation.y; }
    this.scene.remove(obj);
    this.parked = this.parked.filter((pk) => pk.obj !== obj);
    // 近くに自分のマシンがある仲間も一緒に乗る
    for (const m of partyMembers()) {
      if (m === pilot || !m.machine || inMachine(m)) continue;
      const pk = this.parked.find((pp) => pp.mc.id === m.machine);
      if (pk && Math.hypot(pk.mc.loc.x - G.pos.x, pk.mc.loc.y - G.pos.y) < 7) {
        pk.mc.loc = { type: 'party' };
        this.scene.remove(pk.obj);
        this.parked = this.parked.filter((pp) => pp !== pk);
      }
    }
    this.buildParty();
    this.trail = [{ x: G.pos.x, z: G.pos.y }, { x: G.pos.x, z: G.pos.y + 0.01 }];
    this.updateFollowers(0, true);
    hud.update(true);
    autosave();
  }

  async askUnboard() {
    const lead = this.avatars[0];
    if (lead.kind !== 'machine') return;
    if (this.map.type === 'town') return;
    const ok = await ui.menu({ title: esc(machineName(lead.mc)), items: [{ label: '降りる', value: true }, { label: 'やめる', value: false }] });
    if (!ok) return;
    // 全員降りて、マシンはその場に停める
    const riding = this.avatars.filter((a) => a.kind === 'machine');
    for (const a of riding) {
      a.mc.loc = { type: 'map', map: this.map.id, x: a.obj.position.x, y: a.obj.position.z, dir: a.obj.rotation.y };
    }
    audio.sfx('hatch');
    const leadObj = lead.obj;
    const hatch = leadObj.userData.hatch;
    if (hatch) await tween(0.3, (t) => { hatch.rotation.x = -1.8 * t; });
    for (const a of riding) { this.scene.remove(a.obj); this.addParked(a.mc); }
    // 先頭はマシンの横に降りる
    const p = G.pos;
    const side = [[1.1, 0.6], [-1.1, 0.6], [0, 1.2], [0, -1.2], [1.1, -0.6], [-1.1, -0.6]];
    for (const [ox, oz] of side) { if (this.canStand(p.x + ox, p.y + oz, 0.26)) { p.x += ox; p.y += oz; break; } }
    this.buildParty();
    const av = this.avatars[0];
    const pk = this.parked.find((pp) => pp.mc === lead.mc);
    const from = pk ? pk.obj.userData.hatch?.getWorldPosition(new THREE.Vector3()) : null;
    if (from) {
      const to = V(p.x, 0, p.y);
      av.obj.scale.setScalar(CHAR_SCALE * 0.4);
      await tween(0.45, (t) => { av.obj.position.lerpVectors(from, to, t); av.obj.position.y += Math.sin(t * Math.PI) * 0.6; av.obj.scale.setScalar(CHAR_SCALE * (0.4 + 0.6 * t)); });
    }
    this.trail = [{ x: p.x, z: p.y }, { x: p.x, z: p.y + 0.01 }];
    this.updateFollowers(0, true);
    hud.update(true);
    autosave();
  }

  async discoverMachine(pk) {
    const mc = pk.mc;
    const def = MACHINES[mc.id];
    await ui.say([
      '山に囲まれたくぼ地に、古い機体が眠っている……。',
      `${G.members.ren.name}「すごい……ほこりをかぶってるけど、フレームもエンジンも生きてる！」`,
      `${G.members.ren.name}「ちょっと整備すれば動くぞ。誰でも乗れるタイプだ！」`,
    ]);
    mc.owned = true;
    const st = machineStats(mc);
    mc.armor = st.maxArmor; mc.en = st.maxEn;
    audio.sfx('levelup');
    ui.banner(`${esc(def.name)}を手に入れた！`, '制限なしで誰でも乗れる強力なマシン');
    // 色を元に戻す
    this.scene.remove(pk.obj);
    this.parked = this.parked.filter((p) => p !== pk);
    this.addParked(mc);
    autosave();
  }

  // ---------------------------------------------------------------- メニュー
  async onMenu() {
    this.lock(true);
    try { await openFieldMenu(this); } finally { if (this.active) this.lock(false); }
    hud.update(true);
  }
}

function turnTo(cur, target, k) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + d * Math.min(1, k);
}

function pickWeighted(table) {
  const total = table.reduce((a, e) => a + e.w, 0);
  let r = Math.random() * total;
  for (const e of table) { r -= e.w; if (r <= 0) return e; }
  return table[0];
}

function tileTerrain(map, s) {
  return TILES[tileAt(map, s.x, s.y)]?.enc || (map.type === 'dungeon' ? 'metal' : 'sand');
}

async function flashScreen() {
  for (let i = 0; i < 2; i++) { await ui.fade(true, 0.08, '#fff'); await ui.fade(false, 0.08, '#fff'); }
  await ui.fade(true, 0.25, '#000');
  await wait(0.05);
}
