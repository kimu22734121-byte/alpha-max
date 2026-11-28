// ゲームの状態（セーブされる中身）と、ステータス計算などのルール
import { CHARACTERS, LEVEL } from '../data/characters.js';
import { MACHINES } from '../data/machines.js';
import { PARTS, MODS, SLOT_INFO, HEAVY_ARM_WEAPON, MACHINE_TYPES, NORMAL_SLOTS } from '../data/parts.js';
import { devSession } from '../data/debug.js';
import { WEAPONS, UPGRADE } from '../data/weapons.js';
import { ITEMS, MATERIALS, FOOT_GEAR } from '../data/items.js';
import { SETS, FAVORITE_RANGE, FAVORITE_BONUS } from '../data/footgear.js';
import { SAVE_VERSION } from '../core/save.js';
import { currentChapter } from '../data/chapters.js';

export const GEAR_MAX = 999999;
export let G = null;
export function setState(s) { G = s; }

export function newGame(names, opts = {}) {
  const s = {
    v: SAVE_VERSION,
    time: 0,
    gear: 300,
    party: ['ren'],
    members: {},
    machines: {},
    inv: { items: { kitS: 3, repS: 2, batS: 1 }, mats: {}, weapons: [], parts: [], foot: {} },
    testGot: { foot: {}, items: {}, mats: {}, gear: 0 }, // 開発者の部屋で「テスト入手」した数（リセット用）
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
    if (!def.start) continue; // 物語に出てこないマシン（開発者の部屋や先の章で手に入る）
    const st0 = def.start;
    const loc = st0.type === 'map' ? { type: 'map', map: st0.map, x: st0.x + 0.5, y: st0.y + 0.5, dir: 0 } : { type: st0.type, town: st0.town };
    createMachine(id, { key: id, owned: !!def.owned, loc });
  }
  // 2回目からの「伝説の機体をすべて最強にして始める」（v2.0〜）：アルファは最初からアルファマックス。
  // オメガ・ガイアも最初からラストヘイヴンのガレージにいて、3機ともフレーム・エンジン強化が最大、武器は+5
  if (opts.legend) {
    s.flags.legendStart = true;
    s.flags.omegaFound = true;
    s.flags.gaiaFound = true;
    if (!s.machines.gaia) createMachine('gaia', { key: 'gaia' });
    for (const id of ['alpha', 'omega', 'gaia']) {
      const mc = s.machines[id];
      mc.owned = true;
      mc.loc = { type: 'garage', town: 'town1' };
      mc.mods = { frame: MODS.frame.length, engine: MODS.engine.length };
      for (const uid of mc.slots) { const w = uid && weaponByUid(uid); if (w) w.plus = UPGRADE.maxPlus; }
      const st = machineStats(mc);
      mc.armor = st.maxArmor; mc.en = st.maxEn;
    }
    s.members.ren.machine = 'alpha';
  }
  return s;
}

// ---------------- 仲間 ----------------
export const member = (id) => G.members[id];
export const partyMembers = () => G.party.map((id) => G.members[id]);
export const charDef = (m) => CHARACTERS[m.id];

export const FOOT_SLOT_KEYS = ['weapon', 'head', 'body', 'hands', 'feet', 'acc'];

// 4つそろった専用防具のセット（無ければ null）
export function setOf(m) {
  const ids = ['head', 'body', 'hands', 'feet'].map((k) => FOOT_GEAR[m.equip[k]]);
  const set = ids[0]?.set;
  if (!set || !ids.every((g) => g?.set === set)) return null;
  // 4つとも最終段階なら、強化されたセット効果（数値アップ＋特殊効果）
  return ids.every((g) => (g.stage || 1) >= 2) && SETS[set].final ? { ...SETS[set], ...SETS[set].final, stage: 2 } : SETS[set];
}
// その装備を装備できるか（専用装備は本人だけ）
export const canWearFoot = (m, id) => { const g = FOOT_GEAR[id]; return !!g && (!g.only || g.only === m.id); };
// オメガが仲間のマシンとして動いているか（シオンの専用銃が連動する）
export const omegaActive = () => Object.values(G.machines).some((mc) => mc.type === 'omega' && mc.owned && mc.loc.type !== 'map');

