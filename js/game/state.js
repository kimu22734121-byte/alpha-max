// ゲームの状態（セーブされる中身）と、ステータス計算などのルール
import { CHARACTERS, LEVEL } from '../data/characters.js';
import { MACHINES } from '../data/machines.js';
import { PARTS, MODS, SLOT_INFO, HEAVY_ARM_WEAPON, MACHINE_TYPES } from '../data/parts.js';
import { WEAPONS, UPGRADE } from '../data/weapons.js';
import { ITEMS, MATERIALS, FOOT_GEAR } from '../data/items.js';
import { SAVE_VERSION } from '../core/save.js';

export const GEAR_MAX = 999999;
export let G = null;
export function setState(s) { G = s; }

export function newGame(names) {
  const s = {
    v: SAVE_VERSION,
    time: 0,
    gear: 300,
    party: ['ren'],
    members: {},
    machines: {},
    inv: { items: { kitS: 3, repS: 2, batS: 1 }, mats: {}, weapons: [], parts: {}, foot: {} },
    uid: 1,
    pos: { map: 'town1_shop', x: 6.5, y: 7.3, dir: Math.PI }, // レンの修理屋の中、アルファのそばから始まる
    lastTown: 'town1',
    flags: { visited: { town1: true } }, // visited：一度行った町（転送装置・ワープユニットで行ける）
    bounties: {},
    seal: 0,
    steps: 0,
    encGrace: 10, // 最初の数歩は敵が出ない
  };
  G = s;
  // 最初はレン1人。シオン（町2）とジーナ（町3）は加入イベントで仲間になる
  ['ren', 'shion', 'gina'].forEach((id, i) => {
    const c = CHARACTERS[id];
    s.members[id] = { id, name: names?.[i] || c.defaultName, lv: 1, exp: 0, hp: c.base.hp, ko: false, equip: { ...c.equip }, machine: id === 'ren' ? 'hound' : null, joined: id === 'ren' };
  });
  for (const [id, def] of Object.entries(MACHINES)) {
    const st0 = def.start;
    const mc = {
      id, owned: !!def.owned, parts: { ...def.parts }, slots: [null, null, null, null, null],
      mods: { frame: 0, engine: 0 }, broken: false,
      loc: st0.type === 'map' ? { type: 'map', map: st0.map, x: st0.x + 0.5, y: st0.y + 0.5, dir: 0 } : { type: st0.type, town: st0.town },
    };
    s.machines[id] = mc;
    def.weapons.forEach((w, i) => { if (w) mc.slots[i] = addWeapon(w.id, w.plus || 0, true); });
    const st = machineStats(mc);
    mc.armor = st.maxArmor;
    mc.en = st.maxEn;
  }
  return s;
}

// ---------------- 仲間 ----------------
export const member = (id) => G.members[id];
export const partyMembers = () => G.party.map((id) => G.members[id]);
export const charDef = (m) => CHARACTERS[m.id];

export function memberStats(m) {
  const c = CHARACTERS[m.id];
  const L = m.lv - 1;
  const w = FOOT_GEAR[m.equip.weapon] || {};
  const a = FOOT_GEAR[m.equip.armor] || {};
  return {
    maxHp: Math.min(LEVEL.hpMax, Math.round(c.base.hp + c.grow.hp * L)),
    atk: Math.round(c.base.atk + c.grow.atk * L),
    def: Math.round(c.base.def + c.grow.def * L + (a.def || 0)),
    hit: Math.round(c.base.hit + c.grow.hit * L + (w.hit || 0)),
    eva: Math.round(c.base.eva + c.grow.eva * L + (a.eva || 0)),
    spd: Math.round(c.base.spd + c.grow.spd * L),
    weaponAtk: w.atk || 0,
    weapon: w,
  };
}

// 経験値を足して、上がったレベルの数を返す
export function gainExp(m, n) {
  const before = memberStats(m).maxHp;
  m.exp += n;
  let ups = 0;
  while (m.lv < LEVEL.max && m.exp >= LEVEL.expFor(m.lv + 1)) { m.lv++; ups++; }
  if (ups && !m.ko) m.hp += memberStats(m).maxHp - before;
  return ups;
}
export const expToNext = (m) => (m.lv >= LEVEL.max ? 0 : LEVEL.expFor(m.lv + 1) - m.exp);

// ---------------- マシン ----------------
export const machine = (id) => G.machines[id];
export const machineDef = (mc) => MACHINES[mc.id];
export function machineName(mc) {
  const def = MACHINES[mc.id];
  if (mc.id === 'alpha') return def.seal[G.seal]?.finalName || def.name;
  return def.name;
}
export function sealInfo() { return MACHINES.alpha.seal[G.seal] || MACHINES.alpha.seal[0]; }

