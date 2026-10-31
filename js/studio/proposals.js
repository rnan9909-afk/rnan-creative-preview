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
        }
        badge();
    }
    function badge() {
        const el = document.getElementById('proposals-nav-badge');
        if (!el) return;
        const n = list.filter(p => ['changes', 'approved'].includes(stage(p))).length;
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
                <span class="grow"></span>
                <div class="st-more"><button class="st-btn sm ghost" onclick="Studio.toggleMore(this)">المزيد ${ic('expand_more')}</button>
                    <div class="st-menu">
                        <button onclick="Studio.P.edit('${p.id}')">${ic('edit')} تعديل</button>
                        <button onclick="Studio.P.preview('${p.id}')">${ic('visibility')} معاينة كما يراها العميل</button>
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

    function applyTemplate(id) {
        if (!id) return;
        const t = S.modules.templates.find(id);
        if (!t) return;
        const ed = S.edState();
        const hasContent = ed.items.some(i => i.desc || +i.price);
        if (hasContent && !confirm('سيُستبدل محتوى البنود والمراحل والمهام بمحتوى القالب. متابعة؟')) { document.getElementById('st-p-tpl').value = ''; return; }
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
            validUntil: S.addDays(S.today(), 14), startDate: '', terms: StudioData.TERMS
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
            if (old) ['sentAt', 'projectKey', 'projectCode', 'convertedAt', 'replySeen'].forEach(k => { if (old[k]) rec[k] = old[k]; });
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
        if (!confirm(`حذف «${p.title}» نهائيًا؟ سيتوقف رابطه عند العميل.`)) return;
        await S.ref().update({ ['proposals/' + id]: null, ['offer/' + p.token]: null });
        list = list.filter(x => x.id !== id);
        render();
        badge();
    }
    function duplicate(id) {
        const p = byId(id);
        const seed = JSON.parse(JSON.stringify(p));
        ['id', 'token', 'number', 'status', 'sentAt', 'projectKey', 'projectCode', 'convertedAt', 'replySeen', 'revision', 'createdAt', 'updatedAt'].forEach(k => delete seed[k]);
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

    S.register('proposals', { open, boot: async () => { await load(); badge(); } });
    S.P = {
        edit, save, send, copy, preview, extend, archive, restore, remove, duplicate, convert, doConvert,
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
