// صفحة العميل: المتبقي بعد الدفعات الجزئية وموعد الاستحقاق في قائمة الفواتير، الدفعات داخل الفاتورة، وزر «حوّلت المبلغ» يرسل فيه العميل
// المبلغ وتاريخه وصورة الإيصال (payClaims/<TOKEN>/<id>) فتصل للإدارة لتعتمدها، ورابط تسليم الملفات النهائية في بطاقة المشروع.
// js/portal.js يستدعي PortalPay.row و totals و modal و delivery و remaining. الأنماط في css/portal-pay.css.
(function () {
    const token = new URLSearchParams(location.search).get('k');
    const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const icon = n => `<svg class="icon"><use href="#i-${n}"/></svg>`;
    const sar = v => (parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const PAID = 'مدفوعة', VOID = ['ملغاة', 'ملغي'];
    const METHODS = ['تحويل بنكي', 'STC Pay', 'Apple Pay', 'أخرى'];
    const amt = i => parseFloat(i && i.amount) || 0;
    const pays = i => Object.values((i && i.payments) || {}).filter(p => p && (+p.amount || 0) > 0).sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
    const paid = i => i.status === PAID ? amt(i) : Math.min(amt(i), pays(i).reduce((s, p) => s + (+p.amount || 0), 0));
    const remaining = i => VOID.includes(i.status) ? 0 : Math.max(0, Math.round((amt(i) - paid(i)) * 100) / 100);
    const known = {};
    let claims = {}, loaded = false;

    function load() {
        if (!token || !window.db) return Promise.resolve();
        return window.db.ref('payClaims/' + token).once('value').then(s => {
            claims = {};
            Object.entries(s.val() || {}).forEach(([id, c]) => { if (c && c.invoiceId) (claims[c.invoiceId] = claims[c.invoiceId] || []).push(Object.assign({ id }, c)); });
            Object.values(claims).forEach(l => l.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))));
            loaded = true;
            refreshRows();
        }).catch(() => { loaded = true; });
    }
    const lastClaim = i => (claims[i.id] || [])[0] || null;
    function dueText(i) {
        if (!i.dueDate || i.status === PAID || VOID.includes(i.status)) return '';
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(i.dueDate);
        if (!m) return '';
        const d = new Date(+m[1], +m[2] - 1, +m[3]), t = new Date(); t.setHours(0, 0, 0, 0);
        const n = Math.round((d - t) / 864e5);
        return n < 0 ? `<span class="pp-late">تجاوزت موعدها</span>` : n === 0 ? 'تستحق اليوم' : `تستحق ${RNAN.fmtDate(i.dueDate)}`;
    }
    function rowInner(i) {
        const parts = [], c = lastClaim(i), r = remaining(i);
        if (i.status !== PAID && !VOID.includes(i.status) && paid(i) > 0.009) parts.push(`<span class="pp-part"><span class="pp-paid">دُفع ${sar(paid(i))} · </span><span class="pp-left">متبقٍ <b>${sar(r)}</b> ريال</span></span>`);
        const due = dueText(i);
        if (due) parts.push(due);
        if (c && i.status !== PAID) parts.push(c.status === 'new' ? `<span class="pp-wait">${icon('clock')} إشعار التحويل قيد المراجعة</span>` : c.status === 'rejected' ? `<span class="pp-late">لم يُعتمد التحويل</span>` : '');
        // كل جزء في عنصر مستقل لتعرضه بطاقة الفاتورة الصغيرة سطرًا سطرًا (css/portal-tiles.css)
        return parts.filter(Boolean).map(x => /^<span/.test(x) ? x : `<span>${x}</span>`).join('<i class="pp-sep"> · </i>');
    }
    // تحت رقم الفاتورة في القائمة
    function row(i) { known[i.id] = i; return `<small class="pp-row" data-pp-inv="${E(i.id)}">${rowInner(i)}</small>`; }
    function refreshRows() { document.querySelectorAll('[data-pp-inv]').forEach(el => { const i = known[el.dataset.ppInv]; if (i) el.innerHTML = rowInner(i); }); }

    // صفوف إضافية في مجاميع الفاتورة
    function totals(i) {
        const p = paid(i);
        if (i.status === PAID || !(p > 0.009)) return '';
        return `<div class="row"><span>المدفوع</span><b class="num">${sar(p)} ريال</b></div><div class="row discount"><span>المتبقي</span><b class="num">${sar(remaining(i))} ريال</b></div>`;
    }
    // أسفل الفاتورة (خارج الورقة المطبوعة): الدفعات وحالة الإشعار وزر «حوّلت المبلغ»
    function modal(i, paper) {
        if (!paper) return;
        let box = document.getElementById('pp-pay');
        if (!box) { paper.insertAdjacentHTML('afterend', '<section id="pp-pay" class="pp-pay no-print"></section>'); box = document.getElementById('pp-pay'); }
        known[i.id] = i;
        const list = pays(i), c = lastClaim(i), r = remaining(i), open = i.status !== PAID && !VOID.includes(i.status);
        box.innerHTML = `
            ${list.length ? `<div class="pp-pays"><h5>${icon('check')} الدفعات المستلمة</h5><ul>${list.map(p => `<li><span>${RNAN.fmtDate(p.at ? ymd(new Date(p.at)) : '')}${p.method ? ' · ' + E(p.method) : ''}</span><b class="en">${sar(p.amount)} ريال</b></li>`).join('')}</ul></div>` : ''}
            ${open ? (c && c.status === 'new'
                ? `<div class="pp-state wait">${icon('clock')}<div><b>وصلنا إشعار تحويلك بمبلغ ${sar(c.amount)} ريال</b><small>نراجع الحوالة ونؤكد السداد قريبًا — شكرًا لك</small></div></div>`
                : `${c && c.status === 'rejected' ? `<div class="pp-state bad">${icon('x')}<div><b>لم يُعتمد إشعار التحويل السابق</b><small>${E(c.reason || 'تواصل معنا لمطابقة الحوالة')}</small></div></div>` : ''}
                   <button type="button" class="btn btn-primary pp-claim" data-pp-claim="${E(i.id)}">${icon('check')} حوّلت المبلغ (${sar(r)} ريال)</button>
                   <p class="pp-hint">بعد التحويل البنكي أرسل لنا الإيصال من هنا، ونؤكد السداد في صفحتك.</p>`) : ''}`;
        box.hidden = !box.innerHTML.trim();
    }

    // ── نموذج «حوّلت المبلغ» ──
    let wrap = null, img = null, current = null, busy = false;
    function form(id) {
        const i = known[id];
        if (!i) return;
        current = i;
        img = null;
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'pp-wrap';
            wrap.hidden = true;
            document.body.appendChild(wrap);
            wrap.addEventListener('click', e => {
                if (e.target.closest('[data-pp-x]')) return close();
                const m = e.target.closest('[data-pp-m]');
                if (m) wrap.querySelectorAll('[data-pp-m]').forEach(b => b.classList.toggle('on', b === m));
                if (e.target.closest('[data-pp-send]')) send();
            });
            wrap.addEventListener('change', e => { if (e.target.matches('.pp-file')) pick(e.target.files[0]); });
        }
        const r = remaining(i);
        wrap.innerHTML = `<div class="pp-scrim" data-pp-x></div><section class="pp-dlg" role="dialog" aria-modal="true" aria-label="إشعار التحويل">
            <h3>${icon('check')} أبلغنا بالتحويل</h3>
            <p>الفاتورة <b class="en">#${E(i.number)}</b> · المتبقي <b>${sar(r)} ريال</b></p>
            <label><span>المبلغ المحوَّل</span><input class="pp-in pp-amt en" inputmode="decimal" dir="ltr" value="${r}"></label>
            <label><span>تاريخ التحويل</span><input class="pp-in pp-day" type="date" value="${ymd(new Date())}" max="${ymd(new Date())}"></label>
            <div class="pp-ms"><span>طريقة الدفع</span><div>${METHODS.map((m, k) => `<button type="button" data-pp-m="${m}" class="${k ? '' : 'on'}">${m}</button>`).join('')}</div></div>
            <label class="pp-up"><input type="file" accept="image/*" class="pp-file" hidden>${icon('plus')}<span class="pp-up-t">إرفاق صورة الإيصال <small>(اختياري، يسرّع التأكيد)</small></span><img class="pp-prev" alt="" hidden></label>
            <label><span>ملاحظة <small>(اختياري)</small></span><input class="pp-in pp-note" placeholder="مثال: من حساب مؤسسة الأفق"></label>
            <p class="pp-err" hidden></p>
            <div class="pp-btns"><button type="button" class="btn btn-primary" data-pp-send>إرسال الإشعار</button><button type="button" class="btn btn-ghost" data-pp-x>إلغاء</button></div>
        </section>`;
        wrap.hidden = false;
        requestAnimationFrame(() => wrap.classList.add('open'));
    }
    function close() { if (!wrap) return; wrap.classList.remove('open'); setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 200); }
    async function pick(file) {
        if (!file) return;
        try {
            img = RNAN.resizeImage ? await RNAN.resizeImage(file, 1280, 0.72) : await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
            const prev = wrap.querySelector('.pp-prev');
            prev.src = img;
            prev.hidden = false;
            wrap.querySelector('.pp-up-t').textContent = 'تغيير الصورة';
        } catch (e) { err('تعذّرت قراءة الصورة، جرّب صورة أخرى'); }
    }
    const err = m => { const e = wrap.querySelector('.pp-err'); e.textContent = m; e.hidden = !m; };
    async function send() {
        if (busy || !current) return;
        const raw = String(wrap.querySelector('.pp-amt').value || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬,،]/g, '');
        const amount = Math.round((parseFloat(raw) || 0) * 100) / 100, day = wrap.querySelector('.pp-day').value || ymd(new Date());
        if (!(amount > 0)) return err('اكتب المبلغ المحوَّل');
        if (amount > remaining(current) + 0.009) return err('المبلغ أكبر من المتبقي في الفاتورة');
        if (img && img.length > 850000) return err('الصورة كبيرة جدًا، اختر صورة أصغر');
        busy = true;
        const btn = wrap.querySelector('[data-pp-send]');
        btn.disabled = true;
        btn.textContent = 'جارٍ الإرسال...';
        const claim = { invoiceId: current.id, number: String(current.number || ''), client: current.client || '', amount, day, method: (wrap.querySelector('[data-pp-m].on') || {}).dataset.ppM || '',
            note: String(wrap.querySelector('.pp-note').value || '').slice(0, 300), status: 'new', createdAt: new Date().toISOString() };
        if (img) claim.img = img;
        try {
            const ref = window.db.ref('payClaims/' + token).push();
            await ref.set(claim);
            (claims[current.id] = claims[current.id] || []).unshift(Object.assign({ id: ref.key }, claim));
            busy = false;
            close();
            refreshRows();
            modal(current, document.getElementById('invoice-paper'));
            toast('✅ وصلنا إشعار تحويلك — نؤكد السداد بعد مراجعة الحوالة');
        } catch (e) {
            busy = false;
            btn.disabled = false;
            btn.textContent = 'إرسال الإشعار';
            err('تعذّر الإرسال، تحقّق من الاتصال وأعد المحاولة');
        }
    }
    function toast(m) {
        let t = document.getElementById('pp-toast');
        if (!t) { t = document.createElement('div'); t.id = 'pp-toast'; t.className = 'pp-toast'; document.body.appendChild(t); }
        t.textContent = m;
        t.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.classList.remove('show'), 4200);
    }

    // ── تسليم الملفات النهائية في بطاقة المشروع ──
    function delivery(p) {
        const d = p && p.delivery;
        if (!d || !/^https?:\/\//i.test(String(d.url || ''))) return '';
        return `<a class="pp-deliver" href="${E(d.url)}" target="_blank" rel="noopener">${icon('package')}<span><b>ملفاتك النهائية جاهزة</b><small>${E(d.note || 'اضغط لفتح رابط التسليم وتحميل الملفات')}</small></span></a>`;
    }

    document.addEventListener('click', e => { const b = e.target.closest('[data-pp-claim]'); if (b) form(b.dataset.ppClaim); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && wrap && !wrap.hidden) close(); });
    // تُقرأ الإشعارات بعد تهيئة قاعدة البيانات
    const wait = setInterval(() => { if (window.db) { clearInterval(wait); load(); } }, 300);
    setTimeout(() => clearInterval(wait), 20000);
    window.PortalPay = { row, totals, modal, delivery, remaining, load };
})();
