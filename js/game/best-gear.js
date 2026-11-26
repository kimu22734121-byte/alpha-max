// 「最強」：いま持っている物の中から、いちばん強い装備に自動で付け替える（v1.3〜）
//  生身の装備（武器・頭・体・手・足・アクセサリー）、マシンのパーツ（頭・ボディ・腕・脚・エンジン）と武器（6か所＋胸のコア）
//  強さの比べ方は下の SCORE の重み。ほかのマシンに付いている武器・パーツは取らない（空いている物と、そのマシンに付いている物だけ使う）
import { G, partyMembers, memberStats, machineStats, canWearFoot, addFoot, checkPart, equipPart, checkMount, equipWeapon, weaponByUid, weaponEquippedOn, weaponAtk, weaponLocked, FOOT_SLOT_KEYS } from './state.js';
import { FOOT_GEAR } from '../data/items.js';
import { PARTS, SLOT_INFO } from '../data/parts.js';
import { WEAPONS } from '../data/weapons.js';

const SCORE = {
  foot: (st) => (st.atk + st.weaponAtk) * 2 + st.def * 1.5 + st.maxHp * 0.25 + st.hit * 0.5 + st.eva * 0.8 + st.spd * 0.5 + st.crit * 1.5 + st.regen * 2 + (st.set ? 80 : 0),
  machine: (st) => (st.overweight ? -1e6 : 0) + st.maxArmor * 0.08 + st.def * 2 + st.hit + st.eva * 1.2 + st.spd * 0.8 + st.maxEn * 0.1 + st.cap * 0.3 + st.slots * 40,
  // 武器：威力 × 範囲（複数に当たる武器は少し高く見る）
  weapon: (w, mc) => (weaponLocked(w, mc) ? 0 : weaponAtk(w, mc) * ({ one: 1, group: 1.2, all: 1.35 }[WEAPONS[w.id].target] || 1)),
};
const PART_KEYS = ['body', 'engine', 'legs', 'head', 'armR', 'armL'];

// 生身：1人分。付け替えた数を返す
export function bestFoot(m) {
  let changed = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (const k of FOOT_SLOT_KEYS) {
      const cur = m.equip[k];
      const cands = Object.entries(G.inv.foot).filter(([id, n]) => n > 0 && FOOT_GEAR[id]?.slot === k && canWearFoot(m, id)).map(([id]) => id);
      let best = cur, bestS = SCORE.foot(memberStats(m)) + 0.001;
      for (const id of cands) {
        const s = SCORE.foot(memberStats({ ...m, equip: { ...m.equip, [k]: id } }));
        if (s > bestS) { best = id; bestS = s; }
      }
      if (best !== cur) {
        if (cur) addFoot(cur, 1);
        addFoot(best, -1);
        m.equip[k] = best;
        changed++;
      }
    }
  }
  m.hp = Math.min(m.hp, memberStats(m).maxHp);
  return changed;
}

// マシン：パーツ → 武器の順。付け替えた数を返す
export function bestMachine(mc) {
  let changed = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (const k of PART_KEYS) {
      const want = k.startsWith('arm') ? 'arm' : k;
      const ids = [...new Set(G.inv.parts.filter((p) => PARTS[p.id]?.slot === want).map((p) => p.id))];
      const cur = mc.parts[k];
      let best = null, bestS = SCORE.machine(machineStats(mc)) + 0.001;
      for (const id of ids) {
        if (id === cur || checkPart(mc, k, id)) continue;
        const s = SCORE.machine(machineStats({ ...mc, parts: { ...mc.parts, [k]: id } }));
        if (s > bestS) { best = id; bestS = s; }
      }
      if (best) {
        const inst = G.inv.parts.find((p) => p.id === best && !p.test) || G.inv.parts.find((p) => p.id === best);
        if (!equipPart(mc, k, inst.uid)) changed++;
      }
    }
  }
  // 使えなくなったスロット（フレームが変わって減った）の武器は外す
  const st = machineStats(mc);
  mc.slots.forEach((uid, i) => { if (uid && !SLOT_INFO[i].core && i >= st.slots) { mc.slots[i] = null; changed++; } });
  // 武器：強い武器から順に、付けられるいちばんいい場所へ
  const usable = (w) => { const on = weaponEquippedOn(w.uid); return !on || on.mc === mc; };
  const slots = SLOT_INFO.map((info, i) => i).filter((i) => (SLOT_INFO[i].core ? st.core : i < st.slots));
  const free = G.inv.weapons.filter(usable).sort((a, b) => SCORE.weapon(b, mc) - SCORE.weapon(a, mc));
  for (let pass = 0; pass < 2; pass++) {
    for (const i of slots) {
      const curW = mc.slots[i] ? weaponByUid(mc.slots[i]) : null;
      const curS = curW ? SCORE.weapon(curW, mc) : 0;
      const w = free.find((x) => x.uid !== mc.slots[i] && SCORE.weapon(x, mc) > curS + 0.001 && !mc.slots.includes(x.uid) && !checkMount(mc, i, x));
      if (w && !equipWeapon(mc, i, w.uid)) changed++;
    }
  }
  const after = machineStats(mc);
  mc.armor = Math.min(mc.armor, after.maxArmor);
  mc.en = Math.min(mc.en, after.maxEn);
  return changed;
}

// 仲間全員：生身の装備と、乗っているマシン
export function bestAll() {
  let n = 0;
  for (const m of partyMembers()) {
    n += bestFoot(m);
    const mc = m.machine ? G.machines[m.machine] : null;
    if (mc?.owned) n += bestMachine(mc);
  }
  return n;
}
