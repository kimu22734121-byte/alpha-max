// 格納庫（ガレージ）の一覧と展示台
//  ・一覧：マシン／パーツを絞り込み（タイプ・分類・部位・テスト入手の印）・並べ替え（名前・強さ・入手順）・まとめ表示（「アルファ ×2」）
//    同じ物は1行にまとめ、タップすると1台・1個ずつの一覧（強化の状態つき）が開く。持てる数に上限はない
//  ・展示台：選んだマシンを「見るだけ」で出す（回転・拡大）。今使っているマシンとステータスを比べ、「乗り換える」を押したときだけ乗る機体が変わる
// ガレージの建物の中に実際に並べるのは、仲間が使っているマシンと展示台の1台だけ（台数が増えても重くならない）
import { ui, esc, GEAR, fmt } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { createStage } from '../core/preview.js';
import { MACHINES } from '../data/machines.js';
import { PARTS, SLOT_INFO, MODS } from '../data/parts.js';
import { WEAPONS } from '../data/weapons.js';
import { MAPS } from '../data/maps.js';
import {
  G, partyMembers, machineStats, machineName, weaponByUid, weaponLabel, weaponAtk, canPilot, TEST_MARK,
} from '../game/state.js';
import { buildMachineModel } from '../models/mech.js';
import { machineSpec } from './world.js';
import { compareTable, partDesc, rangeBadge, partSlots, weaponSlots } from './menus.js';

// ---------------- 並べ替え・絞り込みの材料 ----------------
const KIND = (mc) => (MACHINES[mc.type].secret ? 'secret' : mc.type === 'alpha' ? 'legend' : 'normal');
const KIND_NAME = { normal: '通常', legend: '伝説', secret: 'シークレット' };
function machinePower(mc) {
  const st = machineStats(mc);
  const atk = mc.slots.reduce((a, uid) => { const w = uid && weaponByUid(uid); return a + (w ? weaponAtk(w) : 0); }, 0);
  return Math.round(st.maxArmor + st.def * 4 + st.hit * 2 + st.eva * 2 + atk * 2);
}
const partPower = (p) => Math.round((p.armor || 0) + (p.def || 0) * 4 + (p.hit || 0) * 2 + (p.eva || 0) * 2 + (p.spd || 0) * 4 + (p.cap || 0) * 3 + (p.en || 0) * 2 + ((p.atkMul || 1) - 1) * 200 + (p.slots || 0) * 20);
const order = (mc) => Object.keys(G.machines).indexOf(mc.id);
const pilotOfMc = (mc) => partyMembers().find((m) => m.machine === mc.id);
const where = (mc) => (mc.loc.type === 'garage' ? `${MAPS[mc.loc.town]?.name || ''}のガレージ` : mc.loc.type === 'party' ? '出撃中' : mc.loc.type === 'map' ? `${MAPS[mc.loc.map]?.name || ''}に駐車` : '修理屋');
const modText = (mc) => {
  const best = Math.max(0, ...mc.slots.map((uid) => weaponByUid(uid)?.plus || 0));
  return `フレーム+${mc.mods.frame}・エンジン+${mc.mods.engine}${best ? `・武器最大+${best}` : ''}`;
};

// 絞り込み・並べ替えの状態（ゲーム中は覚えておく）
const state = {
  tab: 'machines',
  m: { type: 'all', kind: 'all', test: 'all', sort: 'order' },
  p: { slot: 'all', test: 'all', sort: 'order' },
};
const CHIPS = {
  m: [
    ['type', '種類', { all: 'すべて', heavy: '重厚', balance: 'バランス', sharp: 'シャープ', legend: '伝説' }],
    ['kind', '分類', { all: 'すべて', normal: '通常', legend: '伝説', secret: 'シークレット' }],
    ['test', '印', { all: 'すべて', test: 'テスト入手', real: 'テスト以外' }],
    ['sort', '並び', { order: '入手順', name: '名前順', power: '強さ順' }],
  ],
  p: [
    ['slot', '部位', { all: 'すべて', head: '頭', body: 'ボディ', arm: '腕', legs: '脚', engine: 'エンジン' }],
    ['test', '印', { all: 'すべて', test: 'テスト入手', real: 'テスト以外' }],
    ['sort', '並び', { order: '入手順', name: '名前順', power: '強さ順' }],
  ],
};

