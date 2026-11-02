// إشعارات تحويل العملاء: يرسلها العميل من صفحته («حوّلت المبلغ») إلى payClaims/<TOKEN>/<id> مع المبلغ والتاريخ وصورة الإيصال.
// هنا: متابعة لحظية، تنبيه في الجرس وعلى الجهاز، نافذة مراجعة بالإيصال، «اعتماد» يفتح نافذة السداد معبأة (InvoicesUI.pay مع claim)،
// و«لم تصل» يحفظ السبب فيظهر للعميل. تعرضها صفحة الفواتير في «يحتاج انتباهك» ولوحة الفاتورة. الأنماط في css/polish.css.
(function () {
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => (parseFloat(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const I = () => (typeof invoicesData !== 'undefined' ? invoicesData : []);
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    const ago = iso => { const n = Math.floor((Date.now() - Date.parse(iso)) / 864e5); return !iso || isNaN(n) ? '' : n <= 0 ? 'اليوم' : n === 1 ? 'أمس' : `قبل ${n} ${n <= 10 ? 'أيام' : 'يومًا'}`; };
    let all = [], started = false, first = true, wrap = null;
    const seen = new Set();

    const invoiceOf = c => I().find(i => i.id && i.id === c.invoiceId) || I().find(i => String(i.number) === String(c.number));
    const pending = () => all.filter(c => c.status === 'new' && invoiceOf(c) && invoiceOf(c).status !== 'مدفوعة');
    const forInvoice = inv => pending().filter(c => invoiceOf(c) === inv);
    const find = (t, id) => all.find(c => c.token === t && c.id === id);

    function start() {
        if (started || !window.db) return;
        started = true;
        window.db.ref('payClaims').on('value', s => {
            const list = [];
            Object.entries(s.val() || {}).forEach(([token, m]) => Object.entries(m || {}).forEach(([id, c]) => { if (c && typeof c === 'object') list.push(Object.assign({ token, id }, c)); }));
            const fresh = list.filter(c => c.status === 'new' && !seen.has(c.token + '/' + c.id));
            list.forEach(c => seen.add(c.token + '/' + c.id));
            all = list;
            if (!first) fresh.forEach(c => {
                toast(`💸 أبلغ ${c.client || 'عميل'} بتحويل ${num(c.amount)} ر.س — راجع الإيصال`);
                if (window.AdminBell) AdminBell.notify(`💸 إشعار تحويل من ${c.client || 'عميل'}`, `${num(c.amount)} ر.س للفاتورة #${c.number || ''}`, { tag: 'claim-' + c.id });
            });
            first = false;
            bell();
            if (window.InvoicesPage) InvoicesPage.render();
        }, () => null);
    }
    function bell() {
        if (!window.AdminBell) return;
        const list = pending();
        AdminBell.set('payclaims', list.map(c => `<div class="nb-item ok" data-pc-open="${esc(c.token)}/${esc(c.id)}" role="button">${ic('payments')}<div>
            <b>أبلغ ${esc(c.client || 'عميل')} بتحويل ${num(c.amount)} ر.س</b><small>الفاتورة #${esc(c.number || '')} · ${ago(c.createdAt)} · راجع الإيصال</small></div></div>`).join(''), list.length);
    }

    // ── المراجعة ──
    function review(t, id) {
        const c = find(t, id), inv = c && invoiceOf(c);
        if (!c || !inv) return toast('هذا الإشعار لم يعد متاحًا');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'bk-wrap no-print';
            wrap.hidden = true;
            document.body.appendChild(wrap);
            wrap.addEventListener('click', e => {
                const b = e.target.closest('[data-pcr]');
                if (!b) return;
                const [tt, ii] = String(b.dataset.key || '').split('/');
                if (b.dataset.pcr === 'close') close();
                else if (b.dataset.pcr === 'ok') { close(); approve(tt, ii); }
                else if (b.dataset.pcr === 'no') reject(tt, ii);
            });
        }
        const rest = window.InvoiceMoney ? InvoiceMoney.remaining(inv) : parseFloat(inv.amount) || 0, key = `${esc(c.token)}/${esc(c.id)}`;
        wrap.innerHTML = `<div class="bk-scrim" data-pcr="close"></div><section class="bk-dlg pc-dlg" role="dialog" aria-modal="true" aria-labelledby="pc-t">
            <header><span class="bk-ic">${ic('payments')}</span><div><h3 id="pc-t">إشعار تحويل من ${esc(c.client || 'العميل')}</h3><p>${ago(c.createdAt)} · الفاتورة <span class="en-num" dir="ltr">#${esc(inv.number)}</span></p></div>
                <button type="button" class="bk-x" data-pcr="close" aria-label="إغلاق">${ic('close')}</button></header>
            <div class="bk-body">
                ${c.img ? `<a class="pc-img" href="${c.img}" target="_blank" rel="noopener" title="فتح الإيصال بحجمه الكامل"><img src="${c.img}" alt="إيصال التحويل"></a>` : `<div class="bk-status warn">${ic('image_not_supported')}<div><b>لم يرفق العميل صورة إيصال</b><small>طابق المبلغ مع كشف حسابك قبل الاعتماد</small></div></div>`}
                <dl class="pc-sum">
                    <div><dt>المبلغ المحوَّل</dt><dd class="en-num">${num(c.amount)} ر.س</dd></div>
                    <div><dt>المتبقي في الفاتورة</dt><dd class="en-num">${num(rest)} ر.س</dd></div>
                    <div><dt>تاريخ التحويل</dt><dd class="en-num">${esc(c.day || '—')}</dd></div>
                    <div><dt>طريقة الدفع</dt><dd>${esc(c.method || '—')}</dd></div>
                </dl>
                ${c.note ? `<p class="pc-note">${ic('format_quote')} ${esc(c.note)}</p>` : ''}
                <div class="bk-row"><button type="button" class="bk-btn main" data-pcr="ok" data-key="${key}">${ic('task_alt')} اعتماد السداد</button>
                    <button type="button" class="bk-btn danger" data-pcr="no" data-key="${key}">${ic('close')} لم تصل</button></div>
            </div></section>`;
        wrap.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
    }
    function close() { if (!wrap) return; wrap.classList.remove('open'); setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 260); }
    // اعتماد: نافذة السداد معبأة بما أبلغ به العميل، وتُعلَّم الحالة عند الحفظ (js/invoices.js)
    function approve(t, id) {
        const c = find(t, id), inv = c && invoiceOf(c);
        if (!inv || !window.InvoicesUI) return;
        InvoicesUI.pay(I().indexOf(inv), { amount: c.amount, day: /^\d{4}-\d{2}-\d{2}$/.test(c.day || '') ? c.day : '', method: c.method, claim: { token: t, id } });
    }
    async function reject(t, id) {
        const reason = await rnPrompt('سبب عدم اعتماد التحويل (يظهر للعميل في صفحته)', { title: 'لم تصل الحوالة', value: 'لم تصل الحوالة إلى حسابنا بعد — تواصل معنا لمطابقتها', ok: 'حفظ', tone: 'warn' });
        if (reason === null) return;
        try {
            await window.db.ref(`payClaims/${t}/${id}`).update({ status: 'rejected', reason: String(reason).slice(0, 300), reviewedAt: new Date().toISOString() });
            close();
            toast('↩️ أُبلغ العميل بأن التحويل لم يُعتمد');
        } catch (e) { rnAlert('تعذّر الحفظ: ' + ((e && e.message) || 'تحقّق من الاتصال')); }
    }

    document.addEventListener('click', e => {
        const o = e.target.closest('[data-pc-open]');
        if (o) { const [t, id] = o.dataset.pcOpen.split('/'); review(t, id); return; }
        const im = e.target.closest('[data-pc-img]');
        if (im) { const [t, id] = im.dataset.pcImg.split('/'); review(t, id); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && wrap && !wrap.hidden) close(); });
    const origLoad = window.loadAllData;
    if (typeof origLoad === 'function') window.loadAllData = function () { const r = origLoad.apply(this, arguments); setTimeout(() => { start(); bell(); }, 2500); return r; };
    window.PayClaims = { pending, forInvoice, invoiceOf, review, approve, reject, refresh: bell, all: () => all };
})();
