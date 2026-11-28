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
import { FOOT_SLOTS, FOOT_CATS, SETS, EVOLVE, FAVORITE_RANGE, FAVORITE_BONUS } from '../data/footgear.js';
import { CHARACTERS, LEVEL } from '../data/characters.js';
import { MACHINES } from '../data/machines.js';
import { ENEMIES, BOUNTIES } from '../data/enemies.js';
import { TILES } from '../data/tiles.js';
import { PLANETS, planetOfTown } from '../data/planets.js';
import { DEV_ROOM, devSession } from '../data/debug.js';
import { TUNE_TABLES, FIELD_NAMES, CHOICES, fieldsOf, defaultOf, valueOf, isChanged, isColor, stepOf, showValue, changedCount, setTuning, resetTuning, exportTuning } from '../game/tuning.js';
import { devStore } from './devroom.js';
import { hangarList } from './hangar.js';
import {
  G, partyMembers, memberStats, machineStats, machineName, canPilot, expToNext, addGear, addItem, addFoot, addWeapon, addPart,
  weaponByUid, weaponEquippedOn, weaponAtk, weaponLabel, equipWeapon, checkMount, equipPart, checkPart, hasMats, matsText, addMat,
  healParty, repairMachine, machinesInGarage, sealInfo, typeBoost, FOOT_SLOT_KEYS, canWearFoot,
  partCount, removePart, testTag, TEST_MARK, testFootCount, addTest, resetTestItems, createMachine, pilotError, hasCoreSlot, weaponLocked,
} from '../game/state.js';
import { compareView } from './compare.js';
import { buildMachineModel } from '../models/mech.js';
import { buildCharModel } from '../models/char-look.js';
import { machineSpec } from './world.js';
import { flow } from '../game/flow.js';
import { bestAll, bestFoot, bestMachine } from '../game/best-gear.js';
import { nextObjective, CHAPTERS, mapRevealed } from '../data/chapters.js';
import { swapDirs } from '../data/orient.js';
import { mapMarks, blinkAlpha } from '../core/map-marks.js';
import { DIFFICULTY, DIFF_ORDER, difficultyOf } from '../data/difficulty.js';
// 町の番号から章（town10〜12＝第4章 … town19＝第7章）
const chapterOfTown = (t) => { const n = Number(String(t).replace('town', '')); return n >= 19 ? 7 : n >= 10 ? 4 + Math.floor((n - 10) / 3) : 0; };

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
      'マスター「宇宙のどこかに、持ち主を選ぶ“専用の装備”が眠ってるって噂だ。工具の形をした兵器もあるとか……メカニックのおまえさんにぴったりだな」',
    ],
    town2: [
      'マスター「坑道を抜けたら山脈の東側だ。あっちの敵は一段手ごわいぞ」',
      'マスター「金ピカのドローンを見たら逃がすなよ。ギアをたんまり落とすって噂だ」',
      'マスター「レーダーヘッドを付けると、弾がよく当たるようになる」',
      'マスター「昔の宇宙軍には、黒い機体と照準をつなぐ狙撃銃があったらしい。今はどこかの研究所に沈んでるって話だ」',
    ],
    town3: [
      'マスター「海賊船の中は狭い。マシンは外に置いて、生身で行くしかない」',
      'マスター「廃工場の奥は、マシンに乗ったまま入れる。生身じゃとても無理だろうな」',
      'マスター「全員まとめて治せるメガリカバリー、ボス戦の前に持っていきな」',
      'マスター「傭兵の墓場って知ってるか？ 背丈ほどの大剣が眠ってるそうだ。光の惑星の“古代の結晶”で、もっと化けるって噂もある」',
      'マスター「白い機体と黒い機体……それに“赤い巨人”の話もある。風の吹く星の大地の底で、深紅の重装機が眠ってるんだと。乗りこなせるのは、よっぽど腕っぷしの強いやつだけだろうな」',
    ],
    // 第2章「風」の惑星
    town4: [
      'マスター「風の星へようこそ。ここの風車は、宇宙生物が来てから回り方がおかしいんだ」',
      'マスター「西の空にでかい鳥がいる。ウィンドラプターって呼ばれてる賞金首さ。火で焼いてやれ」',
      'マスター「北の浮島へは、つり橋を渡っていくんだ。足もとに気をつけな。落ちたら雲の海だ」',
      'マスター「大地の底で眠る赤い巨人の話、聞いたことあるか？ 高原の南西、崩れた岩の奥から地鳴りがするって、羊飼いが言ってたぞ」',
    ],
    town5: [
      'マスター「この島は浮遊装置で浮いてる。昔の研究所の技術らしい」',
      'マスター「東の浮遊研究所は、マシンじゃ入れない。中で何を作ってたのか……誰も知らない」',
      'マスター「北の浮島の上を、空賊の砲艦がうろついてる。今は宇宙生物の巣だ。主砲で装甲をはがせ」',
      'マスター「レンって言ったか？ 白い機体の話をしてやろう。昔、この星の空を、白と黒の機体が並んで飛んでいったんだと」',
    ],
    town6: [
      'マスター「北東の嵐の塔は、風の制御コアがある場所さ。あそこが狂ってから、この星の風は止まらない」',
      'マスター「塔に入るには、研究所の起動キーがいるらしい」',
      'マスター「メガリカバリーは持ったか？ 塔の番人は1ターンに2回動くぞ」',
      'マスター「南西の崩れた岩の奥に、古い格納庫があるって噂だ。赤い機体が眠ってるとか……」',
    ],
    // 第3章「水」の惑星
    town7: [
      'マスター「水の星へようこそ。島と島の間は、東の地下水路を通っていくんだ」',
      'マスター「南の砂浜のでっかいカニ、シェルクラッシャー。あの甲羅は火で焼くと割れやすいぞ」',
      'マスター「北の浅い海は、水中仕様のマシンなら海の底を歩いて渡れるらしい」',
    ],
    town8: [
      'マスター「ドック工房のルカに頼めば、マシンに水中ユニットを付けてくれる。材料さえあればな」',
      'マスター「東の海上プラントは、海賊と宇宙生物の巣だ。生身で行くことになるぞ」',
      'マスター「北西の海の底の渦に、大うなぎがいる。ミサイルで狙え」',
    ],
    town9: [
      'マスター「北東の水没都市には、海の寄生体の親玉がいるって話だ」',
      'マスター「ドームの整備長マリンが、新しい機体の乗り手を探してたぞ」',
      'マスター「白、黒、赤の三機が、この海の底に何かを封じた……そんな昔話がある」',
    ],
    town10: ['マスター「耐熱装甲がないと、溶岩の上でマシンが溶けちまうぞ」', 'マスター「南西の山のすき間の傭兵の墓場に、でっかい剣が眠ってるって噂だ」'],
    town11: ['マスター「耐熱工房のオーブンは、マグマサウルスのうろこを欲しがってる」', 'マスター「島の西の溶鉱炉跡の奥に、隠し部屋があるらしい」'],
    town12: ['マスター「東の浮島の研究所は生身でしか入れない。狂った司令機に気をつけな」', 'マスター「炎帝イグニスは1ターンに2回動く」'],
    town13: ['マスター「古代工房には、メカニックのための道具が残ってるって話だ」', 'マスター「アルファの胸のコアは、星の核の結晶……ステラっていうらしい」'],
    town14: ['マスター「宇宙軍の旧基地には、パイロットのための装備が眠ってるとか」', 'マスター「水晶工房の親方が、新しい機体を組み上げたらしいぞ」'],
    town15: ['マスター「光の神殿には、傭兵の守りの鎧があるそうだ」', 'マスター「古代の結晶と寄生コアで、専用の武器は最後の姿に進化するらしい」'],
    town16: ['マスター「この星の夜は明けない。ランタンを離れるなよ」', 'マスター「ナイトモウを倒すと、メカニックの手袋が出てきたって話だ」'],
    town17: ['マスター「グレイブメックは、パイロットの手袋を飲みこんだらしい」', 'マスター「浮遊ドックの隠し部屋に、三人分の靴があるそうだ」'],
    town18: ['マスター「闇の王を倒したとき、白い機体は本当の姿になるという言い伝えがある」', 'マスター「専用装備は、ガレージで最後の姿にしておけ」'],
    town19: ['マスター「……最後の酒だ。おまえたちの帰りを待ってるぜ」', 'マスター「宝箱には、伝説の武器が眠ってる。全部拾っていけ」'],
  }[currentTown()]?.map((t) => swapDirs(t, chapterOfTown(currentTown()))) || ['マスター「いらっしゃい」'];
  const name = { town1: 'ラストオアシス', town2: '坑夫のねぐら', town3: 'スターポート', town4: 'そよ風亭', town5: '雲の上の止まり木', town6: 'ジェットストリーム', town7: '灯台下', town8: '潮だまり', town9: 'ブルーホール', town10: '溶鉱炉の一杯', town11: '火口亭', town12: '灰の港の灯', town13: '光の杯', town14: '水晶の間', town15: '神殿の泉', town16: '灯の下', town17: '要塞の食堂', town18: '最後の灯', town19: 'ラストオーダー' }[currentTown()] || '酒場';
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
  const v = await ui.menu({ title: '自分のベッド', items: [{ label: '休む（無料）', value: 'rest' }, { label: 'セーブ', value: 'save' }, ...(G.flags.homeEnding ? [{ label: 'エンディングをもう一度見る', value: 'ending' }] : []), { label: 'やめる', value: null }] });
  if (v === 'ending') { ui.closeAll(); flow.homeEnding?.(); return; }
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