function machineGroups() {
  const f = state.m;
  let list = Object.values(G.machines).filter((mc) => mc.owned);
  if (f.type !== 'all') list = list.filter((mc) => machineStats(mc).type === f.type);
  if (f.kind !== 'all') list = list.filter((mc) => KIND(mc) === f.kind);
  if (f.test !== 'all') list = list.filter((mc) => !!mc.test === (f.test === 'test'));
  const groups = {};
  for (const mc of list) (groups[mc.type] ||= []).push(mc);
  const out = Object.entries(groups).map(([type, mcs]) => ({ type, mcs, name: MACHINES[type].name, power: Math.max(...mcs.map(machinePower)), order: Math.min(...mcs.map(order)) }));
  const by = { order: (a, b) => a.order - b.order, name: (a, b) => a.name.localeCompare(b.name, 'ja'), power: (a, b) => b.power - a.power }[f.sort];
  out.sort(by);
  for (const g of out) g.mcs.sort(f.sort === 'power' ? (a, b) => machinePower(b) - machinePower(a) : (a, b) => order(a) - order(b));
  return out;
}
// パーツ：持ち物と、マシンに付いているもの
function partGroups() {
  const f = state.p;
  let list = G.inv.parts.map((p, i) => ({ ...p, on: null, i }));
  Object.values(G.machines).filter((mc) => mc.owned).forEach((mc, k) => {
    for (const [slot, id] of Object.entries(mc.parts)) list.push({ uid: mc.partInst?.[slot]?.uid, id, test: !!mc.partInst?.[slot]?.test, on: { mc, slot }, i: 100000 + k });
  });
  if (f.slot !== 'all') list = list.filter((p) => PARTS[p.id].slot === f.slot);
  if (f.test !== 'all') list = list.filter((p) => !!p.test === (f.test === 'test'));
  const groups = {};
  for (const p of list) (groups[`${p.id}|${p.test ? 1 : 0}`] ||= []).push(p);
  const out = Object.values(groups).map((ps) => ({ id: ps[0].id, test: ps[0].test, ps, name: PARTS[ps[0].id].name, power: partPower(PARTS[ps[0].id]), order: Math.min(...ps.map((p) => p.i)) }));
  const by = { order: (a, b) => a.order - b.order, name: (a, b) => a.name.localeCompare(b.name, 'ja'), power: (a, b) => b.power - a.power }[f.sort];
  return out.sort(by);
}