// マシンのタイプ（ボディの mtype で決まる）
export const machineType = (mc) => PARTS[mc.parts.body].mtype || 'balance';
export const typeInfo = (mc) => MACHINE_TYPES[machineType(mc)];
// タイプによる武器の重さ（重厚タイプは主砲・ミサイルが軽くなる）
export function weaponWeight(mc, def) {
  const t = typeInfo(mc);
  return t.wtCats?.includes(def.cat) ? Math.round(def.wt * t.wtRate * 10) / 10 : def.wt;
}
// タイプによる武器の威力倍率
export function typeBoost(mc, def) {
  const b = typeInfo(mc).boost || {};
  let k = b.all || 1;
  if (b[def.cat]) k *= b[def.cat];
  if (def.elem && b[def.elem]) k *= b[def.elem];
  return k;
}

export function machineStats(mc) {
  const p = Object.fromEntries(Object.entries(mc.parts).map(([k, v]) => [k, PARTS[v]]));
  const mul = mc.id === 'alpha' ? sealInfo().mul : 1;
  const t = typeInfo(mc);
  const sum = (k) => ['head', 'body', 'armR', 'armL', 'legs'].reduce((a, s) => a + (p[s]?.[k] || 0), 0);
  const weapons = mc.slots.map((uid) => (uid ? weaponByUid(uid) : null));
  const wWt = weapons.reduce((a, w) => a + (w ? weaponWeight(mc, WEAPONS[w.id]) : 0), 0);
  const capMods = MODS.engine.slice(0, mc.mods.engine).reduce((a, m) => a + m.cap, 0);
  const slots = Math.min(p.body.maxSlots || 5, (p.body.slots || 3) + mc.mods.frame);
  const st = {
    maxArmor: Math.min(9999, Math.round(sum('armor') * mul)),
    def: Math.round(sum('def') * mul),
    hit: (p.head.hit || 0) + Math.round(((p.armR.hit || 0) + (p.armL.hit || 0)) / 2),
    eva: (p.legs.eva || 0) + Math.round(((p.armR.eva || 0) + (p.armL.eva || 0)) / 2) + (t.eva || 0),
    spd: (p.legs.spd || 0) + (t.spd || 0),
    type: machineType(mc),
    typeName: t.name,
    scan: p.head.scan || 0,
    cap: (p.engine.cap || 40) + capMods,
    weight: Math.round((sum('wt') + wWt) * 10) / 10,
    maxEn: Math.round((p.engine.en || 50) * mul),
    slots,
    mul,
    armMul: { R: p.armR.atkMul || 1, L: p.armL.atkMul || 1 },
    power: { R: !!p.armR.power, L: !!p.armL.power },
    legType: p.legs.legType,
  };
  st.overweight = st.weight > st.cap;
  return st;
}

export function canPilot(m, mc) {
  const def = MACHINES[mc.id];
  if (mc.id === 'alpha' && (!mc.owned || G.seal < 1)) return false; // 封印中は動かない
  if (def.pilot === 'mechanic') return CHARACTERS[m.id].role === 'mechanic';
  return true;
}
export const pilotOf = (mcId) => partyMembers().find((m) => m.machine === mcId) || null;

// 武器のインスタンス（同じ武器を2つ持てるように uid で管理）
export function addWeapon(id, plus = 0, silentState = false) {
  const uid = `w${G.uid++}`;
  G.inv.weapons.push({ uid, id, plus });
  void silentState;
  return uid;
}
export const weaponByUid = (uid) => G.inv.weapons.find((w) => w.uid === uid);
export function weaponEquippedOn(uid) {
  for (const mc of Object.values(G.machines)) { const i = mc.slots.indexOf(uid); if (i >= 0) return { mc, slot: i }; }
  return null;
}
export function weaponAtk(w) { return Math.round(WEAPONS[w.id].atk * (1 + UPGRADE.atkRate * (w.plus || 0))); }
export const weaponLabel = (w) => `${WEAPONS[w.id].name}${w.plus ? `+${w.plus}` : ''}`;

// slot に武器を付けられるか
export function checkMount(mc, slot, w) {
  const st = machineStats(mc);
  if (slot >= st.slots) return 'このスロットはまだ使えない（フレーム強化で増える）';
  if (!w) return null;
  const def = WEAPONS[w.id];
  const info = SLOT_INFO[slot];
  if (def.mount !== info.mount) return info.mount === 'arm' ? '腕には機銃・特殊兵器（腕用）・ブレードを付ける' : '背中には主砲やミサイルを付ける';
  if (def.only && mc.id !== def.only) return `${MACHINES[def.only].name}専用の武器だ`;
  if (info.mount === 'arm' && def.wt > HEAVY_ARM_WEAPON && !st.power[info.side]) return '重すぎる。パワーアームが必要だ';
  const cur = mc.slots[slot] ? weaponWeight(mc, WEAPONS[weaponByUid(mc.slots[slot]).id]) : 0;
  if (st.weight - cur + weaponWeight(mc, def) > st.cap) return '重量オーバー（エンジン強化で積める重さが増える）';
  return null;
}

