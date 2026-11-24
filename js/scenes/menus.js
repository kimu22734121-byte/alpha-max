// 町の施設（宿屋・武器屋・パーツ屋・道具屋・ガレージ・ハンターオフィス・酒場・修理屋）と
// フィールドのメニュー（つよさ・どうぐ・そうび・マシン・手配書・せってい）
import { ui, esc, GEAR, fmt } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { save, describeSave } from '../core/save.js';
import { MAPS } from '../data/maps.js';
import { SHOPS } from '../data/shops.js';
import { WEAPONS, WEAPON_CATS, UPGRADE, RANGES } from '../data/weapons.js';
import { PARTS, MODS, SLOT_INFO, MACHINE_TYPES } from '../data/parts.js';
import { ITEMS, MATERIALS, FOOT_GEAR } from '../data/items.js';
import { CHARACTERS, LEVEL } from '../data/characters.js';
import { MACHINES } from '../data/machines.js';
import { ENEMIES, BOUNTIES } from '../data/enemies.js';
import { TILES } from '../data/tiles.js';
import { PLANETS, planetOfTown } from '../data/planets.js';
import { DEV_ROOM, devSession } from '../data/debug.js';
import {
  G, partyMembers, memberStats, machineStats, machineName, canPilot, expToNext, addGear, addItem, addFoot, addWeapon, addPart,
  weaponByUid, weaponEquippedOn, weaponAtk, weaponLabel, equipWeapon, checkMount, equipPart, checkPart, hasMats, matsText, addMat,
  healParty, repairMachine, machinesInGarage, sealInfo, typeBoost,
} from '../game/state.js';
import { flow } from '../game/flow.js';

export const settings = audio.settings;
// v0.4 から立体的なマップ（3D）が標準。軽くしたい時は「せってい」で2Dにできる
if (!settings.mapV) { settings.mapMode = '3d'; settings.mapV = 1; }

// いまいる町（建物の中なら、その建物がある町）
export const currentTown = () => MAPS[G.pos.map]?.town || G.pos.map;
const shopOf = () => SHOPS[currentTown()] || SHOPS[G.lastTown] || SHOPS.town1;
// いま開いているお店の品ぞろえ（同じ種類の店が2軒ある町や、広場の屋台は shops.js の別のキーを使う）
let curShopKey = null;
const shopFor = (fac) => (curShopKey && (shopOf()[curShopKey] || SHOPS[curShopKey])) || shopOf()[fac] || SHOPS.town2[fac];
// アルファがまだ修理屋の中にいるか（封印中）
export const alphaInShop = () => G.machines.alpha?.loc.type === 'shop';
const ren = () => G.members.ren;

