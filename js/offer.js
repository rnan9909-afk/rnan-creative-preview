/**
 * صفحة العرض العامة (offer.html?k=<token>): يراجع العميل النطاق والمراحل والتسعير والشروط،
 * ثم يوافق بكتابة اسمه (توقيع إلكتروني) أو يطلب تعديلًا بملاحظة.
 * يقرأ offer/<token> ويكتب فيه reply مرة واحدة فقط و seen (عدّاد الفتح) — القواعد تمنع غير ذلك.
 * ‎&preview=1‎ معاينة من لوحة الإدارة: لا تُحسب فتحًا ولا تسمح بالرد.
 */
(function () {
    const $ = s => document.querySelector(s);
    const E = RNAN.esc;
    const params = new URLSearchParams(location.search);
    const token = params.get('k') || '';
    const preview = params.get('preview') === '1';
    const KIND = { quote: 'عرض سعر', contract: 'عقد مشروع' };
    let offer = null;

    const svg = n => `<svg class="icon" aria-hidden="true"><use href="#i-${n}"/></svg>`;
    const num = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const sar = n => `<span class="en">${num(n)}</span> ر.س`;
    const pd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
    const date = s => !s ? '—' : (/^\d{4}-\d{2}-\d{2}$/.test(s) ? pd(s) : new Date(s)).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
    const todayYmd = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

    function toast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.classList.remove('show'), 2600);
    }

    function banner(o) {
        const r = o.reply;
        if (r && r.decision === 'approved') return `<div class="of-banner ok">${svg('check')}<div>تمت الموافقة على العرض بتوقيع <b>${E(r.name)}</b> بتاريخ ${date(r.at)}. شكرًا لثقتك! سنتواصل معك لبدء العمل${o.depositAmount ? ' وإرسال فاتورة الدفعة المقدّمة' : ''}.</div></div>`;
        if (r && r.decision === 'changes') return `<div class="of-banner wait">${svg('pen')}<div>وصلنا طلب التعديل من <b>${E(r.name)}</b>${r.note ? `: «${E(r.note)}»` : ''}. سنرسل لك نسخة محدّثة من العرض قريبًا.</div></div>`;
        if (o.status === 'closed') return `<div class="of-banner off">${svg('clock')}<div>هذا العرض مغلق حاليًا. تواصل معنا إن رغبت في تحديثه.</div></div>`;
        if (o.validUntil && o.validUntil < todayYmd()) return `<div class="of-banner off">${svg('clock')}<div>انتهت صلاحية هذا العرض في ${date(o.validUntil)}. تواصل معنا وسنحدّثه لك.</div></div>`;
        if (preview) return `<div class="of-banner off">${svg('shield')}<div>معاينة من لوحة الإدارة — هكذا يرى العميل العرض. لا تُحتسب هذه الزيارة فتحًا.</div></div>`;
        return '';
    }
    const canDecide = o => !preview && !o.reply && o.status !== 'closed' && !(o.validUntil && o.validUntil < todayYmd());

    function render(o) {
        const kind = KIND[o.kind] || KIND.quote;
        document.title = `${kind}: ${o.title} | رنان لخدمات التصميم`;
        const phases = o.phases || [], total = phases.reduce((s, p) => s + (+p.days || 0), 0);
        let acc = 0;
        const wa = RNAN.intlPhone(o.whatsapp || '');
        const waHref = wa.length >= 9 ? RNAN.waLink(wa, `السلام عليكم، عندي استفسار عن ${kind} رقم ${o.number} «${o.title}»`) : '';

        $('#offer-view').innerHTML = `
            ${banner(o)}
            <section class="of-card of-hero">
                <span class="eyebrow">${E(kind)}${o.revision > 1 ? ` · النسخة ${E(o.revision)}` : ''}</span>
                <h1>${E(o.title)}</h1>
                <p class="to">مقدّم إلى <b>${E(o.client || 'العميل')}</b> من رنان لخدمات التصميم</p>
                <div class="of-meta">
                    <div><small>رقم ${E(kind)}</small><b class="en">${E(o.number || '')}</b></div>
                    <div><small>تاريخ الإصدار</small><b>${date(o.issuedAt)}</b></div>
                    <div><small>صالح حتى</small><b>${date(o.validUntil)}</b></div>
                    <div><small>مدة التنفيذ</small><b>${o.days ? `<span class="en">${o.days}</span> يومًا` : 'حسب الاتفاق'}</b></div>
                </div>
                ${o.intro ? `<p class="of-intro">${E(o.intro)}</p>` : ''}
            </section>

            ${phases.length ? `<section class="of-card">
                <h2 class="of-h">${svg('calendar')} نطاق العمل والمراحل</h2>
                <div class="of-phases">${phases.map((p, i) => {
                    const d = +p.days || 0, from = acc + 1;
                    acc += d;
                    return `<div class="of-phase"><i class="en">${i + 1}</i><div><b>${E(p.name)}<small>${d ? `اليوم <span class="en">${from}${d > 1 ? '–' + acc : ''}</span>` : ''}</small></b>
                        <div class="of-track"><span style="inset-inline-start:${total ? (from - 1) / total * 100 : 0}%;width:${total ? Math.max(d / total * 100, 3) : 100}%"></span></div></div></div>`;
                }).join('')}</div>
                ${(o.milestones || []).length ? `<div class="of-ms">${o.milestones.map(m => `<span>${E(m.title)}</span>`).join('')}</div>` : ''}
            </section>` : ''}

            <section class="of-card">
                <h2 class="of-h">${svg('receipt')} تفاصيل التسعير</h2>
                <table class="of-table">
                    <thead><tr><th>البند</th><th class="n">الكمية</th><th class="n">السعر</th><th class="n">الإجمالي</th></tr></thead>
                    <tbody>${(o.items || []).map(i => `<tr>
                        <td class="d">${E(i.desc)}<small class="en" style="display:none;color:var(--text-3);font-size:12.5px">${num(i.qty)} × ${num(i.price)}</small></td>
                        <td class="n q"><span class="en">${num(i.qty)}</span></td><td class="n p">${sar(i.price)}</td><td class="n"><b>${sar((+i.qty || 0) * (+i.price || 0))}</b></td></tr>`).join('')}</tbody>
                </table>
                <div class="of-totals">
                    ${o.discount || o.vat ? `<div><span>المجموع</span><b>${sar(o.subtotal)}</b></div>` : ''}
                    ${o.discount ? `<div><span>خصم</span><b>− ${sar(o.discount)}</b></div>` : ''}
                    ${o.vat ? `<div><span>ضريبة القيمة المضافة 15%</span><b>${sar(o.vat)}</b></div>` : ''}
                    <div class="grand"><span>الإجمالي</span><b>${sar(o.total)}</b></div>
                </div>
                ${o.deposit ? `<div class="of-pay">
                    <div><small>الدفعة المقدّمة <span class="en">${o.deposit}%</span></small><b>${sar(o.depositAmount)}</b><em>عند الموافقة لبدء العمل</em></div>
                    <div><small>الدفعة الثانية <span class="en">${100 - o.deposit}%</span></small><b>${sar(o.remaining)}</b><em>عند التسليم النهائي</em></div>
                </div>` : ''}
            </section>

            ${o.terms ? `<section class="of-card">
                <h2 class="of-h">${svg('shield')} الشروط والأحكام</h2>
                <ol class="of-terms">${String(o.terms).split('\n').map(t => t.trim()).filter(Boolean).map(t => `<li>${E(t)}</li>`).join('')}</ol>
            </section>` : ''}

            <div class="of-tools">
                ${waHref ? `<a class="btn btn-ghost" href="${waHref}" target="_blank" rel="noopener">${svg('whatsapp')} عندي سؤال</a>` : ''}
                <button type="button" class="btn btn-ghost" onclick="window.print()">${svg('printer')} طباعة / PDF</button>
            </div>
            ${canDecide(o) ? `<div class="of-decide"><div class="in">
                <div class="sum"><small>إجمالي ${E(kind)}</small><b>${sar(o.total)}</b></div>
                <button type="button" class="btn btn-ghost" onclick="OfferPage.ask('changes')">${svg('pen')} أطلب تعديلًا</button>
                <button type="button" class="btn btn-primary" onclick="OfferPage.ask('approved')">${svg('check')} أوافق على العرض</button>
            </div></div>` : ''}`;
    }

    function ask(decision) {
        const approve = decision === 'approved';
        $('#decide-body').innerHTML = approve ? `
            <h3>اعتماد ${E(KIND[offer.kind] || KIND.quote)}</h3>
            <p>اكتب اسمك الكامل كتوقيع إلكتروني على «${E(offer.title)}» بقيمة ${sar(offer.total)}.</p>
            <div class="field"><label for="d-name">الاسم الكامل <em>*</em></label><input id="d-name" class="input of-sign" autocomplete="name" maxlength="80" placeholder="الاسم كما في الهوية"></div>
            <label class="of-check"><input id="d-agree" type="checkbox"> <span>قرأت نطاق العمل والتسعير والشروط والأحكام، وأوافق عليها${offer.deposit ? `، وألتزم بسداد الدفعة المقدّمة (${sar(offer.depositAmount)})` : ''}.</span></label>
            <p class="form-error" id="d-err" style="margin:14px 0 0"></p>
            <button type="button" class="btn btn-primary" style="width:100%;margin-top:18px" id="d-send" onclick="OfferPage.submit('approved')">${svg('check')} اعتماد العرض</button>` : `
            <h3>طلب تعديل</h3>
            <p>اكتب ما تريد تعديله في العرض، وسنرسل لك نسخة محدّثة.</p>
            <div class="field"><label for="d-name">اسمك <em>*</em></label><input id="d-name" class="input" autocomplete="name" maxlength="80"></div>
            <div class="field"><label for="d-note">التعديلات المطلوبة <em>*</em></label><textarea id="d-note" class="input" rows="5" maxlength="1500" placeholder="مثال: نحتاج مقترحًا رابعًا للشعار، أو تقليل المدة إلى 10 أيام..."></textarea></div>
            <p class="form-error" id="d-err"></p>
            <button type="button" class="btn btn-primary" style="width:100%" id="d-send" onclick="OfferPage.submit('changes')">${svg('send')} إرسال طلب التعديل</button>`;
        $('#decide-modal').classList.add('open');
        setTimeout(() => $('#d-name').focus(), 50);
    }
    const close = () => $('#decide-modal').classList.remove('open');

    async function submit(decision) {
        const err = $('#d-err'), btn = $('#d-send');
        const name = $('#d-name').value.trim();
        const note = decision === 'changes' ? $('#d-note').value.trim() : '';
        const fail = m => { err.textContent = m; err.classList.add('show'); };
        err.classList.remove('show');
        if (name.length < 2) return fail('اكتب اسمك');
        if (decision === 'approved' && !$('#d-agree').checked) return fail('فضلًا أكّد موافقتك على الشروط');
        if (decision === 'changes' && note.length < 3) return fail('اكتب التعديلات المطلوبة');
        btn.disabled = true;
        const reply = { decision, name, at: new Date().toISOString() };
        if (note) reply.note = note;
        try {
            await db.ref('offer/' + token + '/reply').set(reply);
            offer.reply = reply;
            close();
            render(offer);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            toast(decision === 'approved' ? 'تم اعتماد العرض ✓ شكرًا لك' : 'وصلنا طلب التعديل ✓');
        } catch (e) {
            btn.disabled = false;
            fail('تعذّر الإرسال — ربما سبق الرد على هذا العرض. حدّث الصفحة أو تواصل معنا.');
        }
    }

    async function init() {
        $('#year').textContent = new Date().getFullYear();
        if (!token || !window.db) { $('#offer-view').innerHTML = `<div class="of-card of-empty">الرابط غير صحيح.</div>`; return; }
        try {
            const snap = await Promise.race([db.ref('offer/' + token).once('value'), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 15000))]);
            offer = snap.val();
        } catch (e) { offer = null; }
        if (!offer || !offer.title) { $('#offer-view').innerHTML = `<div class="of-card of-empty">العرض غير موجود أو أُلغي. تواصل معنا وسنرسل لك رابطًا جديدًا.</div>`; return; }
        render(offer);
        // عدّاد الفتح: مرة لكل جلسة تصفّح
        const key = 'rnan-offer-seen-' + token;
        let counted = false;
        try { counted = !!sessionStorage.getItem(key); } catch (e) { /* تصفح خاص */ }
        if (!preview && !counted) {
            db.ref('offer/' + token + '/seen').transaction(cur => ({ count: ((cur && cur.count) || 0) + 1, last: new Date().toISOString() }))
                .then(() => { try { sessionStorage.setItem(key, '1'); } catch (e) { /* تجاهل */ } }).catch(() => {});
        }
    }

    window.OfferPage = { ask, close, submit };
    document.addEventListener('DOMContentLoaded', init);
})();
