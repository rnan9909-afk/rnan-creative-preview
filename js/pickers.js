// قوائم الاختيار والتقويم بهوية رنان بدل نوافذ المتصفح الأصلية، في لوحة الإدارة كلها (وما تبنيه أدوات الاستوديو لاحقًا).
// العنصر الأصلي (select / input) يبقى مصدر القيمة: onchange وقراءة .value تعمل كما هي، ونطلق input و change عند الاختيار.
// حقول التاريخ تصير نصية بقيمة YYYY-MM-DD نفسها حتى لا يظهر تنسيق المتصفح. الأنماط في css/pickers.css.
(function () {
    const SKIP = '#invoice-preview-template, [data-native]';
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const DAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const mobile = () => window.matchMedia('(max-width: 767.98px)').matches;
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim()); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const fire = el => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };

    // ── تفعيل العناصر (عند التحميل ولكل ما يُضاف لاحقًا) ──
    function enhance(root) {
        if (!root.querySelectorAll) return;
        root.querySelectorAll('select:not([data-rnp]):not([multiple]), input[type="date"]:not([data-rnp])').forEach(el => {
            if (el.closest(SKIP) || (el.tagName === 'SELECT' && el.size > 1)) return;
            if (el.tagName === 'SELECT') { el.dataset.rnp = 's'; return; }
            el.dataset.rnp = 'd';
            el.type = 'text';
            el.setAttribute('inputmode', 'none');
            el.setAttribute('autocomplete', 'off');
            if (!el.placeholder) el.placeholder = 'اختر التاريخ';
        });
    }
    new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && enhance(n.parentNode || n))))
        .observe(document.documentElement, { childList: true, subtree: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enhance(document)); else enhance(document);

    // العناصر نفسها بلا مؤشر (pointer-events: none) فلا تفتح نافذة المتصفح؛ النقرة تصل للأب ونحدّد العنصر من موضعها
    const hit = (root, x, y) => {
        const list = root.matches && root.matches('[data-rnp]') ? [root] : [...root.querySelectorAll('[data-rnp]')];
        return list.find(el => {
            if (el.disabled) return false;
            const r = el.getBoundingClientRect();
            return r.width && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        });
    };
    document.addEventListener('click', e => {
        if (!e.isTrusted && !e.clientX && !e.clientY) return;
        if (!e.target.closest || e.target.closest('.rnp-wrap')) return;
        const lab = e.target.closest('label');
        const el = hit(e.target, e.clientX, e.clientY) || (lab && lab.control && lab.control.dataset.rnp && !lab.control.disabled ? lab.control : null);
        if (!el) return;
        e.preventDefault();
        e.stopPropagation();
        open(el);
    }, true);
    document.addEventListener('keydown', e => {
        const el = e.target;
        if (!el || !el.dataset || !el.dataset.rnp || el.disabled) return;
        const k = e.key;
        if (k === 'Enter' || k === ' ' || (e.altKey && (k === 'ArrowDown' || k === 'ArrowUp')) || (el.dataset.rnp === 'd' && k === 'ArrowDown')) {
            e.preventDefault();
            open(el);
        }
    });

    // ── اللوحة: سفلية على الجوال، ومنسدلة تحت الحقل على الشاشات الكبيرة ──
    let wrap = null, panel = null, owner = null;
    function shell() {
        if (wrap) return;
        wrap = document.createElement('div');
        wrap.className = 'rnp-wrap no-print';
        wrap.hidden = true;
        wrap.innerHTML = '<div class="rnp-scrim"></div><div class="rnp-panel" role="dialog" aria-modal="true"></div>';
        document.body.appendChild(wrap);
        panel = wrap.querySelector('.rnp-panel');
        wrap.querySelector('.rnp-scrim').addEventListener('click', close);
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && wrap && !wrap.hidden) { e.stopPropagation(); close(); } }, true);
        window.addEventListener('resize', () => { if (wrap && !wrap.hidden && !wrap.classList.contains('sheet')) close(); });
        document.addEventListener('scroll', e => { if (wrap && !wrap.hidden && !wrap.classList.contains('sheet') && !panel.contains(e.target)) close(); }, true);
        dragToClose();
    }
    function show(el, title, body) {
        shell();
        if (owner) owner.classList.remove('rnp-owner');
        owner = el;
        el.classList.add('rnp-owner');
        const sheet = mobile();
        wrap.classList.toggle('sheet', sheet);
        panel.className = 'rnp-panel';
        panel.setAttribute('aria-label', title);
        panel.innerHTML = (sheet ? `<div class="rnp-grab"></div><div class="rnp-title">${esc(title)}</div>` : '') + body;
        panel.style.cssText = '';
        wrap.hidden = false;
        if (!sheet) place(el);
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
    }
    function place(el) {
        const r = el.getBoundingClientRect();
        const w = Math.max(r.width, panel.classList.contains('cal') ? 300 : 220);
        panel.style.width = w + 'px';
        const h = panel.offsetHeight, below = innerHeight - r.bottom - 12, above = r.top - 12;
        const top = h <= below || below >= above ? r.bottom + 6 : r.top - 6 - Math.min(h, above);
        let right = innerWidth - r.right;
        if (innerWidth - right - w < 8) right = innerWidth - w - 8;
        panel.style.top = Math.max(8, top) + 'px';
        panel.style.right = Math.max(8, right) + 'px';
        panel.style.maxHeight = Math.max(160, (top > r.top ? below : above)) + 'px';
    }
    function close() {
        if (!wrap || wrap.hidden) return;
        wrap.classList.remove('open');
        const el = owner;
        owner = null;
        if (el) el.classList.remove('rnp-owner');
        setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 260);
        if (el && !mobile()) el.focus({ preventScroll: true });
    }
    function dragToClose() {
        let y0 = null, dy = 0;
        panel.addEventListener('touchstart', e => {
            if (!wrap.classList.contains('sheet')) return;
            const list = panel.querySelector('.rnp-list');
            if (!e.target.closest('.rnp-grab, .rnp-title, .rnp-cal-head') && list && list.scrollTop > 0) return;
            y0 = e.touches[0].clientY; dy = 0;
        }, { passive: true });
        panel.addEventListener('touchmove', e => {
            if (y0 == null) return;
            dy = Math.max(0, e.touches[0].clientY - y0);
            if (dy > 6) { panel.classList.add('drag'); panel.style.transform = `translateY(${dy}px)`; }
        }, { passive: true });
        panel.addEventListener('touchend', () => {
            if (y0 == null) return;
            panel.classList.remove('drag');
            panel.style.transform = '';
            if (dy > 80) close();
            y0 = null;
        });
    }
    const titleOf = el => {
        const lab = (el.labels && el.labels[0]) || (el.previousElementSibling && el.previousElementSibling.tagName === 'LABEL' && el.previousElementSibling)
            || (el.parentElement && el.parentElement.previousElementSibling && el.parentElement.previousElementSibling.tagName === 'LABEL' && el.parentElement.previousElementSibling)
            || (el.closest('div') && el.closest('div').querySelector(':scope > label'));
        // نص التسمية وحده: بعض التسميات تحيط بالحقل نفسه (أدوات الاستوديو) فتُستبعد عناصره وملاحظاتها
        let text = '';
        if (lab) {
            const c = lab.cloneNode(true);
            c.querySelectorAll('select, input, textarea, button, em, small').forEach(x => x.remove());
            text = c.textContent;
        }
        return (text.trim() || el.getAttribute('aria-label') || el.title || (el.dataset.rnp === 'd' ? 'التاريخ' : 'اختر')).replace(/\s+/g, ' ').replace(/\s*[:：*]+\s*$/, '').trim();
    };
    function open(el) {
        if (el.dataset.rnp === 'd') openDate(el); else openSelect(el);
    }

    // ── قائمة الاختيار ──
    function openSelect(sel) {
        const opts = [...sel.options];
        const many = opts.length > 8;
        show(sel, titleOf(sel), `${many ? `<label class="rnp-search">${ic('search')}<input type="search" placeholder="بحث..." autocomplete="off"></label>` : ''}
            <div class="rnp-list" role="listbox">${opts.map((o, i) => `<button type="button" class="rnp-opt${o.selected ? ' on' : ''}" data-i="${i}" role="option" aria-selected="${o.selected}"${o.disabled ? ' disabled' : ''}>
                <span>${esc(o.textContent.trim() || '—')}</span>${ic('check')}</button>`).join('')}
            <p class="rnp-none" hidden>لا نتائج مطابقة</p></div>`);
        const list = panel.querySelector('.rnp-list');
        const on = list.querySelector('.rnp-opt.on');
        if (on) on.scrollIntoView({ block: 'center' });
        list.addEventListener('click', e => {
            const b = e.target.closest('.rnp-opt');
            if (!b || b.disabled) return;
            const i = +b.dataset.i;
            close();
            if (sel.selectedIndex !== i) { sel.selectedIndex = i; fire(sel); }
        });
        const q = panel.querySelector('.rnp-search input');
        if (q) {
            q.addEventListener('input', () => {
                const t = q.value.trim().toLowerCase();
                let n = 0;
                list.querySelectorAll('.rnp-opt').forEach(b => { const ok = !t || b.textContent.toLowerCase().includes(t); b.hidden = !ok; n += ok; });
                list.querySelector('.rnp-none').hidden = n > 0;
            });
            if (!mobile()) setTimeout(() => q.focus(), 30);
        }
        if (!mobile()) {
            const all = [...list.querySelectorAll('.rnp-opt')];
            panel.onkeydown = e => {
                const vis = all.filter(b => !b.hidden && !b.disabled);
                let i = vis.indexOf(document.activeElement);
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    i = e.key === 'ArrowDown' ? Math.min(vis.length - 1, i + 1) : Math.max(0, i - 1);
                    if (vis[i]) vis[i].focus();
                }
            };
            if (!q && on) on.focus({ preventScroll: true });
        }
    }

    // ── التقويم ──
    function openDate(inp) {
        const sel = parse(inp.value);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const min = parse(inp.min), max = parse(inp.max);
        let view = new Date((sel || today).getFullYear(), (sel || today).getMonth(), 1);
        const longDate = d => d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const hijri = d => d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
        const render = () => {
            const first = new Date(view.getFullYear(), view.getMonth(), 1);
            const start = new Date(first); start.setDate(1 - first.getDay());
            let cells = '';
            for (let i = 0; i < 42; i++) {
                const d = new Date(start); d.setDate(start.getDate() + i);
                const out = d.getMonth() !== view.getMonth();
                const off = (min && d < min) || (max && d > max);
                const cls = ['rnp-day', out && 'out', +d === +today && 'today', sel && +d === +sel && 'on'].filter(Boolean).join(' ');
                cells += `<button type="button" class="${cls}" data-d="${ymd(d)}"${off ? ' disabled' : ''}>${d.getDate()}</button>`;
            }
            return `<div class="rnp-cal-head">
                    <button type="button" class="rnp-nav" data-m="-1" aria-label="الشهر السابق">${ic('chevron_right')}</button>
                    <b>${MONTHS[view.getMonth()]} <span class="en">${view.getFullYear()}</span></b>
                    <button type="button" class="rnp-nav" data-m="1" aria-label="الشهر التالي">${ic('chevron_left')}</button>
                </div>
                <div class="rnp-week">${DAYS.map(d => `<span>${d}</span>`).join('')}</div>
                <div class="rnp-days">${cells}</div>
                <p class="rnp-sel">${sel ? `${longDate(sel)} <small>${hijri(sel)}</small>` : 'لم يُحدَّد تاريخ'}</p>
                <div class="rnp-foot">
                    <button type="button" class="rnp-btn" data-act="today">${ic('today')} اليوم</button>
                    ${inp.required ? '' : `<button type="button" class="rnp-btn ghost" data-act="clear">${ic('backspace')} مسح</button>`}
                </div>`;
        };
        show(inp, titleOf(inp), '');
        panel.classList.add('cal');
        const paint = () => { panel.querySelector('.rnp-cal').innerHTML = render(); };
        panel.insertAdjacentHTML('beforeend', '<div class="rnp-cal"></div>');
        paint();
        if (!mobile()) place(inp);
        const pick = v => { close(); if (inp.value !== v) { inp.value = v; fire(inp); } };
        panel.querySelector('.rnp-cal').addEventListener('click', e => {
            const nav = e.target.closest('[data-m]');
            if (nav) { view = new Date(view.getFullYear(), view.getMonth() + +nav.dataset.m, 1); paint(); return; }
            const day = e.target.closest('.rnp-day');
            if (day && !day.disabled) return pick(day.dataset.d);
            const act = e.target.closest('[data-act]');
            if (act) pick(act.dataset.act === 'today' ? ymd(today) : '');
        });
        // سحب أفقي على الجوال لتبديل الشهر
        let x0 = null;
        const days = () => panel.querySelector('.rnp-days');
        panel.querySelector('.rnp-cal').addEventListener('touchstart', e => { if (e.target.closest('.rnp-days')) x0 = e.touches[0].clientX; }, { passive: true });
        panel.querySelector('.rnp-cal').addEventListener('touchend', e => {
            if (x0 == null || !days()) return;
            const dx = e.changedTouches[0].clientX - x0;
            x0 = null;
            if (Math.abs(dx) > 50) { view = new Date(view.getFullYear(), view.getMonth() + (dx > 0 ? 1 : -1), 1); paint(); }
        });
    }

    window.RnanPickers = { enhance, open, close };
})();