export function autosave() {
  if (!G) return;
  const lead = partyMembers()[0];
  save.auto(G, `${MAPS[G.pos.map].name}　${lead.name} Lv${lead.lv}`);
}
window.addEventListener('pagehide', autosave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') autosave(); });

async function saveMenu() {
  const rows = save.summaries();
  const v = await ui.menu({ title: 'どこにセーブしますか？', items: rows.map((r) => ({ label: `セーブ${r.n}`, right: esc(describeSave(r.data)), value: r.n })) });
  if (!v) return false;
  if (save.loadSlot(v) && !(await ui.confirm(`セーブ${v}に上書きしますか？`))) return false;
  const lead = partyMembers()[0];
  G.lastTown = MAPS[currentTown()]?.type === 'town' ? currentTown() : G.lastTown;
  const ok = save.slot(v, G, `${MAPS[G.pos.map].name}　${lead.name} Lv${lead.lv}`);
  autosave();
  audio.sfx(ok ? 'save' : 'error');
  await ui.say(ok ? `セーブ${v}に記録しました。` : 'セーブできませんでした（ブラウザの保存領域がいっぱいかもしれません）。');
  return ok;
}

function costWithDiscount(gear) { return Math.round(gear * (1 - MODS.mechanicDiscount)); }
const ownedWeapons = () => G.inv.weapons.filter((w) => { const on = weaponEquippedOn(w.uid); return !on || on.mc.owned; });

// =====================================================================
// 施設
// =====================================================================
export async function openFacility(fac, world, shopKey) {
  const fn = { home, inn, bar, office, weapon: weaponShop, parts: partsShop, item: itemShop, garage, dev: devShop }[fac];
  curShopKey = shopKey || MAPS[G.pos.map]?.shopKey || null;
  try { if (fn) await fn(world); } finally { curShopKey = null; }
}

async function home(world) {
  const r = ren().name;
  if (!G.flags.homeVisited) {
    G.flags.homeVisited = true;
    await ui.say([
      { name: r, text: 'ただいまー。……って、誰もいないんだけどね。' },
      { name: r, text: 'ハウンドはガレージに置いてある。荒野に出るときはガレージで乗り込もう！' },
    ]);
  }
  for (;;) {
    const v = await ui.menu({
      title: `${esc(r)}の修理屋`,
      items: [
        { label: '休む（無料）', value: 'rest' },
        { label: 'セーブ', value: 'save' },
        { label: 'アルファの様子を見る', value: 'alpha' },
        { label: '自分の部屋を調べる', value: 'room' },
        { label: '出る', value: null },
      ],
    });
    if (!v) return;
    if (v === 'rest') { await ui.fade(true, 0.5); healParty(); await ui.fade(false, 0.5); audio.sfx('heal'); await ui.say('ぐっすり眠った。みんなの体力が回復した！'); }
    if (v === 'save') await saveMenu();
    if (v === 'alpha') {
      if (G.seal < 1) {
        audio.sfx('repair');
        await ui.say([
          '作業場の奥で、白い機体が眠っている。がらくたの山から運んできた伝説の機体「アルファ」だ。',
          { name: r, text: '装甲はほとんど直した。関節も、配線も、ぜんぶ組み直したのに……。' },
          { name: r, text: 'コアの「封印」だけは、どうやっても開かないんだ。これが解けない限り、アルファは動かない。' },
          '胸のコアの奥で、青白い光がかすかに……ほんの一瞬だけ、またたいた気がした。',
        ]);
      } else {
        await ui.say([
          { name: r, text: 'アルファはガレージで待ってる。封印がひとつ解けて、やっと動けるようになったんだ！' },
          '作業場には、アルファを直したときの工具がまだ散らばっている。',
        ]);
      }
    }
    if (v === 'room') {
      if (!G.flags.omegaFound) {
        await ui.say([
          'ベッドに本棚、油まみれの設計図……いつもの自分の部屋だ。',
          '……ん？ 床板の一枚だけ、ほかと色が違う。すき間から冷たい風が吹き上がってくる。',
          { name: r, text: 'ゴウン、ゴウンって音……ここから聞こえてたのか！' },
        ]);
      } else await ui.say('床板の下の隠し通路は、地下の格納庫につながっている。');
      if (await ui.confirm('隠し通路を降りてみますか？', '降りる', 'やめておく')) {
        ui.closeAll();
        await world.warp({ to: 'basement', tx: 2, ty: 10, dir: 'up' });
        return;
      }
    }
  }
}

async function inn() {
  const shop = shopFor('inn');
  const price = shop.pricePerMember * G.party.length;
  for (;;) {
    const v = await ui.menu({ title: '宿屋', header: `${esc(shop.keeper)}「いらっしゃい。ひと晩 ${price} ギアだよ」`, items: [{ label: '泊まる', right: `${GEAR}${price}`, value: 'stay' }, { label: 'セーブ', value: 'save' }, { label: '出る', value: null }] });
    if (!v) return;
    if (v === 'save') await saveMenu();
    if (v === 'stay') {
      if (G.gear < price) { audio.sfx('error'); await ui.say('ギアが足りない……。'); continue; }
      addGear(-price);
      await ui.fade(true, 0.6);
      healParty();
      await new Promise((r) => setTimeout(r, 500));
      await ui.fade(false, 0.6);
      audio.sfx('heal');
      await ui.say(`${shop.keeper}「おはよう！ よく眠れたかい？」　みんなの体力が全回復した。`);
      if (await ui.confirm('セーブしますか？')) await saveMenu();
    }
  }
}

async function bar() {
  const hints = {
    town1: [
      'マスター「賞金首を倒したら、ハンターオフィスで賞金を受け取れるぞ」',
      'マスター「メタルビートルって知ってるか？ すぐ逃げるが、倒せば経験値がどっさりだ」',
      'マスター「北の鉱山町グレイロックには、腕のいいパイロットが流れ着いたらしい」',
      'マスター「ボルツじいさんが言ってたぞ。おまえさんの家の下から変な音がするって」',
    ],
    town2: [
      'マスター「坑道を抜けたら山脈の東側だ。あっちの敵は一段手ごわいぞ」',
      'マスター「金ピカのドローンを見たら逃がすなよ。ギアをたんまり落とすって噂だ」',
      'マスター「レーダーヘッドを付けると、弾がよく当たるようになる」',
    ],
    town3: [
      'マスター「海賊船の中は狭い。マシンは外に置いて、生身で行くしかない」',
      'マスター「廃工場の奥は、マシンに乗ったまま入れる。生身じゃとても無理だろうな」',
      'マスター「全員まとめて治せるメガリカバリー、ボス戦の前に持っていきな」',
    ],
  }[currentTown()] || ['マスター「いらっしゃい」'];
  const name = { town1: 'ラストオアシス', town2: '坑夫のねぐら', town3: 'スターポート' }[currentTown()] || '酒場';
  for (;;) {
    const v = await ui.menu({ title: `酒場「${name}」`, items: [{ label: 'マスターと話す', value: 'master' }, { label: '出る', value: null }] });
    if (!v) return;
    const k = `hint_${currentTown()}`;
    G.flags[k] = ((G.flags[k] ?? -1) + 1) % hints.length;
    await ui.say(hints[G.flags[k]]);
  }
}

// レンの家のベッド：休む（無料）とセーブ
export async function restAtHome() {
  const v = await ui.menu({ title: '自分のベッド', items: [{ label: '休む（無料）', value: 'rest' }, { label: 'セーブ', value: 'save' }, { label: 'やめる', value: null }] });
  if (v === 'rest') { await ui.fade(true, 0.5); healParty(); await ui.fade(false, 0.5); audio.sfx('heal'); await ui.say('ぐっすり眠った。みんなの体力が回復した！'); if (await ui.confirm('セーブしますか？')) await saveMenu(); }
  if (v === 'save') await saveMenu();
}

// 仲間の加入（新しい仲間はレンのレベルに合わせる）
function join(id, machineId) {
  const m = G.members[id];
  m.joined = true;
  if (!G.party.includes(id)) G.party.push(id);
  m.lv = Math.max(m.lv, ren().lv);
  m.exp = Math.max(m.exp, LEVEL.expFor(m.lv));
  m.hp = memberStats(m).maxHp;
  audio.sfx('levelup');
  ui.banner(`${esc(m.name)}が仲間になった！`, `${CHARACTERS[id].roleName}：${CHARACTERS[id].desc}`);
  if (machineId) {
    const mc = G.machines[machineId];
    mc.owned = true;
    repairMachine(mc);
    m.machine = machineId;
  }
  autosave();
}

// NPCから始まるイベント（world.js から呼ばれる）
export async function runEvent(name, world) {
  const r = ren().name;
  if (name === 'alphaRepair') {
    if (G.seal < 1) {
      audio.sfx('repair');
      await ui.say([
        '作業場の真ん中で、白い機体が眠っている。がらくたの山から運んできた伝説の機体「アルファ」だ。',
        { name: r, text: '装甲はほとんど直した。関節も、配線も、ぜんぶ組み直したのに……。' },
        { name: r, text: 'コアの「封印」だけは、どうやっても開かないんだ。これが解けない限り、アルファは動かない。' },
        '胸のコアの奥で、青白い光がかすかに……ほんの一瞬だけ、またたいた気がした。',
      ]);
    } else await ui.say({ name: r, text: 'アルファはガレージで待ってる。封印がひとつ解けて、やっと動けるようになったんだ！' });
    return;
  }
  if (name === 'joinShion') {
    const s = G.members.shion.name;
    await ui.say([
      { name: s, text: '……あなたが、ラストヘイヴンの修理屋？' },
      { name: r, text: 'そうだけど……きみは？' },
      { name: s, text: '乗機のファルコの調子が悪い。この町の整備士では、出力の偏りが直せなかった。……見てほしい。' },
    ]);
    await ui.fade(true, 0.4);
    audio.sfx('repair');
    await new Promise((res) => setTimeout(res, 700));
    await ui.fade(false, 0.4);
    await ui.say([
      { name: '', text: `（${r}はファルコのコンバーターを分解し、あっという間に組み直した）` },
      { name: s, text: '……すごい。前より反応が速い。' },
      { name: s, text: '元宇宙軍、第4機動隊。シオン。宇宙生物がマシンに取りつく理由を、ひとりで追っている。' },
      { name: r, text: 'それなら一緒に行こうよ！ 動かないアルファの封印も、きっと関係ある気がするんだ。' },
      { name: s, text: '……わかった。腕のいいメカニックがいるなら、心強い。' },
    ]);
    join('shion', 'falco');
    await ui.say(`シャープタイプのマシン「ファルコ」がガレージに入った。（${s}が乗ります）`);
  }
  if (name === 'joinGina') {
    const g = G.members.gina.name;
    await ui.say([
      { name: g, text: 'へえ、あんたたちが坑道を抜けてきた連中かい。やるじゃないか。' },
      { name: g, text: 'あたしはジーナ。賞金稼ぎさ。南西に墜ちた海賊船、あそこに用があってね。' },
      { name: g, text: '中は狭くてマシンじゃ入れない。生身の腕っぷしがいる仕事だよ。' },
      { name: r, text: '海賊船って……廃工場のセキュリティキーを盗んだっていう？' },
      { name: g, text: '話が早いね。あたしと組みな。そのかわり、あたしのゴライアスの整備はあんたに任せたよ、メカニック！' },
    ]);
    join('gina', 'goliath');
    await ui.say(`重厚タイプのマシン「ゴライアス」がガレージに入った。（${g}が乗ります）`);
  }
  void world;
}

async function office() {
  for (;;) {
    const unclaimed = Object.entries(G.bounties).filter(([, v]) => v === 1);
    const v = await ui.menu({
      title: 'ハンターオフィス',
      header: '受付「賞金首の情報はこちらです」',
      items: [{ label: '手配書を見る', value: 'list' }, { label: '賞金を受け取る', value: 'claim', right: unclaimed.length ? `${unclaimed.length}件` : '', disabled: !unclaimed.length }, { label: '出る', value: null }],
    });
    if (!v) return;
    if (v === 'list') await bountyList();
    if (v === 'claim') {
      let total = 0;
      for (const [id] of unclaimed) { total += BOUNTIES[id].reward; G.bounties[id] = 2; }
      addGear(total);
      audio.sfx('buy');
      await ui.say([`受付「おめでとうございます！ 賞金 ${fmt(total)} ギアをお支払いします」`, `${fmt(total)} ギアを受け取った！`]);
      autosave();
    }
  }
}

export async function bountyList() {
  const stat = (id) => ({ 1: '<b class="ok">討伐済</b>', 2: '<b class="ok">受取済</b>' }[G.bounties[id]] || '<b class="warn">手配中</b>');
  for (;;) {
    const v = await ui.menu({ title: '手配書', wide: true, items: Object.entries(BOUNTIES).map(([id, b]) => ({ label: `【${b.rank}】${esc(ENEMIES[b.enemy].name)}`, right: `${GEAR}${fmt(b.reward)}　${stat(id)}`, value: id })) });
    if (!v) return;
    const b = BOUNTIES[v], e = ENEMIES[b.enemy];
    await ui.panel(`
      <div class="wanted"><div class="wanted-head">WANTED</div>
      <div class="wanted-name">${esc(e.name)}</div>
      <div class="wanted-reward">${GEAR} ${fmt(b.reward)} ギア</div>
      <table class="kv"><tr><th>ランク</th><td>${b.rank}</td></tr><tr><th>出現場所</th><td>${esc(b.where)}</td></tr><tr><th>状態</th><td>${stat(v)}</td></tr></table>
      <p>${esc(e.desc)}</p><p class="note">${esc(b.note)}</p></div>`, { title: '手配書' });
  }
}

// ---------------- お店 ----------------
async function buyQty(name, price) {
  const max = Math.min(99, Math.floor(G.gear / price));
  if (max < 1) { audio.sfx('error'); await ui.say('ギアが足りない。'); return 0; }
  const opts = [1, 3, 5, 10].filter((n) => n <= max).map((n) => ({ label: `${n}個`, right: `${GEAR}${fmt(price * n)}`, value: n }));
  const v = await ui.menu({ title: `${esc(name)}をいくつ買う？`, items: opts });
  return v || 0;
}

// お店の名前（建物の中ならその建物の名前、屋台なら店番の名前）
const shopTitle = (def) => {
  const m = MAPS[G.pos.map];
  if (m?.type === 'interior' && m.shopKey) return esc(m.name.replace(/^.*の(?=[^の]+$)/, ''));
  if (curShopKey?.startsWith('stall')) return '屋台';
  return def;
};

async function weaponShop() {
  const s = shopFor('weapon');
  for (;;) {
    const v = await ui.menu({ title: shopTitle('武器屋'), header: `${esc(s.keeper)}「${esc(s.greet)}」`, items: [{ label: 'マシン用の武器を買う', value: 'm' }, { label: '生身の装備を買う', value: 'f' }, { label: '売る', value: 'sell' }, { label: '出る', value: null }] });
    if (!v) return;
    if (v === 'm') {
      for (;;) {
        const id = await ui.menu({
          title: 'マシン用の武器', wide: true, desc: true, header: `所持 ${GEAR}${fmt(G.gear)}`,
          items: s.machine.map((id) => { const w = WEAPONS[id]; return { label: `${WEAPON_CATS[w.cat].icon} ${esc(w.name)} ${rangeBadge(w)}`, right: `${GEAR}${fmt(w.price)}`, value: id, desc: weaponDesc(w) }; }),
        });
        if (!id) break;
        const w = WEAPONS[id];
        if (G.gear < w.price) { audio.sfx('error'); await ui.say('ギアが足りない。'); continue; }
        if (!(await ui.confirm(`${esc(w.name)}を ${fmt(w.price)} ギアで買いますか？`))) continue;
        addGear(-w.price); addWeapon(id); audio.sfx('buy');
        ui.toast(`${w.name}を買った（ガレージで装備できます）`);
      }
    }
    if (v === 'f') {
      for (;;) {
        const id = await ui.menu({
          title: '生身の装備', desc: true, header: `所持 ${GEAR}${fmt(G.gear)}`,
          items: s.foot.map((id) => { const f = FOOT_GEAR[id]; return { label: esc(f.name), right: `${GEAR}${fmt(f.price)}`, value: id, desc: footDesc(f) }; }),
        });
        if (!id) break;
        const f = FOOT_GEAR[id];
        if (G.gear < f.price) { audio.sfx('error'); await ui.say('ギアが足りない。'); continue; }
        if (!(await ui.confirm(`${esc(f.name)}を ${fmt(f.price)} ギアで買いますか？`))) continue;
        addGear(-f.price); addFoot(id); audio.sfx('buy');
        ui.toast(`${f.name}を買った（メニューの「そうび」で装備）`);
      }
    }
    if (v === 'sell') await sellMenu();
  }
}

async function partsShop() {
  const s = shopFor('parts');
  for (;;) {
    const v = await ui.menu({ title: shopTitle('パーツ屋'), header: `${esc(s.keeper)}「${esc(s.greet)}」`, items: [{ label: '買う', value: 'buy' }, { label: '売る', value: 'sell' }, { label: '出る', value: null }] });
    if (!v) return;
    if (v === 'sell') { await sellMenu(); continue; }
    for (;;) {
      const id = await ui.menu({
        title: 'パーツ', wide: true, desc: true, header: `所持 ${GEAR}${fmt(G.gear)}`,
        items: s.parts.map((id) => { const p = PARTS[id]; return { label: `${slotName(p.slot)}｜${esc(p.name)}`, right: `${GEAR}${fmt(p.price)}`, value: id, desc: partDesc(p) }; }),
      });
      if (!id) break;
      const p = PARTS[id];
      if (G.gear < p.price) { audio.sfx('error'); await ui.say('ギアが足りない。'); continue; }
      if (!(await ui.confirm(`${esc(p.name)}を ${fmt(p.price)} ギアで買いますか？`))) continue;
      addGear(-p.price); addPart(id); audio.sfx('buy');
      ui.toast(`${p.name}を買った（ガレージで付け替えできます）`);
    }
  }
}

async function itemShop() {
  const s = shopFor('item');
  for (;;) {
    const v = await ui.menu({ title: shopTitle('道具屋'), header: `${esc(s.keeper)}「${esc(s.greet)}」`, items: [{ label: '買う', value: 'buy' }, { label: '売る', value: 'sell' }, { label: '出る', value: null }] });
    if (!v) return;
    if (v === 'sell') { await sellMenu(); continue; }
    for (;;) {
      const id = await ui.menu({
        title: '道具', desc: true, header: `所持 ${GEAR}${fmt(G.gear)}`,
        items: s.items.map((id) => ({ label: esc(ITEMS[id].name), right: `${GEAR}${fmt(ITEMS[id].price)}　<small>持${G.inv.items[id] || 0}</small>`, value: id, desc: esc(ITEMS[id].desc) })),
      });
      if (!id) break;
      const n = await buyQty(ITEMS[id].name, ITEMS[id].price);
      if (!n) continue;
      addGear(-ITEMS[id].price * n); addItem(id, n); audio.sfx('buy');
      ui.toast(`${ITEMS[id].name}を${n}個買った`);
    }
  }
}

async function sellMenu() {
  for (;;) {
    const items = [];
    for (const w of ownedWeapons()) {
      if (weaponEquippedOn(w.uid) || WEAPONS[w.id].unique) continue;
      items.push({ label: `${WEAPON_CATS[WEAPONS[w.id].cat].icon} ${esc(weaponLabel(w))}`, right: `${GEAR}${fmt(Math.floor(WEAPONS[w.id].price / 2))}`, value: { t: 'w', uid: w.uid } });
    }
    for (const [id, n] of Object.entries(G.inv.parts)) items.push({ label: `${esc(PARTS[id].name)} ×${n}`, right: `${GEAR}${fmt(Math.floor(PARTS[id].price / 2))}`, value: { t: 'p', id } });
    for (const [id, n] of Object.entries(G.inv.items)) items.push({ label: `${esc(ITEMS[id].name)} ×${n}`, right: `${GEAR}${fmt(Math.floor(ITEMS[id].price / 2))}`, value: { t: 'i', id } });
    for (const [id, n] of Object.entries(G.inv.foot)) items.push({ label: `${esc(FOOT_GEAR[id].name)} ×${n}`, right: `${GEAR}${fmt(Math.floor(FOOT_GEAR[id].price / 2))}`, value: { t: 'f', id } });
    if (!items.length) { await ui.say('売れるものがない。'); return; }
    const v = await ui.menu({ title: '売る（半額で買い取り）', wide: true, items });
    if (!v) return;
    let price = 0, name = '';
    if (v.t === 'w') { const w = weaponByUid(v.uid); price = Math.floor(WEAPONS[w.id].price / 2); name = weaponLabel(w); }
    if (v.t === 'p') { price = Math.floor(PARTS[v.id].price / 2); name = PARTS[v.id].name; }
    if (v.t === 'i') { price = Math.floor(ITEMS[v.id].price / 2); name = ITEMS[v.id].name; }
    if (v.t === 'f') { price = Math.floor(FOOT_GEAR[v.id].price / 2); name = FOOT_GEAR[v.id].name; }
    if (!(await ui.confirm(`${esc(name)}を ${fmt(price)} ギアで売りますか？`))) continue;
    if (v.t === 'w') G.inv.weapons = G.inv.weapons.filter((w) => w.uid !== v.uid);
    if (v.t === 'p') { G.inv.parts[v.id]--; if (!G.inv.parts[v.id]) delete G.inv.parts[v.id]; }
    if (v.t === 'i') addItem(v.id, -1);
    if (v.t === 'f') addFoot(v.id, -1);
    addGear(price); audio.sfx('buy');
  }
}

// ---------------- ガレージ ----------------
async function garage(world) {
  const town = currentTown();
  const shop = shopFor('garage');
  if (!G.flags.garageIntro) {
    G.flags.garageIntro = true;
    await ui.say([
      { name: shop.keeper, text: 'よう、レン！ ハウンドはちゃんと預かってるぞ。' },
      { name: shop.keeper, text: 'ここでは修理、パーツと武器の付け替え、武器強化、改造ができる。メカニックのおまえさんなら改造費は3割引きだ。' },
      { name: shop.keeper, text: 'マシンのタイプはボディで決まる。重厚・バランス・シャープで得意な武器が違うぞ。' },
      { name: shop.keeper, text: '荒野に出るときは「乗り込んで出発」を選ぶんだぞ。' },
    ].map((l) => ({ ...l, text: l.text.replace('レン', ren().name) })));
  }
  for (;;) {
    const here = machinesInGarage(town);
    const v = await ui.menu({
      title: 'ガレージ', header: `${esc(shop.keeper)}「何をする？」　預かり中：${here.map((m) => esc(machineName(m))).join('・') || 'なし'}`,
      items: [
        { label: '乗り込んで出発', value: 'depart' },
        { label: '修理', value: 'repair' },
        { label: '武器の付け替え', value: 'weapons' },
        { label: 'パーツ交換', value: 'parts' },
        { label: '武器強化', value: 'upgrade' },
        { label: '改造（フレーム・エンジン）', value: 'mod' },
        { label: '乗る人を決める', value: 'pilot' },
        { label: 'レッカー回収', value: 'tow' },
        { label: 'セーブ', value: 'save' },
        { label: '出る', value: null },
      ],
    });
    if (!v) return;
    if (v === 'save') await saveMenu();
    if (v === 'repair') await garageRepair(here, shop);
    if (v === 'weapons') { const mc = await pickMachine(here); if (mc) await weaponSlots(mc); }
    if (v === 'parts') { const mc = await pickMachine(here); if (mc) await partSlots(mc); }
    if (v === 'upgrade') await upgradeMenu();
    if (v === 'mod') { const mc = await pickMachine(here); if (mc) await modMenu(mc); }
    if (v === 'pilot') await pilotMenu(here);
    if (v === 'tow') await towMenu(town, shop);
    if (v === 'depart') { if (await depart(world, here)) return; }
  }
}

// ---------------- 転送（ガレージの転送台・ワープユニット） ----------------
// 行き先は惑星ごとに分けて表示する。いまいる惑星は町ごと、ほかの惑星はメインの町へ。
// まだ行ったことのない町はグレーで選べない
export async function teleportMenu(world, fromPad) {
  const here = currentTown();
  const visited = G.flags.visited || {};
  const cur = planetOfTown(here) || planetOfTown(G.lastTown) || PLANETS[0];
  const items = [];
  for (const pl of [cur, ...PLANETS.filter((p) => p !== cur)]) {
    items.push({ separator: true, label: `第${pl.chapter}章　${esc(pl.name)}` });
    const reached = pl.towns.some((t) => visited[t]);
    const towns = pl === cur ? pl.towns : [pl.main];
    for (const t of towns) {
      const ok = pl === cur ? !!visited[t] : reached;
      const isHere = t === here && fromPad;
      items.push({
        label: ok ? esc(MAPS[t].name) : `<span class="grey">${esc(MAPS[t].name)}</span>`,
        right: isHere ? '<small>いまいる町</small>' : ok ? `<small>${esc(MAPS[t].subtitle || '')}</small>` : '<small>まだ行ったことがない</small>',
        value: t,
        disabled: !ok || isHere,
      });
    }
  }
  if (!items.some((i) => !i.separator && !i.disabled)) { await ui.say('まだ転送できる町がない。ほかの町に行くと転送台に登録される。'); return false; }
  const to = await ui.menu({
    title: fromPad ? '転送台：どこへ転送する？（無料）' : 'ワープユニット：どこへ？',
    header: fromPad ? '行き先の町の転送台に転送されます。ガレージに預けたマシンも一緒に運ばれます' : '行き先の町の入口に転送されます',
    items, className: 'teleport-menu',
  });
  if (!to) return false;
  ui.closeAll();
  if (!fromPad) addItem('warpunit', -1);
  await world.teleport(to, { pad: fromPad, from: here });
  return true;
}

// ---------------- 開発者の部屋（デバッグ用） ----------------
// 扉の横のキーパネル：携帯電話のテンキーのような数字ボタンで8桁を入れる
export function keypad() {
  return new Promise((resolve) => {
    const len = DEV_ROOM.password.length;
    let code = '';
    const wrap = document.createElement('div');
    wrap.className = 'keypad-wrap';
    wrap.innerHTML = `<div class="keypad"><div class="kp-title">暗証番号を入力（${len}桁）</div><div class="kp-disp"></div>
      <div class="kp-keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => `<button class="kp-key${/\d/.test(k) ? '' : ' kp-fn'}" data-k="${k}">${k}</button>`).join('')}</div>
      <div class="kp-row"><button class="kp-cancel">やめる</button></div></div>`;
    document.getElementById('ui').appendChild(wrap);
    const disp = wrap.querySelector('.kp-disp');
    const draw = () => { disp.innerHTML = Array.from({ length: len }, (_, i) => `<i class="${i < code.length ? 'on' : ''}">${i < code.length ? '●' : ''}</i>`).join(''); };
    const finish = (ok) => { window.removeEventListener('keydown', onKey, true); wrap.remove(); resolve(ok); };
    const press = (k) => {
      if (k === 'C') { audio.sfx('cancel'); code = ''; draw(); return; }
      if (k === '⌫') { audio.sfx('cursor'); code = code.slice(0, -1); draw(); return; }
      if (code.length >= len) return;
      audio.sfx('cursor');
      code += k;
      draw();
      if (code.length === len) {
        if (code === DEV_ROOM.password) { audio.sfx('levelup'); disp.classList.add('ok'); setTimeout(() => finish(true), 500); }
        else { audio.sfx('error'); disp.classList.add('ng'); setTimeout(() => { disp.classList.remove('ng'); code = ''; draw(); }, 600); }
      }
    };
    wrap.querySelector('.kp-keys').addEventListener('click', (e) => { const b = e.target.closest('.kp-key'); if (b) { e.stopPropagation(); press(b.dataset.k); } });
    wrap.querySelector('.kp-cancel').addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cancel'); finish(false); });
    const onKey = (e) => {
      e.stopPropagation(); e.preventDefault();
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Escape' || e.key === 'x') { audio.sfx('cancel'); finish(false); }
    };
    window.addEventListener('keydown', onKey, true);
    draw();
  });
}

// 開発者の部屋のお店：全武器・全パーツ・全アイテムを無料で受け取れる
async function devShop() {
  const n = DEV_ROOM.itemCount;
  for (;;) {
    const v = await ui.menu({
      title: '開発者の部屋', header: '開発者「ここにあるものは全部タダだ。テストに使ってくれ」',
      items: [
        { label: 'マシンの武器を受け取る（1つずつ）', value: 'w' },
        { label: 'パーツを受け取る（1つずつ）', value: 'p' },
        { label: 'アイテムを受け取る（1つずつ）', value: 'i' },
        { label: '生身の装備を受け取る（1つずつ）', value: 'f' },
        { separator: true, label: 'まとめて' },
        { label: '全武器を1つずつ受け取る', value: 'allw' },
        { label: '全パーツを1つずつ受け取る', value: 'allp' },
        { label: `全アイテムを${n}個ずつ受け取る`, value: 'alli' },
        { label: '生身の装備を全部受け取る', value: 'allf' },
        { label: `素材を${n}個ずつ受け取る`, value: 'allm' },
        { label: '出る', value: null },
      ],
    });
    if (!v) return;
    const ok = (t) => { audio.sfx('buy'); ui.toast(t); };
    if (v === 'w') {
      for (;;) {
        const id = await ui.menu({ title: '武器を受け取る', wide: true, desc: true, items: Object.entries(WEAPONS).map(([id, w]) => ({ label: `${WEAPON_CATS[w.cat].icon} ${esc(w.name)} ${rangeBadge(w)}`, right: w.only ? `<small>${esc(MACHINES[w.only].name)}専用</small>` : '', value: id, desc: weaponDesc(w) })) });
        if (!id) break;
        addWeapon(id); ok(`${WEAPONS[id].name}を受け取った`);
      }
    }
    if (v === 'p') {
      for (;;) {
        const id = await ui.menu({ title: 'パーツを受け取る', wide: true, desc: true, items: Object.entries(PARTS).map(([id, pt]) => ({ label: esc(pt.name), right: `×${G.inv.parts[id] || 0}`, value: id, desc: partDesc(pt) })) });
        if (!id) break;
        addPart(id); ok(`${PARTS[id].name}を受け取った`);
      }
    }
    if (v === 'i') {
      for (;;) {
        const id = await ui.menu({ title: 'アイテムを受け取る', desc: true, items: Object.entries(ITEMS).map(([id, it]) => ({ label: esc(it.name), right: `×${G.inv.items[id] || 0}`, value: id, desc: esc(it.desc) })) });
        if (!id) break;
        addItem(id, 1); ok(`${ITEMS[id].name}を受け取った`);
      }
    }
    if (v === 'f') {
      for (;;) {
        const id = await ui.menu({ title: '生身の装備を受け取る', desc: true, items: Object.entries(FOOT_GEAR).map(([id, f]) => ({ label: esc(f.name), right: `×${G.inv.foot[id] || 0}`, value: id, desc: footDesc(f) })) });
        if (!id) break;
        addFoot(id); ok(`${FOOT_GEAR[id].name}を受け取った`);
      }
    }
    if (v === 'allw') { for (const id of Object.keys(WEAPONS)) addWeapon(id); ok(`武器を${Object.keys(WEAPONS).length}種類受け取った`); }
    if (v === 'allp') { for (const id of Object.keys(PARTS)) addPart(id); ok(`パーツを${Object.keys(PARTS).length}種類受け取った`); }
    if (v === 'alli') { for (const id of Object.keys(ITEMS)) addItem(id, n); ok(`アイテムを${n}個ずつ受け取った`); }
    if (v === 'allf') { for (const id of Object.keys(FOOT_GEAR)) addFoot(id); ok('生身の装備を全部受け取った'); }
    if (v === 'allm') { for (const id of Object.keys(MATERIALS)) addMat(id, n); ok(`素材を${n}個ずつ受け取った`); }
  }
}

// ギアを増やす機械
export async function gearMachine() {
  for (;;) {
    const v = await ui.menu({
      title: 'ギア生成マシン', header: `ガチャン、ガチャン……歯車が回っている。　所持：${GEAR}${fmt(G.gear)}`,
      items: [...DEV_ROOM.gearButtons.map((g) => ({ label: `${GEAR}${fmt(g)} 増やす`, value: g })), { label: '最大（999,999）にする', value: 'max' }, { label: 'やめる', value: null }],
    });
    if (!v) return;
    addGear(v === 'max' ? 999999 : v);
    audio.sfx('levelup');
    ui.toast(`チャリーン！ 所持ギア ${fmt(G.gear)}`);
  }
}

export const devDoorOpen = () => devSession.open;
export function openDevDoor() { devSession.open = true; }

// ---------------- 装備の比較（今の値 → 変更後の値（差）） ----------------
export const rangeBadge = (def) => `<b class="rg rg-${def.target}">${RANGES[def.target].name}</b>`;
function compareTable(rows) {
  const cell = (r) => {
    const [label, a, b, opt = {}] = r;
    const fmtv = (v) => (v == null ? '―' : typeof v === 'number' ? (opt.fmt ? opt.fmt(v) : String(v)) : v);
    let diff = '', cls = '';
    if (typeof a === 'number' && typeof b === 'number' && a !== b && opt.better !== null) {
      const d = Math.round((b - a) * 100) / 100;
      const good = (opt.better === 'low') ? d < 0 : d > 0;
      cls = good ? 'up' : 'down';
      diff = `<span class="cmp-${cls}">（${good ? '▲' : '▼'}${d > 0 ? '+' : ''}${opt.fmt ? opt.fmt(d) : d}）</span>`;
    } else if (a !== b && opt.better === null) cls = 'chg';
    return `<tr><th>${label}</th><td>${fmtv(a)}</td><td class="arr">→</td><td class="cmp-${cls || 'same'}">${fmtv(b)}</td><td>${diff}</td></tr>`;
  };
  return `<table class="cmp">${rows.map(cell).join('')}</table>`;
}
function slotAtk(mc, slot, w) {
  if (!w) return null;
  const st = machineStats(mc), def = WEAPONS[w.id];
  const arm = slot === 0 ? st.armMul.R : slot === 1 ? st.armMul.L : 1;
  return Math.round(weaponAtk(w) * arm * st.mul * typeBoost(mc, def));
}
function weaponCompare(mc, slot, newUid) {
  const cur = mc.slots[slot] ? weaponByUid(mc.slots[slot]) : null;
  const nw = newUid ? weaponByUid(newUid) : null;
  const clone = { ...mc, parts: { ...mc.parts }, slots: [...mc.slots] };
  if (newUid) { const on = clone.slots.indexOf(newUid); if (on >= 0) clone.slots[on] = null; }
  clone.slots[slot] = newUid || null;
  const a = machineStats(mc), b = machineStats(clone);
  const cd = cur && WEAPONS[cur.id], nd = nw && WEAPONS[nw.id];
  const head = nd ? `${WEAPON_CATS[nd.cat].icon} ${esc(weaponLabel(nw))} ${rangeBadge(nd)}${typeBoost(mc, nd) > 1 ? ` <b class="ok">得意武器×${typeBoost(mc, nd).toFixed(2)}</b>` : ''}` : '外す';
  return `<div class="cmp-head">${head}</div>` + compareTable([
    ['範囲', cd ? RANGES[cd.target].name : '―', nd ? RANGES[nd.target].name : '―', { better: null }],
    ['攻撃', slotAtk(mc, slot, cur) ?? 0, slotAtk(clone, slot, nw) ?? 0],
    ['命中', cd ? cd.hit + a.hit : 0, nd ? nd.hit + b.hit : 0],
    ['EN消費', cd ? cd.en || 0 : 0, nd ? nd.en || 0 : 0, { better: 'low' }],
    ['重さ合計', a.weight, b.weight, { better: 'low', fmt: (v) => `${v}` }],
    ['積める重さ', a.cap, b.cap],
  ]) + (b.weight > b.cap ? '<b class="warn">重量オーバー</b>' : '');
}
function partCompare(mc, slotKey, partId) {
  const clone = { ...mc, parts: { ...mc.parts, [slotKey]: partId }, slots: [...mc.slots] };
  const a = machineStats(mc), b = machineStats(clone);
  const rows = [
    ['装甲', a.maxArmor, b.maxArmor], ['防御', a.def, b.def], ['命中', a.hit, b.hit], ['回避', a.eva, b.eva], ['速さ', a.spd, b.spd],
    ['重さ合計', a.weight, b.weight, { better: 'low' }], ['積める重さ', a.cap, b.cap], ['EN', a.maxEn, b.maxEn], ['スロット', a.slots, b.slots],
  ];
  if (slotKey === 'armR' || slotKey === 'armL') rows.splice(1, 0, [`${slotKey === 'armR' ? '右' : '左'}腕の攻撃倍率`, a.armMul[slotKey === 'armR' ? 'R' : 'L'], b.armMul[slotKey === 'armR' ? 'R' : 'L']]);
  if (slotKey === 'body') rows.unshift(['タイプ', a.typeName, b.typeName, { better: null }]);
  return `<div class="cmp-head">${esc(PARTS[partId].name)}</div>` + compareTable(rows) + (b.weight > b.cap ? '<b class="warn">重量オーバー</b>' : '');
}
function footCompare(m, kind, id) {
  const clone = { ...m, equip: { ...m.equip, [kind]: id } };
  const a = memberStats(m), b = memberStats(clone);
  return `<div class="cmp-head">${esc(FOOT_GEAR[id].name)}</div>` + compareTable([
    ['攻撃', a.atk + a.weaponAtk, b.atk + b.weaponAtk], ['防御', a.def, b.def], ['命中', a.hit, b.hit], ['回避', a.eva, b.eva],
  ]);
}

async function pickMachine(list) {
  if (!list.length) { await ui.say('ガレージに預けているマシンがない。'); return null; }
  if (list.length === 1) return list[0];
  return ui.menu({ title: 'どのマシン？', items: list.map((mc) => ({ label: esc(machineName(mc)), right: pilotName(mc), value: mc })) });
}
const pilotName = (mc) => { const p = partyMembers().find((m) => m.machine === mc.id); return p ? esc(p.name) : '<small>乗り手なし</small>'; };

async function garageRepair(here, shop) {
  if (!here.length) { await ui.say('ガレージに預けているマシンがない。'); return; }
  const items = here.map((mc) => {
    const st = machineStats(mc);
    const cost = Math.ceil(((st.maxArmor - mc.armor) * shop.repairPerArmor + (st.maxEn - mc.en) * shop.repairPerEn + (mc.broken ? 300 : 0)) * (1 - MODS.mechanicDiscount));
    return { label: `${esc(machineName(mc))}${mc.broken ? ' <b class="warn">大破</b>' : ''}`, right: `装甲${mc.armor}/${st.maxArmor}　${GEAR}${cost}`, value: { mc, cost }, disabled: cost <= 0 };
  });
  const v = await ui.menu({ title: '修理（メカニック割引）', wide: true, items });
  if (!v) return;
  if (G.gear < v.cost) { audio.sfx('error'); await ui.say('ギアが足りない。'); return; }
  addGear(-v.cost); repairMachine(v.mc); audio.sfx('repair');
  await ui.say(`${machineName(v.mc)}の装甲とエネルギーが全回復した！`);
}

async function depart(world, here) {
  const go = here.filter((mc) => !mc.broken && partyMembers().some((m) => m.machine === mc.id && canPilot(m, mc)));
  const broken = here.filter((mc) => mc.broken);
  if (broken.length) await ui.say(`${broken.map((m) => machineName(m)).join('、')}は大破している。修理しないと出せない。`);
  if (!go.length) {
    if (!(await ui.confirm('乗れるマシンがない。生身で出発しますか？'))) return false;
  } else {
    const over = go.find((mc) => machineStats(mc).overweight);
    if (over) { await ui.say(`${machineName(over)}は重量オーバーで動けない。武器かパーツを軽くしよう。`); return false; }
  }
  for (const mc of go) mc.loc = { type: 'party' };
  const map = MAPS[currentTown()];
  const gate = map.warps[0]; // 町の出口（ガレージの中から出発しても町の外へ）
  ui.closeAll();
  await world.warp(gate);
  return true;
}

async function weaponSlots(mc) {
  for (;;) {
    const st = machineStats(mc);
    const items = SLOT_INFO.map((info, i) => {
      const w = mc.slots[i] ? weaponByUid(mc.slots[i]) : null;
      const locked = i >= st.slots;
      return { label: `${info.name}：${locked ? '<small>（フレーム強化で解放）</small>' : w ? `${esc(weaponLabel(w))} ${rangeBadge(WEAPONS[w.id])}` : '<small>なし</small>'}`, value: i, disabled: locked, desc: w ? weaponDesc(WEAPONS[w.id], w) : (info.mount === 'arm' ? '腕には機銃・特殊兵器（腕用）・ブレードを付けられる' : '背中には主砲・ミサイル・特殊兵器（背中用）を付けられる') };
    });
    const slot = await ui.menu({ title: `${esc(machineName(mc))}の武器`, header: `${esc(st.typeName)}タイプ　重さ ${st.weight}/${st.cap}　スロット ${st.slots}/5`, wide: true, desc: true, items });
    if (slot == null) return;
    const info = SLOT_INFO[slot];
    const cands = ownedWeapons().filter((w) => WEAPONS[w.id].mount === info.mount && mc.slots[slot] !== w.uid);
    const list = cands.map((w) => {
      const on = weaponEquippedOn(w.uid);
      const err = checkMount(mc, slot, w);
      return { label: `${WEAPON_CATS[WEAPONS[w.id].cat].icon} ${esc(weaponLabel(w))} ${rangeBadge(WEAPONS[w.id])}`, right: on ? `<small>${esc(machineName(on.mc))}に装備中</small>` : '', value: w.uid, disabled: !!err, desc: (err ? `<b class="warn">${esc(err)}</b><br>` : '') + weaponCompare(mc, slot, w.uid) };
    });
    if (mc.slots[slot]) list.unshift({ label: '外す', value: '__none', desc: weaponCompare(mc, slot, null) });
    if (!list.length) { await ui.say('付けられる武器を持っていない。武器屋で買おう。'); continue; }
    const uid = await ui.menu({ title: `${info.name}に付ける武器`, header: '選んでいる武器に替えたときの「今 → 変更後（差）」', wide: true, desc: true, className: 'cmp-menu', items: list });
    if (!uid) continue;
    const err = equipWeapon(mc, slot, uid === '__none' ? null : uid);
    if (err) { audio.sfx('error'); await ui.say(err); } else audio.sfx('repair');
  }
}

const PART_SLOTS = [['head', '頭'], ['body', 'ボディ'], ['armR', '右腕'], ['armL', '左腕'], ['legs', '脚'], ['engine', 'エンジン']];
const slotName = (s) => ({ head: '頭', body: 'ボディ', arm: '腕', legs: '脚', engine: 'エンジン' }[s]);

async function partSlots(mc) {
  for (;;) {
    const st = machineStats(mc);
    const slotKey = await ui.menu({
      title: `${esc(machineName(mc))}のパーツ`, header: `${esc(st.typeName)}タイプ　装甲 ${st.maxArmor}　防御 ${st.def}　重さ ${st.weight}/${st.cap}`, wide: true, desc: true,
      items: PART_SLOTS.map(([k, n]) => ({ label: `${n}：${esc(PARTS[mc.parts[k]].name)}`, value: k, desc: partDesc(PARTS[mc.parts[k]]) })),
    });
    if (!slotKey) return;
    const want = slotKey.startsWith('arm') ? 'arm' : slotKey;
    const cands = Object.keys(G.inv.parts).filter((id) => PARTS[id].slot === want);
    if (!cands.length) { await ui.say('付け替えられるパーツを持っていない。パーツ屋で買おう。'); continue; }
    const id = await ui.menu({
      title: '付け替えるパーツ', wide: true, desc: true,
      header: '選んでいるパーツに替えたときの「今 → 変更後（差）」', className: 'cmp-menu',
      items: cands.map((id) => { const err = checkPart(mc, slotKey, id); return { label: `${esc(PARTS[id].name)} ×${G.inv.parts[id]}`, value: id, disabled: !!err, desc: (err ? `<b class="warn">${esc(err)}</b><br>` : '') + partCompare(mc, slotKey, id) }; }),
    });
    if (!id) continue;
    const err = equipPart(mc, slotKey, id);
    if (err) { audio.sfx('error'); await ui.say(err); } else { audio.sfx('repair'); ui.toast('パーツを付け替えた。見た目も変わったぞ'); }
  }
}

async function upgradeMenu() {
  for (;;) {
    const list = ownedWeapons();
    if (!list.length) { await ui.say('強化できる武器がない。'); return; }
    const uid = await ui.menu({
      title: '武器強化（担当：メカニック）', wide: true, desc: true, header: `所持 ${GEAR}${fmt(G.gear)}　素材：${Object.entries(G.inv.mats).map(([k, n]) => `${MATERIALS[k].name}${n}`).join(' ') || 'なし'}`,
      items: list.map((w) => {
        const def = WEAPONS[w.id];
        const maxed = (w.plus || 0) >= UPGRADE.maxPlus;
        const c = UPGRADE.costs[w.plus || 0];
        const gear = maxed ? 0 : costWithDiscount(Math.max(UPGRADE.minGear, Math.round(def.price * c.gearRate)));
        const on = weaponEquippedOn(w.uid);
        return {
          label: `${WEAPON_CATS[def.cat].icon} ${esc(weaponLabel(w))}`, right: maxed ? '<b class="ok">MAX</b>' : `${GEAR}${fmt(gear)}`, value: w.uid,
          desc: maxed ? '最大まで強化済み。武器が光り輝いている！' : `+${(w.plus || 0) + 1}にするには：${GEAR}${fmt(gear)}　${esc(matsText(c.materials))}<br>攻撃 ${weaponAtk(w)} → ${Math.round(def.atk * (1 + UPGRADE.atkRate * ((w.plus || 0) + 1)))}${on ? `　<small>(${esc(machineName(on.mc))}に装備中)</small>` : ''}`,
        };
      }),
    });
    if (!uid) return;
    const w = weaponByUid(uid);
    const def = WEAPONS[w.id];
    if ((w.plus || 0) >= UPGRADE.maxPlus) continue;
    const c = UPGRADE.costs[w.plus || 0];
    const gear = costWithDiscount(Math.max(UPGRADE.minGear, Math.round(def.price * c.gearRate)));
    if (G.gear < gear || !hasMats(c.materials)) { audio.sfx('error'); await ui.say(`足りないものがある。必要：${gear} ギア、${matsText(c.materials)}`); continue; }
    if (!(await ui.confirm(`${esc(weaponLabel(w))}を強化しますか？`))) continue;
    addGear(-gear);
    for (const [k, n] of Object.entries(c.materials)) addMat(k, -n);
    w.plus = (w.plus || 0) + 1;
    audio.sfx('repair');
    setTimeout(() => audio.sfx(w.plus >= 5 ? 'seal' : 'levelup'), 500);
    await ui.say(w.plus >= 5 ? `${ren().name}「できた！ ${def.name}+5！ 光ってる……形まで変わったぞ！」` : `${ren().name}「よし、${weaponLabel(w)}に強化完了！」`);
  }
}

async function modMenu(mc) {
  for (;;) {
    const st = machineStats(mc);
    const body = PARTS[mc.parts.body];
    const fr = MODS.frame[mc.mods.frame];
    const en = MODS.engine[mc.mods.engine];
    const frameMax = !fr || st.slots >= (body.maxSlots || 5);
    const items = [
      { label: `フレーム強化（武器スロット +1）`, right: frameMax ? '<b class="ok">MAX</b>' : `${GEAR}${fmt(costWithDiscount(fr.gear))}`, value: 'frame', disabled: frameMax, desc: frameMax ? 'これ以上スロットは増やせない' : `スロット ${st.slots} → ${st.slots + 1}<br>必要：${esc(matsText(fr.materials))}` },
      { label: `エンジン強化（積める重さ +${en ? en.cap : 0}）`, right: !en ? '<b class="ok">MAX</b>' : `${GEAR}${fmt(costWithDiscount(en.gear))}`, value: 'engine', disabled: !en, desc: !en ? '最大まで強化済み' : `積める重さ ${st.cap} → ${st.cap + en.cap}<br>必要：${esc(matsText(en.materials))}` },
    ];
    const v = await ui.menu({ title: `${esc(machineName(mc))}の改造`, header: 'メカニック割引 30%', desc: true, wide: true, items });
    if (!v) return;
    const m = v === 'frame' ? fr : en;
    const gear = costWithDiscount(m.gear);
    if (G.gear < gear || !hasMats(m.materials)) { audio.sfx('error'); await ui.say(`足りないものがある。必要：${gear} ギア、${matsText(m.materials)}`); continue; }
    if (!(await ui.confirm('改造しますか？'))) continue;
    addGear(-gear);
    for (const [k, n] of Object.entries(m.materials)) addMat(k, -n);
    mc.mods[v]++;
    audio.sfx('repair');
    await ui.say(v === 'frame' ? '武器スロットがひとつ増えた！' : 'エンジンの出力が上がった！ 積める重さが増えた。');
  }
}

async function pilotMenu(here) {
  const m = await ui.menu({ title: '誰の乗るマシンを決める？', items: partyMembers().map((mm) => ({ label: esc(mm.name), right: mm.machine ? esc(machineName(G.machines[mm.machine])) : '生身', value: mm })) });
  if (!m) return;
  const owned = Object.values(G.machines).filter((mc) => mc.owned);
  const items = owned.map((mc) => ({ label: esc(machineName(mc)), right: pilotName(mc), value: mc.id, disabled: !canPilot(m, mc), desc: !canPilot(m, mc) ? 'メカニック専用の機体だ' : '' }));
  items.push({ label: '生身で戦う', value: '__foot' });
  const id = await ui.menu({ title: `${esc(m.name)}が乗るマシン`, desc: true, items });
  if (!id) return;
  if (id === '__foot') { m.machine = null; return; }
  for (const other of partyMembers()) if (other.machine === id) other.machine = null;
  m.machine = id;
  audio.sfx('ok');
  void here;
}

async function towMenu(town, shop) {
  const away = Object.values(G.machines).filter((mc) => mc.owned && mc.loc.type === 'map');
  if (!away.length) { await ui.say('外に置いてきたマシンはない。'); return; }
  const fee = costWithDiscount(shop.towFee);
  const mc = await ui.menu({ title: `レッカー回収（${fee} ギア）`, items: away.map((m) => ({ label: esc(machineName(m)), right: esc(MAPS[m.loc.map].name), value: m })) });
  if (!mc) return;
  if (G.gear < fee) { audio.sfx('error'); await ui.say('ギアが足りない。'); return; }
  addGear(-fee);
  mc.loc = { type: 'garage', town };
  audio.sfx('ok');
  await ui.say(`${machineName(mc)}をガレージまで運んできた。`);
}

// ---------------- 説明文 ----------------
function weaponDesc(w, inst) {
  const tgt = { one: '単体', group: 'グループ', all: '全体' }[w.target];
  const el = w.elem ? `　属性:${w.elem === 'elec' ? '<b class="elec">電気</b>' : '<b class="fire">火</b>'}` : '';
  const atk = inst ? weaponAtk(inst) : w.atk;
  return `${WEAPON_CATS[w.cat].name}（${w.mount === 'arm' ? '腕' : '背中'}）　攻撃${atk}　命中${w.hit >= 0 ? '+' : ''}${w.hit}　重さ${w.wt}　${tgt}${el}${w.en ? `　EN${w.en}` : ''}`;
}
function footDesc(f) {
  return f.type === 'weapon' ? `生身の武器　攻撃${f.atk}　命中${f.hit >= 0 ? '+' : ''}${f.hit}${f.target === 'group' ? '　グループ攻撃' : ''}` : `生身の防具　防御${f.def}${f.eva ? `　回避${f.eva >= 0 ? '+' : ''}${f.eva}` : ''}`;
}
function partDesc(p, cur) {
  const diff = (k) => (cur && cur[k] != null ? ` <small>(${(p[k] || 0) - (cur[k] || 0) >= 0 ? '+' : ''}${(p[k] || 0) - (cur[k] || 0)})</small>` : '');
  if (p.slot === 'engine') return `積める重さ${p.cap}${diff('cap')}　エネルギー${p.en}${diff('en')}`;
  let s = `装甲${p.armor}${diff('armor')}　防御${p.def}${diff('def')}　重さ${p.wt}${diff('wt')}`;
  if (p.slot === 'head') s += `　命中+${p.hit}　索敵${p.scan}`;
  if (p.slot === 'arm') s += `　攻撃×${p.atkMul}　命中${p.hit >= 0 ? '+' : ''}${p.hit}${p.power ? '　<b>重い腕武器OK</b>' : ''}`;
  if (p.slot === 'legs') s += `　回避${p.eva >= 0 ? '+' : ''}${p.eva}`;
  if (p.slot === 'body') s += `　武器スロット${p.slots}（最大${p.maxSlots}）　<b>${MACHINE_TYPES[p.mtype].name}タイプ</b>`;
  if (p.slot === 'legs' && p.spd) s += `　速さ${p.spd >= 0 ? '+' : ''}${p.spd}`;
  return s;
}

// =====================================================================
// フィールドのメニュー
// =====================================================================
export async function openFieldMenu(world) {
  for (;;) {
    const v = await ui.menu({
      title: 'メニュー', pos: 'right',
      header: `${GEAR}${fmt(G.gear)} ギア`,
      items: [
        { label: 'つよさ', value: 'status' },
        { label: 'どうぐ', value: 'items' },
        { label: 'ちず', value: 'map' },
        { label: 'そうび（生身）', value: 'equip' },
        { label: 'マシン', value: 'machines' },
        { label: '調べる', value: 'search' },
        { label: '手配書', value: 'bounty' },
        { label: '素材', value: 'mats' },
        { label: 'せってい', value: 'settings' },
        { label: 'タイトルへ', value: 'title' },
      ],
    });
    if (!v) return;
    if (v === 'status') await statusMenu();
    if (v === 'items') { const before = G.pos.map; await itemMenu(false, world); if (G.pos.map !== before || !world.active) return; }
    if (v === 'map') await openMapView(world);
    if (v === 'equip') await equipMenu();
    if (v === 'machines') await machineList();
    if (v === 'bounty') await bountyList();
    if (v === 'mats') await ui.panel(`<table class="kv">${Object.entries(MATERIALS).map(([k, m]) => `<tr><th>${esc(m.name)}</th><td>${G.inv.mats[k] || 0}</td><td><small>${esc(m.desc)}</small></td></tr>`).join('')}</table>`, { title: '素材（武器強化・改造に使う）' });
    if (v === 'settings') await settingsMenu(world);
    if (v === 'search') { ui.closeAll(); world.lock(false); await world.onAction(); return; }
    if (v === 'title') {
      if (await ui.confirm('タイトル画面にもどりますか？（オートセーブされます）')) { autosave(); ui.closeAll(); flow.toTitle(); return; }
    }
  }
}

// ---------------- ちず（歩いた場所が記録される） ----------------
export async function openMapView(world) {
  const map = world.map;
  if (map.type === 'town' || map.type === 'interior') { await ui.say(`${map.name}にいる。町の中に地図はいらない。`); return; }
  const W = map.width, H = map.height;
  const k = Math.max(3, Math.floor(Math.min(520 / W, 300 / H)));
  const cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
  const g = cv.getContext('2d');
  g.fillStyle = '#05060a'; g.fillRect(0, 0, cv.width, cv.height);
  const ex = G.explored?.[map.id] || '';
  const walkCol = { 5: '#c8a060', 2: '#7a8496', 1: '#9a8672', 25: '#9a8672', 26: '#6a7090', 17: '#7a5a90', 12: '#6a6a6a', 9: '#a8a060', 0: '#c8b088' };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (ex[y * W + x] !== '1') continue;
    const t = map.grid[y][x];
    const info = TILES[t];
    g.fillStyle = info?.walk ? (walkCol[t] || '#b09a78') : t === 8 ? '#3a8a2a' : '#2e2a2a';
    if (info?.hidden) g.fillStyle = '#2e2a2a';
    g.fillRect(x * k, y * k, k, k);
  }
  const dot = (x, y, col, r = k * 0.9) => { g.fillStyle = col; g.beginPath(); g.arc((x + 0.5) * k, (y + 0.5) * k, r, 0, 7); g.fill(); };
  for (const w of map.warps || []) if (ex[w.y * W + w.x] === '1') dot(w.x, w.y, '#ffd040', k);
  for (const c of map.chests || []) if (ex[c.y * W + c.x] === '1') { const op = G.flags.opened?.[`${map.id}:${c.id}`]; g.fillStyle = op ? '#5a5a5a' : '#ffcc33'; g.fillRect(c.x * k, c.y * k, k, k); }
  for (const sy of map.symbols || []) if (ex[sy.y * W + sy.x] === '1' && !(sy.bounty ? G.bounties[sy.bounty] : G.flags[sy.flag])) dot(sy.x, sy.y, '#ff3a2a', k * 1.2);
  dot(G.pos.x - 0.5, G.pos.y - 0.5, '#5ff2ff', k * 1.3);
  const known = ex.split('').filter((c) => c === '1').length;
  await ui.panel(`<div class="mapview"><img src="${cv.toDataURL()}" alt="地図"></div>
    <div class="note">● 水色＝いまいる場所　● 黄＝出入口　■ 金＝まだ開けていない宝箱　● 赤＝ボス　（歩いた場所が地図に残ります：${Math.round(100 * known / (W * H))}%）</div>`, { title: `ちず：${esc(map.name)}`, className: 'map-panel' });
}

