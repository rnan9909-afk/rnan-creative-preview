// صفحة الفواتير: قائمة «الجهة» في الفلاتر، بطاقات الفواتير على الجوال (بدل الجدول العريض)،
// واعتماد السداد السريع للفواتير قيد الانتظار بنافذة تأكيد (مع طريقة الدفع وتاريخه). الأنماط في css/invoices.css.
(function () {
    const PAID = 'مدفوعة';
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const WA = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98 1-3.63-.24-.37a9.83 9.83 0 0 1 15.24-12.13 9.76 9.76 0 0 1 2.88 6.95c0 5.42-4.41 9.83-9.79 9.83zm8.36-18.2A11.74 11.74 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.87 11.87 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41z"/></svg>';
    const money = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : esc(v));
    const isAdmin = () => typeof currentUserRole === 'undefined' || currentUserRole === 'admin';
    const indexOf = num => invoicesData.findIndex(x => x.number === num);
    const payable = i => !!i && isAdmin() && ![PAID, 'ملغي', 'ملغاة'].includes(i.status);
    const METHODS = ['تحويل بنكي', 'STC Pay', 'Apple Pay', 'نقدًا', 'أخرى'];
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const lastMethod = () => { try { return METHODS.includes(localStorage.getItem('rnan.payMethod')) ? localStorage.getItem('rnan.payMethod') : METHODS[0]; } catch (e) { return METHODS[0]; } };

    // ── قائمة الجهات: من أسماء العملاء في الفواتير، مع الإبقاء على الاختيار الحالي ──
    function fillClients() {
        const sel = document.getElementById('filter-client');
        if (!sel) return;
        const cur = sel.value;
        const names = [...new Set(invoicesData.map(i => (i.client || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
        if (cur && !names.includes(cur)) names.unshift(cur);
        const key = names.join('|');
        if (sel.dataset.key === key) return;
        sel.dataset.key = key;
        sel.innerHTML = '<option value="">كل الجهات</option>' + names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
        sel.value = cur;
    }

    // ── بطاقات الجوال ──
    function cards(list) {
        const box = document.getElementById('invoices-cards');
        if (!box) return;
        if (!list.length) {
            box.innerHTML = `<div class="inv-empty">${ic('receipt_long')}<p>لا توجد فواتير مطابقة</p></div>`;
            return;
        }
        const admin = isAdmin();
        const n = list.length;
        box.innerHTML = `<p class="inv-count">${n === 1 ? 'فاتورة واحدة' : n === 2 ? 'فاتورتان' : n + (n <= 10 ? ' فواتير' : ' فاتورة')}</p>` + list.map(i => {
            const paid = i.status === PAID;
            const idx = indexOf(i.number);
            return `<article class="inv-card ${paid ? 'paid' : 'pending'}" data-i="${idx}">
                <header class="inv-card-top">
                    <span class="inv-av">${esc((i.client || '?').trim().charAt(0))}</span>
                    <div class="inv-who"><b>${esc(i.client)}</b><small dir="ltr">#${esc(i.number)}</small></div>
                    <span class="inv-st">${esc(i.status || 'غير محدد')}</span>
                </header>
                <div class="inv-card-mid">
                    <div><small>المبلغ</small><strong>${money(i.amount)}</strong></div>
                    <div><small>التاريخ</small><span class="en-num">${esc(i.date || '-')}</span></div>
                </div>
                ${payable(i) ? `<button type="button" class="inv-paybtn" data-act="pay">${ic('task_alt')} اعتماد السداد</button>` : ''}
                <div class="inv-acts${admin ? '' : ' two'}">
                    <button type="button" data-act="edit"><i class="edit">${ic(admin ? 'edit_square' : 'visibility')}</i><span>${admin ? 'تعديل' : 'عرض'}</span></button>
                    ${admin ? `<button type="button" data-act="wa"><i class="wa">${WA}</i><span>إرسال</span></button>` : ''}
                    <button type="button" data-act="print"><i class="print">${ic('print')}</i><span>طباعة</span></button>
                </div>
            </article>`;
        }).join('');
    }

    // ── أزرار الإجراءات في جدول سطح المكتب (السداد أولًا، ومكانه محجوز في المدفوعة لتصطفّ الأيقونات) ──
    function actions(i, idx) {
        const admin = isAdmin();
        return `<div class="inv-actions" data-i="${idx}">
            ${payable(i) ? `<button type="button" class="inv-a pay" data-act="pay" title="اعتماد السداد">${ic('task_alt')}<em>سداد</em></button>` : '<span class="inv-a-gap"></span>'}
            <button type="button" class="inv-a edit" data-act="edit" title="${admin ? 'تعديل الفاتورة' : 'عرض الفاتورة'}">${ic(admin ? 'edit_square' : 'visibility')}</button>
            ${admin ? `<button type="button" class="inv-a wa" data-act="wa" title="إرسال عبر واتساب">${WA}</button>` : ''}
            <button type="button" class="inv-a print" data-act="print" title="طباعة / PDF">${ic('print')}</button>
        </div>`;
    }

    document.addEventListener('click', e => {
        const b = e.target.closest('#invoices-cards [data-act], #invoices-list [data-act]');
        if (!b) return;
        const idx = +b.closest('[data-i]').dataset.i;
        const inv = invoicesData[idx];
        if (!inv) return;
        const act = b.dataset.act;
        if (act === 'pay') pay(idx);
        else if (act === 'edit') openInvoiceModal('edit', idx);
        else if (act === 'wa') sendInvoiceWhatsApp(idx);
        else if (act === 'print') printInvoiceDirectly(inv);
    });

    // ── اعتماد السداد: نافذة تأكيد (لوحة سفلية على الجوال، نافذة وسطى على الشاشات الكبيرة) ──
    let dlg = null, busy = false;
    function openDlg(html) {
        if (!dlg) {
            dlg = document.createElement('div');
            dlg.className = 'inv-dlg-wrap no-print';
            dlg.hidden = true;
            dlg.innerHTML = '<div class="inv-dlg-scrim" data-no></div><section class="inv-dlg" role="alertdialog" aria-modal="true" aria-labelledby="inv-dlg-title"></section>';
            document.body.appendChild(dlg);
            dlg.addEventListener('click', e => { if (e.target.closest('[data-no]') && !busy) closeDlg(); });
            document.addEventListener('keydown', e => { if (e.key === 'Escape' && dlg && !dlg.hidden && !busy) closeDlg(); });
        }
        dlg.querySelector('.inv-dlg').innerHTML = html;
        if (dlg.hidden) {
            dlg.hidden = false;
            requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('open')));
        }
    }
    function closeDlg() {
        if (!dlg || dlg.hidden) return;
        dlg.classList.remove('open');
        setTimeout(() => { if (!dlg.classList.contains('open')) dlg.hidden = true; }, 320);
    }

    function pay(idx) {
        const inv = invoicesData[idx];
        if (!payable(inv)) return;
        const num = inv.number;
        openDlg(`<div class="inv-grab"></div>
            <div class="inv-dlg-ic">${ic('payments')}</div>
            <h3 id="inv-dlg-title">تأكيد سداد الفاتورة</h3>
            <p class="inv-dlg-q">هل أنت متأكد من تحويل هذه الفاتورة إلى <b>مدفوعة</b>؟</p>
            <dl class="inv-dlg-sum">
                <div><dt>الجهة</dt><dd>${esc(inv.client)}</dd></div>
                <div><dt>رقم الفاتورة</dt><dd dir="ltr">#${esc(num)}</dd></div>
                <div><dt>التاريخ</dt><dd class="en-num">${esc(inv.date || '-')}</dd></div>
                <div class="amt"><dt>المبلغ</dt><dd>${money(inv.amount)}</dd></div>
            </dl>
            <div class="inv-dlg-pm"><small>طريقة الدفع</small>
                <div role="radiogroup" aria-label="طريقة الدفع">${METHODS.map(m => `<button type="button" role="radio" data-pm="${m}" class="${m === lastMethod() ? 'on' : ''}" aria-checked="${m === lastMethod()}">${m}</button>`).join('')}</div></div>
            <label class="inv-dlg-date"><small>تاريخ السداد</small><input type="date" class="inv-dlg-in" value="${ymd(new Date())}"></label>
            <p class="inv-dlg-note">${ic('info')} تُضاف نقاط الولاء لحساب العميل ويصله إشعار بالسداد في صفحته.</p>
            <p class="inv-dlg-err" hidden></p>
            <div class="inv-dlg-btns">
                <button type="button" class="inv-ok" data-ok>${ic('check_circle')} نعم، اعتماد السداد</button>
                <button type="button" class="inv-no" data-no>إلغاء</button>
            </div>`);
        dlg.querySelectorAll('[data-pm]').forEach(b => b.addEventListener('click', () => {
            dlg.querySelectorAll('[data-pm]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
        }));
        dlg.querySelector('[data-ok]').addEventListener('click', () => confirmPay(num));
    }

    function confirmPay(num) {
        const idx = indexOf(num);
        const inv = invoicesData[idx];
        if (busy || !inv) return;
        busy = true;
        const ok = dlg.querySelector('[data-ok]'), err = dlg.querySelector('.inv-dlg-err');
        if (navigator.onLine === false) {
            busy = false;
            err.textContent = 'لا يوجد اتصال بالإنترنت، أعد المحاولة بعد عودة الاتصال.';
            err.hidden = false;
            return;
        }
        const pm = (dlg.querySelector('[data-pm].on') || {}).dataset;
        const method = pm ? pm.pm : '';
        const day = (dlg.querySelector('.inv-dlg-in') || {}).value || '';
        if (day && day > ymd(new Date())) {
            busy = false;
            err.textContent = 'تاريخ السداد لا يكون في المستقبل.';
            err.hidden = false;
            return;
        }
        // سداد اليوم بوقته الفعلي، وسداد يوم سابق عند منتصف نهاره
        const paidAt = !day || day === ymd(new Date()) ? new Date().toISOString() : new Date(day + 'T12:00:00').toISOString();
        try { if (method) localStorage.setItem('rnan.payMethod', method); } catch (e) { /* تخزين المتصفح غير متاح */ }
        ok.disabled = true;
        ok.innerHTML = `<span class="inv-spin"></span> جارٍ الاعتماد...`;
        err.hidden = true;
        google.script.run.withSuccessHandler(() => {
            busy = false;
            inv.status = PAID;
            inv.paidAt = paidAt;
            if (method) inv.payMethod = method;
            if (typeof filterInvoices === 'function') filterInvoices();
            if (typeof loadAllData === 'function') loadAllData();
            openDlg(`<div class="inv-grab"></div>
                <div class="inv-dlg-ic ok">${ic('check')}</div>
                <h3 id="inv-dlg-title">تم اعتماد السداد</h3>
                <p class="inv-dlg-q">الفاتورة <b dir="ltr">#${esc(num)}</b> لـ${esc(inv.client)} أصبحت <b>مدفوعة</b>${method ? ' · ' + esc(method) : ''}.</p>
                <div class="inv-dlg-btns">
                    <button type="button" class="inv-ok wa" data-wa>${WA} إرسال تأكيد السداد للعميل</button>
                    <button type="button" class="inv-no" data-no>تم</button>
                </div>`);
            dlg.querySelector('[data-wa]').addEventListener('click', () => {
                const i = indexOf(num);
                if (i > -1) { invoicesData[i].status = PAID; sendInvoiceWhatsApp(i); }
                closeDlg();
            });
        }).withFailureHandler(e => {
            busy = false;
            ok.disabled = false;
            ok.innerHTML = `${ic('check_circle')} نعم، اعتماد السداد`;
            err.textContent = 'تعذّر اعتماد السداد: ' + ((e && e.message) || e || 'تحقّق من الاتصال');
            err.hidden = false;
        }).saveInvoiceToSheet({
            invoiceNumber: inv.number,
            clientSelect: inv.client,
            issueDate: inv.date,
            status: PAID,
            totalAmount: inv.amount,
            items: inv.items,
            notes: inv.notes,
            footerText: inv.footerText,
            paidAt: paidAt,
            payMethod: method
        });
    }

    window.InvoicesUI = { fillClients, cards, actions, pay, payable };
})();
