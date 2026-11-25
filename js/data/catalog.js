// データの入口（カタログ）。ゲームに出てくるものの表はここに登録してある
// 新しいマシン・パーツ・武器・防具・アクセサリー・アイテム・素材・敵は、それぞれのデータファイルの表に1つ足すだけでよい。
// ガレージ・装備画面・開発者の部屋（入手場所・調整場所・展示台）・バランス調整は、このカタログを読んで一覧を自動で作る。
// （お店に並べるときだけは、町ごとの品ぞろえ js/data/shops.js にも書く）
import { MACHINES } from './machines.js';
import { PARTS } from './parts.js';
import { WEAPONS, WEAPON_CATS } from './weapons.js';
import { FOOT_GEAR, FOOT_SLOTS } from './footgear.js';
import { ITEMS, MATERIALS } from './items.js';
import { ENEMIES } from './enemies.js';

export const CATALOG = {
  machines: { name: 'マシン', table: MACHINES, file: 'js/data/machines.js（MACHINES）' },
  parts: { name: 'マシンのパーツ', table: PARTS, file: 'js/data/parts.js（PARTS）', groupBy: 'slot', groups: { head: '頭', body: 'ボディ', arm: '腕（右・左）', legs: '脚', engine: 'エンジン' } },
  weapons: { name: 'マシンの武器', table: WEAPONS, file: 'js/data/weapons.js（WEAPONS）', groupBy: 'mount', groups: { arm: '腕の武器', back: '肩・背中の武器', any: '特別機の専用武器（6か所どこでも）', core: '胸のコアの武器（アルファ）' } },
  foot: { name: '生身の装備', table: FOOT_GEAR, file: 'js/data/footgear.js（FOOT_GEAR）', groupBy: 'slot', groups: Object.fromEntries(Object.entries(FOOT_SLOTS).map(([k, v]) => [k, v.name])) },
  items: { name: '道具', table: ITEMS, file: 'js/data/items.js（ITEMS）' },
  mats: { name: '素材', table: MATERIALS, file: 'js/data/items.js（MATERIALS）' },
  enemies: { name: '敵', table: ENEMIES, file: 'js/data/enemies.js（ENEMIES）' },
};

// カタログの一覧（devOnly＝開発用の物は出さない）。group を指定するとその種類だけ
export function entries(key, group) {
  const c = CATALOG[key];
  return Object.entries(c.table).filter(([, r]) => !r.devOnly && (group == null || r[c.groupBy] === group));
}
export const groupsOf = (key) => Object.entries(CATALOG[key].groups || {});
export const nameOf = (key, id) => CATALOG[key].table[id]?.name || id;
export { WEAPON_CATS };