// 宇宙船の行き先（星ごと）。need＝行けるようになる封印の段階、flag＝はじめて着いたら立つフラグ
// 新しい星（章）はここに1つ足せば船長の行き先に並ぶ
// まだ行っていない次の星へ飛べるとき true（船長キールの頭の上に「次の惑星へ」の目印を出す）
export function shuttleReady() {
  if (G.seal < 1) return false;
  return SHUTTLE_ROUTES.some((rt) => rt.flag && (rt.ok ? rt.ok() : G.seal >= (rt.need || 0)) && !G.flags[rt.flag]);
}
const SHUTTLE_ROUTES = [
  { planet: 'earth', order: 1, town: 'town3', at: [24.5, 26.5], label: '土の惑星（ウェイポイント）', lines: ['宇宙船は星の海を飛び立った。', '目指すは、なつかしい土の惑星――。'] },
  {
    planet: 'wind', order: 2, town: 'town4', at: [24.5, 8.5], label: '風の惑星（ブリーズヒル）', need: 1, flag: 'ch2Started',
    lines: ['宇宙船は土の惑星を飛び立った。', '星図が示すのは、風の吹く惑星――。', '雲の海に浮かぶ島々が、近づいてくる。'],
    talk: (r, cap) => [
      { name: r, text: '船長さん！ アルファのモニターに、この星図が出たんだ。' },
      { name: cap, text: 'どれどれ……こいつは驚いた。「風の惑星」への航路じゃないか。空に島が浮かぶ、風の強い星だ。' },
      { name: cap, text: 'いいだろう、乗せてってやる。マシンも貨物室に積んでいけるぞ。' },
    ],
    arrive: async (r, cap) => {
      await ui.say([
        { name: cap, text: '着いたぞ。ここが風の惑星、風車の丘の町ブリーズヒルだ。' },
        { name: r, text: 'うわあ……空に島が浮いてる！ 地面の下は、ぜんぶ雲の海だ！' },
        { name: G.members.shion.name, text: '……風が強い。アルファの星図は、この星の北東を指している。' },
        { name: G.members.gina.name, text: 'まずはハンターオフィスで手配書だね。稼ぎながら進もうじゃないか！' },
        { name: '', text: '（仲間のマシンはブリーズヒルのガレージに運ばれた。転送台で第1章の町にも戻れます）' },
      ]);
      ui.banner('第2章「風」の惑星', '空に浮かぶ島々と、止まらない風の星');
    },
  },
  {
    planet: 'water', order: 3, town: 'town7', at: [23.5, 9.5], label: '水の惑星（シーゲート）', need: 2, flag: 'ch3Started',
    lines: ['宇宙船は風の惑星を飛び立った。', '二つ目の封印が示した星図は、青い海の惑星――。', '海に浮かぶ人工島が、近づいてくる。'],
    talk: (r, cap) => [
      { name: r, text: '船長さん、また新しい星図だ！ 青い……海ばっかりの星みたい。' },
      { name: cap, text: '「水の惑星」だな。九割が海で、人工島に町がある。船で行けるのは港町シーゲートまでだ。' },
      { name: cap, text: 'よし、まかせとけ。風の星の次は、水の星だ！' },
    ],
    arrive: async (r, cap) => {
      await ui.say([
        { name: cap, text: '着いたぞ。ここが水の惑星、人工島の港町シーゲートだ。' },
        { name: r, text: '海だ……！ どこまでも青い。島がぽつぽつ浮かんでる！' },
        { name: G.members.gina.name, text: '潮の匂いがするね。泳ぐのは得意じゃないけど、マシンなら大丈夫だろ？' },
        { name: G.members.shion.name, text: '……星図は北の海を指している。海の底に、何かがある。' },
        { name: '', text: '（仲間のマシンはシーゲートのガレージに運ばれた。転送台でほかの星の町にも戻れます）' },
      ]);
      ui.banner('第3章「水」の惑星', '海に浮かぶ人工島と、海の底に沈んだ都市の星');
    },
  },
  newPlanet({
    planet: 'fire', order: 4, town: 'town10', label: '火の惑星（クリムゾンフォージ）', flag: 'ch4Started', ok: () => G.seal >= 3,
    lines: ['宇宙船は水の惑星を飛び立った。', '三つ目の封印が示したのは、赤く燃える惑星――。', '溶岩の川が光る大地が、近づいてくる。'],
    talk: ['船長さん、次の星図だ！ 赤い……燃えてるみたいな星。', '「火の惑星」だな。溶岩の川が流れる星だ。マシンの装甲が溶けないように気をつけろよ。'],
    arrive: ['着いたぞ。火の惑星、溶鉱炉の町クリムゾンフォージだ。', 'あっつ……！ 空まで赤いや。溶岩が川みたいに流れてる！', 'こういう暑いのは嫌いじゃないよ。ひと暴れしようじゃないか！', '……星図は北の火山を指している。'],
    banner: ['第4章「火」の惑星', '溶岩の川と火山の星'],
  }),
  newPlanet({
    planet: 'light', order: 5, town: 'town13', label: '光の惑星（ルミナ）', flag: 'ch5Started', ok: () => !!G.flags.ch4Clear,
    lines: ['宇宙船は火の惑星を飛び立った。', '炎帝の記録が示したのは、まばゆい光の惑星――。', '白い遺跡が光の中に浮かんでいる。'],
    talk: ['船長さん、火山の記録に新しい星図があった！ 白く光る星だ。', '「光の惑星」……古代文明の遺跡の星か。おまえさんたちの機体の生まれ故郷かもしれんな。'],
    arrive: ['着いたぞ。光の惑星、遺跡の町ルミナだ。', 'まぶしい……！ 建物が全部、白い石と金でできてる。', 'すごい場所だね。宝の匂いがするよ。', '……アルファが、何かに反応している。'],
    banner: ['第5章「光」の惑星', '古代文明の遺跡が眠る、光の星'],
  }),
  newPlanet({
    planet: 'dark', order: 6, town: 'town16', label: '闇の惑星（ダスクヴェイル）', flag: 'ch6Started', ok: () => !!G.flags.ch5Clear,
    lines: ['宇宙船は光の惑星を飛び立った。', '光の神殿が示したのは、夜の明けない惑星――。', 'マザーコアの本拠地は、もうすぐそこだ。'],
    talk: ['船長さん……光の神殿の記録に、闇の星への航路があった。', '「闇の惑星」か。マザーコアにいちばん近い星だ。……覚悟はいいな。'],
    arrive: ['着いたぞ。闇の惑星、灯の町ダスクヴェイルだ。ここから先は、おれの船もそうそう近づけない。', '真っ暗だ……ランタンの灯りしかない。', '空気が重いね。あいつらの親玉が近いってことか。', '……オメガが、低く唸っている。'],
    banner: ['第6章「闇」の惑星', '夜の明けない、マザーコアに近い星'],
  }),
  newPlanet({
    planet: 'core', order: 7, town: 'town19', label: 'マザーコアの世界（ラストホープ）', flag: 'ch7Started', ok: () => !!G.flags.ch6Clear,
    lines: ['宇宙船は闇の惑星を飛び立った。', 'アルファマックスの翼が、最後の星図を照らし出す。', 'マザーコアの世界――すべての始まりの場所へ。'],
    talk: ['船長さん。最後の星図だ。マザーコアの世界への航路。', '……ここまで来たんだ。最後まで乗せていくさ。必ず帰ってこいよ。'],
    arrive: ['着いたぞ……マザーコアの世界、最後の前線基地ラストホープだ。', '空も地面も……虹色に燃えてる！？ 六つの星の光が、ぜんぶここに吸い込まれてるんだ。', '最後の大仕事だね。三人と三機、そろって帰るよ！', '……終わらせよう。'],
    banner: ['第7章「マザーコアの世界」', '最終決戦'],
  }),
];

// 第4章以降の星の行き先（字幕と、はじめて着いたときの話を短く書けるように）
function newPlanet(o) {
  for (const k of ['lines', 'talk', 'arrive']) if (o[k]) o[k] = o[k].map((t) => swapDirs(t, o.order));
  return {
    ...o, at: [24.5, 8.5],
    talk: (r, cap) => [{ name: r, text: o.talk[0] }, { name: cap, text: o.talk[1] }],
    arrive: async (r, cap) => {
      const [a, b, c, d] = o.arrive;
      await ui.say([{ name: cap, text: a }, { name: r, text: b }, { name: G.members.gina.name, text: c }, { name: G.members.shion.name, text: d }, { name: '', text: '（仲間のマシンはこの町のガレージに運ばれた。転送台や宇宙船でほかの星にも行けます）' }]);
      ui.banner(o.banner[0], o.banner[1]);
    },
  };
}

