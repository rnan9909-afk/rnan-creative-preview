/**
 * نواة أدوات العمل في لوحة الإدارة (Studio): أدوات مشتركة، النافذة، محرّر البنود والمراحل والمهام،
 * والربط مع switchPage وloadAllData في admin.html.
 * الوحدات: proposals.js · templates.js · subs.js · time.js — كلٌّ يسجّل نفسه بـ Studio.register().
 */
(function () {
    const pad = n => String(n).padStart(2, '0');
    const esc = s => RNAN.esc(s == null ? '' : String(s));
    const ic = (name, cls) => `<span class="material-symbols-rounded${cls ? ' ' + cls : ''}">${name}</span>`;

    // ── التواريخ (محلية بصيغة YYYY-MM-DD) ──
    const ymd = d => { d = d instanceof Date ? d : new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const parseYmd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
    const today = () => ymd(new Date());
    const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + (+n || 0)); return ymd(d); };
    const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
    const weekStart = (s) => { const d = parseYmd(s || today()); d.setDate(d.getDate() - d.getDay()); return ymd(d); }; // الأسبوع يبدأ الأحد
    const fmtDate = (s, opts) => {
        if (!s) return '—';
        const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? parseYmd(s) : new Date(s);
        // السنة تظهر فقط إن لم تكن السنة الحالية
        const def = d.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' };
        return d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', opts || def);
    };
    // تمييز العدد: 3–10 بالجمع، وغيره بالمفرد (4 مراحل · 10 مهام · 12 مهمة)
    const plural = (n, one, many) => `<span class="st-num">${n}</span> ${n >= 3 && n <= 10 ? many : one}`;
    // 1 → يوم واحد · 2 → يومان · 3–10 → أيام · 11+ → يومًا
    const days = (n, html) => {
        n = Math.round(+n || 0);
        if (n === 1) return 'يوم واحد';
        if (n === 2) return 'يومان';
        return (html ? `<span class="st-num">${n}</span>` : n) + (n >= 3 && n <= 10 ? ' أيام' : ' يومًا');
    };
    const fmtTime = v => new Date(v).toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' });

    // ── الأرقام والمدد ──
    const num = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const money = (n, cur) => `<span class="st-num">${num(n)}</span> ${cur === 'USD' ? '$' : 'ر.س'}`;
    const moneyText = (n, cur) => num(n) + (cur === 'USD' ? ' $' : ' ر.س');
    const dur = secs => {
        secs = Math.max(0, Math.round(+secs || 0));
        if (secs < 60) return secs + 'ث';
        const m = Math.floor(secs / 60), h = Math.floor(m / 60);
        return h ? h + 'س' + (m % 60 ? ' ' + (m % 60) + 'د' : '') : m + 'د';
    };
    const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60); };

    // ── قاعدة البيانات وواجهة الخادم ──
    const ref = p => window.db.ref(p);
    const get = async p => (await ref(p).once('value')).val();
    const toList = o => Object.keys(o || {}).map(k => Object.assign({ id: k }, o[k]));
    const newId = () => window.db.ref().push().key;
    const run = (fn, ...a) => new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...a));
    const toast = m => (window.showAdminToast ? window.showAdminToast(m) : alert(m));
    const clients = () => (typeof clientsData !== 'undefined' && Array.isArray(clientsData) ? clientsData : []);
    const projects = () => (typeof projectsData !== 'undefined' && Array.isArray(projectsData) ? projectsData : []);
    const clientName = c => (c && (c.name || c.company)) || '';
    const refreshAll = () => { if (typeof loadAllData === 'function') loadAllData(); };
    let siteCache = null;
    const site = async () => siteCache || (siteCache = (await get('settings/site')) || {});

    // مجاميع العرض/القالب: البنود − الخصم + الضريبة، الدفعة المقدّمة والمدة
    function calc(p) {
        const items = p.items || [];
        const subtotal = items.reduce((s, i) => s + (+i.qty || 0) * (+i.price || 0), 0);
        const discount = Math.min(Math.max(+p.discount || 0, 0), subtotal);
        const vat = p.vat ? Math.round((subtotal - discount) * 15) / 100 : 0;
        const total = Math.round((subtotal - discount + vat) * 100) / 100;
        const depositPct = Math.max(0, Math.min(100, +p.deposit || 0));
        const depositAmount = Math.round(total * depositPct / 100);
        const days = (p.phases || []).reduce((s, x) => s + (+x.days || 0), 0);
        return { subtotal, discount, vat, total, depositPct, depositAmount, remaining: Math.round((total - depositAmount) * 100) / 100, days };
    }

    // ── النافذة ──
    function modal(html, size) {
        let m = document.getElementById('studioModal');
        if (!m) {
            m = document.createElement('div');
            m.id = 'studioModal';
            m.className = 'modal fixed inset-0 z-[70] bg-black/90 backdrop-blur-md items-center justify-center p-4 no-print';
            m.innerHTML = '<div></div>';
            document.body.appendChild(m);
        }
        const box = m.firstElementChild;
        box.className = 'glass-modal st-modal border border-border-glass text-right custom-scrollbar' + (size ? ' ' + size : '');
        box.innerHTML = html;
        box.scrollTop = 0;
        m.classList.add('open');
        return box;
    }
    const closeModal = () => { const m = document.getElementById('studioModal'); if (m) m.classList.remove('open'); };
    const mHead = (icon, title, sub) => `<div class="st-m-head"><div><h3>${ic(icon)} ${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
        <button type="button" class="st-close" onclick="Studio.closeModal()" aria-label="إغلاق">${ic('close')}</button></div>`;

    // قائمة «المزيد»
    function toggleMore(btn) {
        const w = btn.closest('.st-more');
        const was = w.classList.contains('open');
        document.querySelectorAll('.st-more.open').forEach(x => x.classList.remove('open'));
        if (!was) w.classList.add('open');
    }
    document.addEventListener('click', e => {
        document.querySelectorAll('.st-more.open').forEach(x => { if (!x.contains(e.target)) x.classList.remove('open'); });
    });
    // حقول الأرقام نصية بلوحة أرقام (inputmode): Windows يفرض الأرقام الهندية على type=number فيبدو الصفر «-».
    // toNum يقبل الأرقام العربية والهندية والفاصلة العربية: «١٢٫٥» → 12.5
    const toNum = v => {
        const s = String(v == null ? '' : v).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776)
            .replace(/٫/g, '.').replace(/[,،\s]/g, '');
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    };

    const busy = async (btn, fn, label) => {
        const old = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = `<span class="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full inline-block"></span> ${label || 'جاري الحفظ...'}`; }
        try { return await fn(); }
        catch (err) { console.error(err); toast('تعذّر التنفيذ: ' + ((err && err.message) || err)); }
        finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = old; } }
    };

    // ── محرّر البنود/المراحل/المهام المشترك بين العروض والقوالب ──
    const LINES = {
        items: { title: 'بنود التسعير', icon: 'receipt_long', blank: () => ({ desc: '', qty: 1, price: 0 }), num: ['qty', 'price'] },
        phases: { title: 'المراحل والمدة', icon: 'timeline', blank: () => ({ name: '', days: 3 }), num: ['days'] },
        tasks: { title: 'المهام والمحطات', icon: 'checklist', blank: () => ({ title: '', day: 1, ms: false }), num: ['day'] }
    };
    let ed = null, edChange = null;
    const edStart = (obj, onChange) => { ed = obj; edChange = onChange; ['items', 'phases', 'tasks'].forEach(k => { ed[k] = (ed[k] || []).map(x => Object.assign({}, x)); }); return ed; };
    const edState = () => ed;
    function edField(key, v, isNum) { ed[key] = isNum ? toNum(v) : v; if (edChange) edChange(key); }
    function edSet(list, i, key, v) {
        const row = ed[list][i];
        if (!row) return;
        row[key] = LINES[list].num.includes(key) ? toNum(v) : v;
        if (list === 'items') { const c = document.getElementById('st-rt-' + i); if (c) c.innerHTML = money((+row.qty || 0) * (+row.price || 0)); }
        if (list === 'phases') gantt();
        if (edChange) edChange(list);
    }
    function edAdd(list) {
        ed[list].push(LINES[list].blank());
        rows(list);
        const box = document.getElementById('st-rows-' + list);
        const inp = box && box.lastElementChild && box.lastElementChild.querySelector('input');
        if (inp) inp.focus();
        if (edChange) edChange(list);
    }
    function edDel(list, i) { ed[list].splice(i, 1); rows(list); if (edChange) edChange(list); }
    function rowHtml(list, r, i) {
        const del = `<button type="button" class="st-btn icon sm ghost" title="حذف" onclick="Studio.edDel('${list}', ${i})">${ic('close')}</button>`;
        const inp = (key, ph, cls, type, extra) => `<input class="form-input-modern text-sm ${cls || ''}" ${type === 'n' ? 'inputmode="decimal" dir="ltr"' : ''} placeholder="${ph}"
            value="${esc(r[key] == null ? '' : r[key])}" oninput="Studio.edSet('${list}', ${i}, '${key}', this.value)" ${extra || ''}>`;
        if (list === 'items') return `<div class="st-row items">${inp('desc', 'وصف البند')}${inp('qty', 'الكمية', 'text-center', 'n')}${inp('price', 'سعر الوحدة', '', 'n')}
            <span class="rt" id="st-rt-${i}">${money((+r.qty || 0) * (+r.price || 0))}</span>${del}</div>`;
        if (list === 'phases') return `<div class="st-row phases">${inp('name', 'اسم المرحلة')}${inp('days', 'أيام', 'text-center', 'n')}${del}</div>`;
        return `<div class="st-row tasks">${inp('title', 'المهمة')}${inp('day', 'اليوم', 'text-center', 'n', 'title="يوم الاستحقاق من بداية المشروع"')}
            <label class="st-check" title="محطة يراها العميل ويُطلب اعتماده فيها"><input type="checkbox" ${r.ms ? 'checked' : ''} onchange="Studio.edSet('tasks', ${i}, 'ms', this.checked)"> محطة</label>${del}</div>`;
    }
    function rows(list) {
        const box = document.getElementById('st-rows-' + list);
        if (!box) return;
        const head = list === 'items' ? `<div class="st-row items st-row-head"><span>البند</span><span class="text-center">الكمية</span><span>السعر</span><span class="rt">الإجمالي</span><span></span></div>` : '';
        box.innerHTML = ed[list].length ? head + ed[list].map((r, i) => rowHtml(list, r, i)).join('') : `<p class="st-muted text-xs">لا يوجد — أضف من الزر.</p>`;
        if (list === 'phases') gantt();
    }
    function block(list, extra) {
        const L = LINES[list];
        // بنود التسعير: منتقٍ من قائمة الأسعار (js/studio/prices.js)
        const pick = list === 'items' && window.PriceList ? `<button type="button" class="st-btn xs ghost" onclick="PriceList.togglePicker(this)">${ic('sell')} من قائمة الأسعار</button>` : '';
        return `<div class="st-block"><div class="st-block-h"><b>${ic(L.icon)} ${L.title}</b>
            <span class="st-block-acts">${pick}<button type="button" class="st-btn xs soft" onclick="Studio.edAdd('${list}')">${ic('add')} إضافة</button></span></div>
            ${pick ? '<div class="pl-pick" hidden></div>' : ''}
            <div class="st-rows" id="st-rows-${list}"></div>${extra || ''}</div>`;
    }
    // مخطط زمني مصغّر للمراحل
    function gantt() {
        const box = document.getElementById('st-gantt');
        if (!box || !ed) return;
        const total = ed.phases.reduce((s, p) => s + (+p.days || 0), 0);
        let acc = 0;
        box.innerHTML = total ? ed.phases.map(p => {
            const d = +p.days || 0, start = acc;
            acc += d;
            return `<div><span>${esc(p.name || 'مرحلة')}</span><span class="track"><i style="inset-inline-start:${start / total * 100}%;width:${Math.max(d / total * 100, 2)}%"></i></span></div>`;
        }).join('') + `<p class="st-muted text-xs" style="margin:2px 0 0">المدة الإجمالية: <b class="st-num" style="color:#fff">${total}</b> يوم</p>` : '';
    }
    function renderLines() { ['items', 'phases', 'tasks'].forEach(rows); }

    // ── خيارات القوائم المنسدلة ──
    function clientOptions(selectedKey) {
        return clients().slice().sort((a, b) => clientName(a).localeCompare(clientName(b), 'ar'))
            .map(c => `<option value="${esc(c.rowIndex)}" ${String(c.rowIndex) === String(selectedKey) ? 'selected' : ''}>${esc(clientName(c))}</option>`).join('');
    }
    function projectOptions(selectedKey, all) {
        return projects().filter(p => all || p.status !== 'مكتمل' || String(p.rowIndex) === String(selectedKey))
            .map(p => `<option value="${esc(p.rowIndex)}" ${String(p.rowIndex) === String(selectedKey) ? 'selected' : ''}>${esc(p.name)}${p.client ? ' — ' + esc(p.client) : ''}</option>`).join('');
    }

    // ── التوجيه ──
    const modules = {};
    const register = (id, mod) => { modules[id] = mod; };
    const page = id => document.getElementById(id + '-page');
    function onPage(id) {
        const m = modules[id];
        if (m && m.open) Promise.resolve(m.open()).catch(err => { console.error(err); toast('تعذّر تحميل الصفحة: ' + ((err && err.message) || err)); });
    }
    // يُستدعى من loadAllData بعد الدخول: المؤقت العائم، تذكير التجديدات، وشارات القائمة
    function boot() {
        if (!window.db) return;
        Object.values(modules).forEach(m => { if (m.boot) Promise.resolve(m.boot()).catch(err => console.error(err)); });
    }

    window.Studio = {
        esc, ic, pad, ymd, parseYmd, today, addDays, diffDays, weekStart, fmtDate, fmtTime, days, plural, num, money, moneyText, dur, clock,
        ref, get, toList, newId, run, toast, clients, projects, clientName, refreshAll, site, calc, toNum,
        modal, closeModal, mHead, toggleMore, busy,
        edStart, edState, edField, edSet, edAdd, edDel, block, renderLines, gantt,
        clientOptions, projectOptions, register, page, onPage, boot, modules
    };
})();
