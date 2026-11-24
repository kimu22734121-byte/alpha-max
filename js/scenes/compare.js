// 変更前と変更後を3Dで左右に並べて比べる画面（ガレージのパーツ交換・武器の付け替え・生身の装備）
// 展示台（js/core/preview.js）は開発者の部屋の調整場所と同じものを使い回す
import { ui } from '../core/ui.js';
import { audio } from '../core/audio.js';
import { createStage } from '../core/preview.js';

// before / after：3Dモデルを作る関数。stats：数値の比較（HTML）。決定すると光ってパーツが入れ替わる
export function compareView({ title, before, after, stats, okLabel = '決定', disabled = '' }) {
  return ui.custom({
    className: 'compare-panel',
    build: (panel, done, onClose) => {
      panel.innerHTML = `<div class="menu-title">${title}</div>
        <div class="cmp3d"><div class="cmp3d-stage"></div><div class="cmp3d-labels"><span>今</span><span class="after">変更後</span></div></div>
        <div class="cmp3d-stats">${stats}</div>
        <div class="cmp3d-btns"><button class="shop-act cmp3d-ok"${disabled ? ' disabled' : ''}>${disabled || okLabel}</button><button class="menu-item cmp3d-ng">やめる</button></div>`;
      const stage = createStage(panel.querySelector('.cmp3d-stage'), { count: 2 });
      stage.set(0, before());
      stage.set(1, after());
      onClose(() => stage.dispose());
      let busy = false;
      const ok = async () => {
        if (busy || disabled) return;
        busy = true;
        audio.sfx('repair');
        stage.flash(1);
        await stage.swap(0, after());
        await new Promise((r) => setTimeout(r, 250));
        done(true);
      };
      panel.querySelector('.cmp3d-ok').addEventListener('click', (e) => { e.stopPropagation(); ok(); });
      panel.querySelector('.cmp3d-ng').addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cancel'); done(false); });
      return (e) => { if (['Enter', ' ', 'z', 'Z'].includes(e.key)) { e.preventDefault(); ok(); } };
    },
  }).then((v) => !!v);
}