export function equipWeapon(mc, slot, uid) {
  const w = uid ? weaponByUid(uid) : null;
  const err = checkMount(mc, slot, w);
  if (err) return err;
  if (uid) { const on = weaponEquippedOn(uid); if (on) on.mc.slots[on.slot] = null; }
  mc.slots[slot] = uid;
  return null;
}

export function checkPart(mc, slotKey, partId) {
  const def = PARTS[partId];
  if (def.only && mc.id !== def.only) return `${MACHINES[def.only].name}専用のパーツだ`;
  const before = machineStats(mc);
  const old = mc.parts[slotKey];
  mc.parts[slotKey] = partId;
  const after = machineStats(mc);
  mc.parts[slotKey] = old;
  if (after.weight > after.cap) return '重量オーバー';
  void before;
  return null;
}
export function equipPart(mc, slotKey, partId) {
  const err = checkPart(mc, slotKey, partId);
  if (err) return err;
  const old = mc.parts[slotKey];
  if (old && !PARTS[old].only) G.inv.parts[old] = (G.inv.parts[old] || 0) + 1;
  G.inv.parts[partId]--;
  if (G.inv.parts[partId] <= 0) delete G.inv.parts[partId];
  mc.parts[slotKey] = partId;
  const st = machineStats(mc);
  mc.armor = Math.min(mc.armor, st.maxArmor);
  mc.en = Math.min(mc.en, st.maxEn);
  return null;
}

// ---------------- お金・道具 ----------------
export function addGear(n) { G.gear = Math.max(0, Math.min(GEAR_MAX, G.gear + n)); }
export function addItem(id, n = 1) { G.inv.items[id] = (G.inv.items[id] || 0) + n; if (G.inv.items[id] <= 0) delete G.inv.items[id]; }
export function addMat(id, n = 1) { G.inv.mats[id] = (G.inv.mats[id] || 0) + n; if (G.inv.mats[id] <= 0) delete G.inv.mats[id]; }
export function addPart(id, n = 1) { G.inv.parts[id] = (G.inv.parts[id] || 0) + n; }
export function addFoot(id, n = 1) { G.inv.foot[id] = (G.inv.foot[id] || 0) + n; if (G.inv.foot[id] <= 0) delete G.inv.foot[id]; }
export const hasMats = (req) => Object.entries(req).every(([k, n]) => (G.inv.mats[k] || 0) >= n);
export const matsText = (req) => Object.entries(req).map(([k, n]) => `${MATERIALS[k].name}×${n}（${G.inv.mats[k] || 0}）`).join(' ');

// 拾ったもの（武器・パーツ・道具のどれか）を受け取る
export function receiveLoot(id) {
  if (WEAPONS[id]) { addWeapon(id); return WEAPONS[id].name; }
  if (PARTS[id]) { addPart(id); return PARTS[id].name; }
  if (ITEMS[id]) { addItem(id); return ITEMS[id].name; }
  if (FOOT_GEAR[id]) { addFoot(id); return FOOT_GEAR[id].name; }
  return id;
}

// 全員回復（宿屋）
export function healParty() {
  for (const m of partyMembers()) { m.ko = false; m.hp = memberStats(m).maxHp; }
}
export function repairMachine(mc) {
  const st = machineStats(mc);
  mc.armor = st.maxArmor; mc.en = st.maxEn; mc.broken = false;
}

export function machinesOnMap(mapId) {
  return Object.values(G.machines).filter((mc) => mc.owned && mc.loc.type === 'map' && mc.loc.map === mapId);
}
export function hiddenMachinesOnMap(mapId) {
  return Object.values(G.machines).filter((mc) => !mc.owned && mc.loc.type === 'map' && mc.loc.map === mapId);
}
export function machinesInGarage(town) {
  return Object.values(G.machines).filter((mc) => mc.owned && mc.loc.type === 'garage' && mc.loc.town === town);
}

export function locationLabel() {
  return G.pos.map;
}

// 宝箱・家具の中身を受け取る。受け取った物の名前を返す
// c: { gear } / { item, n } / { mat, n } / { weapon } / { part } / { foot }
export function giveLoot(c) {
  if (c.gear) { addGear(c.gear); return `${c.gear.toLocaleString()} ギア`; }
  if (c.item) { addItem(c.item, c.n || 1); return `${ITEMS[c.item].name}${(c.n || 1) > 1 ? `×${c.n}` : ''}`; }
  if (c.mat) { addMat(c.mat, c.n || 1); return `${MATERIALS[c.mat].name}${(c.n || 1) > 1 ? `×${c.n}` : ''}`; }
  if (c.weapon) { addWeapon(c.weapon); return WEAPONS[c.weapon].name; }
  if (c.part) { addPart(c.part); return PARTS[c.part].name; }
  if (c.foot) { addFoot(c.foot); return FOOT_GEAR[c.foot].name; }
  return '';
}
