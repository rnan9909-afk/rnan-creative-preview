// نافذة الفاتورة (إنشاء وتعديل): بطاقة العميل (سجله والمستحق عليه)، مهلة السداد وتاريخ الاستحقاق، بنود بإجمالي لكل سطر
// واقتراحات من فواتيرك السابقة ومن مشاريع العميل، ملخص المجاميع، تحقّق قبل الحفظ بلا نوافذ المتصفح، حذف بضغطتين، ونسخة جديدة من فاتورة.
// تحافظ على معرّفات النموذج التي يقرؤها saveAndPreview في admin.html، وتستبدل addItemRow و calculateTotals و deleteInvoice.
// الأنماط في css/invoice-edit.css.
(function () {
    const PAID = 'مدفوعة', VOID = ['ملغاة', 'ملغي'];
    const TERMS = [0, 7, 15, 30];
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const $ = id => document.getElementById(id);
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => Math.round(v || 0).toLocaleString('en-US');
    const num2 = v => (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const moneyText = v => `<span class="en-num">${num(v)}</span> ر.س`;
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const diff = (a, b) => Math.round((a - b) / 864e5);
    const plural = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : n + (n <= 10 ? ' ' + few : ' ' + many);
    const days = n => plural(n, 'يوم واحد', 'يومين', 'أيام', 'يومًا');
    const invN = n => plural(n, 'فاتورة واحدة', 'فاتورتان', 'فواتير', 'فاتورة');
    const fmt = d => `<span class="en-num">${d.getDate()}</span> ${MONTHS[d.getMonth()]} <span class="en-num">${d.getFullYear()}</span>`;
    const I = () => (typeof invoicesData !== 'undefined' ? invoicesData : []);
    const C = () => (typeof clientsData !== 'undefined' ? clientsData : []);
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const amt = i => parseFloat(i.amount) || 0;
    const sum = a => a.reduce((s, i) => s + amt(i), 0);
    const clientOf = name => C().find(c => c.company === name || c.name === name);
    const hue = s => { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    const isDisc = d => /خصم|discount/i.test(d) && !/مكافأة/.test(d);
    const fire = el => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
    const curId = () => (typeof currentInvoiceId !== 'undefined' ? currentInvoiceId : null);
    const isNew = () => !curId() || curId() === 'تلقائي';

    // ── مهلة السداد وتاريخ الاستحقاق (يُحفظ في dueDate) ──
    let terms = 7, saving = false, saveTimer = null, sureDel = false;
    const savedTerms = () => { try { const v = localStorage.getItem('rnan.invTerms'); return TERMS.includes(+v) && v !== null && v !== '' ? +v : 7; } catch (e) { return 7; } };
    function setTerms(t) {
        terms = t;
        document.querySelectorAll('#ie-terms [data-terms]').forEach(b => { const on = String(b.dataset.terms) === String(t); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        $('ie-due-pick').hidden = t !== 'custom';
        syncDue();
    }
    function syncDue() {
        const d = parse($('edit-date').value) || today(), due = $('edit-due');
        if (terms === 'custom') { if (!parse(due.value)) due.value = ymd(addDays(d, 7)); }
        else if (terms === null) due.value = '';
        else due.value = ymd(addDays(d, terms));
        dueText();
    }
    function dueText() {
        const due = parse($('edit-due').value), el = $('ie-due-text'), st = $('edit-status').value;
        if (!due) { el.innerHTML = 'بدون موعد استحقاق — اختر مهلة السداد'; $('ie-due-mini').innerHTML = ''; return; }
        const n = diff(due, today());
        el.innerHTML = `تستحق في <b>${fmt(due)}</b>${terms === 0 ? ' · عند الاستلام' : ''}${n < 0 && st !== PAID ? ` <em>· مضى عليها ${days(-n)}</em>` : ''}`;
        $('ie-due-mini').innerHTML = st === PAID ? `${ic('task_alt')} مدفوعة` : VOID.includes(st) ? `${ic('block')} ملغاة` : `${ic('event')} الاستحقاق ${fmt(due)}`;
    }

    // ── بطاقة العميل ──
    function clientCard() {
        const name = $('edit-client-select').value, el = $('ie-client-card');
        if (!name) { el.hidden = true; el.innerHTML = ''; quick(); return; }
        const c = clientOf(name) || {};
        const mine = I().filter(i => i.client === name && !VOID.includes(i.status) && String(i.number) !== String(curId()));
        const open = mine.filter(i => i.status !== PAID), paid = mine.filter(i => i.status === PAID);
        el.hidden = false;
        el.innerHTML = `<div class="ie-cc-top"><span class="ie-av" style="--h:${hue(name)}">${esc(name.trim().charAt(0) || '?')}</span>
                <div><b>${esc(name)}</b><small>${c.phone ? `<span class="en-num" dir="ltr">${esc(c.phone)}</span>` : `${ic('warning')} لا يوجد رقم جوال — لن تُرسل بواتساب`}</small></div></div>
            <div class="ie-cc-n">
                <div><small>فواتير سابقة</small><b class="en-num">${mine.length}</b></div>
                <div><small>مدفوع</small><b>${moneyText(sum(paid))}</b></div>
                <div class="${open.length ? 'warn' : ''}"><small>مستحق عليه</small><b>${moneyText(sum(open))}</b></div>
            </div>
            ${open.length ? `<p class="ie-cc-warn">${ic('info')} عنده ${invN(open.length)} لم تُسدَّد بعد: ${open.slice(0, 3).map(i => `<span class="en-num" dir="ltr">#${esc(i.number)}</span>`).join('، ')}</p>` : ''}`;
        quick();
    }

    // ── البنود ──
    function history() {
        const by = {};
        I().forEach(i => (i.items || []).forEach(x => {
            const d = String(x.desc || '').trim(), p = parseFloat(x.price) || 0, t = (parse(i.date) || new Date(0)).getTime();
            if (!d || p <= 0 || isDisc(d) || /مكافأة/.test(d)) return;
            const h = by[d] || (by[d] = { d, n: 0, p, t });
            h.n++;
            if (t >= h.t) { h.t = t; h.p = p; }
        }));
        return Object.values(by).sort((a, b) => b.n - a.n || b.t - a.t);
    }
    function datalist() {
        const dl = $('ie-desc-list');
        if (!dl) return;
        const types = (window.ProjectsUI && ProjectsUI.TYPES ? ProjectsUI.TYPES : []).map(t => t.t).filter(t => t && t !== 'أخرى');
        const priced = window.PriceList ? PriceList.items().map(x => x.name) : [];
        const all = [...new Set([...priced, ...history().map(h => h.d), ...types])].slice(0, 60);
        dl.innerHTML = all.map(d => `<option value="${esc(d)}"></option>`).join('');
    }
    function quick() {
        const el = $('ie-quick');
        if (!el) return;
        const name = $('edit-client-select').value;
        const used = new Set([...document.querySelectorAll('#edit-items-container .item-desc')].map(x => x.value.trim()));
        const projs = name ? P().filter(p => p.client === name && (parseFloat(p.value) || 0) > 0 && p.status !== 'lost' && !used.has(String(p.name || '').trim())).slice(0, 4) : [];
        const hist = history().filter(h => !used.has(h.d)).slice(0, 6);
        el.innerHTML = (projs.length ? `<div class="ie-q-g"><small>${ic('folder_open')} من مشاريع العميل</small><div>${projs.map(p =>
            `<button type="button" data-ie="add" data-d="${esc(p.name)}" data-p="${parseFloat(p.value) || 0}">${ic('add')}<span>${esc(p.name)}</span><em class="en-num">${num(p.value)}</em></button>`).join('')}</div></div>` : '')
            + (hist.length ? `<div class="ie-q-g"><small>${ic('history')} خدمات استخدمتها سابقًا</small><div>${hist.map(h =>
            `<button type="button" data-ie="add" data-d="${esc(h.d)}" data-p="${h.p}">${ic('add')}<span>${esc(h.d)}</span><em class="en-num">${num(h.p)}</em></button>`).join('')}</div></div>` : '');
        el.hidden = !el.innerHTML;
    }
    function rows() { return [...document.querySelectorAll('#edit-items-container .item-row')]; }
    const blank = r => !r.querySelector('.item-desc').value.trim() && !(parseFloat(r.querySelector('.item-price').value) || 0);
    function addPrefilled(desc, price) {
        let r = rows().find(blank);
        if (!r) r = window.addItemRow({ desc: '', qty: 1, price: '' });
        r.querySelector('.item-desc').value = desc;
        r.querySelector('.item-price').value = price;
        if (!(parseFloat(r.querySelector('.item-qty').value) > 0)) r.querySelector('.item-qty').value = 1;
        window.calculateTotals();
        quick();
        r.querySelector('.item-qty').focus();
    }

    window.addItemRow = function (d) {
        d = d || {};
        const desc = d.desc || '', qty = d.qty == null || d.qty === '' ? 1 : d.qty, price = d.price == null || (d.price === 0 && !desc) ? '' : d.price;
        const tb = $('edit-items-container');
        tb.insertAdjacentHTML('beforeend', `<tr class="item-row">
            <td class="ie-i-n en-num"></td>
            <td class="ie-i-desc"><input class="item-desc" list="ie-desc-list" value="${esc(desc)}" placeholder="بيان الخدمة، مثل: تصميم هوية بصرية" aria-label="البيان" autocomplete="off"></td>
            <td class="ie-i-qty"><label><small>الكمية</small><input class="item-qty en-num" type="text" inputmode="decimal" dir="ltr" autocomplete="off" value="${esc(qty)}" aria-label="الكمية"></label></td>
            <td class="ie-i-price"><label><small>السعر</small><input class="item-price en-num" type="text" inputmode="decimal" dir="ltr" autocomplete="off" value="${esc(price)}" placeholder="0" aria-label="السعر"></label></td>
            <td class="ie-i-line"><small>الإجمالي</small><b class="en-num">0.00</b></td>
            <td class="ie-i-del"><button type="button" class="admin-only" data-ie="del-row" aria-label="حذف البند" title="حذف البند">${ic('close')}</button></td>
        </tr>`);
        window.calculateTotals();
        return tb.lastElementChild;
    };

    window.calculateTotals = function () {
        let subT = 0, n = 0;
        rows().forEach((r, k) => {
            const q = parseFloat(r.querySelector('.item-qty').value) || 0, p = parseFloat(r.querySelector('.item-price').value) || 0, line = q * p;
            subT += line;
            r.querySelector('.ie-i-line b').textContent = num2(line);
            r.querySelector('.ie-i-n').textContent = k + 1;
            r.classList.toggle('neg', line < 0);
            if (!blank(r)) n++;
        });
        const dv = parseFloat($('invoice-discount-val').value) || 0, pct = $('invoice-discount-type').value === 'percent';
        const disc = dv > 0 ? (pct ? subT * dv / 100 : dv) : 0, total = subT - disc;
        $('edit-total').innerHTML = typeof formatCurrency === 'function' ? formatCurrency(total) : num2(total);
        $('ie-subtotal').textContent = num2(subT);
        $('ie-disc-amt').textContent = '−' + num2(disc);
        $('ie-disc-row').hidden = !(disc > 0);
        $('ie-count').textContent = n ? plural(n, 'بند واحد', 'بندان', 'بنود', 'بندًا') : '';
        $('ie-bar-total').innerHTML = `<span class="en-num">${num2(total)}</span> ر.س`;
        $('ie-sum').classList.toggle('bad', total < 0);
    };

    // ── التحقّق والحفظ ──
    function showErr(msg, el) {
        const e = $('ie-err');
        e.innerHTML = `${ic('error')} ${msg}`;
        e.hidden = false;
        document.querySelectorAll('#invoice-edit-form .ie-bad').forEach(x => x.classList.remove('ie-bad'));
        if (el) { el.classList.add('ie-bad'); el.focus({ preventScroll: true }); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
    function hideErr() { $('ie-err').hidden = true; document.querySelectorAll('#invoice-edit-form .ie-bad').forEach(x => x.classList.remove('ie-bad')); }
    function validate() {
        if (!$('edit-client-select').value) return ['اختر العميل أولًا', $('edit-client-select')];
        if (!parse($('edit-date').value)) return ['حدّد تاريخ إصدار الفاتورة', $('edit-date')];
        const live = rows().filter(r => !blank(r));
        if (!live.length) return ['أضف بندًا واحدًا على الأقل', (rows()[0] || {}).querySelector ? rows()[0].querySelector('.item-desc') : null];
        for (const r of live) {
            const k = rows().indexOf(r) + 1, d = r.querySelector('.item-desc'), q = parseFloat(r.querySelector('.item-qty').value) || 0, p = parseFloat(r.querySelector('.item-price').value) || 0;
            if (!d.value.trim()) return [`اكتب بيان البند رقم ${k}`, d];
            if (!q) return [`الكمية في البند «${esc(d.value.trim())}» صفر`, r.querySelector('.item-qty')];
            if (!p) return [`أدخل سعر البند «${esc(d.value.trim())}»`, r.querySelector('.item-price')];
        }
        let subT = 0;
        rows().forEach(r => { subT += (parseFloat(r.querySelector('.item-qty').value) || 0) * (parseFloat(r.querySelector('.item-price').value) || 0); });
        const dv = parseFloat($('invoice-discount-val').value) || 0, pct = $('invoice-discount-type').value === 'percent';
        if (dv < 0 || (pct && dv > 100) || subT - (pct ? subT * dv / 100 : dv) < 0) return ['الخصم أكبر من مجموع البنود', $('invoice-discount-val')];
        const due = parse($('edit-due').value), d = parse($('edit-date').value);
        if (terms === 'custom' && due && d && due < d) return ['تاريخ الاستحقاق قبل تاريخ الإصدار', $('edit-due')];
        return null;
    }
    function busy(on) {
        saving = on;
        clearTimeout(saveTimer);
        document.querySelectorAll('#invoice-edit-form [data-ie="save"]').forEach(b => {
            b.disabled = on;
            b.innerHTML = on ? '<span class="ie-spin"></span> جارٍ الحفظ...' : `${ic('send_and_archive')} ${isNew() ? 'حفظ وإصدار' : 'حفظ التعديلات'}`;
        });
        if (on) saveTimer = setTimeout(() => { if (saving) { busy(false); showErr('تأخّر الحفظ — تحقّق من الاتصال ثم أعد المحاولة'); } }, 20000);
    }
    const origSave = window.saveAndPreview;
    window.saveAndPreview = function () {
        if (saving) return;
        const bad = validate();
        if (bad) return showErr(bad[0], bad[1]);
        hideErr();
        rows().filter(blank).forEach(r => r.remove());
        try { if (TERMS.includes(terms)) localStorage.setItem('rnan.invTerms', String(terms)); } catch (e) { /* تخزين المتصفح غير متاح */ }
        busy(true);
        return origSave.apply(this, arguments);
    };

    window.deleteInvoice = function () {
        const b = $('ie-del');
        if (isNew()) return;
        if (!sureDel) {
            sureDel = true;
            b.classList.add('sure');
            b.querySelector('span:last-child').textContent = 'اضغط مجددًا للحذف نهائيًا';
            setTimeout(() => { sureDel = false; b.classList.remove('sure'); b.querySelector('span:last-child').textContent = 'حذف الفاتورة'; }, 3500);
            return;
        }
        sureDel = false;
        b.disabled = true;
        b.querySelector('span:last-child').textContent = 'جارٍ الحذف...';
        const n = curId();
        google.script.run.withSuccessHandler(() => {
            b.disabled = false;
            closeMainModal();
            toast('🗑️ حُذفت الفاتورة ' + n);
            if (typeof loadAllData === 'function') loadAllData();
        }).withFailureHandler(e => {
            b.disabled = false;
            b.querySelector('span:last-child').textContent = 'حذف الفاتورة';
            showErr('تعذّر الحذف: ' + esc((e && e.message) || 'تحقّق من الاتصال'));
        }).deleteInvoiceFromSheet(n);
    };

    // ── فتح النافذة ──
    function head(title, sub) { $('ie-title').textContent = title; $('ie-sub').innerHTML = sub; }
    const issued = inv => `${esc(inv.client || '')} · صدرت <span class="en-num" dir="ltr">${esc(inv.date || '')}</span>`;
    function after(mode, index) {
        busy(false);
        hideErr();
        sureDel = false;
        const inv = mode === 'edit' ? I()[index] : null;
        $('ie-del').hidden = !inv;
        $('ie-del').classList.remove('sure');
        $('ie-del').querySelector('span:last-child').textContent = 'حذف الفاتورة';
        if (!inv) {
            head('فاتورة جديدة', 'اختر العميل وأضف البنود — المجاميع وتاريخ الاستحقاق تُحسب تلقائيًا');
            $('edit-date').value = ymd(today());
            $('edit-status').value = 'قيد الانتظار';
            $('edit-client-select').value = '';
            $('invoice-discount-val').value = '';
            $('invoice-discount-type').value = 'fixed';
            $('edit-due').value = '';
            setTerms(savedTerms());
        } else {
            head('تعديل الفاتورة', issued(inv));
            const d = parse(inv.date), due = parse(inv.dueDate);
            if (!due) { $('edit-due').value = ''; setTerms(null); }
            else {
                const k = d ? diff(due, d) : null;
                $('edit-due').value = ymd(due);
                setTerms(TERMS.includes(k) ? k : 'custom');
            }
        }
        plButton();
        if ($('ie-pl')) { $('ie-pl').hidden = true; document.querySelector('#invoice-edit-form [data-ie="pl"]').classList.remove('on'); }
        if (window.PriceList) PriceList.load();
        datalist();
        clientCard();
        window.calculateTotals();
        busy(false);
        const body = $('mainModal');
        if (body) body.scrollTop = 0;
    }
    const origOpen = window.openInvoiceModal;
    window.openInvoiceModal = function (mode, index) {
        const r = origOpen.apply(this, arguments);
        if ($('ie-title')) after(mode === 'edit' ? 'edit' : 'new', index);
        return r;
    };

    // بعد «حفظ وإصدار» تُعرض الفاتورة: نثبّت رقمها حتى لا يُنشئ «تعديل» ثم حفظ فاتورة مكرّرة، ونُظهر تاريخ الاستحقاق في النسخة المطبوعة
    const origPrint = window.printInvoiceDirectly;
    window.printInvoiceDirectly = function (inv) {
        const r = origPrint.apply(this, arguments);
        if (saving && inv && inv.number && isNew()) {
            currentInvoiceId = inv.number;
            $('edit-invoice-id').innerText = inv.number;
            $('edit-recurring-wrap').classList.add('hidden');
            $('ie-del').hidden = false;
            head('تعديل الفاتورة', issued(inv));
            toast('✅ صدرت الفاتورة ' + inv.number + ' — أرسلها للعميل من الزر أعلاها');
        }
        busy(false);
        const due = $('prev-due'), d = inv ? parse(inv.dueDate) : null;
        if (due) {
            due.hidden = !d || inv.status === PAID;
            if (d) due.querySelector('.en-num').textContent = ymd(d);
        }
        return r;
    };

    // كل تحميل للبيانات يعيد بناء قوائم العملاء فيضيع العميل المختار في نافذة مفتوحة؛ نُبقي الاختيار كما هو
    const origClients = window.updateClientDropdowns;
    if (typeof origClients === 'function') window.updateClientDropdowns = function () {
        const keep = ['edit-client-select', 'proj-client'].map(id => [$(id), $(id) && $(id).value]);
        const r = origClients.apply(this, arguments);
        keep.forEach(([el, v]) => {
            if (!el || !v) return;
            if (![...el.options].some(o => o.value === v)) el.insertAdjacentHTML('beforeend', `<option value="${esc(v)}">${esc(v)}</option>`);
            el.value = v;
        });
        return r;
    };

    // نسخة جديدة من فاتورة سابقة: نفس العميل والبنود والخصم والملاحظات، بتاريخ اليوم وحالة «بانتظار السداد»
    function duplicate(index) {
        const src = I()[index];
        if (!src) return;
        origOpen('edit', index);
        currentInvoiceId = 'تلقائي';
        $('edit-invoice-id').innerText = 'NEW';
        $('edit-recurring-wrap').classList.remove('hidden');
        $('edit-recurring').checked = false;
        after('new');
        $('edit-client-select').value = src.client;
        // after() صفّر الخصم، فنعيد قراءته من بنود الفاتورة الأصلية كما يفعل openInvoiceModal
        (src.items || []).forEach(x => {
            if ((parseFloat(x.price) || 0) < 0 && isDisc(String(x.desc || ''))) {
                const m = String(x.desc).match(/(\d+(\.\d+)?)%/);
                $('invoice-discount-val').value = m ? m[1] : Math.abs(parseFloat(x.price));
                $('invoice-discount-type').value = m ? 'percent' : 'fixed';
            }
        });
        head('نسخة جديدة', `من الفاتورة <span class="en-num" dir="ltr">#${esc(src.number)}</span> — راجع البنود ثم احفظها`);
        clientCard();
        window.calculateTotals();
    }

    // إرسال الفاتورة المعروضة للعميل من شريط المعاينة
    function sendShown() {
        const n = ($('prev-id') || {}).innerText;
        const i = I().find(x => String(x.number) === String(n || '').trim());
        if (!i) return toast('لحظات… تُحدَّث الفاتورة ثم أعد المحاولة');
        const c = clientOf(i.client);
        if (!c || !c.phone) return toast('⚠️ لا يوجد رقم جوال لهذا العميل — أضفه من صفحة العملاء');
        sendInvoiceWhatsApp(I().indexOf(i));
        if (!i.sentAt && i.status !== PAID && window.db && i.id) { i.sentAt = new Date().toISOString(); window.db.ref('invoices/' + i.id + '/sentAt').set(i.sentAt).catch(() => null); }
        if (window.InvoicesPage) InvoicesPage.render();
    }

    // ── الأحداث ──
    document.addEventListener('click', e => {
        const b = e.target.closest('#invoice-edit-form [data-ie], #invoice-edit-form [data-terms]');
        if (!b) return;
        if (b.dataset.terms !== undefined) { const t = b.dataset.terms; setTerms(t === 'custom' ? 'custom' : +t); return; }
        const a = b.dataset.ie;
        if (a === 'del-row') {
            const r = b.closest('.item-row');
            r.remove();
            if (!rows().length) window.addItemRow();
            window.calculateTotals();
            quick();
        } else if (a === 'add-row') { const r = window.addItemRow(); r.querySelector('.item-desc').focus(); }
        else if (a === 'add') addPrefilled(b.dataset.d, b.dataset.p);
        else if (a === 'pl') {
            const box = $('ie-pl');
            box.hidden = !box.hidden;
            b.classList.toggle('on', !box.hidden);
            if (!box.hidden) box.innerHTML = PriceList.pickerHtml();
        }
    });
    // من قائمة الأسعار: بند بسعر الخدمة، ولوحدات الورقة/الدقيقة يتجه المؤشر إلى الكمية
    document.addEventListener('click', e => {
        const b = e.target.closest('#invoice-edit-form [data-plpick]');
        if (!b || !window.PriceList) return;
        const x = PriceList.find(b.dataset.plpick);
        if (!x) return;
        addPrefilled(x.name, x.price);
        if (x.unit !== 'item') toast(x.unit === 'page' ? '📄 السعر للورقة — اكتب عدد الصفحات في الكمية' : '⏱️ السعر للدقيقة — اكتب عدد الدقائق في الكمية');
    });
    // زر «من قائمة الأسعار» ولوحته بجانب «إضافة بند» (تُضاف مرة واحدة)
    function plButton() {
        const add = document.querySelector('#invoice-edit-form [data-ie="add-row"]');
        if (!add || !window.PriceList || $('ie-pl')) return;
        add.insertAdjacentHTML('afterend', `<button type="button" data-ie="pl" class="ie-add ghost admin-only">${ic('sell')} من قائمة الأسعار</button><div id="ie-pl" class="ie-pl pl-pick" hidden></div>`);
    }
    // الأرقام نصية حتى لا يعرضها المتصفح بالأرقام الهندية، وما يُكتب بلوحة عربية يتحوّل إلى أرقام لاتينية
    const DIGITS = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9, '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9 };
    const latin = v => String(v).replace(/[٠-٩۰-۹]/g, d => DIGITS[d]).replace(/[٬,،]/g, '').replace(/٫/g, '.').replace(/[^\d.\-]/g, ''); // الفاصلة للآلاف، و«٫» عشرية
    document.addEventListener('input', e => {
        if (!e.target.closest('#invoice-edit-form')) return;
        const t = e.target;
        if (t.matches('.item-qty, .item-price, #invoice-discount-val') && t.value !== latin(t.value)) t.value = latin(t.value);
        if (e.target.closest('#edit-items-container') || e.target.id === 'invoice-discount-val') { window.calculateTotals(); if (!$('ie-err').hidden) hideErr(); }
    });
    document.addEventListener('change', e => {
        const t = e.target;
        if (!t.closest || !t.closest('#invoice-edit-form')) return;
        if (t.id === 'edit-client-select') { clientCard(); hideErr(); }
        else if (t.id === 'edit-date') syncDue();
        else if (t.id === 'edit-due') { terms = 'custom'; dueText(); }
        else if (t.id === 'edit-status') dueText();
        else if (t.id === 'invoice-discount-type') window.calculateTotals();
        else if (t.classList.contains('item-desc')) {
            const r = t.closest('.item-row'), pr = r.querySelector('.item-price'), pl = window.PriceList && PriceList.byName(t.value);
            const h = pl ? { p: pl.price } : history().find(x => x.d === t.value.trim());
            if (h && !(parseFloat(pr.value) || 0)) { pr.value = h.p; window.calculateTotals(); }
            quick();
        }
    });
    document.addEventListener('keydown', e => {
        const t = e.target;
        if (e.key !== 'Enter' || !t.closest || !t.closest('#edit-items-container')) return;
        e.preventDefault();
        const r = t.closest('.item-row');
        if (t.classList.contains('item-desc')) return r.querySelector('.item-qty').focus();
        if (t.classList.contains('item-qty')) return r.querySelector('.item-price').focus();
        const next = r.nextElementSibling;
        if (next) return next.querySelector('.item-desc').focus();
        window.addItemRow().querySelector('.item-desc').focus();
    });

    window.InvoiceEdit = { duplicate, sendShown, setTerms };
})();