// 町の人がマシンを譲ってくれる（第4章以降）
async function machineGift(type, flag, town, who, lines, after) {
  const r = ren().name;
  if (G.flags[flag]) { await ui.say({ name: who, text: after }); return; }
  await ui.say(lines.map((t, i) => ({ name: i === lines.length - 1 && t.startsWith('@') ? r : who, text: t.replace(/^@/, '') })));
  createMachine(type, { loc: { type: 'garage', town } });
  G.flags[flag] = true;
  audio.sfx('levelup');
  ui.banner(`${MACHINES[type].name}を手に入れた！`, `${MAPS[town].name}のガレージに入った`);
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
  // 宇宙船の船長キール：惑星と惑星を結ぶ定期便。頭の上の「次の惑星へ」の目印は shuttleReady()（world.js）。行き先は SHUTTLE_ROUTES（封印の段階 need で次の星が増える）
  if (name === 'shuttleCaptain') {
    const cap = '船長キール';
    const here = planetOfTown(currentTown())?.id;
    if (G.seal < 1) {
      await ui.say([
        { name: cap, text: 'おれの船は星と星を結ぶ定期便……だったんだが、今は飛ばしてない。' },
        { name: cap, text: '行き先の星図がないんだ。宇宙生物のせいで航路がめちゃくちゃでな。' },
      ]);
      return;
    }
    // まだ行っていない次の星の星図を、アルファが映したとき
    const open = (rt) => (rt.ok ? rt.ok() : G.seal >= (rt.need || 0));
    const next = SHUTTLE_ROUTES.find((rt) => rt.flag && open(rt) && !G.flags[rt.flag]);
    if (next && !G.flags[`${next.flag}Talk`]) {
      G.flags[`${next.flag}Talk`] = true;
      await ui.say(next.talk(r, cap));
    }
    // 新しい星ほど上に並べる
    const routes = SHUTTLE_ROUTES.filter((rt) => rt.planet !== here && open(rt)).sort((a, b) => (b.order || 0) - (a.order || 0));
    const v = await ui.menu({ title: '宇宙船（定期便）', header: `${cap}「どこへ飛ぶ？」`, items: [...routes.map((rt) => ({ label: `${rt.label}へ飛ぶ`, value: rt.planet })), { label: 'やめる', value: null }] });
    const rt = routes.find((x) => x.planet === v);
    if (!rt) return;
    const first = rt.flag && !G.flags[rt.flag];
    await flow.flyTo({
      to: rt.town, at: rt.at, from: here || 'earth', planet: rt.planet,
      lines: rt.lines,
      chapter: first ? rt.order : null,
      after: first ? async () => { G.flags[rt.flag] = true; await rt.arrive(r, cap); } : null,
    });
    return;
  }
  // 水上集落のドック工房：マシンに水中ユニットを付ける（シェルクラッシャーの甲羅が必要）
  if (name === 'diveWorkshop') {
    const lk = 'ルカ';
    if (G.flags.diveUnit) { await ui.say({ name: lk, text: '水中ユニットの調子はどうだい？ 北の浅い海なら、海の底を歩いていけるよ。' }); return; }
    if (!G.bounties.shellcrusher) {
      await ui.say([
        { name: lk, text: 'マシンを水の中で動かしたい？ 水中ユニットなら作れるよ。' },
        { name: lk, text: 'ただ、水圧に耐える板がいるんだ。南の砂浜のでっかいカニ……シェルクラッシャーの甲羅がちょうどいいんだけどねえ。' },
        { name: '', text: '（シェルクラッシャーを倒すと、水中ユニットを作ってもらえる）' },
      ]);
      return;
    }
    await ui.say([
      { name: lk, text: 'その甲羅……シェルクラッシャーを倒したのかい!? すごいじゃないか！' },
      { name: lk, text: 'よし、まかせな。あんたたちのマシン、ぜんぶ水の中で動けるようにしてやる。' },
      { name: r, text: '手伝うよ！ メカニックの腕の見せどころだ！' },
    ]);
    await ui.fade(true, 0.4);
    audio.sfx('repair');
    await new Promise((res) => setTimeout(res, 800));
    await ui.fade(false, 0.4);
    G.flags.diveUnit = true;
    audio.sfx('levelup');
    ui.banner('水中ユニットを付けた！', 'マシンに乗っていれば、北の浅い海の底を歩ける');
    await ui.say({ name: lk, text: 'できたよ。まんなかの島の北の浜から、海の中へ下りていけるはずさ。' });
    autosave();
    return;
  }
  // 第4章：カルデラリムの耐熱工房（マグマサウルスのうろこで耐熱装甲を作る）
  if (name === 'heatWorkshop') {
    const ov = 'オーブン';
    if (G.flags.heatArmor) { await ui.say({ name: ov, text: '耐熱装甲の具合はどうだい？ 溶岩の上でも平気だろう。' }); return; }
    if (!G.bounties.magmasaurus) {
      await ui.say([
        { name: ov, text: '溶岩の上をマシンで歩きたい？ 耐熱装甲がいるね。' },
        { name: ov, text: '熱を通さない材料……南の溶岩原のマグマサウルスのうろこがあれば、作れるんだけどねえ。' },
        { name: '', text: '（マグマサウルスを倒すと、耐熱装甲を作ってもらえる）' },
      ]);
      return;
    }
    await ui.say([
      { name: ov, text: 'そのうろこ……マグマサウルスを倒したのかい！ よし、まかせな。全部のマシンに耐熱装甲を張ってやる！' },
      { name: r, text: 'ぼくも手伝う！ 熱の逃げ道は、ここに通すといいよ。' },
    ]);
    await ui.fade(true, 0.4); audio.sfx('repair'); await new Promise((res) => setTimeout(res, 800)); await ui.fade(false, 0.4);
    G.flags.heatArmor = true;
    audio.sfx('levelup');
    ui.banner('耐熱装甲を付けた！', '溶岩の上でもマシンがダメージを受けなくなった');
    autosave();
    return;
  }
  if (name === 'bulldogGift') {
    await machineGift('bulldog', 'bulldogGot', 'town12', '整備長ボイラー', ['灰の港へようこそ。あんたたちが噂のメカニック一行か。', '港の倉庫に、戦車型の「ブルドッグ」が眠ってる。装甲が厚くて溶岩にも強い。使ってくれ。', '@ありがとう！ 大事に整備するよ！'], 'ブルドッグの調子はどうだい？');
    return;
  }
  if (name === 'mantisGift') {
    await machineGift('mantis', 'mantisGot', 'town14', '親方ガラス', ['水晶工房へようこそ。古代の設計図から、四脚の機体を組み上げたんだ。', '「マンティス」。どんな足場でも倒れない。持っていってくれ。', '@すごい……古代の設計図か！ 大切にするよ！'], 'マンティスの脚の具合はどうだい？');
    return;
  }
  if (name === 'rhinoGift') {
    await machineGift('rhino', 'rhinoGot', 'town17', '整備長アイゼン', ['要塞の整備長だ。闇の王に挑むなら、こいつを連れていけ。', '突撃型の「ライノ」。要塞でいちばん頑丈な機体だ。', '@ありがとう。必ず、勝って帰ってくる！'], 'ライノは要塞の誇りだ。頼んだぞ。');
    return;
  }
  // 海上ドームの整備長：砲台型マシン「バスティオン」を譲ってくれる
  if (name === 'bastionGift') {
    const mr = '整備長マリン';
    if (!G.flags.bastionGot) {
      await ui.say([
        { name: mr, text: 'あんたたちが噂のメカニック一行ね。ドームの防衛用に作った機体があるの。' },
        { name: mr, text: '砲台型の「バスティオン」。足は遅いけど、主砲をたくさん積めるわ。水没都市に行くなら使って。' },
        { name: r, text: 'ありがとう！ 大事に整備するよ！' },
      ]);
      createMachine('bastion', { loc: { type: 'garage', town: 'town9' } });
      G.flags.bastionGot = true;
      audio.sfx('levelup');
      ui.banner('バスティオンを手に入れた！', 'アクアドームのガレージに入った（砲台型）');
      autosave();
      return;
    }
    await ui.say({ name: mr, text: 'バスティオンの調子はどう？ 水没都市の奥は暗いから気をつけてね。' });
    return;
  }
  // 空港の整備長ハヤテ：偵察機スパロウを譲ってくれる
  if (name === 'sparrowGift') {
    const h = '整備長ハヤテ';
    if (!G.flags.sparrowGot) {
      await ui.say([
        { name: h, text: 'あんたたち、土の星から来たメカニック一行だろ？ うわさは聞いてるよ。' },
        { name: h, text: '空港で使ってた偵察機があるんだが、乗り手がいなくてね。軽くて速いシャープ型さ。' },
        { name: r, text: 'えっ、いいの!? ちゃんと整備して大事にするよ！' },
      ]);
      createMachine('sparrow', { loc: { type: 'garage', town: 'town6' } });
      G.flags.sparrowGot = true;
      audio.sfx('levelup');
      ui.banner('スパロウを手に入れた！', 'ゲイルポートのガレージに入った（シャープタイプ）');
      autosave();
      return;
    }
    await ui.say({ name: h, text: 'スパロウの調子はどうだい？ 嵐の塔の乱気流には気をつけな。' });
    return;
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
// 商品を選ぶと右に詳細（効果・値段・所持数・装備の比較）が出るだけ。「買う」を押すと個数（＋ー）→ 最後に確認 → 確定
const sellPrice = (def) => def.sell ?? Math.floor((def.price || 0) / 2);
const ownCount = {
  w: (id) => G.inv.weapons.filter((w) => w.id === id).length,
  p: (id) => partCount(id),
  i: (id) => G.inv.items[id] || 0,
  f: (id) => (G.inv.foot[id] || 0) + Object.values(G.members).filter((m) => m.joined && Object.values(m.equip).includes(id)).length,
};
const canBuy = (price) => () => (G.gear >= price ? true : 'ギアが足りない');
const detailBox = (name, price, own, body, cmp) => `<div class="sd-name">${name}</div>
  <div class="sd-price">${price != null ? `値段 ${GEAR}${fmt(price)}　` : ''}所持 ${own}</div><div class="sd-desc">${body}</div>${cmp ? `<div class="sd-cmp">${cmp}</div>` : ''}`;
// 仲間のマシン（乗る人が決まっているもの）
const partyMachines = () => partyMembers().map((m) => m.machine && G.machines[m.machine]).filter((mc) => mc?.owned && !mc.broken);

// マシンの武器：仲間のマシンに付けたら攻撃がどう変わるか
function mountCompare(def) {
  const rows = [];
  for (const mc of partyMachines()) {
    if (def.only && def.only !== mc.type) { rows.push(`<tr><th>${esc(machineName(mc))}</th><td colspan="4"><small>専用ではないので付けられない</small></td></tr>`); continue; }
    const st = machineStats(mc);
    const slots = [...Array(st.slots).keys()].filter((i) => fitsSlot(SLOT_INFO[i], def));
    if (!slots.length) continue;
    const slot = slots.find((i) => !mc.slots[i]) ?? slots[0];
    const cur = mc.slots[slot] ? weaponByUid(mc.slots[slot]) : null;
    const a = slotAtk(mc, slot, cur) ?? 0, b = slotAtk(mc, slot, { id: Object.keys(WEAPONS).find((k) => WEAPONS[k] === def), plus: 0 });
    const d = b - a;
    rows.push(`<tr><th>${esc(machineName(mc))}<small>（${SLOT_INFO[slot].name}）</small></th><td>${a}</td><td class="arr">→</td><td class="cmp-${d > 0 ? 'up' : d < 0 ? 'down' : 'same'}">${b}</td><td>${d ? `<span class="cmp-${d > 0 ? 'up' : 'down'}">（${d > 0 ? '▲+' : '▼'}${d}）</span>` : ''}</td></tr>`);
  }
  return rows.length ? `<div class="cmp-head">仲間のマシンに付けたときの攻撃</div><table class="cmp">${rows.join('')}</table>` : '';
}
// パーツ：仲間のマシンに付けたら（変わる数値だけ）
function partShopCompare(id) {
  const p = PARTS[id];
  const key = { head: 'head', body: 'body', legs: 'legs', engine: 'engine', arm: 'armR' }[p.slot];
  return partyMachines().map((mc) => `<div class="cmp-head">${esc(machineName(mc))}${p.slot === 'arm' ? '（右腕）' : ''}</div>${compareTable(partRows(mc, key, id), true)}`).join('') || '';
}
// 生身の装備：仲間それぞれが装備したら
function footShopCompare(id) {
  const f = FOOT_GEAR[id];
  return partyMembers().map((m) => {
    if (!canWearFoot(m, id)) return `<div class="cmp-head">${esc(m.name)}：<small>装備できない（${esc(CHARACTERS[f.only].defaultName)}専用）</small></div>`;
    const fav = f.slot === 'weapon' && (f.target || 'one') === FAVORITE_RANGE[m.id] ? ' <b class="ok">得意な範囲</b>' : '';
    return `<div class="cmp-head">${esc(m.name)}${fav}</div>${compareTable(footRows(m, f.slot, id), true)}`;
  }).join('');
}

const machineWeaponEntry = (id, price = WEAPONS[id].price) => {
  const w = WEAPONS[id];
  return { kind: 'w', id, price, label: `${WEAPON_CATS[w.cat].icon} ${esc(w.name)} ${rangeBadge(w)}`, right: `${GEAR}${fmt(price)}`, can: canBuy(price),
    detail: () => detailBox(esc(w.name), price, ownCount.w(id), weaponDesc(w), mountCompare(w)) };
};
const partEntry = (id, price = PARTS[id].price) => {
  const p = PARTS[id];
  return { kind: 'p', id, price, label: `${slotName(p.slot)}｜${esc(p.name)}`, right: `${GEAR}${fmt(price)}`, can: canBuy(price),
    detail: () => detailBox(esc(p.name), price, ownCount.p(id), partDesc(p), partShopCompare(id)) };
};
const itemEntry = (id, price = ITEMS[id].price) => {
  const it = ITEMS[id];
  return { kind: 'i', id, price, label: esc(it.name), right: `${GEAR}${fmt(price)}`, can: canBuy(price),
    detail: () => detailBox(esc(it.name), price, ownCount.i(id), esc(it.desc)) };
};
const footEntry = (id, price = FOOT_GEAR[id].price) => {
  const f = FOOT_GEAR[id];
  return { kind: 'f', id, price, group: FOOT_SLOTS[f.slot].name, label: `${FOOT_SLOTS[f.slot].icon} ${esc(f.name)}${f.slot === 'weapon' ? ` ${rangeBadge({ target: f.target || 'one' })}` : ''}${f.only ? ' <b class="excl">専用</b>' : ''}`, right: `${GEAR}${fmt(price)}`, can: canBuy(price),
    detail: () => detailBox(esc(f.name), price, ownCount.f(id), footDesc(f), footShopCompare(id)) };
};
const ADDERS = { w: (id, n) => { for (let i = 0; i < n; i++) addWeapon(id); }, p: (id, n) => addPart(id, n), i: (id, n) => addItem(id, n), f: (id, n) => addFoot(id, n) };
const NAME_OF = { w: (id) => WEAPONS[id].name, p: (id) => PARTS[id].name, i: (id) => ITEMS[id].name, f: (id) => FOOT_GEAR[id].name };
const AFTER = { w: '（ガレージで装備できます）', p: '（ガレージで付け替えできます）', i: '', f: '（メニューの「そうび」で装備）' };

// 「買う」を押した後：個数を選ぶ → もう一度確認 → 確定
async function buyFlow(it) {
  const name = NAME_OF[it.kind](it.id);
  const max = it.price > 0 ? Math.min(99, Math.floor(G.gear / it.price)) : 99;
  const n = await ui.qty({ title: `${esc(name)}をいくつ買う？`, unit: it.price, max, note: `所持 ${GEAR}${fmt(G.gear)}` });
  if (!n) return;
  if (!(await ui.confirm(`${esc(name)}を ${n}個、${fmt(it.price * n)} ギアで買いますか？`, '買う', 'やめる'))) return;
  addGear(-it.price * n); ADDERS[it.kind](it.id, n); audio.sfx('buy');
  ui.toast(`${esc(name)}を${n}個買った${AFTER[it.kind]}`);
}
async function shopScreen(title, entries) {
  await ui.shop({ title, header: () => `所持 ${GEAR}${fmt(G.gear)} ギア`, items: entries, act: buyFlow });
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
    const items = [];
    if (s.machine?.length) items.push({ label: 'マシン用の武器', value: 'm' });
    if (s.foot?.length) items.push({ label: '生身の装備（武器・防具・アクセサリー）', value: 'f' });
    items.push({ label: '売る', value: 'sell' }, { label: '出る', value: null });
    const v = await ui.menu({ title: shopTitle('武器屋'), header: `${esc(s.keeper)}「${esc(s.greet)}」`, items });
    if (!v) return;
    if (v === 'm') await shopScreen('マシン用の武器', () => s.machine.map((id) => machineWeaponEntry(id)));
    if (v === 'f') await shopScreen('生身の装備', () => footList(s.foot).map((id) => footEntry(id)));
    if (v === 'sell') await sellMenu();
  }
}
// 生身の装備を部位の順に並べる
const footList = (ids) => [...ids].sort((a, b) => Object.keys(FOOT_SLOTS).indexOf(FOOT_GEAR[a].slot) - Object.keys(FOOT_SLOTS).indexOf(FOOT_GEAR[b].slot));

async function partsShop() {
  const s = shopFor('parts');
  for (;;) {
    const v = await ui.menu({ title: shopTitle('パーツ屋'), header: `${esc(s.keeper)}「${esc(s.greet)}」`, items: [{ label: '買う', value: 'buy' }, { label: '売る', value: 'sell' }, { label: '出る', value: null }] });
    if (!v) return;
    if (v === 'sell') { await sellMenu(); continue; }
    await shopScreen('パーツ', () => s.parts.map((id) => partEntry(id)));
  }
}

async function itemShop() {
  const s = shopFor('item');
  for (;;) {
    const v = await ui.menu({ title: shopTitle('道具屋'), header: `${esc(s.keeper)}「${esc(s.greet)}」`, items: [{ label: '買う', value: 'buy' }, { label: '売る', value: 'sell' }, { label: '出る', value: null }] });
    if (!v) return;
    if (v === 'sell') { await sellMenu(); continue; }
    await shopScreen('道具', () => [...s.items.map((id) => itemEntry(id)), ...footList(s.foot || []).map((id) => footEntry(id))]);
  }
}

// 売る：選ぶと詳細 →「売る」→ 個数 → 確認
async function sellMenu() {
  const entries = () => {
    const out = [];
    const ws = {};
    for (const w of ownedWeapons()) {
      if (weaponEquippedOn(w.uid) || WEAPONS[w.id].unique) continue;
      (ws[`${w.id}+${w.plus || 0}+${w.test ? 1 : 0}`] ||= []).push(w);
    }
    for (const list of Object.values(ws)) {
      const w = list[0], def = WEAPONS[w.id], price = w.test ? 0 : sellPrice(def);
      out.push({ kind: 'w', group: 'マシンの武器', list, price, label: `${WEAPON_CATS[def.cat].icon} ${esc(weaponLabel(w))} ×${list.length}${testTag(w)}`, right: `${GEAR}${fmt(price)}`, can: () => true,
        detail: () => detailBox(esc(weaponLabel(w)), null, list.length, `${weaponDesc(def, w)}<br>売値 ${GEAR}${fmt(price)}（1つ）`) });
    }
    const pg = {};
    for (const p of G.inv.parts) (pg[`${p.id}|${p.test ? 1 : 0}`] ||= []).push(p);
    for (const list of Object.values(pg)) { const id = list[0].id, n = list.length, test = !!list[0].test; const price = test ? 0 : sellPrice(PARTS[id]); out.push({ kind: 'p', group: 'パーツ', id, n, test, price, label: `${esc(PARTS[id].name)} ×${n}${testTag(list[0])}`, right: `${GEAR}${fmt(price)}`, can: () => true, detail: () => detailBox(esc(PARTS[id].name), null, n, `${partDesc(PARTS[id])}<br>売値 ${GEAR}${fmt(price)}（1つ）`) }); }
    for (const [id, n] of Object.entries(G.inv.items)) if (n > 0) { const price = sellPrice(ITEMS[id]); out.push({ kind: 'i', group: '道具', id, n, price, label: `${esc(ITEMS[id].name)} ×${n}`, right: `${GEAR}${fmt(price)}`, can: () => true, detail: () => detailBox(esc(ITEMS[id].name), null, n, `${esc(ITEMS[id].desc)}<br>売値 ${GEAR}${fmt(price)}（1つ）`) }); }
    for (const [id, n] of Object.entries(G.inv.foot)) if (n > 0) { const f = FOOT_GEAR[id], price = sellPrice(f); out.push({ kind: 'f', group: '生身の装備', id, n, price, label: `${esc(f.name)} ×${n}`, right: price ? `${GEAR}${fmt(price)}` : '<small>売れない</small>', can: () => (price > 0 ? true : '売れない品'), detail: () => detailBox(esc(f.name), null, n, `${footDesc(f)}<br>${price ? `売値 ${GEAR}${fmt(price)}（1つ）` : '大切な装備なので売れない'}`) }); }
    return out;
  };
  await ui.shop({
    title: '売る（買った値段の半分で買い取り）', header: () => `所持 ${GEAR}${fmt(G.gear)} ギア`, verb: '売る', items: entries,
    act: async (it) => {
      const max = it.kind === 'w' ? it.list.length : it.n;
      const name = it.kind === 'w' ? weaponLabel(it.list[0]) : NAME_OF[it.kind](it.id);
      const n = max > 1 ? await ui.qty({ title: `${esc(name)}をいくつ売る？`, unit: it.price, max, verb: '売る' }) : 1;
      if (!n) return;
      if (!(await ui.confirm(`${esc(name)}を ${n}個、${fmt(it.price * n)} ギアで売りますか？`, '売る', 'やめる'))) return;
      if (it.kind === 'w') { const gone = new Set(it.list.slice(0, n).map((w) => w.uid)); G.inv.weapons = G.inv.weapons.filter((w) => !gone.has(w.uid)); }
      if (it.kind === 'p') removePart(it.id, n, it.test);
      if (it.kind === 'i') addItem(it.id, -n);
      if (it.kind === 'f') addFoot(it.id, -n);
      addGear(it.price * n); audio.sfx('buy');
      ui.toast(`${esc(name)}を${n}個売った（+${fmt(it.price * n)} ギア）`);
    },
  });
}

// 武器がその場所に合うか（any は通常の6か所どこでも、core は胸のコアだけ）
export const fitsSlot = (info, def) => (info.core ? def.mount === 'core' : def.mount === 'any' || def.mount === info.mount);
// その機体で使う武器スロットの一覧（胸のコアはアルファだけ）
export const slotsOf = (mc) => SLOT_INFO.map((info, i) => ({ info, i })).filter(({ info }) => !info.core || hasCoreSlot(mc));

// ---------------- 専用武器の進化（第1段階 → 最終段階） ----------------
// 第4章あたりで第1段階が手に入り、第5章までに素材を集め、第6章あたりでメカニックのレンが進化させる
const ownedStage1 = () => Object.keys(EVOLVE).filter((id) => ownCount.f(id) > 0);
async function evolveMenu() {
  for (;;) {
    const list = ownedStage1();
    if (!list.length) return;
    const id = await ui.menu({
      title: '専用装備の進化', wide: true, desc: true, header: 'メカニックのレンが、集めた素材で専用の武器・防具を次の段階へ進化させる',
      items: list.map((wid) => {
        const ev = EVOLVE[wid], to = FOOT_GEAR[ev.to];
        const need = Object.entries(ev.mats).map(([k, n]) => `${esc(MATERIALS[k].name)} ${G.inv.mats[k] || 0}/${n}`).join('　');
        const ok = Object.entries(ev.mats).every(([k, n]) => (G.inv.mats[k] || 0) >= n) && G.gear >= ev.gear;
        return { label: `${FOOT_SLOTS[FOOT_GEAR[wid].slot].icon} ${esc(FOOT_GEAR[wid].name)} → ${esc(to.name)}`, value: wid, disabled: !ok, right: ok ? '<b class="ok">進化できる</b>' : '<small>素材が足りない</small>',
          desc: `${need}　${GEAR}${fmt(G.gear)}/${fmt(ev.gear)}<br>${footDesc(to)}` };
      }),
    });
    if (!id) return;
    const ev = EVOLVE[id], slot = FOOT_GEAR[id].slot;
    // 進化前と進化後を3Dで並べて比べる（装備している人、いなければ持ち主のキャラで）
    const wearer = Object.values(G.members).find((m) => m.equip[slot] === id);
    const who = wearer || G.members[FOOT_GEAR[id].only] || G.members.ren;
    const before = { ...who, equip: { ...who.equip, [slot]: id } }, after = { ...who, equip: { ...who.equip, [slot]: ev.to } };
    const ok = await compareView({ title: `${esc(FOOT_GEAR[id].name)} → ${esc(FOOT_GEAR[ev.to].name)}`, before: () => buildCharModel(before), after: () => buildCharModel(after), stats: compareTable(footRows(before, slot, ev.to)) + `<div class="note">素材と ${fmt(ev.gear)} ギアを使います</div>`, okLabel: '進化させる' });
    if (!ok) continue;
    for (const [k, n] of Object.entries(ev.mats)) addMat(k, -n);
    addGear(-ev.gear);
    // 装備中ならそのまま次の段階を装備、持ち物ならすり替え
    if (wearer) wearer.equip[slot] = ev.to; else { addFoot(id, -1); addFoot(ev.to, 1); }
    audio.sfx('levelup');
    ui.banner(`${esc(FOOT_GEAR[ev.to].name)}`, '専用装備が進化した！');
    autosave();
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
      title: 'ガレージ', header: `${esc(shop.keeper)}「何をする？」　預かり中：${here.map((m) => esc(machineName(m)) + testTag(m)).join('・') || 'なし'}`,
      items: [
        { label: '乗り込んで出発', value: 'depart' },
        { label: '格納庫の一覧（マシン・パーツ）', value: 'hangar' },
        { label: '修理', value: 'repair' },
        { label: '武器の付け替え', value: 'weapons' },
        { label: 'パーツ交換', value: 'parts' },
        { label: '武器強化', value: 'upgrade' },
        { label: '改造（フレーム・エンジン）', value: 'mod' },
        ...(ownedStage1().length ? [{ label: '専用装備の進化（武器・防具）', value: 'evolve' }] : []),
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
    if (v === 'evolve') await evolveMenu();
    if (v === 'hangar') await hangarList(world);
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

// 開発者の部屋のお店（開発者に話しかける）＝入手端末と同じ（js/scenes/devroom.js）
async function devShop(world) { await devStore(world); }

// バランス調整：値段・攻撃力などの数値と、敵の強さを数字で変える（ブラウザに保存してゲーム全体に反映）
export async function tuningMenu() {
  for (;;) {
    const v = await ui.menu({
      title: 'バランス調整', wide: true,
      header: '変えた数値はお店と戦闘にすぐ反映され、このブラウザに保存されます。GitHub には書き込みません',
      items: [
        ...Object.entries(TUNE_TABLES).map(([tk, t]) => ({ label: esc(t.name), right: changedCount(tk) ? `<b class="ok">${changedCount(tk)}か所変更</b>` : '', value: tk })),
        { separator: true, label: '' },
        { label: '数値を書き出す（クリップボードにコピー）', value: 'export' },
        { label: '全部を初期値に戻す', value: 'reset' },
        { label: 'やめる', value: null },
      ],
    });
    if (!v) return;
    if (v === 'export') { await exportTuningUI(); continue; }
    if (v === 'reset') {
      if (await ui.confirm('調整した数値を全部、初期値に戻しますか？', '戻す', 'やめる')) { resetTuning(); audio.sfx('ok'); ui.toast('全部を初期値に戻した'); }
      continue;
    }
    await tuningTable(v);
  }
}
async function tuningTable(tk) {
  const t = TUNE_TABLES[tk];
  for (;;) {
    const id = await ui.menu({
      title: esc(t.name), wide: true,
      items: Object.entries(t.table).filter(([rid]) => fieldsOf(tk, rid).length).map(([rid, row]) => ({
        label: `${changedCount(tk, rid) ? '<b class="ok">●</b> ' : ''}${esc(row.name)}`,
        right: `<small>${fieldsOf(tk, rid).slice(0, 4).map((f) => `${FIELD_NAMES[f]}${showValue(f, valueOf(tk, rid, f))}`).join(' ')}</small>`, value: rid,
      })),
    });
    if (!id) return;
    await editTuningRow(tk, id);
  }
}
// 1つの物（武器・パーツ・装備・敵・マシンの色など）の数値を変える。展示台（devroom.js）からも使う
export async function editTuningRow(tk, id, onChange) {
  const t = TUNE_TABLES[tk];
  for (;;) {
    const row = t.table[id];
    const f = await ui.menu({
      title: `${esc(row.name)}の数値`, wide: true, header: '●＝変更した数値（かっこの中は初期値）。変えた値は「数値を書き出す」でまとめてコピーできます',
      items: fieldsOf(tk, id).map((k) => {
        const v = valueOf(tk, id, k);
        const sw = isColor(k) ? `<i class="swatch" style="background:#${Number(v).toString(16).padStart(6, '0')}"></i>` : '';
        return { label: `${isChanged(tk, id, k) ? '<b class="ok">●</b> ' : ''}${FIELD_NAMES[k] || k}`, right: `${sw}${showValue(k, v)}${isChanged(tk, id, k) ? `　<small>（${showValue(k, defaultOf(tk, id, k))}）</small>` : ''}`, value: k };
      }),
    });
    if (!f) return;
    let nv;
    if (CHOICES[f]) {
      nv = await ui.menu({ title: `${esc(row.name)}：${FIELD_NAMES[f]}`, items: Object.entries(CHOICES[f]).map(([k, n]) => ({ label: n, value: k, right: k === valueOf(tk, id, f) ? '今' : '' })) });
    } else if (isColor(f)) {
      nv = await ui.colorEntry({ title: `${esc(row.name)}：${FIELD_NAMES[f]}`, value: valueOf(tk, id, f), def: defaultOf(tk, id, f) });
    } else {
      const step = stepOf(f);
      nv = await ui.numberEntry({ title: `${esc(row.name)}：${FIELD_NAMES[f] || f}`, value: valueOf(tk, id, f), def: defaultOf(tk, id, f) ?? 0, step, note: `${esc(t.file)} の ${id}.${f}` });
      if (nv != null) nv = step < 1 ? Math.round(nv * 100) / 100 : Math.round(nv);
    }
    if (nv == null) continue;
    setTuning(tk, id, f, nv);
    audio.sfx('ok');
    onChange?.();
  }
}
export { exportTuningUI };

// 変更した数値を一覧のテキストにしてクリップボードへ（Claude Code に貼って設定ファイルに反映してもらう）
async function exportTuningUI() {
  const text = exportTuning();
  let copied = false;
  try { await navigator.clipboard.writeText(text); copied = true; } catch {
    try {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      copied = document.execCommand('copy'); ta.remove();
    } catch { copied = false; }
  }
  audio.sfx(copied ? 'buy' : 'error');
  await ui.panel(`<p>${copied ? 'クリップボードにコピーしました。Claude Code に貼り付けて「設定ファイルに反映して」と頼んでください。' : 'コピーできなかったので、下の文字を長押しして選んでコピーしてください。'}</p>
    <textarea class="tune-export" readonly>${esc(text)}</textarea>`, { title: '数値を書き出す', className: 'tune-panel' });
}

// ギアを増やす機械
export async function gearMachine() {
  for (;;) {
    const v = await ui.menu({
      title: 'ギア生成マシン', header: `ガチャン、ガチャン……歯車が回っている。　所持：${GEAR}${fmt(G.gear)}`,
      items: [...DEV_ROOM.gearButtons.map((g) => ({ label: `${GEAR}${fmt(g)} 増やす`, value: g })), { label: '最大（999,999）にする', value: 'max' }, { label: 'やめる', value: null }],
    });
    if (!v) return;
    addTest('gear', v === 'max' ? 999999 : v);
    audio.sfx('levelup');
    ui.toast(`チャリーン！ 所持ギア ${fmt(G.gear)}`);
  }
}

export const devDoorOpen = () => devSession.open;
export function openDevDoor() { devSession.open = true; }

// ---------------- 装備の比較（今の値 → 変更後の値（差）） ----------------
export const rangeBadge = (def) => `<b class="rg rg-${def.target}">${RANGES[def.target].name}</b>`;
export function compareTable(rows, onlyChanged = false) {
  if (onlyChanged) { rows = rows.filter((r) => r[1] !== r[2]); if (!rows.length) return '<div class="cmp-none">ステータスは変わらない</div>'; }
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
  return Math.round(weaponAtk(w, mc) * arm * st.mul * typeBoost(mc, def));
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
export function partRows(mc, slotKey, partId) {
  const clone = { ...mc, parts: { ...mc.parts, [slotKey]: partId }, slots: [...mc.slots] };
  const a = machineStats(mc), b = machineStats(clone);
  const rows = [
    ['装甲', a.maxArmor, b.maxArmor], ['防御', a.def, b.def], ['命中', a.hit, b.hit], ['回避', a.eva, b.eva], ['速さ', a.spd, b.spd],
    ['重さ合計', a.weight, b.weight, { better: 'low' }], ['積める重さ', a.cap, b.cap], ['EN', a.maxEn, b.maxEn], ['スロット', a.slots, b.slots],
  ];
  if (slotKey === 'armR' || slotKey === 'armL') rows.splice(1, 0, [`${slotKey === 'armR' ? '右' : '左'}腕の攻撃倍率`, a.armMul[slotKey === 'armR' ? 'R' : 'L'], b.armMul[slotKey === 'armR' ? 'R' : 'L']]);
  if (slotKey === 'body') rows.unshift(['タイプ', a.typeName, b.typeName, { better: null }]);
  return rows;
}
function partCompare(mc, slotKey, partId) {
  const clone = { ...mc, parts: { ...mc.parts, [slotKey]: partId }, slots: [...mc.slots] };
  const b = machineStats(clone);
  return `<div class="cmp-head">${esc(PARTS[partId].name)}</div>` + compareTable(partRows(mc, slotKey, partId)) + (b.weight > b.cap ? '<b class="warn">重量オーバー</b>' : '');
}
export function footRows(m, kind, id) {
  const clone = { ...m, equip: { ...m.equip, [kind]: id } };
  const a = memberStats(m), b = memberStats(clone);
  const rng = (st) => (st.weapon.atk ? RANGES[st.weapon.target || 'one'].name : '―');
  return [
    ['攻撃', a.atk + a.weaponAtk, b.atk + b.weaponAtk], ['範囲', rng(a), rng(b), { better: null }], ['最大体力', a.maxHp, b.maxHp], ['防御', a.def, b.def],
    ['命中', a.hit, b.hit], ['回避', a.eva, b.eva], ['素早さ', a.spd, b.spd], ['会心率', a.crit, b.crit, { fmt: (v) => `${v}%` }],
    ['セット効果', a.set?.name || 'なし', b.set?.name || 'なし', { better: null }],
  ];
}
function footCompare(m, kind, id) {
  const f = FOOT_GEAR[id];
  const fav = f && f.slot === 'weapon' && (f.target || 'one') === FAVORITE_RANGE[m.id] ? ` <b class="ok">得意な範囲（威力×${FAVORITE_BONUS}）</b>` : '';
  return `<div class="cmp-head">${f ? esc(f.name) : '外す'}${fav}</div>` + compareTable(footRows(m, kind, id)) + (f ? `<div class="sd-desc">${footDesc(f)}</div>` : '');
}

async function pickMachine(list) {
  if (!list.length) { await ui.say('ガレージに預けているマシンがない。'); return null; }
  if (list.length === 1) return list[0];
  list = sortPilotedFirst(list);
  return ui.menu({ title: 'どのマシン？', items: list.map((mc) => ({ label: esc(machineName(mc)) + testTag(mc), right: pilotName(mc), value: mc })) });
}
const pilotName = (mc) => { const p = partyMembers().find((m) => m.machine === mc.id); return p ? esc(p.name) : '<small>乗り手なし</small>'; };

async function garageRepair(here, shop) {
  if (!here.length) { await ui.say('ガレージに預けているマシンがない。'); return; }
  const items = here.map((mc) => {
    const st = machineStats(mc);
    const cost = Math.ceil(((st.maxArmor - mc.armor) * shop.repairPerArmor + (st.maxEn - mc.en) * shop.repairPerEn + (mc.broken ? 300 : 0)) * (1 - MODS.mechanicDiscount));
    return { label: `${esc(machineName(mc))}${mc.broken ? ' <b class="warn">大破</b>' : ''}`, right: `装甲${mc.armor}/${st.maxArmor}　${GEAR}${cost}`, value: { mc, cost }, disabled: cost <= 0 };
  });
  const need = items.filter((it) => !it.disabled).map((it) => it.value);
  const total = need.reduce((a, b) => a + b.cost, 0);
  if (need.length > 1) items.unshift({ label: '🔧 まとめて修理（全部）', right: `${need.length}台　${GEAR}${total}`, value: { all: true, cost: total } });
  const v = await ui.menu({ title: '修理（メカニック割引）', wide: true, items });
  if (!v) return;
  if (v.all) {
    if (G.gear < total) { audio.sfx('error'); await ui.say('ギアが足りない。'); return; }
    addGear(-total); for (const x of need) repairMachine(x.mc); audio.sfx('repair');
    await ui.say(`${need.length}台の装甲とエネルギーがまとめて全回復した！`);
    return;
  }
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

export async function weaponSlots(mc) {
  for (;;) {
    const st = machineStats(mc);
    const items = slotsOf(mc).map(({ info, i }) => {
      const w = mc.slots[i] ? weaponByUid(mc.slots[i]) : null;
      const locked = !info.core && i >= st.slots;
      const hint = info.core ? '胸のコア（第7の専用スロット）：ステラ・ブレイカーだけを付けられる。ほかの6か所の数は減らない' : info.mount === 'arm' ? '腕には機銃・近接・特殊兵器（腕用）を付けられる' : info.place === 'shoulder' ? '肩の上：主砲やミサイルなど見せ場の武器に向く（頭の横を通るので顔に重ならない）' : '背中：主砲・ミサイル・特殊兵器（背中用）を付けられる';
      return { label: `<b class="slot-ico${info.core ? ' core' : ''}">${info.icon}</b> ${info.name}：${locked ? '<small>（フレーム強化で解放）</small>' : w ? `${esc(weaponLabel(w))} ${WEAPONS[w.id].modes ? '<b class="rg rg-all">範囲切替</b>' : rangeBadge(WEAPONS[w.id])}${weaponLocked(w, mc) ? ' <small>（第3章から使える）</small>' : ''}` : '<small>なし</small>'}`, value: i, disabled: locked, desc: (w ? weaponDesc(WEAPONS[w.id], w, mc) + '<br>' : '') + `<small>${hint}</small>` };
    });
    const slot = await ui.menu({ title: `${esc(machineName(mc))}の武器`, header: `${esc(st.typeName)}タイプ　重さ ${st.weight}/${st.cap}　スロット ${st.slots}/6${st.core ? '＋胸のコア' : ''}`, wide: true, desc: true, items: [{ label: '⚡ 最強', value: '__best', desc: 'パーツと武器を、いま持っている中でいちばん強いものに付け替える（ほかのマシンに付いている物は取らない）' }, ...items] });
    if (slot == null) return;
    if (slot === '__best') { bestDone(bestMachine(mc)); continue; }
    const info = SLOT_INFO[slot];
    const cands = ownedWeapons().filter((w) => fitsSlot(info, WEAPONS[w.id]) && mc.slots[slot] !== w.uid);
    const list = cands.map((w) => {
      const on = weaponEquippedOn(w.uid);
      const err = checkMount(mc, slot, w);
      return { label: `${WEAPON_CATS[WEAPONS[w.id].cat].icon} ${esc(weaponLabel(w))} ${rangeBadge(WEAPONS[w.id])}${testTag(w)}`, right: on ? `<small>${esc(machineName(on.mc))}に装備中</small>` : '', value: w.uid, disabled: !!err, desc: (err ? `<b class="warn">${esc(err)}</b><br>` : '') + weaponCompare(mc, slot, w.uid) };
    });
    if (mc.slots[slot]) list.unshift({ label: '外す', value: '__none', desc: weaponCompare(mc, slot, null) });
    if (!list.length) { await ui.say('付けられる武器を持っていない。武器屋で買おう。'); continue; }
    const uid = await ui.menu({ title: `${info.name}に付ける武器`, header: '選んでいる武器に替えたときの「今 → 変更後（差）」', wide: true, desc: true, className: 'cmp-menu', items: list });
    if (!uid) continue;
    const clone = { ...mc, parts: { ...mc.parts }, slots: mc.slots.map((u) => (u === uid ? null : u)) };
    clone.slots[slot] = uid === '__none' ? null : uid;
    const wname = uid === '__none' ? '外す' : esc(weaponLabel(weaponByUid(uid)));
    const ok = await compareView({ title: `${esc(machineName(mc))}：${info.name}に ${wname}`, before: () => buildMachineModel(machineSpec(mc)), after: () => buildMachineModel(machineSpec(clone)), stats: weaponCompare(mc, slot, uid === '__none' ? null : uid) });
    if (!ok) continue;
    const err = equipWeapon(mc, slot, uid === '__none' ? null : uid);
    if (err) { audio.sfx('error'); await ui.say(err); }
  }
}

const PART_SLOTS = [['head', '頭'], ['body', 'ボディ'], ['armR', '右腕'], ['armL', '左腕'], ['legs', '脚'], ['engine', 'エンジン']];
const slotName = (s) => ({ head: '頭', body: 'ボディ', arm: '腕', legs: '脚', engine: 'エンジン' }[s]);

export async function partSlots(mc) {
  for (;;) {
    const st = machineStats(mc);
    const slotKey = await ui.menu({
      title: `${esc(machineName(mc))}のパーツ`, header: `${esc(st.typeName)}タイプ　装甲 ${st.maxArmor}　防御 ${st.def}　重さ ${st.weight}/${st.cap}`, wide: true, desc: true,
      items: [{ label: '⚡ 最強', value: '__best', desc: 'パーツと武器を、いま持っている中でいちばん強いものに付け替える（ほかのマシンに付いている物は取らない）' }, ...PART_SLOTS.map(([k, n]) => ({ label: `${n}：${esc(PARTS[mc.parts[k]].name)}`, value: k, desc: partDesc(PARTS[mc.parts[k]]) }))],
    });
    if (!slotKey) return;
    if (slotKey === '__best') { bestDone(bestMachine(mc)); continue; }
    const want = slotKey.startsWith('arm') ? 'arm' : slotKey;
    // 同じ種類・同じ印（テスト入手かどうか）のパーツはまとめて「×個数」で表示する
    const groups = {};
    for (const p of G.inv.parts) if (PARTS[p.id]?.slot === want) (groups[`${p.id}|${p.test ? 1 : 0}`] ||= []).push(p);
    const cands = Object.values(groups);
    if (!cands.length) { await ui.say('付け替えられるパーツを持っていない。パーツ屋で買おう。'); continue; }
    const uid = await ui.menu({
      title: '付け替えるパーツ', wide: true, desc: true,
      header: '選んでいるパーツに替えたときの「今 → 変更後（差）」', className: 'cmp-menu',
      items: cands.map((list) => { const id = list[0].id; const err = checkPart(mc, slotKey, id); return { label: `${esc(PARTS[id].name)} ×${list.length}${testTag(list[0])}`, value: list[0].uid, disabled: !!err, desc: (err ? `<b class="warn">${esc(err)}</b><br>` : '') + partCompare(mc, slotKey, id) }; }),
    });
    if (!uid) continue;
    const pid = G.inv.parts.find((p) => p.uid === uid).id;
    const clone = { ...mc, parts: { ...mc.parts, [slotKey]: pid }, slots: [...mc.slots] };
    const ok = await compareView({ title: `${esc(machineName(mc))}：${PART_SLOTS.find(([k]) => k === slotKey)[1]}を ${esc(PARTS[pid].name)} に`, before: () => buildMachineModel(machineSpec(mc)), after: () => buildMachineModel(machineSpec(clone)), stats: compareTable(partRows(mc, slotKey, pid)) });
    if (!ok) continue;
    const err = equipPart(mc, slotKey, uid);
    if (err) { audio.sfx('error'); await ui.say(err); } else { ui.toast('パーツを付け替えた。見た目も変わったぞ'); }
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
  const items = owned.map((mc) => ({ label: esc(machineName(mc)) + testTag(mc), right: pilotName(mc), value: mc.id, disabled: !canPilot(m, mc), desc: pilotError(m, mc) ? `<b class="warn">${esc(pilotError(m, mc))}</b>` : '' }));
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
export function weaponDesc(w, inst, mc) {
  if (w.sealAtk) return `胸のコア専用・アルファ専用　範囲を切り替え（単体${Math.round(w.modes.one * 100)}%・グループ${Math.round(w.modes.group * 100)}%・全体${Math.round(w.modes.all * 100)}%）<br>章ごとに5段階で進化（第3章から使える）：${w.sealAtk.map((a, i) => `${esc(w.stageNames[i])} ${a || '―'}`).join(' → ')}${mc ? `<br>いまの威力（単体）：<b>${weaponAtk(inst || { id: 'stella' }, mc)}</b>` : ''}`;
  const tgt = { one: '単体', group: 'グループ', all: '全体' }[w.target];
  const el = w.elem ? `　属性:${w.elem === 'elec' ? '<b class="elec">電気</b>' : '<b class="fire">火</b>'}` : '';
  const atk = inst ? weaponAtk(inst, mc) : w.atk;
  const where = { arm: '腕', back: '肩・背中', any: 'どこでも' }[w.mount] || '';
  return `${WEAPON_CATS[w.cat].name}（${where}）　攻撃${atk}　命中${w.hit >= 0 ? '+' : ''}${w.hit}　重さ${w.wt}　${tgt}${el}${w.en ? `　EN${w.en}` : ''}${w.only ? `<br><b class="excl">${esc(MACHINES[w.only].name)}専用</b>${w.rank ? `　専用武器の強さ ${w.rank}位` : ''}` : ''}`;
}
export function footDesc(f) {
  const n = (k, label, unit = '') => (f[k] ? `　${label}${f[k] > 0 ? '+' : ''}${f[k]}${unit}` : '');
  const head = f.slot === 'weapon' ? `${FOOT_CATS[f.cat]?.name || '武器'}　攻撃${f.atk}${n('hit', '命中')}　${RANGES[f.target || 'one'].name}${f.elem ? `　属性:${f.elem === 'elec' ? '<b class="elec">電気</b>' : '<b class="fire">火</b>'}` : ''}` : `${FOOT_SLOTS[f.slot].name}の防具${n('def', '防御')}`;
  let s = head + (f.slot !== 'weapon' ? n('atk', '攻撃') + n('hit', '命中') : '') + n('eva', '回避') + n('spd', '素早さ') + n('hp', '最大体力') + n('crit', '会心率', '%');
  if (f.only) s += `<br><b class="excl">${esc(CHARACTERS[f.only].defaultName)}専用</b>`;
  if (f.set) s += `　<b class="ok">4つそろえると「${esc(SETS[f.set].name)}」：${esc(SETS[f.set].desc)}</b>`;
  if (f.link) s += '<br>オメガが仲間にいると威力+30%';
  if (f.stage === 1) s += '<br>素材を集めると最終段階に進化する';
  if (f.limited || f.from) s += `<br><small>入手：${esc(f.from || '限定品')}</small>`;
  if (f.desc) s += `<br><small>${esc(f.desc)}</small>`;
  return s;
}
export function partDesc(p, cur) {
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
        { label: '📍 つぎの目的', value: 'goal' },
        { label: 'つよさ', value: 'status' },
        { label: 'どうぐ', value: 'items' },
        { label: 'そうび（生身）', value: 'equip' },
        // メカニック（レン）が気絶していなければ、町の外でもマシンの武器・パーツを付け替えられる（v1.7〜）
        ...(ren().ko ? [] : [{ label: 'そうび（マシン）', value: 'mequip' }]),
        { label: 'マシン', value: 'machines' },
        { label: '手配書', value: 'bounty' },
        { label: '素材', value: 'mats' },
        { label: 'せってい', value: 'settings' },
        { label: 'タイトルへ', value: 'title' },
      ],
    });
    if (!v) return;
    if (v === 'goal') {
      const o = nextObjective(G), c = CHAPTERS[o.chapter];
      await ui.say([{ name: `第${o.chapter}章「${c.planet}」`, text: `つぎの目的：${o.text}` }, ...(o.hint ? [{ name: 'ヒント', text: o.hint }] : [])]);
    }
    if (v === 'status') await statusMenu();
    if (v === 'items') { const before = G.pos.map; await itemMenu(false, world); if (G.pos.map !== before || !world.active) return; }
    if (v === 'equip') { await equipMenu(); world.buildParty(); }
    if (v === 'mequip') { await machineEquipMenu(); world.buildParty(); }
    if (v === 'machines') await machineList();
    if (v === 'bounty') await bountyList();
    if (v === 'mats') await ui.panel(`<table class="kv">${Object.entries(MATERIALS).map(([k, m]) => `<tr><th>${esc(m.name)}</th><td>${G.inv.mats[k] || 0}</td><td><small>${esc(m.desc)}</small></td></tr>`).join('')}</table>`, { title: '素材（武器強化・改造に使う）' });
    if (v === 'settings') await settingsMenu(world);
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
  const k = Math.max(4, Math.min(10, Math.floor(Math.min(1400 / W, 900 / H)))); // 拡大しても見やすいように大きめに描く（v2.2）
  const cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
  const g = cv.getContext('2d');
  g.fillStyle = '#05060a'; g.fillRect(0, 0, cv.width, cv.height);
  const revealed = mapRevealed(G, map); // クリアした章の地図は全部見える（v1.9）
  const ex = revealed ? '1'.repeat(map.width * map.height) : (G.explored?.[map.id] || '');
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
  dot(G.pos.x - 0.5, G.pos.y - 0.5, '#5ff2ff', k * 1.3);
  const known = ex.split('').filter((c) => c === '1').length;
  // 宝箱と賞金首の印は、上に重ねたキャンバスに描いて点滅させる（むずかしさで変わる。map-marks.js）
  const mk = mapMarks(map, G, settings, { seen: (x, y) => ex[y * W + x] === '1', revealed });
  const dm = difficultyOf(settings);
  const legend = dm.map.chests === 'all' ? '● 赤＝レアな宝箱　● 青＝宝箱　（開けた宝箱は点滅しない）　● 紫の点滅＝手配書の賞金首'
    : dm.map.chests === 'found' ? '● 青＝見つけた宝箱（開けた宝箱は点滅しない）　● 紫の点滅＝手配書の賞金首　● 赤＝ボス'
      : revealed ? '■ 金＝まだ開けていない宝箱　● 紫の点滅＝手配書の賞金首　● 赤＝ボス' : '（ハード：宝箱とボスの印は出ません）';
  const p = ui.panel(`<div class="mapview-zoom"><button class="mz-btn" data-z="in">＋</button><button class="mz-btn" data-z="out">－</button><button class="mz-btn" data-z="fit">全体</button><button class="mz-btn" data-z="me">自分</button></div><div class="mapview"><div class="mapview-wrap"><img src="${cv.toDataURL()}" alt="地図"><canvas class="mapmarks" width="${cv.width}" height="${cv.height}"></canvas></div></div>
    <div class="note">● 水色＝いまいる場所　● 黄＝出入口　${legend}　［${dm.name}］${revealed ? '（クリアした章なので地図は全部見えます）' : `（歩いた場所が地図に残ります：${Math.round(100 * known / (W * H))}%）`}</div>`, { title: `ちず：${esc(map.name)}`, className: 'map-panel' });
  setupMapZoom(document.querySelector('.map-panel'), cv.width, cv.height, (G.pos.x) / W, (G.pos.y) / H);
  const ov = document.querySelector('.map-panel canvas.mapmarks');
  if (ov) {
    const og = ov.getContext('2d');
    const draw = () => {
      if (!ov.isConnected) return;
      og.clearRect(0, 0, ov.width, ov.height);
      const a = blinkAlpha(performance.now() / 1000);
      for (const c of mk.chests) {
        og.globalAlpha = c.blink ? a : 1; og.fillStyle = c.color;
        og.beginPath(); og.arc((c.x + 0.5) * k, (c.y + 0.5) * k, Math.max(4, k * 1.3) * c.size, 0, 7); og.fill();
        if (c.size > 1) { og.strokeStyle = '#fff'; og.lineWidth = 1; og.stroke(); }
      }
      for (const b of mk.bosses) { og.globalAlpha = b.blink ? a : 1; og.fillStyle = b.color; og.beginPath(); og.arc((b.x + 0.5) * k, (b.y + 0.5) * k, Math.max(6, k * 2), 0, 7); og.fill(); og.strokeStyle = '#ffe0ff'; og.lineWidth = 1.5; og.stroke(); }
      og.globalAlpha = 1;
      requestAnimationFrame(draw);
    };
    draw();
  }
  await p;
}

// 全体地図の拡大・縮小（v2.2）：＋／－ボタン・ピンチ・マウスホイール。拡大したら指でなぞって動かせる
function setupMapZoom(panel, cw, ch, px, py) {
  const view = panel?.querySelector('.mapview'), img = view?.querySelector('img');
  if (!view || !img) return;
  // 1倍＝画面に全体が入る大きさ
  const fit = () => Math.min((view.clientWidth || 600) - 4, (window.innerHeight * 0.58) / ch * cw, cw * 4);
  let base = fit(), z = 1;
  const MAX = Math.min(8, Math.max(3, (cw / base) * 4));
  const apply = (nz, fx, fy) => {
    // fx, fy：画面の中のどこを中心に拡大するか（0〜1。なければ今の真ん中）
    const cx = fx ?? (view.scrollLeft + view.clientWidth / 2) / (base * z);
    const cy = fy ?? (view.scrollTop + view.clientHeight / 2) / (base * z * ch / cw);
    z = Math.max(1, Math.min(MAX, nz));
    img.style.width = `${base * z}px`; img.style.maxWidth = 'none'; img.style.maxHeight = 'none'; img.style.height = 'auto';
    view.scrollLeft = cx * base * z - view.clientWidth / 2;
    view.scrollTop = cy * base * z * ch / cw - view.clientHeight / 2;
    panel.querySelector('[data-z="out"]').disabled = z <= 1;
    panel.querySelector('[data-z="in"]').disabled = z >= MAX;
  };
  apply(1);
  panel.querySelectorAll('.mz-btn').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation(); audio.sfx('cursor');
    const k = b.dataset.z;
    if (k === 'in') apply(z * 1.6); else if (k === 'out') apply(z / 1.6); else if (k === 'fit') apply(1, 0.5, 0.5); else apply(Math.max(z, 3), px, py);
  }));
  view.addEventListener('wheel', (e) => { e.preventDefault(); apply(z * (e.deltaY < 0 ? 1.25 : 0.8)); }, { passive: false });
  // ピンチ
  const pts = new Map();
  let pinch = null;
  view.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z }; } });
  view.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; apply(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / (pinch.d || 1)); }
  });
  const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
  view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
  // マウスでドラッグして動かす（スマホは指でなぞるとそのまま動く）
  let drag = null;
  view.addEventListener('mousedown', (e) => { drag = { x: e.clientX, y: e.clientY, l: view.scrollLeft, t: view.scrollTop }; });
  window.addEventListener('mousemove', (e) => { if (drag && view.isConnected) { view.scrollLeft = drag.l - (e.clientX - drag.x); view.scrollTop = drag.t - (e.clientY - drag.y); } });
  window.addEventListener('mouseup', () => { drag = null; });
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
    mhtml = `<h4>マシン：${esc(machineName(mc))}　<small>${esc(ms.typeName)}タイプ${mc.type === 'alpha' ? `・${esc(sealInfo().name)}` : ''}</small></h4>
      <table class="kv"><tr><th>装甲</th><td>${mc.armor}/${ms.maxArmor}</td><th>EN</th><td>${mc.en}/${ms.maxEn}</td></tr>
      <tr><th>防御</th><td>${ms.def}</td><th>命中</th><td>+${ms.hit}</td></tr><tr><th>回避</th><td>${ms.eva}</td><th>重さ</th><td>${ms.weight}/${ms.cap}</td></tr></table><ul class="wlist">${ws}</ul>`;
  }
  await ui.panel(`
    <div class="status-role">${esc(c.roleName)}　<small>${esc(c.desc)}</small></div>
    <table class="kv"><tr><th>レベル</th><td>${m.lv}</td><th>次まで</th><td>${expToNext(m)}</td></tr>
    <tr><th>体力</th><td>${m.hp}/${st.maxHp}</td><th>攻撃</th><td>${st.atk}</td></tr>
    <tr><th>防御</th><td>${st.def}</td><th>命中</th><td>${st.hit}</td></tr>
    <tr><th>回避</th><td>${st.eva}</td><th>素早さ</th><td>${st.spd}</td></tr>
    <tr><th>会心率</th><td>${st.crit}%</td><th>得意な範囲</th><td>${RANGES[FAVORITE_RANGE[m.id]].name}</td></tr>
    ${FOOT_SLOT_KEYS.map((k) => `<tr><th>${FOOT_SLOTS[k].name}</th><td colspan="3">${esc(FOOT_GEAR[m.equip[k]]?.name || 'なし')}</td></tr>`).join('')}
    ${st.set ? `<tr><th>セット効果</th><td colspan="3"><b class="ok">${esc(st.set.name)}</b>：${esc(st.set.desc)}</td></tr>` : ''}
    <tr><th>特技</th><td colspan="3">${esc(c.skill.name)}：${esc(c.skill.desc)}</td></tr></table>${mhtml}`, { title: esc(m.name) });
}

