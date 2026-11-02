/**
 * قوالب العروض: احفظ طريقة عملك مرة واحدة (مراحل، مهام بمواعيدها، بنود تسعير، دفعة مقدّمة)،
 * ثم أنشئ منها عرض سعر لعميل أو مشروعًا جاهزًا بمهامه ومواعيده بضغطة.
 * المكتبة الجاهزة في StudioData.LIBRARY · قوالبك في templates/<id>.
 */
(function () {
    const S = window.Studio, E = S.esc, ic = S.ic;
    let mine = [], loaded = false, libOpen = null;
    const opened = new Set();

    async function load() {
        mine = S.toList(await S.get('templates')).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
        loaded = true;
    }
    const find = id => mine.find(t => t.id === id) || StudioData.LIBRARY.find(t => t.id === id);
    const meta = t => {
        const c = S.calc(t);
        return { price: c.subtotal, days: c.days, phases: (t.phases || []).length, tasks: (t.tasks || []).length };
    };

    function body(t) {
        const tasks = (t.tasks || []).slice().sort((a, b) => (+a.day || 0) - (+b.day || 0));
        return `<div class="st-tpl-body ${opened.has(t.id) ? 'open' : ''}">
            <ol class="st-phases">${(t.phases || []).map(p => `<li><span>${E(p.name)}</span><em>(<span class="st-num">${+p.days || 0}</span> ${+p.days === 1 ? 'يوم' : 'أيام'})</em></li>`).join('')}</ol>
            ${tasks.length ? `<ul class="st-tasks">${tasks.map(x => `<li class="${x.ms ? 'ms' : ''}"><span>${E(x.title)}</span><em>اليوم <span class="st-num">${+x.day || 0}</span></em></li>`).join('')}</ul>` : ''}
            ${(t.items || []).length ? `<ul class="st-tasks">${t.items.map(i => `<li><span>${E(i.desc)}${+i.qty > 1 ? ` × <span class="st-num">${+i.qty}</span>` : ''}</span><em>${S.money((+i.qty || 0) * (+i.price || 0))}</em></li>`).join('')}</ul>` : ''}
        </div>`;
    }

    function card(t, isLib) {
        const m = meta(t);
        const added = isLib && mine.some(x => x.sourceId === t.id);
        return `<article class="st-card st-tpl">
            <div class="st-tpl-head"><span class="st-ico ${t.color || 'mint'}">${ic(t.icon || 'description')}</span>
                <div style="min-width:0"><h3>${E(t.name)}</h3><p>${E(t.desc || '')}</p></div></div>
            <div class="st-chips">
                <span class="st-chip">${S.plural(m.phases, 'مرحلة', 'مراحل')}</span>
                <span class="st-chip">${S.plural(m.tasks, 'مهمة', 'مهام')}</span>
                <span class="st-chip">${S.days(m.days, true)}</span>
                ${+t.deposit ? `<span class="st-chip">مقدّم <span class="st-num">${+t.deposit}%</span></span>` : ''}
            </div>
            <div class="st-price">${S.money(m.price)} <small>سعر مبدئي</small></div>
            <button type="button" class="st-toggle ${opened.has(t.id) ? 'open' : ''}" onclick="Studio.T.toggle('${t.id}', this)">${ic('expand_more')} عرض المحتوى</button>
            ${body(t)}
            <div class="st-actions">
                <button class="st-btn sm primary" onclick="Studio.T.use('${t.id}')">${ic('bolt')} استخدم القالب</button>
                ${isLib
                    ? (added ? `<button class="st-btn sm soft" disabled>${ic('check')} في قوالبي</button>` : `<button class="st-btn sm ghost" onclick="Studio.T.adopt('${t.id}', this)">${ic('bookmark_add')} أضفه لقوالبي</button>`)
                    : `<span class="grow"></span>
                       <button class="st-btn sm icon ghost" title="تعديل" onclick="Studio.T.edit('${t.id}')">${ic('edit')}</button>
                       <button class="st-btn sm icon ghost" title="تكرار" onclick="Studio.T.duplicate('${t.id}')">${ic('content_copy')}</button>
                       <button class="st-btn sm icon danger" title="حذف" onclick="Studio.T.remove('${t.id}')">${ic('delete')}</button>`}
            </div>
        </article>`;
    }

    function render() {
        const el = S.page('templates');
        if (!el) return;
        if (libOpen === null) libOpen = mine.length < 2;
        el.innerHTML = `
            <div class="st-head">
                <div><h1>قوالب العروض</h1><p>احفظ طريقة عملك مرة واحدة: نطاق ومراحل ومهام ومواعيد وشروط دفع. بعدها أنشئ عرض سعر للعميل أو مشروعًا جاهزًا بمهامه ومواعيده بضغطة.</p></div>
                <div class="st-head-actions"><button class="st-btn primary" onclick="Studio.T.edit()">${ic('add')} قالب جديد</button></div>
            </div>
            <div class="st-steps3">
                <div><b><em>١.</em> اختر قالبًا</b><p>من المكتبة الجاهزة لخدمات رنان، أو احفظ قالبك الخاص وعدّله كما تشاء.</p></div>
                <div><b><em>٢.</em> حدّد العميل والبداية</b><p>اختر العميل وتاريخ البدء؛ مواعيد المهام والتسليم تُحسب تلقائيًا.</p></div>
                <div><b><em>٣.</em> عرض أو مشروع جاهز</b><p>عرض سعر يوافق عليه العميل برابط، أو مشروع بمراحله ومهامه مباشرة.</p></div>
            </div>
            ${mine.length ? `<h2 class="st-sec-title">قوالبي <span class="st-count st-num">${mine.length}</span></h2>
            <div class="st-grid">${mine.map(t => card(t, false)).join('')}</div>` : ''}
            <details class="st-explain" ${libOpen ? 'open' : ''} ontoggle="Studio.T.lib(this.open)">
                <summary>${ic('expand_more', 'chev')} مكتبة قوالب جاهزة <span class="st-count st-num" style="font-size:12px;padding:0 8px;border-radius:999px;background:rgba(255,255,255,.08)">${StudioData.LIBRARY.length}</span>
                    <span class="st-muted" style="font-weight:500;font-size:12.5px">ابدأ من قالب لخدمة شائعة وعدّله كما تشاء</span></summary>
                <div style="padding:0 16px 16px"><div class="st-grid">${StudioData.LIBRARY.map(t => card(t, true)).join('')}</div></div>
            </details>`;
    }

    async function open() {
        const el = S.page('templates');
        if (el && !loaded) el.innerHTML = `<div class="st-empty"><p class="st-muted">جاري التحميل...</p></div>`;
        await load();
        render();
    }

    function toggle(id, btn) {
        if (opened.has(id)) opened.delete(id); else opened.add(id);
        btn.classList.toggle('open');
        btn.nextElementSibling.classList.toggle('open');
    }

    function clean(t) {
        return {
            name: (t.name || '').trim(), desc: (t.desc || '').trim(), icon: t.icon || 'description', color: t.color || 'mint', deposit: +t.deposit || 0,
            phases: (t.phases || []).filter(x => (x.name || '').trim()).map(x => ({ name: x.name.trim(), days: +x.days || 0 })),
            tasks: (t.tasks || []).filter(x => (x.title || '').trim()).map(x => ({ title: x.title.trim(), day: +x.day || 0, ms: !!x.ms })),
            items: (t.items || []).filter(x => (x.desc || '').trim() || +x.price).map(x => ({ desc: (x.desc || '').trim(), qty: +x.qty || 0, price: +x.price || 0 }))
        };
    }

    async function adopt(id, btn) {
        const t = StudioData.LIBRARY.find(x => x.id === id);
        await S.busy(btn, async () => {
            const rec = Object.assign(clean(t), { sourceId: t.id, createdAt: new Date().toISOString() });
            const key = S.newId();
            await S.ref('templates/' + key).set(rec);
            mine.push(Object.assign({ id: key }, rec));
            render();
            S.toast(`أُضيف «${t.name}» إلى قوالبك — عدّله كما تشاء ✓`);
        }, 'جاري الإضافة...');
    }

    const ICONS = ['palette', 'draw', 'campaign', 'grid_view', 'movie', 'print', 'menu_book', 'language', 'phone_iphone', 'photo_camera', 'storefront', 'description'];
    function edit(id, seed) {
        const t = id ? mine.find(x => x.id === id) : null;
        const ed = S.edStart(JSON.parse(JSON.stringify(t || seed || { name: '', desc: '', icon: 'description', color: 'mint', deposit: 50, phases: [{ name: '', days: 3 }], tasks: [], items: [{ desc: '', qty: 1, price: 0 }] })), () => {
            const el = document.getElementById('st-t-price');
            if (el) el.innerHTML = S.money(S.calc(S.edState()).subtotal);
        });
        S.modal(`${S.mHead('library_books', t ? 'تعديل القالب' : 'قالب جديد', 'المهام تُجدول من يوم بداية المشروع: «اليوم 5» يعني بعد البداية بخمسة أيام.')}
            <div class="st-m-body">
                <div class="st-form">
                    <label class="st-f"><span>اسم القالب *</span><input id="st-t-name" class="form-input-modern font-bold" value="${E(ed.name)}" oninput="Studio.edField('name', this.value)"></label>
                    <label class="st-f"><span>الدفعة المقدّمة %</span><input type="text" inputmode="decimal" min="0" max="100" dir="ltr" class="form-input-modern" value="${+ed.deposit || 0}" oninput="Studio.edField('deposit', this.value, true)"></label>
                    <label class="st-f full"><span>وصف مختصر</span><input class="form-input-modern" value="${E(ed.desc)}" oninput="Studio.edField('desc', this.value)"></label>
                    <div class="st-f full"><span>الأيقونة</span><div class="st-chips" id="st-t-icons">${ICONS.map(n => `<button type="button" class="st-chip ${ed.icon === n ? 'ok' : ''}" onclick="Studio.T.icon('${n}', this)">${ic(n)}</button>`).join('')}</div></div>
                </div>
                ${S.block('phases', '<div class="st-gantt" id="st-gantt"></div>')}
                ${S.block('tasks')}
                ${S.block('items', '<div class="st-sum"><div class="total"><span>السعر المبدئي</span><b id="st-t-price"></b></div></div>')}
            </div>
            <div class="st-m-foot"><button class="st-btn primary" onclick="Studio.T.save(this)">${ic('save')} حفظ القالب</button>
                <button class="st-btn ghost" onclick="Studio.closeModal()">إلغاء</button></div>`);
        ed._id = t ? t.id : null;
        S.renderLines();
        document.getElementById('st-t-price').innerHTML = S.money(S.calc(ed).subtotal);
    }

    function setIcon(n, btn) {
        S.edField('icon', n);
        document.querySelectorAll('#st-t-icons .st-chip').forEach(b => b.classList.toggle('ok', b === btn));
    }

    async function save(btn) {
        const ed = S.edState();
        const rec = clean(ed);
        if (!rec.name) { S.toast('اكتب اسم القالب'); document.getElementById('st-t-name').focus(); return; }
        await S.busy(btn, async () => {
            const old = ed._id ? mine.find(x => x.id === ed._id) : null;
            rec.createdAt = (old && old.createdAt) || new Date().toISOString();
            if (old && old.sourceId) rec.sourceId = old.sourceId;
            const key = ed._id || S.newId();
            await S.ref('templates/' + key).set(rec);
            S.closeModal();
            await load();
            render();
            S.toast('حُفظ القالب ✓');
        });
    }

    function duplicate(id) {
        const t = JSON.parse(JSON.stringify(mine.find(x => x.id === id)));
        delete t.id; delete t.sourceId;
        t.name += ' (نسخة)';
        edit(null, t);
    }

    async function remove(id) {
        const t = mine.find(x => x.id === id);
        if (!await rnConfirm(`حذف القالب «${t.name}»؟ العروض والمشاريع التي أُنشئت منه لا تتأثر.`)) return;
        await S.ref('templates/' + id).remove();
        mine = mine.filter(x => x.id !== id);
        render();
    }

    // اختيار العميل والبداية ثم: عرض سعر أو مشروع مباشر
    function use(id) {
        const t = find(id), m = meta(t);
        S.modal(`${S.mHead('bolt', 'استخدام القالب', t.name)}
            <div class="st-m-body">
                <div class="st-form">
                    <label class="st-f full"><span>العميل</span><select id="st-u-client" class="form-input-modern"><option value="">— اختر عميلًا —</option>${S.clientOptions('')}</select></label>
                    <label class="st-f"><span>تاريخ البدء</span><input id="st-u-start" type="date" class="form-input-modern" value="${S.today()}"></label>
                    <label class="st-f"><span>السعر</span><input id="st-u-price" type="text" inputmode="decimal" min="0" dir="ltr" class="form-input-modern" value="${m.price}"></label>
                </div>
                <p class="st-muted text-xs" style="margin:0">التسليم المتوقّع بعد <b style="color:#fff">${S.days(m.days, true)}</b> من البدء، مع ${S.plural(m.tasks, 'مهمة مجدولة', 'مهام مجدولة')}.</p>
                <div class="st-pick">
                    <button type="button" onclick="Studio.T.go('${t.id}', 'proposal')">${ic('request_quote')}<span>أنشئ عرض سعر<small>يوافق عليه العميل برابط</small></span></button>
                    <button type="button" onclick="Studio.T.go('${t.id}', 'project', this)">${ic('rocket_launch')}<span>أنشئ مشروعًا مباشرة<small>بمراحله ومهامه ومواعيده</small></span></button>
                </div>
            </div>`, 'narrow');
    }

    async function go(id, target, btn) {
        const t = JSON.parse(JSON.stringify(find(id)));
        const clientKey = document.getElementById('st-u-client').value;
        const start = document.getElementById('st-u-start').value || S.today();
        const price = S.toNum(document.getElementById('st-u-price').value);
        const base = S.calc(t).subtotal;
        // سعر مختلف عن مجموع البنود: تُوزّع النسبة على البنود حتى يبقى العرض متّسقًا
        if (price && base && Math.abs(price - base) > 0.01) t.items = t.items.map(i => Object.assign(i, { price: Math.round(i.price * price / base * 100) / 100 }));
        if (target === 'proposal') { S.closeModal(); S.P.fromTemplate(t, clientKey, start); return; }
        if (!clientKey) { S.toast('اختر العميل لإنشاء المشروع'); document.getElementById('st-u-client').focus(); return; }
        const c = S.clients().find(x => String(x.rowIndex) === String(clientKey));
        const days = S.calc(t).days || 14;
        await S.busy(btn, async () => {
            const res = await S.run('saveProjectToSheet', {
                name: t.name + ' — ' + S.clientName(c), client: S.clientName(c), status: 'قيد التنفيذ', deadline: S.addDays(start, days),
                value: price || base, progress: 0, startDate: start, notes: 'من قالب: ' + t.name,
                steps: (t.phases || []).map(x => ({ text: x.name, done: false }))
            });
            if (res && res.rowIndex && (t.tasks || []).length) {
                await S.ref('projects/' + res.rowIndex + '/tasks').set(t.tasks.map(x => ({ title: x.title, due: S.addDays(start, Math.max((+x.day || 1) - 1, 0)), ms: !!x.ms, done: false })));
            }
            S.closeModal();
            S.refreshAll();
            S.toast(`🚀 أُنشئ مشروع «${t.name}» لـ${S.clientName(c)} — التسليم ${S.fmtDate(S.addDays(start, days))}`);
        }, 'جاري الإنشاء...');
    }

    S.register('templates', { open, boot: load });
    S.T = { toggle, adopt, edit, save, duplicate, remove, use, go, icon: setIcon, lib: v => { libOpen = v; } };
    S.modules.templates.mine = () => mine;
    S.modules.templates.find = find;
})();
