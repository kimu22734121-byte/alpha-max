// 開発者の部屋（デバッグ・バランス調整用）
//  ・入手端末（42）：マシン・パーツ・武器・生身の装備・道具・素材・ギアを「テスト入手」として手に入れる／テスト入手だけを全部リセット
//  ・ロボットの展示台（38）：パーツを自由に付け替えて見た目を確認、数値・色・光を調整、試し撃ち
//  ・キャラの展示台（41）：生身の装備を自由に付け替えて見た目を確認、数値を調整、試し撃ち
// 一覧はすべて js/data/catalog.js から自動で作る（データに足したものは自動でここに出る）
import { ui, esc, GEAR, fmt } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { createStage } from '../core/preview.js';
import { CATALOG, entries, groupsOf } from '../data/catalog.js';
import { MACHINES } from '../data/machines.js';
import { PARTS, SLOT_INFO } from '../data/parts.js';
import { WEAPONS, WEAPON_CATS } from '../data/weapons.js';
import { FOOT_GEAR, FOOT_SLOTS } from '../data/footgear.js';
import { CHARACTERS } from '../data/characters.js';
import { MAPS } from '../data/maps.js';
import { DEV_ROOM } from '../data/debug.js';
import {
  G, addTest, resetTestItems, machineStats, memberStats, TEMP_WEAPONS, partCount, testFootCount, FOOT_SLOT_KEYS,
} from '../game/state.js';
import { buildMachineModel } from '../models/mech.js';
import { buildCharModel } from '../models/char-look.js';
import { machineSpec } from './world.js';
import { flow } from '../game/flow.js';
import { rangeBadge, weaponDesc, partDesc, footDesc, editTuningRow, exportTuningUI } from './menus.js';

// =====================================================================
// 入手端末（42）
// =====================================================================
let agreed = false; // この部屋に入ってから一度確認したか
async function agree() {
  if (agreed) return true;
  agreed = await ui.confirm('ここで出したものには「テスト入手」の印が付き、ゲームを進めて手に入れたものとは区別されます。あとで「入手したものを全部リセット」でテスト入手の分だけを消せます。追加しますか？', '追加する', 'やめる');
  return agreed;
}
const N = () => DEV_ROOM.itemCount;
const countIn = {
  machines: (id) => Object.values(G.machines).filter((m) => m.owned && m.type === id).length,
  parts: (id) => partCount(id),
  weapons: (id) => G.inv.weapons.filter((w) => w.id === id).length,
  foot: (id) => G.inv.foot[id] || 0,
  items: (id) => G.inv.items[id] || 0,
  mats: (id) => G.inv.mats[id] || 0,
};
const KIND = { parts: 'part', weapons: 'weapon', foot: 'foot', items: 'item', mats: 'mat' };
const DESC = { parts: (r) => partDesc(r), weapons: (r) => weaponDesc(r), foot: (r) => footDesc(r), items: (r) => esc(r.desc || ''), mats: (r) => esc(r.desc || '') };
const LABEL = { weapons: (r) => `${WEAPON_CATS[r.cat].icon} ${esc(r.name)} ${rangeBadge(r)}`, foot: (r) => `${FOOT_SLOTS[r.slot].icon} ${esc(r.name)}${r.only ? ' <b class="excl">専用</b>' : ''}` };

