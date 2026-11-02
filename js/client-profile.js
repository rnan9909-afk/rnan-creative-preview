// ملف العميل: صفحة واحدة لكل ما يخص العميل — أرقامه (المدفوع، المستحق، المشاريع، مدة السداد، النقاط)، مشاريعه وفواتيره وعروضه،
// سجل العلاقة، ملاحظات خاصة لا يراها العميل (clients/<id>/adminNotes)، وأزرار سريعة: واتساب، فاتورة، عرض سعر، مشروع، كشف حساب، رابط الصفحة.
// تستبدل showClientDetails في admin.html وترسم داخل #client-profile-page. الأنماط في css/client-profile.css.
(function () {
    const PAID = 'مدفوعة', VOID = ['ملغاة', 'ملغي'], DONE = 'مكتمل';
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => Math.round(v || 0).toLocaleString('en-US');
    const moneyText = v => `<span class="en-num">${num(v)}</span> ر.س`;
    const C = () => (typeof clientsData !== 'undefined' ? clientsData : []);
    const I = () => (typeof invoicesData !== 'undefined' ? invoicesData : []);
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const R = () => (typeof requestsData !== 'undefined' ? requestsData : []);
    const amt = i => parseFloat(i.amount) || 0;
    const sum = a => a.reduce((s, i) => s + amt(i), 0);
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : (s && !isNaN(Date.parse(s)) ? new Date(s) : null); };
    const day0 = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const fmt = d => d ? `<span class="en-num">${d.getDate()}</span> ${MONTHS[d.getMonth()]} <span class="en-num">${d.getFullYear()}</span>` : '—';
    const plural = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : n + (n <= 10 ? ' ' + few : ' ' + many);
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    const hue = s => { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
    const names = c => [...new Set([c.company, c.name].filter(Boolean).map(x => String(x).trim()))];
    const phone9 = s => String(s || '').replace(/\D/g, '').slice(-9);
    const STATUS = { 'قيد التنفيذ': 'run', 'مكتمل': 'done', 'معلق': 'hold', 'جديد': 'new' };
    let cur = null, proposals = null, propsAt = 0, noteTimer = null;

    async function loadProposals() {
        if (proposals && Date.now() - propsAt < 60000) return proposals;
        try { proposals = Object.entries((await window.db.ref('proposals').once('value')).val() || {}).map(([id, v]) => Object.assign({ id }, v)); } catch (e) { proposals = []; }
        propsAt = Date.now();
        return proposals;
    }
    const invState = i => (window.InvoicesPage && InvoicesPage.state ? InvoicesPage.state(i) : i.status === PAID ? 'paid' : VOID.includes(i.status) ? 'void' : 'open');
    const invLabel = i => (window.InvoicesPage && InvoicesPage.dueLabel ? InvoicesPage.dueLabel(i) : i.status);

    function data(c) {
        const n = names(c), key = String(c.rowIndex);
        const inv = I().filter(i => n.includes(String(i.client || '').trim())).sort((a, b) => String(b.date).localeCompare(String(a.date)));
        const live = inv.filter(i => !VOID.includes(i.status)), paid = live.filter(i => i.status === PAID), open = live.filter(i => i.status !== PAID);
        const late = open.filter(i => invState(i) === 'late');
        const prj = P().filter(p => n.includes(String(p.client || '').trim()));
        const props = (proposals || []).filter(p => String(p.clientKey) === key || n.includes(String(p.clientName || '').trim())).sort((a, b) => String(b.sentAt || b.createdAt || '').localeCompare(String(a.sentAt || a.createdAt || '')));
        const reqs = R().filter(r => String(r.clientKey) === key || (phone9(r.phone).length === 9 && phone9(r.phone) === phone9(c.phone)));
        const timed = paid.map(i => { const p = i.paidAt ? day0(i.paidAt) : null, d = parse(i.date); return p && d ? Math.max(0, Math.round((p - day0(d)) / 864e5)) : null; }).filter(x => x !== null);
        return { inv, live, paid, open, late, prj, props, reqs, avgPay: timed.length ? Math.round(timed.reduce((s, x) => s + x, 0) / timed.length) : null };
    }

    function timeline(c, d) {
        const ev = [];
        const add = (at, icon, tone, t, sub) => { const x = parse(at); if (x) ev.push({ x, icon, tone, t, sub }); };
        add(c.dateAdded, 'person_add', 'blue', 'انضم إلى رنان', c.invitedBy ? 'بدعوة من عميل' : '');
        d.inv.forEach(i => {
            add(i.date, 'receipt_long', 'blue', `أُصدرت الفاتورة #${esc(i.number)}`, moneyText(amt(i)));
            if (i.paidAt) add(i.paidAt, 'task_alt', 'mint', `سُدّدت الفاتورة #${esc(i.number)}`, (i.payMethod ? esc(i.payMethod) + ' · ' : '') + moneyText(amt(i)));
        });
        d.prj.forEach(p => {
            add(p.startDate, 'rocket_launch', 'violet', `بدأ مشروع «${esc(p.name)}»`, p.status === DONE ? 'سُلّم' : esc(p.status || ''));
            if (p.ratedAt && p.rating) add(new Date(p.ratedAt).toISOString(), 'star', 'gold', `قيّم «${esc(p.name)}» بـ${p.rating} من 5`, p.review ? '«' + esc(String(p.review).slice(0, 60)) + '»' : '');
        });
        d.props.forEach(p => {
            add(p.sentAt || p.createdAt, 'request_quote', 'blue', `${p.sentAt ? 'أُرسل' : 'أُنشئ'} عرض «${esc(p.title || '')}»`, p.total ? moneyText(p.total) : '');
        });
        d.reqs.forEach(r => add(r.createdAt, 'move_to_inbox', 'gold', 'طلب خدمة من الموقع', esc((window.RNAN && RNAN.serviceTitles ? RNAN.serviceTitles(r.services || []) : '') || r.details || '')));
        return ev.sort((a, b) => b.x - a.x).slice(0, 14);
    }

    function render(index) {
        const page = document.getElementById('client-profile-page');
        const c = C()[index];
        if (!page || !c) return;
        cur = { index, row: c.rowIndex };
        const d = data(c), name = c.company || c.name || 'عميل', tier = window.RNAN && RNAN.tierOf ? RNAN.tierOf(c.totalSpent) : null;
        const since = parse(c.dateAdded), months = since ? Math.max(0, Math.round((Date.now() - since) / (30.4 * 864e5))) : null;
        const active = d.prj.filter(p => p.status !== DONE), done = d.prj.filter(p => p.status === DONE);
        const phone = String(c.phone || '').trim();
        page.innerHTML = `<div class="cp">
            <header class="cp-head">
                <button type="button" class="cp-back" data-cp="back" aria-label="العودة للعملاء">${ic('arrow_forward')}</button>
                <span class="cp-av" style="--h:${hue(name)}">${esc(name.trim().charAt(0) || '?')}</span>
                <div class="cp-id">
                    <h1>${esc(name)}</h1>
                    <p>${phone ? `<a class="en-num" dir="ltr" href="tel:${esc(phone)}">${esc(phone)}</a>` : '<span>بلا رقم جوال</span>'}
                        ${since ? `<span>عميل منذ ${MONTHS[since.getMonth()]} <span class="en-num">${since.getFullYear()}</span></span>` : ''}
                        ${tier ? `<span class="cp-tier ${tier.key}">${ic('workspace_premium')} ${tier.name}</span>` : ''}
                        ${d.late.length ? `<span class="cp-flag">${ic('running_with_errors')} ${plural(d.late.length, 'فاتورة متأخرة', 'فاتورتان متأخرتان', 'فواتير متأخرة', 'فاتورة متأخرة')}</span>` : ''}</p>
                </div>
            </header>
            <nav class="cp-acts" aria-label="إجراءات سريعة">
                ${phone ? `<button type="button" class="wa" data-cp="wa">${ic('chat')}<span>واتساب</span></button>` : ''}
                <button type="button" data-cp="invoice">${ic('receipt_long')}<span>فاتورة</span></button>
                <button type="button" data-cp="quote">${ic('request_quote')}<span>عرض سعر</span></button>
                <button type="button" data-cp="project">${ic('create_new_folder')}<span>مشروع</span></button>
                <button type="button" data-cp="statement">${ic('summarize')}<span>كشف حساب</span></button>
                <button type="button" data-cp="link">${ic('link')}<span>صفحته</span></button>
                <button type="button" data-cp="edit">${ic('edit')}<span>تعديل</span></button>
            </nav>
            <section class="cp-kpis">
                <div class="mint"><span>${ic('payments')}</span><small>إجمالي المدفوع</small><b>${moneyText(sum(d.paid))}</b><em>${plural(d.paid.length, 'فاتورة واحدة', 'فاتورتان', 'فواتير', 'فاتورة')}</em></div>
                <div class="${d.open.length ? 'gold' : 'mint'}"><span>${ic('account_balance_wallet')}</span><small>مستحق عليه</small><b>${moneyText(sum(d.open))}</b><em>${d.late.length ? `<i class="late">${moneyText(sum(d.late))} متأخرة</i>` : d.open.length ? 'ضمن المهلة' : 'لا مستحقات'}</em></div>
                <div class="violet"><span>${ic('folder_open')}</span><small>المشاريع</small><b class="en-num">${d.prj.length}</b><em>${active.length} جارية · ${done.length} منجزة</em></div>
                <div class="blue"><span>${ic('timer')}</span><small>متوسط مدة السداد</small><b>${d.avgPay === null ? '—' : `<span class="en-num">${d.avgPay}</span> ${d.avgPay === 1 ? 'يوم' : d.avgPay === 2 ? 'يومان' : d.avgPay <= 10 ? 'أيام' : 'يومًا'}`}</b><em>${d.avgPay === null ? 'بعد أول سداد مسجّل' : d.avgPay <= 7 ? 'عميل منتظم السداد 👏' : 'يحتاج تذكيرًا أحيانًا'}</em></div>
                <div class="gold"><span>${ic('stars')}</span><small>نقاط الولاء</small><b class="en-num">${num(c.points)}</b><em>${tier && tier.next ? `باقي ${moneyText(tier.remaining)} للمستوى ${tier.next}` : tier ? 'أعلى مستوى' : ''}</em></div>
                <div class="blue"><span>${ic('handshake')}</span><small>مدة العلاقة</small><b>${months === null ? '—' : months < 1 ? 'جديد' : `<span class="en-num">${months}</span> ${months === 1 ? 'شهر' : months === 2 ? 'شهران' : months <= 10 ? 'أشهر' : 'شهرًا'}`}</b><em>${d.props.length ? plural(d.props.length, 'عرض واحد', 'عرضان', 'عروض', 'عرضًا') : 'بلا عروض'}</em></div>
            </section>
            <div class="cp-grid">
                <div class="cp-main">
                    <section class="cp-card"><header><h3>${ic('folder_open')} المشاريع <em class="en-num">${d.prj.length}</em></h3><button type="button" class="cp-link" data-cp="project">${ic('add')} مشروع جديد</button></header>
                        ${d.prj.length ? `<div class="cp-prj">${d.prj.map(p => {
                            const pi = P().indexOf(p), st = STATUS[p.status] || 'new', prog = Math.max(0, Math.min(100, parseInt(p.progress) || 0));
                            return `<article class="cp-p ${st}" data-cp="prj" data-i="${pi}" role="button" tabindex="0"><div class="cp-p-top"><b>${esc(p.name)}</b><span class="cp-st">${esc(p.status || 'جديد')}</span></div>
                                <span class="cp-bar"><i style="width:${prog}%"></i></span>
                                <small><span class="en-num">${prog}%</span>${p.deadline ? ` · التسليم ${fmt(parse(p.deadline))}` : ''}${p.value ? ` · ${moneyText(p.value)}` : ''}${p.proof ? ` · ${ic('draw')} مراجعة` : ''}</small></article>`;
                        }).join('')}</div>` : `<p class="cp-empty">لا مشاريع بعد</p>`}</section>
                    <section class="cp-card"><header><h3>${ic('receipt_long')} الفواتير <em class="en-num">${d.inv.length}</em></h3><button type="button" class="cp-link" data-cp="invoice">${ic('add')} فاتورة جديدة</button></header>
                        ${d.inv.length ? `<ul class="cp-inv">${d.inv.slice(0, 12).map(i => `<li class="st-${invState(i)}" data-cp="inv" data-n="${esc(i.number)}" role="button" tabindex="0">
                            <div><b class="en-num" dir="ltr">#${esc(i.number)}</b><small>${fmt(parse(i.date))}</small></div>
                            <span class="cp-chip">${esc(invLabel(i))}</span><b class="cp-amt">${moneyText(amt(i))}</b></li>`).join('')}</ul>
                            ${d.inv.length > 12 ? `<button type="button" class="cp-link" data-cp="all-inv">${ic('arrow_back')} كل الفواتير (${d.inv.length})</button>` : ''}` : `<p class="cp-empty">لا فواتير بعد</p>`}</section>
                    <section class="cp-card"><header><h3>${ic('request_quote')} العروض والعقود <em class="en-num">${d.props.length}</em></h3><button type="button" class="cp-link" data-cp="quote">${ic('add')} عرض سعر</button></header>
                        ${proposals === null ? `<p class="cp-empty">جارٍ التحميل…</p>` : d.props.length ? `<ul class="cp-props">${d.props.slice(0, 8).map(p => `<li data-cp="prop" data-id="${esc(p.id)}" role="button" tabindex="0">
                            <div><b>${esc(p.title || 'عرض')}</b><small>${esc(p.number || '')}${p.sentAt ? ' · أُرسل ' + fmt(parse(p.sentAt)) : ' · مسودة'}</small></div><b class="cp-amt">${p.total ? moneyText(p.total) : '—'}</b></li>`).join('')}</ul>` : `<p class="cp-empty">لا عروض بعد</p>`}</section>
                </div>
                <aside class="cp-side">
                    <section class="cp-card"><header><h3>${ic('sticky_note_2')} ملاحظات خاصة</h3><small class="cp-saved" id="cp-saved"></small></header>
                        <textarea id="cp-notes" class="cp-notes" rows="5" placeholder="تفضيلات العميل، الألوان التي يحبها، طريقة تواصله… لا يراها العميل">${esc(c.adminNotes || '')}</textarea></section>
                    <section class="cp-card"><header><h3>${ic('history')} سجل العلاقة</h3></header>
                        ${(() => { const ev = timeline(c, d); return ev.length ? `<ol class="cp-tl">${ev.map(e => `<li class="${e.tone}"><span class="dot">${ic(e.icon)}</span><div><b>${e.t}</b><small>${fmt(e.x)}${e.sub ? ' · ' + e.sub : ''}</small></div></li>`).join('')}</ol>` : '<p class="cp-empty">لا أحداث بعد</p>'; })()}</section>
                    <button type="button" class="cp-del" data-cp="delete">${ic('person_remove')} حذف العميل</button>
                </aside>
            </div>
        </div>`;
        // الملاحظات الخاصة تُحفظ تلقائيًا
        const ta = page.querySelector('#cp-notes');
        ta.addEventListener('input', () => {
            clearTimeout(noteTimer);
            const v = ta.value, row = c.rowIndex, saved = page.querySelector('#cp-saved');
            saved.textContent = '…';
            noteTimer = setTimeout(() => {
                window.db.ref('clients/' + row + '/adminNotes').set(v).then(() => { c.adminNotes = v; saved.textContent = '✓ حُفظت'; }).catch(() => { saved.textContent = 'تعذّر الحفظ'; });
            }, 700);
        });
    }

    async function show(index) {
        const c = C()[index];
        if (!c) return;
        // الملاحظات الخاصة ليست ضمن clientsData
        try { c.adminNotes = (await window.db.ref('clients/' + c.rowIndex + '/adminNotes').once('value')).val() || ''; } catch (e) { /* تُعرض فارغة */ }
        render(index);
        switchPage('client-profile');
        const main = document.querySelector('main');
        if (main) main.scrollTo(0, 0);
        loadProposals().then(() => { if (cur && cur.index === index && !document.getElementById('client-profile-page').classList.contains('hidden')) render(index); });
    }
    window.showClientDetails = index => { show(index); };

    document.addEventListener('click', e => {
        const b = e.target.closest('#client-profile-page [data-cp]');
        if (!b || !cur) return;
        const c = C()[cur.index];
        if (!c) return;
        const a = b.dataset.cp, name = c.company || c.name;
        if (a === 'back') switchPage('clients');
        else if (a === 'wa') window.open(RNAN.waLink(c.phone, `السلام عليكم ${c.name || name} 👋`), '_blank');
        else if (a === 'invoice') {
            openInvoiceModal('new');
            const sel = document.getElementById('edit-client-select');
            if (sel) { sel.value = name; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        } else if (a === 'quote') { switchPage('proposals'); Studio.P.edit(null, { clientKey: c.rowIndex, clientName: name, clientPhone: c.phone || '' }); }
        else if (a === 'project') window.ProjectsUI && ProjectsUI.compose({ client: name });
        else if (a === 'statement') window.InvoicesPage && InvoicesPage.statement(name);
        else if (a === 'link') openClientLink(cur.index);
        else if (a === 'edit') openClientModal('edit', cur.index);
        else if (a === 'delete') deleteClient(cur.index);
        else if (a === 'inv') window.InvoicesPage && InvoicesPage.open(b.dataset.n);
        else if (a === 'all-inv') { switchPage('invoices'); window.InvoicesPage && InvoicesPage.show({ client: name, tab: 'all' }); }
        else if (a === 'prj') openProjectModal('edit', +b.dataset.i);
        else if (a === 'prop') { switchPage('proposals'); Studio.P.edit(b.dataset.id); }
    });
    document.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('#client-profile-page [role="button"][data-cp]')) { e.preventDefault(); e.target.click(); }
    });
    // يُعاد رسم الملف بعد أي تحديث للبيانات وهو مفتوح (سداد، فاتورة جديدة، تعديل)
    const origLoad = window.loadAllData;
    if (typeof origLoad === 'function') window.loadAllData = function () {
        const r = origLoad.apply(this, arguments);
        setTimeout(() => {
            const pg = document.getElementById('client-profile-page');
            if (!cur || !pg || pg.classList.contains('hidden')) return;
            const i = C().findIndex(c => String(c.rowIndex) === String(cur.row));
            if (i > -1) { propsAt = 0; loadProposals().then(() => render(i)); } else switchPage('clients');
        }, 3000);
        return r;
    };
    window.ClientProfile = { show };
})();
