/**
 * صفحة العميل الخاصة — تُفتح برابط ثابت client.html?k=TOKEN بدون كلمة مرور.
 * portal/<TOKEN> → مفتاح العميل، ثم تُقرأ مشاريعه وفواتيره وإشعاراته باسمه.
 */
(function () {
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
    const E = RNAN.esc;
    const token = new URLSearchParams(location.search).get('k');

    const state = { key: null, client: null, names: [], projects: [], invoices: [], notifs: [], coupons: [], settings: {}, tab: 'active', rating: null };

    function withTimeout(promise, ms) {
        return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms || 15000))]);
    }
    const read = (path) => withTimeout(db.ref(path).once('value')).then(s => s.val());

    // كل السجلات المرتبطة بالعميل (بالاسم أو اسم الشركة)
    async function byClient(node, field, values) {
        const out = {};
        for (const v of values) {
            const snap = await withTimeout(db.ref(node).orderByChild(field).equalTo(v).once('value'));
            snap.forEach(ch => { out[ch.key] = Object.assign({ id: ch.key }, ch.val()); });
        }
        return Object.values(out);
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
        const due = state.invoices.filter(i => !isPaid(i) && !isVoid(i)).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
        $('#st-due').textContent = sar(due);
        $('#st-due-card').classList.toggle('warn', due > 0);
    }

    // ═══ المشاريع ═══
    function renderProjects() {
        const list = state.projects
            .filter(p => state.tab === 'done' ? p.status === 'مكتمل' : p.status !== 'مكتمل')
            .sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
        $$('[data-ptab]').forEach(b => b.classList.toggle('active', b.dataset.ptab === state.tab));
        if (!list.length) {
            $('#projects').innerHTML = `<div class="empty">${icon('folder')}${state.tab === 'done' ? 'لا توجد مشاريع منجزة بعد.' : 'لا توجد مشاريع جارية الآن. عندك فكرة؟ اطلب خدمة جديدة من الأسفل.'}</div>`;
            return;
        }
        $('#projects').innerHTML = list.map(p => {
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
            <article class="card proj">
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
                ${steps.length ? `<details ${done ? '' : 'open'}><summary>مراحل العمل (${steps.filter(s => s.done).length}/${steps.length}) ${icon('chevron-down')}</summary>
                    <ul class="substeps">${steps.map(s => `<li class="${s.done ? 'done' : ''}"><span class="ck">${s.done ? icon('check') : ''}</span>${E(s.text)}</li>`).join('')}</ul></details>` : ''}
                ${rate}
            </article>`;
        }).join('');
    }

    // ═══ الفواتير ═══
    function renderInvoices() {
        const list = state.invoices.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        $('#inv-count').textContent = list.length;
        if (!list.length) {
            $('#invoices').innerHTML = `<div class="empty">${icon('receipt')}لا توجد فواتير بعد.</div>`;
            return;
        }
        $('#invoices').innerHTML = list.map(i => {
            const cls = isPaid(i) ? 'paid' : (isVoid(i) ? 'void' : 'due');
            const txt = isPaid(i) ? 'مدفوعة' : (isVoid(i) ? 'ملغاة' : 'بانتظار السداد');
            return `
            <button class="card inv" data-invoice="${E(i.id)}" style="text-align:start;width:100%">
                <span class="inv-icon">${icon('receipt')}</span>
                <span><b><span class="en">#${E(i.number)}</span></b><small>${RNAN.fmtDate(i.date)}</small></span>
                <span class="amount"><span class="en">${sar(i.amount)}</span> <small>ريال</small></span>
                <span class="pill ${cls}">${txt}</span>
            </button>`;
        }).join('');
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
        const subtotal = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0);
        const total = parseFloat(inv.amount) || 0;
        const discount = subtotal - total;
        $('#invoice-paper').innerHTML = `
            <div class="paper-head">
                <img src="images/ranan-logo-dark.svg" alt="رنان">
                <div><h4>INVOICE</h4><small>#${E(inv.number)}</small></div>
            </div>
            <div class="paper-meta">
                <div><span>العميل</span><b>${E(inv.client)}</b></div>
                <div><span>التاريخ</span><b>${RNAN.fmtDate(inv.date)}</b></div>
                <div><span>الحالة</span><b>${E(inv.status || '')}</b></div>
                <div><span>صادرة من</span><b>${E(state.settings.agency_name || 'رنان لخدمات التصميم')}</b></div>
            </div>
            <table>
                <thead><tr><th>البيان</th><th class="num">الكمية</th><th class="num">السعر</th><th class="num">الإجمالي</th></tr></thead>
                <tbody>${items.map(it => `<tr><td>${E(it.desc)}</td><td class="num">${E(it.qty)}</td><td class="num">${sar(it.price)}</td><td class="num">${sar((parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0))}</td></tr>`).join('')}</tbody>
            </table>
            ${discount > 0.009 ? `<div style="display:flex;justify-content:space-between;padding:0 18px 10px;color:#5a6290"><span>خصم</span><span class="num">- ${sar(discount)} ريال</span></div>` : ''}
            <div class="paper-total"><span>الإجمالي</span><span class="en">${sar(total)} SAR</span></div>
            ${inv.notes ? `<div class="paper-foot"><b>ملاحظات:</b> ${E(inv.notes)}</div>` : ''}
            ${inv.footerText || state.settings.invoice_footer ? `<div class="paper-foot">${E(inv.footerText || state.settings.invoice_footer)}</div>` : ''}`;
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
            let applied = false;
            // معاملة ذرّية: لا يمكن صرف نفس النقاط مرتين
            const res = await withTimeout(db.ref('clients/' + state.key + '/points').transaction(p => {
                if (p === null) { applied = false; return null; }
                const cur = parseInt(p) || 0;
                if (cur < r.cost) { applied = false; return; }
                applied = true;
                return cur - r.cost;
            }));
            if (!res.committed || !applied) {
                closeModals();
                toast('رصيدك لا يكفي لهذه المكافأة');
                return;
            }
            const code = 'RWD-' + RNAN.newRefCode();
            const name = state.client.name || state.client.company;
            await withTimeout(db.ref('redemptions').push({
                clientKey: state.key, client: name, title: r.title, value: r.value, cost: r.cost,
                code: code, status: 'جديد', createdAt: new Date().toISOString()
            }));
            db.ref('notifications').push({
                client: name, type: 'points_redeemed', isRead: false, date: new Date().toISOString(),
                message: `استبدلت ${r.cost} نقطة بـ «${r.title}». كود الخصم: ${code}`
            });
            state.coupons.unshift({ code: code, title: r.title, status: 'جديد' });
            renderCoupons();
            $('#coupon-code').textContent = code;
            $('#redeem-confirm').hidden = true;
            $('#redeem-done').hidden = false;
        } catch (err) {
            closeModals();
            toast('تعذّر الاتصال، حاول مرة أخرى');
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
            await withTimeout(db.ref('projects/' + id).update({ rating: value, review: review }));
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
        const updates = {};
        state.notifs.forEach(n => { if (!n.isRead) { updates[n.id + '/isRead'] = true; n.isRead = true; } });
        if (Object.keys(updates).length) db.ref('notifications').update(updates);
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
            if (tab) { state.tab = tab.dataset.ptab; return renderProjects(); }
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

    async function init() {
        bindEvents();
        if (!token || token.length < 10) {
            return showError('الرابط غير مكتمل', 'يبدو أن الرابط نُسخ ناقصًا. افتح الرابط كما وصلك على واتساب، أو تواصل معنا.');
        }
        if (!window.db) return showError('تعذّر الاتصال', 'تأكّد من اتصالك بالإنترنت ثم أعد تحميل الصفحة.');
        try {
            const key = await read('portal/' + token);
            if (!key) return showError();
            state.key = key;
            const client = await read('clients/' + key);
            if (!client) return showError();
            state.client = client;
            state.names = Array.from(new Set([client.name, client.company].filter(Boolean)));

            const [projects, invoices, notifs, coupons, footer, agency] = await Promise.all([
                byClient('projects', 'client', state.names),
                byClient('invoices', 'client', state.names),
                byClient('notifications', 'client', state.names),
                byClient('redemptions', 'clientKey', [key]),
                read('settings/invoice_footer').catch(() => ''),
                read('settings/agency_name').catch(() => '')
            ]);
            state.projects = projects;
            state.invoices = invoices;
            state.notifs = notifs;
            state.coupons = coupons.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
            state.settings = { invoice_footer: footer, agency_name: agency };
            if (!state.projects.some(p => p.status !== 'مكتمل') && state.projects.length) state.tab = 'done';

            renderMember();
            renderStats();
            renderProjects();
            renderInvoices();
            renderCoupons();
            renderUpdates();
            renderReferral();
            document.title = 'صفحة ' + (client.name || client.company) + ' | رنان';
            $('#state-loading').hidden = true;
            $('#portal').hidden = false;

            // النقاط والمستوى تتحدّث لحظيًا عند سداد فاتورة من لوحة الإدارة
            db.ref('clients/' + key).on('value', snap => {
                if (!snap.exists()) return;
                state.client = snap.val();
                renderMember();
            });
        } catch (err) {
            showError('تعذّر الاتصال', 'تأكّد من اتصالك بالإنترنت ثم أعد تحميل الصفحة.');
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
