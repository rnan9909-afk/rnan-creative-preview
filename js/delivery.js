// تسليم الملفات النهائية: قسم في نافذة المشروع لرابط التسليم (Drive أو WeTransfer أو غيره) مع ملاحظة للعميل، يُحفظ في projects/<id>/delivery
// ويظهر للعميل داخل مشروعه في صفحته الخاصة (js/portal-pay.js)، مع إرسال الرابط بواتساب. الأنماط في css/polish.css.
(function () {
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const C = () => (typeof clientsData !== 'undefined' ? clientsData : []);
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    const ok = u => /^https?:\/\/[^\s.]+\.[^\s]+/i.test(String(u || '').trim());
    const sync = client => { if (typeof backendFunctions !== 'undefined' && backendFunctions.syncClientPortal) backendFunctions.syncClientPortal(client).catch(() => null); };
    let cur = null;

    function section() {
        let sec = document.getElementById('pe-deliver-sec');
        if (sec) return sec;
        const proof = document.getElementById('pe-proof-sec');
        if (!proof) return null;
        proof.insertAdjacentHTML('afterend', `<section class="pe-sec pe-deliver" id="pe-deliver-sec" style="--o:3">
            <h4>${ic('inventory_2')} تسليم الملفات النهائية</h4>
            <p class="pe-dl-hint">رابط Google Drive أو WeTransfer أو غيره — يظهر للعميل داخل مشروعه في صفحته الخاصة.</p>
            <input id="pe-dl-url" class="form-input-modern" dir="ltr" placeholder="https://drive.google.com/..." autocomplete="off" inputmode="url">
            <input id="pe-dl-note" class="form-input-modern" placeholder="ملاحظة للعميل (اختياري): الملفات النهائية والمفتوحة بكل المقاسات">
            <p class="pe-dl-err" id="pe-dl-err" hidden></p>
            <div class="pe-dl-acts">
                <button type="button" class="pe-dl-btn main" data-dl="save">${ic('save')} حفظ الرابط</button>
                <button type="button" class="pe-dl-btn wa" data-dl="wa">${ic('chat')} إرسال للعميل</button>
                <button type="button" class="pe-dl-btn ghost" data-dl="remove" hidden>${ic('link_off')} إزالة</button>
            </div>
            <small class="pe-dl-at" id="pe-dl-at"></small>
        </section>`);
        return document.getElementById('pe-deliver-sec');
    }
    function fill(p) {
        const sec = section();
        if (!sec) return;
        sec.hidden = !p;
        if (!p) return;
        const d = p.delivery || {};
        document.getElementById('pe-dl-url').value = d.url || '';
        document.getElementById('pe-dl-note').value = d.note || '';
        document.getElementById('pe-dl-err').hidden = true;
        sec.querySelector('[data-dl="remove"]').hidden = !d.url;
        document.getElementById('pe-dl-at').textContent = d.at ? 'يراه العميل منذ ' + new Date(d.at).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long' }) : '';
    }
    const err = m => { const e = document.getElementById('pe-dl-err'); e.textContent = m; e.hidden = !m; };
    async function save(remove) {
        const p = cur && P().find(x => String(x.rowIndex) === String(cur));
        if (!p) return;
        const url = document.getElementById('pe-dl-url').value.trim(), note = document.getElementById('pe-dl-note').value.trim().slice(0, 200);
        if (!remove && !ok(url)) { err('الصق رابطًا كاملًا يبدأ بـ https://'); return false; }
        err('');
        const val = remove ? null : { url, note, at: (p.delivery && p.delivery.url === url && p.delivery.at) || new Date().toISOString() };
        try {
            await window.db.ref('projects/' + p.rowIndex + '/delivery').set(val);
            p.delivery = val;
            sync(p.client);
            fill(p);
            toast(remove ? '🔗 أُزيل رابط التسليم من صفحة العميل' : '📦 حُفظ رابط التسليم — يظهر الآن في صفحة العميل');
            return true;
        } catch (e) { err('تعذّر الحفظ: ' + ((e && e.message) || 'تحقّق من الاتصال')); return false; }
    }
    async function sendWa() {
        const p = cur && P().find(x => String(x.rowIndex) === String(cur));
        if (!p) return;
        if (!(p.delivery && p.delivery.url === document.getElementById('pe-dl-url').value.trim())) { if (!(await save(false))) return; }
        const c = C().find(x => x.company === p.client || x.name === p.client);
        if (!c || !c.phone) return rnAlert('⚠️ لا يوجد رقم جوال مسجّل لهذا العميل');
        const portal = c.token ? RNAN.portalUrl(c.token) : '';
        window.open(RNAN.waLink(c.phone, `السلام عليكم ${c.name || c.company} 👋\n\nملفات مشروع «${p.name}» النهائية جاهزة 🎉\n📦 رابط التسليم:\n${p.delivery.url}\n${p.delivery.note ? '\n' + p.delivery.note + '\n' : ''}${portal ? '\nتجدونه أيضًا في صفحتكم الخاصة:\n' + portal + '\n' : ''}\nشكرًا لثقتكم — رنان لخدمات التصميم`), '_blank');
    }
    document.addEventListener('click', e => {
        const b = e.target.closest('#pe-deliver-sec [data-dl]');
        if (!b) return;
        if (b.dataset.dl === 'save') save(false);
        else if (b.dataset.dl === 'remove') save(true);
        else if (b.dataset.dl === 'wa') sendWa();
    });
    const prev = window.openProjectModal;
    if (typeof prev === 'function') {
        const wrapped = function (mode, index, opts) {
            const r = prev.apply(this, arguments);
            const p = mode === 'edit' ? P()[index] : null;
            cur = p ? p.rowIndex : null;
            fill(p);
            return r;
        };
        Object.keys(prev).forEach(k => { wrapped[k] = prev[k]; });
        window.openProjectModal = wrapped;
    }
    window.Delivery = { fill };
})();
