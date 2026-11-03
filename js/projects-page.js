// صفحة المشاريع: أرقام مختصرة، بحث وفلاتر وترتيب، بطاقات مجمّعة حسب قرب التسليم مع إنجاز «المهمة التالية» بضغطة،
// وقائمة «⋯» (تحديث للعميل، رابط التتبع، إيقاف/استئناف، تسليم، إضافة لفاتورة مفتوحة أو فاتورة جديدة، حذف)، وتقويم تسليمات بجدول أعمال اليوم.
// أنواع المشاريع ومواعيد التسليم من js/projects-ui.js، والأنماط في css/projects-page.css.
(function () {
    const ACTIVE = 'قيد التنفيذ', HOLD = 'معلق', DONE = 'مكتمل';
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const WEEK = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const WEEK_S = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => Math.round(v || 0).toLocaleString('en-US');
    const money = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : num(v));
    const mobile = () => window.matchMedia('(max-width: 767.98px)').matches;
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const daysTo = s => { const d = parse(s); return d ? Math.round((d - today()) / 864e5) : null; };
    const short = s => { const d = parse(s); return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] : ''; };
    const run = (fn, ...a) => new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...a));
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const UI = () => window.ProjectsUI || {};
    const WA = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98 1-3.63-.24-.37a9.83 9.83 0 0 1 15.24-12.13 9.76 9.76 0 0 1 2.88 6.95c0 5.42-4.41 9.83-9.79 9.83zm8.36-18.2A11.74 11.74 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.87 11.87 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41z"/></svg>';

    const store = (k, v) => { try { if (v === undefined) return localStorage.getItem('rnan.pp.' + k); localStorage.setItem('rnan.pp.' + k, v); } catch (e) { return null; } };
    let q = '', filter = 'all', order = store('sort') || 'due', mode = store('view') === 'cal' ? 'cal' : 'list';
    let calMonth = (() => { const d = today(); d.setDate(1); return d; })(), calDay = null;

    function clientOf(name) {
        const C = typeof clientsData !== 'undefined' ? clientsData : [];
        return C.find(c => c.company === name || c.name === name) || null;
    }
    // كل ما تحتاجه البطاقة عن المشروع
    function info(p, idx) {
        const steps = Array.isArray(p.steps) ? p.steps : [];
        const done = steps.filter(s => s.done).length, total = steps.length;
        const d = daysTo(p.deadline), hold = p.status === HOLD;
        const pr = total ? Math.round(done / total * 100) : Math.max(0, Math.min(100, parseInt(p.progress) || 0));
        return {
            p, idx, steps, done, total, pr, d, hold,
            next: steps.findIndex(s => !s.done),
            late: !hold && d !== null && d < 0,
            week: !hold && d !== null && d >= 0 && d <= 7,
            type: UI().typeOf ? UI().typeOf(p) : { t: 'مشروع', ic: 'folder', hue: 200 },
            phone: (clientOf(p.client) || {}).phone || ''
        };
    }
    const open = () => P().map((p, i) => info(p, i)).filter(x => x.p.status !== DONE);

    const FILTERS = [
        ['all', 'الكل', () => true],
        ['late', 'متأخرة', x => x.late],
        ['week', 'خلال أسبوع', x => x.week],
        ['hold', 'معلّقة', x => x.hold]
    ];
    const SORTS = {
        due: (a, b) => a.hold - b.hold || (a.d === null) - (b.d === null) || (a.d - b.d) || a.idx - b.idx,
        recent: (a, b) => String(b.p.startDate || '').localeCompare(String(a.p.startDate || '')) || a.idx - b.idx,
        value: (a, b) => (parseFloat(b.p.value) || 0) - (parseFloat(a.p.value) || 0) || a.idx - b.idx,
        progress: (a, b) => a.pr - b.pr || a.idx - b.idx
    };
    const GROUPS = [
        ['late', 'متأخرة عن موعدها', 'warning', x => x.late],
        ['week', 'تسليمها خلال أسبوع', 'event_upcoming', x => x.week],
        ['later', 'لاحقًا', 'event', x => !x.hold && x.d !== null && x.d > 7],
        ['none', 'بلا موعد تسليم', 'event_busy', x => !x.hold && x.d === null],
        ['hold', 'معلّقة مؤقتًا', 'pause_circle', x => x.hold]
    ];

    function dueChip(x) {
        if (x.hold) return `<span class="pp-due hold">${ic('pause_circle')} معلّق${x.p.deadline ? ' · ' + short(x.p.deadline) : ''}</span>`;
        const d = UI().due ? UI().due(x.p.deadline) : { cls: 'none', text: x.p.deadline || 'بلا موعد' };
        return `<span class="pp-due ${d.cls}" title="${esc(x.p.deadline || '')}">${ic(x.late ? 'warning' : 'event')} ${d.text}${x.p.deadline ? ' · ' + short(x.p.deadline) : ''}</span>`;
    }
    function nextRow(x) {
        if (!x.total) return `<div class="pp-next empty">${ic('checklist')}<span class="pp-next-t"><small>لا توجد مهام</small><b>أضف مهام لتتبّع الإنجاز</b></span><button type="button" class="pp-mini" data-act="open">إضافة</button></div>`;
        if (x.next < 0) return `<div class="pp-next ready">${ic('verified')}<span class="pp-next-t"><small>المهام منجزة <span class="en-num">${x.done}/${x.total}</span></small><b>جاهز للتسليم</b></span><button type="button" class="pp-mini go" data-act="deliver">${ic('task_alt')} تسليم</button></div>`;
        return `<div class="pp-next"><button type="button" class="pp-check" data-act="step" title="تمّت هذه المهمة" aria-label="تمّت المهمة: ${esc(x.steps[x.next].text)}"><i></i></button>
            <span class="pp-next-t"><small>المهمة التالية · <span class="en-num">${x.done}/${x.total}</span></small><b>${esc(x.steps[x.next].text)}</b></span></div>`;
    }
    // تصميم مرفوع وما زال متاحًا للعميل (js/proofs.js)
    function hasDesign(p) {
        const r = window.ProofsUI && p.rowIndex ? ProofsUI.forProject(p.rowIndex) : null;
        return r && r.versions && !r.filesDeleted && !(r.expiresAt && Date.parse(r.expiresAt) < Date.now()) ? r : null;
    }
    // حالة مراجعة التصميم مع العميل (js/proofs.js)
    function proofChip(p, preview) {
        const s = !preview && window.ProofsUI ? ProofsUI.state(p) : null;
        return s ? `<button type="button" class="pp-proof ${s.cls}${s.fresh ? ' fresh' : ''}${s.stale ? ' stale' : ''}" data-act="proof" title="مراجعة التصميم">${ic(s.ic)} ${esc(s.text)}</button>` : '';
    }
    function card(x, preview) {
        const p = x.p, t = x.type;
        const val = parseFloat(p.value) || 0;
        return `<article class="pp-card${x.late ? ' late' : ''}${x.hold ? ' hold' : ''}${preview ? ' preview' : ''}" data-i="${x.idx}" style="--hue:${t.hue}">
            <header class="pp-top">
                <span class="pp-type" title="${esc(t.t)}">${ic(t.ic)}</span>
                <button type="button" class="pp-title" data-act="open"><b>${esc(p.name || 'اسم المشروع')}</b><small>${esc(p.client || 'العميل')}${p.code ? ` · <span class="en-num" dir="ltr">${esc(p.code)}</span>` : ''}</small></button>
                ${preview ? '' : `<button type="button" class="pp-ib" data-act="more" title="المزيد" aria-label="المزيد">${ic('more_horiz')}</button>`}
            </header>
            <div class="pp-tags">${dueChip(x)}${proofChip(p, preview)}<span class="pp-kind">${esc(t.t)}</span></div>
            <div class="pp-prog"><span class="pp-bar"><i style="width:${x.pr}%"></i></span><b class="en-num">${x.pr}%</b></div>
            ${nextRow(x)}
            <footer class="pp-foot">
                <span class="pp-val">${val ? money(val) : '<i>بلا قيمة</i>'}</span>
                ${preview ? '' : `<span class="pp-acts">
                    ${x.phone ? `<button type="button" class="pp-ib wa" data-act="wa" title="إرسال تحديث للعميل" aria-label="إرسال تحديث للعميل">${WA}</button>` : ''}
                    ${p.code ? `<button type="button" class="pp-ib" data-act="track" title="نسخ رابط التتبع" aria-label="نسخ رابط التتبع">${ic('qr_code_2')}</button>` : ''}
                    ${hasDesign(p) ? `<button type="button" class="pp-ib design" data-act="design" title="نسخ رابط التصميم للعميل" aria-label="نسخ رابط التصميم">${ic('palette')}</button>` : ''}
                </span>`}
            </footer>
        </article>`;
    }

    function stats(all) {
        const set = (id, v, html) => { const el = document.getElementById(id); if (el) el[html ? 'innerHTML' : 'textContent'] = v; };
        const late = all.filter(x => x.late).length;
        set('pp-stat-late', late);
        set('pp-stat-week', all.filter(x => x.week).length);
        set('pp-stat-value', money(all.reduce((s, x) => s + (parseFloat(x.p.value) || 0), 0)), true);
        set('stat-proj-active', all.filter(x => x.p.status === ACTIVE).length);
        set('stat-proj-completed', P().filter(p => p.status === DONE).length);
        const lateBox = document.querySelector('#projects-page .pp-stats .late');
        if (lateBox) lateBox.classList.toggle('on', late > 0);
        const sub = document.getElementById('pp-sub');
        if (sub) {
            const n = all.length;
            sub.textContent = !n ? 'لا توجد مشاريع جارية الآن'
                : (n === 1 ? 'مشروع واحد جارٍ' : n === 2 ? 'مشروعان جاريان' : n + (n <= 10 ? ' مشاريع جارية' : ' مشروعًا جاريًا'))
                + (late ? ` · ${late === 1 ? 'واحد متأخر' : late + ' متأخرة'}` : ' · كلها في موعدها');
        }
    }

    function render() {
        const grid = document.getElementById('projects-grid');
        if (!grid) return;
        const all = open();
        stats(all);
        document.querySelectorAll('#projects-page .pp-chips [data-f]').forEach(b => {
            const f = FILTERS.find(x => x[0] === b.dataset.f);
            b.classList.toggle('on', b.dataset.f === filter);
            const n = b.querySelector('em'), c = f ? all.filter(f[2]).length : 0;
            if (n) n.textContent = c;
            b.classList.toggle('warn', b.dataset.f === 'late' && c > 0);
        });
        const sel = document.getElementById('project-sort');
        if (sel && sel.value !== order) sel.value = order;
        syncView();
        if (mode === 'cal') calendar();
        const t = q.trim().toLowerCase();
        const list = all.filter(FILTERS.find(x => x[0] === filter)[2])
            .filter(x => !t || [x.p.name, x.p.client, x.p.code, x.type.t].some(v => String(v || '').toLowerCase().includes(t)))
            .sort(SORTS[order] || SORTS.due);
        if (!all.length) {
            grid.innerHTML = `<div class="pp-empty">${ic('rocket_launch')}<b>لا توجد مشاريع جارية</b><p>ابدأ مشروعك القادم، وتابع مهامه وموعد تسليمه من هنا.</p><button type="button" class="pp-btn main admin-only" onclick="openProjectModal('new')">${ic('add')} مشروع جديد</button></div>`;
            return;
        }
        if (!list.length) {
            grid.innerHTML = `<div class="pp-empty">${ic('search_off')}<b>لا نتائج مطابقة</b><p>جرّب كلمة أخرى، أو اختر «الكل».</p></div>`;
            return;
        }
        // على الجوال (عمود واحد) يُقسَّم الترتيب حسب الموعد إلى مجموعات بعناوين؛ الشاشات الكبيرة شبكة متصلة بلا فراغات
        if (order === 'due' && filter === 'all' && mobile()) {
            grid.innerHTML = GROUPS.map(([k, title, icon, test]) => {
                const g = list.filter(test);
                if (!g.length) return '';
                return `<section class="pp-group ${k}"><h3>${ic(icon)} ${title} <em class="en-num">${g.length}</em></h3><div class="pp-cards">${g.map(x => card(x)).join('')}</div></section>`;
            }).join('');
        } else {
            grid.innerHTML = `<div class="pp-cards">${list.map(x => card(x)).join('')}</div>`;
        }
    }

    // ── التقويم ──
    function syncView() {
        const g = document.getElementById('view-grid'), c = document.getElementById('view-calendar');
        if (g) g.classList.toggle('hidden', mode === 'cal');
        if (c) c.classList.toggle('hidden', mode !== 'cal');
        document.querySelectorAll('#projects-page .pp-views [data-view]').forEach(b => { b.classList.toggle('on', b.dataset.view === mode); b.setAttribute('aria-selected', b.dataset.view === mode); });
        const chips = document.querySelector('#projects-page .pp-chips'), sort = document.querySelector('#projects-page .pp-sort');
        if (chips) chips.classList.toggle('off', mode === 'cal');
        if (sort) sort.classList.toggle('off', mode === 'cal');
    }
    function calendar() {
        const box = document.getElementById('pp-cal');
        if (!box) return;
        const y = calMonth.getFullYear(), m = calMonth.getMonth();
        const first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
        const t = ymd(today()), all = open();
        const t2 = q.trim().toLowerCase();
        const items = all.filter(x => x.p.deadline && (!t2 || [x.p.name, x.p.client, x.p.code].some(v => String(v || '').toLowerCase().includes(t2))));
        const on = ds => items.filter(x => x.p.deadline === ds);
        let cells = '';
        for (let i = 0; i < first; i++) cells += '<span class="pp-day out"></span>';
        for (let d = 1; d <= dim; d++) {
            const ds = y + '-' + pad(m + 1) + '-' + pad(d), list = on(ds);
            const cls = ['pp-day', ds === t ? 'today' : '', ds === calDay ? 'sel' : '', list.length ? 'has' : '', list.some(x => x.late) ? 'late' : ''].filter(Boolean).join(' ');
            cells += `<button type="button" class="${cls}" data-day="${ds}" aria-label="${d} ${MONTHS[m]}${list.length ? '، ' + list.length + ' تسليم' : ''}">
                <span class="n en-num">${d}</span>
                <span class="evs">${list.slice(0, 2).map(x => `<i class="${x.late ? 'late' : x.hold ? 'hold' : ''}" style="--hue:${x.type.hue}">${esc(x.p.name)}</i>`).join('')}${list.length > 2 ? `<i class="more">+${list.length - 2}</i>` : ''}</span>
                <span class="dots">${list.slice(0, 3).map(x => `<i class="${x.late ? 'late' : x.hold ? 'hold' : ''}"></i>`).join('')}</span>
            </button>`;
        }
        const monthKey = y + '-' + pad(m + 1);
        const agenda = (calDay ? on(calDay) : items.filter(x => x.p.deadline.startsWith(monthKey))).sort(SORTS.due);
        const noDate = all.filter(x => !x.p.deadline).length;
        const dd = parse(calDay);
        box.innerHTML = `<div class="pp-cal">
                <header class="pp-cal-head">
                    <button type="button" class="pp-ib" data-cal="-1" aria-label="الشهر السابق">${ic('chevron_right')}</button>
                    <b>${MONTHS[m]} <span class="en-num">${y}</span></b>
                    <button type="button" class="pp-ib" data-cal="1" aria-label="الشهر التالي">${ic('chevron_left')}</button>
                    <button type="button" class="pp-mini" data-cal="0">اليوم</button>
                </header>
                <div class="pp-wk">${WEEK.map((w, n) => `<span><b>${w}</b><i>${WEEK_S[n]}</i></span>`).join('')}</div>
                <div class="pp-days">${cells}</div>
            </div>
            <div class="pp-agenda">
                <header><h3>${dd ? WEEK[dd.getDay()] + ' ' + dd.getDate() + ' ' + MONTHS[dd.getMonth()] : 'تسليمات ' + MONTHS[m]} <em class="en-num">${agenda.length}</em></h3>
                ${calDay ? `<button type="button" class="pp-mini" data-cal="all">كل الشهر</button>` : ''}</header>
                ${agenda.length ? agenda.map(x => `<button type="button" class="pp-ag" data-i="${x.idx}" style="--hue:${x.type.hue}">
                    <span class="pp-ag-d"><b class="en-num">${parse(x.p.deadline).getDate()}</b><small>${MONTHS[parse(x.p.deadline).getMonth()]}</small></span>
                    <span class="pp-ag-t"><b>${esc(x.p.name)}</b><small>${esc(x.p.client)} · <span class="en-num">${x.pr}%</span></small></span>
                    ${dueChip(x)}
                </button>`).join('') : `<p class="pp-ag-empty">${ic('event_available')} ${calDay ? 'لا تسليمات في هذا اليوم' : 'لا تسليمات في هذا الشهر'}</p>`}
                ${noDate ? `<p class="pp-ag-note">${ic('info')} ${noDate === 1 ? 'مشروع واحد' : noDate + ' مشاريع'} بلا موعد تسليم لا تظهر في التقويم</p>` : ''}
            </div>`;
    }
    function month(delta) {
        if (delta === 0) { calMonth = today(); calMonth.setDate(1); calDay = ymd(today()); }
        else { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + delta, 1); calDay = null; }
        calendar();
    }
    function view(v) {
        mode = v === 'cal' ? 'cal' : 'list';
        store('view', mode);
        syncView();
        if (mode === 'cal') calendar();
    }

    // ── الحفظ من البطاقة (فوري في الشاشة، ثم إلى القاعدة) ──
    function payload(p, patch) {
        return Object.assign({
            rowIndex: p.rowIndex, code: p.code, name: p.name, client: p.client, value: p.value, progress: p.progress,
            deadline: p.deadline, startDate: p.startDate, status: p.status, steps: p.steps || [], notes: p.notes || '', quotation: p.quotation || null
        }, patch);
    }
    function save(p, patch, ok) {
        const before = { steps: p.steps, progress: p.progress, status: p.status };
        Object.assign(p, patch);
        render();
        if (window.ProjectsUI && ProjectsUI.active) ProjectsUI.active(P());
        return run('saveProjectToSheet', payload(p, patch)).then(() => {
            if (ok) toast(ok.msg, ok.action);
            if (typeof loadAllData === 'function') loadAllData();
        }).catch(e => {
            Object.assign(p, before);
            render();
            toast('تعذّر الحفظ: ' + ((e && e.message) || e || 'تحقّق من الاتصال'));
        });
    }
    function step(i) {
        const p = P()[i];
        if (!p) return;
        const steps = (p.steps || []).map(s => ({ text: s.text, done: !!s.done }));
        const n = steps.findIndex(s => !s.done);
        if (n < 0) return;
        steps[n].done = true;
        const progress = Math.round(steps.filter(s => s.done).length / steps.length * 100);
        const prev = { steps: p.steps, progress: p.progress };
        save(p, { steps, progress }, {
            msg: `✓ أُنجزت «${steps[n].text}»` + (progress === 100 ? ' — المشروع جاهز للتسليم' : ''),
            action: ['تراجع', () => save(p, prev, { msg: 'أُعيدت المهمة' })]
        });
    }
    function deliver(i) {
        const p = P()[i];
        if (!p) return;
        const steps = (p.steps || []).map(s => ({ text: s.text, done: true }));
        const x = info(p, i);
        save(p, { steps, progress: 100, status: DONE }, {
            msg: `🎉 سُلّم «${p.name}» ونُقل إلى الأرشيف`,
            action: x.phone ? ['اطلب تقييم العميل', () => window.open(waUrl(p, 'rating'), '_blank', 'noopener')] : null
        });
    }
    function hold(i) {
        const p = P()[i];
        if (!p) return;
        const to = p.status === HOLD ? ACTIVE : HOLD;
        save(p, { status: to }, { msg: to === HOLD ? `⏸ أُوقف «${p.name}» مؤقتًا` : `▶ استُؤنف العمل على «${p.name}»` });
    }
    function invoice(i) {
        const p = P()[i];
        if (!p) return;
        const val = parseFloat(p.value) || 0, d = ymd(today());
        const items = [{ desc: 'مشروع: ' + p.name, qty: 1, price: val }];
        const footerText = typeof DEFAULT_BANK_INFO !== 'undefined' ? DEFAULT_BANK_INFO : '';
        run('saveInvoiceToSheet', { invoiceNumber: 'تلقائي', clientSelect: p.client, issueDate: d, status: 'قيد الانتظار', totalAmount: val, items, notes: '', footerText })
            .then(res => {
                if (typeof loadAllData === 'function') loadAllData();
                if (typeof printInvoiceDirectly === 'function') printInvoiceDirectly({ number: res && res.id, client: p.client, date: d, amount: val, items, notes: '', footerText, status: 'قيد الانتظار' });
            })
            .catch(e => toast('تعذّر إصدار الفاتورة: ' + ((e && e.message) || e)));
    }
    // قيمة المشروع بندًا في فاتورة مفتوحة للعميل (js/project-invoice.js)
    function addInv(i, number) {
        const p = P()[i];
        const inv = p && window.ProjectInvoice && ProjectInvoice.open(p.client).find(v => String(v.number) === String(number));
        if (!inv) return toast('لم تعد هذه الفاتورة مفتوحة');
        ProjectInvoice.add(inv, { rowIndex: p.rowIndex, name: p.name, value: p.value, saved: p.value })
            .then(r => {
                toast(`أُضيف «${p.name}» للفاتورة ${r.number} — إجماليها الآن ${num(r.total)} ر.س`);
                if (typeof loadAllData === 'function') loadAllData();
            })
            .catch(e => toast('تعذّرت الإضافة: ' + ((e && e.message) || e)));
    }
    function remove(i) {
        const p = P()[i];
        if (!p) return;
        run('deleteProjectFromSheet', p.rowIndex).then(() => {
            toast(`حُذف مشروع «${p.name}»`);
            if (typeof loadAllData === 'function') loadAllData();
        }).catch(e => toast('تعذّر الحذف: ' + ((e && e.message) || e)));
    }
    function trackUrl(p) { return window.RNAN && RNAN.trackUrl ? RNAN.trackUrl(p.code) : ''; }
    function copyTrack(i) {
        const p = P()[i];
        if (!p || !p.code) return;
        const url = trackUrl(p);
        if (typeof copyText === 'function') copyText(url, null);
        else if (navigator.clipboard) navigator.clipboard.writeText(url);
        toast('نُسخ رابط تتبّع ' + p.code);
    }
    // رسائل واتساب للعميل: تحديث الإنجاز، أو طلب التقييم بعد التسليم
    function waUrl(p, kind) {
        const c = clientOf(p.client) || {};
        const x = info(p, -1);
        const portal = c.token && window.RNAN ? RNAN.portalUrl(c.token) : '';
        let text;
        if (kind === 'rating') {
            text = `نشكركم لاختياركم رنان لخدمات التصميم، ويسعدنا إبلاغكم بأنه تم تسليم مشروع «${p.name}» بنجاح.\n\nنأمل منكم التكرم بتقييم العمل وإضافة ملاحظاتكم من صفحتكم الخاصة:\n${portal || trackUrl(p)}\n\nرأيكم يهمنا،\nرنان لخدمات التصميم`;
        } else {
            const stage = x.next >= 0 ? x.steps[x.next].text : (x.total ? 'جاهز للتسليم' : '');
            const design = hasDesign(p);
            text = `مرحبًا 👋\nتحديث مشروعكم «${p.name}»\n\nنسبة الإنجاز: ${x.pr}%`
                + (stage ? `\nالمرحلة الحالية: ${stage}` : '')
                + (p.deadline ? `\nموعد التسليم: ${short(p.deadline)}` : '')
                + (design && !design.approval ? `\n\nالتصميم جاهز لمراجعتكم، شاهدوه واكتبوا ملاحظاتكم:\n${ProofsUI.link(design.token)}` : '')
                + (p.code ? `\n\nتابعوا سير العمل مباشرة:\n${trackUrl(p)}` : portal ? `\n\nصفحتكم الخاصة:\n${portal}` : '')
                + `\n\nرنان لخدمات التصميم`;
        }
        return window.RNAN && RNAN.waLink ? RNAN.waLink(c.phone, text) : 'https://wa.me/?text=' + encodeURIComponent(text);
    }

    // ── إشعار صغير مع إجراء (تراجع / طلب تقييم) ──
    let tEl = null, tTimer = 0;
    function toast(msg, action) {
        if (!tEl) {
            tEl = document.createElement('div');
            tEl.className = 'pp-toast no-print';
            tEl.setAttribute('role', 'status');
            document.body.appendChild(tEl);
            tEl.addEventListener('click', e => {
                const b = e.target.closest('button');
                if (!b || !tEl._fn) return;
                const fn = tEl._fn;
                tEl._fn = null;
                tEl.classList.remove('show');
                fn();
            });
        }
        tEl.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action[0])}</button>` : ''}`;
        tEl._fn = action ? action[1] : null;
        tEl.classList.add('show');
        clearTimeout(tTimer);
        tTimer = setTimeout(() => { tEl.classList.remove('show'); tEl._fn = null; }, action ? 7000 : 4000);
    }

    // ── قائمة «⋯» (أنماط cl-menu من css/clients.css) ──
    let menu = null;
    function closeMenu() {
        if (!menu) return;
        const m = menu;
        menu = null;
        m.classList.remove('open');
        setTimeout(() => m.remove(), 250);
    }
    function openMenu(btn, i) {
        closeMenu();
        const p = P()[i];
        if (!p) return;
        const x = info(p, i), sheet = mobile(), val = parseFloat(p.value) || 0;
        const PI = window.ProjectInvoice, openInv = val && PI ? PI.open(p.client).filter(v => !PI.has(v, p.name)).slice(0, 2) : [];
        const m = document.createElement('div');
        m.className = 'cl-menu-wrap pp-menu no-print' + (sheet ? ' sheet' : '');
        m.innerHTML = `<div class="cl-scrim" data-x></div><div class="cl-menu" role="menu">
            ${sheet ? `<div class="cl-grab"></div><p class="cl-menu-t">${esc(p.name)}</p>` : ''}
            <button type="button" role="menuitem" data-do="open">${ic('edit_square')} فتح المشروع وتعديله</button>
            <button type="button" role="menuitem" data-do="proof">${ic('preview')} ${window.ProofsUI && ProofsUI.forProject(p.rowIndex) ? 'مراجعة التصميم مع العميل' : 'رفع التصميم للعميل'}</button>
            ${x.phone ? `<button type="button" role="menuitem" data-do="wa">${ic('chat')} إرسال تحديث للعميل</button>` : ''}
            ${hasDesign(p) ? `<button type="button" role="menuitem" data-do="design">${ic('palette')} نسخ رابط التصميم</button>` : ''}
            ${p.code ? `<button type="button" role="menuitem" data-do="track">${ic('qr_code_2')} نسخ رابط التتبع</button>` : ''}
            <button type="button" role="menuitem" data-do="hold">${x.hold ? ic('play_circle') + ' استئناف العمل' : ic('pause_circle') + ' إيقاف مؤقت'}</button>
            <button type="button" role="menuitem" data-do="deliver">${ic('task_alt')} تم التسليم</button>
            ${openInv.map(v => `<button type="button" role="menuitem" data-do="addinv" data-inv="${esc(v.number)}">${ic('playlist_add')} إضافة للفاتورة <span class="en-num" dir="ltr">${esc(v.number)}</span></button>`).join('')}
            ${val ? `<button type="button" role="menuitem" data-do="invoice">${ic('receipt_long')} ${openInv.length ? 'إصدار فاتورة منفصلة' : 'إصدار فاتورة'}</button>` : ''}
            <button type="button" role="menuitem" class="danger" data-do="delete">${ic('delete')} حذف المشروع</button>
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
        const SURE = {
            deliver: `${ic('task_alt')} اضغط مجددًا لتأكيد التسليم`,
            invoice: `${ic('receipt_long')} اضغط مجددًا لإصدار فاتورة بـ <span class="en-num">${num(val)}</span> ر.س`,
            addinv: b => `${ic('playlist_add')} اضغط مجددًا لإضافة <span class="en-num">${num(val)}</span> ر.س للفاتورة <span class="en-num" dir="ltr">${esc(b.dataset.inv)}</span>`,
            delete: `${ic('warning')} اضغط مجددًا للتأكيد — حذف نهائي`
        };
        m.addEventListener('click', e => {
            if (e.target.closest('[data-x]')) return closeMenu();
            const b = e.target.closest('[data-do]');
            if (!b) return;
            const act = b.dataset.do;
            if (SURE[act] && !b.classList.contains('sure')) {
                b.classList.add('sure');
                b.innerHTML = typeof SURE[act] === 'function' ? SURE[act](b) : SURE[act];
                return;
            }
            closeMenu();
            act_(act, i, b.dataset.inv);
        });
    }
    function act_(act, i, inv) {
        const p = P()[i];
        if (!p) return;
        if (act === 'open') return window.openProjectModal('edit', i);
        if (act === 'proof') return window.openProjectModal('edit', i, { focus: 'proof' });
        if (act === 'wa') return window.open(waUrl(p, 'update'), '_blank', 'noopener');
        if (act === 'track') return copyTrack(i);
        if (act === 'design') { const r = hasDesign(p); return r && ProofsUI.copy(r.token); }
        if (act === 'step') return step(i);
        if (act === 'deliver') return deliver(i);
        if (act === 'hold') return hold(i);
        if (act === 'invoice') return invoice(i);
        if (act === 'addinv') return addInv(i, inv);
        if (act === 'delete') return remove(i);
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    const mq = window.matchMedia('(max-width: 767.98px)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(() => render());
    window.addEventListener('resize', () => { if (menu && !menu.classList.contains('sheet')) closeMenu(); });
    document.addEventListener('scroll', () => { if (menu && !menu.classList.contains('sheet')) closeMenu(); }, true);

    document.addEventListener('click', e => {
        const page = e.target.closest('#projects-page');
        if (!page) return;
        const chip = e.target.closest('.pp-chips [data-f]');
        if (chip) { filter = chip.dataset.f; return render(); }
        const v = e.target.closest('.pp-views [data-view]');
        if (v) return view(v.dataset.view);
        const c = e.target.closest('[data-cal]');
        if (c) {
            if (c.dataset.cal === 'all') { calDay = null; return calendar(); }
            return month(+c.dataset.cal);
        }
        const day = e.target.closest('.pp-day[data-day]');
        if (day) { calDay = calDay === day.dataset.day ? null : day.dataset.day; return calendar(); }
        const ag = e.target.closest('.pp-ag[data-i]');
        if (ag) return window.openProjectModal('edit', +ag.dataset.i);
        const b = e.target.closest('.pp-card:not(.preview) [data-act]');
        if (b) {
            const i = +b.closest('.pp-card').dataset.i;
            if (b.dataset.act === 'more') return openMenu(b, i);
            if (b.dataset.act === 'deliver' && !b.classList.contains('sure')) {
                b.classList.add('sure');
                b.innerHTML = `${ic('task_alt')} تأكيد؟`;
                setTimeout(() => { if (b.isConnected && b.classList.contains('sure')) { b.classList.remove('sure'); b.innerHTML = `${ic('task_alt')} تسليم`; } }, 4000);
                return;
            }
            // علامة الإنجاز تظهر لحظة قبل أن تنتقل البطاقة للمهمة التالية
            if (b.dataset.act === 'step') {
                const row = b.closest('.pp-next');
                if (row.classList.contains('ticking')) return;
                row.classList.add('ticking');
                return setTimeout(() => act_('step', i), 280);
            }
            return act_(b.dataset.act, i);
        }
    });

    window.ProjectsPage = {
        render, calendar, month, view, toast,
        card: (p, preview) => card(info(p, -1), preview),
        search: v => { q = v || ''; render(); },
        sort: v => { order = SORTS[v] ? v : 'due'; store('sort', order); render(); }
    };
})();