async function statusMenu() {
  const m = await ui.menu({ title: 'つよさ', items: partyMembers().map((mm) => ({ label: esc(mm.name), right: `Lv${mm.lv}`, value: mm })) });
  if (!m) return;
  const st = memberStats(m);
  const c = CHARACTERS[m.id];
  let mhtml = '';
  if (m.machine) {
    const mc = G.machines[m.machine];
    const ms = machineStats(mc);
    const ws = mc.slots.map((uid, i) => (uid ? `<li>${SLOT_INFO[i].name}：${esc(weaponLabel(weaponByUid(uid)))}</li>` : '')).join('');
    mhtml = `<h4>マシン：${esc(machineName(mc))}　<small>${esc(ms.typeName)}タイプ${mc.id === 'alpha' ? `・${esc(sealInfo().name)}` : ''}</small></h4>
      <table class="kv"><tr><th>装甲</th><td>${mc.armor}/${ms.maxArmor}</td><th>EN</th><td>${mc.en}/${ms.maxEn}</td></tr>
      <tr><th>防御</th><td>${ms.def}</td><th>命中</th><td>+${ms.hit}</td></tr><tr><th>回避</th><td>${ms.eva}</td><th>重さ</th><td>${ms.weight}/${ms.cap}</td></tr></table><ul class="wlist">${ws}</ul>`;
  }
  await ui.panel(`
    <div class="status-role">${esc(c.roleName)}　<small>${esc(c.desc)}</small></div>
    <table class="kv"><tr><th>レベル</th><td>${m.lv}</td><th>次まで</th><td>${expToNext(m)}</td></tr>
    <tr><th>体力</th><td>${m.hp}/${st.maxHp}</td><th>攻撃</th><td>${st.atk}</td></tr>
    <tr><th>防御</th><td>${st.def}</td><th>命中</th><td>${st.hit}</td></tr>
    <tr><th>回避</th><td>${st.eva}</td><th>素早さ</th><td>${st.spd}</td></tr>
    <tr><th>武器</th><td colspan="3">${esc(FOOT_GEAR[m.equip.weapon]?.name || 'なし')}</td></tr>
    <tr><th>防具</th><td colspan="3">${esc(FOOT_GEAR[m.equip.armor]?.name || 'なし')}</td></tr>
    <tr><th>特技</th><td colspan="3">${esc(c.skill.name)}：${esc(c.skill.desc)}</td></tr></table>${mhtml}`, { title: esc(m.name) });
}

