// البحث الشامل: Ctrl+K أو «/» أو زر البحث أعلى اللوحة — يبحث في العملاء والفواتير والمشاريع والعروض وطلبات الموقع وقائمة الأسعار والصفحات،
// ومعه أوامر سريعة (فاتورة جديدة، مشروع، عرض سعر، عميل، نسخة احتياطية…). الأسهم للتنقل و Enter للفتح. الأنماط في css/search.css.
(function () {
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => Math.round(v || 0).toLocaleString('en-US');
    const MAP = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9 };
    const norm = s => String(s == null ? '' : s).replace(/[٠-٩]/g, d => MAP[d]).trim().replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[,،]/g, '').replace(/\s+/g, ' ').toLowerCase();
    const C = () => (typeof clientsData !== 'undefined' ? clientsData : []);
    const I = () => (typeof invoicesData !== 'undefined' ? invoicesData : []);
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const R = () => (typeof requestsData !== 'undefined' ? requestsData : []);
    const go = page => { switchPage(page); const m = document.querySelector('main'); if (m) m.scrollTo(0, 0); };
    const PAGES = [['dashboard', 'الرئيسية', 'grid_view'], ['finance', 'المالية', 'payments'], ['invoices', 'الفواتير', 'receipt_long'], ['clients', 'العملاء', 'group'],
        ['projects', 'المشاريع', 'folder_open'], ['proposals', 'العروض والعقود', 'request_quote'], ['templates', 'قوالب العروض', 'library_books'], ['prices', 'قائمة الأسعار', 'sell'],
        ['time', 'تتبّع الوقت', 'timer'], ['subs', 'الاشتراكات والأدوات', 'credit_card'], ['requests', 'طلبات الموقع', 'move_to_inbox'], ['site', 'إدارة الموقع', 'language']];
    const CMDS = [
        ['فاتورة جديدة', 'add_card', () => openInvoiceModal('new'), 'إنشاء فاتورة'],
        ['مشروع جديد', 'create_new_folder', () => window.ProjectsUI && ProjectsUI.compose(), 'إضافة مشروع'],
        ['عرض سعر جديد', 'request_quote', () => { go('proposals'); Studio.P.edit(null); }, 'عرض أو عقد'],
        ['عميل جديد', 'person_add', () => openClientModal('new'), 'إضافة عميل'],
        ['مصروف جديد', 'receipt', () => { go('finance'); setTimeout(() => { const b = document.querySelector('#finance-page [data-fn="exp-quick"]'); if (b) b.click(); }, 400); }, 'تسجيل مصروف'],
        ['بدء المؤقت', 'play_circle', () => go('time'), 'تتبّع الوقت'],
        ['نسخة احتياطية', 'backup', () => window.RnBackup && RnBackup.open(), 'تحميل بياناتك'],
        ['الحساب البنكي', 'account_balance', () => openBankSettingsModal(), 'بيانات الدفع'],
        ['صفحة الروابط', 'link', () => openLinksPageModal(), 'روابطك'],
        ['تبديل المظهر', 'contrast', () => toggleTheme(), 'فاتح / داكن']
    ];
    let wrap = null, results = [], active = 0, props = null, propsAt = 0;

    async function loadProps() {
        if (props && Date.now() - propsAt < 60000) return;
        propsAt = Date.now();
        try { props = Object.entries((await window.db.ref('proposals').once('value')).val() || {}).map(([id, v]) => Object.assign({ id }, v)); } catch (e) { props = []; }
        if (wrap && !wrap.hidden) run();
    }
    // كل الكلمات يجب أن تظهر؛ البداية بالكلمة أعلى ترتيبًا
    function score(q, hay) {
        const h = norm(hay), parts = q.split(' ').filter(Boolean);
        if (!parts.every(p => h.includes(p))) return 0;
        return (h.startsWith(parts[0]) ? 3 : 1) + (h === q ? 5 : 0);
    }
    function search(raw) {
        const q = norm(raw), out = [];
        if (!q) {
            CMDS.slice(0, 6).forEach(([t, i, fn, sub]) => out.push({ g: 'أوامر سريعة', icon: i, t, sub, fn }));
            PAGES.slice(0, 6).forEach(([k, t, i]) => out.push({ g: 'الصفحات', icon: i, t, sub: 'انتقال', fn: () => go(k) }));
            return out;
        }
        const push = (g, list, max) => list.filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, max).forEach(x => out.push(Object.assign({ g }, x)));
        push('العملاء', C().map((c, i) => ({ s: score(q, [c.company, c.name, c.phone].join(' ')), icon: 'person', t: c.company || c.name, sub: c.phone || 'عميل', fn: () => (window.ClientProfile ? ClientProfile.show(i) : showClientDetails(i)) })), 5);
        push('الفواتير', I().map(i => ({ s: score(q, [i.number, i.client, i.amount, (i.items || []).map(x => x.desc).join(' ')].join(' ')), icon: 'receipt_long', t: `#${i.number} · ${i.client || ''}`,
            sub: `${num(i.amount)} ر.س · ${window.InvoicesPage ? InvoicesPage.dueLabel(i) : i.status}`, fn: () => window.InvoicesPage && InvoicesPage.open(i.number) })), 6);
        push('المشاريع', P().map((p, k) => ({ s: score(q, [p.name, p.client, p.code].join(' ')), icon: 'folder_open', t: p.name, sub: `${p.client || ''} · ${p.status || ''}`, fn: () => openProjectModal('edit', k) })), 5);
        push('العروض والعقود', (props || []).map(p => ({ s: score(q, [p.title, p.clientName, p.number].join(' ')), icon: 'request_quote', t: p.title || 'عرض', sub: `${p.clientName || ''}${p.number ? ' · ' + p.number : ''}`, fn: () => { go('proposals'); Studio.P.edit(p.id); } })), 4);
        push('طلبات الموقع', R().map(r => ({ s: score(q, [r.name, r.phone, r.code, r.details].join(' ')), icon: 'move_to_inbox', t: r.name || 'طلب', sub: `${r.code || ''} · ${r.status || ''}`, fn: () => go('requests') })), 3);
        if (window.PriceList) push('قائمة الأسعار', PriceList.items().map(x => ({ s: score(q, x.name), icon: 'sell', t: x.name, sub: PriceList.priceText(x), fn: () => go('prices') })), 3);
        push('الصفحات', PAGES.map(([k, t, i]) => ({ s: score(q, t), icon: i, t, sub: 'انتقال', fn: () => go(k) })), 3);
        push('أوامر سريعة', CMDS.map(([t, i, fn, sub]) => ({ s: score(q, t + ' ' + sub), icon: i, t, sub, fn })), 3);
        return out;
    }
    function run() {
        const input = wrap.querySelector('.gs-in');
        results = search(input.value);
        active = Math.min(active, Math.max(0, results.length - 1));
        let g = null;
        wrap.querySelector('.gs-list').innerHTML = results.length ? results.map((r, k) => {
            const head = r.g !== g ? `<li class="gs-g" role="presentation">${esc((g = r.g))}</li>` : '';
            return head + `<li class="gs-it${k === active ? ' on' : ''}" role="option" aria-selected="${k === active}" data-k="${k}"><span class="gs-ic">${ic(r.icon)}</span>
                <span class="gs-tx"><b>${esc(r.t)}</b><small>${esc(r.sub || '')}</small></span>${k === active ? `<kbd>${ic('keyboard_return')}</kbd>` : ''}</li>`;
        }).join('') : `<li class="gs-none">${ic('search_off')}<span>لا نتائج لـ «${esc(input.value)}»</span></li>`;
        const on = wrap.querySelector('.gs-it.on');
        if (on) on.scrollIntoView({ block: 'nearest' });
    }
    function pick(k) {
        const r = results[k];
        if (!r) return;
        close();
        setTimeout(() => { try { r.fn(); } catch (e) { console.error(e); } }, 60);
    }
    function open() {
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'gs-wrap no-print';
            wrap.hidden = true;
            wrap.innerHTML = `<div class="gs-scrim" data-gs="close"></div><section class="gs-box" role="dialog" aria-modal="true" aria-label="البحث الشامل">
                <label class="gs-bar">${ic('search')}<input class="gs-in" type="search" placeholder="ابحث عن عميل، فاتورة، مشروع، عرض، خدمة… أو اكتب أمرًا" autocomplete="off" enterkeyhint="go" aria-controls="gs-list">
                    <button type="button" class="gs-x" data-gs="close" aria-label="إغلاق">Esc</button></label>
                <ul class="gs-list" id="gs-list" role="listbox"></ul>
                <footer class="gs-foot"><span><kbd>↑</kbd><kbd>↓</kbd> للتنقل</span><span><kbd>Enter</kbd> للفتح</span><span><kbd>Ctrl</kbd>+<kbd>K</kbd> من أي صفحة</span></footer></section>`;
            document.body.appendChild(wrap);
            const input = wrap.querySelector('.gs-in');
            input.addEventListener('input', () => { active = 0; run(); });
            input.addEventListener('keydown', e => {
                if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(results.length - 1, active + 1); run(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); run(); }
                else if (e.key === 'Enter') { e.preventDefault(); pick(active); }
                else if (e.key === 'Escape') { e.preventDefault(); close(); }
            });
            wrap.addEventListener('click', e => {
                if (e.target.closest('[data-gs="close"]')) return close();
                const it = e.target.closest('.gs-it');
                if (it) pick(+it.dataset.k);
            });
            wrap.addEventListener('mousemove', e => { const it = e.target.closest('.gs-it'); if (it && +it.dataset.k !== active) { active = +it.dataset.k; run(); } });
        }
        const input = wrap.querySelector('.gs-in');
        input.value = '';
        active = 0;
        run();
        wrap.hidden = false;
        document.documentElement.classList.add('gs-lock');
        requestAnimationFrame(() => { wrap.classList.add('open'); input.focus(); });
        loadProps();
    }
    function close() {
        if (!wrap || wrap.hidden) return;
        wrap.classList.remove('open');
        document.documentElement.classList.remove('gs-lock');
        setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 180);
    }
    const typing = t => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) {
            if (!document.getElementById('login-overlay') || document.getElementById('login-overlay').classList.contains('hidden')) { e.preventDefault(); wrap && !wrap.hidden ? close() : open(); }
        } else if (e.key === '/' && !typing(e.target) && !(wrap && !wrap.hidden) && document.getElementById('login-overlay').classList.contains('hidden')) { e.preventDefault(); open(); }
    });
    // زر البحث بجانب زر المظهر (سطح المكتب) وقبل الجرس (الجوال)
    function buttons() {
        const desk = document.getElementById('theme-icon-desktop'), mob = document.getElementById('theme-icon-mobile');
        if (desk && !document.getElementById('gs-btn-d')) desk.closest('button').insertAdjacentHTML('beforebegin', `<button type="button" id="gs-btn-d" class="gs-btn d" data-gs-open title="البحث الشامل (Ctrl+K)" aria-label="البحث الشامل">${ic('search')}<span>بحث</span><kbd>Ctrl K</kbd></button>`);
        if (mob && !document.getElementById('gs-btn-m')) mob.closest('button').insertAdjacentHTML('beforebegin', `<button type="button" id="gs-btn-m" class="gs-btn m" data-gs-open aria-label="البحث الشامل">${ic('search')}</button>`);
    }
    document.addEventListener('click', e => { if (e.target.closest('[data-gs-open]')) open(); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buttons); else buttons();
    window.GlobalSearch = { open, close, search };
})();