export function memberStats(m) {
  const c = CHARACTERS[m.id];
  const L = m.lv - 1;
  const gear = FOOT_SLOT_KEYS.map((k) => FOOT_GEAR[m.equip[k]]).filter(Boolean);
  const sum = (k) => gear.reduce((a, g) => a + (g[k] || 0), 0);
  const w = FOOT_GEAR[m.equip.weapon] || {};
  const set = setOf(m);
  const sb = set?.bonus || {};
  // 武器の威力：得意な攻撃範囲ならボーナス、オメガ連動の専用銃はオメガがいると上がる
  const fav = (w.target || 'one') === FAVORITE_RANGE[m.id];
  let watk = (w.atk || 0) * (fav ? FAVORITE_BONUS : 1);
  if (w.link === 'omega' && omegaActive()) watk *= 1.3 * (set?.linkMul || 1);
  const maxHp = Math.round((c.base.hp + c.grow.hp * L + sum('hp')) * (set?.hpMul || 1));
  return {
    maxHp: Math.min(LEVEL.hpMax, maxHp),
    atk: Math.round(c.base.atk + c.grow.atk * L + (sum('atk') - (w.atk || 0)) + (sb.atk || 0)),
    def: Math.round(c.base.def + c.grow.def * L + sum('def')),
    hit: Math.round(c.base.hit + c.grow.hit * L + sum('hit')),
    eva: Math.round(c.base.eva + c.grow.eva * L + sum('eva') + (sb.eva || 0)),
    spd: Math.round(c.base.spd + c.grow.spd * L + sum('spd')),
    crit: sum('crit') + (sb.crit || 0),
    weaponAtk: Math.round(watk),
    favorite: fav,
    weapon: w,
    set,
    dmgCut: set?.dmgCut || 0,
    repairMul: set?.repairMul || 1,
    machineRegen: set?.machineRegen || 0,
    regen: sum('regen'),
    partyRegen: set?.partyRegen || 0,
    firstStrike: !!set?.firstStrike,
    guts: !!set?.guts,
    gearUp: sum('gearUp'),
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
// マシンは1台ずつ別のもの（G.machines のキー＝mc.id が1台ごとの固有ID、mc.type がマシンの種類＝MACHINES のキー）
// 物語で手に入る最初の1台はキーが種類と同じ（'hound' など）。2台目以降は 'hound_12' のようなキーになる
export const machine = (id) => G.machines[id];
export const machineDef = (mc) => MACHINES[mc.type];
export function createMachine(type, { key, owned = true, loc, test = false } = {}) {
  const def = MACHINES[type];
  const id = key || `${type}_${G.uid++}`;
  const mc = {
    id, type, owned, test, parts: { ...def.parts }, partInst: {}, slots: [null, null, null, null, null, null, null],
    mods: { frame: 0, engine: 0 }, broken: false, loc: loc || { type: 'garage', town: G.lastTown || 'town1' },
  };
  for (const k of Object.keys(mc.parts)) mc.partInst[k] = { uid: `p${G.uid++}`, test };
  G.machines[id] = mc;
  def.weapons.forEach((w, i) => { if (w) mc.slots[i] = addWeapon(w.id, w.plus || 0, test); });
  const st = machineStats(mc);
  mc.armor = st.maxArmor;
  mc.en = st.maxEn;
  return mc;
}
// 名前：同じ種類を2台以上持っているときは「アルファ（1）」「アルファ（2）」
export function machineName(mc) {
  const def = MACHINES[mc.type];
  let name = mc.name || (mc.type === 'alpha' ? def.seal[alphaSeal()]?.finalName || def.name : def.name);
  const same = Object.values(G.machines).filter((m) => m.owned && m.type === mc.type);
  const i = same.indexOf(mc);
  if (same.length > 1 && i >= 0) name += `（${i + 1}）`;
  return name;
}
// 開発者の部屋で出したもの（テスト入手）の印
export const TEST_MARK = '<b class="testmark">テスト</b>';
export const testTag = (x) => (x?.test ? ` ${TEST_MARK}` : '');
export function sealInfo() { return MACHINES.alpha.seal[alphaSeal()] || MACHINES.alpha.seal[0]; }

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

// 封印の段階（アルファ）。展示台の機体は sealOverride で段階を切り替えて見られる
// 伝説の機体をすべて最強にして始めたとき（legendStart）は、物語の封印とは別にアルファはいつもアルファマックス
export const alphaSeal = () => (G?.flags?.legendStart ? 4 : G.seal);
export const sealOf = (mc) => (mc?.sealOverride ?? alphaSeal());
// ステラ・ブレイカーの段階（v1.5〜）：章で決まる。第1・2章＝0（撃てない）、第3章＝1 … 第6章＝4、第6章クリア後＝5
// 展示台の機体（sealOverride）は封印の段階から読みかえる
export function stellaStage(mc) {
  if (mc?.sealOverride != null) return [0, 1, 2, 4, 5][mc.sealOverride] ?? 0;
  if (G?.flags?.legendStart) return 5;
  return Math.max(0, Math.min(5, currentChapter(G) - 2));
}
// 段階で進化するパーツ（アルファの外装）：stages[段階] の値で上書きする
export function partNow(id, mc) {
  const p = PARTS[id];
  if (!p?.stages) return p;
  const st = p.stages[Math.min(p.stages.length - 1, p.evolveBy === 'seal' ? sealOf(mc) : 0)];
  return { ...p, ...st, name: `${p.name}【${st.name}】`, stageName: st.name };
}
// アルファだけの胸のコア（第7の専用スロット）があるか
export const hasCoreSlot = (mc) => !!PARTS[mc.parts.body]?.coreSlot;

export function machineStats(mc) {
  const p = Object.fromEntries(Object.entries(mc.parts).map(([k, v]) => [k, partNow(v, mc)]));
  const mul = mc.type === 'alpha' ? (MACHINES.alpha.seal[sealOf(mc)] || MACHINES.alpha.seal[0]).mul : 1;
  const t = typeInfo(mc);
  const sum = (k) => ['head', 'body', 'armR', 'armL', 'legs'].reduce((a, s) => a + (p[s]?.[k] || 0), 0);
  const weapons = mc.slots.map((uid) => (uid ? weaponByUid(uid) : null));
  const wWt = weapons.reduce((a, w) => a + (w ? weaponWeight(mc, WEAPONS[w.id]) : 0), 0);
  const capMods = MODS.engine.slice(0, mc.mods.engine).reduce((a, m) => a + m.cap, 0);
  const slots = Math.min(p.body.maxSlots || NORMAL_SLOTS, NORMAL_SLOTS, (p.body.slots || 3) + mc.mods.frame);
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
    core: hasCoreSlot(mc),
  };
  st.overweight = st.weight > st.cap;
  return st;
}

export function canPilot(m, mc) { return !pilotError(m, mc); }
// 乗れないときの理由（乗れるなら null）
export function pilotError(m, mc) {
  const def = MACHINES[mc.type];
  if (mc.type === 'alpha' && (!mc.owned || sealOf(mc) < 1)) return 'アルファは封印されていて動かない';
  if (devSession.anyPilot) return null; // 開発者の部屋のテスト用スイッチ
  if (m.id === 'ren') return null; // 主人公のレンは、すべてのマシンに乗れる
  if (def.pilots && !def.pilots.includes(m.id)) return `このマシンには乗れません（${def.name}は${def.pilots.map((k) => G.members[k]?.name || CHARACTERS[k].defaultName).join('・')}専用）`;
  return null;
}
export const pilotOf = (mcId) => partyMembers().find((m) => m.machine === mcId) || null;

// 武器のインスタンス（同じ武器を2つ持てるように uid で管理）
export function addWeapon(id, plus = 0, test = false) {
  const uid = `w${G.uid++}`;
  G.inv.weapons.push(test ? { uid, id, plus, test: true } : { uid, id, plus });
  return uid;
}
// 試し撃ち用の一時的な武器（セーブには入らない）
export const TEMP_WEAPONS = new Map();
export const weaponByUid = (uid) => TEMP_WEAPONS.get(uid) || G.inv.weapons.find((w) => w.uid === uid);
export function weaponEquippedOn(uid) {
  for (const mc of Object.values(G.machines)) { const i = mc.slots.indexOf(uid); if (i >= 0) return { mc, slot: i }; }
  return null;
}
// 武器の威力。ステラ・ブレイカーは封印の段階で進化する（mc を渡すとその機体の段階）
export function weaponAtk(w, mc) {
  const def = WEAPONS[w.id];
  const base = def.sealAtk ? def.sealAtk[Math.min(def.sealAtk.length - 1, stellaStage(mc))] : def.atk;
  return Math.round(base * (1 + UPGRADE.atkRate * (w.plus || 0)));
}
// 撃てない武器（ステラ・ブレイカーの封印中）
export const weaponLocked = (w, mc) => { const def = WEAPONS[w.id]; return !!def.sealAtk && !def.sealAtk[stellaStage(mc)]; };
export const weaponLabel = (w) => `${WEAPONS[w.id].name}${w.plus ? `+${w.plus}` : ''}`;

// slot に武器を付けられるか
export function checkMount(mc, slot, w) {
  const st = machineStats(mc);
  const info = SLOT_INFO[slot];
  if (info.core && !st.core) return '胸のコアはアルファだけの専用スロットだ';
  if (!info.core && slot >= st.slots) return 'このスロットはまだ使えない（フレーム強化で増える）';
  if (!w) return null;
  const def = WEAPONS[w.id];
  if (info.core && def.mount !== 'core') return '胸のコアにはステラ・ブレイカーしか付けられない';
  if (!info.core && def.mount === 'core') return 'ステラ・ブレイカーは胸のコア（第7の専用スロット）に付ける';
  if (def.mount !== 'any' && def.mount !== info.mount && !info.core) return info.mount === 'arm' ? '腕には機銃・近接・特殊兵器（腕用）を付ける' : '肩と背中には主砲・ミサイル・特殊兵器（背中用）を付ける';
  if (def.only && mc.type !== def.only) return `${MACHINES[def.only].name}専用の武器だ`;
  if (info.mount === 'arm' && def.mount !== 'any' && def.wt > HEAVY_ARM_WEAPON && !st.power[info.side]) return '重すぎる。パワーアームが必要だ';
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

// パーツは1個ずつ別のもの：G.inv.parts は [{ uid, id, test }]。マシンに付いているパーツは mc.parts（種類）と mc.partInst（その1個）
export const partCount = (id, test) => G.inv.parts.filter((p) => p.id === id && (test == null || !!p.test === test)).length;
export function checkPart(mc, slotKey, partId) {
  const def = PARTS[partId];
  if (def.only && mc.type !== def.only) return `${MACHINES[def.only].name}専用のパーツだ`;
  const old = mc.parts[slotKey];
  mc.parts[slotKey] = partId;
  const after = machineStats(mc);
  mc.parts[slotKey] = old;
  if (after.weight > after.cap) return '重量オーバー';
  return null;
}
// partUid：持ち物のパーツの uid（種類のIDを渡したときは、その種類の最初の1個）
export function equipPart(mc, slotKey, partUid) {
  const inst = G.inv.parts.find((p) => p.uid === partUid) || G.inv.parts.find((p) => p.id === partUid);
  if (!inst) return 'そのパーツを持っていない';
  const err = checkPart(mc, slotKey, inst.id);
  if (err) return err;
  const old = mc.parts[slotKey], oldInst = mc.partInst?.[slotKey];
  if (old) G.inv.parts.push({ uid: oldInst?.uid || `p${G.uid++}`, id: old, ...(oldInst?.test ? { test: true } : {}) });
  G.inv.parts = G.inv.parts.filter((p) => p !== inst);
  mc.parts[slotKey] = inst.id;
  (mc.partInst ||= {})[slotKey] = { uid: inst.uid, test: !!inst.test };
  const st = machineStats(mc);
  mc.armor = Math.min(mc.armor, st.maxArmor);
  mc.en = Math.min(mc.en, st.maxEn);
  return null;
}

// ---------------- お金・道具 ----------------
export function addGear(n) { G.gear = Math.max(0, Math.min(GEAR_MAX, G.gear + n)); }
export function addItem(id, n = 1) { G.inv.items[id] = (G.inv.items[id] || 0) + n; if (G.inv.items[id] <= 0) delete G.inv.items[id]; }
export function addMat(id, n = 1) { G.inv.mats[id] = (G.inv.mats[id] || 0) + n; if (G.inv.mats[id] <= 0) delete G.inv.mats[id]; }
export function addPart(id, n = 1, test = false) { for (let i = 0; i < n; i++) G.inv.parts.push(test ? { uid: `p${G.uid++}`, id, test: true } : { uid: `p${G.uid++}`, id }); }
export function removePart(id, n = 1, test) {
  for (let i = 0; i < n; i++) {
    const k = G.inv.parts.findIndex((p) => p.id === id && (test == null || !!p.test === test));
    if (k < 0) break;
    G.inv.parts.splice(k, 1);
  }
}
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
  // マシンが丸ごと入った大きな宝箱（いちばん近い町のガレージに運ばれる）
  if (c.machine) { const mc = createMachine(c.machine, { loc: { type: 'garage', town: G.lastTown || 'town1' } }); return `マシン「${machineName(mc)}」（町のガレージに運ばれた）`; }
  return '';
}

// ---------------- テスト入手（開発者の部屋） ----------------
// マシン・パーツ・マシンの武器は1つずつ test の印を付ける。生身の装備・道具・素材・ギアは個数なので、テストで増やした数を G.testGot に覚えておく
export function testGot() { return (G.testGot ||= { foot: {}, items: {}, mats: {}, gear: 0 }); }
export function addTest(kind, id, n = 1) {
  const t = testGot();
  if (kind === 'machine') return createMachine(id, { test: true, loc: { type: 'garage', town: G.lastTown || 'town1' } });
  if (kind === 'part') return addPart(id, n, true);
  if (kind === 'weapon') { for (let i = 0; i < n; i++) addWeapon(id, 0, true); return null; }
  if (kind === 'foot') { addFoot(id, n); t.foot[id] = (t.foot[id] || 0) + n; return null; }
  if (kind === 'item') { addItem(id, n); t.items[id] = (t.items[id] || 0) + n; return null; }
  if (kind === 'mat') { addMat(id, n); t.mats[id] = (t.mats[id] || 0) + n; return null; }
  if (kind === 'gear') { const before = G.gear; addGear(n); t.gear += G.gear - before; return null; }
  return null;
}
export const testFootCount = (id) => G.testGot?.foot?.[id] || 0;
// テスト入手したものだけを消す（ゲームを進めて手に入れたものは残す）
export function resetTestItems() {
  const t = testGot();
  const out = { machines: 0, parts: 0, weapons: 0 };
  // マシン：乗っている人は降ろす
  for (const mc of Object.values(G.machines)) {
    if (!mc.test) continue;
    for (const m of Object.values(G.members)) if (m.machine === mc.id) m.machine = null;
    delete G.machines[mc.id];
    out.machines++;
  }
  // マシンに付いているテストのパーツは、そのマシンの元のパーツに戻す
  for (const mc of Object.values(G.machines)) {
    for (const [k, inst] of Object.entries(mc.partInst || {})) {
      if (!inst?.test) continue;
      mc.parts[k] = MACHINES[mc.type].parts[k];
      mc.partInst[k] = { uid: `p${G.uid++}` };
      out.parts++;
    }
    mc.slots = mc.slots.map((uid) => (uid && G.inv.weapons.find((w) => w.uid === uid)?.test ? null : uid));
    const st = machineStats(mc);
    mc.armor = Math.min(mc.armor, st.maxArmor); mc.en = Math.min(mc.en, st.maxEn);
  }
  out.parts += G.inv.parts.filter((p) => p.test).length;
  G.inv.parts = G.inv.parts.filter((p) => !p.test);
  out.weapons = G.inv.weapons.filter((w) => w.test).length;
  G.inv.weapons = G.inv.weapons.filter((w) => !w.test);
  // 生身の装備：持ち物から引き、足りなければ装備から外す
  for (const [id, n] of Object.entries(t.foot)) {
    let left = n;
    const have = G.inv.foot[id] || 0;
    const take = Math.min(have, left);
    addFoot(id, -take); left -= take;
    for (const m of Object.values(G.members)) for (const k of FOOT_SLOT_KEYS) if (left > 0 && m.equip[k] === id) { m.equip[k] = null; left--; }
  }
  for (const [id, n] of Object.entries(t.items)) addItem(id, -Math.min(n, G.inv.items[id] || 0));
  for (const [id, n] of Object.entries(t.mats)) addMat(id, -Math.min(n, G.inv.mats[id] || 0));
  addGear(-Math.min(t.gear, G.gear));
  G.testGot = { foot: {}, items: {}, mats: {}, gear: 0 };
  for (const m of Object.values(G.members)) m.hp = Math.min(m.hp, memberStats(m).maxHp);
  return out;
}
