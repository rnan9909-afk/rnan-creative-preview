// نموذج متطلبات المشروع في الإدارة: قسم في نافذة المشروع يُنشئ رابط النموذج (briefs/<TOKEN>) ويرسله للعميل بواتساب،
// ثم يعرض إجاباته مرتبة حسب الأسئلة (js/brief-questions.js). متابعة لحظية: تنبيه في الجرس وعلى الجهاز عند وصول الإجابات.
// حالة النموذج في projects/<id>/brief = { token, status: sent|answered, sentAt, answeredAt, seen }. الأنماط في css/polish.css.
(function () {
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const C = () => (typeof clientsData !== 'undefined' ? clientsData : []);
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    const link = t => RNAN.pageUrl('brief.html', { k: t });
    const fmt = iso => iso ? new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long' }) : '';
    let briefs = {}, started = false, first = true, cur = null;

    function start() {
        if (started || !window.db) return;
        started = true;
        window.db.ref('briefs').on('value', s => {
            const next = s.val() || {};
            Object.entries(next).forEach(([t, b]) => {
                const old = briefs[t];
                if (!first && b && b.status === 'answered' && (!old || old.status !== 'answered' || old.answeredAt !== b.answeredAt)) {
                    toast(`📝 عبّأ ${b.client || 'العميل'} نموذج متطلبات «${b.projectName || ''}»`);
                    if (window.AdminBell) AdminBell.notify('📝 وصلت متطلبات المشروع', `${b.client || ''} · «${b.projectName || ''}»`, { tag: 'brief-' + t, project: b.projectKey });
                }
            });
            briefs = next;
            first = false;
            bell();
            if (cur) fill(P().find(p => String(p.rowIndex) === String(cur)));
        }, () => null);
    }
    // إجابات لم تُفتح بعد تبقى في الجرس
    function bell() {
        if (!window.AdminBell) return;
        const list = Object.entries(briefs).filter(([t, b]) => b && b.status === 'answered' && !b.seen);
        AdminBell.set('briefs', list.map(([t, b]) => `<div class="nb-item ok" data-brief-open="${esc(b.projectKey || '')}" role="button">${ic('assignment_turned_in')}<div>
            <b>عبّأ ${esc(b.client || 'العميل')} نموذج المتطلبات</b><small>«${esc(b.projectName || '')}» · ${fmt(b.answeredAt)} · افتح المشروع</small></div></div>`).join(''), list.length);
    }

    function section() {
        let sec = document.getElementById('pe-brief-sec');
        if (sec) return sec;
        const after = document.getElementById('pe-deliver-sec') || document.getElementById('pe-proof-sec');
        if (!after) return null;
        after.insertAdjacentHTML('afterend', '<section class="pe-sec pe-brief" id="pe-brief-sec" style="--o:3"></section>');
        return document.getElementById('pe-brief-sec');
    }
    function answersHtml(b) {
        const qs = window.BriefQ ? BriefQ.questions(b.type) : [];
        const a = b.answers || {};
        const rows = qs.filter(q => a[q.k] && (Array.isArray(a[q.k]) ? a[q.k].length : String(a[q.k]).trim())).map(q => {
            const v = Array.isArray(a[q.k]) ? a[q.k].map(x => `<span class="pe-bf-chip">${esc(x)}</span>`).join('') : esc(a[q.k]).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" dir="ltr">$1</a>');
            return `<div class="pe-bf-row"><dt>${esc(q.t)}</dt><dd>${v}</dd></div>`;
        });
        return rows.length ? `<dl class="pe-bf-list">${rows.join('')}</dl>` : '<p class="pe-bf-hint">لا إجابات</p>';
    }
    function fill(p) {
        const sec = section();
        if (!sec) return;
        sec.hidden = !p;
        if (!p) return;
        const ref = p.brief && p.brief.token ? briefs[p.brief.token] || p.brief : null;
        const answered = ref && ref.status === 'answered';
        sec.innerHTML = `<h4>${ic('assignment')} نموذج متطلبات المشروع ${answered ? '<em class="pe-bf-ok">وصلت الإجابات</em>' : ref ? '<em class="pe-bf-wait">بانتظار العميل</em>' : ''}</h4>
            ${!ref ? `<p class="pe-bf-hint">رابط يعبّئ فيه العميل نشاطه وهدف التصميم والنصوص والألوان والمراجع — أسئلة تناسب نوع العمل، فتبدأ التصميم بصورة كاملة.</p>
                <button type="button" class="pe-dl-btn main" data-bf="create">${ic('send')} إنشاء النموذج وإرساله للعميل</button>`
            : `${answered ? `<p class="pe-bf-hint">عبّأه ${esc(ref.client || 'العميل')} ${fmt(ref.answeredAt)}</p>${answersHtml(ref)}` : `<p class="pe-bf-hint">أُرسل ${fmt(ref.sentAt || ref.createdAt)} — يصلك تنبيه فور تعبئته.</p>`}
                <div class="pe-dl-acts">
                    ${answered ? `<button type="button" class="pe-dl-btn ghost" data-bf="copy-answers">${ic('content_copy')} نسخ الإجابات</button>` : `<button type="button" class="pe-dl-btn wa" data-bf="send">${ic('chat')} تذكير بواتساب</button>`}
                    <button type="button" class="pe-dl-btn ghost" data-bf="copy">${ic('link')} نسخ الرابط</button>
                </div>`}`;
        // فتح الإجابات يزيلها من الجرس
        if (answered && !ref.seen && window.db) window.db.ref('briefs/' + p.brief.token + '/seen').set(true).catch(() => null);
    }
    const clientOf = p => C().find(x => x.company === p.client || x.name === p.client);
    function sendWa(p, t, reminder) {
        const c = clientOf(p);
        if (!c || !c.phone) return rnAlert('⚠️ لا يوجد رقم جوال مسجّل لهذا العميل');
        window.open(RNAN.waLink(c.phone, `السلام عليكم ${c.name || c.company} 👋\n\n${reminder ? 'تذكير لطيف بنموذج' : 'نبدأ مشروع'} «${p.name}» ${reminder ? 'متطلبات المشروع 🙏' : 'بنموذج قصير لمتطلباتك ✍️'}\nإجاباتك تساعدنا نفهم نشاطك وذوقك من البداية ونختصر جولات التعديل — يأخذ دقائق فقط:\n${link(t)}\n\nرنان لخدمات التصميم`), '_blank');
    }
    async function create(p) {
        const t = RNAN.newToken(), at = new Date().toISOString();
        const type = p.type || (window.ProjectsUI && ProjectsUI.typeOf ? (ProjectsUI.typeOf(p) || {}).id : '') || 'other';
        try {
            await window.db.ref().update({
                ['briefs/' + t]: { projectKey: p.rowIndex, projectName: p.name || '', client: p.client || '', type, status: 'sent', createdAt: at },
                [`projects/${p.rowIndex}/brief`]: { token: t, status: 'sent', sentAt: at }
            });
            p.brief = { token: t, status: 'sent', sentAt: at };
            briefs[t] = { projectKey: p.rowIndex, projectName: p.name, client: p.client, type, status: 'sent', createdAt: at };
            fill(p);
            sendWa(p, t, false);
            toast('📝 أُنشئ نموذج المتطلبات — أرسله للعميل من واتساب');
        } catch (e) { rnAlert('تعذّر إنشاء النموذج: ' + ((e && e.message) || 'تحقّق من الاتصال')); }
    }
    function copy(text, msg) {
        const done = () => toast(msg);
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, done); else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* */ } ta.remove(); done(); }
    }
    document.addEventListener('click', e => {
        const open = e.target.closest('[data-brief-open]');
        if (open) { const i = P().findIndex(p => String(p.rowIndex) === String(open.dataset.briefOpen)); if (i > -1) window.openProjectModal('edit', i); return; }
        const b = e.target.closest('#pe-brief-sec [data-bf]');
        if (!b) return;
        const p = P().find(x => String(x.rowIndex) === String(cur));
        if (!p) return;
        const a = b.dataset.bf, t = p.brief && p.brief.token;
        if (a === 'create') create(p);
        else if (a === 'send' && t) sendWa(p, t, true);
        else if (a === 'copy' && t) copy(link(t), '🔗 نُسخ رابط النموذج');
        else if (a === 'copy-answers' && t) {
            const ref = briefs[t] || {}, qs = window.BriefQ ? BriefQ.questions(ref.type) : [], ans = ref.answers || {};
            copy(`متطلبات «${p.name}» — ${p.client}\n\n` + qs.filter(q => ans[q.k]).map(q => `${q.t}:\n${Array.isArray(ans[q.k]) ? ans[q.k].join('، ') : ans[q.k]}`).join('\n\n'), '📋 نُسخت الإجابات');
        }
    });
    const prev = window.openProjectModal;
    if (typeof prev === 'function') {
        const wrapped = function (mode, index) {
            const r = prev.apply(this, arguments);
            const p = mode === 'edit' ? P()[index] : null;
            cur = p ? p.rowIndex : null;
            fill(p);
            return r;
        };
        Object.keys(prev).forEach(k => { wrapped[k] = prev[k]; });
        window.openProjectModal = wrapped;
    }
    const origLoad = window.loadAllData;
    if (typeof origLoad === 'function') window.loadAllData = function () { const r = origLoad.apply(this, arguments); setTimeout(start, 2500); return r; };
    window.BriefAdmin = { link, briefs: () => briefs };
})();
