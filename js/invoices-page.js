// صفحة الفواتير: لوحة التحصيل (المستحق موزّعًا على المهلة، المحصّل هذا الشهر، متوسط مدة السداد، نسبة التحصيل)،
// «يحتاج انتباهك» بتذكير واتساب متدرّج النبرة، شريط أدوات (الحالة، البحث، العميل، الفترة، الترتيب)، قائمة مجمّعة بالشهر،
// ولوحة تفاصيل لكل فاتورة: البنود، السجل (إصدار، إرسال، تذكير، سداد)، السداد، الإرسال، نسخة جديدة، الإلغاء، الحذف، وكشف حساب العميل.
// تقرأ invoicesData و clientsData و projectsData. الحقول الإضافية في invoices/<id>: dueDate, sentAt, remindedAt, reminders, paidAt, payMethod, voidedAt.
// الأنماط في css/invoices-page.css.
(function () {
    const PAID = 'مدفوعة', PENDING = 'قيد الانتظار', VOID = ['ملغاة', 'ملغي'];
    const GRACE = 15; // مهلة الفواتير القديمة التي بلا تاريخ استحقاق (كما في صفحة المالية)
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => Math.round(v || 0).toLocaleString('en-US');
    const num2 = v => (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const money = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : num2(v));
    const moneyText = v => `<span class="en-num">${num(v)}</span> ر.س`;
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const dayOf = iso => { if (!iso) return null; const d = new Date(iso); if (isNaN(d)) return null; d.setHours(0, 0, 0, 0); return d; };
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const diff = (a, b) => Math.round((a - b) / 864e5);
    const plural = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : n + (n <= 10 ? ' ' + few : ' ' + many);
    const days = n => plural(n, 'يوم واحد', 'يومين', 'أيام', 'يومًا');
    const invN = n => plural(n, 'فاتورة واحدة', 'فاتورتان', 'فواتير', 'فاتورة');
    const fmt = d => d ? `<span class="en-num">${d.getDate()}</span> ${MONTHS[d.getMonth()]} <span class="en-num">${d.getFullYear()}</span>` : '—';
    const fmtPlain = d => d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '';
    const ago = iso => { const d = dayOf(iso); if (!d) return ''; const n = diff(today(), d); return n <= 0 ? 'اليوم' : n === 1 ? 'أمس' : 'قبل ' + days(n); };
    const I = () => (typeof invoicesData !== 'undefined' ? invoicesData : []);
    const C = () => (typeof clientsData !== 'undefined' ? clientsData : []);
    const amt = i => parseFloat(i.amount) || 0;
    const sum = a => a.reduce((s, i) => s + amt(i), 0);
    const isVoid = i => VOID.includes(i.status);
    const isPaid = i => i.status === PAID;
    const isOpen = i => !isPaid(i) && !isVoid(i);
    const isAdmin = () => typeof currentUserRole === 'undefined' || currentUserRole === 'admin';
    const byNum = n => I().find(i => String(i.number) === String(n));
    const idxOf = i => I().indexOf(i);
    const clientOf = name => C().find(c => c.company === name || c.name === name);
    const hue = s => { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
    const av = (name, cls) => `<span class="iv-av${cls ? ' ' + cls : ''}" style="--h:${hue(name)}">${esc((String(name || '?').trim() || '?').charAt(0))}</span>`;
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    const WA = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98 1-3.63-.24-.37a9.83 9.83 0 0 1 15.24-12.13 9.76 9.76 0 0 1 2.88 6.95c0 5.42-4.41 9.83-9.79 9.83zm8.36-18.2A11.74 11.74 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.87 11.87 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41z"/></svg>';

    // ── الاستحقاق والحالة ──
    const dueOf = i => parse(i.dueDate) || (parse(i.date) ? addDays(parse(i.date), GRACE) : null);
    const lateBy = i => { const d = dueOf(i); return d ? diff(today(), d) : 0; }; // موجب = متأخرة
    function state(i) {
        if (isVoid(i)) return 'void';
        if (isPaid(i)) return 'paid';
        const l = lateBy(i);
        return l > 0 ? 'late' : l >= -3 ? 'soon' : 'open';
    }
    const ST_NAME = { late: 'متأخرة', soon: 'تستحق قريبًا', open: 'بانتظار السداد', paid: 'مدفوعة', void: 'ملغاة' };
    const ST_IC = { late: 'running_with_errors', soon: 'hourglass_top', open: 'schedule', paid: 'task_alt', void: 'block' };
    const paidDay = i => dayOf(i.paidAt) || (isPaid(i) ? parse(i.date) : null);
    const paidIn = i => { const p = dayOf(i.paidAt), d = parse(i.date); return p && d ? Math.max(0, diff(p, d)) : null; };
    function dueLabel(i) {
        const s = state(i);
        if (s === 'void') return 'ملغاة';
        if (s === 'paid') { const n = paidIn(i); return n === null ? 'مدفوعة' : n === 0 ? 'سُدّدت في يومها' : 'سُدّدت بعد ' + days(n); }
        if (!parse(i.dueDate)) { const age = diff(today(), parse(i.date) || today()); return age > GRACE ? 'متأخرة · منذ ' + days(age) : age <= 0 ? 'صدرت اليوم' : 'منذ ' + days(age); }
        const l = lateBy(i);
        return l > 0 ? 'متأخرة ' + days(l) : l === 0 ? 'تستحق اليوم' : 'تستحق بعد ' + days(-l);
    }
    const chip = i => { const s = state(i); return `<span class="iv-chip ${s}">${ic(ST_IC[s])}${esc(dueLabel(i))}</span>`; };
    const items = i => (i.items || []).filter(x => (parseFloat(x.qty) || 0) * (parseFloat(x.price) || 0) >= 0);
    const what = i => { const it = items(i); return it.length ? esc(it[0].desc || 'بند') + (it.length > 1 ? ` <em class="en-num" dir="ltr">+${it.length - 1}</em>` : '') : '<span class="iv-mute">بدون بنود</span>'; };

    // ── حالة الواجهة ──
    const S = { tab: 'all', q: '', client: '', period: 'all', sort: 'new', limit: 40 };
    let openNum = null, built = false, recN = null, recAt = 0;
    const inMonthD = (d, y, m) => d && d.getFullYear() === y && d.getMonth() === m;
    function inPeriod(i) {
        if (S.period === 'all') return true;
        const d = parse(i.date); if (!d) return false;
        const t = today(), y = t.getFullYear(), m = t.getMonth();
        if (S.period === 'month') return inMonthD(d, y, m);
        if (S.period === 'last') { const p = new Date(y, m - 1, 1); return inMonthD(d, p.getFullYear(), p.getMonth()); }
        if (S.period === 'q') return d >= new Date(y, m - 2, 1);
        if (S.period === 'year') return d.getFullYear() === y;
        if (S.period === 'lastyear') return d.getFullYear() === y - 1;
        return true;
    }
    function base() {
        const q = S.q.trim().toLowerCase(), qn = parseFloat(q.replace(/[,،\s]/g, ''));
        return I().filter(i => {
            if (S.client && (i.client || '').trim() !== S.client) return false;
            if (!inPeriod(i)) return false;
            if (!q) return true;
            const hay = [i.number, i.client, i.notes, ...(i.items || []).map(x => x.desc)].join(' ').toLowerCase();
            return hay.includes(q) || (!isNaN(qn) && /^[\d.,،\s]+$/.test(q) && Math.abs(amt(i) - qn) < 0.01);
        });
    }
    const tabOk = (i, t) => t === 'all' || (t === 'open' ? isOpen(i) : t === 'late' ? state(i) === 'late' : t === 'paid' ? isPaid(i) : isVoid(i));
    function sorted(list) {
        const dt = i => (parse(i.date) || new Date(0)).getTime();
        const a = list.slice();
        if (S.sort === 'old') a.sort((x, y) => dt(x) - dt(y));
        else if (S.sort === 'high') a.sort((x, y) => amt(y) - amt(x));
        else if (S.sort === 'due') a.sort((x, y) => (isOpen(y) - isOpen(x)) || (isOpen(x) ? (dueOf(x) || 0) - (dueOf(y) || 0) : dt(y) - dt(x)));
        else a.sort((x, y) => dt(y) - dt(x));
        return a;
    }

    // ── الهيكل (يُبنى مرة واحدة حتى لا يفقد حقل البحث تركيزه) ──
    function build() {
        const root = document.getElementById('iv-root');
        if (!root) return false;
        root.innerHTML = `
            <header class="iv-head">
                <div><h1>الفواتير</h1><p id="iv-sub">إصدار الفواتير ومتابعة تحصيلها</p></div>
                <div class="iv-head-acts">
                    <button type="button" class="iv-btn ghost admin-only" data-iv="recurring">${ic('event_repeat')}<span>المتكررة</span><em class="en-num" id="iv-rec-n" hidden></em></button>
                    <button type="button" class="iv-btn ghost" data-iv="export">${ic('download')}<span>تصدير</span></button>
                    <button type="button" class="iv-btn main admin-only" data-iv="new">${ic('add')}<span>فاتورة جديدة</span></button>
                </div>
            </header>
            <section class="iv-hero" id="iv-hero"></section>
            <section class="iv-focus" id="iv-focus" hidden></section>
            <section class="iv-box">
                <div class="iv-tabs" role="tablist" aria-label="حالة الفاتورة" id="iv-tabs"></div>
                <div class="iv-tools">
                    <label class="iv-search">${ic('search')}<input type="search" id="iv-q" placeholder="ابحث برقم الفاتورة أو العميل أو البند أو المبلغ" autocomplete="off" enterkeyhint="search"></label>
                    <select id="iv-client" aria-label="العميل"><option value="">كل العملاء</option></select>
                    <select id="iv-period" aria-label="الفترة">
                        <option value="all">كل الفترات</option><option value="month">هذا الشهر</option><option value="last">الشهر الماضي</option>
                        <option value="q">آخر 3 أشهر</option><option value="year">هذه السنة</option><option value="lastyear">السنة الماضية</option>
                    </select>
                    <select id="iv-sort" aria-label="الترتيب">
                        <option value="new">الأحدث أولًا</option><option value="old">الأقدم أولًا</option><option value="high">الأعلى قيمة</option><option value="due">الأقرب استحقاقًا</option>
                    </select>
                </div>
                <div class="iv-cols" aria-hidden="true"><span>العميل</span><span>البيان</span><span>الإصدار</span><span>الاستحقاق</span><span>المبلغ</span><span></span></div>
                <div id="iv-list" class="iv-list"></div>
            </section>`;
        let t = null;
        root.querySelector('#iv-q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { S.q = e.target.value; S.limit = 40; list(); tabs(); }, 140); });
        root.addEventListener('change', e => {
            const id = e.target.id;
            if (id === 'iv-client') S.client = e.target.value;
            else if (id === 'iv-period') S.period = e.target.value;
            else if (id === 'iv-sort') S.sort = e.target.value;
            else return;
            S.limit = 40;
            tabs(); list();
        });
        return true;
    }

    function sub() {
        const el = document.getElementById('iv-sub');
        if (!el) return;
        const open = I().filter(isOpen), n = open.filter(i => state(i) === 'late').length;
        const late = n === 1 ? 'واحدة متأخرة' : n === 2 ? 'اثنتان متأخرتان' : n + ' متأخرة';
        el.innerHTML = !I().length ? 'أصدر فاتورتك الأولى وتابع تحصيلها من هنا'
            : !open.length ? 'كل فواتيرك محصّلة — لا مستحقات معلّقة 👏'
            : `${invN(open.length)} بانتظار السداد بقيمة <b>${moneyText(sum(open))}</b>${n ? ` · <span class="late">${late}</span>` : ''}`;
    }

    // ── لوحة التحصيل ──
    function hero() {
        const el = document.getElementById('iv-hero');
        if (!el) return;
        const open = I().filter(isOpen), late = open.filter(i => state(i) === 'late'), soon = open.filter(i => state(i) === 'soon');
        const tot = sum(open), lateS = sum(late), soonS = sum(soon), okS = Math.max(0, tot - lateS - soonS);
        const who = new Set(open.map(i => i.client)).size;
        const t = today(), y = t.getFullYear(), m = t.getMonth(), pm = new Date(y, m - 1, 1);
        const paidIn_ = (yy, mm) => I().filter(i => isPaid(i) && inMonthD(paidDay(i), yy, mm)).reduce((s, i) => s + amt(i), 0);
        const cur = paidIn_(y, m), prev = paidIn_(pm.getFullYear(), pm.getMonth());
        const delta = prev ? Math.round((cur - prev) / prev * 100) : null;
        const yearAgo = addDays(t, -365);
        const timed = I().filter(i => isPaid(i) && paidIn(i) !== null && dayOf(i.paidAt) >= yearAgo);
        const avg = timed.length ? Math.round(timed.reduce((s, i) => s + paidIn(i), 0) / timed.length) : null;
        const fast = (() => { const by = {}; timed.forEach(i => { (by[i.client] = by[i.client] || []).push(paidIn(i)); }); const r = Object.entries(by).map(([c, a]) => [c, a.reduce((s, x) => s + x, 0) / a.length]).sort((a, b) => a[1] - b[1]); return r.length > 1 ? r[0] : null; })();
        const since = addDays(t, -90), recent = I().filter(i => !isVoid(i) && parse(i.date) && parse(i.date) >= since);
        const rate = sum(recent) ? Math.round(sum(recent.filter(isPaid)) / sum(recent) * 100) : null;
        const w = v => (tot ? Math.max(v ? 2 : 0, v / tot * 100) : 0).toFixed(2) + '%';
        el.innerHTML = `
            <div class="iv-hero-main${tot ? '' : ' calm'}">
                <small>${ic('account_balance_wallet')} بانتظار التحصيل</small>
                <b class="iv-hero-n">${money(tot)}</b>
                <p>${tot ? `${invN(open.length)} عند ${plural(who, 'عميل واحد', 'عميلين', 'عملاء', 'عميلًا')}` : 'لا مستحقات معلّقة — كل الفواتير محصّلة'}</p>
                ${tot ? `<div class="iv-seg" role="img" aria-label="توزيع المستحقات">
                    <i class="ok" style="width:${w(okS)}"></i><i class="soon" style="width:${w(soonS)}"></i><i class="late" style="width:${w(lateS)}"></i></div>
                <ul class="iv-seg-lg">
                    <li class="ok"><span>ضمن المهلة</span><b>${moneyText(okS)}</b></li>
                    <li class="soon"><span>تستحق قريبًا</span><b>${moneyText(soonS)}</b></li>
                    <li class="late"><span>متأخرة</span><b>${moneyText(lateS)}</b></li>
                </ul>` : ''}
            </div>
            <div class="iv-hero-stats">
                <div class="iv-stat"><span class="iv-stat-ic mint">${ic('payments')}</span><small>محصّل في ${MONTHS[m]}</small><b>${money(cur)}</b>
                    <p>${delta === null ? (prev ? '' : 'لا تحصيل في ' + MONTHS[pm.getMonth()]) : `<em class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} <span class="en-num">${Math.abs(delta)}%</span></em> عن ${MONTHS[pm.getMonth()]}`}</p></div>
                <div class="iv-stat"><span class="iv-stat-ic blue">${ic('timer')}</span><small>متوسط مدة السداد</small>
                    <b>${avg === null ? '—' : `<span class="en-num">${avg}</span> <em>${avg === 1 ? 'يوم' : avg === 2 ? 'يومان' : avg <= 10 ? 'أيام' : 'يومًا'}</em>`}</b>
                    <p>${avg === null ? 'تُحسب من تاريخ السداد المسجّل' : fast ? `الأسرع: ${esc(fast[0])}` : `من ${invN(timed.length)} مسجّلة`}</p></div>
                <div class="iv-stat"><span class="iv-stat-ic gold">${ic('donut_large')}</span><small>نسبة التحصيل · 90 يومًا</small>
                    <b>${rate === null ? '—' : `<span class="en-num">${rate}%</span>`}</b>
                    <span class="iv-bar"><i style="width:${rate || 0}%"></i></span></div>
            </div>`;
    }

    // ── يحتاج انتباهك ──
    function focusItems() {
        const out = [];
        I().filter(isOpen).forEach(i => {
            const s = state(i), recent = i.remindedAt && diff(today(), dayOf(i.remindedAt)) < 2;
            const age = diff(today(), parse(i.date) || today());
            if (s === 'late') out.push({ i, k: 'late', w: 100 + lateBy(i) - (recent ? 90 : 0), why: dueLabel(i) + (i.remindedAt ? ' · ذُكّر ' + ago(i.remindedAt) : ''), act: 'remind', t: recent ? 'تذكير آخر' : 'تذكير' });
            else if (s === 'soon') out.push({ i, k: 'soon', w: 50 - (recent ? 40 : 0), why: dueLabel(i), act: 'remind', t: 'تذكير ودّي' });
            else if (!i.sentAt && !i.remindedAt && age <= 7) out.push({ i, k: 'new', w: 30, why: 'لم تُرسل للعميل بعد', act: 'send', t: 'إرسال' });
        });
        return out.sort((a, b) => b.w - a.w);
    }
    function focus() {
        const el = document.getElementById('iv-focus');
        if (!el) return;
        const all = isAdmin() ? focusItems() : [];
        el.hidden = !all.length;
        if (!all.length) { el.innerHTML = ''; return; }
        const show = all.slice(0, 4);
        el.innerHTML = `<header><h3>${ic('notifications_active')} يحتاج انتباهك <em class="en-num">${all.length}</em></h3>
                <small>تذكير واحد في وقته يختصر أسابيع من الانتظار</small></header>
            <div class="iv-fc-list">${show.map(f => `<article class="iv-fc ${f.k}" data-n="${esc(f.i.number)}">
                <div class="iv-fc-top">${av(f.i.client)}<div><b>${esc(f.i.client)}</b><small class="en-num" dir="ltr">#${esc(f.i.number)}</small></div></div>
                <div class="iv-fc-amt">${money(f.i.amount)}</div>
                <p class="iv-fc-why">${ic(f.k === 'late' ? 'running_with_errors' : f.k === 'soon' ? 'hourglass_top' : 'outgoing_mail')}${esc(f.why)}</p>
                <button type="button" class="iv-fc-btn" data-iv="${f.act}">${WA}<span>${f.t}</span></button>
            </article>`).join('')}</div>
            ${all.length > show.length ? `<button type="button" class="iv-link" data-iv="tab-late">${ic('arrow_back')} عرض كل المتأخرة والمستحقة (${all.length})</button>` : ''}`;
    }

    // ── التبويبات وقائمة العملاء ──
    function tabs() {
        const el = document.getElementById('iv-tabs');
        if (!el) return;
        const b = base();
        const n = t => b.filter(i => tabOk(i, t)).length;
        const T = [['all', 'الكل'], ['open', 'بانتظار السداد'], ['late', 'متأخرة'], ['paid', 'مدفوعة'], ['void', 'ملغاة']];
        el.innerHTML = T.filter(([k]) => k !== 'void' || n('void') || S.tab === 'void').map(([k, t]) => `<button type="button" role="tab" data-tab="${k}" class="${k}${S.tab === k ? ' on' : ''}" aria-selected="${S.tab === k}">
            ${t}<em class="en-num">${n(k)}</em></button>`).join('');
    }
    function clientsSel() {
        const sel = document.getElementById('iv-client');
        if (!sel) return;
        const names = [...new Set(I().map(i => (i.client || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
        if (S.client && !names.includes(S.client)) names.unshift(S.client);
        const key = names.join('|');
        if (sel.dataset.key === key) return;
        sel.dataset.key = key;
        sel.innerHTML = '<option value="">كل العملاء</option>' + names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
        sel.value = S.client;
    }

    // ── القائمة ──
    function rowActs(i) {
        if (!isAdmin()) return `<button type="button" class="iv-ib" data-iv="print" title="طباعة / PDF">${ic('print')}</button>`;
        const open = isOpen(i);
        const wa = open ? (i.sentAt || i.remindedAt || diff(today(), parse(i.date) || today()) > 7 ? ['remind', 'تذكير عبر واتساب'] : ['send', 'إرسال عبر واتساب'])
            : isPaid(i) ? ['send', 'إرسال تأكيد السداد'] : null;
        return `${open ? `<button type="button" class="iv-pay" data-iv="pay" title="اعتماد السداد">${ic('task_alt')}<span>سداد</span></button>` : '<span class="iv-pay-gap"></span>'}
            ${wa ? `<button type="button" class="iv-ib wa" data-iv="${wa[0]}" title="${wa[1]}">${WA}</button>` : '<span class="iv-ib-gap"></span>'}
            <button type="button" class="iv-ib" data-iv="print" title="طباعة / PDF">${ic('print')}</button>`;
    }
    function row(i) {
        const s = state(i);
        return `<article class="iv-row st-${s}" data-n="${esc(i.number)}" tabindex="0" aria-label="فاتورة ${esc(i.number)} — ${esc(i.client)}">
            <div class="iv-c-who">${av(i.client)}<div><b>${esc(i.client || 'بدون عميل')}</b><small class="en-num" dir="ltr">#${esc(i.number)}${i.recurringId ? ' ' + ic('autorenew') : ''}</small></div></div>
            <div class="iv-c-what">${what(i)}</div>
            <div class="iv-c-date">${ic('event')}<span class="en-num">${esc(i.date || '—')}</span></div>
            <div class="iv-c-due">${chip(i)}</div>
            <div class="iv-c-amt">${money(i.amount)}</div>
            <div class="iv-c-acts">${rowActs(i)}</div>
        </article>`;
    }
    function list() {
        const el = document.getElementById('iv-list');
        if (!el) return;
        const b = base(), all = sorted(b.filter(i => tabOk(i, S.tab)));
        if (!I().length) {
            el.innerHTML = `<div class="iv-empty">${ic('receipt_long')}<b>لا فواتير بعد</b><p>أصدر فاتورتك الأولى، وتابع من هنا ما سُدّد وما يحتاج تذكيرًا.</p>
                ${isAdmin() ? `<button type="button" class="iv-btn main" data-iv="new">${ic('add')} فاتورة جديدة</button>` : ''}</div>`;
            return;
        }
        if (!all.length) {
            el.innerHTML = `<div class="iv-empty">${ic('search_off')}<b>لا فواتير مطابقة</b><p>جرّب كلمة بحث أخرى أو وسّع الفترة.</p>
                <button type="button" class="iv-btn ghost" data-iv="clear">${ic('filter_alt_off')} مسح الفلاتر</button></div>`;
            return;
        }
        const shown = all.slice(0, S.limit);
        let html = '';
        if (S.sort === 'new' || S.sort === 'old') {
            let key = null;
            shown.forEach(i => {
                const d = parse(i.date), k = d ? d.getFullYear() + '-' + d.getMonth() : 'x';
                if (k !== key) {
                    key = k;
                    const g = all.filter(x => { const dx = parse(x.date); return (dx ? dx.getFullYear() + '-' + dx.getMonth() : 'x') === k; });
                    html += `<h4 class="iv-month"><span>${d ? `${MONTHS[d.getMonth()]} <span class="en-num">${d.getFullYear()}</span>` : 'بدون تاريخ'}</span><em>${invN(g.length)} · ${moneyText(sum(g))}</em></h4>`;
                }
                html += row(i);
            });
        } else html = shown.map(row).join('');
        if (all.length > shown.length) html += `<button type="button" class="iv-more" data-iv="more">${ic('expand_more')} عرض المزيد (${all.length - shown.length})</button>`;
        el.innerHTML = html;
    }

    // ── لوحة التفاصيل ──
    let dw = null;
    function ensureDrawer() {
        if (dw) return dw;
        dw = document.createElement('div');
        dw.className = 'iv-dw-wrap no-print';
        dw.hidden = true;
        dw.innerHTML = '<div class="iv-dw-scrim" data-iv="close"></div><aside class="iv-dw" role="dialog" aria-modal="true" aria-labelledby="iv-dw-t"></aside>';
        document.body.appendChild(dw);
        dw.addEventListener('click', onClick);
        return dw;
    }
    function openDrawer(n) {
        if (!byNum(n)) return;
        openNum = String(n);
        ensureDrawer();
        fillDrawer();
        dw.querySelector('.iv-dw-body') && (dw.querySelector('.iv-dw-body').scrollTop = 0);
        if (dw.hidden) {
            dw.hidden = false;
            document.documentElement.classList.add('iv-lock');
            requestAnimationFrame(() => requestAnimationFrame(() => dw.classList.add('open')));
        }
    }
    function closeDrawer() {
        openNum = null;
        if (!dw || dw.hidden) return;
        dw.classList.remove('open');
        document.documentElement.classList.remove('iv-lock');
        setTimeout(() => { if (!dw.classList.contains('open')) dw.hidden = true; }, 320);
    }
    function fillDrawer() {
        const i = byNum(openNum);
        if (!i) { closeDrawer(); return; }
        const s = state(i), c = clientOf(i.client) || {}, admin = isAdmin();
        const mine = I().filter(x => x.client === i.client && !isVoid(x)), owed = mine.filter(isOpen);
        const it = i.items || [];
        let subT = 0, disc = 0;
        it.forEach(x => { const v = (parseFloat(x.qty) || 0) * (parseFloat(x.price) || 0); if (v < 0) disc -= v; else subT += v; });
        if (subT - amt(i) > disc + 0.009) disc = subT - amt(i);
        const due = parse(i.dueDate);
        const amtNote = s === 'paid' ? `سُدّدت ${i.paidAt ? fmt(dayOf(i.paidAt)) : ''}${i.payMethod ? ' · ' + esc(i.payMethod) : ''}`
            : s === 'void' ? `أُلغيت ${i.voidedAt ? fmt(dayOf(i.voidedAt)) : ''}`
            : s === 'late' ? (due ? `كان موعد سدادها ${fmt(due)}` : `صدرت قبل ${days(diff(today(), parse(i.date) || today()))} بلا موعد استحقاق`)
            : due ? `موعد السداد ${fmt(due)}` : 'بلا موعد استحقاق محدد';
        const rem = parseInt(i.reminders) || (i.remindedAt ? 1 : 0);
        const tl = [
            ['receipt_long', 'أُصدرت الفاتورة', fmt(parse(i.date)), 'done'],
            ['outgoing_mail', i.sentAt ? 'أُرسلت للعميل' : 'لم تُرسل للعميل بعد', i.sentAt ? ago(i.sentAt) : (admin && isOpen(i) ? '<button type="button" class="iv-link sm" data-iv="send">إرسال الآن</button>' : ''), i.sentAt ? 'done' : 'todo'],
            rem ? ['notifications_active', 'ذُكّر العميل ' + (rem === 1 ? 'مرة واحدة' : rem === 2 ? 'مرتين' : rem + ' مرات'), 'آخرها ' + ago(i.remindedAt), 'done'] : null,
            s === 'void' ? ['block', 'أُلغيت الفاتورة', i.voidedAt ? ago(i.voidedAt) : '', 'void']
                : ['task_alt', isPaid(i) ? 'سُدّدت' : 'بانتظار السداد', isPaid(i) ? (i.paidAt ? fmt(dayOf(i.paidAt)) + (paidIn(i) !== null ? ' · بعد ' + days(paidIn(i)) : '') : '') : dueLabel(i), isPaid(i) ? 'done' : s === 'late' ? 'late' : 'todo']
        ].filter(Boolean);
        const waBtn = isOpen(i) ? (i.sentAt || i.remindedAt ? ['remind', 'تذكير'] : ['send', 'إرسال']) : isPaid(i) ? ['send', 'تأكيد السداد'] : null;
        dw.querySelector('.iv-dw').innerHTML = `
            <div class="iv-grab"></div>
            <header class="iv-dw-head">
                <div><small>فاتورة</small><h3 id="iv-dw-t" class="en-num" dir="ltr">#${esc(i.number)}</h3></div>
                ${chip(i)}
                <button type="button" class="iv-x" data-iv="close" aria-label="إغلاق">${ic('close')}</button>
            </header>
            <div class="iv-dw-body">
                <section class="iv-dw-amt st-${s}"><small>${s === 'paid' ? 'المبلغ المدفوع' : s === 'void' ? 'مبلغ الفاتورة الملغاة' : 'المبلغ المستحق'}</small>
                    <div class="iv-dw-n">${money(i.amount)}</div><p>${amtNote}</p></section>
                <section class="iv-dw-client">${av(i.client, 'lg')}<div><b>${esc(i.client || 'بدون عميل')}</b>
                    <small>${c.phone ? `<span class="en-num" dir="ltr">${esc(c.phone)}</span>` : 'لا يوجد رقم جوال'}${owed.length > 1 || (owed.length === 1 && owed[0] !== i) ? ` · عليه ${moneyText(sum(owed))}` : ''}</small></div>
                    <button type="button" class="iv-link" data-iv="client-all">${invN(mine.length)} ${ic('chevron_left')}</button></section>
                <dl class="iv-dw-meta">
                    <div><dt>تاريخ الإصدار</dt><dd>${fmt(parse(i.date))}</dd></div>
                    <div><dt>تاريخ الاستحقاق</dt><dd>${due ? fmt(due) : '<span class="iv-mute">غير محدد</span>'}</dd></div>
                    ${isPaid(i) ? `<div><dt>طريقة الدفع</dt><dd>${esc(i.payMethod || '—')}</dd></div><div><dt>مدة السداد</dt><dd>${paidIn(i) === null ? '—' : paidIn(i) === 0 ? 'في اليوم نفسه' : days(paidIn(i))}</dd></div>` : ''}
                    ${i.recurringId ? `<div class="wide"><dt>التكرار</dt><dd>${ic('autorenew')} تصدر تلقائيًا آخر كل شهر</dd></div>` : ''}
                </dl>
                <section class="iv-dw-items"><h4>البنود</h4>
                    <ul>${it.filter(x => (parseFloat(x.qty) || 0) * (parseFloat(x.price) || 0) >= 0).map(x => `<li><span>${esc(x.desc || 'بند')}</span>
                        ${(parseFloat(x.qty) || 0) !== 1 ? `<em class="en-num">${esc(x.qty)} × ${num2(x.price)}</em>` : ''}<b class="en-num">${num2((parseFloat(x.qty) || 0) * (parseFloat(x.price) || 0))}</b></li>`).join('') || '<li class="iv-mute">لا بنود</li>'}</ul>
                    <div class="iv-dw-tot">${disc > 0.009 ? `<div><span>المجموع الفرعي</span><b class="en-num">${num2(subT)}</b></div><div class="disc"><span>الخصم</span><b class="en-num">−${num2(disc)}</b></div>` : ''}
                        <div class="grand"><span>الإجمالي</span><b>${money(i.amount)}</b></div></div></section>
                ${i.notes ? `<section class="iv-dw-notes"><h4>ملاحظات</h4><p>${esc(i.notes)}</p></section>` : ''}
                <section class="iv-dw-log"><h4>سجل الفاتورة</h4>
                    <ol class="iv-tl">${tl.map(([g, t, d, k]) => `<li class="${k}"><span class="dot">${ic(g)}</span><div><b>${t}</b><small>${d}</small></div></li>`).join('')}</ol></section>
            </div>
            <footer class="iv-dw-foot">
                <div class="iv-dw-main">
                    ${admin && isOpen(i) ? `<button type="button" class="iv-btn main" data-iv="pay">${ic('task_alt')}<span>اعتماد السداد</span></button>` : ''}
                    ${admin && waBtn ? `<button type="button" class="iv-btn wa" data-iv="${waBtn[0]}">${WA}<span>${waBtn[1]}</span></button>` : ''}
                    <button type="button" class="iv-btn ghost" data-iv="print">${ic('print')}<span>طباعة / PDF</span></button>
                </div>
                ${admin ? `<div class="iv-dw-more">
                    <button type="button" data-iv="edit">${ic('edit_square')}<span>تعديل</span></button>
                    <button type="button" data-iv="dup" title="نسخة جديدة بالبنود نفسها">${ic('content_copy')}<span>نسخة</span></button>
                    <button type="button" data-iv="statement" title="كشف حساب العميل">${ic('summarize')}<span>كشف</span></button>
                    <button type="button" data-iv="link" title="نسخ رابط صفحة العميل"${c.token ? '' : ' disabled'}>${ic('link')}<span>الرابط</span></button>
                    ${isVoid(i) ? `<button type="button" data-iv="reopen" title="إعادة فتح الفاتورة">${ic('restart_alt')}<span>إعادة فتح</span></button>`
                        : isOpen(i) ? `<button type="button" class="warn" data-iv="void" title="إلغاء الفاتورة">${ic('block')}<span>إلغاء</span></button>` : ''}
                    <button type="button" class="del" data-iv="del" title="حذف الفاتورة نهائيًا">${ic('delete')}<span>حذف</span></button>
                </div>` : ''}
            </footer>`;
    }

    // ── الإجراءات ──
    function saveMeta(i, patch) {
        Object.assign(i, patch);
        if (window.db && i.id) window.db.ref('invoices/' + i.id).update(patch).catch(() => toast('تعذّر حفظ السجل — تحقّق من الاتصال'));
    }
    function phoneOf(i) { const c = clientOf(i.client); return c && c.phone ? c : null; }
    function reminderText(i) {
        const c = clientOf(i.client) || {}, name = c.name || c.company || i.client || '';
        const link = c.token ? RNAN.portalUrl(c.token) : RNAN.pageUrl('index.html', {});
        const a = num2(amt(i)), l = lateBy(i), due = parse(i.dueDate);
        if (l <= 0) return `السلام عليكم ${name} 👋\n\nتذكير ودّي بفاتورتكم لدى رنان لخدمات التصميم:\n🧾 رقم الفاتورة: ${i.number}\n💰 المبلغ: ${a} ريال\n📅 ${l === 0 ? 'تستحق اليوم' : 'تستحق في ' + fmtPlain(due || dueOf(i))}\n\nلمعاينة الفاتورة وتحميلها PDF:\n${link}\n\nشاكرين لكم،\nرنان لخدمات التصميم`;
        if (l <= 14) return `السلام عليكم ${name} 👋\n\nنذكّركم بلطف بأن الفاتورة رقم ${i.number} بمبلغ ${a} ريال تجاوزت موعد سدادها بـ${days(l)}.\nإن كان السداد قد تم فنرجو إعلامنا لتحديث السجل، ولكم جزيل الشكر.\n\nتفاصيل الفاتورة:\n${link}\n\nرنان لخدمات التصميم`;
        return `السلام عليكم ${name}،\n\nنأمل التكرم بسداد الفاتورة رقم ${i.number} بمبلغ ${a} ريال، والتي مضى على موعد استحقاقها ${days(l)}.\nيسعدنا ترتيب السداد بما يناسبكم إن احتجتم لذلك — فقط أخبرونا.\n\nتفاصيل الفاتورة:\n${link}\n\nمع خالص التقدير،\nرنان لخدمات التصميم`;
    }
    function remind(i) {
        const c = phoneOf(i);
        if (!c) return toast('⚠️ لا يوجد رقم جوال لهذا العميل — أضفه من صفحة العملاء');
        window.open(RNAN.waLink(c.phone, reminderText(i)), '_blank');
        saveMeta(i, { remindedAt: new Date().toISOString(), reminders: (parseInt(i.reminders) || 0) + 1 });
        toast('🔔 فُتح واتساب، وسُجّل التذكير في سجل الفاتورة');
        render();
    }
    function send(i) {
        if (!phoneOf(i)) return toast('⚠️ لا يوجد رقم جوال لهذا العميل — أضفه من صفحة العملاء');
        if (typeof sendInvoiceWhatsApp === 'function') sendInvoiceWhatsApp(idxOf(i));
        if (isOpen(i) && !i.sentAt) { saveMeta(i, { sentAt: new Date().toISOString() }); render(); }
    }
    function setStatus(i, status, done) {
        const old = i.status;
        i.status = status;
        if (VOID.includes(status)) i.voidedAt = new Date().toISOString();
        render();
        google.script.run.withSuccessHandler(() => { toast(done); if (typeof loadAllData === 'function') loadAllData(); })
            .withFailureHandler(e => { i.status = old; render(); toast('تعذّر التحديث: ' + ((e && e.message) || 'تحقّق من الاتصال')); })
            .saveInvoiceToSheet({ invoiceNumber: i.number, clientSelect: i.client, issueDate: i.date, status, totalAmount: i.amount, items: i.items, notes: i.notes, footerText: i.footerText });
    }
    let sure = null;
    function twoTap(btn, key, label) {
        if (sure === key) { sure = null; return true; }
        sure = key;
        btn.classList.add('sure');
        btn.querySelector('span:last-child').textContent = label;
        setTimeout(() => { if (sure === key) { sure = null; if (btn.isConnected) fillDrawer(); } }, 3500);
        return false;
    }
    function del(i) {
        google.script.run.withSuccessHandler(() => {
            const k = I().indexOf(i);
            if (k > -1) invoicesData.splice(k, 1);
            closeDrawer();
            render();
            toast('🗑️ حُذفت الفاتورة ' + i.number);
            if (typeof loadAllData === 'function') loadAllData();
        }).withFailureHandler(e => toast('تعذّر الحذف: ' + ((e && e.message) || 'تحقّق من الاتصال'))).deleteInvoiceFromSheet(i.number);
    }
    function copy(text) {
        const ok = () => toast('🔗 نُسخ رابط صفحة العميل');
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, () => fallback());
        else fallback();
        function fallback() { const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast(text); } t.remove(); }
    }
    function exportCsv() {
        const rows = [['رقم الفاتورة', 'العميل', 'تاريخ الإصدار', 'تاريخ الاستحقاق', 'الحالة', 'المبلغ', 'تاريخ السداد', 'طريقة الدفع', 'البنود']];
        sorted(base().filter(i => tabOk(i, S.tab))).forEach(i => rows.push([i.number, i.client, i.date, i.dueDate || '', ST_NAME[state(i)], amt(i).toFixed(2),
            i.paidAt ? ymd(dayOf(i.paidAt)) : '', i.payMethod || '', (i.items || []).map(x => `${x.desc} (${x.qty}×${x.price})`).join(' | ')]));
        const csv = '﻿' + rows.map(r => r.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.download = 'رنان-الفواتير-' + ymd(today()) + '.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        toast('📄 صُدّرت ' + invN(rows.length - 1));
    }
    function recCount() {
        if (!window.db || Date.now() - recAt < 60000) return;
        recAt = Date.now();
        window.db.ref('recurring').once('value').then(s => {
            recN = Object.values(s.val() || {}).filter(r => r && r.active !== false).length;
            const el = document.getElementById('iv-rec-n');
            if (el) { el.hidden = !recN; el.textContent = recN; }
        }).catch(() => null);
    }

    // ── كشف حساب العميل (للطباعة أو حفظه PDF) ──
    let st = null, stClient = null;
    function statement(name) {
        stClient = name;
        const c = clientOf(name) || {};
        const list = I().filter(i => i.client === name && !isVoid(i)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
        const tot = sum(list), paid = sum(list.filter(isPaid)), due = tot - paid;
        const first = list.length ? parse(list[0].date) : null, last = list.length ? parse(list[list.length - 1].date) : null;
        const bank = typeof DEFAULT_BANK_INFO !== 'undefined' ? DEFAULT_BANK_INFO : '';
        if (!st) {
            st = document.createElement('div');
            st.id = 'iv-st-wrap';
            st.hidden = true;
            st.innerHTML = `<div class="iv-st-bar no-print">
                    <b>${ic('summarize')} كشف حساب</b>
                    <div><button type="button" class="iv-btn main sm" data-st="print">${ic('print')}<span>طباعة / PDF</span></button>
                    <button type="button" class="iv-btn wa sm" data-st="wa">${WA}<span>ملخص للعميل</span></button>
                    <button type="button" class="iv-x" data-st="close" aria-label="إغلاق">${ic('close')}</button></div></div>
                <div class="iv-st-scroll"><div id="iv-statement"></div></div>`;
            document.body.appendChild(st);
            st.addEventListener('click', e => {
                const b = e.target.closest('[data-st]');
                if (!b) return;
                if (b.dataset.st === 'close') { st.hidden = true; document.documentElement.classList.remove('iv-lock'); }
                else if (b.dataset.st === 'print') {
                    document.documentElement.classList.add('iv-print-st');
                    window.addEventListener('afterprint', () => document.documentElement.classList.remove('iv-print-st'), { once: true });
                    if (typeof printWithFileName === 'function') printWithFileName('كشف حساب - ' + stClient); else window.print();
                } else if (b.dataset.st === 'wa') statementWa(stClient);
            });
        }
        const rowsHtml = list.map((i, k) => `<tr><td class="en-num">${k + 1}</td><td class="en-num" dir="ltr">${esc(i.number)}</td><td class="en-num">${esc(i.date || '')}</td>
            <td class="en-num">${esc(i.dueDate || '—')}</td><td><span class="s ${state(i)}">${ST_NAME[state(i)]}</span></td><td class="en-num">${num2(amt(i))}</td>
            <td class="en-num">${isPaid(i) ? num2(amt(i)) : '0.00'}</td></tr>`).join('');
        st.querySelector('#iv-statement').innerHTML = `
            <header class="sd-head"><img src="images/ranan-logo.svg" alt="رنان لخدمات التصميم"><div><h1>كشف حساب</h1><p>STATEMENT OF ACCOUNT</p></div></header>
            <div class="sd-meta">
                <div><small>العميل</small><b>${esc(name)}</b>${c.phone ? `<span class="en-num" dir="ltr">${esc(c.phone)}</span>` : ''}</div>
                <div><small>الفترة</small><b>${first ? fmtPlain(first) + ' — ' + fmtPlain(last) : '—'}</b></div>
                <div><small>تاريخ الكشف</small><b>${fmtPlain(today())}</b></div>
            </div>
            <div class="sd-sum">
                <div><small>إجمالي الفواتير</small><b class="en-num">${num2(tot)}</b><em>${invN(list.length)}</em></div>
                <div><small>المدفوع</small><b class="en-num">${num2(paid)}</b><em>${invN(list.filter(isPaid).length)}</em></div>
                <div class="due"><small>الرصيد المستحق</small><b class="en-num">${num2(due)}</b><em>ريال سعودي</em></div>
            </div>
            <table class="sd-table"><thead><tr><th>#</th><th>رقم الفاتورة</th><th>التاريخ</th><th>الاستحقاق</th><th>الحالة</th><th>المبلغ</th><th>المدفوع</th></tr></thead>
                <tbody>${rowsHtml || '<tr><td colspan="7">لا فواتير</td></tr>'}</tbody>
                <tfoot><tr><td colspan="5">الإجمالي</td><td class="en-num">${num2(tot)}</td><td class="en-num">${num2(paid)}</td></tr></tfoot></table>
            ${due > 0.009 && bank ? `<div class="sd-pay"><h4>بيانات الدفع</h4><p>${esc(bank)}</p></div>` : ''}
            <footer class="sd-foot"><b>شكرًا لثقتكم</b><span>رنان لخدمات التصميم · المملكة العربية السعودية</span></footer>`;
        st.hidden = false;
        document.documentElement.classList.add('iv-lock');
        st.querySelector('.iv-st-scroll').scrollTop = 0;
    }
    function statementWa(name) {
        const c = clientOf(name);
        if (!c || !c.phone) return toast('⚠️ لا يوجد رقم جوال لهذا العميل');
        const open = I().filter(i => i.client === name && isOpen(i));
        const link = c.token ? RNAN.portalUrl(c.token) : RNAN.pageUrl('index.html', {});
        const lines = open.map(i => `• ${i.number} — ${num2(amt(i))} ريال (${dueLabel(i)})`).join('\n');
        const msg = open.length
            ? `السلام عليكم ${c.name || c.company} 👋\n\nملخص حسابكم لدى رنان لخدمات التصميم:\n🧾 فواتير مستحقة: ${open.length}\n${lines}\n💰 الإجمالي المستحق: ${num2(sum(open))} ريال\n\nتفاصيل الفواتير وتحميلها PDF من صفحتكم الخاصة:\n${link}\n\nرنان لخدمات التصميم`
            : `السلام عليكم ${c.name || c.company} 👋\n\nحسابكم لدى رنان لخدمات التصميم مسدّد بالكامل ✅ — شكرًا لثقتكم.\nسجل فواتيركم في صفحتكم الخاصة:\n${link}\n\nرنان لخدمات التصميم`;
        window.open(RNAN.waLink(c.phone, msg), '_blank');
    }

    function onClick(e) {
        const tab = e.target.closest('#iv-tabs [data-tab]');
        if (tab) { S.tab = tab.dataset.tab; S.limit = 40; tabs(); list(); return; }
        const b = e.target.closest('[data-iv]');
        const rowEl = e.target.closest('.iv-row, .iv-fc');
        if (!b) { if (rowEl && !e.target.closest('a, input, select')) openDrawer(rowEl.dataset.n); return; }
        if (b.disabled) return;
        const a = b.dataset.iv;
        const i = byNum((rowEl && rowEl.dataset.n) || openNum);
        if (a === 'new') return openInvoiceModal('new');
        if (a === 'recurring') return openRecurringModal();
        if (a === 'export') return exportCsv();
        if (a === 'close') return closeDrawer();
        if (a === 'more') { S.limit += 40; return list(); }
        if (a === 'clear') {
            Object.assign(S, { tab: 'all', q: '', client: '', period: 'all', limit: 40 });
            ['iv-q', 'iv-client', 'iv-period'].forEach(id => { const el = document.getElementById(id); if (el) el.value = id === 'iv-period' ? 'all' : ''; });
            tabs(); return list();
        }
        if (a === 'tab-late') { S.tab = 'open'; S.sort = 'due'; const so = document.getElementById('iv-sort'); if (so) so.value = 'due'; tabs(); list(); document.getElementById('iv-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        if (!i) return;
        if (a === 'pay') return window.InvoicesUI && InvoicesUI.pay(idxOf(i));
        if (a === 'remind') return remind(i);
        if (a === 'send') return send(i);
        if (a === 'print') { closeDrawer(); return printInvoiceDirectly(i); }
        if (a === 'edit') { closeDrawer(); return openInvoiceModal('edit', idxOf(i)); }
        if (a === 'dup') { closeDrawer(); return window.InvoiceEdit ? InvoiceEdit.duplicate(idxOf(i)) : openInvoiceModal('new'); }
        if (a === 'statement') return statement(i.client);
        if (a === 'link') { const c = clientOf(i.client); if (c && c.token) copy(RNAN.portalUrl(c.token)); return; }
        if (a === 'client-all') {
            closeDrawer();
            S.client = (i.client || '').trim(); S.tab = 'all'; S.limit = 40;
            clientsSel();
            const sel = document.getElementById('iv-client'); if (sel) sel.value = S.client;
            tabs(); list();
            return document.getElementById('iv-tabs').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (a === 'void') { if (twoTap(b, 'void' + i.number, 'تأكيد؟')) setStatus(i, 'ملغاة', '🚫 أُلغيت الفاتورة ' + i.number); return; }
        if (a === 'reopen') return setStatus(i, PENDING, '↩️ أُعيد فتح الفاتورة ' + i.number);
        if (a === 'del') { if (twoTap(b, 'del' + i.number, 'متأكد؟')) del(i); }
    }

    function render() {
        const root = document.getElementById('iv-root');
        if (!root) return;
        if (!built) { built = build(); if (!built) return; root.addEventListener('click', onClick); }
        sub(); hero(); focus(); tabs(); clientsSel(); list(); recCount();
        if (openNum && dw && !dw.hidden) fillDrawer();
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (document.querySelector('.inv-dlg-wrap.open')) return;
            if (st && !st.hidden) { st.hidden = true; document.documentElement.classList.remove('iv-lock'); return; }
            if (dw && !dw.hidden) closeDrawer();
        } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.iv-row')) { e.preventDefault(); openDrawer(e.target.dataset.n); }
    });

    window.InvoicesPage = { render, open: openDrawer, close: closeDrawer, statement, state, dueLabel, show(o) {
        Object.assign(S, o || {}, { limit: 40 });
        render();
        clientsSel();
        [['iv-client', S.client], ['iv-period', S.period], ['iv-sort', S.sort], ['iv-q', S.q]].forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.value = v; });
        tabs(); list();
    } };
})();
