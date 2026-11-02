/**
 * قائمة الأسعار: أسعار خدمات رنان في مكان واحد (settings/price_list) — تُعرض وتُعدَّل هنا، وتظهر في نافذة الفاتورة ومحرّر العروض والقوالب،
 * ومنها «عرض سعر سريع»: كميات ← فاتورة أو عرض سعر أو ورقة مطبوعة بهوية رنان أو رسالة واتساب.
 * الوحدات: item (ريال) · page (ريال للورقة) · minute (ريال للدقيقة). القائمة الافتراضية من عرض أسعار رنان المعتمد.
 */
(function () {
    const S = window.Studio, E = S.esc, ic = S.ic;
    const UNITS = {
        item: { t: 'ريال', q: 'الكمية', n: 'تصميم' },
        page: { t: 'ريال للورقة', q: 'عدد الصفحات', n: 'ورقة' },
        minute: { t: 'ريال للدقيقة', q: 'عدد الدقائق', n: 'دقيقة' }
    };
    const CATS = [
        { k: 'print', t: 'المطبوعات والإعلانات', ic: 'campaign', hue: 14 },
        { k: 'reports', t: 'التقارير', ic: 'auto_stories', hue: 220 },
        { k: 'brand', t: 'الشعارات والهويات', ic: 'draw', hue: 160 },
        { k: 'media', t: 'السوشيال والفيديو', ic: 'movie', hue: 290 }
    ];
    // ترتيب القائمة كما في عرض الأسعار؛ التقارير لها شريحتان حسب عدد الصفحات (max/min + alt للتبديل التلقائي المقترح)
    const DEFAULT = [
        { id: 'brochure', name: 'تصميم البروشورات والمنشورات', price: 50, unit: 'item', cat: 'print' },
        { id: 'rollup', name: 'تصميم بنرات الرول أب', price: 60, unit: 'item', cat: 'print' },
        { id: 'banner', name: 'تصميم بنرات (3 متر فما فوق)', price: 70, unit: 'item', cat: 'print' },
        { id: 'bags', name: 'تصميم الأكياس الورقية', price: 100, unit: 'item', cat: 'print' },
        { id: 'rep-s', name: 'تصميم التقارير (16 ورقة وأقل)', price: 20, unit: 'page', cat: 'reports', max: 16, alt: 'rep-l' },
        { id: 'rep-l', name: 'تصميم التقارير (16 ورقة وأكثر)', price: 15, unit: 'page', cat: 'reports', min: 16, alt: 'rep-s' },
        { id: 'cards', name: 'تصميم الكروت الشخصية', price: 40, unit: 'item', cat: 'print' },
        { id: 'snap', name: 'تصميم فلاتر سناب مع الرفع', price: 150, unit: 'item', cat: 'media' },
        { id: 'logo', name: 'تصميم الشعارات', price: 250, unit: 'item', cat: 'brand' },
        { id: 'identity', name: 'تصميم الهويات التجارية', price: 700, unit: 'item', cat: 'brand' },
        { id: 'repo-s', name: 'تصميم التقارير (مفتوح 16 ورقة وأقل)', price: 40, unit: 'page', cat: 'reports', max: 16, alt: 'repo-l' },
        { id: 'repo-l', name: 'تصميم التقارير (مفتوح 16 ورقة وأكثر)', price: 30, unit: 'page', cat: 'reports', min: 16, alt: 'repo-s' },
        { id: 'motion', name: 'فيديو موشن جرافيك (سعر الدقيقة)', price: 200, unit: 'minute', cat: 'media' },
        { id: 'montage', name: 'مونتاج فيديو (سعر الدقيقة)', price: 150, unit: 'minute', cat: 'media' }
    ];
    const NOTES = ['عرض السعر خاص بالشخص أو الشركة المرسل لها.', 'الأسعار خاصة بالتصاميم، وفي حال الرغبة بالتصميم مفتوحًا يتم الاتفاق على سعر آخر.'];
    const clone = o => JSON.parse(JSON.stringify(o));
    const n2 = v => (Math.round((+v || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const DIGITS = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9, '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9 };
    const latin = v => String(v == null ? '' : v).replace(/[٠-٩۰-۹]/g, d => DIGITS[d]).replace(/[٬,،]/g, '').replace(/٫/g, '.').replace(/[^\d.\-]/g, '');
    const toN = v => parseFloat(latin(v)) || 0;
    const svcN = n => n === 1 ? 'خدمة واحدة' : n === 2 ? 'خدمتان' : S.plural(n, 'خدمة', 'خدمات');
    const unitOf = u => UNITS[u] || UNITS.item;

    // ── البيانات ──
    let D = { items: clone(DEFAULT), notes: NOTES.slice(), validity: 30, saved: false }, loaded = false, loading = null;
    const norm = x => ({ id: x.id || S.newId(), name: String(x.name || '').trim(), price: +x.price || 0, unit: UNITS[x.unit] ? x.unit : 'item', cat: CATS.some(c => c.k === x.cat) ? x.cat : 'print',
        ...(x.max ? { max: +x.max } : {}), ...(x.min ? { min: +x.min } : {}), ...(x.alt ? { alt: x.alt } : {}) });
    function load(force) {
        if (loading) return loading;
        if (loaded && !force) return Promise.resolve();
        loading = S.get('settings/price_list').then(v => {
            if (v && Array.isArray(v.items) && v.items.length) D = { items: v.items.filter(Boolean).map(norm), notes: Array.isArray(v.notes) ? v.notes.filter(Boolean) : NOTES.slice(), validity: +v.validity || 30, saved: true, updatedAt: v.updatedAt };
        }).catch(() => null).then(() => { loaded = true; loading = null; });
        return loading;
    }
    const items = () => D.items;
    const find = id => D.items.find(x => x.id === id);
    const byName = name => { const k = String(name || '').trim(); return k ? D.items.find(x => x.name === k) : null; };
    const validity = () => D.validity || 30;
    const validityNote = () => `عرض السعر له مدة محددة وهي ${S.days(validity())} من تاريخ الاستلام.`;
    const notes = () => [...D.notes, validityNote()];
    // شروط العرض الافتراضية في محرّر العروض: الشروط العامة + ملاحظات قائمة الأسعار (مدة الصلاحية يحدّدها حقل «صالح حتى»)
    const terms = () => [StudioData.TERMS, ...D.notes.filter(n => !StudioData.TERMS.includes(n))].join('\n');
    const priceLabel = x => `<span class="st-num">${n2(x.price)}</span> ${unitOf(x.unit).t}`;
    const priceText = x => `${n2(x.price)} ${unitOf(x.unit).t}`;

    // ── عرض السعر السريع ──
    const cart = new Map();
    let clientKey = '', editing = null;
    const lines = () => [...cart.entries()].map(([id, q]) => ({ it: find(id), q })).filter(l => l.it && l.q > 0);
    const total = () => lines().reduce((s, l) => s + l.q * l.it.price, 0);
    const client = () => S.clients().find(c => String(c.rowIndex) === String(clientKey)) || null;
    function tierHint(l) {
        const { it, q } = l, alt = it.alt && find(it.alt);
        if (!alt) return '';
        if ((it.max && q > it.max) || (it.min && q < it.min)) {
            const save = (it.price - alt.price) * q;
            return `<p class="pl-hint">${ic('lightbulb')} ${it.max ? `أكثر من <span class="st-num">${it.max}</span> ورقة` : `أقل من <span class="st-num">${it.min}</span> ورقة`} — سعر «${E(alt.name)}» ${priceLabel(alt)}
                <button type="button" class="st-btn xs soft" data-pl="swap" data-id="${E(it.id)}">${save > 0 ? `طبّقه ووفّر ${S.money(save)}` : 'طبّق السعر'}</button></p>`;
        }
        return '';
    }

    // ── الصفحة ──
    function card(x) {
        const q = cart.get(x.id) || 0, u = unitOf(x.unit);
        return `<article class="pl-card${q ? ' on' : ''}" data-id="${E(x.id)}">
            <div class="pl-card-t"><b>${E(x.name)}</b><small>${ic(x.unit === 'page' ? 'description' : x.unit === 'minute' ? 'timer' : 'palette')} ${x.unit === 'item' ? 'سعر التصميم' : 'السعر لكل ' + u.n}</small></div>
            <div class="pl-price"><b class="st-num">${n2(x.price)}</b><em>${u.t}</em></div>
            <div class="pl-step">${q ? `<button type="button" data-pl="dec" aria-label="إنقاص">${ic('remove')}</button>
                <input class="st-num" inputmode="decimal" dir="ltr" value="${q}" data-pl="qty" aria-label="${u.q}">
                <button type="button" data-pl="inc" aria-label="زيادة">${ic('add')}</button>` : `<button type="button" class="pl-add" data-pl="inc">${ic('add_shopping_cart')} أضف للعرض</button>`}</div>
        </article>`;
    }
    function viewHtml() {
        return CATS.map(c => {
            const list = D.items.filter(x => x.cat === c.k);
            if (!list.length) return '';
            return `<section class="pl-cat" style="--h:${c.hue}"><header><span class="pl-cat-ic">${ic(c.ic)}</span><h2>${c.t}</h2><em>${svcN(list.length)}</em></header>
                <div class="pl-grid">${list.map(card).join('')}</div></section>`;
        }).join('') + `<section class="pl-notes"><h3>${ic('gavel')} شروط عرض السعر</h3><ul>${notes().map(n => `<li>${E(n)}</li>`).join('')}</ul></section>`;
    }
    function cartHtml() {
        const L = lines(), c = client();
        return `<div class="pl-cart-h"><b>${ic('request_quote')} عرض سعر سريع</b>${L.length ? `<button type="button" class="st-btn xs ghost" data-pl="clear">${ic('delete_sweep')} تفريغ</button>` : ''}</div>
            <label class="st-f"><span>العميل <em>(اختياري)</em></span><select id="pl-client" class="form-input-modern"><option value="">— بدون عميل —</option>${S.clientOptions(clientKey)}</select></label>
            ${L.length ? `<ul class="pl-lines">${L.map(l => `<li><div><b>${E(l.it.name)}</b><small><span class="st-num">${n2(l.q)}</span> ${unitOf(l.it.unit).n} × ${priceLabel(l.it)}</small>${tierHint(l)}</div>
                    <span class="pl-line-t">${S.money(l.q * l.it.price)}</span></li>`).join('')}</ul>
                <div class="pl-total"><span>الإجمالي</span><b>${S.money(total())}</b></div>
                <p class="pl-valid">${ic('event_available')} صالح حتى ${S.fmtDate(S.addDays(S.today(), validity()))}</p>
                <div class="pl-cart-acts">
                    <button type="button" class="st-btn primary" data-pl="invoice">${ic('receipt_long')} إنشاء فاتورة</button>
                    <button type="button" class="st-btn soft" data-pl="quote">${ic('request_quote')} عرض سعر للموافقة</button>
                    <div class="pl-two"><button type="button" class="st-btn ghost sm" data-pl="print">${ic('print')} طباعة</button>
                    <button type="button" class="st-btn ghost sm wa" data-pl="share">${ic('chat')} واتساب</button></div>
                </div>`
            : `<div class="pl-cart-empty">${ic('touch_app')}<p>اضغط <b>«أضف للعرض»</b> على الخدمات، وحدّد الكميات، ثم حوّلها بضغطة إلى فاتورة أو عرض سعر أو ورقة مطبوعة بهويتك.</p></div>`}`;
    }
    function editHtml() {
        const opt = (o, v) => Object.entries(o).map(([k, t]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${t}</option>`).join('');
        const units = { item: 'ريال', page: 'للورقة', minute: 'للدقيقة' }, cats = Object.fromEntries(CATS.map(c => [c.k, c.t]));
        return `<section class="pl-edit">
            <div class="pl-edit-tools">
                <div class="pl-bulk"><span>${ic('trending_up')} تعديل كل الأسعار بنسبة</span><input class="form-input-modern st-num" id="pl-pct" inputmode="decimal" dir="ltr" placeholder="10">
                    <em>%</em><button type="button" class="st-btn sm soft" data-pl="bulk">تطبيق</button><small>تُقرَّب الأسعار لأرقام مرتّبة · استخدم رقمًا سالبًا للتخفيض</small></div>
                <button type="button" class="st-btn sm ghost" data-pl="reset">${ic('restart_alt')} استعادة القائمة الأصلية</button>
            </div>
            <div class="pl-erows"><div class="pl-erow head"><span>الخدمة</span><span>السعر</span><span>الوحدة</span><span>القسم</span><span></span></div>
                ${editing.items.map((x, i) => `<div class="pl-erow" data-i="${i}">
                    <input class="form-input-modern" data-f="name" value="${E(x.name)}" placeholder="اسم الخدمة">
                    <input class="form-input-modern st-num" data-f="price" inputmode="decimal" dir="ltr" value="${E(x.price)}">
                    <select class="form-input-modern" data-f="unit">${opt(units, x.unit)}</select>
                    <select class="form-input-modern" data-f="cat">${opt(cats, x.cat)}</select>
                    <button type="button" class="st-btn icon sm ghost" data-pl="erow-del" title="حذف">${ic('close')}</button></div>`).join('')}
            </div>
            <button type="button" class="st-btn sm soft" data-pl="erow-add">${ic('add')} خدمة جديدة</button>
            <div class="st-form" style="margin-top:14px">
                <label class="st-f full"><span>شروط عرض السعر <em>(سطر لكل شرط)</em></span><textarea class="form-input-modern text-sm" rows="3" id="pl-notes">${E(editing.notes.join('\n'))}</textarea></label>
                <label class="st-f"><span>مدة صلاحية العرض <em>(بالأيام)</em></span><input class="form-input-modern st-num" id="pl-validity" inputmode="numeric" dir="ltr" value="${editing.validity}"></label>
            </div>
            <p class="pl-err" id="pl-err" hidden></p>
            <div class="pl-edit-acts"><button type="button" class="st-btn primary" data-pl="save">${ic('save')} حفظ الأسعار</button><button type="button" class="st-btn ghost" data-pl="cancel">إلغاء</button></div>
        </section>`;
    }
    function render() {
        const el = S.page('prices');
        if (!el) return;
        const prices = D.items.map(x => x.price).filter(Boolean);
        el.innerHTML = `
            <div class="st-head">
                <div><h1>قائمة الأسعار</h1><p>أسعار خدماتك في مكان واحد: تظهر لك عند إنشاء الفاتورة وعرض السعر، ومنها تجهّز عرضًا سريعًا لعميلك وتطبعه بهويتك.</p></div>
                <div class="st-head-actions">${editing ? '' : `
                    <button class="st-btn ghost" data-pl="share">${ic('chat')} مشاركة القائمة</button>
                    <button class="st-btn ghost" data-pl="print-all">${ic('print')} طباعة / PDF</button>
                    <button class="st-btn primary" data-pl="edit">${ic('edit')} تعديل الأسعار</button>`}</div>
            </div>
            <div class="pl-stats">
                <div><span>${ic('sell')}</span><small>الخدمات</small><b class="st-num">${D.items.length}</b></div>
                <div><span>${ic('south')}</span><small>يبدأ من</small><b>${prices.length ? S.money(Math.min(...prices)) : '—'}</b></div>
                <div><span>${ic('workspace_premium')}</span><small>أعلى خدمة</small><b>${prices.length ? S.money(Math.max(...prices)) : '—'}</b></div>
                <div><span>${ic('event_available')}</span><small>صلاحية العرض</small><b>${S.days(validity(), true)}</b></div>
            </div>
            ${editing ? editHtml() : `<div class="pl-layout"><div class="pl-main">${viewHtml()}</div><aside class="pl-cart" id="pl-cart">${cartHtml()}</aside></div>`}
            ${D.saved || editing ? '' : `<p class="st-muted text-xs" style="margin:0">${ic('info')} هذه أسعارك من عرض الأسعار المعتمد — أي تعديل تحفظه يصبح القائمة المستخدمة في الفواتير والعروض.</p>`}`;
    }
    const renderCart = () => { const el = document.getElementById('pl-cart'); if (el) el.innerHTML = cartHtml(); };
    function renderCard(id) {
        const el = document.querySelector(`#prices-page .pl-card[data-id="${CSS.escape(id)}"]`), x = find(id);
        if (el && x) el.outerHTML = card(x);
    }
    async function open() {
        const el = S.page('prices');
        if (el && !loaded) el.innerHTML = `<div class="st-empty"><p class="st-muted">جاري التحميل...</p></div>`;
        await load();
        render();
    }

    // ── الإجراءات ──
    function setQty(id, q) {
        q = Math.max(0, Math.round(toN(q) * 100) / 100);
        if (q) cart.set(id, q); else cart.delete(id);
        renderCard(id);
        renderCart();
    }
    function seedLines() {
        const L = lines();
        return L.length ? L.map(l => ({ desc: l.it.name, qty: l.q, price: l.it.price })) : null;
    }
    function toInvoice() {
        const rows = seedLines(), c = client();
        if (!rows) return;
        openInvoiceModal('new');
        if (c) { const sel = document.getElementById('edit-client-select'); sel.value = c.company || c.name; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        document.getElementById('edit-items-container').innerHTML = '';
        rows.forEach(r => addItemRow(r));
        calculateTotals();
        S.toast('🧾 جُهّزت الفاتورة من قائمة الأسعار — راجعها ثم «حفظ وإصدار»');
    }
    function toQuote() {
        const rows = seedLines(), c = client();
        if (!rows) return;
        switchPage('proposals');
        S.P.edit(null, { title: rows.length === 1 ? rows[0].desc : 'عرض سعر لخدمات التصميم', items: rows, clientKey: c ? c.rowIndex : '', clientName: S.clientName(c), clientPhone: (c && c.phone) || '',
            validUntil: S.addDays(S.today(), validity()), terms: terms() });
    }
    function shareText() {
        const L = lines(), c = client(), until = S.fmtDate(S.addDays(S.today(), validity()), { day: 'numeric', month: 'long', year: 'numeric' });
        const head = `عرض سعر لخدمات التصميم — رنان 🎨${c ? `\nمقدَّم إلى: ${S.clientName(c)}` : ''}\n`;
        const body = L.length
            ? L.map(l => `• ${l.it.name}: ${n2(l.q)} ${unitOf(l.it.unit).n} × ${priceText(l.it)} = ${n2(l.q * l.it.price)} ريال`).join('\n') + `\n\n💰 الإجمالي: ${n2(total())} ريال`
            : CATS.map(cat => { const list = D.items.filter(x => x.cat === cat.k); return list.length ? `▪️ ${cat.t}\n` + list.map(x => `• ${x.name} — ${priceText(x)}`).join('\n') : ''; }).filter(Boolean).join('\n\n');
        return `${head}\n${body}\n\n📌 ملاحظات:\n${D.notes.map(n => '- ' + n).join('\n')}\n- العرض صالح حتى ${until}\n\nرنان لخدمات التصميم`;
    }
    function share() {
        const c = lines().length ? client() : null, msg = shareText();
        window.open(c && c.phone ? RNAN.waLink(c.phone, msg) : 'https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    }

    // ورقة مطبوعة بهوية رنان: القائمة كاملة، أو العرض السريع بكمياته ومجموعه
    let wrap = null;
    function print(all) {
        const L = all ? [] : lines(), c = all ? null : client(), until = S.addDays(S.today(), validity());
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'pl-wrap';
            wrap.hidden = true;
            wrap.innerHTML = `<div class="iv-st-bar no-print"><b>${ic('sell')} معاينة عرض السعر</b>
                <div><button type="button" class="st-btn primary sm" data-plw="print">${ic('print')} طباعة / PDF</button>
                <button type="button" class="st-btn ghost sm" data-plw="close" aria-label="إغلاق">${ic('close')}</button></div></div>
                <div class="iv-st-scroll"><div id="pl-doc"></div></div>`;
            document.body.appendChild(wrap);
            wrap.addEventListener('click', e => {
                const b = e.target.closest('[data-plw]');
                if (!b) return;
                if (b.dataset.plw === 'close') { wrap.hidden = true; document.documentElement.classList.remove('iv-lock'); return; }
                document.documentElement.classList.add('pl-print');
                window.addEventListener('afterprint', () => document.documentElement.classList.remove('pl-print'), { once: true });
                const who = wrap.dataset.who;
                if (typeof printWithFileName === 'function') printWithFileName('عرض سعر رنان' + (who ? ' - ' + who : '')); else window.print();
            });
        }
        wrap.dataset.who = c ? S.clientName(c) : '';
        const rows = L.length
            ? `<table class="sd-table"><thead><tr><th>#</th><th>الخدمة</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
                <tbody>${L.map((l, k) => `<tr><td class="st-num">${k + 1}</td><td>${E(l.it.name)}</td><td><span class="st-num">${n2(l.q)}</span> ${unitOf(l.it.unit).n}</td><td>${priceLabel(l.it)}</td><td class="st-num">${n2(l.q * l.it.price)}</td></tr>`).join('')}</tbody>
                <tfoot><tr><td colspan="4">الإجمالي</td><td><span class="st-num">${n2(total())}</span> ر.س</td></tr></tfoot></table>`
            : `<table class="sd-table pl-doc-list"><thead><tr><th>الخدمة</th><th>السعر</th></tr></thead>
                <tbody>${CATS.map(cat => { const list = D.items.filter(x => x.cat === cat.k); return list.length ? `<tr class="pl-doc-cat"><td colspan="2">${cat.t}</td></tr>` + list.map(x => `<tr><td>${E(x.name)}</td><td>${priceLabel(x)}</td></tr>`).join('') : ''; }).join('')}</tbody></table>`;
        wrap.querySelector('#pl-doc').innerHTML = `
            <header class="sd-head"><img src="images/ranan-logo.svg" alt="رنان لخدمات التصميم"><div><h1>عرض سعر</h1><p>DESIGN SERVICES QUOTATION</p></div></header>
            <div class="sd-meta">
                <div><small>مقدَّم إلى</small><b>${c ? E(S.clientName(c)) : 'لخدمات التصميم'}</b>${c && c.phone ? `<span class="st-num" dir="ltr">${E(c.phone)}</span>` : ''}</div>
                <div><small>تاريخ العرض</small><b>${S.fmtDate(S.today(), { day: 'numeric', month: 'long', year: 'numeric' })}</b></div>
                <div><small>صالح حتى</small><b>${S.fmtDate(until, { day: 'numeric', month: 'long', year: 'numeric' })}</b></div>
            </div>
            ${rows}
            <div class="sd-pay"><h4>ملاحظات</h4><ul class="pl-doc-notes">${notes().map(n => `<li>${E(n)}</li>`).join('')}</ul></div>
            <footer class="sd-foot"><b>شكرًا لثقتكم</b><span>رنان لخدمات التصميم · المملكة العربية السعودية</span></footer>`;
        wrap.hidden = false;
        document.documentElement.classList.add('iv-lock');
        wrap.querySelector('.iv-st-scroll').scrollTop = 0;
    }

    // ── التعديل ──
    function readEdit() {
        document.querySelectorAll('#prices-page .pl-erow[data-i]').forEach(r => {
            const x = editing.items[+r.dataset.i];
            if (!x) return;
            r.querySelectorAll('[data-f]').forEach(f => { x[f.dataset.f] = f.dataset.f === 'price' ? latin(f.value) : f.value; });
        });
        const nt = document.getElementById('pl-notes'), vd = document.getElementById('pl-validity');
        if (nt) editing.notes = nt.value.split('\n').map(s => s.trim()).filter(Boolean);
        if (vd) editing.validity = latin(vd.value);
    }
    async function save(btn) {
        readEdit();
        const err = document.getElementById('pl-err');
        const list = editing.items.filter(x => String(x.name).trim() || toN(x.price));
        const bad = list.find(x => !String(x.name).trim()) ? 'اكتب اسم كل خدمة' : list.find(x => !(toN(x.price) > 0)) ? `أدخل سعر «${E(list.find(x => !(toN(x.price) > 0)).name)}»` : !list.length ? 'أضف خدمة واحدة على الأقل' : !(toN(editing.validity) > 0) ? 'حدّد مدة صلاحية العرض بالأيام' : '';
        if (bad) { err.innerHTML = ic('error') + ' ' + bad; err.hidden = false; return; }
        const data = { items: list.map(x => norm(Object.assign({}, x, { price: toN(x.price) }))), notes: editing.notes, validity: Math.round(toN(editing.validity)), updatedAt: new Date().toISOString() };
        await S.busy(btn, async () => {
            await S.ref('settings/price_list').set(data);
            D = Object.assign({}, data, { saved: true });
            [...cart.keys()].forEach(id => { if (!find(id)) cart.delete(id); });
            editing = null;
            render();
            S.toast('✅ حُفظت قائمة الأسعار — تظهر الآن في الفواتير وعروض الأسعار');
        }, 'جاري الحفظ...');
    }

    // ── منتقي الخدمات في نافذة الفاتورة ومحرّر العروض ──
    function pickerHtml() {
        return CATS.map(c => {
            const list = D.items.filter(x => x.cat === c.k);
            return list.length ? `<div class="pl-pick-g"><small>${ic(c.ic)} ${c.t}</small>${list.map(x => `<button type="button" data-plpick="${E(x.id)}"><span>${E(x.name)}</span><em>${priceLabel(x)}</em></button>`).join('')}</div>` : '';
        }).join('');
    }
    function studioPick(id) {
        const x = find(id), ed = S.edState();
        if (!x || !ed) return;
        const row = { desc: x.name, qty: 1, price: x.price }, k = ed.items.findIndex(i => !(i.desc || '').trim() && !+i.price);
        if (k > -1) ed.items[k] = row; else ed.items.push(row);
        S.renderLines();
        S.edField('items', ed.items);
        if (x.unit !== 'item') S.toast(`${x.unit === 'page' ? '📄 السعر للورقة — اكتب عدد الصفحات' : '⏱️ السعر للدقيقة — اكتب عدد الدقائق'} في الكمية`);
    }
    function togglePicker(btn) {
        const box = btn.closest('.st-block').querySelector('.pl-pick');
        if (!box) return;
        box.hidden = !box.hidden;
        btn.classList.toggle('on', !box.hidden);
        if (!box.hidden) box.innerHTML = pickerHtml();
    }

    // ── الأحداث ──
    document.addEventListener('click', e => {
        const pick = e.target.closest('#studioModal [data-plpick]');
        if (pick) { studioPick(pick.dataset.plpick); return; }
        const b = e.target.closest('#prices-page [data-pl]');
        if (!b) return;
        const a = b.dataset.pl, cardEl = b.closest('.pl-card'), id = (cardEl && cardEl.dataset.id) || b.dataset.id;
        if (a === 'inc') setQty(id, (cart.get(id) || 0) + 1);
        else if (a === 'dec') setQty(id, (cart.get(id) || 0) - 1);
        else if (a === 'swap') { const x = find(id), q = cart.get(id); if (x && x.alt && find(x.alt)) { cart.delete(id); cart.set(x.alt, q); renderCard(id); renderCard(x.alt); renderCart(); } }
        else if (a === 'clear') { const ids = [...cart.keys()]; cart.clear(); ids.forEach(renderCard); renderCart(); }
        else if (a === 'invoice') toInvoice();
        else if (a === 'quote') toQuote();
        else if (a === 'print') print(false);
        else if (a === 'print-all') print(true);
        else if (a === 'share') share();
        else if (a === 'edit') { editing = clone({ items: D.items, notes: D.notes, validity: D.validity }); render(); }
        else if (a === 'cancel') { editing = null; render(); }
        else if (a === 'save') save(b);
        else if (a === 'erow-add') { readEdit(); editing.items.push({ id: S.newId(), name: '', price: '', unit: 'item', cat: 'print' }); render(); const r = document.querySelector('#prices-page .pl-erow:last-child input'); if (r) r.focus(); }
        else if (a === 'erow-del') { readEdit(); editing.items.splice(+b.closest('.pl-erow').dataset.i, 1); render(); }
        else if (a === 'reset') { editing = { items: clone(DEFAULT), notes: NOTES.slice(), validity: 30 }; render(); S.toast('↩️ استُعيدت القائمة الأصلية — احفظ لتعتمدها'); }
        else if (a === 'bulk') {
            readEdit();
            const p = toN((document.getElementById('pl-pct') || {}).value);
            if (!p) return;
            // تقريب يناسب حجم السعر: دون 50 لأقرب ريال، دون 500 لأقرب 5، وما فوقها لأقرب 10
            editing.items.forEach(x => { const v = toN(x.price) * (1 + p / 100), st = v < 50 ? 1 : v < 500 ? 5 : 10; x.price = Math.max(1, Math.round(v / st) * st); });
            render();
            S.toast(`${p > 0 ? '📈' : '📉'} عُدّلت الأسعار بنسبة ${p}% — راجعها ثم احفظ`);
        }
    });
    document.addEventListener('change', e => {
        if (e.target.id === 'pl-client') { clientKey = e.target.value; renderCart(); }
        else if (e.target.matches('#prices-page .pl-card [data-pl="qty"]')) setQty(e.target.closest('.pl-card').dataset.id, e.target.value);
    });
    document.addEventListener('input', e => {
        const t = e.target;
        if (t.matches && t.matches('#prices-page [inputmode="decimal"], #prices-page [inputmode="numeric"]') && t.value !== latin(t.value)) t.value = latin(t.value);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && wrap && !wrap.hidden) { wrap.hidden = true; document.documentElement.classList.remove('iv-lock'); }
        else if (e.key === 'Enter' && e.target.matches && e.target.matches('#prices-page .pl-card [data-pl="qty"]')) e.target.blur();
    });

    // ── طلب من الموقع ← عرض سعر: خدمات الطلب تُقابَل بخدمات القائمة، وبيانات العميل ونص الطلب تُنقل كما هي ──
    const FROM_SERVICE = { branding: ['identity'], social: ['brochure'], print: ['brochure'], presentation: ['rep-s'] };
    async function fromRequest(id) {
        const r = (typeof requestsData !== 'undefined' ? requestsData : []).find(x => String(x.id) === String(id));
        if (!r) return;
        await load();
        const ids = [...new Set((r.services || []).flatMap(s => FROM_SERVICE[s] || []))].filter(find);
        const items = ids.length ? ids.map(k => ({ desc: find(k).name, qty: 1, price: find(k).price })) : [{ desc: '', qty: 1, price: 0 }];
        const known = S.clients().find(c => (c.phone && r.phone && String(c.phone).replace(/\D/g, '').slice(-9) === String(r.phone).replace(/\D/g, '').slice(-9)) || S.clientName(c) === r.name);
        const title = 'عرض سعر — ' + ((window.RNAN && RNAN.serviceTitles ? RNAN.serviceTitles(r.services || []) : '') || 'خدمات التصميم');
        switchPage('proposals');
        S.P.edit(null, {
            title, intro: r.details || '', items, clientKey: known ? known.rowIndex : '', clientName: known ? S.clientName(known) : (r.name || ''), clientPhone: known ? (known.phone || '') : (r.phone || ''),
            validUntil: S.addDays(S.today(), validity()), terms: terms()
        });
        S.toast(ids.length ? '📋 جُهّز العرض من قائمة الأسعار حسب خدمات الطلب — راجع الكميات ثم أرسله' : '📋 جُهّز العرض ببيانات الطلب — أضف البنود من «من قائمة الأسعار»');
    }
    // زر «عرض سعر» في بطاقة كل طلب لم يُحوَّل بعد (تُرسم البطاقات في admin.html)
    const origRequests = window.renderRequestsPage;
    if (typeof origRequests === 'function') window.renderRequestsPage = function () {
        const r = origRequests.apply(this, arguments);
        document.querySelectorAll('#requests-page button[onclick^="openConvertModal("]').forEach(b => {
            if (b.nextElementSibling && b.nextElementSibling.matches('.rq-quote')) return;
            const m = /openConvertModal\('([^']+)'\)/.exec(b.getAttribute('onclick'));
            if (m) b.insertAdjacentHTML('afterend', `<button type="button" class="rq-quote" data-rq-quote="${E(m[1])}" title="عرض سعر من قائمة الأسعار">${ic('request_quote')} عرض سعر</button>`);
        });
        return r;
    };
    document.addEventListener('click', e => { const b = e.target.closest('[data-rq-quote]'); if (b) fromRequest(b.dataset.rqQuote); });

    S.register('prices', { open, boot: () => load() });
    window.PriceList = { load, items, find, byName, validity, notes, terms, priceLabel, priceText, unitOf, cats: CATS, pickerHtml, studioPick, togglePicker, DEFAULT };
})();
