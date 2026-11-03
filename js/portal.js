/**
 * صفحة العميل الخاصة — تُفتح برابط ثابت client.html?k=TOKEN بدون كلمة مرور.
 * قواعد القاعدة تمنع قراءة clients/projects/invoices، فتقرأ الصفحة نسخة العميل وحده
 * في portalData/<TOKEN> (تكتبها لوحة الإدارة)، وتكتب فقط ما تسمح به القواعد:
 * تقييماته (feedback/<TOKEN>)، وقت آخر قراءة (seenAt)، واستبدال النقاط.
 */
(function () {
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
    const E = RNAN.esc;
    const token = new URLSearchParams(location.search).get('k');

    const state = { key: null, client: null, projects: [], invoices: [], notifs: [], coupons: [], feedback: {}, seenAt: 0, settings: {}, tab: 'active', rating: null,
        lim: { proj: 6, inv: 6 }, total: { proj: 0, inv: 0 }, openProj: null };

    function withTimeout(promise, ms) {
        return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms || 15000))]);
    }
    const read = (path) => withTimeout(db.ref(path).once('value')).then(s => s.val());
    const list = (obj) => Object.keys(obj || {}).map(id => Object.assign({ id: id }, obj[id]));

    function applyData(d) {
        state.key = d.key;
        state.client = d.profile;
        state.seenAt = d.seenAt || 0;
        state.projects = list(d.projects).map(p => {
            const f = state.feedback[p.id];
            return f ? Object.assign(p, { rating: f.rating, review: f.review || '' }) : p;
        });
        state.invoices = list(d.invoices);
        state.coupons = list(d.coupons).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        // الاستبدالات تظهر في التحديثات من الكوبونات نفسها
        const redeemed = state.coupons.map(c => ({
            id: 'rw-' + c.id, type: 'points_redeemed', date: c.createdAt, isRead: true,
            message: `استبدلت ${c.cost} نقطة بـ «${c.title}». كود الخصم: ${c.code}`
        }));
        state.notifs = list(d.notifs).concat(redeemed).map(n =>
            Object.assign(n, { isRead: !!n.isRead || Date.parse(n.date) <= state.seenAt }));
    }

    function toast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.classList.remove('show'), 2400);
    }
    function copy(text) {
        const done = () => toast('تم النسخ ✓');
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done);
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove(); done();
    }
    function showError(title, text) {
        $('#state-loading').hidden = true;
        $('#state-error').hidden = false;
        if (title) $('#error-title').textContent = title;
        if (text) $('#error-text').textContent = text;
    }
    function openModal(id) { $(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
    function closeModals() { $$('.modal.open').forEach(m => m.classList.remove('open')); document.body.style.overflow = ''; }

    const sar = n => RNAN.fmtNum(n, (parseFloat(n) || 0) % 1 ? 2 : 0);
    const isPaid = i => i.status === 'مدفوعة';
    const isVoid = i => i.status === 'ملغي' || i.status === 'ملغاة';

    // ═══ بطاقة العضوية والإحصائيات ═══
    function renderMember() {
        const c = state.client;
        const tier = RNAN.tierOf(c.totalSpent);
        const points = parseInt(c.points) || 0;
        $('#client-name').textContent = c.name || c.company;
        $('#member-since').textContent = c.dateAdded ? 'عميل لدى رنان منذ ' + RNAN.fmtDate(c.dateAdded) : 'صفحتك الخاصة لدى رنان';
        const badge = $('#tier-badge');
        badge.className = 'tier ' + tier.key;
        $('span', badge).textContent = 'العضوية ال' + tier.name + 'ة';
        $('#points').textContent = RNAN.fmtNum(points);
        $('#cashback').textContent = RNAN.fmtNum(points / 20, points % 20 ? 2 : 0);
        $('#tier-current').textContent = tier.name;
        $('#tier-next').textContent = tier.next ? tier.next : 'أعلى مستوى ✦';
        $('#tier-bar').style.width = Math.min(100, Math.max(3, tier.progress)) + '%';
        $('#tier-msg').innerHTML = tier.next
            ? `باقي <b class="en">${RNAN.fmtNum(tier.remaining)}</b> ريال للوصول إلى المستوى ال${tier.next}، وتزيد نقاطك ${tier.next === 'فضي' ? '10%' : '25%'}.`
            : 'أنت في أعلى مستوى — نقاطك تزيد 25% مع كل فاتورة. شكرًا لثقتك 💚';
        $('#st-spent').textContent = sar(c.totalSpent);
        renderRewards();
    }

    function renderStats() {
        $('#st-active').textContent = state.projects.filter(p => p.status !== 'مكتمل').length;
        $('#st-done').textContent = state.projects.filter(p => p.status === 'مكتمل').length;
        const due = state.invoices.filter(i => !isPaid(i) && !isVoid(i)).reduce((s, i) => s + (window.PortalPay ? PortalPay.remaining(i) : (parseFloat(i.amount) || 0)), 0);
        $('#st-due').textContent = sar(due);
        $('#st-due-card').classList.toggle('warn', due > 0);
    }

    // ═══ المشاريع ═══
    // رابط مراجعة التصميم (ترفعه الإدارة من نافذة المشروع، ويبقى حتى انتهاء مدته)
    function reviewLink(p) {
        const r = p.proof;
        if (!r || !r.token || (r.until && Date.parse(r.until) < Date.now())) return '';
        return `<a class="btn btn-primary proj-review" href="${E(RNAN.pageUrl('review.html', { k: r.token }))}">${icon('eye')} مراجعة التصميم${r.round > 1 ? ' — النسخة ' + r.round : ''}</a>`;
    }

    // «التصميم جاهز لمراجعتك» بارزًا أعلى الصفحة لكل تصميم لم يُعتمد بعد
    let bannerKey = '';
    function reviewBanner() {
        const live = state.projects.filter(p => p.proof && p.proof.token && (!p.proof.until || Date.parse(p.proof.until) > Date.now()));
        const key = live.map(p => p.proof.token + ':' + p.proof.round).join();
        if (key === bannerKey) return;
        bannerKey = key;
        let box = $('#review-banner');
        if (!box) {
            const hello = $('.p-hello');
            if (!hello) return;
            hello.insertAdjacentHTML('afterend', '<div id="review-banner" class="review-banners"></div>');
            box = $('#review-banner');
        }
        box.innerHTML = '';
        live.forEach(async p => {
            let ap = null;
            try { ap = (await db.ref('proofs/' + p.proof.token + '/approval').once('value')).val(); } catch (e) { /* نعرضه */ }
            if (ap) return;
            box.insertAdjacentHTML('beforeend', `<a class="review-hero" href="${E(RNAN.pageUrl('review.html', { k: p.proof.token }))}">
                <span class="rh-ic">${icon('eye')}<i></i></span>
                <span class="rh-t"><small>${icon('sparkle')} ${p.proof.round > 1 ? 'وصلت النسخة المعدّلة' : 'جديد'}</small><b>التصميم جاهز لمراجعتك</b><span>«${E(p.name)}» — شاهده واكتب ملاحظاتك عليه، أو اعتمده إن كان مناسبًا.</span></span>
                <span class="btn btn-primary btn-sm">شاهد التصميم ${icon('arrow')}</span>
            </a>`);
        });
    }

    // المشاريع والفواتير بطاقات صغيرة (ثلاث في السطر)؛ تظهر أول ستّ ثم «عرض المزيد»
    const PAGE = 6;
    function moreBtn(kind, total) {
        state.total[kind] = total;
        if (total <= PAGE) return '';
        const shown = Math.min(state.lim[kind], total);
        return shown < total
            ? `<button type="button" class="more-btn" data-more="${kind}">عرض المزيد <span class="en">(${total - shown})</span> ${icon('chevron-down')}</button>`
            : `<button type="button" class="more-btn less" data-more="${kind}">عرض أقل ${icon('chevron-down')}</button>`;
    }

    function renderProjects() {
        reviewBanner();
        const list = state.projects
            .filter(p => state.tab === 'done' ? p.status === 'مكتمل' : p.status !== 'مكتمل')
            .sort((a, b) => (!!reviewLink(b) - !!reviewLink(a)) || String(b.startDate || '').localeCompare(String(a.startDate || '')));
        $$('[data-ptab]').forEach(b => b.classList.toggle('active', b.dataset.ptab === state.tab));
        if (state.openProj && $('#project-modal').classList.contains('open')) openProject(state.openProj);
        if (!list.length) {
            state.total.proj = 0;
            $('#projects').innerHTML = `<div class="empty">${icon('folder')}${state.tab === 'done' ? 'لا توجد مشاريع منجزة بعد.' : 'لا توجد مشاريع جارية الآن. عندك فكرة؟ اطلب خدمة جديدة من الأسفل.'}</div>`;
            return;
        }
        $('#projects').innerHTML = list.slice(0, state.lim.proj).map(projectTile).join('') + moreBtn('proj', list.length);
    }

    function projectTile(p) {
        const done = p.status === 'مكتمل', hold = p.status === 'معلق';
        const prog = done ? 100 : Math.min(100, Math.max(0, parseInt(p.progress) || 0));
        const days = RNAN.daysUntil(p.deadline);
        let sub = done ? 'تم التسليم' : (hold ? 'متوقف مؤقتًا' : 'قيد التنفيذ'), cls = done ? 'ok' : (hold ? 'soon' : '');
        if (!done && !hold && days !== null) {
            sub = days < 0 ? 'تجاوز الموعد' : 'التسليم ' + RNAN.inDays(days);
            cls = days < 0 ? 'late' : (days <= 3 ? 'soon' : '');
        }
        const delivered = done && p.delivery && /^https?:\/\//i.test(String(p.delivery.url || ''));
        const tag = reviewLink(p) ? `<span class="pt-tag">${icon('eye')} راجع التصميم</span>`
            : delivered ? `<span class="pt-tag">${icon('package')} ملفاتك جاهزة</span>`
            : done && !(parseInt(p.rating) || 0) ? `<span class="pt-tag amber">${icon('star')} قيّم المشروع</span>` : '';
        return `
            <button type="button" class="card ptile" data-project="${E(p.id)}">
                <span class="pt-ring${done ? ' done' : ''}" style="--p:${prog}"><b class="en">${done ? icon('check') : prog + '%'}</b></span>
                <b class="pt-name">${E(p.name)}</b>
                <small class="pt-sub ${cls}">${sub}</small>
                ${tag}
            </button>`;
    }

    // تفاصيل المشروع كاملة في نافذة عند الضغط على بطاقته
    function openProject(id) {
        const p = state.projects.find(x => x.id === id);
        if (!p) return;
        state.openProj = id;
        $('#project-detail').innerHTML = projectDetail(p);
        if (!$('#project-modal').classList.contains('open')) openModal('#project-modal');
    }

    function projectDetail(p) {
        const done = p.status === 'مكتمل';
        const prog = done ? 100 : (parseInt(p.progress) || 0);
        const steps = Array.isArray(p.steps) ? p.steps : (typeof p.steps === 'string' ? RNAN.safeJSON(p.steps, []) : []);
        const days = RNAN.daysUntil(p.deadline);
        let dl = '';
        if (p.deadline && !done) {
            const cls = days < 0 ? 'late' : (days <= 3 ? 'soon' : '');
            const txt = days < 0 ? 'تجاوز الموعد' : RNAN.inDays(days);
            dl = `<span class="${cls}">${icon('calendar')} التسليم ${RNAN.fmtDate(p.deadline)} · ${txt}</span>`;
        }
        const pillCls = done ? 'paid' : (p.status === 'معلق' ? 'due' : 'paid');
        const pillTxt = done ? 'تم التسليم' : (p.status === 'معلق' ? 'متوقف مؤقتًا' : 'قيد التنفيذ');
        let rate = '';
        if (done) {
            const r = parseInt(p.rating) || 0;
            rate = `<div class="rate-row">${r ? 'تقييمك:' : 'قيّم تجربتك في هذا المشروع:'}
                <span class="stars">${[1, 2, 3, 4, 5].map(n => `<button class="star-btn${n <= r ? ' on' : ''}" data-rate="${p.id}" data-value="${n}" aria-label="${n} نجوم">${icon('star')}</button>`).join('')}</span>
                ${r ? '<span style="color:var(--mint-3)">شكرًا لك 💚</span>' : ''}</div>`;
        }
        return `
        <article class="proj proj-detail">
            <div class="proj-top">
                <div><h3>${E(p.name)}</h3>${p.code ? `<small class="mono">${E(p.code)}</small>` : ''}</div>
                <span class="pill ${pillCls}">${pillTxt}</span>
            </div>
            <div class="proj-progress">
                <div class="proj-progress-top"><span>الإنجاز</span><b class="en">${prog}%</b></div>
                <div class="bar"><i style="width:${prog}%"></i></div>
            </div>
            <div class="proj-meta">
                ${p.startDate ? `<span>${icon('clock')} البدء ${RNAN.fmtDate(p.startDate)}</span>` : ''}
                ${dl}
            </div>
            ${reviewLink(p)}
            ${window.PortalPay ? PortalPay.delivery(p) : ''}
            ${steps.length ? `<details ${done ? '' : 'open'}><summary>مراحل العمل (${steps.filter(s => s.done).length}/${steps.length}) ${icon('chevron-down')}</summary>
                <ul class="substeps">${steps.map(s => `<li class="${s.done ? 'done' : ''}"><span class="ck">${s.done ? icon('check') : ''}</span>${E(s.text)}</li>`).join('')}</ul></details>` : ''}
            ${rate}
        </article>`;
    }

    // ═══ الفواتير ═══
    // غير المسدّدة أولًا، ثم الأحدث
    function renderInvoices() {
        const open = i => !isPaid(i) && !isVoid(i);
        const list = state.invoices.slice().sort((a, b) => (open(b) - open(a)) || String(b.date || '').localeCompare(String(a.date || '')));
        $('#inv-count').textContent = list.length;
        if (!list.length) {
            state.total.inv = 0;
            $('#invoices').innerHTML = `<div class="empty">${icon('receipt')}لا توجد فواتير بعد.</div>`;
            return;
        }
        $('#invoices').innerHTML = list.slice(0, state.lim.inv).map(i => {
            const cls = isPaid(i) ? 'paid' : (isVoid(i) ? 'void' : 'due');
            // دفعة جزئية: js/portal-pay.js
            const part = open(i) && window.PortalPay && PortalPay.remaining(i) < (parseFloat(i.amount) || 0) - 0.009;
            const txt = isPaid(i) ? 'مدفوعة' : (isVoid(i) ? 'ملغاة' : part ? 'مدفوعة جزئيًا' : 'بانتظار السداد');
            return `
            <button type="button" class="card itile ${cls}" data-invoice="${E(i.id)}">
                <small class="it-no en">#${E(i.number)}</small>
                <b class="it-amt"><span class="en">${sar(i.amount)}</span> <small>ريال</small></b>
                <small class="it-date">${RNAN.fmtDate(i.date)}</small>
                <span class="pill ${cls}">${txt}</span>
                ${window.PortalPay ? PortalPay.row(i) : ''}
            </button>`;
        }).join('') + moreBtn('inv', list.length);
    }

    // «حفظ كـ PDF» يقترح عنوان الصفحة اسمًا للملف: رقم الفاتورة - اسم الجهة
    function printInvoice() {
        const original = document.title;
        document.title = String(state.printName || 'فاتورة').replace(/[\\/:*?"<>|\r\n]+/g, '-').replace(/\s+/g, ' ').trim();
        window.addEventListener('afterprint', () => { document.title = original; }, { once: true });
        window.print();
    }

    function openInvoice(id) {
        const inv = state.invoices.find(i => i.id === id);
        if (!inv) return;
        state.printName = inv.number + ' - ' + (inv.client || state.client.company || state.client.name || '');
        const items = Array.isArray(inv.items) ? inv.items : (typeof inv.items === 'string' ? RNAN.safeJSON(inv.items, []) : []);
        const total = parseFloat(inv.amount) || 0;
        const pos = items.filter(it => (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0) >= 0);
        const sub = pos.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0);
        const disc = Math.max(0, sub - total);
        const paid = isPaid(inv), voided = isVoid(inv);
        $('#invoice-paper').innerHTML = `
            <div class="pv-head">
                <img class="pv-wave" src="images/invoice-wave.svg" alt="">
                <img class="pv-logo" src="images/ranan-logo.svg" alt="رنان">
                <div class="pv-title"><b>فاتورة</b><span>INVOICE</span></div>
            </div>
            <div class="pv-body">
                <div class="pv-meta">
                    <div class="to"><span>فاتورة إلى</span><b>${E(inv.client)}</b></div>
                    <div><span>رقم الفاتورة</span><b class="en">${E(inv.number)}</b></div>
                    <div><span>تاريخ الإصدار</span><b>${RNAN.fmtDate(inv.date)}</b></div>
                    <div><span>الحالة</span><b class="pv-status${paid ? ' paid' : voided ? ' void' : ''}">${paid ? 'مدفوعة' : voided ? 'ملغاة' : 'بانتظار السداد'}</b></div>
                </div>
                <table>
                    <thead><tr><th>#</th><th class="desc">البيان</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
                    <tbody>${pos.map((it, n) => `<tr><td class="num">${n + 1}</td><td class="desc">${E(it.desc)}</td><td class="num">${E(it.qty)}</td><td class="num">${sar(it.price)}</td><td class="num">${sar((parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0))}</td></tr>`).join('')}</tbody>
                </table>
                <div class="pv-bottom">
                    <div>
                        ${inv.notes ? `<div class="pv-box"><h5>ملاحظات</h5>${E(inv.notes)}</div>` : ''}
                        ${inv.footerText || state.settings.invoice_footer ? `<div class="pv-box pay"><h5>بيانات الدفع</h5>${E(inv.footerText || state.settings.invoice_footer)}</div>` : ''}
                    </div>
                    <div class="pv-totals">
                        <div class="row"><span>المجموع الفرعي</span><b class="num">${sar(sub)} ريال</b></div>
                        ${disc > 0.009 ? `<div class="row discount"><span>الخصم</span><b class="num">- ${sar(disc)} ريال</b></div>` : ''}
                        <div class="grand"><span>الإجمالي المستحق</span><b class="num">${sar(total)} SAR</b></div>
                        ${window.PortalPay ? PortalPay.totals(inv) : ''}
                    </div>
                </div>
            </div>
            <div class="pv-foot"><b>شكرًا لثقتكم</b><span>${E(state.settings.agency_name || 'رنان لخدمات التصميم')}</span></div>`;
        if (window.PortalPay) PortalPay.modal(inv, $('#invoice-paper'));
        openModal('#invoice-modal');
    }

    // ═══ المكافآت ═══
    function renderRewards() {
        const points = parseInt(state.client.points) || 0;
        $('#rewards').innerHTML = RNAN.REWARDS.map(r => {
            const can = points >= r.cost;
            return `
            <div class="card reward">
                <span class="rw-icon">${icon('gift')}</span>
                <h3>${E(r.title)}</h3>
                <div class="cost"><b class="en">${RNAN.fmtNum(r.cost)}</b> نقطة</div>
                <button class="btn ${can ? 'btn-primary' : 'btn-ghost'}" data-redeem="${r.id}" ${can ? '' : 'disabled'}>${can ? 'استبدل الآن' : 'رصيدك لا يكفي بعد'}</button>
                ${can ? '' : `<div class="need">تحتاج <span class="en">${RNAN.fmtNum(r.cost - points)}</span> نقطة إضافية</div>`}
            </div>`;
        }).join('');
        $('#ref-bonus-label').textContent = '+' + RNAN.REFERRAL_BONUS + ' نقطة';
    }

    function renderCoupons() {
        const active = state.coupons.filter(c => c.status === 'جديد');
        $('#my-coupons').innerHTML = active.length ? `
            <div class="save-hint" style="margin-top:16px;flex-wrap:wrap">${icon('gift')} أكواد خصم بانتظار الاستخدام:
                ${active.map(c => `<b class="mono" style="color:var(--amber)">${E(c.code)}</b> <small>(${E(c.title)})</small>`).join(' · ')}</div>` : '';
    }

    let pendingReward = null;
    function askRedeem(id) {
        const r = RNAN.REWARDS.find(x => x.id === +id);
        if (!r) return;
        pendingReward = r;
        $('#redeem-title').textContent = r.title;
        $('#redeem-text').innerHTML = `سيُخصم <b class="en">${RNAN.fmtNum(r.cost)}</b> نقطة من رصيدك، وتحصل على كود خصم تستخدمه في طلبك القادم.`;
        $('#redeem-confirm').hidden = false;
        $('#redeem-done').hidden = true;
        openModal('#redeem-modal');
    }

    async function doRedeem() {
        const r = pendingReward;
        if (!r) return;
        const btn = $('#redeem-go');
        btn.disabled = true;
        try {
            const points = parseInt(state.client.points) || 0;
            if (points < r.cost) {
                closeModals();
                toast('رصيدك لا يكفي لهذه المكافأة');
                return;
            }
            // كتابة واحدة ذرّية تتحقق منها القواعد: الرصيد الجديد = الرصيد الحالي في القاعدة − تكلفة
            // المكافأة بالضبط، ومعه سجل استبدال جديد برابط العميل. لو تغيّر الرصيد بين القراءة
            // والكتابة (استبدال آخر، أو تحديث من الإدارة) تُرفض الكتابة كاملة فلا تُصرف النقاط مرتين.
            const rid = db.ref('redemptions').push().key;
            const code = 'RWD-' + RNAN.newRefCode();
            const createdAt = new Date().toISOString();
            const left = points - r.cost;
            const coupon = { code: code, title: r.title, value: r.value, cost: r.cost, status: 'جديد', createdAt: createdAt };
            const updates = {};
            updates['clients/' + state.key + '/points'] = left;
            updates['clients/' + state.key + '/lastRedeem'] = rid;
            updates['redemptions/' + rid] = Object.assign({
                clientKey: state.key, token: token, rewardId: r.id,
                client: String(state.client.name || state.client.company).slice(0, 100)
            }, coupon);
            updates['portalData/' + token + '/profile/points'] = left;
            updates['portalData/' + token + '/coupons/' + rid] = coupon;
            await withTimeout(db.ref().update(updates));
            $('#coupon-code').textContent = code;
            $('#redeem-confirm').hidden = true;
            $('#redeem-done').hidden = false;
        } catch (err) {
            closeModals();
            toast(err && err.code === 'PERMISSION_DENIED'
                ? 'تغيّر رصيدك للتو، حدّث الصفحة وحاول مجددًا'
                : 'تعذّر الاتصال، حاول مرة أخرى');
        } finally {
            btn.disabled = false;
        }
    }

    // ═══ التقييم ═══
    function openRating(projectId, value) {
        const p = state.projects.find(x => x.id === projectId);
        if (!p) return;
        state.rating = { id: projectId, value: value };
        $('#rate-project').textContent = p.name;
        $('#rate-review').value = p.review || '';
        paintStars();
        openModal('#rate-modal');
    }
    function paintStars() {
        $('#rate-stars').innerHTML = [1, 2, 3, 4, 5].map(n =>
            `<button class="star-btn${n <= state.rating.value ? ' on' : ''}" data-star="${n}" style="width:44px;height:44px" aria-label="${n} نجوم">${icon('star')}</button>`).join('');
        $$('#rate-stars .icon').forEach(i => { i.style.width = '34px'; i.style.height = '34px'; });
    }
    async function saveRating() {
        const { id, value } = state.rating;
        const review = $('#rate-review').value.trim();
        try {
            const f = { rating: value, review: review.slice(0, 1000), at: firebase.database.ServerValue.TIMESTAMP };
            await withTimeout(db.ref('feedback/' + token + '/' + id).set(f));
            state.feedback[id] = { rating: value, review: f.review };
            const p = state.projects.find(x => x.id === id);
            if (p) { p.rating = value; p.review = review; }
            closeModals();
            renderProjects();
            toast('شكرًا لتقييمك 💚');
        } catch (err) {
            toast('تعذّر حفظ التقييم، حاول مرة أخرى');
        }
    }

    // ═══ التحديثات ═══
    const NOTIF_ICON = { points_earned: 'coins', points_redeemed: 'gift', referral_bonus: 'user-plus', tier_upgrade: 'star', new_invoice: 'receipt', invoice_paid: 'check', project_new: 'rocket', project_done: 'check', project_progress: 'target', project_hold: 'clock' };
    function renderUpdates() {
        const list = state.notifs.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30);
        $('#mark-read').hidden = !list.some(n => !n.isRead);
        $('#updates').innerHTML = list.length ? list.map(n => `
            <div class="update${n.isRead ? '' : ' unread'}">
                <span class="u-icon">${icon(NOTIF_ICON[n.type] || 'bell')}</span>
                <div><p>${E(n.message)}</p><small>${RNAN.fmtDate(n.date)}</small></div>
            </div>`).join('') : `<div class="empty" style="border:0">${icon('bell')}ستظهر هنا تحديثات مشاريعك ونقاطك.</div>`;
    }
    function markAllRead() {
        state.notifs.forEach(n => { n.isRead = true; });
        db.ref('portalData/' + token + '/seenAt').set(firebase.database.ServerValue.TIMESTAMP).catch(() => {});
        renderUpdates();
    }

    // ═══ الدعوة وطلب خدمة جديدة ═══
    function renderReferral() {
        const code = state.client.refCode;
        const box = $('.refer-card');
        if (!code) { box.hidden = true; return; }
        const url = RNAN.referralUrl(code);
        $('#ref-code').textContent = code;
        $('#copy-ref').onclick = () => copy(url);
        const first = String(state.client.name || '').split(' ')[0];
        $('#share-ref').href = 'https://wa.me/?text=' + encodeURIComponent(`أنصحك بـ«رنان لخدمات التصميم» 👌 شغلهم مرتب ويتابعونك خطوة بخطوة.\nاطلب من رابطي واذكر أن ${first} دعاك:\n${url}`);
        const req = RNAN.pageUrl('index.html', { k: token }) + '#request';
        $('#new-request-top').href = req;
        $('#new-request-bottom').href = req;
    }

    function bindEvents() {
        document.addEventListener('click', e => {
            const t = e.target;
            if (t.closest('[data-close]') || t.classList.contains('modal')) return closeModals();
            const tab = t.closest('[data-ptab]');
            if (tab) { state.tab = tab.dataset.ptab; state.lim.proj = PAGE; return renderProjects(); }
            const proj = t.closest('[data-project]');
            if (proj) return openProject(proj.dataset.project);
            const more = t.closest('[data-more]');
            if (more) {
                const k = more.dataset.more, all = state.lim[k] >= state.total[k];
                state.lim[k] = all ? PAGE : state.lim[k] + PAGE;
                (k === 'proj' ? renderProjects : renderInvoices)();
                if (all) $(k === 'proj' ? '#projects' : '#invoices').closest('.p-section').scrollIntoView({ block: 'start', behavior: 'smooth' });
                return;
            }
            const inv = t.closest('[data-invoice]');
            if (inv) return openInvoice(inv.dataset.invoice);
            const red = t.closest('[data-redeem]');
            if (red && !red.disabled) return askRedeem(red.dataset.redeem);
            const rate = t.closest('[data-rate]');
            if (rate) return openRating(rate.dataset.rate, +rate.dataset.value);
            const star = t.closest('[data-star]');
            if (star) { state.rating.value = +star.dataset.star; return paintStars(); }
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModals(); });
        $('#redeem-go').addEventListener('click', doRedeem);
        $('#rate-save').addEventListener('click', saveRating);
        $('#mark-read').addEventListener('click', markAllRead);
        $('#copy-coupon').addEventListener('click', () => copy($('#coupon-code').textContent));
        $('#print-invoice').addEventListener('click', printInvoice);
    }

    function renderAll() {
        renderMember();
        renderStats();
        renderProjects();
        renderInvoices();
        renderCoupons();
        renderUpdates();
    }

    async function init() {
        bindEvents();
        if (!token || token.length < 10) {
            return showError('الرابط غير مكتمل', 'يبدو أن الرابط نُسخ ناقصًا. افتح الرابط كما وصلك على واتساب، أو تواصل معنا.');
        }
        if (!window.db) return showError('تعذّر الاتصال', 'تأكّد من اتصالك بالإنترنت ثم أعد تحميل الصفحة.');
        try {
            const [data, feedback, footer, agency] = await Promise.all([
                read('portalData/' + token),
                read('feedback/' + token).catch(() => null),
                read('settings/invoice_footer').catch(() => ''),
                read('settings/agency_name').catch(() => '')
            ]);
            if (!data || !data.profile) {
                // رابط صحيح لكن صفحته لم تُبنَ بعد (تُبنى عند دخول لوحة الإدارة)
                const key = await read('portal/' + token).catch(() => null);
                return key
                    ? showError('صفحتك قيد التجهيز', 'نحدّث صفحتك الآن. أعد فتح الرابط بعد قليل، أو تواصل معنا.')
                    : showError();
            }
            state.feedback = feedback || {};
            state.settings = { invoice_footer: footer, agency_name: agency };
            applyData(data);
            if (!state.projects.some(p => p.status !== 'مكتمل') && state.projects.length) state.tab = 'done';

            renderAll();
            renderReferral();
            document.title = 'صفحة ' + (state.client.name || state.client.company) + ' | رنان';
            $('#state-loading').hidden = true;
            $('#portal').hidden = false;

            // كل ما تعدّله الإدارة (سداد فاتورة، تقدّم مشروع، نقاط) يظهر لحظيًا
            db.ref('portalData/' + token).on('value', snap => {
                if (!snap.exists() || !snap.val().profile) return;
                applyData(snap.val());
                renderAll();
            });
        } catch (err) {
            showError('تعذّر الاتصال', 'تأكّد من اتصالك بالإنترنت ثم أعد تحميل الصفحة.');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
