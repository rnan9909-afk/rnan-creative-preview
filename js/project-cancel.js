// إلغاء المشروع حين يلغيه العميل: نافذة تأكيد بسبب اختياري، وإزالة سعره من فواتيره غير المدفوعة (js/project-invoice.js)،
// فينتقل إلى الأرشيف بحالة «ملغي» ويختفي من المشاريع الجارية وصفحة العميل ويصله إشعار. «استعادة المشروع» تعيده إلى التنفيذ.
// تفتحها قائمة «⋯» في صفحة المشاريع وزر «ملغي» في نافذة المشروع. أنماط النافذة rd- من css/dialogs.css و pc- من css/project-edit.css.
(function () {
    const CANCEL = 'ملغي', ACTIVE = 'قيد التنفيذ';
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => (Math.round((parseFloat(v) || 0) * 100) / 100).toLocaleString('en-US');
    const run = (fn, ...a) => new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...a));
    const reload = () => new Promise(res => (typeof loadAllData === 'function' ? loadAllData(res) : res()));
    const toast = (m, a) => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m, a) : window.showAdminToast ? showAdminToast(m) : null);
    const payload = (p, patch) => Object.assign({
        rowIndex: p.rowIndex, code: p.code, name: p.name, client: p.client, value: p.value, progress: p.progress, deadline: p.deadline,
        startDate: p.startDate, status: p.status, steps: p.steps || [], notes: p.notes || '', quotation: p.quotation || null, type: p.type || ''
    }, patch);
    let wrap = null, cur = null;

    function invRow(L) {
        const n = `<span class="en-num" dir="ltr">${esc(L.inv.number)}</span>`;
        if (L.action === 'remove') return `<label class="pc-opt"><input type="checkbox" data-pc-inv="${esc(L.inv.number)}" checked>
            <span><b>إزالة بنده من الفاتورة ${n}</b><small>−<span class="en-num">${num(L.own)}</span> ر.س · يصير إجماليها <span class="en-num">${num(L.after)}</span> ر.س</small></span></label>`;
        if (L.action === 'void') return `<label class="pc-opt"><input type="checkbox" data-pc-inv="${esc(L.inv.number)}" checked>
            <span><b>إلغاء الفاتورة ${n}</b><small>المشروع بندها الوحيد (<span class="en-num">${num(L.own)}</span> ر.س)</small></span></label>`;
        return `<p class="pc-note">${ic('info')}<span>${L.action === 'paid' ? `الفاتورة ${n} مدفوعة وفيها هذا المشروع — إن أعدت المبلغ للعميل فعدّلها من صفحة الفواتير.`
            : `الفاتورة ${n} عليها دفعة — عدّل بنودها من صفحة الفواتير.`}</span></p>`;
    }
    function build() {
        wrap = document.createElement('div');
        wrap.className = 'rd-wrap pc-wrap no-print';
        wrap.hidden = true;
        document.body.appendChild(wrap);
        wrap.addEventListener('click', e => {
            const b = e.target.closest('[data-pc]');
            if (b) return b.dataset.pc === 'ok' ? confirm() : finish(false);
            if (e.target.classList.contains('rd-scrim')) finish(false);
        });
        wrap.addEventListener('keydown', e => {
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
            else if (e.key === 'Enter' && e.target.matches('.pc-reason')) { e.preventDefault(); confirm(); }
        });
    }
    function finish(ok) {
        if (!cur || cur.busy) return;
        const c = cur;
        cur = null;
        wrap.classList.remove('open');
        setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 220);
        c.resolve(ok);
    }

    // p: المشروع من projectsData — يعيد Promise<boolean>
    function ask(p) {
        if (!p || !p.rowIndex) return Promise.resolve(false);
        if (cur) return Promise.resolve(false);
        if (!wrap) build();
        const links = window.ProjectInvoice ? ProjectInvoice.linked(p.client, p.name) : [];
        return new Promise(resolve => {
            cur = { p, links, resolve, busy: false };
            wrap.innerHTML = `<div class="rd-scrim"></div>
                <section class="rd-dlg danger pc-dlg" role="dialog" aria-modal="true" aria-labelledby="pc-t">
                    <div class="rd-grab"></div>
                    <div class="rd-ic">${ic('block')}</div>
                    <h3 id="pc-t">إلغاء المشروع</h3>
                    <p class="pc-sub">«${esc(p.name)}»${p.client ? ' · ' + esc(p.client) : ''}</p>
                    <p class="pc-what">ينتقل إلى الأرشيف بحالة «ملغي»، ويختفي من المشاريع الجارية ومن صفحة العميل، ويصل العميل إشعار بالإلغاء. تستطيع استعادته متى شئت.</p>
                    <label class="pc-f"><span>سبب الإلغاء <em>اختياري</em></span><input class="rd-in pc-reason" maxlength="200" autocomplete="off" placeholder="مثال: العميل أجّل الفكرة"></label>
                    ${links.length ? `<div class="pc-inv"><b class="pc-inv-h">${ic('receipt_long')} ${links.length > 1 ? 'فواتير فيها هذا المشروع' : 'فاتورة فيها هذا المشروع'}</b>${links.map(invRow).join('')}</div>` : ''}
                    <p class="pc-err" role="alert" hidden></p>
                    <div class="rd-btns">
                        <button type="button" class="rd-ok" data-pc="ok">${ic('block')} تأكيد الإلغاء</button>
                        <button type="button" class="rd-no" data-pc="no">تراجع</button>
                    </div>
                </section>`;
            wrap.hidden = false;
            requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
            setTimeout(() => { const f = wrap.querySelector('.pc-reason'); if (f && !window.matchMedia('(max-width: 767.98px)').matches) f.focus(); }, 80);
        });
    }

    async function confirm() {
        if (!cur || cur.busy) return;
        const { p, links } = cur, prev = p.status;
        const reason = wrap.querySelector('.pc-reason').value.trim();
        const pick = links.filter(L => { const cb = wrap.querySelector(`[data-pc-inv="${CSS.escape(String(L.inv.number))}"]`); return cb && cb.checked; });
        const ok = wrap.querySelector('.rd-ok'), err = wrap.querySelector('.pc-err');
        cur.busy = true;
        wrap.querySelectorAll('button, input').forEach(el => { el.disabled = true; });
        ok.innerHTML = '<span class="material-symbols-rounded animate-spin">sync</span> جاري الإلغاء...';
        err.hidden = true;
        try {
            await run('saveProjectToSheet', payload(p, { status: CANCEL, cancelReason: reason, cancelledAt: new Date().toISOString() }));
        } catch (e) {
            cur.busy = false;
            wrap.querySelectorAll('button, input').forEach(el => { el.disabled = false; });
            ok.innerHTML = `${ic('block')} تأكيد الإلغاء`;
            err.textContent = 'تعذّر الإلغاء: ' + ((e && e.message) || e || 'تحقّق من الاتصال');
            err.hidden = false;
            return;
        }
        // الفواتير بعد المشروع: إن تعذّرت إحداها يبقى الإلغاء ويُذكر ما لم يتم
        const done = [], failed = [];
        for (const L of pick) {
            try { done.push(await ProjectInvoice.detach(L.inv, p.name)); } catch (e) { failed.push(L.inv.number); }
        }
        cur.busy = false;
        finish(true);
        const parts = done.map(r => r.voided ? `أُلغيت الفاتورة ${r.number}` : `أُزيل بنده من ${r.number}`);
        if (failed.length) parts.push(`تعذّر تعديل ${failed.join('، ')}`);
        toast(`أُلغي «${p.name}» ونُقل إلى الأرشيف${parts.length ? ' · ' + parts.join(' · ') : ''}`, done.length ? null : ['تراجع', () => restore(p, prev, true)]);
        reload();
    }

    // إعادة المشروع الملغي إلى حالته السابقة (من «تراجع»، فيُسحب إشعار الإلغاء من العميل) أو إلى التنفيذ
    async function restore(p, to, undo) {
        try {
            await run('saveProjectToSheet', payload(p, Object.assign({ status: to && to !== CANCEL ? to : ACTIVE }, undo ? { undoCancel: true } : {})));
            toast(`أُعيد «${p.name}» إلى المشاريع الجارية`);
            reload();
            return true;
        } catch (e) {
            toast('تعذّرت الاستعادة: ' + ((e && e.message) || e || 'تحقّق من الاتصال'));
            return false;
        }
    }

    window.ProjectCancel = { ask, restore, CANCEL };
})();
