// المشاريع: «المشاريع النشطة» في الرئيسية بصفوف مرتبة بدل الجدول، وإضافة مشروع سريعة على الجوال
// (لوحة سفلية بالحقول الأساسية بدل النافذة الطويلة، و«تفاصيل أكثر» يفتحها كاملة). الأنماط في css/projects.css.
(function () {
    const ACTIVE = 'قيد التنفيذ';
    const STEPS = ['جمع البيانات', 'التصاميم الأولية', 'المراجعة والتعديل', 'التسليم النهائي'];
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const mobile = () => window.matchMedia('(max-width: 767.98px)').matches;
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const addDays = n => { const d = today(); d.setDate(d.getDate() + n); return ymd(d); };
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const days = n => n === 1 ? 'يوم' : n === 2 ? 'يومين' : n <= 10 ? n + ' أيام' : n + ' يومًا';
    const toast = m => (window.showAdminToast ? window.showAdminToast(m) : null);
    const run = (fn, ...a) => new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...a));

    // ── المشاريع النشطة في الرئيسية: الأقرب تسليمًا أولًا ──
    function due(s) {
        const d = parse(s);
        if (!d) return { cls: 'none', text: 'بلا موعد' };
        const n = Math.round((d - today()) / 864e5);
        if (n < 0) return { cls: 'late', text: 'متأخر ' + days(-n) };
        if (n === 0) return { cls: 'soon', text: 'التسليم اليوم' };
        if (n === 1) return { cls: 'soon', text: 'غدًا' };
        return { cls: n <= 3 ? 'soon' : '', text: 'بعد ' + days(n) };
    }
    function active(all) {
        const box = document.getElementById('dash-active-projects-list');
        if (!box) return;
        const list = (all || []).filter(p => p.status === ACTIVE)
            .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999')).slice(0, 5);
        if (!list.length) { box.innerHTML = `<p class="dp-empty">${ic('task_alt')} لا توجد مشاريع نشطة حاليًا</p>`; return; }
        box.innerHTML = list.map(p => {
            const pr = Math.max(0, Math.min(100, parseInt(p.progress) || 0));
            const d = due(p.deadline);
            return `<button type="button" class="dp-row" data-i="${projectsData.indexOf(p)}">
                <span class="dp-av">${esc((p.client || p.name || '?').trim().charAt(0))}</span>
                <span class="dp-main"><b>${esc(p.name)}</b><small>${esc(p.client || '—')}</small></span>
                <span class="dp-due ${d.cls}">${ic('event')}<span><b class="en-num">${esc(p.deadline || '—')}</b><em>${d.text}</em></span></span>
                <span class="dp-prog"><span class="dp-bar"><i style="width:${pr}%"></i></span><b class="en-num">${pr}%</b></span>
            </button>`;
        }).join('');
    }
    document.addEventListener('click', e => {
        const r = e.target.closest('#dash-active-projects-list .dp-row');
        if (r && +r.dataset.i > -1 && typeof window.openProjectModal === 'function') window.openProjectModal('edit', +r.dataset.i);
    });

    // ── إضافة مشروع سريعة (الجوال) ──
    const NEW_CLIENT = '__new__';
    let wrap = null, busy = false;
    function sheet() {
        if (wrap) return wrap;
        wrap = document.createElement('div');
        wrap.className = 'pq-wrap no-print';
        wrap.hidden = true;
        wrap.innerHTML = `<div class="pq-scrim" data-x></div>
            <form class="pq-sheet" role="dialog" aria-modal="true" aria-labelledby="pq-title" novalidate>
                <div class="pq-grab"></div>
                <header class="pq-head"><span class="pq-ic">${ic('add_task')}</span><h3 id="pq-title">مشروع جديد</h3><button type="button" class="pq-x" data-x aria-label="إغلاق">${ic('close')}</button></header>
                <div class="pq-body">
                    <label class="pq-f"><span>اسم المشروع</span><input name="name" class="form-input-modern" maxlength="120" placeholder="مثال: هوية بصرية لمقهى" autocomplete="off"></label>
                    <label class="pq-f"><span>العميل</span><select name="client" id="pq-client" class="form-input-modern"></select></label>
                    <div class="pq-new" hidden>
                        <label class="pq-f"><span>اسم العميل الجديد</span><input name="cname" class="form-input-modern" maxlength="80" placeholder="اسم الجهة أو الشخص"></label>
                        <label class="pq-f"><span>جواله <em>(اختياري)</em></span><input name="cphone" class="form-input-modern" inputmode="tel" dir="ltr" maxlength="20" placeholder="05xxxxxxxx"></label>
                    </div>
                    <label class="pq-f"><span>القيمة <em>(ر.س)</em></span><input name="value" class="form-input-modern" inputmode="decimal" dir="ltr" placeholder="0"></label>
                    <div class="pq-f"><span>موعد التسليم</span>
                        <div class="pq-chips">${[[3, '3 أيام'], [7, 'أسبوع'], [14, 'أسبوعين'], [30, 'شهر']].map(([n, t]) => `<button type="button" data-days="${n}">${t}</button>`).join('')}</div>
                        <input type="date" name="deadline" id="pq-deadline" class="form-input-modern" aria-label="موعد التسليم">
                    </div>
                    <label class="pq-f"><span>ملاحظات <em>(اختياري)</em></span><textarea name="notes" class="form-input-modern" rows="2" maxlength="2000" placeholder="متطلبات أو تفاصيل سريعة..."></textarea></label>
                    <p class="pq-hint">${ic('checklist')} تُضاف المهام الأساسية تلقائيًا: ${STEPS.join(' · ')}</p>
                    <p class="pq-err" hidden></p>
                </div>
                <footer class="pq-foot">
                    <button type="submit" class="pq-go">${ic('rocket_launch')} إنشاء المشروع</button>
                    <button type="button" class="pq-more" data-more>${ic('tune')} تفاصيل أكثر</button>
                </footer>
            </form>`;
        document.body.appendChild(wrap);
        const f = wrap.querySelector('form');
        wrap.addEventListener('click', e => {
            if (e.target.closest('[data-x]')) return close();
            const chip = e.target.closest('[data-days]');
            if (chip) { setDeadline(addDays(+chip.dataset.days)); return; }
            if (e.target.closest('[data-more]')) more();
        });
        f.client.addEventListener('change', () => {
            const isNew = f.client.value === NEW_CLIENT;
            wrap.querySelector('.pq-new').hidden = !isNew;
            if (isNew) setTimeout(() => f.cname.focus(), 50);
        });
        f.deadline.addEventListener('change', () => markChip());
        f.addEventListener('submit', e => { e.preventDefault(); create(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && wrap && !wrap.hidden && !document.querySelector('.rnp-wrap:not([hidden])')) close(); });
        return wrap;
    }
    function setDeadline(v) {
        const inp = wrap.querySelector('[name="deadline"]');
        inp.value = v;
        markChip();
    }
    function markChip() {
        const v = wrap.querySelector('[name="deadline"]').value;
        wrap.querySelectorAll('[data-days]').forEach(b => b.classList.toggle('on', addDays(+b.dataset.days) === v));
    }
    function fillClients(sel) {
        const cur = sel.value;
        const names = (typeof clientsData !== 'undefined' ? clientsData : []).map(c => c.company || c.name).filter(Boolean);
        sel.innerHTML = '<option value="">اختر العميل</option>' + names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')
            + `<option value="${NEW_CLIENT}">+ عميل جديد</option>`;
        if (cur) sel.value = cur;
    }
    function open() {
        sheet();
        const f = wrap.querySelector('form');
        f.reset();
        fillClients(f.client);
        wrap.querySelector('.pq-new').hidden = true;
        wrap.querySelector('.pq-err').hidden = true;
        setDeadline(addDays(7));
        wrap.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
        setTimeout(() => f.name.focus(), 360);
    }
    function close() {
        if (!wrap || wrap.hidden || busy) return;
        wrap.classList.remove('open');
        setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 320);
    }
    const err = m => { const el = wrap.querySelector('.pq-err'); el.textContent = m; el.hidden = false; };

    async function create() {
        if (busy) return;
        const f = wrap.querySelector('form');
        const name = f.name.value.trim();
        const isNew = f.client.value === NEW_CLIENT;
        const client = isNew ? f.cname.value.trim() : f.client.value;
        const value = parseFloat(String(f.value.value).replace(/[^\d.]/g, '')) || 0;
        if (!name) { err('اكتب اسم المشروع'); f.name.focus(); return; }
        if (!client) { err(isNew ? 'اكتب اسم العميل الجديد' : 'اختر العميل'); (isNew ? f.cname : f.client).focus(); return; }
        if (navigator.onLine === false) { err('لا يوجد اتصال بالإنترنت'); return; }
        const go = f.querySelector('.pq-go'), label = go.innerHTML;
        busy = true;
        go.disabled = true;
        go.innerHTML = '<span class="pq-spin"></span> جاري الإنشاء...';
        wrap.querySelector('.pq-err').hidden = true;
        try {
            if (isNew) await run('saveClientToSheet', { clientName: client, companyName: client, phone: f.cphone.value.trim(), invitedBy: '', rowIndex: '' });
            const res = await run('saveProjectToSheet', {
                rowIndex: '', name, client, value, progress: 0, deadline: f.deadline.value, startDate: ymd(today()),
                status: ACTIVE, steps: STEPS.map(text => ({ text, done: false })), notes: f.notes.value.trim()
            });
            busy = false;
            close();
            toast(`🚀 أُنشئ مشروع «${name}»${res && res.code ? ' — رقم التتبع ' + res.code : ''}`);
            if (typeof loadAllData === 'function') loadAllData();
            if (typeof switchPage === 'function') switchPage('projects');
        } catch (e) {
            busy = false;
            err('تعذّر الإنشاء: ' + ((e && e.message) || e || 'تحقّق من الاتصال'));
        } finally {
            go.disabled = false;
            go.innerHTML = label;
        }
    }
    // «تفاصيل أكثر»: النافذة الكاملة بما كُتب هنا
    function more() {
        const f = wrap.querySelector('form');
        const v = { name: f.name.value, client: f.client.value === NEW_CLIENT ? '' : f.client.value, value: f.value.value, deadline: f.deadline.value, notes: f.notes.value };
        close();
        full('new');
        const set = (id, x) => { const el = document.getElementById(id); if (el && x) el.value = x; };
        set('proj-name', v.name); set('proj-client', v.client); set('proj-value', v.value); set('proj-deadline', v.deadline); set('proj-start-date', ymd(today())); set('proj-notes', v.notes);
    }

    // «مشروع جديد» على الجوال يفتح اللوحة السريعة؛ التعديل وسطح المكتب يبقيان على النافذة الكاملة
    let full = null;
    function hook() {
        if (full || typeof window.openProjectModal !== 'function') return;
        full = window.openProjectModal;
        window.openProjectModal = function (mode) {
            if (mode === 'new' && mobile()) return open();
            return full.apply(this, arguments);
        };
    }

    // زر عائم في صفحة المشاريع على الجوال
    function fab() {
        const page = document.getElementById('projects-page');
        if (!page) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pq-fab no-print admin-only';
        b.setAttribute('aria-label', 'مشروع جديد');
        b.innerHTML = ic('add');
        b.addEventListener('click', () => window.openProjectModal('new'));
        document.body.appendChild(b);
        const sync = () => b.classList.toggle('show', !page.classList.contains('hidden'));
        new MutationObserver(sync).observe(page, { attributes: true, attributeFilter: ['class'] });
        sync();
    }

    function init() { hook(); fab(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    window.ProjectsUI = { active, quickAdd: open };
})();
