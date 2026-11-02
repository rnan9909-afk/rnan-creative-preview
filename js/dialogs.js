// نوافذ رنان بدل نوافذ المتصفح: rnAlert (تنبيه) و rnConfirm (تأكيد يعيد Promise<boolean>) و rnPrompt (إدخال نص).
// تستبدل window.alert كليًّا: رسائل النجاح القصيرة («تم…») تظهر تنبيهًا سفليًا، والبقية نافذة بأيقونة ونبرة مناسبة.
// نافذة وسطى على الشاشات الكبيرة، ولوحة سفلية على الجوال. الأنماط في css/dialogs.css.
(function () {
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const TONES = { info: 'info', ok: 'check_circle', warn: 'warning', danger: 'delete_forever', ask: 'help' };
    const queue = [];
    let wrap = null, current = null;

    function tone(msg, kind) {
        const m = String(msg || '');
        if (kind === 'confirm') return /حذف|نهائي|لا يمكن التراجع|يتوقف|سيتوقف/.test(m) ? 'danger' : 'ask';
        if (/⚠️|خطأ|تعذّر|تعذر|لا يمكن|غير موجود|لم يتم العثور/.test(m)) return 'warn';
        if (/^\s*(✅|🎉)|^\s*تم\s|^\s*تمت\s/.test(m)) return 'ok';
        return 'info';
    }
    function build() {
        wrap = document.createElement('div');
        wrap.className = 'rd-wrap no-print';
        wrap.hidden = true;
        wrap.innerHTML = '<div class="rd-scrim"></div><section class="rd-dlg" role="alertdialog" aria-modal="true" aria-labelledby="rd-t" aria-describedby="rd-m"></section>';
        document.body.appendChild(wrap);
        wrap.addEventListener('click', e => {
            const b = e.target.closest('[data-rd]');
            if (b) return finish(b.dataset.rd === 'ok');
            if (e.target.classList.contains('rd-scrim') && current && current.kind !== 'confirm') finish(true);
        });
        wrap.addEventListener('keydown', e => {
            if (e.key === 'Escape') { e.preventDefault(); finish(current && current.kind === 'alert'); }
            else if (e.key === 'Enter' && current && (current.kind !== 'prompt' || e.target.matches('input'))) { e.preventDefault(); finish(true); }
        });
    }
    function show(item) {
        if (!wrap) build();
        current = item;
        const t = item.tone, o = item.opts;
        const title = o.title || (item.kind === 'confirm' ? (t === 'danger' ? 'تأكيد الحذف' : 'تأكيد') : item.kind === 'prompt' ? 'أدخل القيمة' : t === 'warn' ? 'تنبيه' : t === 'ok' ? 'تم' : 'معلومة');
        const okText = o.ok || (item.kind === 'confirm' ? (/حذف/.test(item.msg) ? 'نعم، احذف' : 'متابعة') : item.kind === 'prompt' ? 'حفظ' : 'حسنًا');
        wrap.querySelector('.rd-dlg').className = 'rd-dlg ' + t;
        wrap.querySelector('.rd-dlg').innerHTML = `<div class="rd-grab"></div>
            <div class="rd-ic">${ic(o.icon || TONES[t])}</div>
            <h3 id="rd-t">${esc(title)}</h3>
            <p id="rd-m">${esc(item.msg).replace(/\n/g, '<br>')}</p>
            ${item.kind === 'prompt' ? `<input class="rd-in" value="${esc(o.value || '')}" placeholder="${esc(o.placeholder || '')}" autocomplete="off">` : ''}
            <div class="rd-btns${item.kind === 'alert' ? ' one' : ''}">
                <button type="button" class="rd-ok" data-rd="ok">${esc(okText)}</button>
                ${item.kind !== 'alert' ? `<button type="button" class="rd-no" data-rd="no">${esc(o.cancel || 'إلغاء')}</button>` : ''}
            </div>`;
        wrap.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
        setTimeout(() => { const f = wrap.querySelector('.rd-in') || wrap.querySelector(item.kind === 'confirm' && t === 'danger' ? '.rd-no' : '.rd-ok'); if (f) f.focus(); }, 60);
    }
    function finish(ok) {
        if (!current) return;
        const item = current, val = item.kind === 'prompt' ? (ok ? wrap.querySelector('.rd-in').value : null) : ok;
        current = null;
        wrap.classList.remove('open');
        setTimeout(() => {
            if (wrap.classList.contains('open')) return;
            wrap.hidden = true;
            const next = queue.shift();
            if (next) show(next);
        }, 220);
        item.resolve(item.kind === 'alert' ? undefined : val);
    }
    function open(kind, msg, opts) {
        return new Promise(resolve => {
            const item = { kind, msg: String(msg == null ? '' : msg), opts: opts || {}, resolve };
            item.tone = (opts && opts.tone) || tone(item.msg, kind);
            if (current || (wrap && !wrap.hidden)) queue.push(item); else show(item);
        });
    }
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    function rnAlert(msg, opts) {
        // رسائل النجاح القصيرة لا تستحق نافذة توقف العمل
        if (!opts && tone(msg) === 'ok' && String(msg).length < 120 && toast(String(msg)) !== null) return Promise.resolve();
        return open('alert', msg, opts);
    }
    const rnConfirm = (msg, opts) => open('confirm', msg, opts);
    const rnPrompt = (msg, opts) => open('prompt', msg, opts);
    window.alert = m => { rnAlert(m); };
    Object.assign(window, { rnAlert, rnConfirm, rnPrompt });
})();