// 道具を使う（inBattle=true の時は battle.js から呼ばれる）
export async function chooseItemTarget(id, inBattle = false) {
  const it = ITEMS[id];
  if (it.use === 'warp') return inBattle ? null : { warp: true };
  // 戦闘中は、味方のマシンやキャラを直接タップしても選べる（battle.js が ui.pickHook で光らせる）
  const bo = inBattle ? { className: 'battle-cmd', passThrough: true, onFocus: (x) => ui.pickHook?.focus?.(x?.value) } : {};
  if (it.use === 'hp') return ui.menu({ ...bo, title: `${esc(it.name)}：誰に？`, items: partyMembers().map((m) => ({ label: esc(m.name), right: `${m.hp}/${memberStats(m).maxHp}`, value: { member: m }, disabled: m.ko })) });
  if (it.use === 'revive') return ui.menu({ ...bo, title: `${esc(it.name)}：誰に？`, items: partyMembers().map((m) => ({ label: esc(m.name), right: m.ko ? '気絶' : '', value: { member: m }, disabled: !m.ko })) });
  if (it.use === 'allheal') return { all: true };
  const mcs = Object.values(G.machines).filter((mc) => mc.owned && (mc.loc.type === 'party' || mc.loc.type === 'garage' || mc.loc.type === 'map'));
  return ui.menu({ ...bo, title: `${esc(it.name)}：どのマシンに？`, items: (inBattle ? mcs.filter((mc) => mc.loc.type === 'party') : mcs).map((mc) => { const st = machineStats(mc); return { label: esc(machineName(mc)), right: `装甲${mc.armor}/${st.maxArmor} EN${mc.en}/${st.maxEn}`, value: { mc }, disabled: mc.broken }; }) });
}

