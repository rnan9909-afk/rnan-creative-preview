// الرئيسية (لوحة القيادة): ترحيب بملخص ذكي ليومك، هدف الشهر بتوقّع الوتيرة، أرقام بخطوط اتجاه، «مركز اليوم» بما يحتاج انتباهك
// مرتّبًا بالأولوية مع زر إجراء لكل بند، خط الأيام السبعة القادمة، المشاريع النشطة، الإيرادات، أفضل العملاء، ساعات الأسبوع ورؤى العمل.
// تقرأ projectsData و invoicesData و clientsData و requestsData، وتجلب العروض والاشتراكات والوقت والهدف من القاعدة. الأنماط في css/home.css.
(function () {
    const PAID = 'مدفوعة', PENDING = 'قيد الانتظار', ACTIVE = 'قيد التنفيذ', HOLD = 'معلق', DONE = 'مكتمل';
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const WEEK = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const WEEK_S = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => Math.round(v || 0).toLocaleString('en-US');
    const money = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : num(v));
    const short = v => v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : v >= 1e4 ? (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : num(v);
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const daysTo = s => { const d = parse(s); return d ? Math.round((d - today()) / 864e5) : null; };
    const plural = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : n + (n <= 10 ? ' ' + few : ' ' + many);
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const I = () => (typeof invoicesData !== 'undefined' ? invoicesData : []);
    const C = () => (typeof clientsData !== 'undefined' ? clientsData : []);
    const R = () => (typeof requestsData !== 'undefined' ? requestsData : []);
    const amount = i => parseFloat(i.amount) || 0;
    const typeOf = p => (window.ProjectsUI && ProjectsUI.typeOf ? ProjectsUI.typeOf(p) : { t: 'مشروع', ic: 'folder', hue: 200 });

    // ── بيانات إضافية من القاعدة (تُجلب مرة كل دقيقة) ──
    let extra = { goal: 4000, proposals: [], offers: {}, subs: [], logs: [], loaded: false }, loading = null, loadedAt = 0;
    const list = o => Object.entries(o || {}).map(([id, v]) => Object.assign({ id }, v));
    function loadExtra() {
        if (loading || !window.db || Date.now() - loadedAt < 60000) return loading;
        const get = p => window.db.ref(p).once('value').then(s => s.val()).catch(() => null);
        loading = Promise.all([get('settings/monthly_goal'), get('proposals'), get('offer'), get('subscriptions'), get('timeLogs')]).then(([g, pr, of, su, tl]) => {
            extra = { goal: parseFloat(g) > 0 ? parseFloat(g) : 4000, proposals: list(pr), offers: of || {}, subs: list(su), logs: list(tl), loaded: true };
            loadedAt = Date.now();
            loading = null;
            render();
        });
        return loading;
    }
    const goal = () => extra.goal || 4000;

    // ── الحسابات ──
    function monthPaid(y, m, uptoDay) {
        return I().filter(i => i.status === PAID).reduce((s, i) => {
            const d = parse(i.date);
            return d && d.getFullYear() === y && d.getMonth() === m && (!uptoDay || d.getDate() <= uptoDay) ? s + amount(i) : s;
        }, 0);
    }
    function series(n) {
        const out = [], t = today();
        for (let k = n - 1; k >= 0; k--) { const d = new Date(t.getFullYear(), t.getMonth() - k, 1); out.push({ y: d.getFullYear(), m: d.getMonth(), v: monthPaid(d.getFullYear(), d.getMonth()) }); }
        return out;
    }
    const pendingInv = () => I().filter(i => i.status === PENDING);
    const ageOf = i => { const d = parse(i.date); return d ? Math.round((today() - d) / 864e5) : 0; };
    const openProjects = () => P().filter(p => p.status !== DONE);
    function offerStage(p) {
        if (p.status === 'lost' || p.projectKey) return null;
        if (p.status === 'draft') return 'draft';
        const o = extra.offers[p.token] || {}, r = o.reply;
        if (r && r.decision === 'approved') return 'approved';
        if (r && r.decision === 'changes') return 'changes';
        if (p.validUntil && p.validUntil < ymd(today())) return 'expired';
        return (o.seen || {}).count ? 'viewed' : 'sent';
    }
    const phoneOf = name => (C().find(c => c.company === name || c.name === name) || {}).phone || '';
    const openIdx = p => P().indexOf(p);

    // ── «مركز اليوم»: كل ما يحتاج انتباهك مرتّبًا بالأولوية ──
    function focus() {
        const items = [];
        const add = (pr, cls, icon, title, sub, act) => items.push({ pr, cls, icon, title, sub, act });
        openProjects().forEach(p => {
            if (p.status === HOLD) return;
            const d = daysTo(p.deadline);
            if (d !== null && d < 0) add(1, 'red', 'warning', `«${p.name}» متأخر ${plural(-d, 'يومًا', 'يومين', 'أيام', 'يومًا')}`, `${p.client || ''} · كان موعده ${p.deadline}`, { t: 'فتح المشروع', do: 'proj', i: openIdx(p) });
            else if (d === 0) add(2, 'amber', 'event_available', `تسليم «${p.name}» اليوم`, `${p.client || ''} · الإنجاز ${parseInt(p.progress) || 0}%`, { t: 'فتح', do: 'proj', i: openIdx(p) });
            else if (d === 1) add(3, 'amber', 'event_upcoming', `تسليم «${p.name}» غدًا`, `${p.client || ''} · الإنجاز ${parseInt(p.progress) || 0}%`, { t: 'فتح', do: 'proj', i: openIdx(p) });
        });
        if (window.ProofsUI && ProofsUI.pending) ProofsUI.pending().forEach(({ r, n, fresh }) =>
            add(fresh ? 1.5 : 2.5, 'rose', 'rate_review', `${plural(n, 'تعديل مطلوب', 'تعديلان مطلوبان', 'تعديلات مطلوبة', 'تعديلًا مطلوبًا')} على «${r.title || 'التصميم'}»`, `${r.client || ''} · ${fresh ? 'ملاحظات جديدة لم تفتحها' : 'لم تُنفَّذ بعد'}`, { t: 'افتح التصميم', do: 'proof', k: r.project }));
        pendingInv().filter(i => ageOf(i) >= 10).forEach(i => {
            const ph = phoneOf(i.client);
            const text = `مرحبًا، نذكّركم بلطف بالفاتورة رقم ${i.number} بقيمة ${num(amount(i))} ر.س الصادرة بتاريخ ${i.date}.\nشاكرين لكم سرعة السداد، ويسعدنا خدمتكم دائمًا.\nرنان لخدمات التصميم`;
            add(2.2, 'red', 'receipt_long', `فاتورة ${i.client || ''} متأخرة ${ageOf(i)} يومًا`, `${i.number} · ${num(amount(i))} ر.س`, ph && window.RNAN ? { t: 'تذكير واتساب', wa: RNAN.waLink(ph, text) } : { t: 'الفواتير', do: 'page', page: 'invoices' });
        });
        extra.proposals.forEach(p => {
            const s = offerStage(p);
            if (s === 'approved') add(1.8, 'mint', 'verified', `وافق ${p.clientName || 'العميل'} على عرض «${p.title || ''}»`, `${num(p.total)} ر.س · حوّله إلى مشروع وابدأ`, { t: 'تحويل لمشروع', do: 'page', page: 'proposals' });
            else if (s === 'changes') add(2.4, 'amber', 'edit_note', `${p.clientName || 'العميل'} طلب تعديل عرض «${p.title || ''}»`, `${num(p.total)} ر.س`, { t: 'فتح العروض', do: 'page', page: 'proposals' });
        });
        extra.subs.filter(s => s.active !== false && s.next).forEach(s => {
            const d = daysTo(s.next);
            if (d !== null && d <= (+s.remind || 3)) add(4, 'blue', 'autorenew', `يتجدد اشتراك ${s.name || ''} ${d <= 0 ? 'اليوم' : d === 1 ? 'غدًا' : 'بعد ' + plural(d, 'يوم', 'يومين', 'أيام', 'يومًا')}`, `${num(s.amount)} ${s.currency || 'ر.س'}`, { t: 'الاشتراكات', do: 'page', page: 'subs' });
        });
        const reqs = R().filter(r => r.status === 'جديد').length;
        if (reqs) add(3.5, 'blue', 'move_to_inbox', `${plural(reqs, 'طلب خدمة جديد', 'طلبا خدمة جديدان', 'طلبات خدمة جديدة', 'طلب خدمة جديدًا')} من الموقع`, 'بانتظار مراجعتك والرد على العميل', { t: 'الطلبات', do: 'page', page: 'requests' });
        return items.sort((a, b) => a.pr - b.pr);
    }

    // ── رسوم صغيرة ──
    function spark(vals, cls) {
        if (!vals.length) return '';
        const max = Math.max(...vals, 1), w = 100, h = 32, step = w / Math.max(vals.length - 1, 1);
        const pts = vals.map((v, i) => [i * step, h - 3 - (v / max) * (h - 6)]);
        const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
        const id = 'g' + Math.random().toString(36).slice(2, 7);
        return `<svg class="hm-spark ${cls || ''}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".35"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
            <path d="${line} L${w} ${h} L0 ${h} Z" fill="url(#${id})"/><path d="${line}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="2.6" fill="currentColor"/></svg>`;
    }
    function ring(pct) {
        const r = 54, c = 2 * Math.PI * r, off = c - Math.min(pct, 100) / 100 * c;
        return `<svg class="hm-ring" viewBox="0 0 140 140" aria-hidden="true">
            <defs><linearGradient id="hm-ring-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7df0c9"/><stop offset=".55" stop-color="#47E0AC"/><stop offset="1" stop-color="#43D9C4"/></linearGradient></defs>
            <circle cx="70" cy="70" r="${r}" class="track"/><circle cx="70" cy="70" r="${r}" class="bar" stroke="url(#hm-ring-g)" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${c.toFixed(1)};--off:${off.toFixed(1)}"/></svg>`;
    }

    // ── الأقسام ──
    function greet() {
        const h = new Date().getHours();
        if (h >= 4 && h < 12) return ['صباح الخير', 'wb_sunny'];
        if (h >= 12 && h < 17) return ['طاب يومك', 'partly_cloudy_day'];
        return ['مساء الخير', 'dark_mode'];
    }
    function dates() {
        const d = new Date();
        let hijri = '';
        try { hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch (e) { /* بلا هجري */ }
        return `${WEEK[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}${hijri ? ' · ' + hijri : ''}`;
    }
    function brief(items, k) {
        const late = items.filter(x => x.icon === 'warning').length, todayDel = items.filter(x => x.icon === 'event_available').length;
        const notes = (window.ProofsUI && ProofsUI.pending ? ProofsUI.pending() : []).reduce((a, x) => a + x.n, 0);
        const parts = [];
        if (todayDel) parts.push(`<b>${plural(todayDel, 'تسليم واحد', 'تسليمان', 'تسليمات', 'تسليمًا')}</b> اليوم`);
        if (late) parts.push(`<b class="r">${plural(late, 'مشروع متأخر', 'مشروعان متأخران', 'مشاريع متأخرة', 'مشروعًا متأخرًا')}</b>`);
        if (notes) parts.push(`<b class="r">${plural(notes, 'تعديل مطلوب', 'تعديلان مطلوبان', 'تعديلات مطلوبة', 'تعديلًا مطلوبًا')}</b> من العملاء`);
        if (k.overdue) parts.push(`<b>${plural(k.overdue, 'فاتورة متأخرة', 'فاتورتان متأخرتان', 'فواتير متأخرة', 'فاتورة متأخرة')}</b> السداد`);
        if (!parts.length) return items.length ? `عندك ${plural(items.length, 'أمر واحد', 'أمران', 'أمور', 'أمرًا')} في «مركز اليوم»، والباقي تحت السيطرة ✨` : 'يومك هادئ ولا شيء عاجل — فرصة رائعة لبدء مشروع جديد أو متابعة عميل ✨';
        return 'عندك ' + parts.join('، ').replace(/، ([^،]*)$/, ' و$1') + '.';
    }
    function kpis() {
        const t = today(), y = t.getFullYear(), m = t.getMonth(), d = t.getDate();
        const ser = series(7).map(x => x.v);
        const cur = monthPaid(y, m), prevSame = monthPaid(m ? y : y - 1, m ? m - 1 : 11, d);
        const delta = prevSame ? Math.round((cur - prevSame) / prevSame * 100) : (cur ? 100 : 0);
        const pend = pendingInv(), pendSum = pend.reduce((s, i) => s + amount(i), 0), overdue = pend.filter(i => ageOf(i) >= 10).length;
        const op = openProjects(), act = op.filter(p => p.status === ACTIVE);
        const late = act.filter(p => { const x = daysTo(p.deadline); return x !== null && x < 0; }).length;
        const week = act.filter(p => { const x = daysTo(p.deadline); return x !== null && x >= 0 && x <= 7; }).length;
        const live = extra.proposals.filter(p => ['sent', 'viewed', 'approved', 'changes'].includes(offerStage(p)));
        const liveSum = live.reduce((s, p) => s + (+p.total || 0), 0), approved = live.filter(p => offerStage(p) === 'approved').length;
        return { cur, delta, prevName: MONTHS[m ? m - 1 : 11], ser, pendSum, pendN: pend.length, overdue, act: act.length, late, week, hold: op.filter(p => p.status === HOLD).length, live, liveSum, approved };
    }
    function goalCard(k) {
        const t = today(), dim = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(), day = t.getDate(), left = dim - day + 1;
        const g = goal(), pct = Math.round(k.cur / g * 100), remain = Math.max(0, g - k.cur);
        const pace = Math.round(k.cur / day * dim), pacePct = Math.round(pace / g * 100);
        return `<section class="hm-card hm-goal" style="--i:1">
            <header><h3>${ic('flag')} هدف ${MONTHS[t.getMonth()]}</h3><button type="button" class="hm-ib" data-hm="goal" title="تعديل الهدف" aria-label="تعديل الهدف">${ic('edit')}</button></header>
            <div class="hm-ring-wrap">${ring(pct)}<div class="hm-ring-t"><b class="en-num" data-count="${pct}">${pct}</b><small>% من الهدف</small></div></div>
            <div class="hm-goal-nums"><div><small>المحصّل</small><b>${money(k.cur)}</b></div><div><small>الهدف</small><b class="hm-goal-v">${money(g)}</b></div></div>
            <p class="hm-goal-tip ${pct >= 100 ? 'ok' : pacePct >= 100 ? 'ok' : ''}">${pct >= 100 ? `${ic('celebration')} حققت هدف الشهر! أي إضافة الآن مكسب فوق الهدف`
                : `${ic('trending_up')} ${pacePct >= 100 ? 'وتيرتك ستتجاوز الهدف' : 'بالوتيرة الحالية تصل إلى'} <b class="en-num">${short(pace)}</b> (${pacePct}%) · تحتاج <b class="en-num">${short(Math.ceil(remain / left))}</b> يوميًا خلال ${plural(left, 'يوم', 'يومين', 'أيام', 'يومًا')} متبقية`}</p>
            <form class="hm-goal-edit" hidden><input type="number" min="100" step="100" inputmode="numeric" lang="en" dir="ltr" class="form-input-modern" value="${g}" aria-label="الهدف الشهري"><button type="submit" class="hm-btn sm">حفظ</button><button type="button" class="hm-btn sm ghost" data-hm="goal-x">إلغاء</button></form>
        </section>`;
    }
    function kpiTiles(k) {
        const tile = (i, cls, icon, label, value, sub, extraHtml) => `<div class="hm-kpi ${cls}" style="--i:${i}"><div class="hm-kpi-top"><span class="hm-kpi-ic">${ic(icon)}</span><small>${label}</small></div><b class="hm-kpi-v">${value}</b><p>${sub}</p>${extraHtml || ''}</div>`;
        const dChip = k.delta === 0 ? '<em class="flat">— مثل الفترة نفسها</em>' : `<em class="${k.delta > 0 ? 'up' : 'down'}">${k.delta > 0 ? '▲' : '▼'} <span class="en-num">${Math.abs(k.delta)}%</span></em> عن نفس الفترة من ${k.prevName}`;
        const tot = Math.max(k.act + k.hold, 1);
        return `<section class="hm-kpis">
            ${tile(2, 'mint', 'payments', 'المحصّل هذا الشهر', money(k.cur), dChip, spark(k.ser))}
            ${tile(3, 'amber', 'hourglass_top', 'مستحقات قائمة', money(k.pendSum), `${plural(k.pendN, 'فاتورة', 'فاتورتان', 'فواتير', 'فاتورة')}${k.overdue ? ` · <em class="down">${k.overdue} متأخرة</em>` : ' · كلها حديثة'}`)}
            ${tile(4, 'violet', 'rocket_launch', 'مشاريع جارية', `<span class="en-num">${k.act}</span>`, `${k.week} تسليم خلال أسبوع${k.late ? ` · <em class="down">${k.late} متأخر</em>` : ''}`,
                `<div class="hm-split"><i style="flex:${k.act - k.late}" class="ok"></i><i style="flex:${k.late}" class="late"></i><i style="flex:${k.hold}" class="hold"></i></div>`)}
            ${tile(5, 'blue', 'request_quote', 'عروض بانتظار القرار', extra.loaded ? money(k.liveSum) : '<span class="hm-skel"></span>', extra.loaded ? `${plural(k.live.length, 'عرض', 'عرضان', 'عروض', 'عرضًا')}${k.approved ? ` · <em class="up">${k.approved} موافقة</em>` : ''}` : 'جاري التحميل...')}
        </section>`;
    }
    function focusCard(items) {
        const row = x => `<li class="hm-f ${x.cls}"><span class="hm-f-ic">${ic(x.icon)}</span><div class="hm-f-t"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div>
            ${x.act.wa ? `<a class="hm-btn sm wa" href="${esc(x.act.wa)}" target="_blank" rel="noopener">${ic('chat')} ${x.act.t}</a>`
                : `<button type="button" class="hm-btn sm" data-hm="${x.act.do}" data-i="${x.act.i != null ? x.act.i : ''}" data-k="${esc(x.act.k || '')}" data-page="${esc(x.act.page || '')}">${x.act.t}</button>`}</li>`;
        return `<section class="hm-card hm-focus" style="--i:6">
            <header><h3>${ic('bolt')} مركز اليوم ${items.length ? `<em class="en-num">${items.length}</em>` : ''}</h3><small>ما يحتاج انتباهك الآن، مرتّبًا حسب الأولوية</small></header>
            ${items.length ? `<ol class="hm-flist">${items.slice(0, 8).map(row).join('')}</ol>${items.length > 8 ? `<p class="hm-more">و${plural(items.length - 8, 'أمر آخر', 'أمران آخران', 'أمور أخرى', 'أمرًا آخر')}</p>` : ''}`
                : `<div class="hm-calm">${ic('self_improvement')}<b>كل شيء تحت السيطرة</b><p>لا تسليمات عاجلة ولا ملاحظات معلّقة. استمتع بيومك ✨</p></div>`}
        </section>`;
    }
    function weekCard() {
        const t = today(), days = [];
        for (let k = 0; k < 7; k++) { const d = new Date(t); d.setDate(t.getDate() + k); days.push(d); }
        const late = openProjects().filter(p => p.status === ACTIVE && daysTo(p.deadline) !== null && daysTo(p.deadline) < 0);
        const chip = (p, cls) => { const ty = typeOf(p); return `<button type="button" class="hm-wchip ${cls || ''}" style="--hue:${ty.hue}" data-hm="proj" data-i="${openIdx(p)}" title="${esc(p.name)} — ${esc(p.client || '')}">${ic(ty.ic)}<span>${esc(p.name)}</span></button>`; };
        const total = days.reduce((a, d) => a + openProjects().filter(p => p.deadline === ymd(d)).length, 0);
        return `<section class="hm-card hm-week" style="--i:8">
            <header><h3>${ic('date_range')} الأيام السبعة القادمة <em class="en-num">${total}</em></h3><button type="button" class="hm-link" data-hm="page" data-page="projects">التقويم الكامل ${ic('arrow_back')}</button></header>
            <div class="hm-days">${days.map((d, k) => {
                const items = openProjects().filter(p => p.deadline === ymd(d));
                return `<div class="hm-day${k === 0 ? ' today' : ''}${items.length ? ' has' : ''}">
                    <div class="hm-day-h"><small>${k === 0 ? 'اليوم' : k === 1 ? 'غدًا' : WEEK[d.getDay()]}</small><b class="en-num">${d.getDate()}</b></div>
                    <div class="hm-day-b">${k === 0 ? late.map(p => chip(p, 'late')).join('') : ''}${items.map(p => chip(p, p.status === HOLD ? 'hold' : '')).join('') || (k === 0 && late.length ? '' : '<span class="hm-free">—</span>')}</div>
                </div>`;
            }).join('')}</div>
        </section>`;
    }
    function activeCard() {
        return `<section class="hm-card hm-active" style="--i:7">
            <header><h3>${ic('rocket_launch')} المشاريع النشطة</h3><button type="button" class="hm-link" data-hm="page" data-page="projects">كل المشاريع ${ic('arrow_back')}</button></header>
            <div id="dash-active-projects-list" class="dp-list"></div>
            ${openProjects().filter(p => p.status === ACTIVE).length < 4 ? `<div class="hm-room">${ic('add_circle')}<b>جدولك يتّسع لمشروع جديد</b><p>${openProjects().filter(p => p.status === ACTIVE).length ? 'عندك مساحة لاستقبال عمل إضافي هذا الأسبوع.' : 'لا مشاريع جارية الآن — ابدأ مشروعك القادم.'}</p><button type="button" class="hm-btn sm" data-hm="new-project">${ic('add')} مشروع جديد</button></div>` : ''}
            ${(() => { const act = openProjects().filter(p => p.status === ACTIVE), val = openProjects().reduce((s, p) => s + (parseFloat(p.value) || 0), 0);
                const avg = act.length ? Math.round(act.reduce((s, p) => s + (parseInt(p.progress) || 0), 0) / act.length) : 0;
                return act.length ? `<footer class="hm-card-foot"><span>${ic('payments')} قيمة الجارية <b>${money(val)}</b></span><span>${ic('donut_large')} متوسط الإنجاز <b class="en-num">${avg}%</b></span></footer>` : ''; })()}
        </section>`;
    }
    function chartCard() {
        const all = I().filter(i => i.status === PAID).reduce((s, i) => s + amount(i), 0);
        const ser = series(12), best = ser.reduce((a, x) => (x.v > a.v ? x : a), ser[0] || { v: 0, m: 0 });
        return `<section class="hm-card hm-chart" style="--i:9">
            <header><div><h3>${ic('monitoring')} الإيرادات — آخر 12 شهرًا</h3><small>إجمالي المحصّل منذ البداية <b id="dash-total-revenue">${money(all)}</b>${best && best.v ? ` · أفضل شهر ${MONTHS[best.m]}` : ''}</small></div>
                <div class="rc-legend"><span>المحصّل شهريًا</span><span class="g">الهدف الشهري</span></div></header>
            <div id="revenue-chart-container" class="rc-host"></div>
        </section>`;
    }
    function clientsCard() {
        const paidAll = C().map(c => ({ c, v: I().filter(i => (i.client === c.company || i.client === c.name) && i.status === PAID).reduce((s, i) => s + amount(i), 0) }))
            .filter(x => x.v > 0).sort((a, b) => b.v - a.v);
        const rows = paidAll.slice(0, 4), rest = paidAll.slice(4).reduce((a, x) => a + x.v, 0);
        const max = rows.length ? rows[0].v : 1, total = paidAll.reduce((a, x) => a + x.v, 0) || 1;
        const hue = s => [160, 220, 262, 38, 330, 190][[...String(s || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 6];
        // دائرة حصص الإيراد: تتمدّد في المساحة المتاحة فتتوازن البطاقة مع المشاريع النشطة بجانبها
        const r = 54, circ = 2 * Math.PI * r;
        let acc = 0;
        const segs = rows.map(x => ({ v: x.v, col: `hsl(${hue(x.c.company || x.c.name)} 70% 60%)` })).concat(rest ? [{ v: rest, col: 'rgba(169,178,216,.45)' }] : []);
        const donut = rows.length ? `<div class="hm-donut"><svg viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="${r}" class="track"/>${segs.map(sg => {
                const len = sg.v / total * circ, gap = segs.length > 1 ? 2 : 0, el = `<circle cx="70" cy="70" r="${r}" stroke="${sg.col}" stroke-dasharray="${Math.max(len - gap, 0.5).toFixed(1)} ${(circ - Math.max(len - gap, 0.5)).toFixed(1)}" stroke-dashoffset="${(-acc).toFixed(1)}"/>`;
                acc += len; return el; }).join('')}</svg>
            <div class="hm-donut-t"><small>إجمالي المحصّل</small><b>${money(total)}</b><small class="en-num">${plural(paidAll.length, 'عميل واحد', 'عميلان', 'عملاء', 'عميلًا')}</small></div></div>` : '';
        return `<section class="hm-card hm-clients" style="--i:10">
            <header><h3>${ic('workspace_premium')} أفضل العملاء</h3><button type="button" class="hm-link" data-hm="page" data-page="clients">الكل ${ic('arrow_back')}</button></header>
            ${donut}
            ${rows.length ? `<ol class="hm-clist">${rows.map((x, n) => { const name = x.c.company || x.c.name || ''; return `<li style="--hue:${hue(name)}">
                <span class="hm-rank en-num">${n + 1}</span><span class="hm-av">${esc(name.trim().charAt(0))}</span>
                <div class="hm-cl-t"><b>${esc(name)}</b><span class="hm-bar"><i style="width:${Math.max(6, x.v / max * 100)}%"></i></span></div>
                <div class="hm-cl-v"><b>${money(x.v)}</b><small class="en-num">${Math.round(x.v / total * 100)}%</small></div></li>`; }).join('')}</ol>`
                : `<p class="hm-empty">${ic('group')} لا توجد مدفوعات بعد</p>`}
            ${(() => { const all = C(), month = Date.now() - 30 * 864e5, fresh = all.filter(c => (Date.parse(c.dateAdded || '') || 0) >= month).length;
                const paying = C().map(c => I().filter(i => (i.client === c.company || i.client === c.name) && i.status === PAID).reduce((s, i) => s + amount(i), 0)).filter(Boolean);
                const avg = paying.length ? paying.reduce((a, v) => a + v, 0) / paying.length : 0;
                return all.length ? `<footer class="hm-card-foot"><span>${ic('group')} <b class="en-num">${all.length}</b> عميل${fresh ? ` · <b class="en-num">${fresh}</b> جديد هذا الشهر` : ''}</span>${avg ? `<span>${ic('person_check')} متوسط ما يدفعه العميل <b>${money(avg)}</b></span>` : ''}</footer>` : ''; })()}
        </section>`;
    }
    function timeCard() {
        const t = today(), start = new Date(t); start.setDate(t.getDate() - t.getDay());
        const hours = [0, 0, 0, 0, 0, 0, 0], byProj = {};
        extra.logs.forEach(l => {
            const d = new Date(l.start);
            if (isNaN(d) || d < start) return;
            const k = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 864e5);
            if (k < 0 || k > 6) return;
            const h = (+l.seconds || 0) / 3600;
            hours[k] += h;
            if (l.projectName) byProj[l.projectName] = (byProj[l.projectName] || 0) + h;
        });
        const total = hours.reduce((a, h) => a + h, 0), max = Math.max(...hours, 1), top = Object.entries(byProj).sort((a, b) => b[1] - a[1])[0];
        const fmt = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + ':' + pad(m % 60); };
        return `<section class="hm-card hm-time" style="--i:11">
            <header><h3>${ic('timer')} وقتك هذا الأسبوع</h3><button type="button" class="hm-link" data-hm="page" data-page="time">تتبّع الوقت ${ic('arrow_back')}</button></header>
            ${!extra.loaded ? '<div class="hm-skel big"></div>' : total ? `<div class="hm-time-top"><b class="en-num">${fmt(total)}</b><small>ساعة عمل${top ? ` · أكثرها على «${esc(top[0])}»` : ''}</small></div>
                <div class="hm-bars">${hours.map((h, k) => `<div class="${k === t.getDay() ? 'today' : ''}"><span class="v en-num">${h ? fmt(h) : ''}</span><i style="height:${Math.max(4, h / max * 100)}%"></i><small>${WEEK_S[k]}</small></div>`).join('')}</div>`
                : `<div class="hm-calm small">${ic('play_circle')}<b>لم تسجّل وقتًا هذا الأسبوع</b><p>شغّل المؤقت على مشروعك لتعرف كم تستغرق كل مهمة.</p><button type="button" class="hm-btn sm" data-hm="page" data-page="time">ابدأ المؤقت</button></div>`}
        </section>`;
    }
    function pulseCard() {
        const all = P(), done = all.filter(p => p.status === DONE);
        const types = {};
        all.forEach(p => { const t = typeOf(p).t; types[t] = (types[t] || 0) + 1; });
        const topT = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
        const vals = all.map(p => parseFloat(p.value) || 0).filter(Boolean), avg = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 0;
        const paid = I().filter(i => i.status === PAID).reduce((s, i) => s + amount(i), 0), pend = pendingInv().reduce((s, i) => s + amount(i), 0);
        const rate = paid + pend ? Math.round(paid / (paid + pend) * 100) : 0;
        const durs = all.map(p => { const a = parse(p.startDate), b = parse(p.deadline); return a && b && b >= a ? Math.round((b - a) / 864e5) : null; }).filter(x => x !== null);
        const dur = durs.length ? Math.round(durs.reduce((a, x) => a + x, 0) / durs.length) : 0;
        const ins = [
            topT ? ['category', 'أكثر عمل تطلبه', topT[0], `${Math.round(topT[1] / all.length * 100)}% من مشاريعك`] : null,
            avg ? ['sell', 'متوسط قيمة المشروع', money(avg), `من ${plural(vals.length, 'مشروع', 'مشروعين', 'مشاريع', 'مشروعًا')}`] : null,
            ['percent', 'نسبة التحصيل', `<span class="en-num">${rate}%</span>`, 'من إجمالي ما أصدرته من فواتير'],
            dur ? ['schedule', 'متوسط مدة التنفيذ', plural(dur, 'يوم', 'يومان', 'أيام', 'يومًا'), `أنجزت ${plural(done.length, 'مشروعًا واحدًا', 'مشروعين', 'مشاريع', 'مشروعًا')}`] : null
        ].filter(Boolean);
        return `<section class="hm-card hm-pulse" style="--i:12">
            <header><h3>${ic('insights')} نبض الاستوديو</h3><small>رؤى من بياناتك</small></header>
            <div class="hm-ins">${ins.map(([i, k, v, s]) => `<div><span class="hm-ins-ic">${ic(i)}</span><small>${k}</small><b>${v}</b><p>${s}</p></div>`).join('')}</div>
        </section>`;
    }

    // ── الرسم ──
    let first = true, tick = 0;
    function render() {
        const root = document.getElementById('hm-root');
        if (!root) return;
        loadExtra();
        const items = focus(), k = kpis();
        const [hello, gic] = greet();
        root.innerHTML = `<div class="hm-grid${first ? ' intro' : ''}">
            <section class="hm-hero" style="--i:0">
                <div class="hm-aurora" aria-hidden="true"><i></i><i></i><i></i></div>
                <div class="hm-hero-in">
                    <small class="hm-date">${ic(gic)} ${dates()}</small>
                    <h1>${hello}، <span>رنان</span></h1>
                    <p class="hm-brief">${brief(items, k)}</p>
                    <div class="hm-quick">
                        <button type="button" class="hm-q main" data-hm="new-project">${ic('add_task')}<span>مشروع جديد</span></button>
                        <button type="button" class="hm-q" data-hm="new-invoice">${ic('receipt_long')}<span>فاتورة</span></button>
                        <button type="button" class="hm-q" data-hm="new-offer">${ic('request_quote')}<span>عرض سعر</span></button>
                        <button type="button" class="hm-q" data-hm="new-client">${ic('person_add')}<span>عميل</span></button>
                        <button type="button" class="hm-q icon" data-hm="bank" title="الحساب البنكي" aria-label="الحساب البنكي">${ic('account_balance')}</button>
                    </div>
                </div>
            </section>
            ${goalCard(k)}
            ${kpiTiles(k)}
            ${focusCard(items)}
            ${weekCard()}
            ${activeCard()}
            ${clientsCard()}
            ${chartCard()}
            ${timeCard()}
            ${pulseCard()}
        </div>`;
        if (window.ProjectsUI && ProjectsUI.active) ProjectsUI.active(P());
        const months = MONTHS;
        if (window.RevenueChart) RevenueChart.render(document.getElementById('revenue-chart-container'), { invoices: I(), goal: goal(), onPick: d => pickMonth(d, months) });
        requestAnimationFrame(() => requestAnimationFrame(() => {
            root.querySelectorAll('.hm-ring .bar').forEach(b => { b.style.strokeDashoffset = b.style.getPropertyValue('--off'); });
            if (first) countUp(root);
            first = false;
        }));
    }
    // النقر على شهر في الرسم: بطاقة الهدف تعرض ذلك الشهر
    function pickMonth(d, months) {
        const card = document.querySelector('.hm-goal');
        if (!card) return;
        const g = goal(), pct = Math.round(d.v / g * 100);
        card.querySelector('h3').innerHTML = `${ic('flag')} ${months[d.m]} <span class="en-num">${d.y || ''}</span>`;
        card.querySelector('.hm-ring-t b').textContent = pct;
        card.querySelector('.hm-goal-nums div b').innerHTML = money(d.v);
        const bar = card.querySelector('.hm-ring .bar'), c = 2 * Math.PI * 54;
        bar.style.strokeDashoffset = (c - Math.min(pct, 100) / 100 * c).toFixed(1);
        card.querySelector('.hm-goal-tip').innerHTML = `${ic('history')} شهر سابق — ${pct >= 100 ? 'حقق الهدف 🎉' : 'وصل إلى ' + pct + '% من الهدف'} · <button type="button" class="hm-link" data-hm="goal-reset">العودة للشهر الحالي</button>`;
    }
    function countUp(root) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        root.querySelectorAll('[data-count]').forEach(el => {
            const to = +el.dataset.count, t0 = performance.now();
            const step = t => { const p = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e); if (p < 1) requestAnimationFrame(step); };
            requestAnimationFrame(step);
        });
    }
    // إعادة رسم خفيفة حين تتغيّر البيانات وهي ظاهرة
    function soft() {
        clearTimeout(tick);
        tick = setTimeout(() => { const pg = document.getElementById('dashboard-page'); if (pg && !pg.classList.contains('hidden')) render(); }, 200);
    }

    // ── الأحداث ──
    document.addEventListener('click', e => {
        const b = e.target.closest('#hm-root [data-hm]');
        if (!b) return;
        const a = b.dataset.hm;
        if (a === 'proj' && b.dataset.i !== '') return window.openProjectModal('edit', +b.dataset.i);
        if (a === 'proof') { const i = P().findIndex(p => p.rowIndex === b.dataset.k); if (i > -1) window.openProjectModal('edit', i, { focus: 'proof' }); return; }
        if (a === 'page') return switchPage(b.dataset.page);
        if (a === 'new-project') return window.openProjectModal('new');
        if (a === 'new-invoice') { switchPage('invoices'); return setTimeout(() => window.openInvoiceModal && openInvoiceModal('new'), 60); }
        if (a === 'new-offer') { switchPage('proposals'); return setTimeout(() => window.Studio && Studio.P && Studio.P.edit && Studio.P.edit(null), 120); }
        if (a === 'new-client') return window.openClientModal && openClientModal('new');
        if (a === 'bank') return window.openBankSettingsModal && openBankSettingsModal();
        if (a === 'goal-reset') return render();
        const card = b.closest('.hm-goal');
        if (a === 'goal' && card) { const f = card.querySelector('.hm-goal-edit'); f.hidden = !f.hidden; if (!f.hidden) f.querySelector('input').focus(); return; }
        if (a === 'goal-x' && card) { card.querySelector('.hm-goal-edit').hidden = true; return; }
    });
    document.addEventListener('submit', e => {
        const f = e.target.closest('#hm-root .hm-goal-edit');
        if (!f) return;
        e.preventDefault();
        const v = Math.round(parseFloat(f.querySelector('input').value) || 0);
        if (v < 100) return;
        extra.goal = v;
        if (window.db) window.db.ref('settings/monthly_goal').set(v).catch(() => null);
        render();
        if (window.ProjectsPage && ProjectsPage.toast) ProjectsPage.toast('حُفظ هدف الشهر: ' + num(v) + ' ر.س');
    });

    window.HomeUI = { render, soft, goal, reload: () => { loadedAt = 0; return loadExtra(); } };
})();
