// نافذة المشروع الجديدة (التعديل): رأس بالنوع والاسم ورقم التتبع، الحالة بأزرار، المهام بشريط إنجاز، لوحة التصميم ومراجعة العميل،
// والعميل والنوع والمواعيد والمالية في عمود جانبي. الحقول والمعرّفات نفسها القديمة فتعمل دوال الحفظ والعرض والفاتورة كما هي.
// الأنماط في css/project-edit.css، ولوحة التصميم في js/proofs.js.
(function () {
    const SPANS = [[1, 'يوم'], [3, '3 أيام'], [7, 'أسبوع'], [14, 'أسبوعين'], [30, 'شهر']];
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const $ = id => document.getElementById(id);
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const days = n => n === 1 ? 'يوم واحد' : n === 2 ? 'يومان' : n <= 10 ? n + ' أيام' : n + ' يومًا';
    const UI = () => window.ProjectsUI || {};
    const modal = () => $('projectModal');
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => (Math.round((parseFloat(v) || 0) * 100) / 100).toLocaleString('en-US');
    const items = n => n === 1 ? 'بند واحد' : n === 2 ? 'بندان' : n <= 10 ? n + ' بنود' : n + ' بندًا';
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    let current = null, invBusy = false;

    function setType(id) {
        const T = UI().TYPES || [];
        const t = T.find(x => x.id === id) || T[T.length - 1] || { id: '', ic: 'category', hue: 205, t: '' };
        $('proj-type').value = t.id;
        const head = $('pe-type-ic');
        head.style.setProperty('--hue', t.hue);
        head.innerHTML = ic(t.ic);
        head.title = t.t;
        document.querySelectorAll('#pe-types [data-type]').forEach(b => b.classList.toggle('on', b.dataset.type === t.id));
    }
    function setStatus(v) {
        const sel = $('proj-status');
        if (sel.value !== v) {
            sel.value = v;
            if (typeof syncStatusToProgress === 'function') syncStatusToProgress();
        }
        sync();
    }
    // كل ما يعتمد على الحقول: الحالة، الشريط، عدد المهام، الموعد، الرأس
    function sync() {
        const st = $('proj-status').value;
        document.querySelectorAll('#projectModal [data-st]').forEach(b => { const on = b.dataset.st === st; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        modal().querySelector('.pe-box').dataset.status = st;
        const pr = Math.max(0, Math.min(100, parseInt($('proj-progress').value) || 0));
        $('pe-bar').style.width = pr + '%';
        $('proj-progress-text').innerText = pr + '%';
        const items = document.querySelectorAll('#proj-steps-container .step-item');
        const done = [...items].filter(i => i.querySelector('input[type=checkbox]').checked).length;
        $('pe-steps-count').textContent = items.length ? done + '/' + items.length : '';
        $('pe-head-client').textContent = $('proj-client').value || 'بلا عميل';
        $('proj-progress').hidden = items.length > 0;
        const s = parse($('proj-start-date').value), d = parse($('proj-deadline').value);
        const span = s && d ? Math.round((d - s) / 864e5) : null;
        const fromToday = d ? Math.round((d - today()) / 864e5) : null;
        document.querySelectorAll('#pe-spans [data-span]').forEach(b => b.classList.toggle('on', +b.dataset.span === fromToday));
        const due = UI().due ? UI().due($('proj-deadline').value) : { cls: '', text: '' };
        const el = $('pe-due');
        if (st === 'مكتمل') { el.className = 'pe-due ok'; el.innerHTML = `${ic('task_alt')} مكتمل`; }
        else if (!d) { el.className = 'pe-due'; el.innerHTML = `${ic('event_busy')} بلا موعد تسليم`; }
        else { el.className = 'pe-due ' + due.cls; el.innerHTML = `${ic(due.cls === 'late' ? 'warning' : 'schedule')} ${due.text}${span !== null && span >= 0 ? ' · مدة التنفيذ ' + (span ? days(span) : 'نفس اليوم') : ''}`; }
        invBox();
    }

    // ── فواتير العميل المفتوحة: إضافة قيمة المشروع لإحداها بدل فاتورة منفصلة (js/project-invoice.js) ──
    function invBox() {
        const box = $('pending-invoice-alert'), PI = window.ProjectInvoice;
        if (!box || !PI || invBusy) return;
        const list = PI.open($('proj-client').value).slice(0, 3);
        const name = $('proj-name').value.trim(), val = parseFloat($('proj-value').value) || 0, ready = val > 0 && !!name;
        box.classList.toggle('hidden', !list.length);
        $('pending-inv-num').textContent = list.length ? list[0].number : '';
        const sep = modal().querySelector('.pe-inv');
        if (sep) sep.innerHTML = `${ic('receipt_long')} ${list.length ? 'إصدار فاتورة منفصلة بقيمة المشروع' : 'إصدار فاتورة بقيمة المشروع'}`;
        if (!list.length) return;
        $('pe-oi-title').textContent = list.length > 1 ? 'فواتير مفتوحة لهذا العميل' : 'فاتورة مفتوحة لهذا العميل';
        $('pe-oi-list').innerHTML = list.map(i => `<div class="pe-oi-row">
                <span class="pe-oi-t"><b class="en-num" dir="ltr">${esc(i.number)}</b><small><span class="en-num">${num(i.amount)}</span> ر.س · ${items(PI.count(i))}</small></span>
                ${PI.has(i, name) ? `<span class="pe-oi-ok">${ic('check_circle')} المشروع فيها</span>`
                    : `<button type="button" class="admin-only" data-addinv="${esc(i.number)}"${ready ? '' : ' disabled'}>${ic('add_circle')} إضافة${ready ? ` <span class="en-num">${num(val)}</span> ر.س` : ''}</button>`}
            </div>`).join('');
        const hint = $('pe-oi-hint');
        hint.hidden = ready;
        hint.textContent = name ? 'أدخل قيمة المشروع لتضيفها للفاتورة' : 'اكتب اسم المشروع أولًا';
    }
    async function addInv(btn) {
        const PI = window.ProjectInvoice;
        const inv = PI && PI.open($('proj-client').value).find(i => String(i.number) === btn.dataset.addinv);
        if (!inv || invBusy || btn.disabled) return;
        invBusy = true;
        btn.disabled = true;
        btn.innerHTML = `<span class="material-symbols-rounded animate-spin">sync</span> جاري الإضافة...`;
        try {
            const r = await PI.add(inv, { rowIndex: $('proj-row-index').value, name: $('proj-name').value.trim(), value: $('proj-value').value, saved: current && current.value });
            toast(`أُضيف المشروع للفاتورة ${r.number} — إجماليها الآن ${num(r.total)} ر.س`);
            if (typeof loadAllData === 'function') loadAllData();
        } catch (e) {
            toast('تعذّرت الإضافة: ' + ((e && e.message) || e || 'تحقّق من الاتصال'));
        }
        invBusy = false;
        invBox();
    }
    function build() {
        const T = UI().TYPES || [];
        $('pe-types').innerHTML = T.map(t => `<button type="button" data-type="${t.id}" style="--hue:${t.hue}" title="${t.t}">${ic(t.ic)}<span>${t.t}</span></button>`).join('');
        $('pe-spans').innerHTML = `<small>التسليم بعد</small>` + SPANS.map(([n, t]) => `<button type="button" data-span="${n}">${t}</button>`).join('');
    }
    function decorate(index, opts) {
        const p = (typeof projectsData !== 'undefined' ? projectsData : [])[index];
        if (!p) return;
        current = p;
        if (!$('pe-types').children.length) build();
        setType(p.type || (UI().typeOf ? UI().typeOf(p).id : ''));
        const del = modal().querySelector('.pe-del');
        if (del) { del.classList.remove('sure'); del.innerHTML = `${ic('delete')} حذف`; }
        $('whatsapp-menu').classList.add('hidden');
        sync();
        if (window.ProofsUI) ProofsUI.panel(p);
        const body = modal().querySelector('.pe-body');
        body.scrollTop = 0;
        if (opts && opts.focus === 'proof') setTimeout(() => $('pe-proof-sec').scrollIntoView({ block: 'start', behavior: 'smooth' }), 120);
    }
    function close() {
        modal().classList.remove('open');
        $('whatsapp-menu').classList.add('hidden');
        if (window.RnanPickers) RnanPickers.close();
    }

    function hook() {
        const m = modal();
        if (!m || !m.classList.contains('pe-modal') || typeof window.openProjectModal !== 'function' || window.openProjectModal.__pe) return;
        const prev = window.openProjectModal;
        window.openProjectModal = function (mode, index, opts) {
            const r = prev.apply(this, arguments);
            if (mode === 'edit') decorate(index, opts);
            return r;
        };
        window.openProjectModal.__pe = true;
        build();
        m.addEventListener('click', e => {
            if (e.target === m) return close();
            const st = e.target.closest('[data-st]');
            if (st) return setStatus(st.dataset.st);
            const ai = e.target.closest('[data-addinv]');
            if (ai) return addInv(ai);
            const t = e.target.closest('#pe-types [data-type]');
            if (t) return setType(t.dataset.type);
            const sp = e.target.closest('[data-span]');
            if (sp) {
                const d = today();
                if (!$('proj-start-date').value) $('proj-start-date').value = ymd(d);
                d.setDate(d.getDate() + +sp.dataset.span);
                $('proj-deadline').value = ymd(d);
                return sync();
            }
            if (!e.target.closest('#whatsapp-btn, #whatsapp-menu')) $('whatsapp-menu').classList.add('hidden');
            // إضافة مهمة أو حذفها تغيّر العدد بعد التنفيذ
            setTimeout(sync, 0);
        });
        m.addEventListener('input', sync);
        m.addEventListener('change', () => setTimeout(sync, 0));
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && m.classList.contains('open') && !document.querySelector('.rnp-wrap:not([hidden]), #mainModal.open, #quickClientModal.open')) close(); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
    window.closeProjectModal = close;
    window.ProjectEdit = { setStatus, setType, sync, get project() { return current; } };
})();