// 種類（catalog のキー）と、グループ（頭・ボディなど）を選んで、1つずつ／全部まとめて追加
async function addFrom(key, group) {
  const n = key === 'items' || key === 'mats' ? N() : 1;
  for (;;) {
    const list = entries(key, group);
    const v = await ui.menu({
      title: `${CATALOG[key].name}${group ? `：${CATALOG[key].groups[group]}` : ''}`, wide: true, desc: true,
      items: [{ label: `<b>全種類を一括で追加</b>（${list.length}種類×${n}）`, value: '__all' }, { separator: true, label: '1つずつ選んで追加' },
        ...list.map(([id, r]) => ({ label: LABEL[key] ? LABEL[key](r) : esc(r.name), right: `持${countIn[key](id)}`, value: id, desc: DESC[key](r) }))],
    });
    if (!v) return;
    if (!(await agree())) return;
    if (v === '__all') { for (const [id] of list) addTest(KIND[key], id, n); audio.sfx('levelup'); ui.toast(`${list.length}種類をテスト入手した`); continue; }
    addTest(KIND[key], v, n);
    audio.sfx('buy');
    ui.toast(`${esc(CATALOG[key].table[v].name)}${n > 1 ? `×${n}` : ''}をテスト入手した`);
  }
}
async function pickGroup(key) {
  for (;;) {
    const g = await ui.menu({ title: CATALOG[key].name, items: groupsOf(key).map(([k, name]) => ({ label: name, right: `${entries(key, k).length}種類`, value: k })) });
    if (!g) return;
    await addFrom(key, g);
  }
}

export async function devStore() {
  for (;;) {
    const town = MAPS[G.lastTown]?.name || '';
    const v = await ui.menu({
      title: '入手端末（テストプレイ用）', wide: true,
      header: 'ここで出したものには「テスト入手」の印が付きます。リセットするとテスト入手の分だけが消えます',
      items: [
        { label: `マシン（${town}のガレージに追加）`, value: 'machines', right: `${entries('machines').length}種類` },
        { label: 'マシンのパーツ（頭・ボディ・腕・脚・エンジン）', value: 'parts' },
        { label: 'マシンの武器（腕・背中）', value: 'weapons' },
        { label: '生身の装備（武器・頭・体・手・足・アクセサリー）', value: 'foot' },
        { label: `道具（${N()}個ずつ）`, value: 'items' },
        { label: `素材（${N()}個ずつ）`, value: 'mats' },
        { label: 'ギア（お金）', value: 'gear' },
        { separator: true, label: '' },
        { label: '<b class="warn">入手したものを全部リセット</b>', value: 'reset' },
        { label: '出る', value: null },
      ],
    });
    if (!v) return;
    if (v === 'machines') await addMachines();
    if (v === 'parts' || v === 'weapons' || v === 'foot') await pickGroup(v);
    if (v === 'items' || v === 'mats') await addFrom(v);
    if (v === 'gear') {
      const g = await ui.menu({ title: 'ギアを増やす', header: `所持 ${GEAR}${fmt(G.gear)}`, items: [...DEV_ROOM.gearButtons.map((x) => ({ label: `${GEAR}${fmt(x)}`, value: x })), { label: '最大（999,999）', value: 999999 }] });
      if (g && (await agree())) { addTest('gear', g); audio.sfx('levelup'); ui.toast(`所持ギア ${fmt(G.gear)}`); }
    }
    if (v === 'reset') {
      if (!(await ui.confirm('テスト入手したもの（マシン・パーツ・武器・装備・道具・素材・ギア）を全部消しますか？ ゲームを進めて手に入れたものは消えません。', 'リセットする', 'やめる'))) continue;
      const r = resetTestItems();
      audio.sfx('cancel');
      await ui.say(`テスト入手したものを消した。（マシン${r.machines}台・パーツ${r.parts}個・武器${r.weapons}個と、装備・道具・素材・ギア）`);
    }
  }
}
async function addMachines() {
  for (;;) {
    const id = await ui.menu({
      title: 'マシン：選ぶとガレージに追加', wide: true, desc: true,
      items: entries('machines').map(([mid, d]) => ({ label: `${esc(d.name)}${d.chapter ? ` <small>（第${d.chapter}章〜）</small>` : ''}`, right: `持${countIn.machines(mid)}台`, value: mid, desc: `${esc(d.desc)}<br><small>${esc(Object.values(d.parts).map((p) => PARTS[p].name).join('・'))}</small>` })),
    });
    if (!id) return;
    if (!(await agree())) return;
    if (!(await ui.confirm(`${esc(MACHINES[id].name)}を「テスト入手」として${esc(MAPS[G.lastTown]?.name || '')}のガレージに追加しますか？`, '追加する', 'やめる'))) continue;
    addTest('machine', id);
    audio.sfx('levelup');
    ui.toast(`${esc(MACHINES[id].name)}がガレージに入った（テスト入手）`);
  }
}

