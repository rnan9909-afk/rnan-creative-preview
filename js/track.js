// صفحة تتبّع المشروع المستقلة (track.html?c=RN-XXXXX): يفتحها العميل من الرابط الذي ترسله الإدارة، بعيدًا عن الصفحة الرئيسية.
// تعرض حالة المشروع ومراحله ونسبة إنجازه مباشرة (تتحدّث وحدها)، وتُبرز «التصميم جاهز لمراجعتك» حين يُرفع تصميم.
// البيانات: track/<code> (عام)، ومراجعة التصميم proofs/<token> بالرمز المحفوظ في track/<code>/review.
(function () {
    const $ = s => document.querySelector(s);
    const E = s => (window.RNAN ? RNAN.esc(s) : String(s == null ? '' : s));
    const ic = (n, x) => (window.icon ? window.icon(n, x) : '');
    const params = new URLSearchParams(location.search);
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const date = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.getDate() + ' ' + MONTHS[d.getMonth()]; };
    const main = () => $('#tk');
    let code = '', trackRef = null, reviewRef = null, reviewKey = '', T = null, R = null;

    function find(msg) {
        return `<section class="tk-find card">
            <span class="tk-find-ic">${ic('search')}</span>
            <h1>تتبّع مشروعك</h1>
            <p>${msg || 'أدخل رقم التتبّع الذي وصلك من رنان لتعرف مرحلة مشروعك.'}</p>
            <form class="track-form" id="tk-form" autocomplete="off">
                <span class="prefix">RN-</span>
                <input id="tk-input" aria-label="رقم التتبع" placeholder="7K3QX" maxlength="12" spellcheck="false" value="${E(code.replace('RN-', ''))}">
                <button class="btn btn-primary" type="submit">تتبّع ${ic('arrow')}</button>
            </form>
        </section>`;
    }

    // ── «التصميم جاهز لمراجعتك» في أعلى الصفحة ──
    function hero() {
        const rv = T && T.review;
        if (!rv || !rv.k || (rv.until && Date.parse(rv.until) < Date.now()) || !R || !R.versions || R.filesDeleted) return '';
        const url = RNAN.pageUrl('review.html', { k: rv.k });
        const cur = R.current;
        const open = Object.values(R.comments || {}).filter(c => c.v === cur && c.by !== 'admin' && !c.done).length;
        if (R.approval) return `<section class="tk-hero ok">
                <span class="tk-hero-ic">${ic('check')}</span>
                <div class="tk-hero-t"><b>اعتمدت التصميم — شكرًا لك!</b><span>نجهّز ملفاتك النهائية الآن، وسنتواصل معك لتسليمها.</span></div>
                <a class="btn btn-ghost" href="${E(url)}">عرض التصميم</a>
            </section>`;
        if (open) return `<section class="tk-hero sent">
                <span class="tk-hero-ic">${ic('send')}</span>
                <div class="tk-hero-t"><b>وصلت ملاحظاتك للمصمم</b><span>نعمل على التعديل، وستصلك النسخة المعدّلة هنا للمراجعة.</span></div>
                <a class="btn btn-ghost" href="${E(url)}">مراجعة التصميم</a>
            </section>`;
        const n = Object.keys(R.versions).length;
        return `<a class="tk-hero ready" href="${E(url)}">
                <span class="tk-hero-ic">${ic('eye')}<i></i></span>
                <div class="tk-hero-t">
                    <small>${ic('sparkle')} ${n > 1 ? 'وصلت النسخة المعدّلة' : 'جديد'}</small>
                    <b>التصميم جاهز لمراجعتك</b>
                    <span>شاهد التصميم واضغط على أي مكان فيه لتكتب ملاحظتك، أو اعتمده إن كان مناسبًا.${rv.until ? ' متاح حتى ' + date(rv.until) + '.' : ''}</span>
                </div>
                <span class="btn btn-primary">شاهد التصميم الآن ${ic('arrow')}</span>
            </a>`;
    }

    function card() {
        const t = T, stage = parseInt(t.stage) || 0;
        const stateCls = t.state === 'hold' ? 'hold' : (t.state === 'cancelled' ? 'cancelled' : '');
        const stages = RNAN.STAGES.map((s, i) => {
            const cls = i < stage || t.state === 'done' ? 'done' : (i === stage ? 'now ' + stateCls : '');
            const inner = cls.startsWith('done') ? ic('check') : (cls.includes('cancelled') ? ic('x') : `<span class="en">${i + 1}</span>`);
            return `<div class="stage ${cls}"><span class="stage-dot">${inner}</span><div><b>${s.title}</b><span>${s.hint}</span></div></div>`;
        }).join('');
        const steps = Array.isArray(t.steps) ? t.steps : [];
        const pr = t.state === 'done' ? 100 : (parseInt(t.progress) || 0);
        const days = RNAN.daysUntil(t.deadline);
        return `<section class="card tk-card">
                <div class="tr-head">
                    <div><small class="mono">${E(t.code)}</small><h1>${E(t.title)}</h1></div>
                    <span class="status-badge ${stateCls}">${E(t.label)}</span>
                </div>
                <div class="stages">${stages}</div>
                ${stage >= 2 ? `<div class="tr-progress">
                    <div class="tr-progress-top"><span>نسبة الإنجاز</span><b class="en">${pr}%</b></div>
                    <div class="bar"><i style="width:${pr}%"></i></div>
                    ${steps.length ? `<ul class="substeps">${steps.map(s => `<li class="${s.done ? 'done' : ''}"><span class="ck">${s.done ? ic('check') : ''}</span>${E(s.text)}</li>`).join('')}</ul>` : ''}
                </div>` : ''}
                <div class="tr-meta">
                    <div><span>تاريخ الطلب</span><b>${RNAN.fmtDate(t.createdAt)}</b></div>
                    ${t.deadline ? `<div><span>موعد التسليم</span><b>${RNAN.fmtDate(t.deadline)}${days !== null && t.state !== 'done' && days >= 0 ? ` <small>(${RNAN.inDays(days)})</small>` : ''}</b></div>` : ''}
                    <div><span>آخر تحديث</span><b>${RNAN.fmtDate(t.updatedAt)}</b></div>
                </div>
                <p class="tk-live">${ic('clock')} تتحدّث هذه الصفحة تلقائيًا مع كل تقدّم في مشروعك</p>
            </section>`;
    }

    function render() {
        if (!T) return;
        document.title = (T.title || 'مشروعك') + ' — تتبّع | رنان';
        main().innerHTML = hero() + card() + `<p class="tk-other"><button type="button" id="tk-again">${ic('search')} تتبّع رقمًا آخر</button></p>`;
    }

    function watchReview() {
        const k = T && T.review && T.review.k;
        if (k === reviewKey) return;
        if (reviewRef) reviewRef.off();
        reviewKey = k || '';
        R = null;
        if (!k) return;
        reviewRef = db.ref('proofs/' + k);
        reviewRef.on('value', s => { R = s.val(); render(); }, () => { R = null; render(); });
    }

    function open(raw) {
        code = RNAN.normalizeCode(raw);
        if (trackRef) trackRef.off();
        if (reviewRef) { reviewRef.off(); reviewRef = null; reviewKey = ''; }
        T = null; R = null;
        if (!code || code.length < 6) { main().innerHTML = find(raw ? 'أدخل رقم التتبّع كاملًا، مثل <b class="mono">RN-7K3QX</b>.' : ''); return; }
        if (params.get('c') !== code) history.replaceState(null, '', RNAN.pageUrl('track.html', { c: code }));
        main().innerHTML = `<div class="tk-skel"><div class="skeleton"></div><div class="skeleton"></div></div>`;
        const timer = setTimeout(() => { if (!T) main().innerHTML = find('<b>تعذّر الاتصال.</b> تأكّد من الإنترنت وحاول مرة أخرى.'); }, 20000);
        trackRef = db.ref('track/' + code);
        trackRef.on('value', snap => {
            clearTimeout(timer);
            T = snap.val();
            if (!T) { main().innerHTML = find(`<b>لم نجد مشروعًا بالرقم <span class="mono">${E(code)}</span>.</b> تأكّد من الرقم، أو تواصل معنا وسنساعدك.`); return; }
            render();
            watchReview();
        }, () => { clearTimeout(timer); main().innerHTML = find('<b>تعذّر الاتصال.</b> تأكّد من الإنترنت وحاول مرة أخرى.'); });
    }

    document.addEventListener('submit', e => {
        if (e.target.id !== 'tk-form') return;
        e.preventDefault();
        open($('#tk-input').value);
    });
    document.addEventListener('click', e => {
        if (e.target.closest('#tk-again')) { code = ''; if (trackRef) trackRef.off(); main().innerHTML = find(); $('#tk-input').focus(); }
    });

    async function contact() {
        try {
            const [site, phone] = await Promise.all([db.ref('settings/site').once('value'), db.ref('settings/phone').once('value')]);
            const s = site.val() || {}, n = s.whatsapp || s.phone || phone.val() || '';
            // الرقم الافتراضي الوهمي في النظام لا يُعرض
            if (RNAN.intlPhone(n).length < 9 || /^0?9665{9}$/.test(String(n))) return;
            const a = $('#tk-wa');
            a.href = RNAN.waLink(n, `السلام عليكم، أستفسر عن مشروعي${code ? ' برقم ' + code : ''}`);
            a.hidden = false;
        } catch (e) { /* يبقى الزر مخفيًا */ }
    }

    function start() {
        if (!window.db || !window.RNAN) { main().innerHTML = find('<b>تعذّر الاتصال.</b> أعد تحميل الصفحة.'); return; }
        open(params.get('c') || params.get('track') || '');
        contact();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