export function applyItem(id, target) {
  const it = ITEMS[id];
  const amt = it.amount;
  const healM = (m, n) => { const mx = memberStats(m).maxHp; const b = m.hp; m.hp = Math.min(mx, m.hp + n); return m.hp - b; };
  const healA = (mc, n) => { const mx = machineStats(mc).maxArmor; const b = mc.armor; mc.armor = Math.min(mx, mc.armor + n); return mc.armor - b; };
  const healE = (mc, n) => { const mx = machineStats(mc).maxEn; const b = mc.en; mc.en = Math.min(mx, mc.en + n); return mc.en - b; };
  addItem(id, -1);
  if (it.use === 'hp') return `${target.member.name}の体力が${healM(target.member, amt)}回復した`;
  if (it.use === 'revive') { const m = target.member; m.ko = false; m.hp = Math.max(1, Math.floor(memberStats(m).maxHp * amt)); return `${m.name}が目を覚ました！`; }
  if (it.use === 'armor') return `${machineName(target.mc)}の装甲が${healA(target.mc, amt)}回復した`;
  if (it.use === 'en') return `${machineName(target.mc)}のエネルギーが${healE(target.mc, amt)}回復した`;
  if (it.use === 'maint') { healA(target.mc, amt); healE(target.mc, amt); return `${machineName(target.mc)}の装甲とエネルギーが全回復した`; }
  if (it.use === 'allheal') {
    for (const m of partyMembers()) { m.ko = false; m.hp = memberStats(m).maxHp; }
    for (const mc of Object.values(G.machines)) if (mc.loc.type === 'party') { healA(mc, 9999); }
    return 'みんなの体力とマシンの装甲が全回復した！';
  }
  return '';
}