// =====================================================================
// 展示台（38・41）
// =====================================================================
// ロボットの展示台の組み合わせ（ゲームを起動している間だけ。セーブには入らない）
const robot = { type: 'hound', parts: { ...MACHINES.hound.parts }, weapons: MACHINES.hound.weapons.map((w) => w?.id || null) };
const chara = { id: 'ren', equip: null };
let tmpId = 0;
function tempMachine() {
  const slots = robot.weapons.map((wid) => {
    if (!wid) return null;
    const uid = `tw${++tmpId}`;
    TEMP_WEAPONS.set(uid, { uid, id: wid, plus: 0 });
    return uid;
  });
  const mc = { id: '__test', type: robot.type, owned: true, parts: { ...robot.parts }, partInst: {}, slots, mods: { frame: 3, engine: 5 }, broken: false, loc: { type: 'party' } };
  const st = machineStats(mc);
  mc.armor = st.maxArmor; mc.en = st.maxEn;
  return mc;
}
export const robotModel = () => buildMachineModel(machineSpec(tempMachine()));
function tempMember() {
  const base = G.members[chara.id];
  const m = { ...base, id: chara.id, equip: { ...(chara.equip || base.equip) }, ko: false, machine: null };
  m.hp = memberStats(m).maxHp;
  return m;
}
export const charModel = () => buildCharModel(tempMember());

const ROBOT_ROWS = [['head', '頭', 'head'], ['body', 'ボディ', 'body'], ['armR', '右腕', 'arm'], ['armL', '左腕', 'arm'], ['legs', '脚', 'legs'], ['engine', 'エンジン', 'engine']];

// 展示台の画面：左に3D、右に操作。closeReason が 'fire' なら試し撃ちへ
function stationUI({ title, model, rows, info, onFire, kind }) {
  return ui.custom({
    className: 'station-panel',
    build: (panel, done, onClose) => {
      panel.innerHTML = `<div class="menu-title">${title}</div><div class="st-body"><div class="st-stage"></div><div class="st-side"></div></div>`;
      const stage = createStage(panel.querySelector('.st-stage'), { count: 1 });
      stage.set(0, model(), { height: kind === 'char' ? 1.3 : 1.6 });
      onClose(() => stage.dispose());
      const side = panel.querySelector('.st-side');
      const refresh = async (swap) => {
        if (swap) await stage.swap(0, model(), { height: kind === 'char' ? 1.3 : 1.6 }); else stage.set(0, model(), { height: kind === 'char' ? 1.3 : 1.6 });
        draw();
      };
      const draw = () => {
        side.innerHTML = '';
        for (const r of rows()) {
          if (r.head) { const h = document.createElement('div'); h.className = 'st-head'; h.innerHTML = r.head; side.appendChild(h); continue; }
          const row = document.createElement('div'); row.className = 'st-row';
          row.innerHTML = `<span class="st-k">${r.label}</span><button class="st-v">${r.value}</button>${r.tune ? '<button class="st-t">数値</button>' : ''}`;
          row.querySelector('.st-v').addEventListener('click', async (e) => { e.stopPropagation(); if (await r.pick()) { audio.sfx('repair'); await refresh(true); } });
          row.querySelector('.st-t')?.addEventListener('click', async (e) => { e.stopPropagation(); await r.tune(() => {}); await refresh(false); });
          side.appendChild(row);
        }
        const st = document.createElement('div'); st.className = 'st-info'; st.innerHTML = info(); side.appendChild(st);
        const btns = document.createElement('div'); btns.className = 'st-btns';
        btns.innerHTML = '<button class="shop-act st-fire">試し撃ち</button><button class="menu-item st-exp">数値を書き出す</button><button class="menu-item st-close">閉じる</button>';
        btns.querySelector('.st-fire').addEventListener('click', async (e) => { e.stopPropagation(); const f = await onFire(); if (f) done(f); });
        btns.querySelector('.st-exp').addEventListener('click', async (e) => { e.stopPropagation(); await exportTuningUI(); });
        btns.querySelector('.st-close').addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cancel'); done(null); });
        side.appendChild(btns);
      };
      draw();
    },
  });
}

