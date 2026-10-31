/**
 * الاشتراكات والأدوات: كل اشتراكات المصمم في مكان واحد، تذكير قبل التجديد، تسجيله كمصروف بضغطة
 * (فيتقدّم موعد التجديد تلقائيًا)، وتكلفة الأدوات شهريًا وسنويًا وحسب الفئة.
 * subscriptions/<id> · expenses/<id>
 */
(function () {
    const S = window.Studio, E = S.esc, ic = S.ic, D = window.StudioData;
    let subs = [], expenses = [], loaded = false, reminded = false;

    const sar = s => (+s.amount || 0) * (s.currency === 'USD' ? D.USD_RATE : 1);
    const monthly = s => s.cycle === 'yearly' ? sar(s) / 12 : sar(s);
    const left = s => S.diffDays(S.today(), s.next);
    const cat = s => D.SUB_CATEGORIES[s.category] || D.SUB_CATEGORIES['أخرى'];
    const advance = (date, cycle) => { const d = S.parseYmd(date); if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1); return S.ymd(d); };

    async function load() {
        const [s, e] = await Promise.all([S.get('subscriptions'), S.get('expenses')]);
        subs = S.toList(s);
        expenses = S.toList(e).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        loaded = true;
    }

    // تجديدات خلال مهلة التذكير (أو متأخرة)
    const dueSoon = () => subs.filter(s => s.active !== false && s.next && left(s) <= (+s.remind || 3));
    function badge() {
        const el = document.getElementById('subs-nav-badge');
        if (!el) return;
        const n = dueSoon().length;
        el.textContent = n;
        el.classList.toggle('show', n > 0);
    }
    async function boot() {
        await load();
        badge();
        if (reminded) return;
        reminded = true;
        const due = dueSoon().sort((a, b) => left(a) - left(b));
        if (due.length) {
            const s = due[0], d = left(s);
            S.toast(`🔔 تجديد ${s.name} ${d < 0 ? 'متأخر ' + S.days(-d) : d === 0 ? 'اليوم' : d === 1 ? 'غدًا' : 'بعد ' + S.days(d)} —${S.moneyText(sar(s))}${due.length > 1 ? ` (+${due.length - 1} اشتراك آخر)` : ''}`);
        }
    }

    function stats() {
        const act = subs.filter(s => s.active !== false);
        const m = act.reduce((t, s) => t + monthly(s), 0);
        const week = act.filter(s => s.next && left(s) <= 7);
        const month = S.today().slice(0, 7);
        const spent = expenses.filter(x => String(x.date || '').startsWith(month)).reduce((t, x) => t + (+x.amount || 0), 0);
        const card = (icon, color, lbl, val, sub) => `<div class="st-stat"><span class="st-ico ${color}">${ic(icon)}</span><span class="lbl">${lbl}</span><span class="val">${val}</span><span class="sub">${sub}</span></div>`;
        return `<div class="st-stats">
            ${card('calendar_month', 'mint', 'تكلفة الأدوات شهريًا', S.money(m), `${act.length} اشتراك فعّال`)}
            ${card('event_repeat', 'violet', 'سنويًا', S.money(m * 12), 'الشهري والسنوي معًا')}
            ${card('notifications_active', week.length ? 'amber' : 'gray', 'مستحقة خلال 7 أيام', `<span class="st-num">${week.length}</span>`, week.length ? S.moneyText(week.reduce((t, s) => t + sar(s), 0)) + ' مستحقة' : 'لا تجديدات قريبة')}
            ${card('payments', 'blue', 'مصروفات هذا الشهر', S.money(spent), `${expenses.filter(x => String(x.date || '').startsWith(month)).length} عملية مسجّلة`)}
        </div>`;
    }

    function row(s) {
        const c = cat(s), d = s.next ? left(s) : null, paused = s.active === false;
        const due = !paused && d !== null && d <= (+s.remind || 3);
        const when = d === null ? '—' : d < 0 ? `<span class="st-badge red">متأخر ${S.days(-d, true)}</span>` : d === 0 ? `<span class="st-badge amber">اليوم</span>`
            : `<span class="st-badge ${d <= 7 ? 'amber' : 'gray'}">بعد ${S.days(d, true)}</span>`;
        return `<div class="st-sub ${paused ? 'paused' : ''} ${due ? (d < 0 ? 'late' : 'due') : ''}">
            <span class="st-ico ${c.color}">${ic(c.icon)}</span>
            <div style="min-width:0"><b>${E(s.name)}</b><small>${E(s.category || 'أخرى')}${s.note ? ' · ' + E(s.note) : ''}${paused ? ' · متوقف' : ''}</small></div>
            <div class="c3"><b>${S.money(s.amount, s.currency)}</b><small>${s.cycle === 'yearly' ? 'سنويًا' : 'شهريًا'}${s.currency === 'USD' ? ' · ≈ ' + S.moneyText(sar(s)) : ''}</small></div>
            <div class="c4"><b style="font-size:13px">${s.next ? S.fmtDate(s.next) : '—'}</b><small>${paused ? 'لا تذكير' : when}</small></div>
            <div class="c5 st-actions">
                ${paused ? '' : `<button class="st-btn xs ${due ? 'primary' : 'soft'}" onclick="Studio.Sub.pay('${s.id}', this)" title="يُسجَّل كمصروف ويتقدّم موعد التجديد">${ic('task_alt')} سُدِّد</button>`}
                <div class="st-more"><button class="st-btn xs icon ghost" onclick="Studio.toggleMore(this)">${ic('more_horiz')}</button>
                    <div class="st-menu">
                        <button onclick="Studio.Sub.edit('${s.id}')">${ic('edit')} تعديل</button>
                        <button onclick="Studio.Sub.pause('${s.id}')">${ic(paused ? 'play_arrow' : 'pause')} ${paused ? 'استئناف' : 'إيقاف مؤقت'}</button>
                        <button class="danger" onclick="Studio.Sub.remove('${s.id}')">${ic('delete')} حذف</button>
                    </div></div>
            </div>
        </div>`;
    }

    function render() {
        const el = S.page('subs');
        if (!el) return;
        const act = subs.filter(s => s.active !== false);
        const sorted = subs.slice().sort((a, b) => ((a.active === false) - (b.active === false)) || String(a.next || '9').localeCompare(String(b.next || '9')));
        const byCat = {};
        act.forEach(s => { const k = s.category || 'أخرى'; byCat[k] = (byCat[k] || 0) + monthly(s); });
        const totalM = Object.values(byCat).reduce((a, b) => a + b, 0) || 1;
        const month = S.today().slice(0, 7);
        const monthExp = expenses.filter(x => String(x.date || '').startsWith(month));
        el.innerHTML = `
            <div class="st-head">
                <div><h1>الاشتراكات والأدوات</h1><p>كل أدواتك واشتراكاتك في مكان واحد: نذكّرك قبل كل تجديد، تؤكّده بضغطة فيُسجَّل في مصاريفك، وتعرف كم تكلّفك الأدوات شهريًا وسنويًا.</p></div>
                <div class="st-head-actions">
                    <button class="st-btn ghost" onclick="Studio.Sub.expense()">${ic('receipt')} مصروف يدوي</button>
                    <button class="st-btn primary" onclick="Studio.Sub.edit()">${ic('add')} إضافة اشتراك</button>
                </div>
            </div>
            ${subs.length ? stats() : ''}
            ${subs.length ? `<div class="st-two">
                <div class="st-card"><h2 class="st-sec-title" style="margin:0 0 14px">اشتراكاتك <span class="st-count st-num">${subs.length}</span></h2><div class="st-subs">${sorted.map(row).join('')}</div></div>
                <div style="display:flex;flex-direction:column;gap:18px">
                    <div class="st-card"><h2 class="st-sec-title" style="margin:0 0 14px">أين تذهب تكلفة الأدوات؟</h2>
                        <div class="st-catbars">${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div><span>${E(k)}</span><span class="st-bar"><i style="width:${Math.max(v / totalM * 100, 3)}%"></i></span><b class="st-num" style="color:#fff">${S.num(Math.round(v))}</b></div>`).join('') || '<p class="st-muted text-sm">لا اشتراكات فعّالة.</p>'}</div>
                        <p class="st-muted text-xs" style="margin:12px 0 0">بالريال شهريًا · الدولار يُحسب بـ ${D.USD_RATE}</p></div>
                    <div class="st-card"><h2 class="st-sec-title" style="margin:0 0 6px">مصروفات ${S.fmtDate(S.today(), { month: 'long' })} <span class="st-count st-num">${monthExp.length}</span></h2>
                        <div class="st-ledger">${monthExp.length ? monthExp.map(x => `<div><span><b>${E(x.title)}</b><br><small class="st-muted">${S.fmtDate(x.date)} · ${E(x.category || '')}</small></span>
                            <span style="display:flex;align-items:center;gap:6px"><b>${S.money(x.amount)}</b><button class="st-btn xs icon ghost" title="حذف" onclick="Studio.Sub.delExpense('${x.id}')">${ic('close')}</button></span></div>`).join('')
                            : '<p class="st-muted text-sm" style="margin:8px 0 0">لا مصروفات مسجّلة هذا الشهر.</p>'}</div></div>
                </div>
            </div>` : `<div class="st-card"><div class="st-empty">
                <h3>تدفع اشتراكات أدوات شهريًا أو سنويًا؟</h3>
                <ol><li><b>أضف الاشتراك:</b> السعر، شهري أو سنوي، وموعد التجديد.</li><li><b>نذكّرك قبل التجديد،</b> وبضغطة يُسجَّل في مصاريفك ويتقدّم الموعد تلقائيًا.</li><li><b>تعرف كم تكلّفك الأدوات</b> شهريًا وسنويًا، وحسب الفئة.</li></ol>
                <div class="st-chips" style="justify-content:center;margin-bottom:16px">${D.SUB_PRESETS.slice(0, 6).map((p, i) => `<button type="button" class="st-chip" onclick="Studio.Sub.edit(null, ${i})">${ic('add')} ${E(p.name)}</button>`).join('')}</div>
                <button class="st-btn primary" onclick="Studio.Sub.edit()">${ic('add')} أضف أول اشتراك</button></div></div>`}`;
    }

    async function open() {
        const el = S.page('subs');
        if (el && !loaded) el.innerHTML = `<div class="st-empty"><p class="st-muted">جاري التحميل...</p></div>`;
        await load();
        render();
        badge();
    }

    // ── المحرّر ──
    let form = null;
    function edit(id, presetIdx) {
        const s = id ? subs.find(x => x.id === id) : null;
        const p = presetIdx != null ? D.SUB_PRESETS[presetIdx] : null;
        form = Object.assign({ name: '', category: 'تصميم', amount: '', currency: 'USD', cycle: 'monthly', next: S.addDays(S.today(), 30), remind: 3, note: '', active: true }, p || {}, s || {});
        if (p && !s) form.next = form.cycle === 'yearly' ? advance(S.today(), 'yearly') : advance(S.today(), 'monthly');
        const seg = (key, opts) => `<div class="st-seg">${opts.map(([v, t]) => `<button type="button" class="${form[key] === v ? 'on' : ''}" onclick="Studio.Sub.set('${key}', '${v}', this)">${t}</button>`).join('')}</div>`;
        S.modal(`${S.mHead('credit_card', s ? 'تعديل الاشتراك' : 'إضافة اشتراك', 'عدّل السعر حسب فاتورتك الفعلية؛ نذكّرك قبل موعد التجديد.')}
            <div class="st-m-body">
                ${s ? '' : `<div class="st-f"><span>تعبئة سريعة</span><div class="st-chips">${D.SUB_PRESETS.map((x, i) => `<button type="button" class="st-chip ${p === x ? 'ok' : ''}" onclick="Studio.Sub.edit(null, ${i})">${E(x.name)}</button>`).join('')}</div></div>`}
                <div class="st-form">
                    <label class="st-f"><span>اسم الأداة / الاشتراك *</span><input id="st-s-name" class="form-input-modern font-bold" value="${E(form.name)}" oninput="Studio.Sub.set('name', this.value)"></label>
                    <label class="st-f"><span>الفئة</span><select class="form-input-modern" onchange="Studio.Sub.set('category', this.value)">${Object.keys(D.SUB_CATEGORIES).map(k => `<option ${form.category === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
                    <label class="st-f"><span>المبلغ *</span><input id="st-s-amount" type="text" inputmode="decimal" min="0" step="any" dir="ltr" class="form-input-modern" value="${E(form.amount)}" oninput="Studio.Sub.set('amount', this.value)"></label>
                    <div class="st-f"><span>العملة</span>${seg('currency', [['SAR', 'ريال'], ['USD', 'دولار']])}</div>
                    <div class="st-f"><span>دورة الدفع</span>${seg('cycle', [['monthly', 'شهري'], ['yearly', 'سنوي']])}</div>
                    <label class="st-f"><span>موعد التجديد القادم</span><input type="date" class="form-input-modern" value="${E(form.next)}" oninput="Studio.Sub.set('next', this.value)"></label>
                    <label class="st-f"><span>ذكّرني قبلها بـ (أيام)</span><input type="text" inputmode="decimal" min="0" max="30" dir="ltr" class="form-input-modern" value="${+form.remind}" oninput="Studio.Sub.set('remind', this.value)"></label>
                    <label class="st-f"><span>ملاحظة <em>(اختياري)</em></span><input class="form-input-modern" placeholder="مثال: الحساب على بريد العمل" value="${E(form.note)}" oninput="Studio.Sub.set('note', this.value)"></label>
                </div>
            </div>
            <div class="st-m-foot"><button class="st-btn primary" onclick="Studio.Sub.save(this)">${ic('save')} حفظ</button><button class="st-btn ghost" onclick="Studio.closeModal()">إلغاء</button></div>`, 'narrow');
        form._id = s ? s.id : null;
    }
    function set(key, v, btn) {
        form[key] = v;
        if (btn) btn.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
    }
    async function save(btn) {
        const name = (form.name || '').trim();
        if (!name) { S.toast('اكتب اسم الاشتراك'); document.getElementById('st-s-name').focus(); return; }
        if (!(S.toNum(form.amount) > 0)) { S.toast('اكتب المبلغ'); document.getElementById('st-s-amount').focus(); return; }
        await S.busy(btn, async () => {
            const rec = { name, category: form.category || 'أخرى', amount: S.toNum(form.amount), currency: form.currency === 'USD' ? 'USD' : 'SAR', cycle: form.cycle === 'yearly' ? 'yearly' : 'monthly',
                next: form.next || S.today(), remind: Math.max(0, S.toNum(form.remind)), note: (form.note || '').trim(), active: form.active !== false,
                createdAt: form.createdAt || new Date().toISOString() };
            await S.ref('subscriptions/' + (form._id || S.newId())).set(rec);
            S.closeModal();
            await load();
            render();
            badge();
            S.toast('حُفظ الاشتراك ✓');
        });
    }

    // سُدّد: مصروف بالريال + تقديم موعد التجديد دورة كاملة
    async function pay(id, btn) {
        const s = subs.find(x => x.id === id);
        await S.busy(btn, async () => {
            const next = advance(s.next || S.today(), s.cycle);
            const u = {};
            u['expenses/' + S.newId()] = { title: s.name, amount: Math.round(sar(s) * 100) / 100, original: +s.amount, currency: s.currency, date: S.today(), category: 'اشتراكات · ' + (s.category || 'أخرى'), subId: id, createdAt: new Date().toISOString() };
            u['subscriptions/' + id + '/next'] = next;
            u['subscriptions/' + id + '/lastPaid'] = S.today();
            await S.ref().update(u);
            await load();
            render();
            badge();
            S.toast(`سُجّل ${S.moneyText(sar(s))} كمصروف — التجديد القادم ${S.fmtDate(next)} ✓`);
        }, '...');
    }
    async function pause(id) {
        const s = subs.find(x => x.id === id);
        await S.ref('subscriptions/' + id + '/active').set(s.active === false);
        await load(); render(); badge();
    }
    async function remove(id) {
        const s = subs.find(x => x.id === id);
        if (!confirm(`حذف اشتراك «${s.name}»؟ المصروفات المسجّلة سابقًا تبقى.`)) return;
        await S.ref('subscriptions/' + id).remove();
        await load(); render(); badge();
    }

    function expense() {
        S.modal(`${S.mHead('receipt', 'مصروف يدوي', 'أي مصروف للعمل: طباعة، معدات، إعلانات، صور مدفوعة...')}
            <div class="st-m-body"><div class="st-form">
                <label class="st-f full"><span>البيان *</span><input id="st-x-title" class="form-input-modern font-bold"></label>
                <label class="st-f"><span>المبلغ (ر.س) *</span><input id="st-x-amount" type="text" inputmode="decimal" min="0" step="any" dir="ltr" class="form-input-modern"></label>
                <label class="st-f"><span>التاريخ</span><input id="st-x-date" type="date" class="form-input-modern" value="${S.today()}"></label>
                <label class="st-f full"><span>الفئة</span><select id="st-x-cat" class="form-input-modern">${['معدات وأجهزة', 'طباعة', 'إعلانات', 'موارد وصور', 'تعليم ودورات', 'أخرى'].map(k => `<option>${k}</option>`).join('')}</select></label>
            </div></div>
            <div class="st-m-foot"><button class="st-btn primary" onclick="Studio.Sub.saveExpense(this)">${ic('save')} تسجيل</button><button class="st-btn ghost" onclick="Studio.closeModal()">إلغاء</button></div>`, 'narrow');
    }
    async function saveExpense(btn) {
        const title = document.getElementById('st-x-title').value.trim(), amount = S.toNum(document.getElementById('st-x-amount').value);
        if (!title || !(amount > 0)) { S.toast('اكتب البيان والمبلغ'); return; }
        await S.busy(btn, async () => {
            await S.ref('expenses/' + S.newId()).set({ title, amount, date: document.getElementById('st-x-date').value || S.today(), category: document.getElementById('st-x-cat').value, createdAt: new Date().toISOString() });
            S.closeModal();
            await load(); render();
            S.toast('سُجّل المصروف ✓');
        });
    }
    async function delExpense(id) {
        if (!confirm('حذف هذا المصروف؟')) return;
        await S.ref('expenses/' + id).remove();
        await load(); render();
    }

    S.register('subs', { open, boot });
    S.Sub = { edit, set, save, pay, pause, remove, expense, saveExpense, delExpense };
})();
