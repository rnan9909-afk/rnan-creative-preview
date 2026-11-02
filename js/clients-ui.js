// صفحة العملاء: صفوف مختصرة (الاسم والجوال والمحصّل وشرائح المشاريع والمستحقات والنقاط) بدل البطاقات الكبيرة،
// مع بحث وفلاتر وترتيب، وواتساب/اتصال مباشرة وقائمة «⋯» لبقية الإجراءات. الأنماط في css/clients.css.
(function () {
    const PAID = 'مدفوعة', CANCELLED = ['ملغي', 'ملغاة'];
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => Math.round(v || 0).toLocaleString('en-US');
    const money = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : num(v));
    const mobile = () => window.matchMedia('(max-width: 767.98px)').matches;
    const WA = '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98 1-3.63-.24-.37a9.83 9.83 0 0 1 15.24-12.13 9.76 9.76 0 0 1 2.88 6.95c0 5.42-4.41 9.83-9.79 9.83zm8.36-18.2A11.74 11.74 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.87 11.87 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41z"/></svg>';
    const HUES = [160, 220, 262, 38, 330, 190];
    const hue = s => HUES[[...String(s || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % HUES.length];
    const intl = p => (window.RNAN && RNAN.intlPhone ? RNAN.intlPhone(p) : String(p || '').replace(/\D/g, '').replace(/^0/, '966'));
    const projWord = n => n === 1 ? 'مشروع' : n === 2 ? 'مشروعان' : n + (n <= 10 ? ' مشاريع' : ' مشروعًا');

    let q = '', filter = 'all', order = 'value';

    // ── أرقام كل عميل من الفواتير والمشاريع ──
    function rows() {
        const C = typeof clientsData !== 'undefined' ? clientsData : [];
        const I = typeof invoicesData !== 'undefined' ? invoicesData : [];
        const P = typeof projectsData !== 'undefined' ? projectsData : [];
        const month = Date.now() - 30 * 864e5;
        return C.map((c, idx) => {
            const mine = x => x.client === c.company || x.client === c.name;
            const inv = I.filter(mine);
            const paid = inv.filter(i => i.status === PAID).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
            const due = inv.filter(i => i.status !== PAID && !CANCELLED.includes(i.status)).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
            const active = P.filter(p => mine(p) && p.status !== 'مكتمل').length;
            const added = Date.parse(c.dateAdded || '') || 0;
            return { c, idx, paid, due, active, points: parseInt(c.points) || 0, added, isNew: added >= month };
        });
    }
    const FILTERS = [
        ['all', 'الكل', () => true],
        ['active', 'لديهم مشاريع', r => r.active > 0],
        ['due', 'عليهم مستحقات', r => r.due > 0],
        ['new', 'جدد هذا الشهر', r => r.isNew]
    ];
    // «الأحدث»: تاريخ الإضافة، ثم ترتيب القاعدة (مفاتيح push زمنية) للعملاء القدامى بلا تاريخ
    const SORTS = { value: (a, b) => b.paid - a.paid || b.added - a.added || b.idx - a.idx, recent: (a, b) => b.added - a.added || b.idx - a.idx, name: (a, b) => String(a.c.company || a.c.name).localeCompare(String(b.c.company || b.c.name), 'ar') };

    function render() {
        const grid = document.getElementById('clients-grid');
        if (!grid) return;
        const all = rows();
        const due = all.reduce((s, r) => s + r.due, 0);
        const dueEl = document.getElementById('stat-clients-due');
        if (dueEl) dueEl.innerHTML = money(due);
        // عدّادات الفلاتر
        document.querySelectorAll('#clients-page .cl-chips [data-f]').forEach(b => {
            const f = FILTERS.find(x => x[0] === b.dataset.f);
            b.classList.toggle('on', b.dataset.f === filter);
            const n = b.querySelector('em');
            if (n && f) n.textContent = all.filter(f[2]).length;
        });
        const t = q.trim().toLowerCase();
        const list = all.filter(FILTERS.find(x => x[0] === filter)[2])
            .filter(r => !t || [r.c.company, r.c.name, r.c.phone].some(v => String(v || '').toLowerCase().includes(t)))
            .sort(SORTS[order] || SORTS.value);
        if (!all.length) {
            grid.innerHTML = `<div class="cl-empty">${ic('group_add')}<b>لا يوجد عملاء بعد</b><p>أضف أول عميل لتبدأ بإصدار العروض والفواتير له.</p><button type="button" class="cl-add" onclick="openClientModal('new')">${ic('person_add')} إضافة عميل</button></div>`;
            return;
        }
        if (!list.length) {
            grid.innerHTML = `<div class="cl-empty">${ic('search_off')}<b>لا نتائج مطابقة</b><p>جرّب اسمًا أو رقمًا آخر، أو اختر «الكل».</p></div>`;
            return;
        }
        grid.innerHTML = list.map(r => {
            const c = r.c, title = c.company || c.name || '—';
            const sub = [c.name && c.name !== c.company ? esc(c.name) : '', c.phone ? `<span dir="ltr">${esc(c.phone)}</span>` : ''].filter(Boolean).join(' · ');
            const phone = intl(c.phone);
            return `<article class="cl-row" data-i="${r.idx}">
                <button type="button" class="cl-main" data-act="details" title="ملف العميل">
                    <span class="cl-av" style="--hue:${hue(title)}">${esc(title.trim().charAt(0))}</span>
                    <span class="cl-name"><b>${esc(title)}</b><small>${sub || 'بلا رقم جوال'}</small></span>
                </button>
                <div class="cl-meta">
                    <span class="cl-paid"><small>المحصّل</small><b>${r.paid ? money(r.paid) : '<i>—</i>'}</b></span>
                    <span class="cl-tags">
                        ${r.active ? `<span class="cl-tag proj">${ic('rocket_launch')} ${projWord(r.active)}</span>` : ''}
                        ${r.due ? `<span class="cl-tag due">${ic('schedule')} <span class="en-num">${num(r.due)}</span> مستحق</span>` : ''}
                        ${r.points ? `<span class="cl-tag pts">${ic('hotel_class')} <span class="en-num">${num(r.points)}</span></span>` : ''}
                        ${r.isNew ? `<span class="cl-tag new">جديد</span>` : ''}
                    </span>
                </div>
                <div class="cl-acts">
                    ${phone.length >= 9 ? `<a class="cl-ib wa" href="https://wa.me/${esc(phone)}" target="_blank" rel="noopener" title="واتساب" aria-label="واتساب">${WA}</a>
                    <a class="cl-ib call" href="tel:${esc(c.phone)}" title="اتصال" aria-label="اتصال">${ic('call')}</a>` : ''}
                    <button type="button" class="cl-ib link" data-act="link" title="رابط العميل الخاص" aria-label="رابط العميل">${ic('link')}</button>
                    <button type="button" class="cl-ib" data-act="more" title="المزيد" aria-label="المزيد">${ic('more_horiz')}</button>
                </div>
            </article>`;
        }).join('');
    }

    // ── قائمة «⋯»: لوحة سفلية على الجوال، ومنسدلة بجانب الزر على الشاشات الكبيرة ──
    let menu = null;
    function closeMenu() {
        if (!menu) return;
        const m = menu;
        menu = null;
        m.classList.remove('open');
        setTimeout(() => m.remove(), 250);
    }
    function openMenu(btn, idx) {
        closeMenu();
        const c = clientsData[idx];
        if (!c) return;
        const sheet = mobile();
        const m = document.createElement('div');
        m.className = 'cl-menu-wrap no-print' + (sheet ? ' sheet' : '');
        m.innerHTML = `<div class="cl-scrim" data-x></div><div class="cl-menu" role="menu">
            ${sheet ? `<div class="cl-grab"></div><p class="cl-menu-t">${esc(c.company || c.name)}</p>` : ''}
            <button type="button" role="menuitem" data-do="details">${ic('person')} ملف العميل</button>
            <button type="button" role="menuitem" data-do="link">${ic('link')} رابط العميل الخاص</button>
            <button type="button" role="menuitem" data-do="project">${ic('add_task')} مشروع جديد له</button>
            <button type="button" role="menuitem" data-do="edit">${ic('edit_square')} تعديل البيانات</button>
            <button type="button" role="menuitem" class="danger" data-do="delete">${ic('delete')} حذف العميل</button>
        </div>`;
        document.body.appendChild(m);
        menu = m;
        if (!sheet) {
            const r = btn.getBoundingClientRect(), box = m.querySelector('.cl-menu');
            const h = box.offsetHeight, w = box.offsetWidth;
            box.style.top = (r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - 6 - h) : r.bottom + 6) + 'px';
            box.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
        }
        requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('open')));
        m.addEventListener('click', e => {
            if (e.target.closest('[data-x]')) return closeMenu();
            const b = e.target.closest('[data-do]');
            if (!b) return;
            const act = b.dataset.do;
            if (act === 'delete' && !b.classList.contains('sure')) {
                b.classList.add('sure');
                b.innerHTML = `${ic('warning')} اضغط مجددًا للتأكيد — حذف نهائي`;
                return;
            }
            closeMenu();
            run(act, idx);
        });
    }
    function run(act, idx) {
        const c = clientsData[idx];
        if (!c) return;
        if (act === 'details') return showClientDetails(idx);
        if (act === 'link') return openClientLink(idx);
        if (act === 'edit') return openClientModal('edit', idx);
        if (act === 'project') {
            if (typeof openProjectModal === 'function') openProjectModal('new');
            setTimeout(() => {
                const v = c.company || c.name;
                const pq = document.getElementById('pq-client'), full = document.getElementById('proj-client');
                if (pq && !document.querySelector('.pq-wrap[hidden]')) { pq.value = v; pq.dispatchEvent(new Event('change', { bubbles: true })); }
                if (full && document.getElementById('projectModal').classList.contains('open')) full.value = v;
            }, 80);
            return;
        }
        if (act === 'delete') {
            google.script.run.withSuccessHandler(() => {
                if (window.showAdminToast) showAdminToast('حُذف العميل «' + (c.company || c.name) + '»');
                loadAllData();
            }).withFailureHandler(e => { if (window.showAdminToast) showAdminToast('تعذّر الحذف: ' + ((e && e.message) || e)); }).deleteClientFromSheet(c.rowIndex);
        }
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (menu && !menu.classList.contains('sheet')) closeMenu(); });
    document.addEventListener('scroll', () => { if (menu && !menu.classList.contains('sheet')) closeMenu(); }, true);

    document.addEventListener('click', e => {
        const chip = e.target.closest('#clients-page .cl-chips [data-f]');
        if (chip) { filter = chip.dataset.f; return render(); }
        const b = e.target.closest('#clients-grid [data-act]');
        if (!b) return;
        const idx = +b.closest('.cl-row').dataset.i;
        if (b.dataset.act === 'more') return openMenu(b, idx);
        run(b.dataset.act, idx);
    });

    window.ClientsUI = { render, search: v => { q = v || ''; render(); }, sort: v => { order = v; render(); } };
})();