// ---------------- 一覧の画面 ----------------
export function hangarList(world) {
  return ui.custom({
    className: 'hangar-panel',
    build: (panel, done) => {
      panel.innerHTML = `<div class="menu-title">格納庫の一覧</div>
        <div class="hg-tabs"><button data-tab="machines">マシン</button><button data-tab="parts">パーツ</button></div>
        <div class="hg-chips"></div><div class="hg-count"></div><div class="hg-list"></div>
        <button class="menu-close">✕</button>`;
      const chips = panel.querySelector('.hg-chips'), listEl = panel.querySelector('.hg-list'), count = panel.querySelector('.hg-count');
      const open = new Set();
      panel.querySelector('.menu-close').addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cancel'); done(null); });
      for (const b of panel.querySelectorAll('.hg-tabs button')) b.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cursor'); state.tab = b.dataset.tab; draw(); });
      const draw = () => {
        for (const b of panel.querySelectorAll('.hg-tabs button')) b.classList.toggle('on', b.dataset.tab === state.tab);
        const key = state.tab === 'machines' ? 'm' : 'p';
        chips.innerHTML = CHIPS[key].map(([k, label, opts]) => `<div class="hg-row"><span>${label}</span>${Object.entries(opts).map(([v, n]) => `<button class="chip${state[key][k] === v ? ' on' : ''}" data-k="${k}" data-v="${v}">${n}</button>`).join('')}</div>`).join('');
        for (const c of chips.querySelectorAll('.chip')) c.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cursor'); state[key][c.dataset.k] = c.dataset.v; draw(); });
        listEl.innerHTML = '';
        if (state.tab === 'machines') {
          const gs = machineGroups();
          count.textContent = `${gs.reduce((a, g) => a + g.mcs.length, 0)}台（${gs.length}種類）`;
          for (const g of gs) {
            const row = document.createElement('button');
            row.className = 'hg-item';
            const one = g.mcs[0];
            row.innerHTML = `<span class="hg-name">${esc(g.name)}${g.mcs.length > 1 ? ` <b class="hg-n">×${g.mcs.length}</b>` : ''}${g.mcs.some((m) => m.test) ? ` ${TEST_MARK}` : ''}</span>
              <span class="hg-sub">${esc(machineStats(one).typeName)}・${KIND_NAME[KIND(one)]}　強さ${g.power}</span><span class="hg-arrow">${g.mcs.length > 1 ? (open.has(g.type) ? '▲' : '▼') : '›'}</span>`;
            row.addEventListener('click', async (e) => {
              e.stopPropagation(); audio.sfx('cursor');
              if (g.mcs.length === 1) { await machineViewer(world, one); draw(); return; }
              if (open.has(g.type)) open.delete(g.type); else open.add(g.type);
              draw();
            });
            listEl.appendChild(row);
            if (g.mcs.length > 1 && open.has(g.type)) {
              for (const mc of g.mcs) {
                const sub = document.createElement('button');
                sub.className = 'hg-item hg-inst';
                const st = machineStats(mc), p = pilotOfMc(mc);
                sub.innerHTML = `<span class="hg-name">${esc(machineName(mc))}${mc.test ? ` ${TEST_MARK}` : ''}${mc.broken ? ' <b class="warn">大破</b>' : ''}</span>
                  <span class="hg-sub">装甲${mc.armor}/${st.maxArmor}　${esc(modText(mc))}　${esc(where(mc))}${p ? `　乗る人：${esc(p.name)}` : ''}</span><span class="hg-arrow">›</span>`;
                sub.addEventListener('click', async (e) => { e.stopPropagation(); audio.sfx('ok'); await machineViewer(world, mc); draw(); });
                listEl.appendChild(sub);
              }
            }
          }
        } else {
          const gs = partGroups();
          count.textContent = `${gs.reduce((a, g) => a + g.ps.length, 0)}個（${gs.length}種類）`;
          for (const g of gs) {
            const key2 = `${g.id}|${g.test ? 1 : 0}`;
            const row = document.createElement('button');
            row.className = 'hg-item';
            const free = g.ps.filter((p) => !p.on).length;
            row.innerHTML = `<span class="hg-name">${esc(g.name)} <b class="hg-n">×${g.ps.length}</b>${g.test ? ` ${TEST_MARK}` : ''}</span>
              <span class="hg-sub">${{ head: '頭', body: 'ボディ', arm: '腕', legs: '脚', engine: 'エンジン' }[PARTS[g.id].slot]}　強さ${g.power}　持ち物${free}・装着${g.ps.length - free}</span><span class="hg-arrow">${open.has(key2) ? '▲' : '▼'}</span>`;
            row.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cursor'); if (open.has(key2)) open.delete(key2); else open.add(key2); draw(); });
            listEl.appendChild(row);
            if (open.has(key2)) {
              const d = document.createElement('div'); d.className = 'hg-detail'; d.innerHTML = partDesc(PARTS[g.id]); listEl.appendChild(d);
              for (const p of g.ps) {
                const sub = document.createElement('div');
                sub.className = 'hg-item hg-inst';
                sub.innerHTML = `<span class="hg-name">${esc(g.name)}<small>　#${esc(String(p.uid || '').replace(/^p/, ''))}</small></span><span class="hg-sub">${p.on ? `${esc(machineName(p.on.mc))}に装着中` : '持ち物'}</span>`;
                listEl.appendChild(sub);
              }
            }
          }
        }
        if (!listEl.children.length) listEl.innerHTML = '<div class="shop-empty">条件に合うものがありません</div>';
      };
      draw();
    },
  });
}

