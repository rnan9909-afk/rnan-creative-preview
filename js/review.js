// صفحة مراجعة التصميم للعميل (review.html?k=TOKEN): يشاهد التصميم محميًا بعلامة مائية باسمه، ويضغط على أي مكان
// ليكتب ملاحظته عليه، أو يعتمد التصميم. البيانات في proofs/<token> والصور في proofFiles/<token>/<id>،
// ويرفعها المصمم من نافذة المشروع (js/proofs.js). ?preview=1 معاينة المصمم: بلا كتابة.
(function () {
    const $ = s => document.querySelector(s);
    const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const icon = n => `<svg class="icon"><use href="#i-${n}"/></svg>`;
    const params = new URLSearchParams(location.search);
    const K = (params.get('k') || '').replace(/[^\w-]/g, '');
    const PREVIEW = params.get('preview') === '1';
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const date = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
    const ago = iso => {
        const m = Math.round((Date.now() - new Date(iso)) / 60000);
        if (!(m >= 0)) return '';
        if (m < 1) return 'الآن';
        if (m < 60) return 'قبل ' + (m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتين' : m + (m <= 10 ? ' دقائق' : ' دقيقة'));
        const h = Math.round(m / 60);
        if (h < 24) return 'قبل ' + (h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h + (h <= 10 ? ' ساعات' : ' ساعة'));
        const d = Math.round(h / 24);
        return 'قبل ' + (d === 1 ? 'يوم' : d === 2 ? 'يومين' : d + (d <= 10 ? ' أيام' : ' يومًا'));
    };
    const ZOOM = '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/></svg>';
    const ZOOM_OUT = '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/></svg>';

    let P = null, ver = null, fileIdx = 0, zoom = false, shellKey = '', seenSent = false, lastLatest = null;
    const cache = {};

    // ── الحماية: لا قائمة حفظ، لا سحب، لا طباعة، وتعتيم عند مغادرة الصفحة أو أزرار التصوير ──
    const shield = $('#rv-shield');
    let shieldTimer = 0;
    function guard(on, ms) {
        clearTimeout(shieldTimer);
        shield.hidden = !on;
        document.body.classList.toggle('rv-shielded', on);
        if (on && ms) shieldTimer = setTimeout(() => guard(false), ms);
    }
    ['contextmenu', 'dragstart', 'selectstart'].forEach(ev => document.addEventListener(ev, e => {
        if (e.target.closest('.rv-view, .rv-thumbs')) e.preventDefault();
    }));
    window.addEventListener('blur', () => guard(true));
    window.addEventListener('focus', () => guard(false));
    document.addEventListener('visibilitychange', () => guard(document.hidden));
    document.addEventListener('keydown', e => {
        const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
        if (k === 'printscreen' || (mod && (k === 's' || k === 'p')) || (e.metaKey && e.shiftKey && ['3', '4', '5', 's'].includes(k))) {
            e.preventDefault();
            guard(true, 1800);
            toast('حفظ التصميم أو تصويره غير متاح — المعاينة محمية بعلامة مائية باسمك');
        }
    });
    document.addEventListener('keyup', e => {
        if ((e.key || '').toLowerCase() === 'printscreen') {
            guard(true, 1800);
            try { navigator.clipboard && navigator.clipboard.writeText(''); } catch (err) { /* لا صلاحية */ }
        }
    });
    window.addEventListener('beforeprint', () => guard(true));
    window.addEventListener('afterprint', () => guard(false));

    let tEl = null, tTimer = 0;
    function toast(m) {
        if (!tEl) { tEl = document.createElement('div'); tEl.className = 'rv-toast'; tEl.setAttribute('role', 'status'); document.body.appendChild(tEl); }
        tEl.textContent = m;
        tEl.classList.add('show');
        clearTimeout(tTimer);
        tTimer = setTimeout(() => tEl.classList.remove('show'), 3800);
    }

    // ── البيانات ──
    const versions = () => Object.entries(P.versions || {}).map(([k, v]) => Object.assign({ k }, v)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const files = v => Object.entries(((P.versions || {})[v] || {}).files || {}).map(([id, f]) => Object.assign({ id }, f)).sort((a, b) => (a.o || 0) - (b.o || 0));
    const notes = v => Object.entries(P.comments || {}).map(([id, c]) => Object.assign({ id }, c)).filter(c => c.v === v).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const expired = () => P.filesDeleted || (P.expiresAt && Date.parse(P.expiresAt) < Date.now());
    const approved = () => !!P.approval;
    const latest = () => P.current || (versions().slice(-1)[0] || {}).k;
    const canWrite = () => !PREVIEW && !approved() && !expired() && ver === latest();

    async function fileData(id) {
        if (cache[id]) return cache[id];
        const snap = await db.ref('proofFiles/' + K + '/' + id).once('value');
        cache[id] = snap.val();
        return cache[id];
    }
    async function draw(canvas, id) {
        const data = await fileData(id);
        if (!data) return false;
        const im = new Image();
        im.src = data;
        await im.decode();
        canvas.width = im.naturalWidth;
        canvas.height = im.naturalHeight;
        canvas.getContext('2d').drawImage(im, 0, 0);
        return true;
    }

    function status() {
        if (approved()) return ['ok', 'تم اعتماد التصميم'];
        if (expired()) return ['off', 'انتهت مدة العرض'];
        const open = notes(latest()).filter(c => c.by !== 'admin' && !c.done).length;
        if (open) return ['sent', 'ملاحظاتك وصلت للمصمم'];
        return ['wait', 'بانتظار رأيك'];
    }

    function render() {
        const main = $('#rv');
        if (!P) return;
        // نسخة جديدة وصلت والعميل على الأحدث: ينتقل إليها
        if (lastLatest && latest() !== lastLatest && ver === lastLatest) { ver = latest(); fileIdx = 0; toast('وصلت نسخة معدّلة من التصميم'); }
        lastLatest = latest();
        if (!ver || !(P.versions || {})[ver]) ver = latest();
        const key = [ver, expired(), approved(), Object.keys((P.versions || {})[ver] ? P.versions[ver].files || {} : {}).join()].join('|');
        if (key !== shellKey) { shellKey = key; shell(main); }
        head();
        side();
        pins();
    }
    function head() {
        const [cls, txt] = status();
        const st = $('.rv-status');
        if (st) { st.className = 'rv-status ' + cls; st.textContent = txt; }
        const vs = versions();
        const sw = $('.rv-vers');
        if (sw) sw.innerHTML = vs.length > 1 ? vs.map((v, n) => `<button type="button" data-ver="${E(v.k)}" class="${v.k === ver ? 'on' : ''}">النسخة <span class="en">${n + 1}</span>${v.k === latest() ? ' · الأحدث' : ''}</button>`).join('') : '';
    }

    function shell(main) {
        const vs = versions(), n = vs.findIndex(v => v.k === ver) + 1;
        const v = (P.versions || {})[ver] || {};
        if (expired()) {
            main.innerHTML = `<section class="rv-card rv-gone">${icon('clock')}<h1>انتهت مدة عرض هذا التصميم</h1><p>حُذفت ملفات المعاينة تلقائيًا بعد انتهاء مدتها. إن احتجت مشاهدته مجددًا تواصل مع فريق رنان.</p>${P.approval ? `<p class="rv-ok-line">${icon('check')} سبق اعتماده بتاريخ ${date(P.approval.at)}</p>` : ''}</section>`;
            return;
        }
        const fs = files(ver);
        fileIdx = Math.min(fileIdx, Math.max(0, fs.length - 1));
        main.innerHTML = `
            <section class="rv-head">
                <div class="rv-title">
                    <small>${P.code ? `<span class="en">${E(P.code)}</span> · ` : ''}النسخة <span class="en">${n}</span>${vs.length > 1 ? ' من ' + vs.length : ''}</small>
                    <h1>${E(P.title || 'التصميم')}</h1>
                    <p>${E(P.client || '')}${v.at ? ' · أُرسلت ' + ago(v.at) : ''}</p>
                </div>
                <span class="rv-status"></span>
            </section>
            ${PREVIEW ? `<p class="rv-banner prev">${icon('eye')} معاينة المصمم — هكذا يرى العميل الصفحة، ولا تُحفظ أي ملاحظة أو اعتماد من هنا.</p>` : ''}
            ${approved() ? `<section class="rv-banner ok">${icon('check')}<div><b>تم اعتماد التصميم — شكرًا لك!</b><span>اعتمده ${E(P.approval.name || '')} بتاريخ ${date(P.approval.at)}. سيتواصل معك فريق رنان لتسليم الملفات النهائية.</span></div></section>` : ''}
            ${v.note ? `<section class="rv-msg"><span class="rv-av">ر</span><div><b>رسالة المصمم</b><p>${E(v.note)}</p></div></section>` : ''}
            <div class="rv-vers" role="tablist" aria-label="النسخ"></div>
            <div class="rv-grid">
                <section class="rv-stage">
                    <div class="rv-tools">
                        ${fs.length > 1 ? `<span class="rv-pager"><button type="button" class="rv-ib" data-page="-1" aria-label="السابق">${icon('chevron-right')}</button><b><span class="en" id="rv-page">${fileIdx + 1}</span> / <span class="en">${fs.length}</span></b><button type="button" class="rv-ib" data-page="1" aria-label="التالي">${icon('chevron-left')}</button></span>` : `<span class="rv-file">${E((fs[0] || {}).name || '')}</span>`}
                        <span class="grow"></span>
                        <button type="button" class="rv-ib" data-zoom aria-label="تكبير">${zoom ? ZOOM_OUT : ZOOM}</button>
                    </div>
                    <div class="rv-view${zoom ? ' zoom' : ''}" id="rv-view">
                        <div class="rv-board"><canvas id="rv-canvas" aria-label="التصميم"></canvas><div class="rv-pins" id="rv-pins"></div><div class="rv-wait"><span class="rv-spin"></span></div></div>
                    </div>
                    ${canWrite() ? `<p class="rv-tip">${icon('pin')} اضغط على أي مكان في التصميم لتكتب ملاحظتك عليه</p>` : ''}
                    ${fs.length > 1 ? `<div class="rv-thumbs">${fs.map((f, i) => `<button type="button" data-file="${i}" class="${i === fileIdx ? 'on' : ''}" aria-label="صفحة ${i + 1}"><canvas data-thumb="${E(f.id)}"></canvas><span class="en">${i + 1}</span></button>`).join('')}</div>` : ''}
                </section>
                <aside class="rv-side">
                    <h3>${icon('pin')} الملاحظات <em class="en" id="rv-count">0</em></h3>
                    <ol class="rv-list" id="rv-list"></ol>
                    ${canWrite() ? `<form class="rv-general" id="rv-general">
                        <textarea maxlength="1500" rows="3" placeholder="ملاحظة عامة على التصميم (الألوان، النصوص، الفكرة...)" aria-label="ملاحظة عامة"></textarea>
                        <button type="submit" class="rv-btn ghost">${icon('send')} إرسال الملاحظة</button>
                    </form>` : ''}
                    ${!approved() && ver === latest() ? `<div class="rv-approve-box">
                        <button type="button" class="rv-btn main" data-approve ${PREVIEW ? 'disabled' : ''}>${icon('check')} اعتماد التصميم</button>
                        <p>اعتمد عندما يكون التصميم مناسبًا تمامًا ولا تحتاج تعديلات أخرى.</p>
                    </div>` : ''}
                    ${ver !== latest() ? `<p class="rv-old">${icon('clock')} هذه نسخة سابقة للاطلاع فقط. <button type="button" data-ver="${E(latest())}">اذهب للنسخة الأحدث</button></p>` : ''}
                </aside>
            </div>
            <p class="rv-exp">${icon('shield')} المعاينة بعلامة مائية ولا تُحمَّل · متاحة حتى ${date(P.expiresAt)}</p>
            ${!approved() && ver === latest() && !PREVIEW ? `<div class="rv-dock"><button type="button" class="rv-btn main" data-approve>${icon('check')} اعتماد التصميم</button></div>` : ''}`;
        showFile();
        main.querySelectorAll('[data-thumb]').forEach(c => draw(c, c.dataset.thumb).catch(() => null));
    }
    async function showFile() {
        const fs = files(ver), f = fs[fileIdx];
        const canvas = $('#rv-canvas');
        if (!f || !canvas) return;
        const board = canvas.parentElement;
        board.classList.add('loading');
        const page = $('#rv-page');
        if (page) page.textContent = fileIdx + 1;
        document.querySelectorAll('.rv-thumbs [data-file]').forEach(b => b.classList.toggle('on', +b.dataset.file === fileIdx));
        try {
            const ok = await draw(canvas, f.id);
            board.style.aspectRatio = canvas.width + ' / ' + canvas.height;
            board.style.setProperty('--ar', (canvas.width / canvas.height).toFixed(4));
            if (!ok) board.classList.add('missing');
        } catch (e) { board.classList.add('missing'); }
        board.classList.remove('loading');
        pins();
    }
    function numbered() {
        return notes(ver).filter(c => c.by !== 'admin').map((c, i) => Object.assign({ n: i + 1 }, c));
    }
    function pins() {
        const box = $('#rv-pins');
        if (!box) return;
        const f = files(ver)[fileIdx];
        box.innerHTML = numbered().filter(c => f && c.f === f.id && c.x != null).map(c =>
            `<button type="button" class="rv-pin${c.done ? ' done' : ''}" data-note="${E(c.id)}" style="left:${+c.x}%;top:${+c.y}%" aria-label="ملاحظة ${c.n}"><span class="en">${c.n}</span></button>`).join('');
    }
    function side() {
        const list = $('#rv-list');
        if (!list) return;
        const fs = files(ver), all = numbered();
        $('#rv-count').textContent = all.length;
        list.innerHTML = all.length ? all.map(c => {
            const fi = fs.findIndex(f => f.id === c.f);
            return `<li class="${c.done ? 'done' : ''}" data-note="${E(c.id)}"${fi > -1 ? ` data-goto="${fi}"` : ''}>
                <span class="n en">${c.n}</span>
                <div><p>${E(c.text)}</p><small>${fi > -1 && fs.length > 1 ? 'صفحة <span class="en">' + (fi + 1) + '</span> · ' : c.x == null ? 'ملاحظة عامة · ' : ''}${ago(c.at)}${c.done ? ' · <b>' + icon('check') + ' تم التعديل</b>' : ''}</small></div>
            </li>`;
        }).join('') : `<li class="empty">${canWrite() ? 'لا ملاحظات بعد. اضغط على التصميم لتضيف أول ملاحظة، أو اكتب ملاحظة عامة بالأسفل.' : 'لا توجد ملاحظات على هذه النسخة.'}</li>`;
    }

    // ── كتابة ملاحظة على مكان في التصميم ──
    let dlg = null;
    function sheet(html, onSubmit) {
        close();
        dlg = document.createElement('div');
        dlg.className = 'rv-dlg';
        dlg.innerHTML = `<div class="rv-scrim" data-close></div><form class="rv-dlg-box" novalidate><div class="rv-grab"></div>${html}</form>`;
        document.body.appendChild(dlg);
        requestAnimationFrame(() => requestAnimationFrame(() => dlg && dlg.classList.add('open')));
        dlg.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
        dlg.querySelector('form').addEventListener('submit', e => { e.preventDefault(); onSubmit(dlg.querySelector('form')); });
        dlg.querySelector('form').addEventListener('input', () => { const er = dlg && dlg.querySelector('.rv-err'); if (er) er.hidden = true; });
        const first = dlg.querySelector('textarea, input:not([type=checkbox])');
        if (first) setTimeout(() => first.focus(), 250);
    }
    function close() {
        const tmp = document.querySelector('.rv-pin.tmp');
        if (tmp) tmp.remove();
        if (!dlg) return;
        const d = dlg;
        dlg = null;
        d.classList.remove('open');
        setTimeout(() => d.remove(), 260);
    }
    async function push(note, btn) {
        btn.disabled = true;
        try {
            await db.ref('proofs/' + K + '/comments').push(Object.assign({ v: ver, text: note.text, name: P.client || '', at: new Date().toISOString(), by: 'client' }, note.at ? { f: note.at.f, x: note.at.x, y: note.at.y } : {}));
            close();
            toast('✓ وصلت ملاحظتك للمصمم');
            return true;
        } catch (e) {
            btn.disabled = false;
            toast('تعذّر الإرسال، تحقّق من الاتصال وحاول مجددًا');
            return false;
        }
    }
    function addAt(e) {
        if (!canWrite()) return;
        const board = $('.rv-board');
        const r = board.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100));
        const y = Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100));
        const f = files(ver)[fileIdx];
        if (!f) return;
        const n = numbered().length + 1;
        $('#rv-pins').insertAdjacentHTML('beforeend', `<span class="rv-pin tmp" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%"><span class="en">${n}</span></span>`);
        sheet(`<h3><span class="rv-pin-n en">${n}</span> ملاحظة على هذا المكان</h3>
            <textarea name="t" maxlength="1500" rows="4" placeholder="مثال: كبّر الشعار هنا، أو غيّر هذا اللون للأزرق" required></textarea>
            <div class="rv-dlg-acts"><button type="button" class="rv-btn ghost" data-close>إلغاء</button><button type="submit" class="rv-btn main">${icon('send')} إرسال الملاحظة</button></div>`,
            form => {
                const t = form.t.value.trim();
                if (t.length < 2) { form.t.focus(); return; }
                push({ text: t, at: { f: f.id, x: +x.toFixed(2), y: +y.toFixed(2) } }, form.querySelector('[type=submit]'));
            });
    }

    // ── الاعتماد ──
    function approve() {
        if (PREVIEW || approved()) return;
        const open = numbered().filter(c => !c.done).length;
        const vs = versions(), n = vs.findIndex(v => v.k === latest()) + 1;
        sheet(`<h3>${icon('check')} اعتماد التصميم</h3>
            <p class="rv-dlg-p">ستعتمد <b>النسخة ${n}</b> من «${E(P.title || 'التصميم')}» بشكلها الحالي، وسيبدأ المصمم بتجهيز الملفات النهائية.</p>
            ${open ? `<p class="rv-warn">${icon('alert')} لديك ${open === 1 ? 'ملاحظة واحدة لم تُعدَّل' : open + ' ملاحظات لم تُعدَّل'} بعد في هذه النسخة.</p>` : ''}
            <label class="rv-f"><span>الاسم</span><input name="name" maxlength="80" value="${E(P.client || '')}" autocomplete="name"></label>
            <label class="rv-f"><span>كلمة للمصمم <em>(اختياري)</em></span><textarea name="note" maxlength="600" rows="2" placeholder="شكرًا، التصميم رائع!"></textarea></label>
            <label class="rv-check"><input type="checkbox" name="ok"><span>أؤكد أن التصميم نهائي ولا أحتاج تعديلات أخرى</span></label>
            <p class="rv-err" hidden></p>
            <div class="rv-dlg-acts"><button type="button" class="rv-btn ghost" data-close>ليس الآن</button><button type="submit" class="rv-btn main">${icon('check')} اعتماد</button></div>`,
            async form => {
                const err = form.querySelector('.rv-err');
                const name = form.name.value.trim();
                if (name.length < 2) { err.textContent = 'اكتب اسمك'; err.hidden = false; return; }
                if (!form.ok.checked) { err.textContent = 'أكّد أن التصميم نهائي'; err.hidden = false; return; }
                const btn = form.querySelector('[type=submit]');
                btn.disabled = true;
                try {
                    await db.ref('proofs/' + K + '/approval').set(Object.assign({ name, at: new Date().toISOString(), v: latest() }, form.note.value.trim() ? { note: form.note.value.trim() } : {}));
                    close();
                    toast('🎉 تم اعتماد التصميم، شكرًا لك');
                } catch (e) {
                    btn.disabled = false;
                    err.textContent = 'تعذّر الاعتماد، تحقّق من الاتصال وحاول مجددًا';
                    err.hidden = false;
                }
            });
    }

    // ── الأحداث ──
    document.addEventListener('click', e => {
        const t = e.target;
        const v = t.closest('[data-ver]');
        if (v) { ver = v.dataset.ver; fileIdx = 0; shellKey = ''; return render(); }
        const pg = t.closest('[data-page]');
        if (pg) { const n = files(ver).length; fileIdx = (fileIdx + +pg.dataset.page + n) % n; return showFile(); }
        const th = t.closest('.rv-thumbs [data-file]');
        if (th) { fileIdx = +th.dataset.file; return showFile(); }
        if (t.closest('[data-zoom]')) {
            zoom = !zoom;
            const view = $('#rv-view');
            view.classList.toggle('zoom', zoom);
            t.closest('[data-zoom]').innerHTML = zoom ? ZOOM_OUT : ZOOM;
            return;
        }
        if (t.closest('[data-approve]')) return approve();
        const pin = t.closest('.rv-pin[data-note]');
        if (pin) {
            const li = document.querySelector(`.rv-list [data-note="${pin.dataset.note}"]`);
            if (li) { li.classList.add('flash'); li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); setTimeout(() => li.classList.remove('flash'), 1200); }
            return;
        }
        const li = t.closest('.rv-list li[data-goto]');
        if (li) {
            const go = () => { const p = document.querySelector(`.rv-pin[data-note="${li.dataset.note}"]`); if (p) { p.classList.add('flash'); p.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => p.classList.remove('flash'), 1200); } };
            if (+li.dataset.goto !== fileIdx) { fileIdx = +li.dataset.goto; showFile().then(go); } else go();
            return;
        }
        if (t.closest('.rv-board') && !t.closest('.rv-pin')) addAt(e);
    });
    document.addEventListener('submit', e => {
        if (e.target.id !== 'rv-general') return;
        e.preventDefault();
        const ta = e.target.querySelector('textarea'), t = ta.value.trim();
        if (t.length < 2) { ta.focus(); return; }
        push({ text: t }, e.target.querySelector('button')).then(ok => { if (ok) ta.value = ''; });
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    // ── التحميل ──
    function fail(title, text) {
        $('#rv').innerHTML = `<section class="rv-card rv-gone">${icon('alert')}<h1>${title}</h1><p>${text}</p></section>`;
    }
    function start() {
        if (!K) return fail('الرابط غير مكتمل', 'تأكّد من فتح رابط المراجعة كما وصلك من رنان.');
        if (!window.db) return fail('تعذّر الاتصال', 'تحقّق من الإنترنت ثم أعد تحميل الصفحة.');
        const t = setTimeout(() => { if (!P) fail('تعذّر التحميل', 'تحقّق من الإنترنت ثم أعد تحميل الصفحة.'); }, 20000);
        db.ref('proofs/' + K).on('value', snap => {
            clearTimeout(t);
            const val = snap.val();
            if (!val || !val.versions) { P = null; return fail('لم نجد هذا التصميم', 'ربما انتهت صلاحية الرابط أو أُلغي. تواصل مع فريق رنان.'); }
            P = val;
            document.title = (P.title ? P.title + ' — ' : '') + 'مراجعة التصميم | رنان';
            render();
            if (!seenSent && !PREVIEW && !expired()) {
                seenSent = true;
                db.ref('proofs/' + K + '/clientSeen').set({ at: new Date().toISOString(), v: latest() }).catch(() => null);
            }
        }, () => fail('تعذّر التحميل', 'تحقّق من الإنترنت ثم أعد تحميل الصفحة.'));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
