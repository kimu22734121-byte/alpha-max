// 惑星（章）と町。転送台の行き先一覧は惑星ごとに分けて表示する
// main：その惑星のメインの町（ほかの惑星から転送するときの飛び先）
// 第2章以降の惑星はここに足していけば、転送の一覧に並ぶ
export const PLANETS = [
  { id: 'earth', chapter: 1, name: '土の惑星', main: 'town1', towns: ['town1', 'town2', 'town3'] },
  { id: 'wind', chapter: 2, name: '風の惑星', main: 'town4', towns: ['town4', 'town5', 'town6'] },
  { id: 'water', chapter: 3, name: '水の惑星', main: 'town7', towns: ['town7', 'town8', 'town9'] },
  { id: 'fire', chapter: 4, name: '火の惑星', main: 'town10', towns: ['town10', 'town11', 'town12'] },
  { id: 'light', chapter: 5, name: '光の惑星', main: 'town13', towns: ['town13', 'town14', 'town15'] },
  { id: 'dark', chapter: 6, name: '闇の惑星', main: 'town16', towns: ['town16', 'town17', 'town18'] },
  { id: 'core', chapter: 7, name: 'マザーコアの世界', main: 'town19', towns: ['town19'] },
];
export const planetOfTown = (town) => PLANETS.find((p) => p.towns.includes(town)) || null;
export const ALL_TOWNS = PLANETS.flatMap((p) => p.towns);
