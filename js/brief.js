// صفحة نموذج متطلبات المشروع للعميل (brief.html?k=TOKEN): أسئلة حسب نوع العمل، حفظ مسودة تلقائي على الجهاز،
// وإرسال الإجابات إلى briefs/<TOKEN>/answers فتصل للمصمم في نافذة المشروع. يمكن تعديل الإجابات لاحقًا من الرابط نفسه.
(function () {
    const token = new URLSearchParams(location.search).get('k');
    const main = document.getElementById('bf');
    const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const icon = n => `<svg class="icon"><use href="#i-${n}"/></svg>`;
    const KEY = 'rnan-brief-' + token;
    const localDay = iso => { const d = new Date(iso), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
    let brief = null, qs = [], answers = {}, editing = false;

    const draft = {
        get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
        set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* التخزين غير متاح */ } },
        clear() { try { localStorage.removeItem(KEY); } catch (e) { /* */ } }
    };
    const fail = m => { main.innerHTML = `<div class="card bf-msg">${icon('alert')}<p>${m}</p></div>`; };

    function field(q) {
        const v = answers[q.k];
        const label = `<span class="bf-q">${E(q.t)}${q.req ? ' <em>*</em>' : ''}</span>`;
        if (q.type === 'area') return `<label class="bf-f">${label}<textarea class="input" rows="3" data-k="${q.k}" placeholder="${E(q.ph || '')}"${q.dir ? ` dir="${q.dir}"` : ''} maxlength="2000">${E(v || '')}</textarea></label>`;
        if (q.type === 'chips' || q.type === 'multi') {
            const sel = Array.isArray(v) ? v : (v ? [v] : []);
            return `<div class="bf-f" role="group" aria-label="${E(q.t)}">${label}<div class="bf-chips" data-k="${q.k}" data-multi="${q.type === 'multi' ? 1 : 0}">
                ${q.opts.map(o => `<button type="button" class="bf-chip${sel.includes(o) ? ' on' : ''}" data-v="${E(o)}" aria-pressed="${sel.includes(o)}">${E(o)}</button>`).join('')}</div></div>`;
        }
        return `<label class="bf-f">${label}<input class="input" data-k="${q.k}" value="${E(v || '')}" placeholder="${E(q.ph || '')}"${q.dir ? ` dir="${q.dir}"` : ''} maxlength="300"></label>`;
    }
    function progress() {
        const req = qs.filter(q => q.req), done = qs.filter(q => filled(answers[q.k])).length;
        const bar = main.querySelector('.bf-bar i'), txt = main.querySelector('.bf-prog small');
        if (bar) bar.style.width = Math.round(done / qs.length * 100) + '%';
        if (txt) txt.textContent = `أجبت عن ${done} من ${qs.length}${req.some(q => !filled(answers[q.k])) ? ' · الأسئلة المعلّمة بـ * مطلوبة' : ''}`;
    }
    const filled = v => Array.isArray(v) ? v.length > 0 : String(v || '').trim().length > 0;

    function render() {
        const answered = brief.status === 'answered' && !editing;
        if (answered) {
            main.innerHTML = `<section class="card bf-done">${icon('check')}<h1>شكرًا لك! وصلتنا إجاباتك</h1>
                <p>أرسلت متطلبات مشروع «${E(brief.projectName || '')}» ${brief.answeredAt ? 'في ' + RNAN.fmtDate(localDay(brief.answeredAt)) : ''}. سنبدأ التصميم بناءً عليها ونتواصل معك قريبًا.</p>
                <button type="button" class="btn btn-ghost" data-bf="edit">${icon('pen')} تعديل الإجابات</button></section>`;
            return;
        }
        const groups = BriefQ.GROUPS.filter(g => qs.some(q => q.g === g));
        main.innerHTML = `
            <section class="card bf-head">
                <span class="bf-kicker">${icon('sparkle')} نموذج متطلبات المشروع</span>
                <h1>${E(brief.projectName || 'مشروعك')}</h1>
                <p>أهلًا ${E(brief.client || '')} 👋 — إجاباتك تساعدنا نفهم مشروعك من البداية ونختصر جولات التعديل. تُحفظ إجاباتك على جهازك تلقائيًا، فلا بأس لو أكملت لاحقًا.</p>
                <div class="bf-prog"><span class="bf-bar"><i></i></span><small></small></div>
            </section>
            <form class="bf-form" novalidate>
                ${groups.map((g, n) => `<section class="card bf-sec"><h2><span class="en">${n + 1}</span> ${E(g)}</h2>${qs.filter(q => q.g === g).map(field).join('')}</section>`).join('')}
                <p class="bf-err" hidden></p>
                <button type="submit" class="btn btn-primary bf-send">${icon('send')} إرسال المتطلبات</button>
            </form>`;
        progress();
    }
    function readForm() {
        main.querySelectorAll('[data-k]').forEach(el => {
            const k = el.dataset.k;
            if (el.classList.contains('bf-chips')) answers[k] = [...el.querySelectorAll('.bf-chip.on')].map(b => b.dataset.v);
            else answers[k] = el.value;
        });
    }
    async function submit(e) {
        e.preventDefault();
        readForm();
        const miss = qs.filter(q => q.req && !filled(answers[q.k]));
        const err = main.querySelector('.bf-err');
        if (miss.length) {
            err.textContent = 'أكمل الأسئلة المطلوبة: ' + miss.map(q => '«' + q.t + '»').join('، ');
            err.hidden = false;
            const el = main.querySelector(`[data-k="${miss[0].k}"]`);
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el.focus) el.focus(); }
            return;
        }
        const btn = main.querySelector('.bf-send');
        btn.disabled = true;
        btn.textContent = 'جارٍ الإرسال...';
        const clean = {};
        qs.forEach(q => { const v = answers[q.k]; if (filled(v)) clean[q.k] = Array.isArray(v) ? v.slice(0, 12).map(x => String(x).slice(0, 80)) : String(v).trim().slice(0, 2000); });
        try {
            const at = new Date().toISOString();
            await window.db.ref('briefs/' + token).update({ answers: clean, status: 'answered', answeredAt: at });
            brief.status = 'answered';
            brief.answeredAt = at;
            editing = false;
            draft.clear();
            render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (x) {
            btn.disabled = false;
            btn.textContent = 'إرسال المتطلبات';
            err.textContent = 'تعذّر الإرسال، تحقّق من الاتصال وأعد المحاولة';
            err.hidden = false;
        }
    }

    main.addEventListener('click', e => {
        const chip = e.target.closest('.bf-chip');
        if (chip) {
            const box = chip.closest('.bf-chips'), multi = box.dataset.multi === '1';
            if (!multi) box.querySelectorAll('.bf-chip').forEach(b => { if (b !== chip) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); } });
            chip.classList.toggle('on');
            chip.setAttribute('aria-pressed', chip.classList.contains('on'));
            readForm(); draft.set(answers); progress();
            return;
        }
        if (e.target.closest('[data-bf="edit"]')) { editing = true; render(); }
    });
    main.addEventListener('input', () => { readForm(); draft.set(answers); progress(); });
    main.addEventListener('submit', submit);

    async function init() {
        if (!token) return fail('الرابط غير مكتمل — اطلب من رنان إرسال رابط النموذج من جديد.');
        try {
            const snap = await window.db.ref('briefs/' + token).once('value');
            brief = snap.val();
        } catch (e) { return fail('تعذّر فتح النموذج، تحقّق من الاتصال ثم أعد تحميل الصفحة.'); }
        if (!brief) return fail('هذا النموذج غير موجود أو أُلغي. تواصل معنا لنرسل لك رابطًا جديدًا.');
        qs = BriefQ.questions(brief.type);
        answers = Object.assign({ brand: brief.client || '' }, brief.answers || {}, draft.get() || {});
        document.title = 'متطلبات «' + (brief.projectName || 'مشروعك') + '» | رنان';
        render();
    }
    const wait = setInterval(() => { if (window.db && window.BriefQ) { clearInterval(wait); init(); } }, 120);
})();
