// シーン同士をつなぐ場所（循環importを避けるため、main.js がここに登録する）
export const flow = {
  scenes: {},
  // main.js で上書き
  async toTitle() {},
  async startBattle() {},
  async toWorld() {},
};