// 的の並び（単体＝1体／グループ＝3体／全体＝5体）
const TARGETS = { one: '単体の的（1体）', group: 'グループの的（3体）', all: '全体の的（5体）' };
async function pickTargets() {
  return ui.menu({ title: 'どの的に撃つ？', items: Object.entries(TARGETS).map(([k, n]) => ({ label: n, value: k })) });
}

// ---- ロボットの展示台（38）
export async function robotStation(world) {
  const r = await stationUI({
    kind: 'robot',
    title: 'ロボットの展示台',
    model: robotModel,
    rows: () => {
      const out = [{ head: '機体' }, {
        label: '機体', value: esc(MACHINES[robot.type].name),
        pick: async () => {
          const id = await ui.menu({ title: '機体を選ぶ（パーツと武器も入れ替わる）', wide: true, items: entries('machines').map(([k, d]) => ({ label: esc(d.name), value: k, right: `<small>${esc(d.desc)}</small>` })) });
          if (!id) return false;
          robot.type = id; robot.parts = { ...MACHINES[id].parts }; robot.weapons = MACHINES[id].weapons.map((w) => w?.id || null);
          return true;
        },
        tune: () => editTuningRow('machines', robot.type),
      }, { head: 'パーツ（数値＝そのパーツの装甲・重さ・スピード・スロット数など）' }];
      for (const [k, name, slot] of ROBOT_ROWS) {
        out.push({
          label: name, value: esc(PARTS[robot.parts[k]].name),
          pick: async () => {
            const id = await ui.menu({ title: `${name}を付け替える`, wide: true, desc: true, items: entries('parts', slot).map(([pid, p]) => ({ label: esc(p.name), value: pid, right: pid === robot.parts[k] ? '今' : '', desc: partDesc(p) })) });
            if (!id) return false;
            robot.parts[k] = id; return true;
          },
          tune: () => editTuningRow('parts', robot.parts[k]),
        });
      }
      out.push({ head: '武器（数値＝威力・EN消費・重さ・範囲など）' });
      SLOT_INFO.forEach((info, i) => {
        const wid = robot.weapons[i];
        out.push({
          label: info.name, value: wid ? `${esc(WEAPONS[wid].name)} ${rangeBadge(WEAPONS[wid])}` : '<small>なし</small>',
          pick: async () => {
            const id = await ui.menu({ title: `${info.name}の武器`, wide: true, desc: true, items: [{ label: '外す', value: '__none' }, ...entries('weapons', info.mount).map(([w, d]) => ({ label: `${WEAPON_CATS[d.cat].icon} ${esc(d.name)} ${rangeBadge(d)}`, value: w, right: w === wid ? '今' : '', desc: weaponDesc(d) }))] });
            if (!id) return false;
            robot.weapons[i] = id === '__none' ? null : id; return true;
          },
          tune: wid ? () => editTuningRow('weapons', wid) : null,
        });
      });
      return out;
    },
    info: () => {
      const st = machineStats(tempMachine());
      return `<b>${esc(st.typeName)}タイプ</b>　装甲${st.maxArmor}　防御${st.def}　命中+${st.hit}　回避${st.eva}　スピード${st.spd}　EN${st.maxEn}　重さ${st.weight}/${st.cap}${st.weight > st.cap ? ' <b class="warn">重量オーバー</b>' : ''}　スロット${st.slots}`;
    },
    onFire: async () => {
      const mc = tempMachine();
      const k = await pickTargets();
      return k ? { fire: 'robot', kind: k, mc } : null;
    },
  });
  if (r?.fire) await startTest(world, r);
}