// 道具を使う（inBattle=true の時は battle.js から呼ばれる）
export async function chooseItemTarget(id, inBattle = false) {
  const it = ITEMS[id];
  if (it.use === 'warp') return inBattle ? null : { warp: true };
  if (it.use === 'repel') return inBattle ? null : { repel: true };
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
  if (it.use === 'repel') {
    G.repel = { steps: amt, rate: it.rate, name: it.name };
    return `${it.name}を使った。${amt}歩のあいだ、敵に出会いにくくなる。`;
  }
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
    if (inBattle && (ITEMS[id].use === 'warp' || ITEMS[id].use === 'repel')) { await ui.say(`戦闘中は${esc(ITEMS[id].name)}を使えない。`); continue; }
    const target = await chooseItemTarget(id, inBattle);
    if (!target) continue;
    if (inBattle) return { id, target };
    if (target.warp) {
      // ダンジョンの中なら「ダンジョンの外へ出る」も選べる（v1.8）
      const map = itemWorld?.map;
      if (map?.type === 'dungeon' && !map.noMap && map.warps?.length) {
        const how = await ui.menu({ title: 'ワープユニット：どこへ？', items: [
          { label: 'ダンジョンの外へ出る', right: `<small>${esc(MAPS[map.warps[0].to]?.name || '')}の入口</small>`, value: 'out' },
          { label: '町へワープする', value: 'town' },
          { label: 'やめる', value: null },
        ] });
        if (!how) continue;
        if (how === 'out') { addItem(id, -1); ui.closeAll(); await itemWorld.escapeDungeon(); return null; }
      }
      if (await teleportMenu(itemWorld, false)) return null;
      continue;
    }
    const msg = applyItem(id, target);
    audio.sfx(ITEMS[id].use === 'armor' || ITEMS[id].use === 'maint' ? 'repair' : ITEMS[id].use === 'repel' ? 'warp' : 'heal');
    await ui.say(msg);
  }
}

