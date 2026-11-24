// ポップアップ式のUI（会話・コマンドメニュー・確認・お知らせ・HUD）
// どれも Promise を返すので await で順番に書ける
import { audio } from './audio.js';

const stack = [];
let root, fadeEl, toastBox;

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const GEAR = '<span class="gear-icon">⚙</span>';
export const fmt = (n) => Number(n).toLocaleString('ja-JP');

function pushModal(m) {
  stack.push(m);
  root.appendChild(m.el);
  ui.onChange?.();
}
function popModal(m) {
  const i = stack.indexOf(m);
  if (i >= 0) stack.splice(i, 1);
  m.el.remove();
  ui.onChange?.();
}

export const ui = {
  onChange: null,
  get busy() { return stack.length > 0; },
  // いちばん上に開いているメニュー（無ければ null）
  topMenu() { const t = stack[stack.length - 1]; return t?.isMenu ? t : null; },

  init(rootEl) {
    root = rootEl;
    fadeEl = el('div', 'fade'); document.body.appendChild(fadeEl);
    toastBox = el('div', 'toasts'); document.body.appendChild(toastBox);
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement && e.key !== 'Enter' && e.key !== 'Escape') return;
      const top = stack[stack.length - 1];
      if (top?.onKey) { top.onKey(e); e.stopImmediatePropagation(); }
    }, true);
  },

  // ---- 会話 ----
  say(lines, opt = {}) {
    if (!Array.isArray(lines)) lines = [lines];
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-say');
      const box = el('div', 'say-box');
      const name = el('div', 'say-name');
      const text = el('div', 'say-text');
      const more = el('div', 'say-more', '▼');
      box.append(name, text, more);
      wrap.appendChild(box);
      let i = 0, typing = null, full = '';
      const show = () => {
        const line = lines[i];
        const who = typeof line === 'object' ? line.name : opt.name;
        full = typeof line === 'object' ? line.text : line;
        name.textContent = who || '';
        name.style.display = who ? '' : 'none';
        text.textContent = '';
        more.style.visibility = 'hidden';
        let n = 0;
        clearInterval(typing);
        typing = setInterval(() => {
          n += 2;
          text.textContent = full.slice(0, n);
          if (n % 6 === 0) audio.sfx('text');
          if (n >= full.length) { clearInterval(typing); typing = null; more.style.visibility = ''; }
        }, 28);
      };
      const next = () => {
        if (typing) { clearInterval(typing); typing = null; text.textContent = full; more.style.visibility = ''; return; }
        i++;
        if (i >= lines.length) { popModal(m); resolve(); return; }
        show();
      };
      const m = { el: wrap, onKey: (e) => { if (['Enter', ' ', 'z', 'Z', 'Escape', 'x', 'X'].includes(e.key)) { e.preventDefault(); next(); } } };
      wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); next(); });
      pushModal(m);
      show();
    });
  },

  // ---- コマンドメニュー ----
  // items: [{ label, value, disabled, right, desc }]
  menu({ title, items, cancel = true, desc = false, className = '', onFocus, header, wide = false, pos, passThrough = false }) {
    return new Promise((resolve) => {
      const depth = stack.filter((s) => s.isMenu).length;
      const wrap = el('div', `modal modal-menu${passThrough ? ' pass-through' : ''}`);
      const panel = el('div', `menu-panel ${className} ${wide ? 'wide' : ''}`);
      if (pos === 'right') panel.classList.add('pos-right');
      if (pos === 'left') panel.classList.add('pos-left');
      panel.style.setProperty('--depth', depth);
      if (title) panel.appendChild(el('div', 'menu-title', title));
      if (header) panel.appendChild(el('div', 'menu-header', header));
      const list = el('div', 'menu-list');
      panel.appendChild(list);
      const descEl = desc ? el('div', 'menu-desc') : null;
      if (descEl) panel.appendChild(descEl);
      if (cancel) {
        const c = el('button', 'menu-close', '✕');
        c.addEventListener('click', (e) => { e.stopPropagation(); done(null); });
        panel.appendChild(c);
      }
      wrap.appendChild(panel);
      let idx = items.findIndex((it) => !it.disabled && !it.separator);
      if (idx < 0) idx = 0;
      const rows = items.map((it, i) => {
        if (it.separator) { const s = el('div', 'menu-sep', it.label || ''); list.appendChild(s); return s; }
        const r = el('button', `menu-item${it.disabled ? ' disabled' : ''}${it.className ? ' ' + it.className : ''}`);
        r.innerHTML = `<span class="mi-label">${it.label}</span>${it.right != null ? `<span class="mi-right">${it.right}</span>` : ''}`;
        r.addEventListener('pointerenter', () => setIdx(i, false));
        r.addEventListener('click', (e) => {
          e.stopPropagation();
          setIdx(i, false);
          choose();
        });
        list.appendChild(r);
        return r;
      });
      const setIdx = (i, scroll = true) => {
        if (items[i]?.separator) return;
        rows[idx]?.classList.remove('focus');
        idx = i;
        rows[idx]?.classList.add('focus');
        if (scroll) rows[idx]?.scrollIntoView({ block: 'nearest' });
        if (descEl) descEl.innerHTML = items[idx]?.desc || '';
        onFocus?.(items[idx], idx);
      };
      const choose = () => {
        const it = items[idx];
        if (!it || it.disabled) { audio.sfx('error'); return; }
        audio.sfx('ok');
        done(it.value !== undefined ? it.value : idx);
      };
      const done = (v) => {
        if (v === null) audio.sfx('cancel');
        popModal(m);
        resolve(v);
      };
      const move = (d) => {
        let j = idx;
        for (let k = 0; k < items.length; k++) {
          j = (j + d + items.length) % items.length;
          if (!items[j].separator) break;
        }
        audio.sfx('cursor');
        setIdx(j);
      };
      const findBy = (pred) => items.findIndex((it) => !it.disabled && !it.separator && pred(it.value, it));
      const m = {
        el: wrap,
        isMenu: true,
        // 画面のタップなどから、メニューの中の項目を選ぶ（戦闘で敵や味方を直接タップした時）
        pickBy: (pred) => { const i = findBy(pred); if (i < 0) return false; setIdx(i, false); choose(); return true; },
        focusBy: (pred) => { const i = findBy(pred); if (i < 0) return false; if (i !== idx) { audio.sfx('cursor'); setIdx(i); } return true; },
        focused: () => items[idx],
        onKey: (e) => {
          if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); move(1); }
          else if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); move(-1); }
          else if (['Enter', ' ', 'z', 'Z'].includes(e.key)) { e.preventDefault(); if (!e.repeat) choose(); }
          else if (['Escape', 'x', 'X'].includes(e.key) && cancel) { e.preventDefault(); done(null); }
        },
      };
      wrap.addEventListener('pointerdown', (e) => {
        if (e.target === wrap && cancel) { e.preventDefault(); done(null); }
      });
      pushModal(m);
      setIdx(idx, true);
    });
  },

  async confirm(text, yes = 'はい', no = 'いいえ') {
    const v = await this.menu({ title: text, items: [{ label: yes, value: true }, { label: no, value: false }], className: 'confirm' });
    return v === true;
  },

  // ---- 情報パネル（タップで閉じる） ----
  panel(html, { title, className = '', closeText = '閉じる' } = {}) {
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-menu');
      const panel = el('div', `menu-panel info-panel ${className}`);
      if (title) panel.appendChild(el('div', 'menu-title', title));
      const body = el('div', 'panel-body', html);
      panel.appendChild(body);
      const btn = el('button', 'menu-item focus panel-ok', closeText);
      panel.appendChild(btn);
      wrap.appendChild(panel);
      const done = () => { popModal(m); resolve(); };
      btn.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('ok'); done(); });
      wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) { e.preventDefault(); done(); } });
      const m = { el: wrap, isMenu: true, onKey: (e) => { if (['Enter', ' ', 'Escape', 'z', 'x'].includes(e.key)) { e.preventDefault(); done(); } } };
      pushModal(m);
    });
  },

  // ---- 自由な中身のモーダル（展示台の画面など）。build(panel, done) が onKey を返してもよい ----
  custom({ className = '', build }) {
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-menu');
      const panel = el('div', `menu-panel ${className}`);
      wrap.appendChild(panel);
      let cleanup = null;
      const done = (v) => { cleanup?.(); popModal(m); resolve(v); };
      const m = { el: wrap, isMenu: true, onKey: (e) => { if (['Escape', 'x', 'X'].includes(e.key)) { e.preventDefault(); audio.sfx('cancel'); done(null); } else m.keys?.(e); } };
      pushModal(m);
      const r = build(panel, done, (fn) => { cleanup = fn; });
      if (typeof r === 'function') m.keys = r;
    });
  },

  // ---- お店の画面 ----
  // 左に商品の一覧、右に詳細（効果・値段・所持数・装備の比較）。選んでも買わず、右の「買う」ボタンを押した時だけ
  //   items(): [{ label, right, detail: () => html, price, can: () => true|'理由', group }]
  //   act(it): 「買う／売る」を押した時の処理（個数・確認は呼ぶ側で）。終わると一覧を作り直す
  shop({ title, header, items, verb = '買う', act }) {
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-menu');
      const panel = el('div', 'menu-panel shop-panel');
      panel.appendChild(el('div', 'menu-title', title));
      const head = el('div', 'menu-header');
      panel.appendChild(head);
      const body = el('div', 'shop-body');
      const list = el('div', 'menu-list shop-list');
      const side = el('div', 'shop-side');
      const detail = el('div', 'shop-detail');
      const btn = el('button', 'shop-act', verb);
      side.append(detail, btn);
      body.append(list, side);
      panel.appendChild(body);
      const close = el('button', 'menu-close', '✕');
      panel.appendChild(close);
      wrap.appendChild(panel);
      let cur = [], idx = 0, rows = [], working = false;
      const render = () => {
        cur = items();
        head.innerHTML = typeof header === 'function' ? header() : header || '';
        list.innerHTML = '';
        let lastGroup = null;
        rows = cur.map((it, i) => {
          if (it.group && it.group !== lastGroup) { list.appendChild(el('div', 'menu-sep', it.group)); lastGroup = it.group; }
          const r = el('button', 'menu-item');
          r.innerHTML = `<span class="mi-label">${it.label}</span>${it.right != null ? `<span class="mi-right">${it.right}</span>` : ''}`;
          r.addEventListener('click', (e) => { e.stopPropagation(); audio.sfx('cursor'); setIdx(i); });
          list.appendChild(r);
          return r;
        });
        if (!cur.length) list.appendChild(el('div', 'shop-empty', 'ありません'));
        setIdx(Math.min(idx, Math.max(0, cur.length - 1)), true);
      };
      const setIdx = (i, scroll = true) => {
        rows[idx]?.classList.remove('focus');
        idx = i;
        const it = cur[idx];
        rows[idx]?.classList.add('focus');
        if (scroll) rows[idx]?.scrollIntoView({ block: 'nearest' });
        detail.innerHTML = it ? it.detail() : '';
        const ok = it ? it.can() : false;
        btn.disabled = ok !== true;
        btn.innerHTML = ok === true ? verb : `${verb}<small>${ok ? `（${ok}）` : ''}</small>`;
      };
      const press = async () => {
        const it = cur[idx];
        if (!it || working) return;
        if (it.can() !== true) { audio.sfx('error'); return; }
        audio.sfx('ok');
        working = true;
        try { await act(it); } finally { working = false; }
        render();
      };
      btn.addEventListener('click', (e) => { e.stopPropagation(); press(); });
      const done = () => { audio.sfx('cancel'); popModal(m); resolve(); };
      close.addEventListener('click', (e) => { e.stopPropagation(); done(); });
      wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) { e.preventDefault(); done(); } });
      const m = {
        el: wrap, isMenu: true,
        onKey: (e) => {
          if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); if (cur.length) { audio.sfx('cursor'); setIdx((idx + 1) % cur.length); } }
          else if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); if (cur.length) { audio.sfx('cursor'); setIdx((idx - 1 + cur.length) % cur.length); } }
          else if (['Enter', ' ', 'z', 'Z'].includes(e.key)) { e.preventDefault(); if (!e.repeat) press(); }
          else if (['Escape', 'x', 'X'].includes(e.key)) { e.preventDefault(); done(); }
        },
      };
      pushModal(m);
      render();
    });
  },

  // ---- 個数を選ぶ（＋ー）。0 ならやめた ----
  qty({ title, unit, max, verb = '買う', note = '' }) {
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-menu');
      const panel = el('div', 'menu-panel qty-panel');
      panel.appendChild(el('div', 'menu-title', title));
      const box = el('div', 'qty-box');
      const minus10 = el('button', 'qty-btn', '−10'), minus = el('button', 'qty-btn', '−'), num = el('div', 'qty-num'), plus = el('button', 'qty-btn', '＋'), plus10 = el('button', 'qty-btn', '+10');
      box.append(minus10, minus, num, plus, plus10);
      const total = el('div', 'qty-total');
      const okB = el('button', 'menu-item focus qty-ok', `${verb}`), ngB = el('button', 'menu-item qty-ng', 'やめる');
      panel.append(box, total, el('div', 'note', note), okB, ngB);
      wrap.appendChild(panel);
      let n = 1;
      const draw = () => { num.textContent = n; total.innerHTML = `合計 ${GEAR}${fmt(unit * n)}`; minus.disabled = minus10.disabled = n <= 1; plus.disabled = plus10.disabled = n >= max; };
      const set = (v) => { const nv = Math.max(1, Math.min(max, v)); if (nv !== n) audio.sfx('cursor'); n = nv; draw(); };
      minus.addEventListener('click', (e) => { e.stopPropagation(); set(n - 1); });
      plus.addEventListener('click', (e) => { e.stopPropagation(); set(n + 1); });
      minus10.addEventListener('click', (e) => { e.stopPropagation(); set(n - 10); });
      plus10.addEventListener('click', (e) => { e.stopPropagation(); set(n + 10); });
      const done = (v) => { audio.sfx(v ? 'ok' : 'cancel'); popModal(m); resolve(v); };
      okB.addEventListener('click', (e) => { e.stopPropagation(); done(n); });
      ngB.addEventListener('click', (e) => { e.stopPropagation(); done(0); });
      wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) { e.preventDefault(); done(0); } });
      const m = {
        el: wrap, isMenu: true,
        onKey: (e) => {
          e.preventDefault();
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(n + 1);
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(n - 1);
          else if (['Enter', ' ', 'z', 'Z'].includes(e.key)) { if (!e.repeat) done(n); }
          else if (['Escape', 'x', 'X'].includes(e.key)) done(0);
        },
      };
      pushModal(m);
      draw();
    });
  },

  // ---- 数字の入力（バランス調整用）。やめたら null ----
  numberEntry({ title, value, def, step = 1, note = '' }) {
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-menu');
      const panel = el('div', 'menu-panel qty-panel');
      panel.appendChild(el('div', 'menu-title', title));
      const box = el('div', 'qty-box');
      const minus = el('button', 'qty-btn', '−'), plus = el('button', 'qty-btn', '＋');
      const inp = el('input', 'name-input num-input');
      inp.type = 'number'; inp.value = value; inp.step = step;
      box.append(minus, inp, plus);
      const okB = el('button', 'menu-item focus qty-ok', '決定'), resetB = el('button', 'menu-item', `初期値（${def}）に戻す`), ngB = el('button', 'menu-item qty-ng', 'やめる');
      panel.append(box, el('div', 'note', note), okB, resetB, ngB);
      wrap.appendChild(panel);
      const val = () => { const v = Number(inp.value); return Number.isFinite(v) ? v : value; };
      const round = (v) => Math.round(v / step) * step;
      minus.addEventListener('click', (e) => { e.stopPropagation(); inp.value = round(val() - step); audio.sfx('cursor'); });
      plus.addEventListener('click', (e) => { e.stopPropagation(); inp.value = round(val() + step); audio.sfx('cursor'); });
      const done = (v) => { audio.sfx(v == null ? 'cancel' : 'ok'); popModal(m); resolve(v); };
      okB.addEventListener('click', (e) => { e.stopPropagation(); done(val()); });
      resetB.addEventListener('click', (e) => { e.stopPropagation(); done(def); });
      ngB.addEventListener('click', (e) => { e.stopPropagation(); done(null); });
      const m = { el: wrap, isMenu: true, onKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); done(val()); } else if (e.key === 'Escape') { e.preventDefault(); done(null); } } };
      pushModal(m);
      setTimeout(() => inp.focus(), 50);
    });
  },

  // ---- 色の入力（マシンの色の調整用）。やめたら null ----
  colorEntry({ title, value, def }) {
    const hex = (v) => `#${Number(v ?? 0).toString(16).padStart(6, '0')}`;
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-menu');
      const panel = el('div', 'menu-panel qty-panel');
      panel.appendChild(el('div', 'menu-title', title));
      const box = el('div', 'qty-box');
      const inp = el('input', 'color-input'); inp.type = 'color'; inp.value = hex(value);
      const txt = el('div', 'qty-total', hex(value));
      inp.addEventListener('input', () => { txt.textContent = inp.value; });
      box.append(inp);
      const okB = el('button', 'menu-item focus qty-ok', '決定'), resetB = el('button', 'menu-item', `初期値（${hex(def)}）に戻す`), ngB = el('button', 'menu-item qty-ng', 'やめる');
      panel.append(box, txt, okB, resetB, ngB);
      wrap.appendChild(panel);
      const done = (v) => { audio.sfx(v == null ? 'cancel' : 'ok'); popModal(m); resolve(v); };
      okB.addEventListener('click', (e) => { e.stopPropagation(); done(parseInt(inp.value.slice(1), 16)); });
      resetB.addEventListener('click', (e) => { e.stopPropagation(); done(def); });
      ngB.addEventListener('click', (e) => { e.stopPropagation(); done(null); });
      const m = { el: wrap, isMenu: true, onKey: (e) => { if (e.key === 'Escape') { e.preventDefault(); done(null); } } };
      pushModal(m);
    });
  },

  // ---- 名前入力（ゲーム開始時） ----
  nameEntry(fields) {
    return new Promise((resolve) => {
      const wrap = el('div', 'modal modal-menu');
      const panel = el('div', 'menu-panel name-panel');
      panel.appendChild(el('div', 'menu-title', 'なまえを決めてください'));
      const inputs = fields.map((f) => {
        const row = el('label', 'name-row');
        row.appendChild(el('span', 'name-role', esc(f.role)));
        const inp = el('input', 'name-input');
        inp.value = f.value; inp.maxLength = 6; inp.placeholder = f.value;
        row.appendChild(inp);
        panel.appendChild(row);
        return inp;
      });
      panel.appendChild(el('div', 'name-note', '伝説の機体の名前は「アルファ」で固定です'));
      const ok = el('button', 'menu-item focus panel-ok', 'これで決定');
      panel.appendChild(ok);
      wrap.appendChild(panel);
      const done = () => {
        audio.sfx('ok');
        popModal(m);
        resolve(inputs.map((inp, i) => inp.value.trim() || fields[i].value));
      };
      ok.addEventListener('click', done);
      const m = { el: wrap, isMenu: true, onKey: (e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } } };
      pushModal(m);
    });
  },

  toast(text, dur = 2.2) {
    const t = el('div', 'toast', text);
    toastBox.appendChild(t);
    setTimeout(() => t.classList.add('out'), dur * 1000);
    setTimeout(() => t.remove(), dur * 1000 + 500);
  },

  banner(text, sub = '', dur = 2.4) {
    const b = el('div', 'banner', `<div class="banner-main">${text}</div>${sub ? `<div class="banner-sub">${sub}</div>` : ''}`);
    document.body.appendChild(b);
    requestAnimationFrame(() => b.classList.add('in'));
    setTimeout(() => b.classList.remove('in'), dur * 1000);
    setTimeout(() => b.remove(), dur * 1000 + 700);
  },

  fade(toBlack, dur = 0.4, color = '#000') {
    fadeEl.style.background = color;
    fadeEl.style.transitionDuration = `${dur}s`;
    fadeEl.style.opacity = toBlack ? '1' : '0';
    fadeEl.style.pointerEvents = toBlack ? 'auto' : 'none';
    return new Promise((r) => setTimeout(r, dur * 1000 + 30));
  },

  closeAll() {
    while (stack.length) popModal(stack[stack.length - 1]);
  },
};