let itemWorld = null;
export async function itemMenu(inBattle, world) {
  if (world) itemWorld = world;
  for (;;) {
    const list = Object.entries(G.inv.items).filter(([, n]) => n > 0);
    if (!list.length) { await ui.say('道具を持っていない。'); return null; }
    const id = await ui.menu({ title: 'どうぐ', desc: true, className: inBattle ? 'battle-cmd wide' : '', items: list.map(([id, n]) => ({ label: esc(ITEMS[id].name), right: `×${n}`, value: id, desc: esc(ITEMS[id].desc) })) });
    if (!id) return null;
    if (inBattle && ITEMS[id].use === 'warp') { await ui.say('戦闘中はワープユニットを使えない。'); continue; }
    const target = await chooseItemTarget(id, inBattle);
    if (!target) continue;
    if (inBattle) return { id, target };
    if (target.warp) {
      if (await teleportMenu(itemWorld, false)) return null;
      continue;
    }
    const msg = applyItem(id, target);
    audio.sfx(ITEMS[id].use === 'armor' || ITEMS[id].use === 'maint' ? 'repair' : 'heal');
    await ui.say(msg);
  }
}

async function equipMenu() {
  for (;;) {
    const m = await ui.menu({ title: 'そうび（生身）', items: partyMembers().map((mm) => ({ label: esc(mm.name), right: `${esc(FOOT_GEAR[mm.equip.weapon]?.name || '')} / ${esc(FOOT_GEAR[mm.equip.armor]?.name || '')}`, value: mm })), wide: true });
    if (!m) return;
    const kind = await ui.menu({ title: esc(m.name), items: [{ label: `武器：${esc(FOOT_GEAR[m.equip.weapon]?.name || 'なし')}`, value: 'weapon' }, { label: `防具：${esc(FOOT_GEAR[m.equip.armor]?.name || 'なし')}`, value: 'armor' }] });
    if (!kind) continue;
    const owned = Object.entries(G.inv.foot).filter(([id, n]) => n > 0 && FOOT_GEAR[id].type === kind);
    if (!owned.length) { await ui.say('付け替えられる装備がない。武器屋で買おう。'); continue; }
    const id = await ui.menu({ title: '付け替える装備', header: '「今 → 変更後（差）」', desc: true, wide: true, className: 'cmp-menu', items: owned.map(([id, n]) => ({ label: `${esc(FOOT_GEAR[id].name)} ×${n}`, value: id, desc: footCompare(m, kind, id) })) });
    if (!id) continue;
    const old = m.equip[kind];
    if (old) addFoot(old, 1);
    addFoot(id, -1);
    m.equip[kind] = id;
    audio.sfx('ok');
  }
}