// 「最強」を押したあとの知らせ
function bestDone(n) {
  if (n) { audio.sfx('levelup'); ui.toast(`最強の装備にした！（${n}か所を付け替え）`); } else { audio.sfx('ok'); ui.toast('もう、いま持っている中で最強の装備だ'); }
}

async function equipMenu() {
  for (;;) {
    const m = await ui.menu({ title: 'そうび（生身）', wide: true, items: [{ label: '⚡ 最強（全員）', value: '__best', right: '<small>持っている中でいちばん強い装備に</small>' }, ...partyMembers().map((mm) => ({ label: esc(mm.name), right: `${esc(FOOT_GEAR[mm.equip.weapon]?.name || '素手')}${memberStats(mm).set ? ` <b class="ok">${esc(memberStats(mm).set.name)}</b>` : ''}`, value: mm }))] });
    if (!m) return;
    if (m === '__best') { bestDone(partyMembers().reduce((a, mm) => a + bestFoot(mm), 0)); continue; }
    for (;;) {
      const st = memberStats(m);
      const kind = await ui.menu({
        title: `${esc(m.name)}の装備`, wide: true, header: `攻撃${st.atk + st.weaponAtk}　防御${st.def}　命中${st.hit}　回避${st.eva}　素早さ${st.spd}　会心${st.crit}%${st.set ? `　<b class="ok">セット効果：${esc(st.set.name)}</b>` : ''}`,
        items: [{ label: '⚡ 最強', value: '__best' }, ...FOOT_SLOT_KEYS.map((k) => ({ label: `${FOOT_SLOTS[k].icon} ${FOOT_SLOTS[k].name}：${esc(FOOT_GEAR[m.equip[k]]?.name || 'なし')}`, value: k }))],
      });
      if (!kind) break;
      if (kind === '__best') { bestDone(bestFoot(m)); continue; }
      const owned = Object.entries(G.inv.foot).filter(([id, n]) => n > 0 && FOOT_GEAR[id]?.slot === kind);
      const items = owned.map(([id, n]) => {
        const ok = canWearFoot(m, id);
        return { label: `${esc(FOOT_GEAR[id].name)} ×${n}${FOOT_GEAR[id].only ? ' <b class="excl">専用</b>' : ''}${testFootCount(id) ? ` ${TEST_MARK}<small>×${Math.min(n, testFootCount(id))}</small>` : ''}`, value: id, disabled: !ok, desc: ok ? footCompare(m, kind, id) : `<b class="warn">${esc(CHARACTERS[FOOT_GEAR[id].only].defaultName)}専用の装備だ</b>` };
      });
      if (m.equip[kind] && kind !== 'weapon') items.unshift({ label: '外す', value: '__none', desc: footCompare(m, kind, null) });
      if (!items.length) { await ui.say('付け替えられる装備がない。武器屋で買おう。'); continue; }
      const id = await ui.menu({ title: `${FOOT_SLOTS[kind].name}を付け替える`, header: '選んでいる装備に替えたときの「今 → 変更後（差）」', desc: true, wide: true, className: 'cmp-menu', items });
      if (!id) continue;
      const clone = { ...m, equip: { ...m.equip, [kind]: id === '__none' ? null : id } };
      const ok = await compareView({ title: `${esc(m.name)}：${FOOT_SLOTS[kind].name}を ${id === '__none' ? '外す' : esc(FOOT_GEAR[id].name)}`, before: () => buildCharModel(m), after: () => buildCharModel(clone), stats: compareTable(footRows(m, kind, id === '__none' ? null : id)) });
      if (!ok) continue;
      const old = m.equip[kind];
      if (old) addFoot(old, 1);
      if (id !== '__none') addFoot(id, -1);
      m.equip[kind] = id === '__none' ? null : id;
      m.hp = Math.min(m.hp, memberStats(m).maxHp);
      audio.sfx('ok');
    }
  }
}

