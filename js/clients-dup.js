// العملاء المكررون: الفواتير والمشاريع ترتبط بالعميل باسمه، فعميلان بالاسم نفسه تُحسب فواتيرهما مرتين، وتغيير الاسم يفصل العميل عن فواتيره.
// هنا: كشف المكرر (الاسم بعد التوحيد أو آخر 9 أرقام من الجوال) مع تنبيه في صفحة العملاء ونافذة دمج تنقل كل المراجع للعميل الأساسي،
// تحذير قبل إضافة عميل موجود، وتعديل الاسم يُنقل إلى الفواتير والمشاريع والعروض والفواتير المتكررة والإشعارات. الأنماط في css/polish.css.
(function () {
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => Math.round(v || 0).toLocaleString('en-US');
    const C = () => (typeof clientsData !== 'undefined' ? clientsData : []);
    const I = () => (typeof invoicesData !== 'undefined' ? invoicesData : []);
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    // توحيد الاسم: الهمزات والتاء المربوطة والتطويل والتشكيل والمسافات
    const norm = s => String(s || '').trim().replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').toLowerCase();
    const phone9 = s => String(s || '').replace(/\D/g, '').slice(-9);
    const names = c => [...new Set([c.company, c.name].filter(Boolean).map(x => String(x).trim()))];
    const label = c => c.company || c.name || 'عميل';
    const cnt = (n, one, many) => `${n} ${n >= 3 && n <= 10 ? many : one}`;
    const stats = c => {
        const n = names(c), inv = I().filter(i => n.includes(i.client)), prj = P().filter(p => n.includes(p.client));
        return { inv: inv.length, prj: prj.length, paid: inv.filter(i => i.status === 'مدفوعة').reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) };
    };

    function groups() {
        const list = C().filter(c => c && c.rowIndex), parent = list.map((_, i) => i);
        const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
        const join = (a, b) => { parent[find(a)] = find(b); };
        const byName = {}, byPhone = {};
        list.forEach((c, i) => {
            names(c).map(norm).filter(Boolean).forEach(k => { if (byName[k] != null) join(i, byName[k]); else byName[k] = i; });
            const ph = phone9(c.phone);
            if (ph.length === 9) { if (byPhone[ph] != null) join(i, byPhone[ph]); else byPhone[ph] = i; }
        });
        const out = {};
        list.forEach((c, i) => { (out[find(i)] = out[find(i)] || []).push(c); });
        return Object.values(out).filter(g => g.length > 1);
    }

    // ── تنبيه صفحة العملاء ──
    function banner() {
        const page = document.getElementById('clients-page');
        if (!page) return;
        const g = groups();
        let el = document.getElementById('cl-dups');
        if (!g.length) { if (el) el.remove(); return; }
        if (!el) {
            const head = page.firstElementChild;
            if (!head) return;
            head.insertAdjacentHTML('afterend', '<div id="cl-dups" class="cd-banner no-print"></div>');
            el = document.getElementById('cl-dups');
        }
        const n = g.reduce((s, x) => s + x.length, 0);
        el.innerHTML = `<span class="cd-ic">${ic('group_work')}</span><div><b>عندك ${n} عملاء مكررون في ${g.length === 1 ? 'مجموعة واحدة' : g.length + ' مجموعات'}</b>
            <small>${g.slice(0, 2).map(x => '«' + esc(label(x[0])) + '»').join('، ')} — فواتيرهم ومستحقاتهم قد تُحسب مرتين</small></div>
            <button type="button" class="cd-btn" data-cd="open">${ic('merge')} مراجعة ودمج</button>`;
    }

    // ── نافذة الدمج ──
    let wrap = null;
    function open() {
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'bk-wrap no-print';
            wrap.hidden = true;
            wrap.innerHTML = `<div class="bk-scrim" data-cd="close"></div><section class="bk-dlg cd-dlg" role="dialog" aria-modal="true" aria-labelledby="cd-t">
                <header><span class="bk-ic">${ic('merge')}</span><div><h3 id="cd-t">دمج العملاء المكررين</h3><p>اختر العميل الأساسي في كل مجموعة؛ تنتقل إليه الفواتير والمشاريع والعروض والنقاط</p></div>
                <button type="button" class="bk-x" data-cd="close" aria-label="إغلاق">${ic('close')}</button></header><div class="bk-body"></div></section>`;
            document.body.appendChild(wrap);
            wrap.addEventListener('click', e => {
                const b = e.target.closest('[data-cd]');
                if (!b || b.disabled) return;
                if (b.dataset.cd === 'close') close();
                else if (b.dataset.cd === 'merge') merge(+b.dataset.g, b);
            });
        }
        render();
        wrap.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
    }
    function close() { if (!wrap) return; wrap.classList.remove('open'); setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 260); }
    function render() {
        const g = groups();
        wrap.querySelector('.bk-body').innerHTML = g.length ? g.map((grp, k) => {
            const st = grp.map(stats), best = st.reduce((b, s, i) => (s.inv + s.prj > st[b].inv + st[b].prj ? i : b), 0);
            return `<section class="bk-card cd-group" data-g="${k}">
                <h4>${ic('group')} ${esc(label(grp[0]))} <em class="en-num">${grp.length}</em></h4>
                ${grp.map((c, i) => `<label class="cd-row"><input type="radio" name="cd-${k}" value="${esc(c.rowIndex)}" ${i === best ? 'checked' : ''}>
                    <span><b>${esc(label(c))}</b><small><span class="en-num" dir="ltr">${esc(c.phone || 'بلا جوال')}</span> · ${cnt(st[i].inv, 'فاتورة', 'فواتير')} · ${cnt(st[i].prj, 'مشروع', 'مشاريع')} · مدفوع ${num(st[i].paid)} ر.س${c.points ? ' · ' + num(c.points) + ' نقطة' : ''}</small></span></label>`).join('')}
                <p class="cd-note">${ic('info')} يُحذف الآخرون بعد نقل كل شيء، ويتوقف رابط صفحتهم الخاص ويُستخدم رابط العميل الأساسي.</p>
                <button type="button" class="bk-btn main" data-cd="merge" data-g="${k}">${ic('merge')} دمج في العميل المختار</button>
            </section>`;
        }).join('') : `<div class="bk-status ok">${ic('verified')}<div><b>لا يوجد عملاء مكررون</b><small>كل عميل مسجّل مرة واحدة</small></div></div>`;
    }
    async function merge(k, btn) {
        const grp = groups()[k];
        if (!grp) return render();
        const pick = wrap.querySelector(`input[name="cd-${k}"]:checked`);
        const main = grp.find(c => String(c.rowIndex) === String(pick && pick.value)) || grp[0];
        const dups = grp.filter(c => c !== main);
        if (!(await rnConfirm(`دمج ${dups.length === 1 ? 'العميل المكرر' : dups.length + ' عملاء مكررين'} في «${label(main)}»؟ تنتقل إليه كل الفواتير والمشاريع والعروض والنقاط، ثم يُحذف المكرر.`, { ok: 'نعم، ادمج', tone: 'ask' }))) return;
        btn.disabled = true;
        btn.innerHTML = '<span class="bk-spin"></span> جارٍ الدمج...';
        try {
            await window.db.ref().update(await mergeUpdates(main, dups));
            toast(`🔗 دُمج ${dups.length === 1 ? 'العميل' : dups.length + ' عملاء'} في «${label(main)}»`);
            if (typeof backendFunctions !== 'undefined' && backendFunctions.syncClientPortal) backendFunctions.syncClientPortal(main.rowIndex).catch(() => null);
            if (typeof loadAllData === 'function') loadAllData();
            setTimeout(() => { render(); banner(); }, 1800);
        } catch (e) {
            btn.disabled = false;
            btn.innerHTML = `${ic('merge')} دمج في العميل المختار`;
            rnAlert('تعذّر الدمج: ' + ((e && e.message) || 'تحقّق من الاتصال'));
        }
    }
    // يجمع كل التحديثات في طلب واحد حتى لا يبقى الدمج ناقصًا
    async function mergeUpdates(main, dups) {
        const target = label(main), from = new Set(dups.flatMap(names)), keys = new Set(dups.map(d => String(d.rowIndex)));
        const get = async p => (await window.db.ref(p).once('value')).val() || {};
        const [invoices, projects, recurring, proposals, notifications, redemptions, mainNow] = await Promise.all(['invoices', 'projects', 'recurring', 'proposals', 'notifications', 'redemptions', 'clients/' + main.rowIndex].map(get));
        const u = {};
        [['invoices', invoices], ['projects', projects], ['recurring', recurring], ['notifications', notifications]].forEach(([node, list]) => {
            Object.entries(list).forEach(([id, v]) => { if (v && from.has(String(v.client || '').trim())) u[`${node}/${id}/client`] = target; });
        });
        Object.entries(proposals).forEach(([id, v]) => {
            if (!v) return;
            if (keys.has(String(v.clientKey)) || (!v.clientKey && from.has(String(v.clientName || '').trim()))) { u[`proposals/${id}/clientKey`] = main.rowIndex; u[`proposals/${id}/clientName`] = target; }
        });
        Object.entries(redemptions).forEach(([id, v]) => { if (v && keys.has(String(v.clientKey))) u[`redemptions/${id}/clientKey`] = main.rowIndex; });
        let points = parseInt(mainNow.points) || 0, spent = parseFloat(mainNow.totalSpent) || 0, phone = mainNow.phone || '', email = mainNow.email || '';
        dups.forEach(d => {
            points += parseInt(d.points) || 0;
            spent += parseFloat(d.totalSpent) || 0;
            if (!phone && d.phone) phone = d.phone;
            if (!email && d.email) email = d.email;
            u['clients/' + d.rowIndex] = null;
            if (d.token) u['portal/' + d.token] = null;
            if (d.refCode) u['referrals/' + d.refCode] = main.rowIndex;
        });
        Object.assign(u, { [`clients/${main.rowIndex}/points`]: points, [`clients/${main.rowIndex}/totalSpent`]: spent, [`clients/${main.rowIndex}/phone`]: phone, [`clients/${main.rowIndex}/email`]: email });
        return u;
    }

    // ── إضافة عميل موجود، وتعديل الاسم ──
    async function renameUpdates(oldNames, target) {
        const from = new Set(oldNames.filter(n => n && n !== target));
        if (!from.size) return {};
        const get = async p => (await window.db.ref(p).once('value')).val() || {};
        const [invoices, projects, recurring, proposals, notifications] = await Promise.all(['invoices', 'projects', 'recurring', 'proposals', 'notifications'].map(get));
        const u = {};
        [['invoices', invoices], ['projects', projects], ['recurring', recurring], ['notifications', notifications]].forEach(([node, list]) => {
            Object.entries(list).forEach(([id, v]) => { if (v && from.has(String(v.client || '').trim())) u[`${node}/${id}/client`] = target; });
        });
        Object.entries(proposals).forEach(([id, v]) => { if (v && from.has(String(v.clientName || '').trim())) u[`proposals/${id}/clientName`] = target; });
        return u;
    }
    const origSave = window.saveQuickClient;
    let confirmed = false;
    if (typeof origSave === 'function') window.saveQuickClient = async function () {
        const name = (document.getElementById('quick-name') || {}).value || '', phone = (document.getElementById('quick-phone') || {}).value || '';
        const row = (document.getElementById('quick-row-index') || {}).value || '';
        if (!name.trim()) return origSave.apply(this, arguments);
        if (!row && !confirmed) {
            const same = C().find(c => names(c).some(n => norm(n) === norm(name)) || (phone9(phone).length === 9 && phone9(c.phone) === phone9(phone)));
            if (same && !(await rnConfirm(`يوجد عميل مسجّل ${norm(label(same)) === norm(name) ? 'بالاسم نفسه' : 'برقم الجوال نفسه'}: «${label(same)}»${same.phone ? ' (' + same.phone + ')' : ''}. إضافة عميل جديد قد تجعل فواتيره تُحسب مرتين. هل تضيفه على أي حال؟`, { ok: 'أضفه على أي حال', tone: 'warn' }))) return;
        }
        if (row) {
            const old = C().find(c => String(c.rowIndex) === String(row));
            const target = name.trim();
            if (old && !names(old).includes(target)) {
                try {
                    const u = await renameUpdates(names(old), target);
                    if (Object.keys(u).length) { await window.db.ref().update(u); toast(`✏️ نُقل الاسم الجديد إلى ${Object.keys(u).length} سجل (فواتير ومشاريع وعروض)`); }
                } catch (e) { rnAlert('تعذّر نقل الاسم الجديد إلى الفواتير والمشاريع: ' + ((e && e.message) || '')); }
            }
        }
        return origSave.apply(this, arguments);
    };

    document.addEventListener('click', e => { const b = e.target.closest('#cl-dups [data-cd="open"]'); if (b) open(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && wrap && !wrap.hidden) close(); });
    const origSwitch = window.switchPage;
    if (typeof origSwitch === 'function') window.switchPage = function (id) { const r = origSwitch.apply(this, arguments); if (id === 'clients') setTimeout(banner, 50); return r; };
    const origLoad = window.loadAllData;
    if (typeof origLoad === 'function') window.loadAllData = function () { const r = origLoad.apply(this, arguments); setTimeout(banner, 3500); return r; };
    window.ClientDups = { groups, open, banner, norm };
})();