// ---------------- 展示台（見るだけ。乗り換えは「乗り換える」を押したときだけ） ----------------
export function machineViewer(world, mc) {
  const town = MAPS[G.pos.map]?.town || G.lastTown;
  // ガレージの建物の中の展示台にも出す
  (G.flags.garageShow ||= {})[town] = mc.id;
  world?.refreshShowcases?.();
  let who = pilotOfMc(mc) ? partyMembers().find((m) => m.machine !== mc.id) || partyMembers()[0] : partyMembers()[0];
  return ui.custom({
    className: 'viewer-panel',
    build: (panel, done, onClose) => {
      panel.innerHTML = `<div class="menu-title">展示台：${esc(machineName(mc))}${mc.test ? ` ${TEST_MARK}` : ''}</div>
        <div class="vw-body"><div class="vw-stage"><div class="st-stage"></div><div class="vw-using"></div>
        <div class="vw-zoom"><button data-z="-1">−</button><button data-z="1">＋</button></div></div><div class="vw-side"></div></div>`;
      const stage = createStage(panel.querySelector('.st-stage'), { count: 1 });
      stage.set(0, buildMachineModel(machineSpec(mc)), { height: 1.6 });
      onClose(() => stage.dispose());
      for (const b of panel.querySelectorAll('.vw-zoom button')) b.addEventListener('click', (e) => { e.stopPropagation(); stage.zoomBy(Number(b.dataset.z) > 0 ? 0.85 : 1.18); });
      const side = panel.querySelector('.vw-side'), using = panel.querySelector('.vw-using');
      const draw = () => {
        const cur = who?.machine && G.machines[who.machine]?.owned ? G.machines[who.machine] : null;
        using.innerHTML = `<small>使用中（${esc(who?.name || '')}）</small><br>${cur ? esc(machineName(cur)) : '生身'}`;
        const st = machineStats(mc);
        const a = cur ? machineStats(cur) : null;
        const rows = [['装甲', a?.maxArmor ?? 0, st.maxArmor], ['防御', a?.def ?? 0, st.def], ['命中', a?.hit ?? 0, st.hit], ['回避', a?.eva ?? 0, st.eva], ['スピード', a?.spd ?? 0, st.spd], ['EN', a?.maxEn ?? 0, st.maxEn], ['積める重さ', a?.cap ?? 0, st.cap], ['スロット', a?.slots ?? 0, st.slots], ['強さ', cur ? machinePower(cur) : 0, machinePower(mc)]];
        const here = mc.loc.type === 'garage' && mc.loc.town === town;
        const riding = who && who.machine === mc.id;
        const canRide = who && canPilot(who, mc) && !mc.broken;
        side.innerHTML = `<div class="vw-info">${esc(st.typeName)}タイプ・${KIND_NAME[KIND(mc)]}　${esc(where(mc))}<br>${esc(modText(mc))}　装甲${mc.armor}/${st.maxArmor}</div>
          <div class="vw-who">乗る人：${partyMembers().map((m) => `<button class="chip${m === who ? ' on' : ''}" data-m="${m.id}">${esc(m.name)}</button>`).join('')}</div>
          <div class="cmp-head">使用中 → この機体</div>${compareTable(rows)}
          <div class="cmp-head">パーツ</div><div class="vw-list">${Object.entries(mc.parts).map(([k, id]) => `<div>${{ head: '頭', body: 'ボディ', armR: '右腕', armL: '左腕', legs: '脚', engine: 'エンジン' }[k]}：${esc(PARTS[id].name)}${mc.partInst?.[k]?.test ? ` ${TEST_MARK}` : ''}</div>`).join('')}</div>
          <div class="cmp-head">武器</div><div class="vw-list">${SLOT_INFO.map((info, i) => { const w = mc.slots[i] && weaponByUid(mc.slots[i]); return `<div>${info.name}：${w ? `${esc(weaponLabel(w))} ${rangeBadge(WEAPONS[w.id])}` : '<small>なし</small>'}</div>`; }).join('')}</div>
          <div class="vw-btns">
            ${here ? `<button class="shop-act vw-ride"${riding || !canRide ? ' disabled' : ''}>${riding ? `${esc(who.name)}が使用中` : !canRide ? (mc.broken ? '大破している（修理が必要）' : 'この人は乗れない') : '乗り換える'}</button>` : '<button class="shop-act vw-move">このガレージに移す</button>'}
            <button class="menu-item vw-parts"${here ? '' : ' disabled'}>パーツを付け替える</button><button class="menu-item vw-weapons"${here ? '' : ' disabled'}>武器を付け替える</button><button class="menu-item vw-close">閉じる</button>
          </div>`;
        for (const c of side.querySelectorAll('.vw-who .chip')) c.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cursor'); who = G.members[c.dataset.m]; draw(); });
        side.querySelector('.vw-ride')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!(await ui.confirm(`${esc(who.name)}の乗るマシンを ${esc(cur ? machineName(cur) : '生身')} から ${esc(machineName(mc))} に乗り換えますか？`, '乗り換える', 'やめる'))) return;
          // ほかの人が乗っていた機体なら、2人の機体を入れ替える
          const other = partyMembers().find((m) => m.machine === mc.id);
          if (other) other.machine = who.machine;
          who.machine = mc.id;
          audio.sfx('repair');
          stage.flash(0);
          ui.toast(`${who.name}が${machineName(mc)}に乗り換えた`);
          world?.build?.();
          draw();
        });
        side.querySelector('.vw-move')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!(await ui.confirm(`${esc(machineName(mc))}をこのガレージに移しますか？（無料）`, '移す', 'やめる'))) return;
          mc.loc = { type: 'garage', town };
          audio.sfx('warp');
          world?.build?.();
          draw();
        });
        side.querySelector('.vw-parts')?.addEventListener('click', async (e) => { e.stopPropagation(); await partSlots(mc); stage.set(0, buildMachineModel(machineSpec(mc)), { height: 1.6 }); world?.refreshShowcases?.(); draw(); });
        side.querySelector('.vw-weapons')?.addEventListener('click', async (e) => { e.stopPropagation(); await weaponSlots(mc); stage.set(0, buildMachineModel(machineSpec(mc)), { height: 1.6 }); world?.refreshShowcases?.(); draw(); });
        side.querySelector('.vw-close').addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cancel'); done(null); });
      };
      draw();
    },
  });
}
export { MODS, GEAR, fmt };