// ---- キャラの展示台（41）
export async function charStation(world) {
  if (!chara.equip) chara.equip = { ...G.members[chara.id].equip };
  const r = await stationUI({
    kind: 'char',
    title: '生身のキャラの展示台',
    model: charModel,
    rows: () => {
      const out = [{ head: 'キャラ' }, {
        label: 'キャラ', value: esc(G.members[chara.id].name),
        pick: async () => {
          const id = await ui.menu({ title: 'キャラを選ぶ', items: Object.keys(CHARACTERS).map((k) => ({ label: esc(G.members[k].name), right: CHARACTERS[k].roleName, value: k })) });
          if (!id) return false;
          chara.id = id; chara.equip = { ...G.members[id].equip }; return true;
        },
      }, { head: '装備（数値＝攻撃・防御・命中・攻撃範囲など）' }];
      for (const k of FOOT_SLOT_KEYS) {
        const cur = chara.equip[k];
        out.push({
          label: FOOT_SLOTS[k].name, value: cur ? `${esc(FOOT_GEAR[cur].name)}${k === 'weapon' ? ` ${rangeBadge({ target: FOOT_GEAR[cur].target || 'one' })}` : ''}` : '<small>なし</small>',
          pick: async () => {
            const id = await ui.menu({ title: `${FOOT_SLOTS[k].name}を付け替える`, wide: true, desc: true, items: [{ label: '外す', value: '__none' }, ...entries('foot', k).map(([fid, f]) => ({ label: `${esc(f.name)}${f.only ? ` <b class="excl">${esc(CHARACTERS[f.only].defaultName)}専用</b>` : ''}`, value: fid, right: fid === cur ? '今' : '', desc: footDesc(f) }))] });
            if (!id) return false;
            chara.equip[k] = id === '__none' ? null : id; return true;
          },
          tune: cur ? () => editTuningRow('foot', cur) : null,
        });
      }
      return out;
    },
    info: () => {
      const st = memberStats(tempMember());
      return `攻撃${st.atk + st.weaponAtk}　防御${st.def}　命中${st.hit}　回避${st.eva}　素早さ${st.spd}　体力${st.maxHp}　会心${st.crit}%${st.set ? `　<b class="ok">${esc(st.set.name)}</b>` : ''}${st.favorite ? '　<b class="ok">得意な範囲</b>' : ''}`;
    },
    onFire: async () => {
      const k = await pickTargets();
      return k ? { fire: 'char', kind: k, m: tempMember() } : null;
    },
  });
  if (r?.fire) await startTest(world, r);
}

// 試し撃ち：戦闘の画面と演出をそのまま使う（お金・経験値・セーブには影響しない）。終わると展示台に戻る
async function startTest(world, r) {
  const pilot = r.m || { ...G.members.ren, ko: false, machine: '__test' };
  pilot.hp = memberStats(pilot).maxHp;
  const enemies = { one: [['dummy', 1]], group: [['dummy', 3]], all: [['dummy', 3], ['dummyB', 2]] }[r.kind];
  await ui.fade(true, 0.3);
  flow.startBattle({ enemies, terrain: 'metal', test: { unit: { m: pilot, mc: r.mc || null }, after: () => (r.fire === 'robot' ? robotStation(world) : charStation(world)) } });
}

// 展示台に飾る3D（部屋の中の台の上）
export function showcaseModel(kind) { return kind === 'char' ? charModel() : robotModel(); }
export const testFootLeft = (id) => testFootCount(id);