// 仲間が使っているマシンを上に（乗っている順）、残りは入手順
export function sortPilotedFirst(list) {
  const rank = (mc) => { const i = partyMembers().findIndex((m) => m.machine === mc.id); return i < 0 ? 99 : i; };
  return list.map((mc, i) => [mc, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(([mc]) => mc);
}

// そうび（マシン）：仲間が使っているマシンの武器とパーツを、町の外でも付け替える（メカニックが気絶していないとき）
async function machineEquipMenu() {
  for (;;) {
    if (ren().ko) { await ui.say(`${ren().name}が気絶しているので、マシンをいじれない。`); return; }
    const mcs = partyMembers().map((m) => (m.machine ? G.machines[m.machine] : null)).filter((mc, i, a) => mc?.owned && a.indexOf(mc) === i);
    if (!mcs.length) { await ui.say('使っているマシンがない。'); return; }
    const mc = await ui.menu({
      title: 'そうび（マシン）', wide: true,
      items: [
        { label: '⚡ 最強（全員のマシン）', value: '__best', right: '<small>持っている中でいちばん強いパーツと武器に</small>' },
        ...mcs.map((x) => { const st = machineStats(x); return { label: esc(machineName(x)) + testTag(x), right: `${pilotName(x)}　装甲${x.armor}/${st.maxArmor}`, value: x }; }),
      ],
    });
    if (!mc) return;
    if (mc === '__best') { let n = 0; for (const x of mcs) n += bestMachine(x); bestDone(n); continue; }
    for (;;) {
      const k = await ui.menu({ title: esc(machineName(mc)), items: [{ label: '⚡ 最強', value: 'best' }, { label: '武器の付け替え', value: 'w' }, { label: 'パーツ交換', value: 'p' }] });
      if (!k) break;
      if (k === 'best') bestDone(bestMachine(mc));
      if (k === 'w') await weaponSlots(mc);
      if (k === 'p') await partSlots(mc);
    }
  }
}

async function machineList() {
  const owned = sortPilotedFirst(Object.values(G.machines).filter((mc) => mc.owned));
  const where = (mc) => (mc.loc.type === 'party' ? '乗っている' : mc.loc.type === 'garage' ? `${MAPS[mc.loc.town].name}のガレージ` : `${MAPS[mc.loc.map].name}に駐車`);
  const mc = await ui.menu({ title: 'マシン', wide: true, items: owned.map((m) => ({ label: esc(machineName(m)) + testTag(m), right: `${esc(where(m))}　${pilotName(m)}`, value: m })) });
  if (!mc) return;
  const st = machineStats(mc);
  const def = MACHINES[mc.type];
  const parts = PART_SLOTS.map(([k, n]) => `<tr><th>${n}</th><td>${esc(PARTS[mc.parts[k]].name)}</td></tr>`).join('');
  const ws = SLOT_INFO.map((info, i) => `<tr><th>${info.name}</th><td>${i >= st.slots ? '<small>（未解放）</small>' : mc.slots[i] ? esc(weaponLabel(weaponByUid(mc.slots[i]))) : '<small>なし</small>'}</td></tr>`).join('');
  await ui.panel(`
    <p>${esc(def.desc || '')}</p>
    <p><b>${esc(st.typeName)}タイプ</b>：<small>${esc(MACHINE_TYPES[st.type].desc)}</small></p>
    <p class="note">乗れる人：${def.pilots ? def.pilots.map((k) => esc(G.members[k]?.name || CHARACTERS[k].defaultName)).join('・') : 'だれでも'}${mc.type === 'alpha' ? `　状態：<b>${esc(sealInfo().name)}</b>` : ''}</p>
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
        { label: '音', right: settings.sound === 'hq' ? '高音質（アレンジ版）' : 'レトロ（電子音）', value: 'sound' },
        { label: 'むずかしさ', right: `${difficultyOf(settings).name}`, value: 'diff' },
        { label: 'ミニ地図', right: settings.minimap === false ? 'オフ' : 'オン', value: 'mini' },
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
    if (v === 'sound') {
      const cur = settings.sound === 'hq' ? 'hq' : 'retro';
      const d = await ui.menu({ title: '音（いつでも切り替えられます）', wide: true, desc: true, items: [
        { label: `${cur === 'retro' ? '● ' : ''}レトロ（電子音）`, value: 'retro', desc: 'スーファミ風の電子音。軽くて、どの端末でもよく鳴る' },
        { label: `${cur === 'hq' ? '● ' : ''}高音質（アレンジ版）`, value: 'hq', desc: 'バイオリン・フルート・ホルン・コーラスなど本物の楽器の音で、今の曲をアレンジして鳴らす。広いホールの響きつき（はじめて選んだときは楽器の読み込みに少し時間がかかる）' },
      ] });
      if (d && d !== cur) {
        settings.sound = d; audio.saveSettings();
        if (d === 'hq') { ui.toast('高音質の楽器を読み込んでいます…'); await audio.loadBanks(); }
        const song = audio.currentSong;
        if (song) audio.playSong(song, { restart: true });
        ui.toast(d === 'hq' ? '高音質（アレンジ版）にした' : 'レトロ（電子音）にした');
      }
    }
    if (v === 'diff') {
      const cur = settings.difficulty || 'normal';
      const d = await ui.menu({ title: 'むずかしさ（いつでも切り替えられます）', wide: true, desc: true, items: DIFF_ORDER.map((k) => ({ label: `${k === cur ? '● ' : ''}${DIFFICULTY[k].name}`, value: k, desc: DIFFICULTY[k].desc })) });
      if (d) { settings.difficulty = d; audio.saveSettings(); audio.sfx('ok'); ui.toast(`むずかしさを「${DIFFICULTY[d].name}」にした`); }
    }
    if (v === 'mini') { settings.minimap = settings.minimap === false; audio.saveSettings(); audio.sfx('ok'); }
    if (v === 'fs') { try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { ui.toast('この端末では全画面にできません'); } }
  }
}