async function machineList() {
  const owned = Object.values(G.machines).filter((mc) => mc.owned);
  const where = (mc) => (mc.loc.type === 'party' ? '乗っている' : mc.loc.type === 'garage' ? `${MAPS[mc.loc.town].name}のガレージ` : `${MAPS[mc.loc.map].name}に駐車`);
  const mc = await ui.menu({ title: 'マシン', wide: true, items: owned.map((m) => ({ label: esc(machineName(m)), right: `${esc(where(m))}　${pilotName(m)}`, value: m })) });
  if (!mc) return;
  const st = machineStats(mc);
  const def = MACHINES[mc.id];
  const parts = PART_SLOTS.map(([k, n]) => `<tr><th>${n}</th><td>${esc(PARTS[mc.parts[k]].name)}</td></tr>`).join('');
  const ws = SLOT_INFO.map((info, i) => `<tr><th>${info.name}</th><td>${i >= st.slots ? '<small>（未解放）</small>' : mc.slots[i] ? esc(weaponLabel(weaponByUid(mc.slots[i]))) : '<small>なし</small>'}</td></tr>`).join('');
  await ui.panel(`
    <p>${esc(def.desc || '')}</p>
    <p><b>${esc(st.typeName)}タイプ</b>：<small>${esc(MACHINE_TYPES[st.type].desc)}</small></p>
    ${mc.id === 'alpha' ? `<p>メカニック専用。状態：<b>${esc(sealInfo().name)}</b></p>` : `<p class="note">${def.pilot === 'any' ? '誰でも乗れる' : 'メカニック専用'}</p>`}
    <table class="kv"><tr><th>装甲</th><td>${mc.armor}/${st.maxArmor}${mc.broken ? ' <b class="warn">大破</b>' : ''}</td><th>EN</th><td>${mc.en}/${st.maxEn}</td></tr>
    <tr><th>防御</th><td>${st.def}</td><th>重さ</th><td>${st.weight}/${st.cap}</td></tr></table>
    <div class="cols"><table class="kv">${parts}</table><table class="kv">${ws}</table></div>
    <p class="note">パーツと武器の付け替えは町のガレージで。</p>`, { title: esc(machineName(mc)) });
}

async function settingsMenu(world) {
  for (;;) {
    const pct = (v) => `${Math.round(v * 100)}%`;
    const v = await ui.menu({
      title: 'せってい',
      items: [
        { label: 'BGMの音量', right: pct(settings.bgm), value: 'bgm' },
        { label: '効果音の音量', right: pct(settings.se), value: 'se' },
        { label: 'マップ表示', right: settings.mapMode === '3d' ? '立体（標準）' : '2D（軽量）', value: 'map' },
        { label: '全画面表示', value: 'fs' },
      ],
    });
    if (!v) return;
    if (v === 'bgm' || v === 'se') {
      const vals = [0, 0.25, 0.5, 0.7, 0.85, 1];
      const cur = vals.findIndex((x) => Math.abs(x - settings[v]) < 0.01);
      settings[v] = vals[(cur + 1) % vals.length];
      audio.saveSettings();
      audio.sfx('ok');
    }
    if (v === 'map') { settings.mapMode = settings.mapMode === '3d' ? '2d' : '3d'; audio.saveSettings(); world.build(); }
    if (v === 'fs') { try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { ui.toast('この端末では全画面にできません'); } }
  }
}
