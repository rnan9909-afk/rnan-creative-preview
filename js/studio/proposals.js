/**
 * العروض والعقود: عرض سعر أو عقد مشروع بنطاق ومراحل وبنود وشروط دفع، يُرسل للعميل برابط ثابت
 * (offer.html?k=…) فيوافق عليه بتوقيعه الإلكتروني أو يطلب تعديلًا، ثم يتحوّل بضغطة إلى مشروع
 * بمهامه ومواعيده + فاتورة الدفعة المقدّمة.
 * الخاص: proposals/<id> · العام: offer/<token> (يكتب العميل فيه reply و seen فقط).
 */
(function () {
    const S = window.Studio, E = S.esc, ic = S.ic;
    const KIND = { quote: 'عرض سعر', contract: 'عقد مشروع' };
    const STAGE = {
        draft: { label: 'مسودة', badge: 'gray' },
        sent: { label: 'أُرسل للعميل', badge: 'blue' },
        viewed: { label: 'فتحه العميل', badge: 'violet' },
        changes: { label: 'طلب تعديل', badge: 'amber' },
        approved: { label: 'وافق العميل', badge: 'mint' },
        project: { label: 'قيد التنفيذ', badge: 'mint' },
        delivered: { label: 'سُلِّم', badge: 'mint' },
        expired: { label: 'انتهت صلاحيته', badge: 'red' },
        lost: { label: 'مؤرشف', badge: 'gray' }
    };
    const TABS = [
        ['all', 'الكل', s => s !== 'lost'],
        ['action', 'تحتاج إجراء', s => ['changes', 'approved', 'expired'].includes(s)],
        ['waiting', 'بانتظار الرد', s => ['sent', 'viewed'].includes(s)],
        ['draft', 'مسودات', s => s === 'draft'],
        ['won', 'موقّعة', s => ['approved', 'project', 'delivered'].includes(s)],
        ['lost', 'مؤرشفة', s => s === 'lost']
    ];
    let list = [], offers = {}, tab = 'all', loaded = false;

    const offerUrl = p => RNAN.pageUrl('offer.html', { k: p.token });
    const expired = p => !!p.validUntil && p.validUntil < S.today();
    const offerOf = p => offers[p.token] || {};
    // طلبات العميل على نص الاتفاقية: يظلّل نصًا في agreement.html ويطلب تعديله (offer/<token>/agreementNotes)
    const agNotes = p => S.toList(offerOf(p).agreementNotes).filter(n => n.quote).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    const agPending = p => agNotes(p).filter(n => n.status !== 'done');
    const projOf = p => p.projectKey && S.projects().find(x => String(x.rowIndex) === String(p.projectKey));

    function stage(p) {
        if (p.status === 'lost') return 'lost';
        if (p.projectKey) { const pr = projOf(p); return pr && pr.status === 'مكتمل' ? 'delivered' : 'project'; }
        if (p.status === 'draft') return 'draft';
        const r = offerOf(p).reply;
        if (r && r.decision === 'approved') return 'approved';
        if (r && r.decision === 'changes') return 'changes';
        if (expired(p)) return 'expired';
        return (offerOf(p).seen || {}).count ? 'viewed' : 'sent';
    }

    // ── التحميل ──
    async function load() {
        const [props, offs] = await Promise.all([S.get('proposals'), S.get('offer')]);
        offers = offs || {};
        list = S.toList(props).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        loaded = true;
        // ردود جديدة من العملاء منذ آخر زيارة
        const fresh = list.filter(p => { const r = offerOf(p).reply; return r && r.at !== p.replySeen; });
        if (fresh.length) {
            const u = {};
            fresh.forEach(p => { u['proposals/' + p.id + '/replySeen'] = offerOf(p).reply.at; p.replySeen = offerOf(p).reply.at; });
            S.ref().update(u);
            const p = fresh[0], r = offerOf(p).reply;
            S.toast(r.decision === 'approved' ? `🎉 وافق ${r.name} على «${p.title}»` : `✏️ ${r.name} طلب تعديلًا على «${p.title}»`);
        } else {
            const asked = list.find(p => agPending(p).length);
            if (asked) S.toast(`📝 طلب تعديل على اتفاقية «${asked.title}» — افتحها من بطاقة العرض`);
        }
        badge();
    }
    function badge() {
        const el = document.getElementById('proposals-nav-badge');
        if (!el) return;
        const n = list.filter(p => ['changes', 'approved'].includes(stage(p)) || agPending(p).length).length;
        el.textContent = n;
        el.classList.toggle('show', n > 0);
    }

    // ── العرض ──
    function stats() {
        let signed = 0, signedN = 0, nego = 0, waiting = 0, unopened = 0, sentN = 0;
        list.forEach(p => {
            const s = stage(p), t = +p.total || 0;
            if (s !== 'draft') sentN++;
            if (['approved', 'project', 'delivered'].includes(s)) { signed += t; signedN++; }
            if (['sent', 'viewed', 'changes'].includes(s)) nego += t;
            if (['sent', 'viewed'].includes(s)) waiting++;
            if (s === 'sent') unopened++;
        });
        const rate = sentN ? Math.round(signedN / sentN * 100) : 0;
        const card = (icon, color, lbl, val, sub) => `<div class="st-stat"><span class="st-ico ${color}">${ic(icon)}</span><span class="lbl">${lbl}</span><span class="val">${val}</span><span class="sub">${sub}</span></div>`;
        return `<div class="st-stats">
            ${card('verified', 'mint', 'قيمة موقّعة', S.money(signed), signedN ? `${signedN} صفقة موقّعة` : 'لا صفقات موقّعة بعد')}
            ${card('forum', 'amber', 'قيد التفاوض', S.money(nego), 'عروض أُرسلت ولم تُحسم بعد')}
            ${card('schedule', 'blue', 'بانتظار رد العميل', `<span class="st-num">${waiting}</span>`, unopened ? `${unopened} لم تُفتح بعد` : 'كل العروض المرسلة فُتحت')}
            ${card('trending_up', 'violet', 'نسبة القبول', `<span class="st-num">${rate}%</span>`, sentN ? `من ${sentN} عرضًا مرسلًا` : 'تظهر بعد أول عرض')}
        </div>`;
    }

    function pipe(s) {
        const steps = ['أُرسل', 'فُتح', 'وافق', 'مشروع', 'سُلّم'];
        const reached = { draft: -1, sent: 0, expired: 0, viewed: 1, changes: 1, approved: 2, project: 3, delivered: 4, lost: -1 }[s];
        return `<div class="st-pipe">${steps.map((t, i) => {
            if (s === 'changes' && i === 2) return `<span class="alert">طلب تعديل</span>`;
            if (s === 'expired' && i === 1) return `<span class="alert">انتهت الصلاحية</span>`;
            return `<span class="${i <= reached ? 'done' : (i === reached + 1 && s !== 'lost' ? 'now' : '')}">${t}</span>`;
        }).join('')}</div>`;
    }

    function card(p) {
        const s = stage(p), st = STAGE[s], o = offerOf(p), seen = o.seen || {}, r = o.reply;
        const c = S.calc(p);
        const chips = [];
        if (s !== 'draft' && s !== 'lost') {
            chips.push(seen.count ? `<span class="st-chip">${ic('visibility')} فُتح <span class="st-num">${seen.count}</span> ${seen.count > 1 ? 'مرات' : 'مرة'}</span>` : `<span class="st-chip">${ic('visibility_off')} لم يُفتح بعد</span>`);
            if (seen.last) chips.push(`<span class="st-chip warn">آخر فتح ${S.fmtDate(seen.last)} ${S.fmtTime(seen.last)}</span>`);
        }
        if (p.validUntil && ['draft', 'sent', 'viewed', 'changes', 'expired'].includes(s)) {
            const left = S.diffDays(S.today(), p.validUntil);
            chips.push(left < 0 ? `<span class="st-chip hot">انتهى ${S.fmtDate(p.validUntil)}</span>` : `<span class="st-chip ${left <= 3 ? 'warn' : ''}">صالح ${left === 0 ? 'حتى اليوم' : S.days(left, true)}</span>`);
        }
        if (p.revision > 1) chips.push(`<span class="st-chip">نسخة <span class="st-num">${p.revision}</span></span>`);
        if (p.agreement) chips.push(`<button class="st-chip ok" onclick="Studio.P.agreement('${p.id}')">${ic('contract')} اتفاقية رسمية جاهزة</button>`);
        const asks = agPending(p).length;
        if (asks) chips.push(`<button class="st-chip hot" onclick="Studio.P.agreement('${p.id}')">${ic('rate_review')} طلب تعديل على الاتفاقية <span class="st-num">${asks}</span></button>`);

        let note = '';
        if (r && r.decision === 'changes' && s === 'changes') note = `<div class="st-note"><b>ملاحظة ${E(r.name)}:</b>\n${E(r.note || '—')}</div>`;
        if (r && r.decision === 'approved') note = `<div class="st-note ok">${ic('draw')} وقّع: <b>${E(r.name)}</b> — ${S.fmtDate(r.at)} ${S.fmtTime(r.at)}</div>`;

        const primary = {
            draft: `<button class="st-btn sm primary" onclick="Studio.P.send('${p.id}')">${ic('send')} أرسل للعميل</button>`,
            sent: `<button class="st-btn sm soft" onclick="Studio.P.send('${p.id}', true)">${ic('notifications_active')} تذكير واتساب</button>`,
            viewed: `<button class="st-btn sm soft" onclick="Studio.P.send('${p.id}', true)">${ic('notifications_active')} متابعة واتساب</button>`,
            changes: `<button class="st-btn sm primary" onclick="Studio.P.edit('${p.id}')">${ic('edit_note')} عدّل وأعد الإرسال</button>`,
            approved: `<button class="st-btn sm primary" onclick="Studio.P.convert('${p.id}')">${ic('rocket_launch')} حوّله لمشروع</button>`,
            expired: `<button class="st-btn sm soft" onclick="Studio.P.extend('${p.id}')">${ic('update')} مدّد 14 يومًا</button>`,
            project: `<button class="st-btn sm ghost" onclick="switchPage('projects')">${ic('folder_open')} فتح المشروع</button>`,
            delivered: `<button class="st-btn sm ghost" onclick="switchPage('projects')">${ic('folder_open')} فتح المشروع</button>`,
            lost: `<button class="st-btn sm ghost" onclick="Studio.P.restore('${p.id}')">${ic('unarchive')} استرجاع</button>`
        }[s];

        return `<article class="st-card st-deal">
            <div class="st-deal-top">
                <div style="min-width:0"><h3>${E(p.title)}</h3><p>${E(KIND[p.kind] || KIND.quote)} · ${E(p.clientName || '—')} · <span class="st-num">${E(p.number || '')}</span></p></div>
                <span class="st-badge ${st.badge}">${st.label}</span>
            </div>
            ${pipe(s)}
            ${chips.length ? `<div class="st-chips">${chips.join('')}</div>` : ''}
            ${note}
            <dl class="st-kv">
                <dt>القيمة</dt><dd>${S.money(c.total)}</dd>
                <dt>شروط الدفع</dt><dd>${c.depositPct ? `<span class="st-num">${c.depositPct}%</span> مقدم / <span class="st-num">${100 - c.depositPct}%</span> عند التسليم` : 'كامل المبلغ عند التسليم'}</dd>
                <dt>المدة</dt><dd>${c.days ? S.days(c.days, true) : '—'}</dd>
            </dl>
            <div class="st-actions">
                ${primary}
                ${s !== 'draft' && s !== 'lost' ? `<button class="st-btn sm icon ghost" title="نسخ رابط العرض" onclick="Studio.P.copy('${p.id}', this)">${ic('link')}</button>` : ''}
                ${s !== 'lost' ? `<button class="st-btn sm icon ghost" title="الاتفاقية الرسمية (PDF)" onclick="Studio.P.agreement('${p.id}')">${ic('contract')}</button>` : ''}
                <span class="grow"></span>
                <div class="st-more"><button class="st-btn sm ghost" onclick="Studio.toggleMore(this)">المزيد ${ic('expand_more')}</button>
                    <div class="st-menu">
                        <button onclick="Studio.P.edit('${p.id}')">${ic('edit')} تعديل</button>
                        <button onclick="Studio.P.preview('${p.id}')">${ic('visibility')} معاينة كما يراها العميل</button>
                        <button onclick="Studio.P.agreement('${p.id}')">${ic('contract')} الاتفاقية الرسمية (PDF)</button>
                        <button onclick="Studio.P.duplicate('${p.id}')">${ic('content_copy')} تكرار</button>
                        ${s !== 'lost' && !p.projectKey ? `<button onclick="Studio.P.archive('${p.id}')">${ic('archive')} أرشفة (لم تتم)</button>` : ''}
                        <button class="danger" onclick="Studio.P.remove('${p.id}')">${ic('delete')} حذف</button>
                    </div>
                </div>
            </div>
        </article>`;
    }

    function render() {
        const el = S.page('proposals');
        if (!el) return;
        const counts = {};
        TABS.forEach(([k, , f]) => { counts[k] = list.filter(p => f(stage(p))).length; });
        const flt = (TABS.find(t => t[0] === tab) || TABS[0])[2];
        const shown = list.filter(p => flt(stage(p)));
        el.innerHTML = `
            <div class="st-head">
                <div><h1>العروض والعقود</h1><p>عروض أسعار وعقود بنطاق عمل ومراحل وشروط دفع واضحة. أرسلها برابط يوافق عليه العميل بتوقيعه أو يطلب تعديلًا، ثم حوّلها لمشروع بضغطة.</p></div>
                <div class="st-head-actions">
                    <button class="st-btn ghost" onclick="switchPage('templates')">${ic('library_books')} من قالب</button>
                    <button class="st-btn primary" onclick="Studio.P.edit()">${ic('add')} عرض سعر أو عقد جديد</button>
                </div>
            </div>
            ${stats()}
            <details class="st-explain" ${list.length ? '' : 'open'}>
                <summary>${ic('expand_more', 'chev')} كيف تسير الصفقة؟</summary>
                <div class="st-flow">
                    <div><b><i>1</i> أنشئ العرض</b><p>من قالب جاهز أو من الصفر: البنود والمراحل والدفعة المقدّمة والشروط.</p></div>
                    <div><b><i>2</i> أرسله بواتساب</b><p>رابط ثابت بهوية رنان، وتعرف متى فتحه العميل وكم مرة.</p></div>
                    <div><b><i>3</i> العميل يقرّر</b><p>يوافق بكتابة اسمه كتوقيع إلكتروني، أو يطلب تعديلًا بملاحظة تصلك هنا.</p></div>
                    <div><b><i>4</i> حوّله لمشروع</b><p>مشروع بمراحله ومهامه ومواعيده + فاتورة الدفعة المقدّمة، تلقائيًا.</p></div>
                </div>
            </details>
            <div class="st-tabs">${TABS.map(([k, t]) => `<button class="${k === tab ? 'on' : ''}" onclick="Studio.P.tab('${k}')">${t}<span class="st-count st-num">${counts[k]}</span></button>`).join('')}</div>
            ${shown.length ? `<div class="st-grid wide">${shown.map(card).join('')}</div>` : `<div class="st-empty">
                <h3>${list.length ? 'لا توجد عروض في هذا التبويب' : 'أرسل أول عرض سعر احترافي'}</h3>
                ${list.length ? '' : `<ol><li><b>اختر قالبًا</b> أو ابدأ من الصفر.</li><li><b>أرسل الرابط</b> لعميلك بواتساب.</li><li><b>يوافق العميل</b> فتحوّله لمشروع وفاتورة.</li></ol><br>`}
                <button class="st-btn primary" onclick="Studio.P.edit()">${ic('add')} عرض جديد</button></div>`}`;
    }

    async function open() {
        const el = S.page('proposals');
        if (el && !loaded) el.innerHTML = `<div class="st-empty"><p class="st-muted">جاري التحميل...</p></div>`;
        await load();
        render();
    }

    // ── المحرّر ──
    function nextNumber(kind) {
        const prefix = (kind === 'contract' ? 'CT-' : 'QT-') + new Date().getFullYear() + '-';
        const max = list.filter(p => String(p.number || '').startsWith(prefix)).reduce((m, p) => Math.max(m, parseInt(String(p.number).slice(prefix.length)) || 0), 0);
        return prefix + String(max + 1).padStart(3, '0');
    }

    function summary() {
        const ed = S.edState(), c = S.calc(ed);
        const box = document.getElementById('st-p-sum');
        if (!box) return;
        box.innerHTML = `
            <div><span>مجموع البنود</span><b>${S.money(c.subtotal)}</b></div>
            ${c.discount ? `<div><span>الخصم</span><b>− ${S.money(c.discount)}</b></div>` : ''}
            ${ed.vat ? `<div><span>ضريبة القيمة المضافة 15%</span><b>${S.money(c.vat)}</b></div>` : ''}
            <div class="total"><span>الإجمالي</span><b>${S.money(c.total)}</b></div>
            ${c.depositPct ? `<div><span>الدفعة المقدّمة (<span class="st-num">${c.depositPct}%</span>)</span><b>${S.money(c.depositAmount)}</b></div>
            <div><span>عند التسليم</span><b>${S.money(c.remaining)}</b></div>` : ''}
            <div><span>مدة التنفيذ</span><b>${c.days ? S.days(c.days, true) : '—'}</b></div>`;
    }

    function tplOptions() {
        const mine = (S.modules.templates && S.modules.templates.mine()) || [];
        const opt = (id, n) => `<option value="${E(id)}">${E(n)}</option>`;
        return `<option value="">— بدون —</option>`
            + (mine.length ? `<optgroup label="قوالبي">${mine.map(t => opt(t.id, t.name)).join('')}</optgroup>` : '')
            + `<optgroup label="المكتبة الجاهزة">${StudioData.LIBRARY.map(t => opt(t.id, t.name)).join('')}</optgroup>`;
    }

    async function applyTemplate(id) {
        if (!id) return;
        const t = S.modules.templates.find(id);
        if (!t) return;
        const ed = S.edState();
        const hasContent = ed.items.some(i => i.desc || +i.price);
        if (hasContent && !await rnConfirm('سيُستبدل محتوى البنود والمراحل والمهام بمحتوى القالب. متابعة؟')) { document.getElementById('st-p-tpl').value = ''; return; }
        Object.assign(ed, { items: t.items || [], phases: t.phases || [], tasks: t.tasks || [], deposit: t.deposit != null ? t.deposit : 50, templateId: t.id });
        S.edStart(ed, onEdChange);
        if (!ed.title) { ed.title = t.name; document.getElementById('st-p-title').value = t.name; }
        if (!ed.intro && t.desc) { ed.intro = t.desc; document.getElementById('st-p-intro').value = t.desc; }
        document.getElementById('st-p-deposit').value = ed.deposit;
        S.renderLines();
        summary();
    }

    function onEdChange() { summary(); }

    // يفتح المحرّر لعرض موجود أو جديد؛ seed: تعبئة أولية (من قالب أو تكرار)
    function edit(id, seed) {
        const p = id ? list.find(x => x.id === id) : null;
        const base = p ? JSON.parse(JSON.stringify(p)) : Object.assign({
            kind: 'quote', title: '', clientKey: '', clientName: '', clientPhone: '', intro: '',
            items: [{ desc: '', qty: 1, price: 0 }], phases: [], tasks: [], deposit: 50, discount: 0, vat: false,
            // الصلاحية والشروط من قائمة الأسعار (30 يومًا وملاحظات العرض) إن وُجدت
            validUntil: S.addDays(S.today(), window.PriceList ? PriceList.validity() : 14), startDate: '', terms: window.PriceList ? PriceList.terms() : StudioData.TERMS
        }, seed || {});
        const ed = S.edStart(base, onEdChange);
        const isNewClient = !ed.clientKey && !!ed.clientName;
        const approved = p && (offerOf(p).reply || {}).decision === 'approved';

        S.modal(`${S.mHead('request_quote', p ? 'تعديل ' + (KIND[ed.kind] || 'العرض') : 'عرض سعر أو عقد جديد', p ? (p.number + (approved ? ' · وافق عليه العميل — أي إرسال جديد يطلب موافقته من جديد' : '')) : 'املأ البنود والمراحل، ثم احفظه مسودة أو أرسله مباشرة.')}
            <div class="st-m-body">
                <div class="st-two">
                    <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
                        <div class="st-seg" id="st-p-kind">
                            <button type="button" class="${ed.kind !== 'contract' ? 'on' : ''}" onclick="Studio.P.kind('quote', this)">${ic('request_quote')} عرض سعر</button>
                            <button type="button" class="${ed.kind === 'contract' ? 'on' : ''}" onclick="Studio.P.kind('contract', this)">${ic('contract')} عقد مشروع</button>
                        </div>
                        <div class="st-form">
                            <label class="st-f full"><span>عنوان العرض *</span><input id="st-p-title" class="form-input-modern font-bold" placeholder="مثال: هوية بصرية متكاملة لمقهى بُنّ" value="${E(ed.title)}" oninput="Studio.edField('title', this.value)"></label>
                            <label class="st-f"><span>العميل *</span>
                                <select id="st-p-client" class="form-input-modern" onchange="Studio.P.client(this.value)">
                                    <option value="">— اختر عميلًا —</option>${S.clientOptions(ed.clientKey)}<option value="__new" ${isNewClient ? 'selected' : ''}>+ عميل جديد</option>
                                </select></label>
                            <label class="st-f"><span>ابدأ من قالب <em>(اختياري)</em></span><select id="st-p-tpl" class="form-input-modern" onchange="Studio.P.tpl(this.value)">${tplOptions()}</select></label>
                            <div id="st-p-newclient" class="full st-form" style="${isNewClient ? '' : 'display:none'}">
                                <label class="st-f"><span>اسم العميل / الجهة *</span><input id="st-p-cname" class="form-input-modern" value="${E(isNewClient ? ed.clientName : '')}" oninput="Studio.edField('clientName', this.value)"></label>
                                <label class="st-f"><span>جوال العميل <em>(للإرسال بواتساب)</em></span><input id="st-p-cphone" class="form-input-modern" dir="ltr" placeholder="05xxxxxxxx" value="${E(isNewClient ? ed.clientPhone : '')}" oninput="Studio.edField('clientPhone', this.value)"></label>
                            </div>
                            <label class="st-f full"><span>نبذة ونطاق العمل <em>(يراها العميل أعلى العرض)</em></span><textarea id="st-p-intro" class="form-input-modern" rows="3" oninput="Studio.edField('intro', this.value)">${E(ed.intro)}</textarea></label>
                        </div>
                        ${S.block('items')}
                        ${S.block('phases', '<div class="st-gantt" id="st-gantt"></div>')}
                        ${S.block('tasks', '<p class="st-muted text-xs" style="margin:0">المهام تُجدول تلقائيًا في المشروع عند الموافقة؛ «محطة» = نقطة يراها العميل ويُطلب اعتماده فيها.</p>')}
                        <label class="st-f"><span>الشروط والأحكام <em>(سطر لكل بند)</em></span><textarea class="form-input-modern text-sm" rows="6" oninput="Studio.edField('terms', this.value)">${E(ed.terms)}</textarea></label>
                    </div>
                    <div style="position:sticky;top:84px;display:flex;flex-direction:column;gap:14px">
                        <div class="st-block">
                            <div class="st-form">
                                <label class="st-f"><span>خصم (ر.س)</span><input type="text" inputmode="decimal" min="0" dir="ltr" class="form-input-modern" value="${+ed.discount || 0}" oninput="Studio.edField('discount', this.value, true)"></label>
                                <label class="st-f"><span>الدفعة المقدّمة %</span><input id="st-p-deposit" type="text" inputmode="decimal" min="0" max="100" dir="ltr" class="form-input-modern" value="${+ed.deposit || 0}" oninput="Studio.edField('deposit', this.value, true)"></label>
                                <label class="st-f"><span>صالح حتى</span><input type="date" class="form-input-modern" value="${E(ed.validUntil)}" oninput="Studio.edField('validUntil', this.value)"></label>
                                <label class="st-f"><span>بداية متوقّعة <em>(اختياري)</em></span><input type="date" class="form-input-modern" value="${E(ed.startDate)}" oninput="Studio.edField('startDate', this.value)"></label>
                                <label class="st-check full"><input type="checkbox" ${ed.vat ? 'checked' : ''} onchange="Studio.edField('vat', this.checked)"> إضافة ضريبة القيمة المضافة 15%</label>
                            </div>
                        </div>
                        <div class="st-block"><div class="st-sum" id="st-p-sum"></div></div>
                    </div>
                </div>
            </div>
            <div class="st-m-foot">
                <button class="st-btn primary" onclick="Studio.P.save(true, this)">${ic('send')} حفظ وإرسال للعميل</button>
                <button class="st-btn ghost" onclick="Studio.P.save(false, this)">${ic('save')} ${p && p.status !== 'draft' ? 'حفظ التعديلات' : 'حفظ كمسودة'}</button>
                <span class="grow" style="flex:1"></span>
                <button class="st-btn ghost" onclick="Studio.closeModal()">إلغاء</button>
            </div>`, 'wide');
        ed._id = p ? p.id : null;
        S.renderLines();
        summary();
    }

    function setKind(k, btn) {
        S.edField('kind', k);
        btn.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
    }
    function setClient(v) {
        const box = document.getElementById('st-p-newclient');
        const ed = S.edState();
        if (v === '__new') { ed.clientKey = ''; ed.clientName = document.getElementById('st-p-cname').value; ed.clientPhone = document.getElementById('st-p-cphone').value; box.style.display = ''; return; }
        box.style.display = 'none';
        const c = S.clients().find(x => String(x.rowIndex) === String(v));
        ed.clientKey = v;
        ed.clientName = S.clientName(c);
        ed.clientPhone = (c && c.phone) || '';
    }

    async function publish(p) {
        const c = S.calc(p), site = await S.site();
        await S.ref('offer/' + p.token).update({
            number: p.number, kind: p.kind || 'quote', title: p.title, intro: p.intro || '', client: p.clientName || '',
            items: (p.items || []).map(i => ({ desc: i.desc || '', qty: +i.qty || 0, price: +i.price || 0 })),
            phases: (p.phases || []).map(x => ({ name: x.name || '', days: +x.days || 0 })),
            milestones: (p.tasks || []).filter(t => t.ms).map(t => ({ title: t.title || '', day: +t.day || 0 })),
            terms: p.terms || '', validUntil: p.validUntil || '', startDate: p.startDate || '', issuedAt: p.sentAt || p.createdAt,
            subtotal: c.subtotal, discount: c.discount, vat: c.vat, total: c.total, deposit: c.depositPct, depositAmount: c.depositAmount, remaining: c.remaining, days: c.days,
            revision: p.revision || 1, status: p.status === 'lost' ? 'closed' : 'open', whatsapp: site.whatsapp || site.phone || '', updatedAt: new Date().toISOString()
        });
    }

    function whatsapp(p, reminder) {
        const c = S.calc(p);
        const kind = KIND[p.kind] || KIND.quote;
        const msg = reminder
            ? `السلام عليكم ${p.clientName || ''} 👋\nتذكير لطيف بـ${kind} «${p.title}» من رنان لخدمات التصميم.\nتقدر تراجعه وتوافق عليه أو تطلب تعديل من هنا:\n${offerUrl(p)}${p.validUntil ? `\nصالح حتى ${S.fmtDate(p.validUntil, { day: 'numeric', month: 'long', year: 'numeric' })}.` : ''}`
            : `السلام عليكم ${p.clientName || ''} 👋\nأرسلنا لك ${kind} «${p.title}» من رنان لخدمات التصميم.\nالقيمة: ${S.moneyText(c.total)}${c.days ? ` — المدة: ${S.days(c.days)}` : ''}\nراجع التفاصيل ووافق عليه أو اطلب تعديل من هنا:\n${offerUrl(p)}${p.validUntil ? `\nالعرض صالح حتى ${S.fmtDate(p.validUntil, { day: 'numeric', month: 'long', year: 'numeric' })}.` : ''}`;
        const phone = RNAN.intlPhone(p.clientPhone || '');
        window.open(phone.length >= 9 ? RNAN.waLink(phone, msg) : 'https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    }

    async function save(send, btn) {
        const ed = S.edState();
        ed.title = (ed.title || '').trim();
        if (!ed.title) { S.toast('اكتب عنوان العرض'); document.getElementById('st-p-title').focus(); return; }
        if (!ed.clientKey && !(ed.clientName || '').trim()) { S.toast('اختر العميل أو أضف عميلًا جديدًا'); document.getElementById('st-p-client').focus(); return; }
        const items = ed.items.filter(i => (i.desc || '').trim() || +i.price);
        if (!items.length || !S.calc({ items }).subtotal) { S.toast('أضف بندًا واحدًا على الأقل بسعر'); return; }
        await S.busy(btn, async () => {
            const old = ed._id ? list.find(x => x.id === ed._id) : null;
            const now = new Date().toISOString();
            const id = ed._id || S.newId();
            const rec = {
                kind: ed.kind || 'quote', title: ed.title, clientKey: ed.clientKey || '', clientName: (ed.clientName || '').trim(), clientPhone: (ed.clientPhone || '').trim(),
                intro: ed.intro || '', items: items.map(i => ({ desc: (i.desc || '').trim(), qty: +i.qty || 0, price: +i.price || 0 })),
                phases: ed.phases.filter(x => (x.name || '').trim()).map(x => ({ name: x.name.trim(), days: +x.days || 0 })),
                tasks: ed.tasks.filter(x => (x.title || '').trim()).map(x => ({ title: x.title.trim(), day: +x.day || 0, ms: !!x.ms })),
                deposit: +ed.deposit || 0, discount: +ed.discount || 0, vat: !!ed.vat, validUntil: ed.validUntil || '', startDate: ed.startDate || '',
                terms: ed.terms || '', templateId: ed.templateId || '', number: (old && old.number) || nextNumber(ed.kind),
                token: (old && old.token) || RNAN.newToken(), status: old ? old.status : 'draft', revision: (old && old.revision) || 1,
                createdAt: (old && old.createdAt) || now, updatedAt: now
            };
            if (old) ['sentAt', 'projectKey', 'projectCode', 'convertedAt', 'replySeen', 'invoiceId', 'agreement'].forEach(k => { if (old[k]) rec[k] = old[k]; });
            rec.total = S.calc(rec).total;
            const hadReply = !!offerOf(rec).reply;
            if (send) {
                if (hadReply && !rec.projectKey) { await S.ref('offer/' + rec.token + '/reply').remove(); rec.revision += 1; delete offers[rec.token].reply; }
                rec.status = 'sent';
                rec.sentAt = now;
                if (rec.validUntil && rec.validUntil < S.today()) rec.validUntil = S.addDays(S.today(), 14);
            }
            await S.ref('proposals/' + id).set(rec);
            if (rec.status !== 'draft') await publish(rec);
            rec.id = id;
            S.closeModal();
            await load();
            render();
            if (send) whatsapp(rec);
            S.toast(send ? 'حُفظ العرض وفُتح واتساب لإرساله ✓' : 'حُفظ العرض ✓');
        });
    }

    // ── إجراءات البطاقة ──
    const byId = id => list.find(x => x.id === id);
    async function send(id, reminder) {
        const p = byId(id);
        if (!p) return;
        if (!reminder) {
            p.status = 'sent'; p.sentAt = new Date().toISOString(); p.updatedAt = p.sentAt;
            if (p.validUntil && p.validUntil < S.today()) p.validUntil = S.addDays(S.today(), 14);
            await S.ref('proposals/' + id).update({ status: 'sent', sentAt: p.sentAt, updatedAt: p.updatedAt, validUntil: p.validUntil || '' });
            await publish(p);
            render();
        }
        whatsapp(p, reminder);
    }
    function copy(id, btn) {
        const url = offerUrl(byId(id));
        if (typeof copyText === 'function') copyText(url, btn);
        else navigator.clipboard.writeText(url).then(() => S.toast('نُسخ الرابط ✓'));
    }
    const preview = id => window.open(offerUrl(byId(id)) + '&preview=1', '_blank');
    async function extend(id) {
        const p = byId(id);
        p.validUntil = S.addDays(S.today(), 14);
        p.updatedAt = new Date().toISOString();
        await S.ref('proposals/' + id).update({ validUntil: p.validUntil, updatedAt: p.updatedAt });
        await publish(p);
        render();
        S.toast('مُدّدت صلاحية العرض حتى ' + S.fmtDate(p.validUntil) + ' ✓');
    }
    async function archive(id) {
        const p = byId(id);
        p.status = 'lost'; p.updatedAt = new Date().toISOString();
        await S.ref('proposals/' + id).update({ status: 'lost', updatedAt: p.updatedAt });
        await S.ref('offer/' + p.token).update({ status: 'closed' });
        render();
    }
    async function restore(id) {
        const p = byId(id);
        p.status = p.sentAt ? 'sent' : 'draft'; p.updatedAt = new Date().toISOString();
        await S.ref('proposals/' + id).update({ status: p.status, updatedAt: p.updatedAt });
        if (p.sentAt) await S.ref('offer/' + p.token).update({ status: 'open' });
        render();
    }
    async function remove(id) {
        const p = byId(id);
        if (!await rnConfirm(`حذف «${p.title}» نهائيًا؟ سيتوقف رابطه عند العميل.`)) return;
        await S.ref().update({ ['proposals/' + id]: null, ['offer/' + p.token]: null });
        list = list.filter(x => x.id !== id);
        render();
        badge();
    }
    function duplicate(id) {
        const p = byId(id);
        const seed = JSON.parse(JSON.stringify(p));
        ['id', 'token', 'number', 'status', 'sentAt', 'projectKey', 'projectCode', 'convertedAt', 'replySeen', 'invoiceId', 'agreement', 'revision', 'createdAt', 'updatedAt'].forEach(k => delete seed[k]);
        seed.title = p.title + ' (نسخة)';
        seed.validUntil = S.addDays(S.today(), 14);
        edit(null, seed);
    }

    // ── التحويل لمشروع + فاتورة الدفعة المقدّمة ──
    function convert(id) {
        const p = byId(id), c = S.calc(p);
        const start = p.startDate && p.startDate >= S.today() ? p.startDate : S.today();
        S.modal(`${S.mHead('rocket_launch', 'تحويل إلى مشروع', `«${p.title}» — ${p.clientName}`)}
            <div class="st-m-body">
                <div class="st-form">
                    <label class="st-f full"><span>اسم المشروع</span><input id="st-cv-name" class="form-input-modern font-bold" value="${E(p.title)}"></label>
                    <label class="st-f"><span>تاريخ البدء</span><input id="st-cv-start" type="date" class="form-input-modern" value="${start}" oninput="document.getElementById('st-cv-end').value = Studio.addDays(this.value, ${c.days || 14})"></label>
                    <label class="st-f"><span>موعد التسليم</span><input id="st-cv-end" type="date" class="form-input-modern" value="${S.addDays(start, c.days || 14)}"></label>
                </div>
                <div class="st-block">
                    <div class="st-sum">
                        <div><span>قيمة المشروع</span><b>${S.money(c.total)}</b></div>
                        <div><span>المراحل → خطوات المشروع</span><b class="st-num">${(p.phases || []).length}</b></div>
                        <div><span>المهام بمواعيدها</span><b class="st-num">${(p.tasks || []).length}</b></div>
                    </div>
                </div>
                ${c.depositAmount ? `<label class="st-check"><input id="st-cv-inv" type="checkbox" checked> إصدار فاتورة الدفعة المقدّمة: <b style="color:#fff">${S.moneyText(c.depositAmount)}</b></label>` : ''}
            </div>
            <div class="st-m-foot"><button class="st-btn primary" onclick="Studio.P.doConvert('${id}', this)">${ic('rocket_launch')} أنشئ المشروع</button>
                <button class="st-btn ghost" onclick="Studio.closeModal()">إلغاء</button></div>`, 'narrow');
    }

    async function doConvert(id, btn) {
        const p = byId(id), c = S.calc(p);
        const name = document.getElementById('st-cv-name').value.trim() || p.title;
        const start = document.getElementById('st-cv-start').value || S.today();
        const end = document.getElementById('st-cv-end').value || S.addDays(start, c.days || 14);
        const withInvoice = !!(document.getElementById('st-cv-inv') || {}).checked;
        await S.busy(btn, async () => {
            // العميل: المختار، أو المطابق بالاسم، وإلا يُنشأ عميل جديد برابط صفحته الخاصة
            let clientName = p.clientName, clientKey = p.clientKey;
            if (!clientKey) {
                const found = S.clients().find(x => x.name === clientName || x.company === clientName || (p.clientPhone && RNAN.intlPhone(x.phone) === RNAN.intlPhone(p.clientPhone)));
                if (found) { clientKey = found.rowIndex; clientName = S.clientName(found); }
                else clientKey = (await S.run('saveClientToSheet', { clientName, companyName: clientName, phone: p.clientPhone || '' })).rowIndex;
            }
            const res = await S.run('saveProjectToSheet', {
                name, client: clientName, status: 'قيد التنفيذ', deadline: end, value: c.total, progress: 0, startDate: start,
                steps: (p.phases || []).length ? p.phases.map(x => ({ text: x.name, done: false })) : [{ text: 'التنفيذ', done: false }, { text: 'التسليم النهائي', done: false }],
                notes: `من ${KIND[p.kind] || KIND.quote} رقم ${p.number}` + (p.intro ? '\n' + p.intro : '')
            });
            const key = res && res.rowIndex;
            if (key && (p.tasks || []).length) {
                await S.ref('projects/' + key + '/tasks').set(p.tasks.map(t => ({ title: t.title, due: S.addDays(start, Math.max((+t.day || 1) - 1, 0)), ms: !!t.ms, done: false })));
            }
            let invoiceId = '';
            if (withInvoice && c.depositAmount) {
                const inv = await S.run('saveInvoiceToSheet', {
                    invoiceNumber: 'تلقائي', clientSelect: clientName, totalAmount: c.depositAmount, issueDate: S.today(), status: 'قيد الانتظار',
                    items: [{ desc: `دفعة مقدّمة ${c.depositPct}% — ${name}`, qty: 1, price: c.depositAmount }],
                    notes: `حسب ${KIND[p.kind] || KIND.quote} رقم ${p.number}. المتبقي ${S.moneyText(c.remaining)} عند التسليم.`,
                    footerText: typeof DEFAULT_BANK_INFO !== 'undefined' ? DEFAULT_BANK_INFO : ''
                });
                invoiceId = (inv && inv.id) || '';
            }
            const upd = { status: 'project', projectKey: key || '', projectCode: (res && res.code) || '', convertedAt: new Date().toISOString(), clientKey: clientKey || '', clientName, updatedAt: new Date().toISOString() };
            if (invoiceId) upd.invoiceId = invoiceId;
            await S.ref('proposals/' + id).update(upd);
            Object.assign(p, upd);
            S.closeModal();
            S.refreshAll();
            render();
            badge();
            S.toast(`🚀 أُنشئ المشروع «${name}»${invoiceId ? ' وفاتورة ' + invoiceId : ''}`);
        }, 'جاري الإنشاء...');
    }

    // ── الاتفاقية الرسمية: صيغة الطرف الأول والثاني تُطبع PDF عند طلب العميل ──
    // بيانات رنان (الطرف الأول) تُحفظ مرة في settings/agreement، وبيانات العميل على العرض نفسه،
    // وتُنشر نسخة منهما في offer/<token>/agreement لتقرأها agreement.html.
    const agreementUrl = p => RNAN.pageUrl('agreement.html', { k: p.token });
    const P1_FIELDS = [
        ['name', 'الاسم النظامي *', ''], ['cr', 'السجل التجاري / وثيقة العمل الحر', 'اختياري'], ['vat', 'الرقم الضريبي', 'اختياري'],
        ['rep', 'اسم من يوقّع عن رنان', ''], ['repTitle', 'صفته', 'مثال: المالك'], ['city', 'المدينة / العنوان', ''],
        ['phone', 'الجوال', ''], ['email', 'البريد الإلكتروني', '']
    ];
    const LTR = /^(cr|vat|idNo|phone|email)$/;
    let ag = null;

    // الحساب البنكي: settings/bank، وإلا يُقرأ من نص تذييل الفواتير
    function bankOf(saved) {
        if (saved && saved.iban) return { bank: saved.bank || '', holder: saved.holder || '', iban: String(saved.iban).replace(/\s+/g, '').toUpperCase() };
        const out = {};
        String(typeof DEFAULT_BANK_INFO !== 'undefined' ? DEFAULT_BANK_INFO : '').split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
            let m;
            if ((m = line.match(/^البنك\s*:\s*(.+)$/))) out.bank = m[1];
            else if ((m = line.match(/(?:الآيبان|الايبان|IBAN)[^:]*:\s*(.+)$/i))) out.iban = m[1].replace(/\s+/g, '').toUpperCase();
            else if (!/:/.test(line) && !out.holder) out.holder = line;
        });
        return out.iban ? out : null;
    }

    async function agreement(id) {
        const p = byId(id);
        if (!p) return;
        const [saved, site, bankSaved] = await Promise.all([S.get('settings/agreement'), S.site(), S.get('settings/bank')]);
        const c = S.clients().find(x => String(x.rowIndex) === String(p.clientKey));
        const isOrg = !!(c && c.company && c.name && c.company !== c.name);
        const a = p.agreement || {}, r = offerOf(p).reply;
        ag = {
            id, bank: bankOf(bankSaved),
            p1: Object.assign({ name: 'رنان لخدمات التصميم', city: site.city || '', phone: site.phone || site.whatsapp || '', email: site.email || '' }, saved || {}),
            p2: Object.assign({ type: isOrg ? 'org' : 'person', name: isOrg ? c.company : (p.clientName || ''), rep: isOrg ? c.name : '', phone: p.clientPhone || (c && c.phone) || '' }, a.party2 || {})
        };
        const org = ag.p2.type === 'org';
        const inp = (key, val, ph) => `<input class="form-input-modern" data-ag="${key}" value="${E(val || '')}" placeholder="${E(ph || '')}"${LTR.test(key.split('.')[1]) ? ' dir="ltr"' : ''}>`;
        const date = a.date || (r && r.decision === 'approved' ? S.ymd(r.at) : S.today());

        const notes = agNotes(p);
        S.modal(`${S.mHead('contract', 'الاتفاقية الرسمية', `${p.number} · «${p.title}» — بصيغة الطرف الأول والثاني، تُطبع أو تُحفظ PDF`)}
            <div class="st-m-body">
                ${notes.length ? `<div class="st-block st-agreq">
                    <div class="st-block-h"><b>${ic('rate_review')} طلبات تعديل من العميل</b><span class="st-muted text-xs">ظلّلها في الاتفاقية وكتب ملاحظته</span></div>
                    ${notes.map(n => `<div class="st-agreq-i${n.status === 'done' ? ' done' : ''}">
                        ${n.clause ? `<small>${E(n.clause)}</small>` : ''}
                        <q>${E(n.quote)}</q>
                        <p>${E(n.note || '')}</p>
                        <div class="meta"><span>${E(n.name || 'العميل')} · ${S.fmtDate(n.at)} ${S.fmtTime(n.at)}</span>
                            ${n.status === 'done' ? `<span class="st-chip ok">${ic('check')} تم التعديل</span>` : `<button class="st-btn sm ghost" onclick="Studio.P.agNoteDone('${p.id}', '${E(n.id)}', this)">${ic('done_all')} تم التعديل</button>`}</div>
                    </div>`).join('')}
                </div>` : ''}
                <div class="st-block">
                    <div class="st-block-h"><b>${ic('person')} الطرف الثاني — العميل</b></div>
                    <div class="st-seg">
                        <button type="button" class="${org ? '' : 'on'}" onclick="Studio.P.agType('person', this)">${ic('person')} فرد</button>
                        <button type="button" class="${org ? 'on' : ''}" onclick="Studio.P.agType('org', this)">${ic('apartment')} منشأة / جهة</button>
                    </div>
                    <div class="st-form">
                        <label class="st-f full"><span id="st-ag-l-name">${org ? 'اسم المنشأة *' : 'الاسم الكامل *'}</span>${inp('p2.name', ag.p2.name)}</label>
                        <label class="st-f"><span id="st-ag-l-id">${org ? 'رقم السجل التجاري' : 'رقم الهوية / الإقامة'}</span>${inp('p2.idNo', ag.p2.idNo, 'فارغ = يُكتب باليد')}</label>
                        <label class="st-f"><span>المدينة / العنوان</span>${inp('p2.address', ag.p2.address, 'مثال: الرياض، حي النرجس')}</label>
                        <label class="st-f st-ag-org" style="${org ? '' : 'display:none'}"><span>اسم ممثّل المنشأة</span>${inp('p2.rep', ag.p2.rep)}</label>
                        <label class="st-f st-ag-org" style="${org ? '' : 'display:none'}"><span>صفته</span>${inp('p2.repTitle', ag.p2.repTitle, 'مثال: المدير العام')}</label>
                        <label class="st-f"><span>الجوال</span>${inp('p2.phone', ag.p2.phone, '05xxxxxxxx')}</label>
                        <label class="st-f"><span>البريد الإلكتروني <em>(اختياري)</em></span>${inp('p2.email', ag.p2.email)}</label>
                    </div>
                </div>
                <details class="st-explain" id="st-ag-p1" ${saved ? '' : 'open'}>
                    <summary>${ic('expand_more', 'chev')} الطرف الأول — بيانات رنان <span class="st-muted" style="font-weight:500;font-size:12px">(تُحفظ لكل الاتفاقيات)</span></summary>
                    <div class="st-form" style="padding:0 18px 18px">
                        ${P1_FIELDS.map(([k, l, ph]) => `<label class="st-f"><span>${l}</span>${inp('p1.' + k, ag.p1[k], ph)}</label>`).join('')}
                        ${ag.bank ? `<label class="st-check full"><input type="checkbox" id="st-ag-bank" ${saved && saved.showBank === false ? '' : 'checked'}> إظهار الحساب البنكي في بند الدفع: <span dir="ltr">${E(ag.bank.iban)}</span></label>` : ''}
                    </div>
                </details>
                <div class="st-form">
                    <label class="st-f"><span>تاريخ الاتفاقية</span><input type="date" id="st-ag-date" class="form-input-modern" value="${E(date)}"></label>
                    <label class="st-f full"><span>أحكام إضافية <em>(اختياري — سطر لكل بند)</em></span><textarea id="st-ag-extra" class="form-input-modern text-sm" rows="3" placeholder="مثال: يلتزم الطرف الأول بتسليم دليل استخدام الهوية بصيغة PDF.">${E(a.extra || '')}</textarea></label>
                </div>
                <p class="st-muted text-xs" style="margin:0;line-height:1.9">البنود الأساسية — النطاق والمدة والدفعات والالتزامات والملكية الفكرية والسرية والإنهاء — تُبنى تلقائيًا من العرض وشروطه، ومبلغه يُكتب بالأرقام والحروف. الحقل الفارغ يظهر في الاتفاقية خطًا منقّطًا للتعبئة باليد.</p>
                <button type="button" class="st-agedit-btn" onclick="Studio.P.agSave('edit', this)">
                    <span class="st-ico mint">${ic('edit_document')}</span>
                    <span><b>تحرير نص البنود</b><small>${a.edits ? `عدّلت صياغة <span class="st-num">${Object.keys(a.edits).length}</span> ${Object.keys(a.edits).length > 1 ? 'بنود' : 'بند'} — افتح لمراجعتها أو تعديل غيرها` : 'افتح الاتفاقية وعدّل صياغة أي بند مباشرة في النص'}</small></span>
                    ${ic('chevron_left')}
                </button>
            </div>
            <div class="st-m-foot">
                <button class="st-btn primary" onclick="Studio.P.agSave('print', this)">${ic('print')} فتح وطباعة PDF</button>
                <button class="st-btn ghost" onclick="Studio.P.agSave('send', this)">${ic('send')} إرسالها للعميل</button>
                <button class="st-btn ghost icon" title="نسخ رابط الاتفاقية" onclick="Studio.P.agSave('copy', this)">${ic('link')}</button>
                <span class="grow" style="flex:1"></span>
                <button class="st-btn ghost" onclick="Studio.closeModal()">إلغاء</button>
            </div>`);
    }

    function agType(t, btn) {
        ag.p2.type = t;
        btn.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
        document.getElementById('st-ag-l-name').textContent = t === 'org' ? 'اسم المنشأة *' : 'الاسم الكامل *';
        document.getElementById('st-ag-l-id').textContent = t === 'org' ? 'رقم السجل التجاري' : 'رقم الهوية / الإقامة';
        document.querySelectorAll('#studioModal .st-ag-org').forEach(el => { el.style.display = t === 'org' ? '' : 'none'; });
    }

    async function agSave(mode, btn) {
        const p = byId(ag.id);
        const val = k => { const el = document.querySelector(`#studioModal [data-ag="${k}"]`); return el ? el.value.trim() : ''; };
        const p2 = { type: ag.p2.type };
        ['name', 'idNo', 'address', 'rep', 'repTitle', 'phone', 'email'].forEach(k => { const v = val('p2.' + k); if (v) p2[k] = v; });
        if (p2.type !== 'org') { delete p2.rep; delete p2.repTitle; }
        const p1 = {};
        P1_FIELDS.forEach(([k]) => { const v = val('p1.' + k); if (v) p1[k] = v; });
        if (!p2.name) { S.toast('اكتب اسم العميل (الطرف الثاني)'); document.querySelector('#studioModal [data-ag="p2.name"]').focus(); return; }
        if (!p1.name) { document.getElementById('st-ag-p1').open = true; S.toast('اكتب الاسم النظامي للطرف الأول'); document.querySelector('#studioModal [data-ag="p1.name"]').focus(); return; }
        const showBank = !!(document.getElementById('st-ag-bank') || {}).checked;
        const date = document.getElementById('st-ag-date').value || S.today();
        const extra = document.getElementById('st-ag-extra').value.trim();
        // تُفتح النافذة قبل الحفظ كي لا يحجبها المتصفح بعد انتظار قاعدة البيانات
        const win = mode === 'copy' || mode === 'edit' ? null : window.open('', '_blank');
        let done = false;
        await S.busy(btn, async () => {
            const now = new Date().toISOString();
            const edits = (p.agreement && p.agreement.edits) || null;
            const upd = { agreement: { party2: p2, date, extra, edits, updatedAt: now }, updatedAt: now };
            if (mode === 'send' && p.status === 'draft') { upd.status = 'sent'; upd.sentAt = now; }
            await S.ref('settings/agreement').set(Object.assign({}, p1, { showBank }));
            await S.ref('proposals/' + p.id).update(upd);
            Object.assign(p, upd);
            await publish(p);
            await S.ref('offer/' + p.token + '/agreement').set({ party1: Object.assign({}, p1, showBank && ag.bank ? { bank: ag.bank } : {}), party2: p2, date, extra, edits, updatedAt: now });
            done = true;
        }, mode === 'edit' ? 'جاري الفتح...' : 'جاري التجهيز...');
        if (!done) { if (win) win.close(); return; }
        if (mode === 'edit') return agEditor(p);
        S.closeModal();
        render();
        const url = agreementUrl(p);
        const go = href => { if (win) win.location.href = href; else window.open(href, '_blank'); };
        if (mode === 'print') {
            go(url + '&print=1');
            S.toast('فُتحت الاتفاقية — اختر «حفظ بتنسيق PDF» من نافذة الطباعة');
        } else if (mode === 'send') {
            const msg = `السلام عليكم ${p2.rep || p2.name} 👋\nتفضّل نسخة اتفاقية العمل الرسمية لـ«${p.title}» من رنان لخدمات التصميم، بصيغة الطرف الأول والثاني.\nتقدر تطبعها أو تحفظها PDF من هنا:\n${url}`;
            const phone = RNAN.intlPhone(p2.phone || p.clientPhone || '');
            go(phone.length >= 9 ? RNAN.waLink(phone, msg) : 'https://wa.me/?text=' + encodeURIComponent(msg));
            S.toast('حُفظت الاتفاقية وفُتح واتساب لإرسالها ✓');
        } else {
            if (typeof copyText === 'function') copyText(url); else navigator.clipboard.writeText(url);
            S.toast('حُفظت الاتفاقية ونُسخ رابطها ✓');
        }
    }

    // ── تحرير نص البنود: الاتفاقية نفسها في إطار بوضع التحرير، والحفظ من هنا (للوحة صلاحية الكتابة) ──
    function agEditor(p) {
        S.modal(`${S.mHead('edit_document', 'تحرير نص الاتفاقية', `${p.number} · انقر على أي فقرة أو بند وعدّل صياغته مباشرة`)}
            <div class="st-agedit"><iframe id="st-ag-frame" src="${E(agreementUrl(p))}&edit=1" title="تحرير نص الاتفاقية"></iframe></div>
            <div class="st-m-foot">
                <button class="st-btn primary" onclick="Studio.P.agEditSave('${p.id}', this)">${ic('save')} حفظ التعديلات</button>
                <span class="st-muted text-xs st-agedit-hint">جداول البنود والمراحل تُبنى من العرض نفسه ولا تُحرَّر هنا.</span>
                <span class="grow" style="flex:1"></span>
                <button class="st-btn ghost" onclick="Studio.P.agreement('${p.id}')">رجوع</button>
            </div>`, 'wide');
    }

    async function agEditSave(id, btn) {
        const p = byId(id);
        const f = document.getElementById('st-ag-frame');
        const A = f && f.contentWindow && f.contentWindow.AgreementPage;
        if (!p || !A || !A.ready) { S.toast('انتظر حتى تكتمل الاتفاقية ثم احفظ'); return; }
        const edits = A.collect();
        const val = Object.keys(edits).length ? edits : null;
        let done = false;
        await S.busy(btn, async () => {
            await S.ref('proposals/' + p.id + '/agreement/edits').set(val);
            await S.ref('offer/' + p.token + '/agreement/edits').set(val);
            p.agreement = Object.assign({}, p.agreement);
            if (val) p.agreement.edits = val; else delete p.agreement.edits;
            done = true;
        }, 'جاري الحفظ...');
        if (!done) return;
        S.toast(val ? `حُفظت صياغة الاتفاقية (${Object.keys(val).length} ${Object.keys(val).length > 1 ? 'بنود معدّلة' : 'بند معدّل'}) ✓` : 'الاتفاقية بنصّها الأصلي ✓');
        agreement(id);
    }

    async function agNoteDone(id, nid, btn) {
        const p = byId(id);
        if (!p) return;
        const at = new Date().toISOString();
        let done = false;
        await S.busy(btn, async () => {
            await S.ref('offer/' + p.token + '/agreementNotes/' + nid).update({ status: 'done', doneAt: at });
            const o = offerOf(p);
            if (o.agreementNotes && o.agreementNotes[nid]) Object.assign(o.agreementNotes[nid], { status: 'done', doneAt: at });
            done = true;
        }, '...');
        if (!done) return;
        render();
        badge();
        agreement(id);
    }

    S.register('proposals', { open, boot: async () => { await load(); badge(); } });
    S.P = {
        edit, save, send, copy, preview, extend, archive, restore, remove, duplicate, convert, doConvert, agreement, agType, agSave, agEditSave, agNoteDone,
        tab: k => { tab = k; render(); }, kind: setKind, client: setClient, tpl: applyTemplate,
        // يُستدعى من صفحة القوالب لبدء عرض من قالب لعميل محدّد
        fromTemplate: (t, clientKey, startDate) => {
            const c = S.clients().find(x => String(x.rowIndex) === String(clientKey));
            switchPage('proposals');
            edit(null, { title: t.name, intro: t.desc || '', items: t.items, phases: t.phases, tasks: t.tasks, deposit: t.deposit != null ? t.deposit : 50,
                templateId: t.id, clientKey: clientKey || '', clientName: S.clientName(c), clientPhone: (c && c.phone) || '', startDate: startDate || '' });
        }
    };
})();
