// مراجعة التصاميم مع العميل (الجانب الإداري): رفع صور أو PDF بعلامة مائية باسم العميل، رابط مراجعة محمي (review.html)،
// ملاحظات العميل على أماكنها في التصميم، نسخ معدّلة، إرسال وتذكير بالواتساب، الاعتماد، والحذف التلقائي بعد المدة.
// البيانات: proofs/<token> (النسخ والملاحظات والاعتماد) و proofFiles/<token>/<id> (الصور)، وملخص في projects/<id>/proof و track/<code>/review.
// اللوحة داخل نافذة المشروع (#pe-proof)، والأنماط في css/project-edit.css.
(function () {
    const DAYS = [7, 14, 20, 30], MAX_PAGES = 20, MAX_EDGE = 1800;
    const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const date = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.getDate() + ' ' + MONTHS[d.getMonth()]; };
    const plural = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : n + (n <= 10 ? ' ' + few : ' ' + many);
    const ago = iso => {
        const m = Math.round((Date.now() - new Date(iso)) / 60000);
        if (!(m >= 0)) return '';
        if (m < 1) return 'الآن';
        if (m < 60) return 'قبل ' + plural(m, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
        const h = Math.round(m / 60);
        if (h < 24) return 'قبل ' + plural(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
        return 'قبل ' + plural(Math.round(h / 24), 'يوم', 'يومين', 'أيام', 'يومًا');
    };
    const daysLeft = iso => Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 864e5));
    const now = () => new Date().toISOString();
    const toast = (m, a) => (window.ProjectsPage ? ProjectsPage.toast(m, a) : window.showAdminToast ? showAdminToast(m) : null);
    const ref = p => window.db.ref(p);
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const C = () => (typeof clientsData !== 'undefined' ? clientsData : []);
    const link = t => (window.RNAN && RNAN.reviewUrl ? RNAN.reviewUrl(t) : 'review.html?k=' + t);
    const previewLink = t => (window.RNAN ? RNAN.pageUrl('review.html', { k: t, preview: 1 }) : 'review.html?preview=1&k=' + t);

    // ── كل المراجعات مباشرة من القاعدة ──
    let all = {}, ready = false, cleaned = false, listening = false;
    const known = new Set();
    const list = r => Object.entries(r.comments || {}).map(([id, c]) => Object.assign({ id }, c)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const versions = r => Object.entries(r.versions || {}).map(([k, v]) => Object.assign({ k }, v)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const filesOf = (r, v) => Object.entries(((r.versions || {})[v] || {}).files || {}).map(([id, f]) => Object.assign({ id }, f)).sort((a, b) => (a.o || 0) - (b.o || 0));
    function forProject(rowIndex) {
        let best = null;
        Object.entries(all).forEach(([t, r]) => { if (r && r.project === rowIndex && (!best || String(r.updatedAt) > String(best.updatedAt))) best = Object.assign({ token: t }, r); });
        return best;
    }
    const expired = r => r.filesDeleted || (r.expiresAt && Date.parse(r.expiresAt) < Date.now());
    const openNotes = r => list(r).filter(c => c.by !== 'admin' && c.v === r.current && !c.done);
    const openNotesAll = r => list(r).filter(c => c.by !== 'admin' && !c.done);
    // كل تصميم عليه تعديلات لم تُنفَّذ بعد (يختفي حين تُعلَّم «تم التعديل» أو يعتمد العميل)
    function pending() {
        return Object.entries(all).map(([t, r]) => Object.assign({ token: t }, r))
            .filter(r => r.versions && !r.approval && !expired(r) && openNotesAll(r).length)
            .map(r => ({ r, n: openNotesAll(r).length, fresh: unseen(r).length, last: openNotesAll(r).slice(-1)[0].at }))
            .sort((a, b) => String(b.last).localeCompare(String(a.last)));
    }
    const unseen = r => list(r).filter(c => c.by !== 'admin' && !c.done && (!r.seenAt || String(c.at) > String(r.seenAt)));
    const approvalUnseen = r => !!r.approval && (!r.seenAt || String(r.approval.at) > String(r.seenAt));

    // جرس الإشعارات: ملاحظات العملاء والاعتمادات تبقى فيه حتى يُفتح المشروع (js/bell.js)
    function bell() {
        if (!window.AdminBell) return;
        const items = [];
        Object.values(all).forEach(r => {
            if (r && r.versions && approvalUnseen(r)) items.push({ at: r.approval.at, html: `<div class="nb-item ok" data-nb-proj="${esc(r.project)}" role="button">${ic('verified')}<div><b>اعتمد ${esc(r.approval.name || r.client || 'العميل')} تصميم «${esc(r.title || '')}»</b><small>${ago(r.approval.at)} · افتح المشروع لتسليمه</small></div></div>` });
        });
        // التعديلات غير المنفّذة تبقى في الجرس حتى تُعلَّم «تم التعديل»
        pending().forEach(({ r, n, fresh, last }) => items.push({ at: last, html: `<div class="nb-item" data-nb-proj="${esc(r.project)}" role="button">${ic('rate_review')}<div><b>${plural(n, 'تعديل مطلوب', 'تعديلان مطلوبان', 'تعديلات مطلوبة', 'تعديلًا مطلوبًا')} على «${esc(r.title || 'التصميم')}»${fresh ? ' <em class="nb-new">جديد</em>' : ''}</b><small>${esc(r.client || '')} · آخرها ${ago(last)} · لم تُنفَّذ بعد</small></div></div>` }));
        items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
        AdminBell.set('proofs', items.map(x => x.html).join(''), items.length);
    }

    function openProject(rowIndex) {
        const i = P().findIndex(p => p.rowIndex === rowIndex);
        if (i > -1) window.openProjectModal('edit', i, { focus: 'proof' });
    }
    // تنبيهات ثابتة ما دامت هناك تعديلات لم تُنفَّذ: شريط أعلى اللوحة، شارة «المشاريع»، ولوحة في صفحة المشاريع
    function notices() {
        const items = pending(), total = items.reduce((a, x) => a + x.n, 0);
        const main = document.querySelector('main');
        let strip = document.getElementById('ra-strip');
        if (!strip && main) { main.insertAdjacentHTML('afterbegin', '<div id="ra-strip" class="ra-strip no-print" role="status" hidden></div>'); strip = document.getElementById('ra-strip'); }
        if (strip) {
            strip.hidden = !items.length;
            if (items.length) {
                const one = items.length === 1 ? items[0] : null;
                strip.innerHTML = `<span class="ra-ic">${ic('rate_review')}${items.some(x => x.fresh) ? '<i></i>' : ''}</span>
                    <span class="ra-t"><b>${plural(total, 'تعديل مطلوب', 'تعديلان مطلوبان', 'تعديلات مطلوبة', 'تعديلًا مطلوبًا')} من العملاء لم يُنفَّذ</b>
                    <small>${one ? `«${esc(one.r.title || 'التصميم')}» — ${esc(one.r.client || '')}` : `على ${plural(items.length, 'تصميم واحد', 'تصميمين', 'تصاميم', 'تصميمًا')}: ${items.slice(0, 2).map(x => '«' + esc(x.r.title || '') + '»').join('، ')}${items.length > 2 ? '…' : ''}`}</small></span>
                    <button type="button" class="ra-go" data-ra="${one ? esc(one.r.project) : ''}">${one ? 'افتح التصميم' : 'عرض الكل'} ${ic('arrow_back')}</button>`;
            }
        }
        // تنتقل الشارة تلقائيًا إلى «المزيد» في شريط تطبيق الجوال
        const nav = document.getElementById('nav-projects');
        if (nav) {
            let b = document.getElementById('nav-projects-badge');
            if (!b) { nav.insertAdjacentHTML('beforeend', '<span id="nav-projects-badge" class="ra-nav-badge en-num"></span>'); b = document.getElementById('nav-projects-badge'); }
            b.textContent = total || '';
            b.style.display = total ? '' : 'none';
        }
        const head = document.querySelector('#projects-page .pp-head');
        let fix = document.getElementById('pp-fix');
        if (!fix && head) { head.insertAdjacentHTML('afterend', '<section id="pp-fix" class="pp-fix no-print" hidden></section>'); fix = document.getElementById('pp-fix'); }
        if (fix) {
            fix.hidden = !items.length;
            fix.innerHTML = items.length ? `<h3>${ic('rate_review')} تعديلات مطلوبة من العملاء <em class="en-num">${total}</em></h3>
                <p>تبقى هنا حتى تعلّمها «تم التعديل» أو ترفع النسخة المعدّلة.</p>
                <div class="pp-fix-list">${items.map(({ r, n, fresh, last }) => `<button type="button" class="pp-fix-row" data-ra="${esc(r.project)}">
                    <span class="n en-num">${n}</span>
                    <span class="t"><b>${esc(r.title || 'التصميم')}${fresh ? ' <em class="nb-new">جديد</em>' : ''}</b><small>${esc(r.client || '')} · آخر ملاحظة ${ago(last)}</small></span>
                    <span class="go">افتح ${ic('arrow_back')}</span></button>`).join('')}</div>` : '';
        }
    }
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-ra]');
        if (!b) return;
        if (b.dataset.ra) return openProject(b.dataset.ra);
        if (typeof switchPage === 'function') switchPage('projects');
        setTimeout(() => { const fix = document.getElementById('pp-fix'); if (fix) fix.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 150);
    });
    // «رابط التصميم» في رأس نافذة المشروع
    function designChip(r) {
        const sub = document.querySelector('#projectModal .pe-head-sub');
        if (!sub) return;
        let chip = document.getElementById('pe-design-chip');
        if (!chip) { sub.insertAdjacentHTML('beforeend', `<button type="button" id="pe-design-chip" class="pe-code design" title="نسخ رابط التصميم للعميل">${ic('palette')}<span>رابط التصميم</span></button>`); chip = document.getElementById('pe-design-chip'); }
        chip.hidden = !(r && r.versions && !expired(r));
        chip.dataset.token = r ? r.token : '';
    }
    function copy(token) {
        if (!token) return;
        const url = link(token);
        if (typeof copyText === 'function') copyText(url, null); else if (navigator.clipboard) navigator.clipboard.writeText(url);
        toast('نُسخ رابط التصميم — يفتح للعميل صفحة التصميم مباشرة');
    }
    document.addEventListener('click', e => { const c = e.target.closest('#pe-design-chip'); if (c) copy(c.dataset.token); });

    // حالة المراجعة على بطاقة المشروع
    function state(p) {
        const r = p && forProject(p.rowIndex);
        if (!r || !r.versions) return null;
        if (r.approval) return { cls: 'ok', ic: 'verified', text: 'اعتمده العميل' };
        if (expired(r)) return null;
        const n = openNotesAll(r).length;
        if (n) return { cls: 'notes', ic: 'rate_review', text: plural(n, 'تعديل مطلوب', 'تعديلان مطلوبان', 'تعديلات مطلوبة', 'تعديلًا مطلوبًا'), fresh: unseen(r).length > 0 };
        const seen = r.clientSeen && r.clientSeen.v === r.current;
        const since = Date.parse(r.sentAt || (r.versions[r.current] || {}).at || r.updatedAt);
        const stale = Date.now() - since > 2 * 864e5;
        return { cls: 'wait', ic: seen ? 'visibility' : 'schedule_send', text: seen ? 'شاهده العميل' : 'بانتظار العميل', stale };
    }

    let tick = 0;
    function refresh() {
        clearTimeout(tick);
        tick = setTimeout(() => {
            if (window.ProjectsPage) ProjectsPage.render();
            bell();
            notices();
            // اللوحة تُحدَّث فقط ونافذة المشروع مفتوحة، فلا تُعلَّم الملاحظات مقروءة قبل أن تراها
            if (cur && !busy && modalOpen() && !(box() && box().querySelector('.pf-up.open'))) panel(cur);
        }, 120);
    }
    function listen() {
        if (listening || !window.db) return;
        listening = true;
        ref('proofs').on('value', snap => {
            const next = snap.val() || {};
            if (ready) announce(next);
            else Object.entries(next).forEach(([t, r]) => { list(r).forEach(c => known.add(t + '/' + c.id)); if (r.approval) known.add(t + '/approval'); });
            all = next;
            if (!ready) { ready = true; greet(); }
            if (!cleaned) { cleaned = true; cleanup(); }
            refresh();
        });
    }
    // ملاحظة أو اعتماد جديد أثناء فتح اللوحة
    function announce(next) {
        Object.entries(next).forEach(([t, r]) => {
            const open = () => { const i = P().findIndex(p => p.rowIndex === r.project); if (i > -1) window.openProjectModal('edit', i, { focus: 'proof' }); };
            list(r).forEach(c => {
                const k = t + '/' + c.id;
                if (known.has(k)) return;
                known.add(k);
                if (c.by === 'admin') return;
                toast(`✎ ملاحظة جديدة من ${r.client || 'العميل'} على «${r.title || 'التصميم'}»`, ['فتح', open]);
                if (window.AdminBell) AdminBell.notify(`✎ ملاحظة جديدة من ${r.client || 'العميل'}`, `«${r.title || 'التصميم'}»: ${String(c.text || '').slice(0, 120)}`, { tag: 'proof-' + t, project: r.project });
            });
            if (r.approval && !known.has(t + '/approval')) {
                known.add(t + '/approval');
                toast(`🎉 اعتمد ${r.approval.name || r.client || 'العميل'} تصميم «${r.title || ''}»`, ['فتح', open]);
                if (window.AdminBell) AdminBell.notify(`🎉 اعتمد ${r.approval.name || r.client || 'العميل'} التصميم`, `«${r.title || ''}» — جاهز للتسليم`, { tag: 'proof-' + t, project: r.project });
            }
        });
    }
    function greet() {
        const n = Object.values(all).filter(r => r && !r.approval && !expired(r) && unseen(r).length).length;
        if (n) setTimeout(() => toast(`✎ لديك ملاحظات جديدة من العملاء على ${plural(n, 'تصميم واحد', 'تصميمين', 'تصاميم', 'تصميمًا')}`, ['عرض', () => switchPage('projects')]), 1500);
    }
    // الحذف التلقائي: يعمل عند فتح لوحة الإدارة
    async function cleanup() {
        const due = Object.entries(all).filter(([, r]) => r && !r.filesDeleted && r.expiresAt && Date.parse(r.expiresAt) < Date.now());
        for (const [t] of due) {
            try { await ref('proofFiles/' + t).remove(); await ref('proofs/' + t).update({ filesDeleted: true }); } catch (e) { /* يُعاد عند الفتح القادم */ }
        }
    }

    // ── تجهيز الملفات: تصغير + علامة مائية + JPEG، وصفحات PDF صورًا ──
    let pdfLib = null;
    function loadPdf() {
        if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
        if (pdfLib) return pdfLib;
        pdfLib = new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = PDFJS + 'pdf.min.js';
            s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
            s.onerror = () => { pdfLib = null; rej(new Error('تعذّر تحميل قارئ PDF، تحقّق من الاتصال')); };
            document.head.appendChild(s);
        });
        return pdfLib;
    }
    function mark(ctx, w, h, text) {
        const fs = Math.max(15, Math.round(Math.min(w, h) / 24));
        ctx.save();
        ctx.font = `700 ${fs}px "IBM Plex Sans Arabic", Tahoma, sans-serif`;
        ctx.direction = 'rtl';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-Math.PI / 7);
        const R = Math.hypot(w, h) / 2 + fs * 4, sx = ctx.measureText(text).width + fs * 4, sy = fs * 5;
        ctx.lineWidth = Math.max(1, fs / 9);
        ctx.strokeStyle = 'rgba(0, 0, 0, .10)';
        ctx.fillStyle = 'rgba(255, 255, 255, .17)';
        for (let y = -R, row = 0; y <= R; y += sy, row++) {
            for (let x = -R + (row % 2 ? sx / 2 : 0); x <= R; x += sx) { ctx.strokeText(text, x, y); ctx.fillText(text, x, y); }
        }
        ctx.restore();
    }
    function toJpeg(src, sw, sh, wm, drawFn) {
        const k = Math.min(1, MAX_EDGE / Math.max(sw, sh));
        const w = Math.round(sw * k), h = Math.round(sh * k);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        if (drawFn) drawFn(ctx, w, h); else ctx.drawImage(src, 0, 0, w, h);
        mark(ctx, w, h, wm);
        let q = .82, data = cv.toDataURL('image/jpeg', q);
        while (data.length > 1.2e6 && q > .5) { q -= .1; data = cv.toDataURL('image/jpeg', q); }
        return { data, w, h };
    }
    async function imageOf(file) {
        if (window.createImageBitmap) { try { return await createImageBitmap(file); } catch (e) { /* نجرّب الطريقة الأخرى */ } }
        const url = URL.createObjectURL(file);
        try { const im = new Image(); im.src = url; await im.decode(); return im; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    }
    async function prepare(files, wm, onStep) {
        const out = [];
        for (const f of files) {
            if (out.length >= MAX_PAGES) break;
            const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
            if (isPdf) {
                const lib = await loadPdf();
                const doc = await lib.getDocument({ data: await f.arrayBuffer() }).promise;
                for (let i = 1; i <= doc.numPages && out.length < MAX_PAGES; i++) {
                    onStep(`جاري تجهيز ${f.name} — صفحة ${i} من ${doc.numPages}`);
                    const page = await doc.getPage(i);
                    const v1 = page.getViewport({ scale: 1 });
                    const scale = Math.min(3, MAX_EDGE / Math.max(v1.width, v1.height));
                    const vp = page.getViewport({ scale });
                    const tmp = document.createElement('canvas');
                    tmp.width = Math.round(vp.width); tmp.height = Math.round(vp.height);
                    const tctx = tmp.getContext('2d');
                    tctx.fillStyle = '#fff';
                    tctx.fillRect(0, 0, tmp.width, tmp.height);
                    await page.render({ canvasContext: tctx, viewport: vp }).promise;
                    out.push(Object.assign(toJpeg(tmp, tmp.width, tmp.height, wm), { name: f.name + (doc.numPages > 1 ? ' — صفحة ' + i : '') }));
                }
            } else if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|gif)$/i.test(f.name)) {
                onStep(`جاري تجهيز ${f.name}`);
                const im = await imageOf(f);
                out.push(Object.assign(toJpeg(im, im.width || im.naturalWidth, im.height || im.naturalHeight, wm), { name: f.name }));
            }
        }
        return out;
    }

    // ── رفع نسخة جديدة ──
    async function publish(p, files, note, days, resolvePrev, onStep) {
        const old = forProject(p.rowIndex);
        const token = old ? old.token : (window.RNAN ? RNAN.newToken() : Math.random().toString(36).slice(2) + Date.now().toString(36));
        const round = (old ? versions(old).length : 0) + 1;
        const v = 'v' + round;
        const pages = await prepare(files, `معاينة · رنان · ${p.client || ''}`, onStep);
        if (!pages.length) throw new Error('لم نجد صورًا أو PDF صالحة في الملفات المختارة');
        const meta = {};
        for (let i = 0; i < pages.length; i++) {
            onStep(`جاري الرفع ${i + 1} من ${pages.length}`, (i + 1) / pages.length);
            const id = v + '_' + (i + 1);
            await ref('proofFiles/' + token + '/' + id).set(pages[i].data);
            meta[id] = { name: String(pages[i].name).slice(0, 120), w: pages[i].w, h: pages[i].h, o: i + 1 };
        }
        const at = now(), expiresAt = new Date(Date.now() + days * 864e5).toISOString();
        const up = {
            project: p.rowIndex, code: p.code || '', title: p.name || '', client: p.client || '',
            updatedAt: at, expiresAt, days, round, current: v, filesDeleted: null, sentAt: null, remindedAt: null,
            ['versions/' + v]: Object.assign({ at, files: meta }, note ? { note: note.slice(0, 1500) } : {})
        };
        if (!old) up.createdAt = at;
        if (old && old.approval) up.approval = null;
        if (resolvePrev && old) openNotesAll(old).forEach(c => { up['comments/' + c.id + '/done'] = true; up['comments/' + c.id + '/doneAt'] = at; });
        await ref('proofs/' + token).update(up);
        const sum = { token, round, at, until: expiresAt };
        await ref('projects/' + p.rowIndex + '/proof').set(sum);
        if (p.code) await ref('track/' + p.code + '/review').set({ k: token, round, until: expiresAt });
        if (window.google && google.script) google.script.run.logNotification(p.client, 'proof_ready', `🎨 تصميم «${p.name}» جاهز لمراجعتك (النسخة ${round}). شاهده واكتب ملاحظاتك أو اعتمده.`);
        p.proof = sum;
        return token;
    }

    // ── رسائل الواتساب ──
    function phoneOf(name) { return (C().find(c => c.company === name || c.name === name) || {}).phone || ''; }
    function waText(r, kind) {
        const n = versions(r).length, until = r.expiresAt ? date(r.expiresAt) : '';
        if (kind === 'remind') return `مرحبًا، تذكير لطيف 🌿\nتصميم «${r.title}» ما زال بانتظار رأيكم.\n\nشاهدوه واكتبوا ملاحظاتكم على التصميم مباشرة، أو اعتمدوه إن كان مناسبًا:\n${link(r.token)}\n\n${until ? 'الرابط متاح حتى ' + until + '.\n' : ''}رنان لخدمات التصميم`;
        return `مرحبًا 👋\nتصميم «${r.title}» جاهز لمراجعتكم${n > 1 ? ' (النسخة ' + n + ' بعد التعديل)' : ''}.\n\nشاهدوه واضغطوا على أي مكان فيه لكتابة ملاحظاتكم، أو اعتمدوه إن كان مناسبًا:\n${link(r.token)}\n\n${until ? 'الرابط متاح حتى ' + until + '.\n' : ''}رنان لخدمات التصميم`;
    }
    const wa = (r, kind) => { const ph = phoneOf(r.client); return ph && window.RNAN ? RNAN.waLink(ph, waText(r, kind)) : ''; };

    // ── اللوحة داخل نافذة المشروع ──
    let cur = null, busy = false, picked = [], upOpen = false, upDays = 30;
    const box = () => document.getElementById('pe-proof');
    const modalOpen = () => { const m = document.getElementById('projectModal'); return !!m && m.classList.contains('open'); };
    function panel(p, opts) {
        const el = box();
        if (!el) return;
        if (!opts || !opts.keep) { if (!cur || !p || cur.rowIndex !== p.rowIndex) { picked = []; upOpen = false; } }
        cur = p;
        listen();
        if (!p || !p.rowIndex) { el.innerHTML = `<p class="pf-empty">${ic('save')} احفظ المشروع أولًا، ثم ارفع التصميم ليراجعه العميل.</p>`; return; }
        const r = forProject(p.rowIndex);
        designChip(r);
        if (!r || !r.versions) { upOpen = true; el.innerHTML = uploader(null); return; }
        if (modalOpen() && (unseen(r).length || approvalUnseen(r))) ref('proofs/' + r.token + '/seenAt').set(now()).catch(() => null);
        el.innerHTML = view(r) + (upOpen ? uploader(r) : '');
        thumbs(r);
    }
    function uploader(r) {
        const resolvable = r ? openNotesAll(r).length : 0;
        upDays = r && r.days ? r.days : upDays;
        return `<div class="pf-up open">
            ${r ? `<h5>${ic('upload_file')} رفع النسخة ${versions(r).length + 1} بعد التعديل</h5>` : `<div class="pf-intro">${ic('preview')}<div><b>شارك التصميم مع العميل</b><span>ارفع صور التصميم أو ملف PDF، فيراه العميل في صفحة محمية بعلامة مائية باسمه، ويضغط على أي مكان ليكتب ملاحظته أو يعتمد التصميم.</span></div></div>`}
            <label class="pf-drop" data-pf-drop>
                <input type="file" accept="image/*,application/pdf" multiple hidden data-pf-file>
                ${ic('cloud_upload')}<b>اسحب الملفات هنا أو اضغط للاختيار</b><small>صور JPG أو PNG أو WEBP، أو PDF — حتى ${MAX_PAGES} صفحة</small>
            </label>
            <div class="pf-picked">${picked.map((f, i) => `<span>${ic(/pdf/i.test(f.type) || /\.pdf$/i.test(f.name) ? 'picture_as_pdf' : 'image')}<b>${esc(f.name)}</b><small class="en-num">${Math.max(1, Math.round(f.size / 1024))} KB</small><button type="button" data-pf-rm="${i}" aria-label="إزالة">${ic('close')}</button></span>`).join('')}</div>
            <label class="pf-f"><span>رسالة للعميل <em>(اختياري)</em></span><textarea data-pf-note class="form-input-modern" rows="2" maxlength="1500" placeholder="${r ? 'مثال: عدّلت الألوان وكبّرت الشعار كما طلبت' : 'مثال: هذه المسودة الأولى، أنتظر رأيك'}"></textarea></label>
            <div class="pf-days"><span>${ic('auto_delete')} تُحذف الملفات تلقائيًا بعد</span>${DAYS.map(d => `<button type="button" data-pf-days="${d}" class="${d === upDays ? 'on' : ''}"><span class="en-num">${d}</span> يومًا</button>`).join('')}</div>
            ${resolvable ? `<label class="pf-check"><input type="checkbox" data-pf-resolve checked><span>تعليم ${plural(resolvable, 'ملاحظة العميل السابقة', 'ملاحظتي العميل السابقتين', 'ملاحظات العميل السابقة', 'ملاحظة سابقة')} «تم التعديل»</span></label>` : ''}
            <p class="pf-err" hidden></p>
            <div class="pf-prog" hidden><span class="pf-bar"><i></i></span><small></small></div>
            <div class="pf-acts">
                <button type="button" class="pf-btn main" data-pf="publish">${ic('send')} رفع وتجهيز رابط العميل</button>
                ${r ? `<button type="button" class="pf-btn" data-pf="cancel">إلغاء</button>` : ''}
            </div>
        </div>`;
    }
    function view(r) {
        const vs = versions(r), v = r.versions[r.current] || {}, n = vs.length;
        const notes = list(r).filter(c => c.by !== 'admin');
        const curNotes = notes.filter(c => c.v === r.current), open = curNotes.filter(c => !c.done);
        const ex = expired(r);
        let st;
        if (r.approval) st = ['ok', 'verified', `اعتمد العميل النسخة ${vs.findIndex(x => x.k === r.approval.v) + 1}`, `${esc(r.approval.name || '')} · ${date(r.approval.at)} · ${ago(r.approval.at)}${r.approval.note ? `<br>«${esc(r.approval.note)}»` : ''}`];
        else if (ex) st = ['off', 'auto_delete', 'انتهت مدة العرض وحُذفت الملفات', 'ارفع نسخة جديدة إن احتاج العميل مشاهدتها مجددًا'];
        else if (open.length) st = ['notes', 'rate_review', `العميل أرسل ${plural(open.length, 'ملاحظة', 'ملاحظتين', 'ملاحظات', 'ملاحظة')}`, 'عدّل التصميم ثم ارفع نسخة معدّلة وأرسلها له'];
        else {
            const seen = r.clientSeen && r.clientSeen.v === r.current;
            st = ['wait', seen ? 'visibility' : 'schedule_send', 'بانتظار رأي العميل', `النسخة ${n} · رُفعت ${ago(v.at)}${r.sentAt ? ' · أُرسلت ' + ago(r.sentAt) : ' · لم تُرسل بعد'}${seen ? ' · شاهدها العميل ' + ago(r.clientSeen.at) : ''}${r.remindedAt ? ' · آخر تذكير ' + ago(r.remindedAt) : ''}`];
        }
        const sendUrl = wa(r, 'send'), remindUrl = wa(r, 'remind');
        const fs = filesOf(r, r.current);
        const byVer = vs.map((x, i) => ({ x, i, ns: notes.filter(c => c.v === x.k) })).filter(g => g.ns.length);
        return `<div class="pf-state ${st[0]}">${ic(st[1])}<div><b>${st[2]}</b><small>${st[3]}</small></div></div>
            ${!ex && fs.length ? `<div class="pf-thumbs" data-pf-thumbs>${fs.slice(0, 8).map(f => `<a href="${esc(previewLink(r.token))}" target="_blank" rel="noopener" data-thumb="${esc(f.id)}" title="${esc(f.name)}"><span class="pf-ph"></span></a>`).join('')}${fs.length > 8 ? `<span class="pf-more en-num">+${fs.length - 8}</span>` : ''}</div>` : ''}
            <div class="pf-acts">
                ${r.approval ? `<button type="button" class="pf-btn main" data-pf="deliver">${ic('task_alt')} تعليم المشروع مكتملًا</button>` : ''}
                ${!r.approval && !ex && sendUrl ? `<a class="pf-btn ${r.sentAt ? '' : 'main'} wa" href="${esc(sendUrl)}" target="_blank" rel="noopener" data-pf="sent">${ic('send')} ${r.sentAt ? 'إعادة الإرسال' : 'إرسال للعميل'}</a>` : ''}
                ${!r.approval && !ex && remindUrl && r.sentAt && !open.length ? `<a class="pf-btn main wa" href="${esc(remindUrl)}" target="_blank" rel="noopener" data-pf="reminded">${ic('notifications_active')} تذكير العميل</a>` : ''}
                ${!r.approval && !ex && !sendUrl ? `<span class="pf-hint">${ic('info')} لا يوجد جوال للعميل — انسخ الرابط وأرسله</span>` : ''}
                ${!upOpen ? `<button type="button" class="pf-btn ${open.length ? 'main' : ''}" data-pf="upload">${ic('upload_file')} ${ex ? 'رفع التصميم من جديد' : 'رفع نسخة معدّلة'}</button>` : ''}
                ${!ex ? `<button type="button" class="pf-btn" data-pf="copy">${ic('link')} نسخ رابط التصميم</button>
                <a class="pf-btn" href="${esc(previewLink(r.token))}" target="_blank" rel="noopener">${ic('open_in_new')} معاينة</a>` : ''}
            </div>
            ${byVer.length ? `<div class="pf-notes">${byVer.reverse().map(g => {
                const isCur = g.x.k === r.current;
                const body = g.ns.map((c, j) => {
                    const fi = filesOf(r, g.x.k).findIndex(f => f.id === c.f);
                    return `<li class="${c.done ? 'done' : ''}${!c.done && (!r.seenAt || String(c.at) > String(r.seenAt)) ? ' fresh' : ''}"><span class="n en-num">${j + 1}</span>
                        <div><p>${esc(c.text)}</p><small>${fi > -1 ? (filesOf(r, g.x.k).length > 1 ? 'صفحة ' + (fi + 1) + ' · ' : 'على التصميم · ') : 'ملاحظة عامة · '}${ago(c.at)}</small></div>
                        <button type="button" class="pf-done${c.done ? ' on' : ''}" data-pf-done="${esc(c.id)}" title="${c.done ? 'إلغاء' : 'تم التعديل'}">${ic(c.done ? 'check_circle' : 'radio_button_unchecked')}<span>${c.done ? 'تم' : 'تم التعديل'}</span></button></li>`;
                }).join('');
                return isCur ? `<h5>${ic('rate_review')} ملاحظات النسخة ${g.i + 1} <em class="en-num">${g.ns.length}</em></h5><ol>${body}</ol>`
                    : `<details><summary>${ic('history')} ملاحظات النسخة ${g.i + 1} <em class="en-num">${g.ns.length}</em></summary><ol>${body}</ol></details>`;
            }).join('')}</div>` : ''}
            ${!ex ? `<div class="pf-foot">${ic('auto_delete')}<span>تُحذف الملفات تلقائيًا ${daysLeft(r.expiresAt) ? 'بعد ' + plural(daysLeft(r.expiresAt), 'يوم', 'يومين', 'أيام', 'يومًا') + ' (' + date(r.expiresAt) + ')' : 'اليوم'}</span>
                <button type="button" data-pf="extend">تمديد 7 أيام</button><button type="button" class="danger" data-pf="purge">حذف الملفات الآن</button></div>` : ''}`;
    }
    async function thumbs(r) {
        const el = box();
        if (!el) return;
        for (const a of el.querySelectorAll('[data-thumb]')) {
            try {
                const snap = await ref('proofFiles/' + r.token + '/' + a.dataset.thumb).once('value');
                if (snap.val() && a.isConnected) a.innerHTML = `<img src="${snap.val()}" alt="">`;
            } catch (e) { /* تبقى الخانة فارغة */ }
        }
    }

    // ── الأحداث ──
    document.addEventListener('change', e => {
        const inp = e.target.closest('[data-pf-file]');
        if (!inp) return;
        addFiles(inp.files);
        inp.value = '';
    });
    function addFiles(fl) {
        const ok = [...(fl || [])].filter(f => /^image\//.test(f.type) || f.type === 'application/pdf' || /\.(pdf|jpe?g|png|webp|gif)$/i.test(f.name));
        picked = picked.concat(ok).slice(0, MAX_PAGES);
        rerenderUp();
    }
    function rerenderUp() {
        const up = box() && box().querySelector('.pf-up');
        if (!up) return;
        const note = up.querySelector('[data-pf-note]').value, res = up.querySelector('[data-pf-resolve]');
        const keep = res ? res.checked : null;
        up.outerHTML = uploader(cur ? forProject(cur.rowIndex) : null);
        const nu = box().querySelector('.pf-up');
        nu.querySelector('[data-pf-note]').value = note;
        if (keep !== null && nu.querySelector('[data-pf-resolve]')) nu.querySelector('[data-pf-resolve]').checked = keep;
    }
    document.addEventListener('dragover', e => { const d = e.target.closest('[data-pf-drop]'); if (d) { e.preventDefault(); d.classList.add('over'); } });
    document.addEventListener('dragleave', e => { const d = e.target.closest('[data-pf-drop]'); if (d) d.classList.remove('over'); });
    document.addEventListener('drop', e => { const d = e.target.closest('[data-pf-drop]'); if (!d) return; e.preventDefault(); d.classList.remove('over'); addFiles(e.dataTransfer.files); });

    document.addEventListener('click', async e => {
        const el = box();
        if (!el || !el.contains(e.target)) return;
        const rm = e.target.closest('[data-pf-rm]');
        if (rm) { e.preventDefault(); picked.splice(+rm.dataset.pfRm, 1); return rerenderUp(); }
        const dd = e.target.closest('[data-pf-days]');
        if (dd) { upDays = +dd.dataset.pfDays; el.querySelectorAll('[data-pf-days]').forEach(b => b.classList.toggle('on', b === dd)); return; }
        const done = e.target.closest('[data-pf-done]');
        const r = cur && forProject(cur.rowIndex);
        if (done && r) {
            const c = (r.comments || {})[done.dataset.pfDone];
            if (c) ref('proofs/' + r.token + '/comments/' + done.dataset.pfDone).update(c.done ? { done: null, doneAt: null } : { done: true, doneAt: now() });
            return;
        }
        const b = e.target.closest('[data-pf]');
        if (!b) return;
        const act = b.dataset.pf;
        if (act === 'upload') { upOpen = true; picked = []; return panel(cur, { keep: true }); }
        if (act === 'cancel') { upOpen = false; picked = []; return panel(cur, { keep: true }); }
        if (act === 'publish') return go(b);
        if (!r) return;
        if (act === 'sent' || act === 'reminded') { ref('proofs/' + r.token).update({ [act === 'sent' ? 'sentAt' : 'remindedAt']: now() }); return; }
        if (act === 'copy') {
            if (typeof copyText === 'function') copyText(link(r.token), null); else if (navigator.clipboard) navigator.clipboard.writeText(link(r.token));
            return toast('نُسخ رابط التصميم — يفتح للعميل صفحة التصميم مباشرة');
        }
        if (act === 'deliver') { if (window.ProjectEdit) ProjectEdit.setStatus('مكتمل'); return toast('اضغط «حفظ المشروع» لتأكيد التسليم'); }
        if (act === 'extend') {
            const until = new Date(Math.max(Date.now(), Date.parse(r.expiresAt) || 0) + 7 * 864e5).toISOString();
            await ref('proofs/' + r.token).update({ expiresAt: until });
            await ref('projects/' + r.project + '/proof/until').set(until);
            if (r.code) await ref('track/' + r.code + '/review/until').set(until);
            return toast('مُدّدت مدة العرض حتى ' + date(until));
        }
        if (act === 'purge') {
            if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'اضغط مجددًا للتأكيد'; return; }
            await ref('proofFiles/' + r.token).remove();
            await ref('proofs/' + r.token).update({ filesDeleted: true, expiresAt: now() });
            return toast('حُذفت ملفات التصميم');
        }
    });
    async function go(btn) {
        if (busy || !cur) return;
        const el = box(), up = el.querySelector('.pf-up');
        const err = up.querySelector('.pf-err'), prog = up.querySelector('.pf-prog');
        if (!picked.length) { err.textContent = 'اختر ملفات التصميم أولًا'; err.hidden = false; return; }
        if (navigator.onLine === false) { err.textContent = 'لا يوجد اتصال بالإنترنت'; err.hidden = false; return; }
        err.hidden = true;
        busy = true;
        btn.disabled = true;
        prog.hidden = false;
        const step = (t, f) => { prog.querySelector('small').textContent = t; if (f != null) prog.querySelector('i').style.width = Math.round(f * 100) + '%'; };
        try {
            const res = up.querySelector('[data-pf-resolve]');
            await publish(cur, picked, up.querySelector('[data-pf-note]').value.trim(), upDays, res ? res.checked : false, step);
            busy = false;
            picked = [];
            upOpen = false;
            panel(cur, { keep: true });
            toast('✓ التصميم جاهز — أرسل الرابط للعميل');
            if (window.AdminBell && AdminBell.canAsk) setTimeout(() => !document.querySelector('.pp-toast.show') && AdminBell.canAsk && toast('🔔 فعّل تنبيهات الجهاز لتصلك ملاحظات العميل فورًا', ['تفعيل', () => Notification.requestPermission().then(() => AdminBell.paint())]), 4500);
        } catch (e) {
            busy = false;
            btn.disabled = false;
            prog.hidden = true;
            err.textContent = 'تعذّر الرفع: ' + ((e && e.message) || e);
            err.hidden = false;
        }
    }

    // يبدأ الاستماع بعد أول تحميل للبيانات (بعد الدخول)
    function hook() {
        if (typeof window.loadAllData !== 'function' || window.loadAllData.__pf) return;
        const orig = window.loadAllData;
        window.loadAllData = function () { const r = orig.apply(this, arguments); listen(); return r; };
        window.loadAllData.__pf = true;
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();

    window.ProofsUI = { panel, state, listen, forProject, link, copy, pending, waSend: r => wa(r, 'send'), get busy() { return busy; } };
})();
