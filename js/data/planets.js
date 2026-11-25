// 惑星（章）と町。転送台の行き先一覧は惑星ごとに分けて表示する
// main：その惑星のメインの町（ほかの惑星から転送するときの飛び先）
// 第2章以降の惑星はここに足していけば、転送の一覧に並ぶ
export const PLANETS = [
  { id: 'earth', chapter: 1, name: '土の惑星', main: 'town1', towns: ['town1', 'town2', 'town3'] },
  { id: 'wind', chapter: 2, name: '風の惑星', main: 'town4', towns: ['town4', 'town5', 'town6'] },
];
export const planetOfTown = (town) => PLANETS.find((p) => p.towns.includes(town)) || null;
export const ALL_TOWNS = PLANETS.flatMap((p) => p.towns);
