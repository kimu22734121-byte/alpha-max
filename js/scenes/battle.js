// ターン制バトル（コマンド選択 → 素早さ順に行動）。攻撃のたびに3Dで派手に演出する
import * as THREE from 'three';
import { ui, esc } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { tween, tweenTo, wait, Ease, rand, clamp, pick, timeScale } from '../core/tween.js';
import { input } from '../core/input.js';
import { getModel, flashModel, resetFlash, setGlow, setOpacity, disposeObject } from '../core/assets.js';
import { buildMachineModel, animateMachine, animateChar, animateEnemy } from '../models/mech.js';
import { BattleFX } from './battle-fx.js';
import { ENEMIES, BOUNTIES, ELEMENT_RATE, WEAKNESS } from '../data/enemies.js';
import { MAPS } from '../data/maps.js';
import { WEAPONS, WEAPON_CATS } from '../data/weapons.js';
import { CHARACTERS } from '../data/characters.js';
import { MATERIALS, ITEMS } from '../data/items.js';
import { MACHINES } from '../data/machines.js';
import {
  G, partyMembers, memberStats, machineStats, machineName, weaponByUid, weaponAtk, weaponLabel, gainExp, addGear, addMat, receiveLoot, typeBoost,
} from '../game/state.js';
import { inMachine, machineSpec } from './world.js';
import { buildCharModel } from '../models/char-look.js';
import { itemMenu, applyItem, rangeBadge } from './menus.js';
import { flow } from '../game/flow.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ALLFIRE_EN = 60;
const LETTERS = 'ABCDEFGH';

