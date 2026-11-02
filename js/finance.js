// صفحة المالية: قائمة دخل شهرية (دخل، مصروفات، صافي ربح) قابلة للتنقل بين الأشهر، مؤشر الصحة المالية، أرقام العام،
// الدخل مقابل المصروفات لـ 12 شهرًا، توقّع التدفق النقدي 30/60/90 يومًا، أعمار المستحقات مع التذكير والسداد السريع،
// أوعية توزيع الدخل، تسجيل المصروفات، قيمة الساعة لكل مشروع، قيمة المشاريع حسب نوع العمل، نصائح مالية، وتصدير للمحاسب.
// البيانات: invoicesData و projectsData و clientsData، و expenses و subscriptions و recurring و timeLogs و proposals/offer و settings من القاعدة.
(function () {
    const PAID = 'مدفوعة', PENDING = 'قيد الانتظار', DONE = 'مكتمل', CANCELLED = ['ملغي', 'ملغاة'];
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const MS = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];
    const CATS = ['معدات وأجهزة', 'طباعة', 'إعلانات', 'موارد وصور', 'تعليم ودورات', 'برامج واشتراكات', 'تنقّل', 'أخرى'];
    const JARS = [{ k: 'ops', name: 'مصاريف التشغيل', ic: 'build', pct: 30, hue: 210 }, { k: 'pay', name: 'راتبك الشخصي', ic: 'account_balance_wallet', pct: 45, hue: 160 },
        { k: 'save', name: 'الادخار والاستثمار', ic: 'savings', pct: 15, hue: 45 }, { k: 'safe', name: 'الطوارئ والزكاة', ic: 'shield', pct: 10, hue: 280 }];
    const USD = 3.75;
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => Math.round(v || 0).toLocaleString('en-US');
    const money = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : num(v));
    // داخل الفقرات: رقم ونص فقط (عنصر الريال الكتلي يقطع الفقرة)
    const moneyText = v => `<span class="en-num">${num(v)}</span> ر.س`;
    const short = v => { const a = Math.abs(v); return (v < 0 ? '-' : '') + (a >= 1e6 ? (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : a >= 1e4 ? (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : num(a)); };
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const plural = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : n + (n <= 10 ? ' ' + few : ' ' + many);
    const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);
    const I = () => (typeof invoicesData !== 'undefined' ? invoicesData : []);
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const C = () => (typeof clientsData !== 'undefined' ? clientsData : []);
    const amt = x => parseFloat(x.amount) || 0;
    const live = i => !CANCELLED.includes(i.status);
    const typeOf = p => (window.ProjectsUI && ProjectsUI.typeOf ? ProjectsUI.typeOf(p) : { t: 'مشروع', ic: 'folder', hue: 200 });
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    const list = o => Object.entries(o || {}).map(([id, v]) => Object.assign({ id }, v));

    // ── البيانات من القاعدة ──
    let D = { expenses: [], subs: [], recurring: [], logs: [], proposals: [], offers: {}, jars: JARS, goal: 4000, loaded: false }, loading = null, loadedAt = 0;
    function load(force) {
        if (loading || !window.db || (!force && Date.now() - loadedAt < 45000)) return loading;
        const get = p => window.db.ref(p).once('value').then(s => s.val()).catch(() => null);
        loading = Promise.all(['expenses', 'subscriptions', 'recurring', 'timeLogs', 'proposals', 'offer', 'settings/finance_jars', 'settings/monthly_goal'].map(get)).then(([e, s, r, t, pr, of, j, g]) => {
            D = {
                expenses: list(e).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), subs: list(s), recurring: list(r), logs: list(t), proposals: list(pr), offers: of || {},
                jars: Array.isArray(j) && j.length ? j : JARS, goal: parseFloat(g) > 0 ? parseFloat(g) : 4000, loaded: true
            };
            loadedAt = Date.now();
            loading = null;
            render();
        });
        return loading;
    }

    // ── الحسابات ──
    const ym = (y, m) => y + '-' + pad(m + 1);
    const inMonth = (s, y, m) => String(s || '').startsWith(ym(y, m));
    const income = (y, m) => I().filter(i => i.status === PAID && inMonth(i.date, y, m)).reduce((a, i) => a + amt(i), 0);
    const spend = (y, m) => D.expenses.filter(x => inMonth(x.date, y, m)).reduce((a, x) => a + amt(x), 0);
    function months(n, endY, endM) {
        const out = [];
        for (let k = n - 1; k >= 0; k--) { const d = new Date(endY, endM - k, 1); const y = d.getFullYear(), m = d.getMonth(); const inc = income(y, m), exp = spend(y, m); out.push({ y, m, inc, exp, net: inc - exp }); }
        return out;
    }
    const pendingAll = () => I().filter(i => i.status !== PAID && live(i));
    const ageOf = i => { const d = parse(i.date); return d ? Math.max(0, Math.round((today() - d) / 864e5)) : 0; };
    const subSar = s => (+s.amount || 0) * (s.currency === 'USD' ? USD : 1);
    const subMonthly = s => s.cycle === 'yearly' ? subSar(s) / 12 : subSar(s);
    const phoneOf = name => (C().find(c => c.company === name || c.name === name) || {}).phone || '';

    function health() {
        const t = today(), paid = I().filter(i => i.status === PAID).reduce((a, i) => a + amt(i), 0), pend = pendingAll().reduce((a, i) => a + amt(i), 0);
        const last6 = months(6, t.getFullYear(), t.getMonth() - 1), recent = last6.slice(3), prev = last6.slice(0, 3);
        const sum = (arr, k) => arr.reduce((a, x) => a + x[k], 0);
        const avgInc = sum(last6, 'inc') / 6 || 1;
        const overdue = pendingAll().filter(i => ageOf(i) > 30).reduce((a, i) => a + amt(i), 0);
        const rInc = sum(recent, 'inc'), rExp = sum(recent, 'exp'), pInc = sum(prev, 'inc');
        const margin = rInc ? (rInc - rExp) / rInc : 0, growth = pInc ? rInc / pInc : (rInc ? 1.3 : 0.7);
        const clamp = v => Math.max(0, Math.min(1, v));
        const f = [
            { k: 'التحصيل', v: clamp(paid / (paid + pend || 1)), tip: 'حصّل الفواتير المعلّقة أولًا بأول' },
            { k: 'خلوّ من التأخير', v: clamp(1 - overdue / avgInc), tip: 'فواتير تجاوزت 30 يومًا — ذكّر أصحابها' },
            { k: 'هامش الربح', v: clamp(margin / 0.6), tip: 'المصروفات تأكل جزءًا كبيرًا من الدخل' },
            { k: 'نمو الدخل', v: clamp((growth - 0.7) / 0.6), tip: 'الدخل أقل من الأشهر الثلاثة قبلها' }
        ];
        const score = Math.round(f.reduce((a, x) => a + x.v * 25, 0));
        const weakest = f.slice().sort((a, b) => a.v - b.v)[0];
        return { score, f, weakest, margin, growth, grade: score >= 80 ? ['ممتازة', 'ok'] : score >= 60 ? ['جيدة', 'good'] : score >= 40 ? ['مقبولة', 'mid'] : ['تحتاج انتباهًا', 'low'] };
    }
    function forecast(days) {
        const t = today(), end = new Date(t); end.setDate(t.getDate() + days);
        const inn = [], out = [];
        pendingAll().forEach(i => inn.push({ when: null, label: `فاتورة ${i.client || ''}`, sub: `${i.number}${ageOf(i) > 0 ? ' · منذ ' + plural(ageOf(i), 'يوم', 'يومين', 'أيام', 'يومًا') : ''}`, v: amt(i), ic: 'receipt_long' }));
        const RP = window.RecurringPeriods;
        D.recurring.filter(r => r.active !== false).forEach(r => {
            if (!RP || !RP.nextDue) return;
            const v = (r.items || []).reduce((a, it) => a + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0);
            let p = RP.nextDue(r);
            for (let n = 0; n < 4 && p && (!r.endPeriod || p <= r.endPeriod); n++, p = RP.next(p)) {
                const d = parse(RP.lastDay(p));
                if (!d || d > end) break;
                if (d >= t) inn.push({ when: ymd(d), label: `فاتورة متكررة · ${r.client || ''}`, sub: 'تُصدر آخر الشهر', v, ic: 'event_repeat' });
            }
        });
        D.proposals.forEach(p => {
            const o = D.offers[p.token] || {};
            if (p.projectKey || p.status === 'lost' || !(o.reply && o.reply.decision === 'approved')) return;
            const dep = p.deposit != null ? +p.deposit : 50;
            if (dep > 0) inn.push({ when: null, label: `عربون عرض «${p.title || ''}»`, sub: `${dep}% من ${num(p.total)} ر.س · وافق العميل`, v: (+p.total || 0) * dep / 100, ic: 'verified' });
        });
        D.subs.filter(s => s.active !== false && s.next).forEach(s => {
            let d = parse(s.next);
            for (let n = 0; d && d <= end && n < 4; n++) {
                if (d >= t) out.push({ when: ymd(d), label: `تجديد ${s.name || 'اشتراك'}`, sub: s.cycle === 'yearly' ? 'سنوي' : 'شهري', v: subSar(s), ic: 'autorenew' });
                d = new Date(d); if (s.cycle === 'yearly') d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1);
            }
        });
        const recentExp = months(3, t.getFullYear(), t.getMonth() - 1).reduce((a, x) => a + D.expenses.filter(e => inMonth(e.date, x.y, x.m) && !String(e.category || '').startsWith('اشتراكات')).reduce((s, e) => s + amt(e), 0), 0) / 3;
        if (recentExp > 0) out.push({ when: null, label: 'مصروفات معتادة (تقدير)', sub: `متوسط آخر 3 أشهر × ${plural(Math.round(days / 30), 'شهر', 'شهرين', 'أشهر', 'شهرًا')}`, v: recentExp * days / 30, ic: 'shopping_bag' });
        const sum = a => a.reduce((s, x) => s + x.v, 0);
        const sortF = (a, b) => (a.when ? 1 : 0) - (b.when ? 1 : 0) || String(a.when).localeCompare(String(b.when)) || b.v - a.v;
        return { inn: inn.sort(sortF), out: out.sort(sortF), tin: sum(inn), tout: sum(out) };
    }
    function hourly() {
        const hrs = {};
        D.logs.forEach(l => { if (l.projectKey) hrs[l.projectKey] = (hrs[l.projectKey] || 0) + (+l.seconds || 0) / 3600; });
        const rows = Object.entries(hrs).map(([k, h]) => { const p = P().find(x => String(x.rowIndex) === String(k)); const v = p ? parseFloat(p.value) || 0 : 0; return p && h >= 0.25 && v ? { p, h, v, r: v / h } : null; })
            .filter(Boolean).sort((a, b) => b.h - a.h);
        const th = rows.reduce((a, x) => a + x.h, 0), tv = rows.reduce((a, x) => a + x.v, 0);
        return { rows, avg: th ? tv / th : 0, hours: th };
    }

    // ── رسوم ──
    function ring(score, cls) {
        const r = 52, c = 2 * Math.PI * r, off = c - score / 100 * c;
        return `<svg class="fn-ring ${cls}" viewBox="0 0 130 130" aria-hidden="true"><circle cx="65" cy="65" r="${r}" class="track"/><circle cx="65" cy="65" r="${r}" class="bar" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${off.toFixed(1)}"/></svg>`;
    }
    function donut(parts, total) {
        const r = 46, c = 2 * Math.PI * r;
        let acc = 0;
        return `<svg class="fn-donut" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${r}" class="track"/>${parts.map(p => {
            const len = total ? p.v / total * c : 0, g = parts.length > 1 ? 2 : 0;
            const el = `<circle cx="60" cy="60" r="${r}" stroke="hsl(${p.hue} 70% 62%)" stroke-dasharray="${Math.max(len - g, .5).toFixed(1)} ${(c - Math.max(len - g, .5)).toFixed(1)}" stroke-dashoffset="${(-acc).toFixed(1)}"/>`;
            acc += len; return el; }).join('')}</svg>`;
    }

    // ── الحالة ──
    let sel = (() => { const t = today(); return { y: t.getFullYear(), m: t.getMonth() }; })();
    let flowDays = 30, jarEdit = false, expOpen = false;

    // ── الأقسام ──
    function plCard() {
        const { y, m } = sel, inc = income(y, m), exp = spend(y, m), net = inc - exp;
        const pd = new Date(y, m - 1, 1), pInc = income(pd.getFullYear(), pd.getMonth()), pExp = spend(pd.getFullYear(), pd.getMonth()), pNet = pInc - pExp;
        const delta = (a, b, inv) => { if (!b) return a ? '<em class="up">جديد</em>' : '<em class="flat">—</em>'; const d = Math.round((a - b) / Math.abs(b) * 100); const good = inv ? d <= 0 : d >= 0; return `<em class="${d === 0 ? 'flat' : good ? 'up' : 'down'}">${d > 0 ? '▲' : d < 0 ? '▼' : ''} <span class="en-num">${Math.abs(d)}%</span></em>`; };
        const margin = inc ? Math.round(net / inc * 100) : 0;
        const isNow = y === today().getFullYear() && m === today().getMonth();
        const cats = {};
        D.expenses.filter(x => inMonth(x.date, y, m)).forEach(x => { const k = String(x.category || 'أخرى').split(' · ')[0]; cats[k] = (cats[k] || 0) + amt(x); });
        const topCats = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const wExp = inc ? Math.min(100, exp / inc * 100) : (exp ? 100 : 0);
        return `<section class="fn-card fn-pl" style="--i:1">
            <header>
                <div><h3>${ic('account_balance')} قائمة دخل ${MONTHS[m]} <span class="en-num">${y}</span></h3><small>${isNow ? 'حتى اليوم · ' : ''}مقارنة بـ${MONTHS[pd.getMonth()]}</small></div>
                <div class="fn-nav"><button type="button" class="fn-ib" data-fn="prev" aria-label="الشهر السابق">${ic('chevron_right')}</button><button type="button" class="fn-ib" data-fn="now" ${isNow ? 'disabled' : ''} aria-label="الشهر الحالي">${ic('today')}</button><button type="button" class="fn-ib" data-fn="next" ${isNow ? 'disabled' : ''} aria-label="الشهر التالي">${ic('chevron_left')}</button></div>
            </header>
            <div class="fn-pl-nums">
                <div class="in"><small>${ic('south_west')} الدخل المحصّل</small><b>${money(inc)}</b>${delta(inc, pInc)}</div>
                <div class="out"><small>${ic('north_east')} المصروفات</small><b>${money(exp)}</b>${delta(exp, pExp, true)}</div>
                <div class="net ${net < 0 ? 'neg' : ''}"><small>${ic('savings')} صافي الربح</small><b>${money(net)}</b>${delta(net, pNet)}</div>
            </div>
            <div class="fn-fall" aria-label="من الدخل إلى الصافي">
                <div class="fn-fall-bar"><i class="exp" style="width:${wExp}%"></i><i class="net" style="width:${Math.max(0, 100 - wExp)}%"></i></div>
                <div class="fn-fall-lg"><span><i class="exp"></i> المصروفات <b class="en-num">${pct(exp, inc || exp)}%</b> من الدخل</span><span><i class="net"></i> هامش الربح <b class="en-num">${margin}%</b></span></div>
            </div>
            ${topCats.length ? `<div class="fn-pl-cats"><small>أكبر المصروفات:</small>${topCats.map(([k, v]) => `<span>${esc(k)} <b>${money(v)}</b></span>`).join('')}</div>` : `<p class="fn-pl-note">${ic('info')} لا مصروفات مسجّلة لهذا الشهر — سجّلها لتعرف ربحك الحقيقي.</p>`}
        </section>`;
    }
    function healthCard() {
        const h = health();
        return `<section class="fn-card fn-health" style="--i:2">
            <header><h3>${ic('monitor_heart')} الصحة المالية</h3><small>آخر 6 أشهر</small></header>
            <div class="fn-health-top"><div class="fn-ring-wrap">${ring(h.score, h.grade[1])}<div class="fn-ring-t"><b class="en-num">${h.score}</b><small>من 100</small></div></div>
                <div class="fn-grade ${h.grade[1]}"><b>${h.grade[0]}</b><small>${h.weakest.v < .7 ? esc(h.weakest.tip) : 'استمر على هذا الأداء 👏'}</small></div></div>
            <ul class="fn-factors">${h.f.map(f => `<li><span>${f.k}</span><span class="fn-bar"><i style="width:${Math.round(f.v * 100)}%" class="${f.v >= .7 ? 'ok' : f.v >= .4 ? 'mid' : 'low'}"></i></span><b class="en-num">${Math.round(f.v * 25)}/25</b></li>`).join('')}</ul>
        </section>`;
    }
    function kpis() {
        const t = today(), y = t.getFullYear(), m = t.getMonth();
        let ytd = 0, last = 0;
        for (let k = 0; k <= m; k++) { ytd += income(y, k); last += k < m ? income(y - 1, k) : I().filter(i => i.status === PAID && inMonth(i.date, y - 1, k) && (parse(i.date) || t).getDate() <= t.getDate()).reduce((a, i) => a + amt(i), 0); }
        const d = last ? Math.round((ytd - last) / last * 100) : null;
        const pend = pendingAll(), pendSum = pend.reduce((a, i) => a + amt(i), 0), late = pend.filter(i => ageOf(i) > 15);
        const avg3 = months(3, y, m - 1).reduce((a, x) => a + x.inc, 0) / 3;
        const proj = ytd + Math.max(0, avg3 - income(y, m)) + avg3 * (11 - m);
        const hr = hourly();
        const tile = (i, cls, icon, label, value, sub) => `<div class="fn-kpi ${cls}" style="--i:${i}"><span class="fn-kpi-ic">${ic(icon)}</span><small>${label}</small><b>${value}</b><p>${sub}</p></div>`;
        return `<section class="fn-kpis">
            ${tile(3, 'mint', 'calendar_month', `دخل ${y} حتى الآن`, money(ytd), d === null ? 'أول عام بالأرقام' : `<em class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} <span class="en-num">${Math.abs(d)}%</span></em> عن نفس الفترة من ${y - 1}`)}
            ${tile(4, 'amber', 'hourglass_top', 'مستحقات لم تُحصّل', money(pendSum), `${plural(pend.length, 'فاتورة', 'فاتورتان', 'فواتير', 'فاتورة')}${late.length ? ` · <em class="down">${late.length} تجاوزت 15 يومًا</em>` : ''}`)}
            ${tile(5, 'blue', 'trending_up', `توقّع نهاية ${y}`, money(proj), `بمتوسط آخر 3 أشهر (<span class="en-num">${short(avg3)}</span> شهريًا)`)}
            ${tile(6, 'violet', 'schedule', 'قيمة ساعتك', !D.loaded ? '<span class="fn-skel"></span>' : hr.avg ? `${money(hr.avg)}<em class="unit">/ساعة</em>` : '—', hr.avg ? `من <span class="en-num">${Math.round(hr.hours)}</span> ساعة مسجّلة على ${plural(hr.rows.length, 'مشروع', 'مشروعين', 'مشاريع', 'مشروعًا')}` : 'سجّل وقتك لتعرف قيمة ساعتك')}
        </section>`;
    }
    function trendCard() {
        const t = today(), data = months(12, t.getFullYear(), t.getMonth());
        const max = Math.max(1, ...data.map(x => Math.max(x.inc, x.exp, x.net))), min = Math.min(0, ...data.map(x => x.net)), range = max - min;
        const zero = (0 - min) / range * 100, H = 200;
        const yv = v => ((max - v) / range * H).toFixed(1);
        const rtl = getComputedStyle(document.documentElement).direction === 'rtl';
        const pts = data.map((x, i) => `${(((rtl ? 11 - i : i) + .5) / 12 * 1200).toFixed(1)},${yv(x.net)}`).join(' ');
        const tot = data.reduce((a, x) => ({ inc: a.inc + x.inc, exp: a.exp + x.exp }), { inc: 0, exp: 0 });
        const best = data.reduce((a, x) => (x.net > a.net ? x : a), data[0]);
        return `<section class="fn-card fn-trend" style="--i:7">
            <header><div><h3>${ic('stacked_bar_chart')} الدخل والمصروفات — آخر 12 شهرًا</h3><small>اضغط أي شهر لتفتح قائمة دخله</small></div>
                <div class="fn-legend"><span class="in">الدخل</span><span class="out">المصروفات</span><span class="net">صافي الربح</span></div></header>
            <div class="fn-chart">
                <div class="fn-zero" style="bottom:${zero.toFixed(1)}%"></div>
                <svg class="fn-line" viewBox="0 0 1200 ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>
                ${data.map((x, i) => `<button type="button" class="fn-col${x.y === sel.y && x.m === sel.m ? ' on' : ''}" data-fn="month" data-y="${x.y}" data-m="${x.m}" aria-label="${MONTHS[x.m]}">
                    <span class="fn-bars"><i class="in" style="bottom:${zero.toFixed(1)}%;height:${(x.inc / range * 100).toFixed(1)}%"></i><i class="out" style="bottom:${zero.toFixed(1)}%;height:${(x.exp / range * 100).toFixed(1)}%"></i></span>
                    <span class="fn-dot" style="top:${(yv(x.net) / H * 100).toFixed(1)}%"></span>
                    <span class="fn-tip"><b>${MONTHS[x.m]} <span class="en-num">${x.y}</span></b><span>دخل <b class="en-num">${num(x.inc)}</b></span><span>مصروف <b class="en-num">${num(x.exp)}</b></span><span>صافي <b class="en-num">${num(x.net)}</b></span></span>
                    <small>${MS[x.m]}</small></button>`).join('')}
            </div>
            <div class="fn-trend-sum"><span>إجمالي الدخل <b>${money(tot.inc)}</b></span><span>إجمالي المصروفات <b>${money(tot.exp)}</b></span><span>الصافي <b>${money(tot.inc - tot.exp)}</b></span>${best && best.net > 0 ? `<span>${ic('emoji_events')} أفضل شهر ربحًا: <b>${MONTHS[best.m]}</b></span>` : ''}</div>
        </section>`;
    }
    function flowCard() {
        const f = forecast(flowDays), net = f.tin - f.tout;
        const row = (x, cls) => `<li class="${cls}"><span class="fn-fl-ic">${ic(x.ic)}</span><div><b>${esc(x.label)}</b><small>${x.when ? esc(x.when) + ' · ' : ''}${esc(x.sub)}</small></div><b class="v">${cls === 'in' ? '+' : '−'}${money(x.v)}</b></li>`;
        const maxv = Math.max(f.tin, f.tout, 1);
        return `<section class="fn-card fn-flow" style="--i:8">
            <header><div><h3>${ic('water')} توقّع التدفق النقدي</h3><small>ما يُتوقّع أن يدخل ويخرج من حسابك</small></div>
                <div class="fn-seg">${[30, 60, 90].map(d => `<button type="button" data-fn="flow" data-d="${d}" class="${d === flowDays ? 'on' : ''}"><span class="en-num">${d}</span> يومًا</button>`).join('')}</div></header>
            ${!D.loaded ? '<div class="fn-skel big"></div>' : `<div class="fn-flow-sum">
                <div class="in"><small>داخل متوقّع</small><b>${money(f.tin)}</b><span class="fn-bar"><i style="width:${f.tin / maxv * 100}%"></i></span></div>
                <div class="out"><small>خارج متوقّع</small><b>${money(f.tout)}</b><span class="fn-bar"><i style="width:${f.tout / maxv * 100}%"></i></span></div>
                <div class="net ${net < 0 ? 'neg' : ''}"><small>الصافي المتوقّع</small><b>${money(net)}</b><p>${net >= 0 ? 'وضعك النقدي مريح خلال هذه الفترة' : 'انتبه: المصروفات المتوقّعة أعلى من الدخل'}</p></div>
            </div>
            <div class="fn-flow-lists">
                <div><h5>${ic('south_west')} داخل</h5>${f.inn.length ? `<ol>${f.inn.slice(0, 6).map(x => row(x, 'in')).join('')}</ol>${f.inn.length > 6 ? `<p class="fn-more">+${f.inn.length - 6} أخرى</p>` : ''}` : '<p class="fn-empty">لا دخل متوقّع مسجّل</p>'}</div>
                <div><h5>${ic('north_east')} خارج</h5>${f.out.length ? `<ol>${f.out.slice(0, 6).map(x => row(x, 'out')).join('')}</ol>` : '<p class="fn-empty">لا مصروفات متوقّعة</p>'}</div>
            </div>`}
        </section>`;
    }
    function agingCard() {
        const pend = pendingAll().map(i => ({ i, a: ageOf(i), idx: I().indexOf(i) })).sort((x, y) => y.a - x.a);
        const B = [['0–15 يومًا', 0, 15, 'ok'], ['16–30 يومًا', 16, 30, 'mid'], ['31–60 يومًا', 31, 60, 'late'], ['أكثر من 60', 61, 1e9, 'bad']];
        const sums = B.map(b => pend.filter(x => x.a >= b[1] && x.a <= b[2]).reduce((s, x) => s + amt(x.i), 0)), tot = sums.reduce((a, v) => a + v, 0);
        const remind = x => { const ph = phoneOf(x.i.client); return ph && window.RNAN ? RNAN.waLink(ph, `مرحبًا، نذكّركم بلطف بالفاتورة رقم ${x.i.number} بقيمة ${num(amt(x.i))} ر.س الصادرة بتاريخ ${x.i.date}.\nشاكرين لكم سرعة السداد، ويسعدنا خدمتكم دائمًا.\nرنان لخدمات التصميم`) : ''; };
        return `<section class="fn-card fn-aging" style="--i:9">
            <header><div><h3>${ic('history_toggle_off')} أعمار المستحقات</h3><small>كم مضى على كل فاتورة لم تُحصّل</small></div><button type="button" class="fn-link" data-fn="page" data-page="invoices">الفواتير ${ic('arrow_back')}</button></header>
            ${tot ? `<div class="fn-age-bar">${B.map((b, k) => sums[k] ? `<i class="${b[3]}" style="flex:${sums[k]}" title="${b[0]}"></i>` : '').join('')}</div>
            <div class="fn-age-lg">${B.map((b, k) => `<div class="${b[3]}"><i></i><small>${b[0]}</small><b>${money(sums[k])}</b></div>`).join('')}</div>
            <ol class="fn-age-list">${pend.slice(0, 5).map(x => { const w = remind(x); return `<li class="${x.a > 60 ? 'bad' : x.a > 30 ? 'late' : x.a > 15 ? 'mid' : 'ok'}">
                <div><b>${esc(x.i.client || '')}</b><small><span class="en-num">${esc(x.i.number)}</span> · ${x.a ? 'منذ ' + plural(x.a, 'يوم', 'يومين', 'أيام', 'يومًا') : 'اليوم'}</small></div>
                <b class="v">${money(amt(x.i))}</b>
                <span class="fn-acts">${w ? `<a class="fn-ib wa" href="${esc(w)}" target="_blank" rel="noopener" title="تذكير واتساب" aria-label="تذكير واتساب">${ic('chat')}</a>` : ''}<button type="button" class="fn-ib ok" data-fn="pay" data-i="${x.idx}" title="اعتماد السداد" aria-label="اعتماد السداد">${ic('task_alt')}</button></span></li>`; }).join('')}</ol>`
                : `<div class="fn-calm">${ic('verified')}<b>لا مستحقات معلّقة</b><p>كل فواتيرك محصّلة 👏</p></div>`}
        </section>`;
    }
    function jarsCard() {
        const inc = income(sel.y, sel.m), jars = D.jars, total = jars.reduce((a, j) => a + (+j.pct || 0), 0);
        return `<section class="fn-card fn-jars" style="--i:10">
            <header><div><h3>${ic('pie_chart')} أوعية الدخل</h3><small>كيف توزّع دخل ${MONTHS[sel.m]} (${money(inc)}) — طريقة «الربح أولًا»</small></div>
                <button type="button" class="fn-ib" data-fn="jars" title="تعديل النسب" aria-label="تعديل النسب">${ic(jarEdit ? 'close' : 'tune')}</button></header>
            ${jarEdit ? `<form class="fn-jar-form">${jars.map((j, n) => `<label><span>${ic(j.ic || 'savings')} ${esc(j.name)}</span><input type="number" min="0" max="100" step="1" inputmode="numeric" lang="en" dir="ltr" class="form-input-modern" name="j${n}" value="${+j.pct || 0}"><em>%</em></label>`).join('')}
                <p class="fn-jar-sum">المجموع <b class="en-num" id="fn-jar-total">${total}</b>% — يجب أن يكون 100%</p><div class="fn-row"><button type="submit" class="fn-btn">${ic('save')} حفظ النسب</button><button type="button" class="fn-btn ghost" data-fn="jars-reset">النسب المقترحة</button></div></form>`
            : `<div class="fn-jar-grid">${jars.map(j => { const v = inc * (+j.pct || 0) / 100; return `<div class="fn-jar" style="--hue:${j.hue || 200};--fill:${Math.min(100, +j.pct || 0) * 1.6}%">
                <div class="fn-jar-vis"><i></i><span class="en-num">${+j.pct || 0}%</span></div>
                <div class="fn-jar-t"><small>${ic(j.ic || 'savings')} ${esc(j.name)}</small><b>${money(v)}</b></div></div>`; }).join('')}</div>
                <p class="fn-jar-tip">${ic('lightbulb')} حوّل كل وعاء لحسابه بعد كل دفعة تستلمها؛ هكذا تعرف ربحك الحقيقي ولا تُفاجأ بمصروف أو زكاة.</p>`}
        </section>`;
    }
    function expCard() {
        const { y, m } = sel, mine = D.expenses.filter(x => inMonth(x.date, y, m)), tot = mine.reduce((a, x) => a + amt(x), 0);
        const cats = {};
        mine.forEach(x => { const k = String(x.category || 'أخرى').split(' · ')[0]; cats[k] = (cats[k] || 0) + amt(x); });
        const hues = [210, 340, 45, 160, 280, 20, 190, 120];
        const parts = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v], n) => ({ k, v, hue: hues[n % hues.length] }));
        const subsM = D.subs.filter(s => s.active !== false).reduce((a, s) => a + subMonthly(s), 0);
        return `<section class="fn-card fn-exp" style="--i:11">
            <header><div><h3>${ic('receipt')} مصروفات ${MONTHS[m]}</h3><small>${plural(mine.length, 'عملية', 'عمليتان', 'عمليات', 'عملية')} · اشتراكاتك تكلّف <b>${money(subsM)}</b> شهريًا</small></div>
                <button type="button" class="fn-btn sm" data-fn="exp-open">${ic(expOpen ? 'close' : 'add')} ${expOpen ? 'إغلاق' : 'مصروف'}</button></header>
            ${expOpen ? `<form class="fn-exp-form">
                <label class="w2"><span>البيان</span><input name="title" class="form-input-modern" maxlength="80" placeholder="مثال: طباعة بروشورات" required></label>
                <label><span>المبلغ (ر.س)</span><input name="amount" class="form-input-modern" inputmode="decimal" dir="ltr" lang="en" placeholder="0" required></label>
                <label><span>التاريخ</span><input name="date" type="date" class="form-input-modern" value="${ymd(today())}"></label>
                <label class="w2"><span>الفئة</span><select name="category" class="form-input-modern">${CATS.map(k => `<option>${k}</option>`).join('')}</select></label>
                <p class="fn-err" hidden></p>
                <button type="submit" class="fn-btn w2">${ic('save')} تسجيل المصروف</button></form>` : ''}
            ${tot ? `<div class="fn-exp-top"><div class="fn-donut-wrap">${donut(parts, tot)}<div class="fn-donut-t"><small>الإجمالي</small><b>${money(tot)}</b></div></div>
                <ul class="fn-cats">${parts.slice(0, 5).map(p => `<li style="--hue:${p.hue}"><i></i><span>${esc(p.k)}</span><b>${money(p.v)}</b><small class="en-num">${pct(p.v, tot)}%</small></li>`).join('')}</ul></div>
                <ol class="fn-exp-list">${mine.slice(0, 4).map(x => `<li><div><b>${esc(x.title || 'مصروف')}</b><small>${esc(x.date || '')} · ${esc(String(x.category || 'أخرى').split(' · ')[0])}</small></div><b class="v">${money(amt(x))}</b><button type="button" class="fn-ib del" data-fn="exp-del" data-id="${esc(x.id)}" title="حذف" aria-label="حذف">${ic('delete')}</button></li>`).join('')}</ol>`
                : !expOpen ? `<div class="fn-calm">${ic('receipt_long')}<b>لا مصروفات مسجّلة لهذا الشهر</b><p>سجّل الطباعة والإعلانات والمعدات لتعرف صافي ربحك.</p></div>` : ''}
        </section>`;
    }
    function typesCard() {
        const by = {};
        P().forEach(p => { const t = typeOf(p), v = parseFloat(p.value) || 0; if (!by[t.t]) by[t.t] = { t, v: 0, n: 0 }; by[t.t].v += v; by[t.t].n++; });
        const rows = Object.values(by).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 6), max = rows.length ? rows[0].v : 1, tot = rows.reduce((a, x) => a + x.v, 0);
        return `<section class="fn-card fn-types" style="--i:12">
            <header><div><h3>${ic('category')} قيمة المشاريع حسب نوع العمل</h3><small>أين يتركّز دخلك؟</small></div></header>
            ${rows.length ? `<ol class="fn-hbars">${rows.map(x => `<li style="--hue:${x.t.hue}"><span class="lb">${ic(x.t.ic)} ${esc(x.t.t)}</span><span class="fn-bar"><i style="width:${Math.max(4, x.v / max * 100)}%"></i></span><b>${money(x.v)}</b><small><span class="en-num">${pct(x.v, tot)}%</span> · ${plural(x.n, 'مشروع', 'مشروعان', 'مشاريع', 'مشروعًا')}</small></li>`).join('')}</ol>`
                : `<p class="fn-empty">لا مشاريع بقيمة مسجّلة</p>`}
        </section>`;
    }
    function hourlyCard() {
        const h = hourly();
        const cls = r => (r < h.avg * 0.7 ? 'low' : r > h.avg * 1.2 ? 'ok' : 'mid');
        return `<section class="fn-card fn-hourly" style="--i:13">
            <header><div><h3>${ic('timer')} قيمة ساعتك لكل مشروع</h3><small>قيمة المشروع ÷ الساعات المسجّلة عليه${h.avg ? ` · متوسطك ${money(h.avg)}` : ''}</small></div><button type="button" class="fn-link" data-fn="page" data-page="time">تتبّع الوقت ${ic('arrow_back')}</button></header>
            ${!D.loaded ? '<div class="fn-skel big"></div>' : h.rows.length ? `<ol class="fn-hr">${h.rows.slice(0, 6).map(x => `<li class="${cls(x.r)}"><div><b>${esc(x.p.name)}</b><small><span class="en-num">${x.h.toFixed(1)}</span> ساعة · قيمته ${money(x.v)}</small></div><b class="rate">${money(x.r)}<em>/س</em></b></li>`).join('')}</ol>`
                : `<div class="fn-calm">${ic('play_circle')}<b>لا وقت مسجّل على مشاريعك بعد</b><p>شغّل المؤقت وأنت تعمل، وسنحسب لك كم تكسب فعليًا في الساعة لكل مشروع.</p><button type="button" class="fn-btn sm" data-fn="page" data-page="time">ابدأ المؤقت</button></div>`}
        </section>`;
    }
    function tips() {
        const out = [], t = today(), pend = pendingAll(), pendSum = pend.reduce((a, i) => a + amt(i), 0);
        const late = pend.filter(i => ageOf(i) > 15), lateSum = late.reduce((a, i) => a + amt(i), 0);
        if (late.length) out.push(['payments', 'red', `حصّل ${plural(late.length, 'فاتورة متأخرة', 'فاتورتين متأخرتين', 'فواتير متأخرة', 'فاتورة متأخرة')} بقيمة <b>${moneyText(lateSum)}</b> — هذا يرفع دخل الشهر إلى <b class="en-num">${pct(income(t.getFullYear(), t.getMonth()) + lateSum, D.goal)}%</b> من هدفك.`]);
        const subsY = D.subs.filter(s => s.active !== false).reduce((a, s) => a + subMonthly(s) * 12, 0);
        if (subsY) { const top = D.subs.filter(s => s.active !== false).sort((a, b) => subMonthly(b) - subMonthly(a))[0]; out.push(['autorenew', 'blue', `اشتراكاتك تكلّفك <b>${moneyText(subsY)}</b> سنويًا؛ أعلاها «${esc(top.name)}». راجع ما لا تستخدمه، والخطط السنوية غالبًا أوفر.`]); }
        const by = {};
        I().filter(i => i.status === PAID).forEach(i => { by[i.client] = (by[i.client] || 0) + amt(i); });
        const totalPaid = Object.values(by).reduce((a, v) => a + v, 0), topC = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
        if (topC && totalPaid && topC[1] / totalPaid >= .4 && Object.keys(by).length > 1) out.push(['diversity_3', 'amber', `<b class="en-num">${pct(topC[1], totalPaid)}%</b> من دخلك من «${esc(topC[0])}» — الاعتماد على عميل واحد مخاطرة؛ استهدف عميلين جديدين هذا الشهر.`]);
        const h = hourly(), low = h.rows.filter(x => x.r < h.avg * 0.6)[0];
        if (low) out.push(['price_change', 'violet', `ساعتك في «${esc(low.p.name)}» بـ<b>${moneyText(low.r)}</b> فقط مقابل متوسط <b>${moneyText(h.avg)}</b> — راجع تسعير «${esc(typeOf(low.p).t)}» أو حدّد عدد التعديلات.`]);
        const m3 = months(3, t.getFullYear(), t.getMonth() - 1), inc3 = m3.reduce((a, x) => a + x.inc, 0), exp3 = m3.reduce((a, x) => a + x.exp, 0);
        if (inc3 && exp3 / inc3 > .4) out.push(['trending_down', 'red', `مصروفاتك في آخر 3 أشهر <b class="en-num">${pct(exp3, inc3)}%</b> من دخلك — حاول إبقاءها تحت 30% لتحافظ على هامش ربح صحي.`]);
        const yr = months(12, t.getFullYear(), t.getMonth()), best = yr.reduce((a, x) => (x.inc > a.inc ? x : a), yr[0]);
        if (best && best.inc) out.push(['event_upcoming', 'mint', `أقوى أشهرك دخلًا ${MONTHS[best.m]} (${moneyText(best.inc)}) — جهّز عروضك وحملتك التسويقية قبله بشهر لتستفيد من الموسم.`]);
        if (pendSum && !late.length) out.push(['schedule_send', 'blue', `عندك <b>${moneyText(pendSum)}</b> مستحقات حديثة — أرسل للعميل رابط الفاتورة مع موعد سداد واضح لتسريع التحصيل.`]);
        if (!out.length) out.push(['celebration', 'mint', 'أرقامك متوازنة ولا ملاحظات عاجلة — استمر وسجّل مصروفاتك ووقتك لتصلك نصائح أدق.']);
        return out;
    }
    function tipsCard() {
        return `<section class="fn-card fn-tips" style="--i:14">
            <header><div><h3>${ic('tips_and_updates')} نصائح مالية من أرقامك</h3><small>تتجدّد تلقائيًا مع كل فاتورة ومصروف</small></div>
                <div class="fn-row"><button type="button" class="fn-link" data-fn="all-tx">كل العمليات ${ic('arrow_back')}</button><button type="button" class="fn-link" data-fn="all-cl">العملاء وإيراداتهم ${ic('arrow_back')}</button></div></header>
            <ol class="fn-tip-list">${tips().map(([i, c, t]) => `<li class="${c}"><span class="fn-tip-ic">${ic(i)}</span><p>${t}</p></li>`).join('')}</ol>
        </section>`;
    }

    // ── الرسم ──
    let first = true;
    function render() {
        const root = document.getElementById('fn-root');
        if (!root) return;
        load();
        const scroll = document.querySelector('main') ? document.querySelector('main').scrollTop : 0;
        root.innerHTML = `<div class="fn-grid${first ? ' intro' : ''}">
            <header class="fn-head" style="--i:0">
                <div><h1>المالية</h1><p>ربحك الحقيقي، تدفّقك النقدي، وما يحتاج قرارك — في صفحة واحدة.</p></div>
                <div class="fn-head-acts">
                    <button type="button" class="fn-btn ghost" data-fn="export">${ic('download')} تصدير للمحاسب</button>
                    <button type="button" class="fn-btn" data-fn="exp-quick">${ic('add')} مصروف</button>
                </div>
            </header>
            ${plCard()}
            ${healthCard()}
            ${kpis()}
            ${trendCard()}
            ${flowCard()}
            ${agingCard()}
            ${jarsCard()}
            ${expCard()}
            ${typesCard()}
            ${hourlyCard()}
            ${tipsCard()}
        </div>`;
        if (!first && document.querySelector('main')) document.querySelector('main').scrollTop = scroll;
        first = false;
    }
    const soft = () => { const pg = document.getElementById('finance-page'); if (pg && !pg.classList.contains('hidden')) render(); };

    // ── تصدير للمحاسب (CSV يفتح في Excel بالعربية) ──
    function exportCsv() {
        const rows = [['النوع', 'التاريخ', 'الطرف / البيان', 'الرقم', 'الفئة', 'الحالة', 'المبلغ (ر.س)']];
        I().filter(live).forEach(i => rows.push(['دخل (فاتورة)', i.date || '', i.client || '', i.number || '', '', i.status || '', amt(i).toFixed(2)]));
        D.expenses.forEach(x => rows.push(['مصروف', x.date || '', x.title || '', '', x.category || '', 'مدفوع', (-amt(x)).toFixed(2)]));
        rows.sort((a, b) => (a === rows[0] ? -1 : b === rows[0] ? 1 : String(b[1]).localeCompare(String(a[1]))));
        const csv = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.download = `رنان-المالية-${ymd(today())}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        toast(`صُدّرت ${plural(rows.length - 1, 'عملية', 'عمليتان', 'عمليات', 'عملية')} — افتح الملف في Excel`);
    }

    // ── الأحداث ──
    document.addEventListener('click', async e => {
        const b = e.target.closest('#fn-root [data-fn]');
        if (!b) return;
        const a = b.dataset.fn;
        if (a === 'prev' || a === 'next') { const d = new Date(sel.y, sel.m + (a === 'next' ? 1 : -1), 1); sel = { y: d.getFullYear(), m: d.getMonth() }; return render(); }
        if (a === 'now') { const t = today(); sel = { y: t.getFullYear(), m: t.getMonth() }; return render(); }
        if (a === 'month') { sel = { y: +b.dataset.y, m: +b.dataset.m }; render(); const pl = document.querySelector('.fn-pl'); if (pl) pl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
        if (a === 'flow') { flowDays = +b.dataset.d; return render(); }
        if (a === 'page') return switchPage(b.dataset.page);
        if (a === 'pay') return window.InvoicesUI && InvoicesUI.pay(+b.dataset.i);
        if (a === 'jars') { jarEdit = !jarEdit; return render(); }
        if (a === 'jars-reset') { D.jars = JARS.map(j => Object.assign({}, j)); jarEdit = false; if (window.db) window.db.ref('settings/finance_jars').set(D.jars).catch(() => null); toast('أُعيدت النسب المقترحة'); return render(); }
        if (a === 'exp-open' || a === 'exp-quick') {
            expOpen = a === 'exp-quick' ? true : !expOpen;
            render();
            if (expOpen) { const f = document.querySelector('.fn-exp-form'); if (f) { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => f.title.focus(), 300); } }
            return;
        }
        if (a === 'exp-del') {
            if (!b.classList.contains('sure')) { b.classList.add('sure'); b.innerHTML = ic('warning'); b.title = 'اضغط مجددًا للحذف'; setTimeout(() => { if (b.isConnected) { b.classList.remove('sure'); b.innerHTML = ic('delete'); } }, 3500); return; }
            const id = b.dataset.id;
            D.expenses = D.expenses.filter(x => x.id !== id);
            render();
            try { await window.db.ref('expenses/' + id).remove(); toast('حُذف المصروف'); } catch (err) { toast('تعذّر الحذف'); load(true); }
            return;
        }
        if (a === 'export') return exportCsv();
        if (a === 'all-tx') return window.openFinanceTransactionsModal && openFinanceTransactionsModal();
        if (a === 'all-cl') return window.openFinanceClientsModal && openFinanceClientsModal();
    });
    document.addEventListener('input', e => {
        const f = e.target.closest('#fn-root .fn-jar-form');
        if (!f) return;
        const t = [...f.querySelectorAll('input')].reduce((a, i) => a + (parseFloat(i.value) || 0), 0), el = document.getElementById('fn-jar-total');
        if (el) { el.textContent = t; el.parentElement.classList.toggle('bad', t !== 100); }
    });
    document.addEventListener('submit', async e => {
        const jf = e.target.closest('#fn-root .fn-jar-form'), xf = e.target.closest('#fn-root .fn-exp-form');
        if (jf) {
            e.preventDefault();
            const vals = [...jf.querySelectorAll('input')].map(i => Math.max(0, Math.round(parseFloat(i.value) || 0)));
            if (vals.reduce((a, v) => a + v, 0) !== 100) { toast('مجموع النسب يجب أن يكون 100%'); return; }
            D.jars = D.jars.map((j, n) => Object.assign({}, j, { pct: vals[n] }));
            jarEdit = false;
            render();
            if (window.db) window.db.ref('settings/finance_jars').set(D.jars).catch(() => null);
            toast('حُفظت نسب الأوعية');
        }
        if (xf) {
            e.preventDefault();
            const title = xf.title.value.trim(), amount = parseFloat(String(xf.amount.value).replace(/[^\d.]/g, '')) || 0, err = xf.querySelector('.fn-err');
            if (!title || !(amount > 0)) { err.textContent = 'اكتب البيان والمبلغ'; err.hidden = false; return; }
            const rec = { title, amount, date: xf.date.value || ymd(today()), category: xf.category.value, createdAt: new Date().toISOString() };
            const btn = xf.querySelector('[type=submit]');
            btn.disabled = true;
            try {
                const ref = window.db.ref('expenses').push();
                await ref.set(rec);
                D.expenses.unshift(Object.assign({ id: ref.key }, rec));
                D.expenses.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
                const d = parse(rec.date);
                if (d) sel = { y: d.getFullYear(), m: d.getMonth() };
                expOpen = false;
                render();
                toast(`سُجّل المصروف: ${num(amount)} ر.س ✓`);
            } catch (er) {
                btn.disabled = false;
                err.textContent = 'تعذّر التسجيل، تحقّق من الاتصال';
                err.hidden = false;
            }
        }
    });

    window.FinanceUI = { render, soft, reload: () => load(true) };
})();