export class BattleScene {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
    this.look = V(0, 1, 0);
    this.t = 0;
    // 画面の敵や味方を直接タップして選ぶ
    input.on('tap', (p) => { if (this.selecting && !this.over) this.onTap(p); });
  }

  // ---------------------------------------------------------------- 準備
  async enter(opts) {
    this.opts = opts;
    this.test = opts.test || null; // 開発者の部屋の試し撃ち
    this.over = false;
    this.boss = !!opts.boss;
    this.buildArena(opts.terrain);
    this.fx = new BattleFX(this.scene, this.camera);
    this.buildUnits(opts.enemies);
    this.buildHud();
    audio.playSong(this.boss ? 'boss' : 'battle', { restart: true });
    this.camera.position.set(0, 9, -14);
    this.look.set(0, 1, -2);
    this.camIdle = false;
    await ui.fade(false, 0.3);
    const names = [...new Set(this.enemies.map((e) => e.def.name))];
    const bossDef = this.enemies.find((e) => e.def.boss)?.def;
    this.log(bossDef ? `${bossDef.bounty ? '賞金首' : 'ボス'} ${bossDef.name} があらわれた！` : `${names.join('、')}があらわれた！`);
    await this.camTo(V(7, 5.5, 9.5), V(0, 1, -0.5), 1.4, Ease.inOut);
    this.camIdle = true;
    this.run();
  }

  async exit() {
    this.selecting = null;
    timeScale.k = 1;
    clearTimeout(this.msgTimer);
    this.hudEl?.remove();
    this.fx?.dispose();
    for (const o of [...this.scene.children]) { this.scene.remove(o); disposeObject(o); }
  }

  buildArena(terrain = 'sand') {
    const dungeon = !!MAPS[G.pos.map]?.dark;
    const veins = G.pos.map === 'factory1' || G.pos.map === 'ship1';
    const pal = {
      sand: { g: '#c4a068', s: ['#b08c58', '#d4b07a'], sky: [0xe8b878, 0x8a5a3a], fog: 0xd8a870 },
      road: { g: '#b49462', s: ['#a08050', '#c4a472'], sky: [0xe8b878, 0x8a5a3a], fog: 0xd8a870 },
      rock: { g: '#8a7660', s: ['#6e5e4c', '#a08a72'], sky: [0xd8a070, 0x6a4a32], fog: 0xb88a60 },
      metal: { g: '#6a7078', s: ['#5a6068', '#7a8088'], sky: [0xc8a080, 0x5a4a40], fog: 0xa89080 },
    }[terrain] || {};
    const dark = dungeon;
    // 地面
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const g = cv.getContext('2d');
    g.fillStyle = dark ? '#3a3c42' : pal.g; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1800; i++) { g.fillStyle = dark ? (i % 2 ? '#2e3036' : '#474a50') : pal.s[i % 2]; g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3); }
    if (dark || terrain === 'metal') { g.strokeStyle = dark ? '#2a2c30' : '#5a6068'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); } }
    if (dark && veins) { g.strokeStyle = 'rgba(180,70,220,0.5)'; g.lineWidth = 4; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(Math.random() * 512, Math.random() * 512); g.bezierCurveTo(Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512, Math.random() * 512); g.stroke(); } }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 6);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
    this.scene.add(ground);
    // 空
    const skyGeo = new THREE.SphereGeometry(150, 24, 16);
    const top = new THREE.Color(dark ? 0x0a0a10 : pal.sky[1]), bot = new THREE.Color(dark ? 0x22222a : pal.sky[0]);
    const cols = [];
    const pos = skyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const k = clamp(pos.getY(i) / 150, 0, 1); const c = bot.clone().lerp(top, Math.pow(k, 0.6)); cols.push(c.r, c.g, c.b); }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.scene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
    this.scene.fog = new THREE.Fog(dark ? 0x16161c : pal.fog, 25, 90);
    this.scene.background = null;
    // 遠くの景色・小物
    const rockMat = new THREE.MeshStandardMaterial({ color: dark ? 0x3a3e44 : 0x8a6a4a, flatShading: true, roughness: 1 });
    if (!dark) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rand(-0.1, 0.1);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rand(2, 4), rand(5, 8), rand(6, 14), 6), rockMat);
        m.position.set(Math.cos(a) * rand(45, 60), 3, Math.sin(a) * rand(45, 60));
        this.scene.add(m);
      }
      // 空に浮かぶ大きな月（宇宙っぽさ）
      const moon = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), new THREE.MeshBasicMaterial({ color: 0xf0e0c8, fog: false }));
      moon.position.set(-40, 45, -110);
      this.scene.add(moon);
    } else {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const m = new THREE.Mesh(new THREE.BoxGeometry(3, rand(8, 16), 3), rockMat);
        m.position.set(Math.cos(a) * 22, 4, Math.sin(a) * 22);
        this.scene.add(m);
      }
    }
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2), r = rand(8, 16);
      const m = new THREE.Mesh(dark ? new THREE.BoxGeometry(rand(0.6, 1.4), rand(0.6, 1.4), rand(0.6, 1.4)) : new THREE.DodecahedronGeometry(rand(0.4, 1.1), 0), rockMat);
      m.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
      m.castShadow = true;
      this.scene.add(m);
    }
    // ライト
    this.scene.add(new THREE.HemisphereLight(dark ? 0x9098b8 : 0xfff0d8, dark ? 0x201820 : 0x6a5038, dark ? 0.7 : 1.0));
    const sun = new THREE.DirectionalLight(dark ? 0xc0c8ff : 0xfff0d0, dark ? 1.0 : 2.0);
    sun.position.set(-8, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
    sun.shadow.bias = -0.0015;
    this.scene.add(sun);
    if (dark) { const pl = new THREE.PointLight(0xb050ff, 30, 20, 1.5); pl.position.set(0, 5, -5); this.scene.add(pl); }
  }

  makePartyObj(u) {
    if (u.mc) {
      const obj = buildMachineModel(machineSpec(u.mc));
      obj.scale.setScalar(1.0);
      return obj;
    }
    const obj = buildCharModel(u.m);
    obj.scale.setScalar(1.35);
    return obj;
  }

  buildUnits(list) {
    const members = this.test ? [this.test.unit.m] : partyMembers();
    const xs = members.length === 1 ? [0] : members.length === 2 ? [-1.8, 1.8] : [-3, 0, 3];
    this.party = members.map((m, i) => {
      const u = this.test ? { side: 'party', m, mc: this.test.unit.mc, name: m.name } : { side: 'party', m, mc: inMachine(m) && !G.machines[m.machine].broken ? G.machines[m.machine] : null, name: m.name };
      u.obj = this.makePartyObj(u);
      u.home = V(xs[i], 0, 3.4 + (i === 1 ? 0.4 : 0));
      u.obj.position.copy(u.home);
      u.obj.rotation.y = Math.PI;
      if (m.ko) { u.obj.rotation.z = Math.PI / 2; u.obj.position.y = 0.2; }
      this.scene.add(u.obj);
      return u;
    });
    // 敵
    const ens = [];
    for (const [id, n] of list) for (let i = 0; i < n; i++) ens.push(id);
    const count = {};
    for (const id of ens) count[id] = (count[id] || 0) + 1;
    const seen = {};
    const bossIdx = ens.findIndex((id) => ENEMIES[id].boss);
    const others = ens.filter((_, i) => i !== bossIdx);
    let oi = 0;
    this.enemies = ens.map((id, i) => {
      const def = ENEMIES[id];
      seen[id] = (seen[id] || 0) + 1;
      const letter = count[id] > 1 ? LETTERS[seen[id] - 1] : '';
      const obj = getModel(def.model, def.colors || {}, { metal: def.metal || def.rare });
      const sc = (def.boss ? 1.5 : 1.25) * (def.scale || 1);
      obj.scale.setScalar(sc);
      let x, z;
      if (i === bossIdx) { x = 0; z = -4.6; } else {
        const k = oi++;
        const n2 = others.length;
        if (bossIdx >= 0) { x = (k % 2 ? 1 : -1) * (4 + Math.floor(k / 2) * 2); z = -2.8; } else { x = (k - (n2 - 1) / 2) * 2.4; z = -3.2 + (k % 2) * -0.6; }
      }
      const fly = !!obj.userData.flying;
      const home = V(x, fly && !def.boss ? 1.2 : fly ? 1.0 : 0, z);
      obj.position.copy(home);
      this.scene.add(obj);
      const box = new THREE.Box3().setFromObject(obj);
      return { side: 'enemy', key: id, def, hp: def.hp, maxHp: def.hp, obj, home, name: def.name + letter, alive: true, fled: false, height: box.max.y - box.min.y, top: box.max.y };
    });
    // 選べる相手の足元に出す光の輪
    for (const u of [...this.party, ...this.enemies]) {
      const r = u.side === 'enemy' ? (u.def.boss ? 2.2 : 1.1) * (u.def.scale || 1) : u.mc ? 1.3 : 0.8;
      const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.78, r, 40), new THREE.MeshBasicMaterial({ color: 0x6ad8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      ring.renderOrder = 2;
      this.scene.add(ring);
      u.ring = ring;
    }
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 4), new THREE.MeshBasicMaterial({ color: 0xffe040 }));
    this.marker.rotation.x = Math.PI;
    this.marker.visible = false;
    this.scene.add(this.marker);
  }

  // ---------------------------------------------------------------- HUD
  buildHud() {
    const el = document.createElement('div');
    el.className = 'battle-hud';
    el.innerHTML = '<div class="b-msg"></div><div class="b-history"></div><div class="b-party"></div>';
    document.body.appendChild(el);
    this.hudEl = el;
    this.msgEl = el.querySelector('.b-msg');
    this.histEl = el.querySelector('.b-history');
    this.partyEl = el.querySelector('.b-party');
    this.updateHud();
  }

  updateHud(active) {
    // 下のステータス：名前の行＋ゲージを2列で（体力・装甲・EN）
    this.partyEl.innerHTML = this.party.map((u) => {
      const st = memberStats(u.m);
      const row = (label, cls, v, mx) => `<div class="b-row"><span>${label}</span><div class="bar ${cls}"><i style="width:${(100 * v) / mx}%"></i></div><b>${v}</b></div>`;
      let rows = row('体力', 'hp', u.m.hp, st.maxHp);
      if (u.mc) {
        const ms = machineStats(u.mc);
        rows += row('装甲', 'armor', u.mc.armor, ms.maxArmor) + row('EN', 'en', u.mc.en, ms.maxEn);
      }
      return `<div class="b-card${u === active ? ' active' : ''}${u.m.ko ? ' ko' : ''}"><div class="b-name">${esc(u.m.name)}<small>Lv${u.m.lv}${u.mc ? `<em class="b-mc">${esc(machineName(u.mc))}</em>` : ''}</small></div>
        <div class="b-bars">${rows}</div></div>`;
    }).join('');
  }

  // 上のメッセージウィンドウに出す（しばらく何も出なければ消える）。過去のログは端に小さく残す
  log(text) {
    this.msgEl.textContent = text;
    this.msgEl.classList.add('on');
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => this.msgEl?.classList.remove('on'), 2200);
    const line = document.createElement('div');
    line.textContent = text;
    this.histEl.appendChild(line);
    while (this.histEl.children.length > 7) this.histEl.firstChild.remove();
  }
  hideMsg() { clearTimeout(this.msgTimer); this.msgEl?.classList.remove('on'); }

  // ---------------------------------------------------------------- カメラ
  async camTo(pos, look, dur = 0.6, ease = Ease.inOut) {
    const p0 = this.camera.position.clone(), l0 = this.look.clone();
    await tween(dur, (k) => { this.camera.position.lerpVectors(p0, pos, k); this.look.lerpVectors(l0, look, k); }, ease);
  }
  camDefault(dur = 0.6) { return this.camTo(V(7, 5.5, 9.5), V(0, 1, -0.5), dur); }

  // ---------------------------------------------------------------- 毎フレーム
  update(dt) {
    this.t += dt;
    this.party.forEach((u, i) => {
      if (u.mc) animateMachine(u.obj, this.t, 0); else if (!u.m.ko) animateChar(u.obj, this.t, 0);
      // 待機中もゆらゆら（ホバーは大きく浮き沈み）
      if (!u.busy && !u.m.ko) {
        const hover = u.obj.userData.legType === 'hover';
        const ph = this.t * (hover ? 2.2 : 1.6) + i * 1.7;
        u.obj.position.y = u.home.y + (u.mc ? (hover ? 0.25 + Math.sin(ph) * 0.14 : Math.abs(Math.sin(ph)) * 0.04) : 0);
        u.obj.rotation.z = Math.sin(ph * 0.7) * (u.mc ? 0.025 : 0.015);
      }
    });
    // 選べる相手の光の輪
    for (const u of [...this.party, ...this.enemies]) {
      const r = u.ring;
      if (!r) continue;
      const sel = this.selecting;
      const on = !!sel && sel.units.includes(u) && (u.side === 'party' || u.alive);
      r.visible = on;
      if (!on) { if (u.lit) { resetFlash(u.obj); u.lit = false; } continue; }
      const f = sel.focus.has(u);
      r.position.set(u.obj.position.x, (u.side === 'enemy' ? u.home.y * 0 : 0) + 0.06, u.obj.position.z);
      r.material.color.setHex(f ? 0xffe040 : sel.ally ? 0x7aff9a : 0x6ad8ff);
      r.material.opacity = f ? 0.75 + Math.sin(this.t * 8) * 0.25 : 0.45;
      r.scale.setScalar(f ? 1.08 + Math.sin(this.t * 8) * 0.06 : 1);
      if (u.side === 'enemy') {
        if (f) { flashModel(u.obj, 0xffd040, 0.25 + Math.sin(this.t * 8) * 0.15); u.lit = true; } else if (u.lit) { resetFlash(u.obj); u.lit = false; }
      }
    }
    for (const e of this.enemies) {
      if (!e.alive) continue;
      animateEnemy(e.obj, this.t + e.home.x);
      if (e.obj.userData.flying) e.obj.position.y = e.home.y + Math.sin(this.t * 2 + e.home.x) * 0.15;
    }
    if (this.marker.visible) { this.marker.position.y = this.markerY + Math.sin(this.t * 6) * 0.12; this.marker.rotation.y += dt * 3; }
    if (this.camIdle) {
      this.camera.position.x += Math.sin(this.t * 0.4) * 0.002;
    }
    this.camera.lookAt(this.look);
    this.fx?.update(dt);
  }

  showMarker(e) {
    if (!e) { this.marker.visible = false; return; }
    this.marker.visible = true;
    this.marker.position.set(e.obj.position.x, 0, e.obj.position.z);
    this.markerY = e.top + 0.5;
  }

  // ---------------------------------------------------------------- 進行
  async run() {
    if (this.test) { await this.testLoop(); return; }
    while (!this.over) {
      const cmds = await this.commandPhase();
      if (this.over) return;
      if (cmds === 'escape') {
        if (await this.tryEscape()) return;
        await this.executeTurn([]);
      } else await this.executeTurn(cmds);
      if (this.over) return;
      for (const u of this.party) if (u.mc) u.mc.en = Math.min(machineStats(u.mc).maxEn, u.mc.en + 5);
      this.updateHud();
    }
  }

  // ---- 試し撃ち（開発者の部屋）：的は反撃しない。撃つたびに与えたダメージの合計を出す
  async testLoop() {
    const u = this.party[0];
    for (;;) {
      this.updateHud();
      const items = [];
      if (u.mc) {
        u.mc.slots.forEach((uid, i) => { if (uid) { const w = weaponByUid(uid), d = WEAPONS[w.id]; items.push({ label: `${WEAPON_CATS[d.cat].icon} ${esc(d.name)} ${rangeBadge(d)}`, right: `威力${d.atk}`, value: { slot: i } }); } });
        items.push({ label: '全砲門一斉発射', value: { allfire: true } });
      } else items.push({ label: `${esc(memberStats(u.m).weapon.name || '素手')}で攻撃 ${rangeBadge({ target: memberStats(u.m).weapon.target || 'one' })}`, value: { slot: null } });
      items.push({ label: '展示台にもどる', value: 'back' });
      const v = await ui.menu({ title: '試し撃ち', className: 'battle-cmd wide', items, cancel: false });
      if (v === 'back' || !v) break;
      for (const e of this.enemies) { e.hp = e.maxHp; e.alive = true; e.obj.visible = true; setOpacity(e.obj, 1); e.obj.position.copy(e.home); e.obj.rotation.set(0, 0, 0); }
      if (u.mc) { u.mc.en = machineStats(u.mc).maxEn; }
      const def = v.slot != null && u.mc ? WEAPONS[weaponByUid(u.mc.slots[v.slot]).id] : memberStats(u.m).weapon;
      const kind = def?.target || 'one';
      const alive = this.aliveEnemies();
      const target = kind === 'all' ? { all: true } : kind === 'group' ? { group: alive[0].key } : { unit: alive[0] };
      await this.doParty(u, v.allfire ? { type: 'allfire' } : { type: 'attack', slot: v.slot, target });
      const total = this.enemies.reduce((a, e) => a + (e.maxHp - e.hp), 0);
      this.log(`合計 ${total.toLocaleString()} のダメージ（${this.enemies.filter((e) => e.hp < e.maxHp).length}体に命中）`);
      this.camIdle = false; await this.camDefault(0.5); this.camIdle = true;
    }
    this.over = true;
    await ui.fade(true, 0.3);
    flow.toWorld({ after: this.test.after });
  }

  aliveEnemies() { return this.enemies.filter((e) => e.alive); }
  clearSelectGlow() { for (const e of this.enemies) if (e.lit) { resetFlash(e.obj); e.lit = false; } }
  aliveParty() { return this.party.filter((u) => !u.m.ko); }

  async commandPhase() {
    const actors = this.aliveParty();
    const cmds = [];
    let i = 0;
    while (i < actors.length) {
      const u = actors[i];
      this.updateHud(u);
      const c = await this.chooseCommand(u);
      if (c === 'back') { if (i > 0) { i--; cmds.pop(); } continue; }
      if (c.type === 'escape') { this.updateHud(); return 'escape'; }
      cmds.push({ ...c, u });
      i++;
    }
    this.updateHud();
    this.showMarker(null);
    this.clearSelectGlow();
    return cmds;
  }

  async chooseCommand(u) {
    const c = CHARACTERS[u.m.id];
    for (;;) {
      const items = [{ label: '攻撃', value: 'attack' }, { label: c.skill.name, value: 'skill' }];
      if (u.mc) items.push({ label: `全砲門一斉発射`, value: 'allfire', right: `EN${ALLFIRE_EN}`, disabled: u.mc.en < ALLFIRE_EN });
      items.push({ label: '道具', value: 'item' }, { label: '防御', value: 'guard' }, { label: '逃げる', value: 'escape' });
      const v = await ui.menu({ title: `${esc(u.m.name)}${u.mc ? `<small>（${esc(machineName(u.mc))}）</small>` : ''}`, items, className: 'battle-cmd', cancel: true });
      if (v === null) return 'back';
      if (v === 'guard') return { type: 'guard' };
      if (v === 'escape') return { type: 'escape' };
      if (v === 'allfire') { if (u.mc.slots.some(Boolean)) return { type: 'allfire' }; continue; }
      if (v === 'item') {
        // 味方を直接タップしても選べる
        const party = this.aliveParty().length ? this.party : [];
        ui.pickHook = { focus: (val) => { if (this.selecting) this.selecting.focus = new Set(party.filter((p) => val && (val.member === p.m || (val.mc && val.mc === p.mc)))); } };
        this.selecting = { units: party, focus: new Set(), ally: true, onTap: (p, top) => top.pickBy((val) => val && (val.member === p.m || (val.mc && val.mc === p.mc))) };
        const r = await itemMenu(true);
        ui.pickHook = null;
        this.selecting = null;
        if (r) return { type: 'item', ...r };
        continue;
      }
      if (v === 'skill' && c.skill.id === 'repair') {
        const mcs = this.party.filter((p) => p.mc);
        if (!mcs.length) { await ui.say('修理できるマシンがいない。'); continue; }
        this.selecting = { units: mcs, focus: new Set(), ally: true, onTap: (p, top) => top.pickBy((val) => val === p) };
        const t = await ui.menu({ title: 'どのマシンを修理する？（マシンをタップでも選べる）', className: 'battle-cmd', passThrough: true, onFocus: (it) => { if (this.selecting) this.selecting.focus = new Set([it.value]); }, items: mcs.map((p) => ({ label: esc(machineName(p.mc)), right: `${p.mc.armor}/${machineStats(p.mc).maxArmor}`, value: p })) });
        this.selecting = null;
        if (!t) continue;
        return { type: 'repair', target: t };
      }
      const skill = v === 'skill' ? c.skill.id : null;
      if (u.mc) {
        const w = await this.chooseWeapon(u);
        if (w == null) continue;
        const def = WEAPONS[weaponByUid(u.mc.slots[w]).id];
        const target = await this.chooseTarget(def.target);
        if (target === undefined) continue;
        return { type: 'attack', slot: w, target, skill };
      }
      const fw = memberStats(u.m).weapon;
      const target = await this.chooseTarget(fw.target || 'one');
      if (target === undefined) continue;
      return { type: 'attack', slot: null, target, skill };
    }
  }

  async chooseWeapon(u) {
    const items = u.mc.slots.map((uid, i) => {
      if (!uid) return null;
      const w = weaponByUid(uid), def = WEAPONS[w.id];
      return { label: `${WEAPON_CATS[def.cat].icon} ${esc(weaponLabel(w))} ${rangeBadge(def)}`, right: def.en ? `EN${def.en}` : '', value: i, disabled: (def.en || 0) > u.mc.en };
    }).filter(Boolean);
    if (!items.length) { await ui.say('武器を積んでいない！'); return null; }
    return ui.menu({ title: '武器', className: 'battle-cmd wide', items });
  }

  // 攻撃の相手を選ぶ：画面の敵を直接タップ（リストからも選べる）
  //  単体＝タップした敵に決定／グループ＝タップした敵と同じ種類がまとめて光り、もう一度タップで決定／全体＝選ばずに決定だけ
  async chooseTarget(kind) {
    const alive = this.aliveEnemies();
    const pass = { className: 'battle-cmd', passThrough: true };
    let v;
    if (kind === 'all') {
      this.selecting = { units: alive, focus: new Set(alive), onTap: (e, top) => top.pickBy(() => true) };
      v = await ui.menu({ ...pass, title: '全体攻撃：敵すべてをねらう', items: [{ label: '決定（敵をタップでも決定）', value: 'all' }] });
      this.selecting = null;
      return v == null ? undefined : { all: true };
    }
    if (kind === 'group') {
      const keys = [...new Set(alive.map((e) => e.key))];
      const focusKey = (k) => { if (this.selecting) this.selecting.focus = new Set(alive.filter((e) => e.key === k)); };
      this.selecting = {
        units: alive, focus: new Set(),
        onTap: (e, top) => { if (top.focused()?.value === e.key) top.pickBy((k) => k === e.key); else top.focusBy((k) => k === e.key); },
      };
      v = await ui.menu({ ...pass, title: 'どのグループ？（敵をタップ→もう一度タップで決定）', items: keys.map((k) => ({ label: `${esc(ENEMIES[k].name)} ×${alive.filter((e) => e.key === k).length}`, value: k })), onFocus: (it) => focusKey(it.value) });
      this.selecting = null;
      return v == null ? undefined : { group: v };
    }
    if (alive.length === 1) return { unit: alive[0] };
    this.selecting = { units: alive, focus: new Set(), onTap: (e, top) => top.pickBy((x) => x === e) };
    v = await ui.menu({ ...pass, title: 'どれをねらう？（敵をタップでも選べる）', items: alive.map((e) => ({ label: esc(e.name), value: e })), onFocus: (it) => { if (this.selecting) this.selecting.focus = new Set([it.value]); } });
    this.selecting = null;
    return v == null ? undefined : { unit: v };
  }

  // タップした場所にいちばん近い相手（画面上の距離）を探す
  onTap(p) {
    const sel = this.selecting;
    const top = ui.topMenu();
    if (!sel || !top) return;
    const w = window.innerWidth, h = window.innerHeight;
    let best = null, bestD = Infinity;
    for (const u of sel.units) {
      if (u.side === 'enemy' && !u.alive) continue;
      const hgt = u.side === 'enemy' ? u.height : u.mc ? 2.4 : 1.4;
      const c = u.obj.position.clone().add(V(0, hgt * 0.5, 0)).project(this.camera);
      const sx = (c.x * 0.5 + 0.5) * w, sy = (-c.y * 0.5 + 0.5) * h;
      // 体の大きさぶん、当たりを広くする
      const top3 = u.obj.position.clone().add(V(0, hgt, 0)).project(this.camera);
      const rad = Math.max(48, Math.abs((-top3.y * 0.5 + 0.5) * h - sy) * 1.3);
      const d = Math.hypot(p.x - sx, p.y - sy);
      if (d < rad && d < bestD) { best = u; bestD = d; }
    }
    if (best) sel.onTap(best, top);
  }

  resolveTargets(t) {
    const alive = this.aliveEnemies();
    if (!alive.length) return [];
    if (t.all) return alive;
    if (t.group) { const g = alive.filter((e) => e.key === t.group); return g.length ? g : [pick(alive)]; }
    if (t.unit && t.unit.alive) return [t.unit];
    const same = alive.filter((e) => e.key === t.unit?.key);
    return [same.length ? same[0] : pick(alive)];
  }

  async executeTurn(cmds) {
    const order = [];
    for (const c of cmds) {
      const st = memberStats(c.u.m);
      order.push({ kind: 'party', u: c.u, cmd: c, spd: (c.type === 'guard' ? 999 : st.spd + (c.u.mc ? 2 + machineStats(c.u.mc).spd : 0) + rand(0, 4)) });
    }
    for (const e of this.aliveEnemies()) for (let k = 0; k < (e.def.acts || 1); k++) order.push({ kind: 'enemy', e, spd: e.def.spd + rand(0, 4) - k * 3 });
    order.sort((a, b) => b.spd - a.spd);
    for (const u of this.party) u.guard = false;
    for (const a of order) {
      if (this.over) return;
      if (a.kind === 'party') {
        if (a.u.m.ko) continue;
        this.updateHud(a.u);
        await this.doParty(a.u, a.cmd);
      } else {
        if (!a.e.alive) continue;
        await this.doEnemy(a.e);
      }
      this.updateHud();
      if (await this.checkEnd()) return;
    }
    this.camIdle = false;
    await this.camDefault(0.5);
    this.camIdle = true;
  }

  // ---------------------------------------------------------------- 味方の行動
  muzzleOf(u, slot) {
    if (u.mc && slot != null) {
      const wp = u.obj.userData.weapons.find((w) => w.slot === slot);
      if (wp) return wp.muzzle.getWorldPosition(V(0, 0, 0));
    }
    if (!u.mc && u.obj.userData.handMuzzle) return u.obj.userData.handMuzzle.getWorldPosition(V(0, 0, 0));
    return u.obj.position.clone().add(V(0, u.mc ? 1.8 : 0.8, -0.4));
  }
  hitPoint(e) { return e.obj.position.clone().add(V(rand(-0.15, 0.15), e.height * 0.5, 0.2)); }
  partyPoint(u) { return u.obj.position.clone().add(V(0, u.mc ? 1.3 : 0.6, 0)); }

  async shotOf(u, targets) {
    const tp = targets.length ? targets.reduce((a, e) => a.add(e.obj.position), V(0, 0, 0)).multiplyScalar(1 / targets.length) : V(0, 0, -3);
    const side = u.home.x >= 0 ? 1 : -1;
    const pos = u.home.clone().add(V(side * 2.6, u.mc ? 2.6 : 1.6, 3.4));
    this.camIdle = false;
    await this.camTo(pos, tp.clone().lerp(u.home, 0.25).add(V(0, 1, 0)), 0.45);
  }

  async doParty(u, cmd) {
    u.busy = true;
    try { await this.doPartyInner(u, cmd); } finally { u.busy = false; }
  }

  async doPartyInner(u, cmd) {
    const name = u.m.name;
    if (cmd.type === 'guard') { u.guard = true; this.log(`${name}は身を守っている。`); return; }
    if (cmd.type === 'item') {
      if (!G.inv.items[cmd.id]) { this.log(`${ITEMS[cmd.id].name}はもうなかった！`); return; }
      this.log(`${name}は${ITEMS[cmd.id].name}を使った！`);
      const msg = applyItem(cmd.id, cmd.target);
      const use = ITEMS[cmd.id].use;
      audio.sfx(use === 'armor' || use === 'maint' || use === 'en' ? 'repair' : 'heal');
      const tu = cmd.target.member ? this.party.find((p) => p.m === cmd.target.member) : this.party.find((p) => p.mc === cmd.target.mc);
      const targets = cmd.target.all ? this.party : tu ? [tu] : [];
      for (const t of targets) { this.fx.sparks(this.partyPoint(t), 0x7aff9a, 14); if (t.m.ko === false && t.obj.rotation.z) { t.obj.rotation.z = 0; t.obj.position.y = 0; } }
      this.log(msg);
      await wait(0.6);
      return;
    }
    if (cmd.type === 'repair') {
      const t = cmd.target;
      if (!t.mc) { this.log('修理するマシンがいなくなった。'); return; }
      await this.shotOf(u, []);
      this.log(`${name}はマシンを修理した！`);
      audio.sfx('repair');
      for (let i = 0; i < 3; i++) { this.fx.sparks(this.partyPoint(t), 0xffe080, 8); await wait(0.15); }
      const amt = Math.round((30 + u.m.lv * 7 + rand(0, 10)) * memberStats(u.m).repairMul);
      const mx = machineStats(t.mc).maxArmor;
      const got = Math.min(mx - t.mc.armor, amt);
      t.mc.armor += got;
      this.fx.number(this.partyPoint(t), `+${got}`, 'heal');
      this.log(`${machineName(t.mc)}の装甲が${got}回復した。`);
      await wait(0.4);
      return;
    }
    if (cmd.type === 'allfire') { await this.allFire(u); return; }
    // 攻撃
    const targets = this.resolveTargets(cmd.target);
    if (!targets.length) return;
    let def = null, w = null;
    if (u.mc && cmd.slot != null) {
      w = weaponByUid(u.mc.slots[cmd.slot]);
      def = WEAPONS[w.id];
      if ((def.en || 0) > u.mc.en) { this.log(`${name}：エネルギーが足りない！`); return; }
      u.mc.en -= def.en || 0;
    }
    const skillName = cmd.skill ? CHARACTERS[u.m.id].skill.name : null;
    this.log(`${name}の${skillName ? `${skillName}！ ` : ''}${def ? `${def.name}！` : '攻撃！'}`);
    this.camIdle = false;
    const ctx = { u, def, w, skill: cmd.skill };
    if (!def) await this.footAttack(u, targets, ctx);
    else await this.fireWeapon(u, cmd.slot, def, targets, ctx);
    await this.returnHome(u);
  }

  // ---------------------------------------------------------------- 攻撃の動き
  // 攻撃のたびにマシンが敵の周りを回り込み、カメラも一緒に回る
  centerOf(targets) {
    const c = V(0, 0, 0);
    for (const e of targets) c.add(e.obj.position);
    c.multiplyScalar(1 / Math.max(1, targets.length)); c.y = 0;
    return c;
  }
  face(u, c) { u.obj.rotation.y = Math.atan2(c.x - u.obj.position.x, c.z - u.obj.position.z); }
  // 攻撃する味方の斜め後ろからカメラで追いかける
  camFollow(u, c, side = 1, k = 1) {
    const pos = u.obj.position;
    const dir = V(pos.x - c.x, 0, pos.z - c.z).normalize();
    // 仲間とかぶらないように、カメラは外側（陣形の端の方）へ寄せる
    void side;
    const out = u.home.x >= 0 ? 1 : -1;
    const perp = V(-dir.z, 0, dir.x);
    if (perp.x * out < 0) perp.multiplyScalar(-1);
    const want = pos.clone().addScaledVector(dir, u.mc ? 4.2 : 3.2).addScaledVector(perp, u.mc ? 2.4 : 1.8).add(V(0, u.mc ? 2.6 : 1.8, 0));
    this.camera.position.lerp(want, k);
    this.look.lerp(c.clone().lerp(pos, 0.35).add(V(0, 1.1, 0)), k);
  }
  // 敵の中心のまわりを角度 ang だけ回り込む（距離は radiusK 倍に）
  async orbit(u, c, ang, radiusK, dur, side) {
    const v0 = u.obj.position.clone().sub(c); v0.y = 0;
    const r0 = v0.length(), a0 = Math.atan2(v0.x, v0.z);
    await tween(dur, (k) => {
      const a = a0 + ang * k, r = r0 * (1 + (radiusK - 1) * k);
      u.obj.position.set(c.x + Math.sin(a) * r, u.obj.position.y, c.z + Math.cos(a) * r);
      this.face(u, c);
      this.camFollow(u, c, side, Math.min(1, 0.15 + k));
    }, Ease.inOut);
  }
  // 横にスライド（onStep で途中に発射）
  async strafe(u, c, dist, dur, side, onStep) {
    const p0 = u.obj.position.clone();
    const dir = V(p0.x - c.x, 0, p0.z - c.z).normalize();
    const perp = V(-dir.z, 0, dir.x).multiplyScalar(side * dist);
    let last = -1;
    await tween(dur, (k) => {
      u.obj.position.set(p0.x + perp.x * k, p0.y + Math.sin(k * Math.PI) * 0.15, p0.z + perp.z * k);
      this.face(u, c);
      this.camFollow(u, c, -side, 0.2);
      const step = Math.floor(k * 6);
      if (step !== last && onStep) { last = step; onStep(step); }
    }, Ease.inOut);
  }
  async dash(u, to, dur, c) {
    const p0 = u.obj.position.clone();
    await tween(dur, (k) => {
      u.obj.position.lerpVectors(p0, to, k);
      u.obj.position.y = Math.sin(k * Math.PI) * 0.3;
      this.face(u, c);
      this.camFollow(u, c, 1, 0.25);
    }, Ease.in);
  }
  async returnHome(u) {
    const p0 = u.obj.position.clone();
    const r0 = u.obj.rotation.y;
    await tween(0.4, (k) => {
      u.obj.position.lerpVectors(p0, u.home, k);
      u.obj.position.y = Math.sin(k * Math.PI) * 0.4;
      u.obj.rotation.y = r0 + (Math.PI - r0) * k;
    }, Ease.inOut);
    u.obj.position.copy(u.home);
    u.obj.rotation.set(0, Math.PI, 0);
  }

  async footAttack(u, targets, ctx) {
    const fw = memberStats(u.m).weapon;
    if (fw.final) { await this.finalAttack(u, targets, ctx, fw.final); return; }
    const cat = fw.cat || 'tool';
    const col = fw.elem === 'elec' ? 0x8affff : fw.elem === 'fire' ? 0xffa040 : 0xffffff;
    const c = this.centerOf(targets);
    const side = Math.random() < 0.5 ? -1 : 1;
    if (cat === 'blade' || cat === 'rod' || cat === 'tool' || !fw.atk) {
      // 近接：走って斬る・殴る（グループ・全体なら次々に）
      for (const e of targets) {
        if (!e.alive) continue;
        const ep = e.obj.position.clone(); ep.y = 0;
        await this.dash(u, ep.clone().add(V(side * 0.4, 0, 1.2)), 0.26, ep);
        audio.sfx(cat === 'rod' ? 'laser' : 'metalhit');
        if (cat === 'blade') { u.obj.rotation.y += 0.7 * side; this.fx.claw(this.hitPoint(e), col); }
        else { this.fx.sparks(this.hitPoint(e), cat === 'rod' ? 0x8affff : 0xffd080, 12); this.fx.claw(this.hitPoint(e), col); }
        await this.applyHit(u, e, ctx, 0.1);
      }
      return;
    }
    await this.orbit(u, c, side * 0.35, 0.85, 0.45, side);
    if (cat === 'bomb') {
      // 爆弾・ランチャー：放物線で投げて爆発
      audio.sfx('missile');
      await Promise.all(targets.map((e, i) => this.fx.missile(this.muzzleOf(u), this.hitPoint(e), i * 0.06).then(() => { audio.sfx('explosion'); this.fx.explosion(this.hitPoint(e), 0.8); })));
      for (const e of targets) await this.applyHit(u, e, ctx, 0.08);
      return;
    }
    if (cat === 'sniper' || cat === 'laser') {
      // 狙い撃ち：一瞬止まってから細い光線
      await wait(0.2);
      for (const e of targets) {
        audio.sfx(cat === 'laser' ? 'laser' : 'cannon');
        await this.fx.beam(this.muzzleOf(u), this.hitPoint(e), cat === 'laser' ? 0xff6a5a : 0xfff0c0, 0.05, 0.25);
        await this.applyHit(u, e, ctx);
      }
      return;
    }
    // 銃：ハンドガン・ライフル・ショットガン・ガトリング
    for (const e of targets) {
      audio.sfx(cat === 'heavy' ? 'mg' : cat === 'shotgun' ? 'cannon' : 'shot');
      await this.fx.tracers(this.muzzleOf(u), this.hitPoint(e), 0xffe08a, cat === 'heavy' ? 6 : cat === 'shotgun' ? 5 : 3, cat === 'shotgun' ? 0.45 : 0.2);
      await this.applyHit(u, e, ctx, 0.12);
    }
  }

  // 専用武器（最終段階）の専用演出
  async finalAttack(u, targets, ctx, kind) {
    this.camIdle = false;
    const c = this.centerOf(targets);
    const home = u.obj.position.clone();
    audio.sfx('charge');
    timeScale.k = 0.45;
    // 構え：光のリングが足元から昇る
    const aura = { ren: 0xffd86a, shion: 0xff3a4a, gina: 0xff9a3a }[kind];
    for (let i = 0; i < 3; i++) this.fx.ring(home.clone().add(V(0, 0.1 + i * 0.6, 0)), aura, 1.6 + i * 0.5, 0.7);
    await tween(0.5, (k) => { this.camera.position.set(home.x + Math.sin(k * 2) * 3, 1.6 + k, home.z + 3 - k); this.look.copy(home).add(V(0, 0.8, 0)); });
    timeScale.k = 1;
    if (kind === 'ren') {
      // 黄金の歯車が回り、ミサイルの雨と自動砲台
      this.fx.flash(home.clone().add(V(0, 1.2, 0)), 0xffe08a, 4, 0.4);
      await this.camTo(V(c.x + 6, 7, c.z + 9), c.clone().add(V(0, 0.5, 0)), 0.4);
      const shots = [];
      for (let k = 0; k < 9; k++) {
        const e = targets[k % targets.length];
        audio.sfx('missile');
        shots.push(this.fx.missile(home.clone().add(V(rand(-1, 1), 1.5, 0)), this.hitPoint(e), k * 0.05).then(() => { audio.sfx('explosion'); this.fx.explosion(this.hitPoint(e).add(V(rand(-0.5, 0.5), 0, rand(-0.5, 0.5))), 1.0, 0xffc040); }));
      }
      await Promise.all(shots);
      this.fx.shake = 1.4;
    } else if (kind === 'shion') {
      // 空ごと撃ち抜く赤い光線
      const e = targets[0];
      await this.camTo(home.clone().add(V(-1.2, 1.6, 2.2)), this.hitPoint(e), 0.4);
      timeScale.k = 0.3;
      audio.sfx('beam');
      await this.fx.beam(this.muzzleOf(u), this.hitPoint(e), 0xff2a3a, 0.4, 0.6);
      timeScale.k = 1;
      this.fx.flash(this.hitPoint(e), 0xffffff, 6, 0.4);
      this.fx.ring(this.hitPoint(e), 0xff3a4a, 4, 0.7);
      this.fx.explosion(this.hitPoint(e), 2.2, 0xff4a5a);
      this.fx.shake = 1.2;
    } else {
      // 回転斬りの衝撃波で一列ごと吹き飛ばす
      await this.dash(u, c.clone().add(V(0, 0, 1.6)), 0.25, c);
      audio.sfx('metalhit');
      await tween(0.5, (k) => { u.obj.rotation.y = Math.PI + k * Math.PI * 4; this.camFollow(u, c, 1, 0.2); });
      for (let i = 0; i < 3; i++) this.fx.ring(c.clone().add(V(0, 0.4, 0)), 0xff8a3a, 3 + i * 1.5, 0.5);
      for (const e of targets) { this.fx.claw(this.hitPoint(e), 0xffc080); this.fx.explosion(this.hitPoint(e), 1.2, 0xff7a2a); }
      audio.sfx('explosion');
      this.fx.shake = 1.4;
    }
    for (const e of targets) await this.applyHit(u, e, { ...ctx, finalCrit: true }, 0.08);
  }

  async fireWeapon(u, slot, def, targets, ctx, fast = false) {
    const from = () => this.muzzleOf(u, slot);
    const big = def.unique;
    const c = this.centerOf(targets);
    const side = Math.random() < 0.5 ? -1 : 1;
    if (def.cat === 'melee') {
      // 近接：ダッシュで詰め寄って攻撃し、元の位置に戻る（ブレード＝連続斬り／ハンマー＝跳んでたたきつけ／パイル＝杭を打ちこむ）
      for (const e of targets) {
        const ep = e.obj.position.clone(); ep.y = 0;
        const to = ep.clone().add(V(side * 0.7, 0, 1.5 + (e.def.boss ? 1.2 : 0)));
        audio.sfx('charge');
        await this.dash(u, to, fast ? 0.18 : 0.3, ep);
        const col = def.elem === 'elec' ? 0x8affff : def.elem === 'fire' ? 0xffa040 : 0xffffff;
        if (def.style === 'hammer') {
          await tween(0.25, (k) => { u.obj.position.y = Math.sin(k * Math.PI * 0.5) * 1.4; this.camFollow(u, ep, side, 0.2); }, Ease.out);
          await tween(0.12, (k) => { u.obj.position.y = 1.4 * (1 - k); }, Ease.in);
          audio.sfx('press');
          this.fx.shake = 1;
          this.fx.ring(ep.clone().add(V(0, 0.1, 0)), 0xffd080, 3, 0.5);
          this.fx.debris(ep.clone().add(V(0, 0.3, 0)), 6, 0x8a7a60, 3);
        } else if (def.style === 'pile') {
          const pile = u.obj.userData.weapons?.find((wp) => wp.def === def)?.obj.getObjectByName('pile');
          audio.sfx('cannon');
          if (pile) await tween(0.08, (k) => { pile.position.z = 0.6 + k * 0.5; });
          this.fx.ring(this.hitPoint(e), 0x9fe8ff, 2.2, 0.4);
          this.fx.flash(this.hitPoint(e), 0xffffff, 2.5, 0.2);
          this.fx.shake = 0.8;
          if (pile) tween(0.3, (k) => { pile.position.z = 1.1 - k * 0.5; });
        } else {
          for (let i = 0; i < 2; i++) {
            audio.sfx(def.elem === 'elec' ? 'laser' : 'metalhit');
            u.obj.rotation.y += i ? -0.6 : 0.6;
            this.fx.claw(this.hitPoint(e), col);
            await wait(0.12);
          }
          this.face(u, ep);
        }
        this.fx.sparks(this.hitPoint(e), col === 0xffffff ? 0xffc060 : col, 14);
        await this.applyHit(u, e, ctx, 0.12);
      }
    } else if (def.cat === 'cannon') {
      // 主砲：敵の周りを回り込んでから撃つ（回り込み／ジャンプ撃ちのどちらか）
      const r0 = Math.random();
      const move = fast ? 'none' : r0 < 0.45 ? 'flank' : r0 < 0.75 ? 'jump' : 'slide';
      if (move === 'slide') {
        // 横に滑りながら構え、止まった瞬間に撃つ
        await this.strafe(u, c, 2.2, 0.55, side, () => {});
        await tween(0.12, (k) => { u.obj.rotation.x = -0.15 * Math.sin(k * Math.PI); });
      }
      if (move === 'flank') await this.orbit(u, c, side * 0.6, 0.9, 0.6, side);
      if (move === 'jump') {
        await this.orbit(u, c, side * 0.25, 0.95, 0.35, side);
        await tween(0.3, (k) => { u.obj.position.y = Math.sin(k * Math.PI * 0.5) * 1.6; this.camFollow(u, c, side, 0.2); }, Ease.out);
      }
      for (const e of targets) {
        // 撃った反動でのけぞる
        tween(0.22, (k) => { u.obj.rotation.x = -0.22 * Math.sin(k * Math.PI); });
        audio.sfx(def.elem === 'elec' || def.model === 'wpn_alpha_buster' || def.name.includes('プラズマ') ? 'beam' : 'cannon');
        if (def.elem === 'elec' || def.name.includes('レール')) await this.fx.beam(from(), this.hitPoint(e), 0x7ad8ff, big ? 0.35 : 0.12);
        else if (def.name.includes('プラズマ')) await this.fx.beam(from(), this.hitPoint(e), 0xd070ff, 0.22);
        else await this.fx.shell(from(), this.hitPoint(e));
        audio.sfx('explosion');
        this.fx.explosion(this.hitPoint(e), big ? 1.8 : 1.1);
        await this.applyHit(u, e, ctx);
      }
      if (move === 'jump') await tween(0.25, (k) => { u.obj.position.y = 1.6 * (1 - k); }, Ease.in);
    } else if (def.cat === 'mg') {
      // 機銃：横に走りながら連射
      const col = def.elem === 'elec' ? 0x7affff : 0xffe08a;
      const shots = [];
      audio.sfx(def.elem === 'elec' ? 'laser' : 'mg');
      await this.strafe(u, c, fast ? 1.2 : 2.6, fast ? 0.5 : 0.9, side, (step) => {
        if (step % 2) audio.sfx(def.elem === 'elec' ? 'laser' : 'mg');
        targets.forEach((e) => shots.push(this.fx.tracers(from(), this.hitPoint(e), col, 2, 0.35)));
      });
      await Promise.all(shots);
      for (const e of targets) await this.applyHit(u, e, ctx, 0.15);
    } else if (def.cat === 'missile') {
      // ミサイル：横にスライドしながら次々に発射
      const n = def.target === 'one' ? 3 : 1;
      const queue = [];
      targets.forEach((e) => { for (let k = 0; k < n; k++) queue.push(e); });
      const shots = [];
      await this.strafe(u, c, fast ? 1.2 : 2.2, fast ? 0.45 : 0.8, side, (step) => {
        const e = queue.shift();
        if (!e) return;
        audio.sfx('missile');
        shots.push(this.fx.missile(from(), this.hitPoint(e), 0).then(() => { audio.sfx('explosion'); this.fx.explosion(this.hitPoint(e), 0.9); }));
      });
      for (const e of queue) shots.push(this.fx.missile(from(), this.hitPoint(e), 0.05).then(() => { audio.sfx('explosion'); this.fx.explosion(this.hitPoint(e), 0.9); }));
      await Promise.all(shots);
      for (const e of targets) await this.applyHit(u, e, ctx, 0.15);
    } else {
      // 特殊兵器：少し回り込んで構えてから撃つ
      if (!fast) await this.orbit(u, c, side * 0.3, 0.8, 0.45, side);
      if (def.elem === 'fire') {
        audio.sfx('flame');
        await Promise.all(targets.map((e) => this.fx.flame(from(), this.hitPoint(e))));
      } else {
        audio.sfx('emp');
        await Promise.all(targets.map((e) => this.fx.emp(from(), this.hitPoint(e))));
      }
      for (const e of targets) await this.applyHit(u, e, ctx, 0.15);
    }
  }

  // 命中とダメージ
  calcHit(u, e, ctx) {
    const st = memberStats(u.m);
    if (ctx.skill === 'snipe') return { hit: true, crit: Math.random() < 0.5 };
    let chance;
    if (ctx.def) {
      const ms = machineStats(u.mc);
      chance = 82 + ms.hit + st.hit * 0.4 + ctx.def.hit - e.def.eva - (e.def.flying && ctx.def.cat === 'cannon' ? 10 : 0);
    } else chance = 85 + st.hit - e.def.eva;
    if (ctx.skill === 'rampage') chance -= 10;
    if (ctx.allfire) chance += 10;
    const crit = ctx.finalCrit || Math.random() < (CHARACTERS[u.m.id].role === 'pilot' ? 0.12 : 0.05) + st.crit / 100;
    return { hit: Math.random() * 100 < clamp(chance, 12, 99), crit };
  }

  calcDamage(u, e, ctx, crit) {
    const st = memberStats(u.m);
    let atk;
    if (ctx.def) {
      const ms = machineStats(u.mc);
      const arm = ctx.slot === 0 ? ms.armMul.R : ctx.slot === 1 ? ms.armMul.L : 1;
      atk = weaponAtk(ctx.w) * arm * ms.mul * typeBoost(u.mc, ctx.def) + st.atk * 0.3;
      if (ctx.skill === 'rampage') atk *= 1.5;
      if (ctx.allfire) atk *= 1.2;
    } else {
      atk = st.atk + st.weaponAtk;
      if (ctx.skill === 'rampage') atk *= 1.8;
    }
    const elem = ctx.def ? ctx.def.elem : st.weapon.elem;
    const defRate = ctx.def?.pierce ? 0.25 : 0.5; // パイルバンカーは防御を半分むしする
    let dmg = crit ? atk * 1.5 : atk * rand(0.9, 1.1) - e.def.def * defRate;
    const weak = elem && WEAKNESS[e.def.type] === elem;
    if (weak) dmg *= ELEMENT_RATE;
    return { dmg: Math.max(e.def.minDamage || 1, Math.round(dmg)), weak };
  }

  async applyHit(u, e, ctx, pause = 0.25) {
    if (!e.alive) return;
    const ctx2 = { ...ctx, slot: ctx.slot ?? (ctx.w ? u.mc.slots.indexOf(ctx.w.uid) : null) };
    const { hit, crit } = this.calcHit(u, e, ctx2);
    const p = this.hitPoint(e).add(V(0, e.height * 0.4, 0));
    if (!hit) { audio.sfx('miss'); this.fx.number(p, 'MISS', 'miss'); this.log(`${e.name}にかわされた！`); await wait(pause); return; }
    const { dmg, weak } = this.calcDamage(u, e, ctx2, crit);
    e.hp -= dmg;
    flashModel(e.obj, 0xffffff, 1.2);
    setTimeout(() => resetFlash(e.obj), 90);
    const kb = e.obj.position.clone();
    const heavy = crit || dmg >= e.maxHp * 0.3;
    tween(heavy ? 0.32 : 0.18, (k) => { e.obj.position.z = kb.z - Math.sin(k * Math.PI) * (heavy ? 0.7 : 0.25); e.obj.rotation.x = -Math.sin(k * Math.PI) * (heavy ? 0.25 : 0.08); });
    if (e.def.type !== 'bio') this.fx.sparks(this.hitPoint(e), 0xffc060, heavy ? 14 : 6);
    if (heavy) this.fx.shake = Math.max(this.fx.shake, 0.5);
    this.fx.number(p, `${dmg}`, crit ? 'crit' : weak ? 'weak' : '');
    this.log(`${crit ? '会心の一撃！ ' : ''}${weak ? '弱点をついた！ ' : ''}${e.name}に${dmg}のダメージ！`);
    if (e.hp <= 0) await this.killEnemy(e);
    else await wait(pause);
  }

  async killEnemy(e) {
    e.alive = false;
    e.hp = 0;
    this.log(`${e.name}をやっつけた！`);
    audio.sfx(e.def.boss ? 'bigexplosion' : 'explosion');
    const c = e.obj.position.clone().add(V(0, e.height * 0.5, 0));
    if (e.def.boss) {
      for (let i = 0; i < 5; i++) { this.fx.explosion(c.clone().add(V(rand(-1.5, 1.5), rand(-0.5, 1.5), rand(-1, 1))), 1.6); await wait(0.22); }
    }
    this.fx.explosion(c, e.def.boss ? 2.5 : 1.3, e.def.type === 'bio' ? 0xa060ff : 0xffa040);
    await tween(0.5, (k) => { e.obj.position.y = e.home.y - k * 0.8; e.obj.rotation.z = k * 0.6; setOpacity(e.obj, 1 - k); });
    e.obj.visible = false;
  }

  async allFire(u) {
    if (u.mc.en < ALLFIRE_EN) { this.log('エネルギーが足りない！'); return; }
    u.mc.en -= ALLFIRE_EN;
    this.updateHud(u);
    this.log(`${u.m.name}「全砲門、一斉発射ーっ！！」`);
    audio.sfx('charge');
    this.camIdle = false;
    const c = u.home.clone().add(V(0, 1.4, 0));
    const base = MACHINES[u.mc.type].seal ? MACHINES.alpha.seal[G.seal].glow : 1;
    await tween(1.3, (k) => {
      const a = Math.PI * 0.2 + k * Math.PI * 1.6;
      this.camera.position.set(c.x + Math.sin(a) * 5, c.y + 1.5 - k * 0.5, c.z + Math.cos(a) * 5);
      this.look.copy(c);
      setGlow(u.obj, base + k * 4);
      if (Math.random() < 0.3) this.fx.sparks(c.clone().add(V(rand(-1, 1), rand(-0.5, 1), rand(-1, 1))), 0x8affff, 2);
    });
    // 光が弾ける瞬間はスローモーション＋カメラがぐっと寄ってから引く
    audio.sfx('beam');
    timeScale.k = 0.3;
    const cp0 = this.camera.position.clone();
    this.fx.flash(c, 0xbff4ff, 5, 0.5);
    await tween(0.3, (k) => { this.camera.position.lerpVectors(cp0, c.clone().add(V(1.6, 0.6, 2.2)), Math.sin(k * Math.PI * 0.5)); this.look.copy(c); });
    timeScale.k = 1;
    this.fx.ring(u.home.clone().add(V(0, 0.2, 0)), 0x9fe8ff, 5, 0.7);
    this.fx.ring(u.home.clone().add(V(0, 1.2, 0)), 0xffe08a, 4, 0.6);
    // 撃っている間もカメラは回り続ける
    const ec = this.centerOf(this.aliveEnemies());
    const mid = ec.clone().lerp(u.home, 0.5);
    let spin = true;
    const t0 = this.t;
    const loop = () => {
      if (!spin) return;
      const a = (this.t - t0) * 0.7 + 0.6;
      this.camera.position.set(mid.x + Math.sin(a) * 9, 4.5, mid.z + Math.cos(a) * 9);
      this.look.copy(mid).add(V(0, 1, 0));
      if (Math.random() < 0.4) this.fx.sparks(u.obj.position.clone().add(V(rand(-1, 1), rand(0.5, 2.2), rand(-1, 1))), 0x9fe8ff, 1);
      requestAnimationFrame(loop);
    };
    loop();
    const slots = u.mc.slots.map((uid, i) => (uid ? i : -1)).filter((i) => i >= 0);
    for (const slot of slots) {
      const w = weaponByUid(u.mc.slots[slot]);
      const def = WEAPONS[w.id];
      const alive = this.aliveEnemies();
      if (!alive.length) break;
      const targets = def.target === 'one' ? [pick(alive)] : def.target === 'group' ? alive.filter((e) => e.key === pick(alive).key) : alive;
      const ctxA = { u, def, w, allfire: true, slot };
      const saved = this.camFollow;
      this.camFollow = () => {}; // 一斉発射中はカメラを回したままにする
      await this.fireWeapon(u, slot, def, targets, ctxA, true);
      this.camFollow = saved;
    }
    spin = false;
    // 最後の一撃はスローモーションで見せる
    if (!this.aliveEnemies().length) { timeScale.k = 0.35; await wait(0.25); timeScale.k = 1; }
    setGlow(u.obj, base);
    await this.returnHome(u);
    this.fx.shake = 1;
  }

  // ---------------------------------------------------------------- 敵の行動
  async doEnemy(e) {
    const def = e.def;
    if (def.flee && Math.random() < def.flee) {
      this.log(`${e.name}は逃げ出した！`);
      audio.sfx('flee');
      e.alive = false; e.fled = true;
      await tween(0.5, (k) => { e.obj.position.z = e.home.z - k * 12; e.obj.position.y = e.home.y + k * 2; });
      e.obj.visible = false;
      return;
    }
    const alive = this.aliveParty();
    if (!alive.length) return;
    let skill = null;
    for (const s of def.skills || []) if (Math.random() < s.chance) { skill = s; break; }
    const targets = skill?.target === 'all' ? alive : [pick(alive)];
    const fxKind = skill?.fx || def.fx;
    this.log(skill ? `${e.name}の${skill.name}！` : `${e.name}の攻撃！`);
    // カメラは敵の後ろから
    this.camIdle = false;
    const tp = targets.length > 1 ? V(0, 1, 3.4) : targets[0].obj.position.clone().add(V(0, 1, 0));
    await this.camTo(e.home.clone().add(V(e.home.x >= 0 ? 3 : -3, 3 + e.height * 0.3, -4.5 - e.height * 0.4)), tp.clone().lerp(e.home, 0.35), 0.45);
    const from = e.obj.position.clone().add(V(0, e.height * 0.55, 0.5));
    if (fxKind === 'claw' || fxKind === 'bite' || fxKind === 'drill') {
      const t0 = targets[0];
      const to = e.home.clone().lerp(t0.obj.position, 0.62);
      await tweenTo(e.obj.position, { x: to.x, z: to.z }, 0.25, Ease.in);
      audio.sfx(fxKind === 'drill' ? 'drill' : fxKind === 'bite' ? 'bite' : 'metalhit');
      for (const t of targets) { this.fx.claw(this.partyPoint(t), fxKind === 'bite' ? 0xff8080 : 0xffffff); if (fxKind === 'drill') this.fx.sparks(this.partyPoint(t), 0xffd080, 16); }
      await this.damageParty(e, targets, skill);
      await tweenTo(e.obj.position, { x: e.home.x, z: e.home.z }, 0.3);
    } else if (fxKind === 'press') {
      await tweenTo(e.obj.position, { y: e.home.y + 1.5 }, 0.3, Ease.out);
      await tweenTo(e.obj.position, { y: e.home.y }, 0.15, Ease.in);
      audio.sfx('press');
      this.fx.shake = 1.2;
      this.fx.ring(V(0, 0.1, 2.5), 0xffc080, 7, 0.6);
      for (const t of targets) { this.fx.smoke(t.obj.position.clone().add(V(0, 0.3, 0)), 1.5, 1, 0x9a8a70); this.fx.debris(t.obj.position.clone().add(V(0, 0.3, 0)), 5, 0x8a7a60, 3); }
      await this.damageParty(e, targets, skill);
    } else if (fxKind === 'missile') {
      audio.sfx('missile');
      await Promise.all(targets.map((t, i) => this.fx.missile(from, this.partyPoint(t), i * 0.1).then(() => { audio.sfx('explosion'); this.fx.explosion(this.partyPoint(t), 0.9); })));
      await this.damageParty(e, targets, skill);
    } else if (fxKind === 'beam') {
      audio.sfx('beam');
      await Promise.all(targets.map((t) => this.fx.beam(from, this.partyPoint(t), 0xff60e0, 0.25)));
      for (const t of targets) this.fx.explosion(this.partyPoint(t), 1.2, 0xff60e0);
      await this.damageParty(e, targets, skill);
    } else {
      audio.sfx(fxKind === 'laser' ? 'laser' : 'shot');
      await Promise.all(targets.map((t) => (fxKind === 'laser' ? this.fx.beam(from, this.partyPoint(t), 0xff4040, 0.05, 0.25) : this.fx.tracers(from, this.partyPoint(t), 0xffa060, 4, 0.3))));
      await this.damageParty(e, targets, skill);
    }
  }

  // 被弾：のけぞる（大きなダメージは後ろへ吹き飛んで戻る）
  async knockback(t, big) {
    if (t.busy) return;
    t.busy = true;
    const o = t.obj, h = t.home;
    try {
      if (big) {
        await tween(0.28, (k) => { o.position.z = h.z + k * 1.6; o.position.y = h.y + Math.sin(k * Math.PI) * 0.7; o.rotation.x = k * 0.5; }, Ease.out);
        this.fx.smoke(o.position.clone().add(V(0, 0.2, 0)), 1.2, 0.8, 0x9a8a70);
        await tween(0.4, (k) => { o.position.z = h.z + 1.6 * (1 - k); o.position.y = h.y; o.rotation.x = 0.5 * (1 - k); }, Ease.inOut);
      } else {
        await tween(0.22, (k) => { o.position.z = h.z + Math.sin(k * Math.PI) * 0.4; o.rotation.x = Math.sin(k * Math.PI) * 0.28; });
      }
    } finally { if (!t.m.ko) { o.position.x = h.x; o.position.z = h.z; o.rotation.x = 0; } t.busy = false; }
  }
  // 回避：横にスライドしてかわす
  async evade(t) {
    if (t.busy) return;
    t.busy = true;
    const o = t.obj, h = t.home, sd = Math.random() < 0.5 ? -1 : 1;
    try {
      await tween(0.16, (k) => { o.position.x = h.x + sd * 1.3 * k; o.rotation.z = -sd * 0.2 * k; }, Ease.out);
      await tween(0.3, (k) => { o.position.x = h.x + sd * 1.3 * (1 - k); o.rotation.z = -sd * 0.2 * (1 - k); }, Ease.inOut);
    } finally { o.position.x = h.x; o.rotation.z = 0; t.busy = false; }
  }

  async damageParty(e, targets, skill) {
    const def = e.def;
    const mul = skill?.mul || 1;
    for (const t of targets) {
      if (t.m.ko) continue;
      const st = memberStats(t.m);
      const evaT = t.mc ? machineStats(t.mc).eva + st.eva * 0.3 : st.eva;
      const p = this.partyPoint(t).add(V(0, 0.6, 0));
      if (Math.random() * 100 > clamp(def.hit + 5 - evaT, 20, 97)) {
        audio.sfx('miss'); this.fx.number(p, 'MISS', 'miss'); this.log(`${t.m.name}はひらりとかわした！`);
        this.evade(t);
        continue;
      }
      flashModel(t.obj, 0xff4030, 1.4);
      setTimeout(() => resetFlash(t.obj), 110);
      this.fx.shake = Math.max(this.fx.shake, 0.35);
      const big = (skill?.mul || 1) > 1.2 || def.boss;
      if (t.mc) {
        const ms = machineStats(t.mc);
        let dmg = def.atk * 2 * mul * rand(0.85, 1.15) - ms.def * 0.5;
        if (t.guard) dmg *= 0.5;
        dmg = Math.max(1, Math.round(dmg));
        t.mc.armor = Math.max(0, t.mc.armor - dmg);
        this.fx.number(p, `${dmg}`, 'armor');
        this.fx.sparks(this.partyPoint(t), 0xffd080, big ? 18 : 10);
        this.knockback(t, big || dmg >= ms.maxArmor * 0.2);
        this.log(`${machineName(t.mc)}の装甲に${dmg}のダメージ！`);
        if (t.mc.armor <= 0) await this.machineDown(t);
      } else {
        let dmg = def.atk * mul * rand(0.85, 1.15) - st.def * 0.5;
        if (t.guard) dmg *= 0.5;
        dmg *= 1 - st.dmgCut;
        dmg = Math.max(1, Math.round(dmg));
        t.m.hp = Math.max(0, t.m.hp - dmg);
        this.fx.number(p, `${dmg}`, 'hurt');
        if (t.m.hp > 0) this.knockback(t, big || dmg >= st.maxHp * 0.3);
        this.log(`${t.m.name}に${dmg}のダメージ！`);
        if (t.m.hp <= 0) {
          t.m.ko = true;
          this.log(`${t.m.name}は気絶した……`);
          tween(0.4, (k) => { t.obj.rotation.z = k * Math.PI / 2; t.obj.position.y = k * 0.2; });
        }
      }
      this.updateHud();
      await wait(0.18);
    }
    await wait(0.25);
  }

  // マシンの装甲が0になった：大破して乗っていた人は生身で戦う（戦闘後にレッカーで町へ）
  async machineDown(t) {
    const mc = t.mc;
    mc.broken = true;
    this.log(`${machineName(mc)}が大破した！ ${t.m.name}は脱出した！`);
    audio.sfx('bigexplosion');
    this.fx.explosion(this.partyPoint(t), 1.6);
    const old = t.obj;
    await tween(0.4, (k) => { old.rotation.x = -k * 0.4; old.position.y = -k * 0.3; });
    t.brokenMc = mc;
    t.mc = null;
    const char = this.makePartyObj(t);
    char.position.copy(t.home).add(V(0, 0, 0.9));
    char.rotation.y = Math.PI;
    this.scene.add(char);
    t.obj = char;
    // 壊れたマシンはその場に残す（煙を出す）
    old.position.x += 0.01;
    this.wrecks = [...(this.wrecks || []), old];
    t.home = char.position.clone();
  }

  // ---------------------------------------------------------------- 終わり
  async checkEnd() {
    if (!this.aliveEnemies().length) { await this.victory(); return true; }
    if (!this.aliveParty().length) { await this.defeat(); return true; }
    return false;
  }

  async tryEscape() {
    const pSpd = this.aliveParty().reduce((a, u) => a + memberStats(u.m).spd, 0) / Math.max(1, this.aliveParty().length);
    const eSpd = this.aliveEnemies().reduce((a, e) => a + e.def.spd, 0) / Math.max(1, this.aliveEnemies().length);
    if (this.boss) { this.log('賞金首からは逃げられない！'); audio.sfx('error'); await wait(0.6); return false; }
    const chance = clamp(0.55 + (pSpd - eSpd) * 0.03, 0.2, 0.95);
    this.log('逃げ出した……');
    if (Math.random() < chance) {
      audio.sfx('flee');
      this.over = true;
      for (const u of this.party) tweenTo(u.obj.position, { z: u.home.z + 6 }, 0.6, Ease.in);
      await wait(0.7);
      await this.finish([]);
      return true;
    }
    this.log('しかし、回りこまれてしまった！');
    await wait(0.6);
    return false;
  }

  async victory() {
    this.over = true;
    this.camIdle = false;
    audio.playSong('fanfare', { restart: true });
    // 勝利のポーズ
    const c = V(0, 1.2, 3.4);
    tween(2.2, (k) => {
      const a = Math.PI * 0.75 + k * 0.9;
      this.camera.position.set(Math.sin(a) * 8, 3 + k, c.z + Math.cos(a) * -8);
      this.look.copy(c);
    }, Ease.inOut);
    for (const u of this.aliveParty()) {
      const o = u.obj;
      tween(0.5, (k) => { o.position.y = Math.sin(k * Math.PI) * (u.mc ? 0.3 : 0.6); });
      o.rotation.y = 0;
      tween(0.5, (k) => { o.rotation.y = Math.PI * 2 * k + Math.PI; });
    }
    const killed = this.enemies.filter((e) => !e.fled);
    let exp = 0, gear = 0;
    const mats = {}, loot = [];
    for (const e of killed) {
      exp += e.def.exp;
      gear += Math.round(e.def.gear * rand(0.9, 1.1));
      for (const [id, rate, n] of e.def.drops || []) if (Math.random() < rate) mats[id] = (mats[id] || 0) + n;
      for (const [id, rate] of e.def.loot || []) if (Math.random() < rate) loot.push(id);
    }
    const lines = [];
    if (!killed.length) lines.push('敵はみんな逃げてしまった……。');
    else lines.push(`戦闘に勝った！　経験値 ${exp}　${gear} ギアを手に入れた。`);
    // アクセサリー・セット効果：ギア増加
    const gearUp = this.party.reduce((a, u) => a + memberStats(u.m).gearUp, 0);
    if (gearUp > 0 && gear > 0) { const add = Math.round(gear * gearUp); gear += add; lines[lines.length - 1] += `（ギアマグネット +${add}）`; }
    addGear(gear);
    for (const u of this.aliveParty()) {
      const st = memberStats(u.m);
      if (st.regen > 0) { const h = Math.round(st.maxHp * st.regen); u.m.hp = Math.min(st.maxHp, u.m.hp + h); lines.push(`${u.m.name}の自動救急パックが体力を${h}回復した。`); }
      if (st.machineRegen > 0) for (const p of this.party) if (p.mc && !p.mc.broken) { const mx = machineStats(p.mc).maxArmor; p.mc.armor = Math.min(mx, p.mc.armor + Math.round(mx * st.machineRegen)); }
    }
    for (const [id, n] of Object.entries(mats)) { addMat(id, n); lines.push(`${MATERIALS[id].name}を${n}個ひろった。`); }
    for (const id of loot) lines.push(`${receiveLoot(id)}を手に入れた！`);
    for (const u of this.aliveParty()) {
      const before = u.m.lv;
      const ups = gainExp(u.m, exp);
      if (ups) lines.push(`${u.m.name}はレベル${u.m.lv}に上がった！${before}→${u.m.lv}`);
    }
    const boss = killed.find((e) => e.def.bounty || e.def.flag);
    if (boss?.def.bounty) { G.bounties[boss.def.bounty] = 1; lines.push(`賞金首 ${boss.def.name} を倒した！ ハンターオフィスで賞金 ${BOUNTIES[boss.def.bounty].reward.toLocaleString()} ギアを受け取ろう。`); }
    if (boss?.def.flag) G.flags[boss.def.flag] = true;
    await wait(0.8);
    if (lines.some((l) => l.includes('レベル'))) audio.sfx('levelup');
    await ui.say(lines);
    await this.finish(lines, { bossDefeated: boss?.def });
  }

  async defeat() {
    this.over = true;
    audio.playSong('gameover', { restart: true });
    this.log('全滅してしまった……');
    await this.camTo(V(0, 10, 10), V(0, 0, 2), 1.5);
    await ui.say(['全滅してしまった……。', '……気がつくと、町に運ばれていた。']);
    await ui.fade(true, 0.8);
    flow.gameOver();
  }

  async finish(lines, info = {}) {
    // 大破したマシンはレッカーで町のガレージへ
    const towed = [];
    for (const u of this.party) {
      if (u.brokenMc) { u.brokenMc.loc = { type: 'garage', town: G.lastTown }; u.brokenMc.armor = 0; towed.push(machineName(u.brokenMc)); }
    }
    await ui.fade(true, 0.4);
    flow.toWorld({
      after: async () => {
        if (towed.length) await ui.say(`大破した${towed.join('、')}は、レッカーで町のガレージに運ばれた。（ガレージで修理代がかかります）`);
        if (info.bossDefeated) await flow.onBossDefeated(info.bossDefeated);
      },
    });
  }
}
