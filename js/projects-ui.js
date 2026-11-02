// المشاريع: «المشاريع النشطة» في الرئيسية بصفوف مرتبة، وأنواع المشاريع وقوالب مهامها،
// ونافذة «مشروع جديد» (لوحة سفلية على الجوال، ونافذة بمعاينة حيّة على الشاشات الكبيرة) تنتهي بخطوات ما بعد الإنشاء.
// صفحة المشاريع نفسها في js/projects-page.js، والأنماط في css/projects.css.
(function () {
    const ACTIVE = 'قيد التنفيذ';
    const STEPS = ['جمع البيانات', 'التصاميم الأولية', 'المراجعة والتعديل', 'التسليم النهائي'];
    // نوع العمل: أيقونته ولونه ومدته المعتادة ومهامه الافتراضية
    const TYPES = [
        { id: 'branding', t: 'هوية بصرية', ic: 'draw', hue: 160, days: 14, kw: ['هوية', 'شعار', 'لوقو', 'لوجو', 'براند'], steps: ['جمع المعلومات والإلهام', 'اسكتشات الشعار', 'تطوير الفكرة المختارة', 'دليل الهوية', 'التسليم النهائي'] },
        { id: 'social', t: 'سوشيال ميديا', ic: 'grid_view', hue: 220, days: 7, kw: ['سوشيال', 'منشور', 'بوست', 'ستوري', 'حملة', 'انستقرام'], steps: ['خطة المحتوى', 'تصميم المنشورات', 'المراجعة والتعديل', 'التسليم'] },
        { id: 'brochure', t: 'بروشور إعلاني', ic: 'campaign', hue: 14, days: 3, kw: ['بروشور', 'برشور', 'فلاير', 'إعلان', 'اعلان', 'مطوية'], steps: ['استلام المحتوى والصور', 'التصميم', 'المراجعة والتعديل', 'تجهيز ملف النشر أو الطباعة', 'التسليم'] },
        { id: 'rollup', t: 'بنر رول أب', ic: 'flag', hue: 290, days: 3, kw: ['رول', 'رول أب', 'رولاب', 'بنر', 'بانر', 'ستاند'], steps: ['استلام المحتوى والمقاس', 'التصميم', 'المراجعة والتعديل', 'تجهيز ملف الطباعة بالمقاس', 'التسليم'] },
        { id: 'print', t: 'مطبوعات وتغليف', ic: 'inventory_2', hue: 38, days: 10, kw: ['مطبوع', 'تغليف', 'بطاق', 'بوستر', 'لوحات', 'منيو'], steps: ['جمع البيانات والمقاسات', 'التصميم', 'المراجعة والتعديل', 'تجهيز ملفات الطباعة', 'التسليم'] },
        { id: 'ui', t: 'واجهات وتطبيقات', ic: 'devices', hue: 262, days: 21, kw: ['موقع', 'تطبيق', 'واجه', 'ui', 'ux', 'متجر إلكتروني'], steps: ['تحليل المتطلبات', 'الهيكل الأولي', 'التصميم المرئي', 'النموذج التفاعلي', 'التسليم'] },
        { id: 'presentation', t: 'عروض وبروفايل', ic: 'co_present', hue: 190, days: 10, kw: ['بروفايل', 'عرض تقديمي', 'تقرير', 'ملف تعريفي'], steps: ['جمع المحتوى', 'تصميم الشرائح', 'المراجعة والتعديل', 'التسليم'] },
        { id: 'motion', t: 'موشن وفيديو', ic: 'movie', hue: 330, days: 14, kw: ['موشن', 'فيديو', 'انيميشن', 'ريلز', 'مونتاج'], steps: ['السيناريو', 'الستوري بورد', 'التحريك والمونتاج', 'المراجعة والتعديل', 'التسليم'] },
        { id: 'consulting', t: 'استشارة إبداعية', ic: 'lightbulb', hue: 48, days: 3, kw: ['استشار', 'جلسة'], steps: ['جلسة الاستكشاف', 'التحليل والبحث', 'تقديم التوصيات'] },
        { id: 'other', t: 'مشروع آخر', ic: 'category', hue: 205, days: 7, kw: [], steps: STEPS }
    ];
    const OTHER = TYPES[TYPES.length - 1];
    // المشاريع القديمة بلا نوع: يُستنتج من اسمها
    function typeOf(p) {
        const t = TYPES.find(x => x.id === (p && p.type));
        if (t) return t;
        const s = String((p && p.name) || '').toLowerCase();
        return TYPES.find(x => x.kw.some(k => s.includes(k))) || OTHER;
    }
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => Math.round(v || 0).toLocaleString('en-US');
    const mobile = () => window.matchMedia('(max-width: 767.98px)').matches;
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const plus = (from, n) => { const d = parse(from) || today(); d.setDate(d.getDate() + n); return ymd(d); };
    const days = n => n === 1 ? 'يوم' : n === 2 ? 'يومين' : n <= 10 ? n + ' أيام' : n + ' يومًا';
    const toast = m => (window.ProjectsPage ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    const run = (fn, ...a) => new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...a));
    const reload = () => new Promise(res => (typeof loadAllData === 'function' ? loadAllData(res) : res()));
    const WEEK = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const longDate = s => { const d = parse(s); return d ? `${WEEK[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` : ''; };

    // ── المشاريع النشطة في الرئيسية: الأقرب تسليمًا أولًا ──
    function due(s) {
        const d = parse(s);
        if (!d) return { cls: 'none', text: 'بلا موعد' };
        const n = Math.round((d - today()) / 864e5);
        if (n < 0) return { cls: 'late', text: 'متأخر ' + days(-n) };
        if (n === 0) return { cls: 'soon', text: 'التسليم اليوم' };
        if (n === 1) return { cls: 'soon', text: 'غدًا' };
        return { cls: n <= 3 ? 'soon' : '', text: 'بعد ' + days(n) };
    }
    function active(all) {
        const box = document.getElementById('dash-active-projects-list');
        if (!box) return;
        const list = (all || []).filter(p => p.status === ACTIVE)
            .sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999')).slice(0, 5);
        if (!list.length) { box.innerHTML = `<p class="dp-empty">${ic('task_alt')} لا توجد مشاريع نشطة حاليًا</p>`; return; }
        box.innerHTML = list.map(p => {
            const pr = Math.max(0, Math.min(100, parseInt(p.progress) || 0));
            const d = due(p.deadline);
            return `<button type="button" class="dp-row" data-i="${projectsData.indexOf(p)}">
                <span class="dp-av">${esc((p.client || p.name || '?').trim().charAt(0))}</span>
                <span class="dp-main"><b>${esc(p.name)}</b><small>${esc(p.client || '—')}</small></span>
                <span class="dp-due ${d.cls}">${ic('event')}<span><b class="en-num">${esc(p.deadline || '—')}</b><em>${d.text}</em></span></span>
                <span class="dp-prog"><span class="dp-bar"><i style="width:${pr}%"></i></span><b class="en-num">${pr}%</b></span>
            </button>`;
        }).join('');
    }
    document.addEventListener('click', e => {
        const r = e.target.closest('#dash-active-projects-list .dp-row');
        if (r && +r.dataset.i > -1 && typeof window.openProjectModal === 'function') window.openProjectModal('edit', +r.dataset.i);
    });

    // ── نافذة «مشروع جديد» ──
    const NEW_CLIENT = '__new__';
    const SPANS = [[1, 'يوم'], [3, '3 أيام'], [7, 'أسبوع'], [14, 'أسبوعين'], [30, 'شهر']];
    let wrap = null, busy = false, st = null;
    const fresh = () => ({ type: null, stepsEdited: false, deadlineSet: false, made: null });
    const $ = s => wrap.querySelector(s);
    const F = () => $('form');

    function build() {
        if (wrap) return wrap;
        wrap = document.createElement('div');
        wrap.className = 'pn-wrap no-print';
        wrap.hidden = true;
        wrap.innerHTML = `<div class="pn-scrim" data-x></div>
            <div class="pn-box" role="dialog" aria-modal="true" aria-labelledby="pn-title">
                <div class="pn-grab"></div>
                <header class="pn-head">
                    <span class="pn-ic">${ic('rocket_launch')}</span>
                    <div class="pn-head-t"><h3 id="pn-title">مشروع جديد</h3><p>اختر نوع العمل، ونجهّز لك المهام وموعد التسليم</p></div>
                    <button type="button" class="pn-x" data-x aria-label="إغلاق">${ic('close')}</button>
                </header>
                <form class="pn-form" novalidate>
                    <div class="pn-body">
                        <div class="pn-main">
                            <section class="pn-sec">
                                <h4><i class="en-num">1</i> نوع العمل <em>اختياري</em></h4>
                                <div class="pn-types">${TYPES.map(t => `<button type="button" data-type="${t.id}" style="--hue:${t.hue}" aria-pressed="false"><span>${ic(t.ic)}</span><b>${t.t}</b></button>`).join('')}</div>
                            </section>
                            <section class="pn-sec">
                                <h4><i class="en-num">2</i> العميل والمشروع</h4>
                                <div class="pn-row">
                                    <label class="pn-f"><span>العميل</span><select name="client" id="pn-client" class="form-input-modern"></select></label>
                                    <label class="pn-f"><span>اسم المشروع</span><input name="name" id="pn-name" class="form-input-modern" maxlength="120" autocomplete="off" placeholder="مثال: هوية بصرية لمقهى"></label>
                                </div>
                                <div class="pn-new" hidden>
                                    <label class="pn-f"><span>اسم العميل الجديد</span><input name="cname" class="form-input-modern" maxlength="80" placeholder="اسم الجهة أو الشخص"></label>
                                    <label class="pn-f"><span>جواله <em>(اختياري)</em></span><input name="cphone" class="form-input-modern" inputmode="tel" dir="ltr" maxlength="20" placeholder="05xxxxxxxx"></label>
                                </div>
                                <p class="pn-note" hidden></p>
                            </section>
                            <section class="pn-sec">
                                <h4><i class="en-num">3</i> الموعد والقيمة</h4>
                                <div class="pn-spans" role="group" aria-label="مدة التنفيذ">${SPANS.map(([n, t]) => `<button type="button" data-days="${n}">${t}</button>`).join('')}</div>
                                <div class="pn-row three">
                                    <label class="pn-f"><span>الاستلام</span><input type="date" name="start" id="pn-start" class="form-input-modern"></label>
                                    <label class="pn-f"><span>التسليم</span><input type="date" name="deadline" id="pn-deadline" class="form-input-modern"></label>
                                    <label class="pn-f"><span>القيمة <em>(ر.س)</em></span><input name="value" id="pn-value" class="form-input-modern" inputmode="decimal" dir="ltr" placeholder="0"></label>
                                </div>
                                <p class="pn-dur"></p>
                            </section>
                            <section class="pn-sec">
                                <h4><i class="en-num">4</i> المهام <em class="pn-count en-num"></em></h4>
                                <ol class="pn-steps"></ol>
                                <div class="pn-addstep"><input name="step" class="form-input-modern" maxlength="80" placeholder="أضف مهمة واضغط Enter" autocomplete="off"><button type="button" data-addstep aria-label="إضافة مهمة">${ic('add')}</button></div>
                            </section>
                            <section class="pn-sec">
                                <details class="pn-notes"><summary>${ic('sticky_note_2')} ملاحظات المشروع <em>اختياري</em></summary>
                                    <textarea name="notes" class="form-input-modern" rows="3" maxlength="2000" placeholder="متطلبات العميل، الألوان المفضلة، روابط مرجعية..."></textarea></details>
                            </section>
                            <p class="pn-err" role="alert" hidden></p>
                        </div>
                        <aside class="pn-side" aria-label="معاينة">
                            <p class="pn-side-t">${ic('visibility')} هكذا سيظهر في صفحة المشاريع</p>
                            <div class="pn-prev"></div>
                            <ul class="pn-sum"></ul>
                        </aside>
                    </div>
                    <footer class="pn-foot">
                        <button type="button" class="pn-cancel" data-x>إلغاء</button>
                        <button type="submit" class="pn-go">${ic('rocket_launch')} إنشاء المشروع</button>
                    </footer>
                </form>
                <div class="pn-done" hidden></div>
            </div>`;
        document.body.appendChild(wrap);
        const f = F();
        wrap.addEventListener('click', e => {
            if (e.target.closest('[data-x]')) return close();
            const t = e.target.closest('[data-type]');
            if (t) return pickType(t.dataset.type);
            const sp = e.target.closest('[data-days]');
            if (sp) { st.deadlineSet = true; f.deadline.value = plus(f.start.value, +sp.dataset.days); return sync(); }
            if (e.target.closest('[data-addstep]')) return addStep();
            const rm = e.target.closest('[data-rm]');
            if (rm) { rm.closest('li').remove(); st.stepsEdited = true; return sync(); }
            const d = e.target.closest('[data-done]');
            if (d) return after(d.dataset.done, d);
        });
        f.client.addEventListener('change', () => {
            const isNew = f.client.value === NEW_CLIENT;
            $('.pn-new').hidden = !isNew;
            if (isNew) setTimeout(() => f.cname.focus(), 60);
            sync();
        });
        f.start.addEventListener('change', () => {
            if (!st.deadlineSet) f.deadline.value = plus(f.start.value, (st.type || OTHER).days);
            sync();
        });
        f.deadline.addEventListener('change', () => { st.deadlineSet = true; sync(); });
        f.step.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } });
        $('.pn-steps').addEventListener('input', () => { st.stepsEdited = true; sync(); });
        f.addEventListener('input', e => { if (e.target.name !== 'step') sync(); });
        f.addEventListener('submit', e => { e.preventDefault(); create(); });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && wrap && !wrap.hidden && !document.querySelector('.rnp-wrap:not([hidden])')) close();
        });
        return wrap;
    }

    function setSteps(list) {
        $('.pn-steps').innerHTML = list.map(t => stepLi(t)).join('');
    }
    const stepLi = t => `<li><i class="en-num"></i><input class="pn-step" value="${esc(t)}" maxlength="80" aria-label="مهمة"><button type="button" data-rm aria-label="حذف المهمة">${ic('close')}</button></li>`;
    function addStep() {
        const f = F(), v = f.step.value.trim();
        if (!v) { f.step.focus(); return; }
        $('.pn-steps').insertAdjacentHTML('beforeend', stepLi(v));
        f.step.value = '';
        f.step.focus();
        st.stepsEdited = true;
        sync();
    }
    const steps = () => [...wrap.querySelectorAll('.pn-step')].map(i => i.value.trim()).filter(Boolean);

    function pickType(id) {
        const t = TYPES.find(x => x.id === id);
        st.type = st.type === t ? null : t;
        const cur = st.type || OTHER;
        wrap.querySelectorAll('[data-type]').forEach(b => { const on = st.type && b.dataset.type === st.type.id; b.classList.toggle('on', !!on); b.setAttribute('aria-pressed', !!on); });
        if (!st.stepsEdited) setSteps(cur.steps);
        if (!st.deadlineSet) F().deadline.value = plus(F().start.value, cur.days);
        sync();
    }
    function clientName() {
        const f = F();
        return f.client.value === NEW_CLIENT ? f.cname.value.trim() : f.client.value;
    }
    // الاسم اختياري حين يكون النوع والعميل معروفين: «هوية بصرية — مقهى بُنّ»
    function suggested() {
        const c = clientName();
        return st.type && st.type !== OTHER ? st.type.t + (c ? ' — ' + c : '') : '';
    }
    function pendingInv(client) {
        const I = typeof invoicesData !== 'undefined' ? invoicesData : [];
        return client ? I.find(i => i.client === client && i.status === 'قيد الانتظار') : null;
    }
    function sync() {
        const f = F();
        const sug = suggested();
        f.name.placeholder = sug || 'مثال: هوية بصرية لمقهى';
        const s = steps(), c = clientName();
        wrap.querySelectorAll('.pn-steps li > i').forEach((el, n) => { el.textContent = n + 1; });
        $('.pn-count').textContent = s.length || '';
        // الأزرار السريعة تتبع الفرق بين الاستلام والتسليم
        const span = parse(f.deadline.value) && parse(f.start.value) ? Math.round((parse(f.deadline.value) - parse(f.start.value)) / 864e5) : null;
        wrap.querySelectorAll('[data-days]').forEach(b => b.classList.toggle('on', +b.dataset.days === span));
        const dur = $('.pn-dur');
        if (span !== null && span < 0) { dur.className = 'pn-dur warn'; dur.innerHTML = `${ic('error')} موعد التسليم قبل تاريخ الاستلام`; }
        else if (span !== null) { dur.className = 'pn-dur'; dur.innerHTML = `${ic('schedule')} مدة التنفيذ <b>${span ? days(span) : 'نفس اليوم'}</b> · التسليم ${longDate(f.deadline.value)}`; }
        else { dur.className = 'pn-dur'; dur.innerHTML = `${ic('event_busy')} بلا موعد تسليم`; }
        // تنبيه الفاتورة المعلّقة لهذا العميل
        const inv = pendingInv(c), note = $('.pn-note');
        note.hidden = !inv;
        if (inv) note.innerHTML = `${ic('receipt_long')} لدى العميل فاتورة معلّقة <b class="en-num" dir="ltr">${esc(inv.number)}</b> — يمكنك إضافة المشروع إليها بعد الإنشاء`;
        // المعاينة الحية (الشاشات الكبيرة)
        const prevBox = $('.pn-prev');
        if (prevBox && window.ProjectsPage && getComputedStyle($('.pn-side')).display !== 'none') {
            prevBox.innerHTML = ProjectsPage.card({
                name: f.name.value.trim() || sug || 'اسم المشروع', client: c || 'العميل', status: ACTIVE, deadline: f.deadline.value, startDate: f.start.value,
                value: parseFloat(String(f.value.value).replace(/[^\d.]/g, '')) || 0, steps: s.map(text => ({ text, done: false })), type: (st.type || OTHER).id, progress: 0
            }, true);
            const val = parseFloat(String(f.value.value).replace(/[^\d.]/g, '')) || 0;
            $('.pn-sum').innerHTML = [
                [ic('category'), 'النوع', (st.type || OTHER).t],
                [ic('checklist'), 'المهام', s.length ? s.length + (s.length <= 10 ? ' مهام' : ' مهمة') : 'بلا مهام'],
                [ic('schedule'), 'المدة', span !== null && span >= 0 ? (span ? days(span) : 'نفس اليوم') : '—'],
                [ic('payments'), 'القيمة', val ? `<span class="en-num">${num(val)}</span> ر.س` : '—']
            ].map(([i, k, v]) => `<li>${i}<span>${k}</span><b>${v}</b></li>`).join('');
        }
    }
    function fillClients(sel, pick) {
        const names = (typeof clientsData !== 'undefined' ? clientsData : []).map(c => c.company || c.name).filter(Boolean);
        sel.innerHTML = '<option value="">اختر العميل</option>' + names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')
            + `<option value="${NEW_CLIENT}">+ عميل جديد</option>`;
        sel.value = pick && names.includes(pick) ? pick : '';
    }

    function open(opts) {
        opts = opts || {};
        build();
        st = fresh();
        const f = F();
        f.reset();
        f.hidden = false;
        $('.pn-done').hidden = true;
        $('.pn-done').innerHTML = '';
        $('.pn-head').hidden = false;
        fillClients(f.client, opts.client);
        $('.pn-new').hidden = true;
        $('.pn-err').hidden = true;
        $('.pn-notes').open = false;
        wrap.querySelectorAll('[data-type]').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
        f.start.value = ymd(today());
        f.deadline.value = plus(f.start.value, 7);
        setSteps(STEPS);
        wrap.hidden = false;
        document.documentElement.classList.add('pn-lock');
        sync();
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
        if (!mobile()) setTimeout(() => (opts.client ? f.name : f.client).focus(), 320);
    }
    function close() {
        if (!wrap || wrap.hidden || busy) return;
        wrap.classList.remove('open');
        document.documentElement.classList.remove('pn-lock');
        if (window.RnanPickers) RnanPickers.close();
        setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 320);
    }
    const err = m => { const el = $('.pn-err'); el.textContent = m; el.hidden = false; el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };

    async function create() {
        if (busy) return;
        const f = F();
        const isNew = f.client.value === NEW_CLIENT;
        const client = clientName();
        const name = f.name.value.trim() || suggested();
        const value = parseFloat(String(f.value.value).replace(/[^\d.]/g, '')) || 0;
        if (!client) { err(isNew ? 'اكتب اسم العميل الجديد' : 'اختر العميل'); (isNew ? f.cname : f.client).focus(); return; }
        if (!name) { err('اكتب اسم المشروع، أو اختر نوع العمل ليُقترح الاسم'); f.name.focus(); return; }
        if (f.deadline.value && f.start.value && f.deadline.value < f.start.value) { err('موعد التسليم قبل تاريخ الاستلام'); return; }
        if (navigator.onLine === false) { err('لا يوجد اتصال بالإنترنت'); return; }
        const go = $('.pn-go'), label = go.innerHTML;
        busy = true;
        go.disabled = true;
        go.innerHTML = '<span class="pn-spin"></span> جاري الإنشاء...';
        $('.pn-err').hidden = true;
        try {
            const phone = isNew ? f.cphone.value.trim() : '';
            if (isNew) await run('saveClientToSheet', { clientName: client, companyName: client, phone, invitedBy: '', rowIndex: '' });
            const data = {
                rowIndex: '', name, client, value, progress: 0, deadline: f.deadline.value, startDate: f.start.value || ymd(today()),
                status: ACTIVE, steps: steps().map(text => ({ text, done: false })), notes: f.notes.value.trim(), type: (st.type || OTHER).id
            };
            const res = await run('saveProjectToSheet', data);
            st.made = Object.assign({}, data, { rowIndex: res && res.rowIndex, code: res && res.code, phone });
            busy = false;
            done();
            reload();
        } catch (e) {
            busy = false;
            err('تعذّر الإنشاء: ' + ((e && e.message) || e || 'تحقّق من الاتصال'));
        } finally {
            go.disabled = false;
            go.innerHTML = label;
        }
    }

    // ── بعد الإنشاء: رابط التتبع، رسالة الاستلام للعميل، الفاتورة، فتح المشروع ──
    function receivedText(m) {
        const C = typeof clientsData !== 'undefined' ? clientsData : [];
        const c = C.find(x => x.company === m.client || x.name === m.client) || {};
        const link = c.token && window.RNAN ? RNAN.portalUrl(c.token) : (m.code && window.RNAN ? RNAN.trackUrl(m.code) : '');
        return `شكرًا لاختياركم رنان لخدمات التصميم، يسعدنا ثقتكم بنا\n\nتم استلام طلبكم بنجاح\nاسم المشروع: ${m.name}`
            + (m.code ? `\nرقم التتبع: ${m.code}` : '') + (m.deadline ? `\nموعد التسليم المتوقع: ${longDate(m.deadline)}` : '')
            + (link ? `\n\nلمتابعة حالة العمل والتفاصيل، هذه صفحتكم الخاصة:\n${link}` : '') + `\n\nرنان – لأن التفاصيل تصنع الفرق`;
    }
    function done() {
        const m = st.made;
        const C = typeof clientsData !== 'undefined' ? clientsData : [];
        const phone = m.phone || (C.find(x => x.company === m.client || x.name === m.client) || {}).phone || '';
        const inv = pendingInv(m.client);
        const wa = phone && window.RNAN ? RNAN.waLink(phone, receivedText(m)) : '';
        F().hidden = true;
        $('.pn-head').hidden = true;
        const box = $('.pn-done');
        box.innerHTML = `<div class="pn-ok">
                <span class="pn-ok-ic">${ic('check')}</span>
                <h3>أُنشئ المشروع</h3>
                <p>«${esc(m.name)}» لـ ${esc(m.client)}${m.deadline ? ` · التسليم ${longDate(m.deadline)}` : ''}</p>
                ${m.code ? `<button type="button" class="pn-code" data-done="track">${ic('qr_code_2')}<span class="en-num" dir="ltr">${esc(m.code)}</span><em>نسخ رابط التتبع</em></button>` : ''}
            </div>
            <p class="pn-next-t">الخطوة التالية</p>
            <div class="pn-next">
                ${wa ? `<a class="pn-act wa" href="${esc(wa)}" target="_blank" rel="noopener" data-done="wa">${ic('chat')}<span><b>أرسل للعميل تأكيد الاستلام</b><small>رسالة واتساب جاهزة برقم التتبع وصفحته</small></span></a>` : ''}
                ${m.value && inv ? `<button type="button" class="pn-act" data-done="addinv">${ic('playlist_add')}<span><b>إضافته للفاتورة المعلّقة</b><small class="en-num" dir="ltr">${esc(inv.number)}</small></span></button>` : ''}
                ${m.value ? `<button type="button" class="pn-act" data-done="invoice">${ic('receipt_long')}<span><b>إصدار فاتورة</b><small><span class="en-num">${num(m.value)}</span> ر.س بحالة «قيد الانتظار»</small></span></button>` : ''}
                <button type="button" class="pn-act" data-done="open">${ic('open_in_new')}<span><b>فتح المشروع</b><small>عرض السعر، الحالة، وكل التفاصيل</small></span></button>
            </div>
            <footer class="pn-foot">
                <button type="button" class="pn-cancel" data-done="again">${ic('add')} مشروع آخر</button>
                <button type="button" class="pn-go" data-x>تم</button>
            </footer>`;
        box.hidden = false;
        box.scrollTop = 0;
    }
    async function after(what, btn) {
        const m = st && st.made;
        if (!m) return;
        if (what === 'wa') return;
        if (what === 'again') return open();
        if (what === 'track') {
            const url = window.RNAN ? RNAN.trackUrl(m.code) : '';
            if (typeof copyText === 'function') copyText(url, null); else if (navigator.clipboard) navigator.clipboard.writeText(url);
            btn.querySelector('em').textContent = 'تم النسخ ✓';
            return setTimeout(() => { if (btn.isConnected) btn.querySelector('em').textContent = 'نسخ رابط التتبع'; }, 1600);
        }
        if (what === 'open') {
            const find = () => (typeof projectsData !== 'undefined' ? projectsData : []).findIndex(p => p.rowIndex === m.rowIndex);
            let i = find();
            if (i < 0) { await reload(); i = find(); }
            close();
            if (i > -1) setTimeout(() => full('edit', i), 200);
            return;
        }
        if (btn.disabled) return;
        const label = btn.innerHTML;
        btn.disabled = true;
        btn.querySelector('b').textContent = 'جاري التنفيذ...';
        const footerText = typeof DEFAULT_BANK_INFO !== 'undefined' ? DEFAULT_BANK_INFO : '';
        try {
            if (what === 'addinv') {
                const inv = pendingInv(m.client);
                if (!inv) throw new Error('لم تعد هناك فاتورة معلّقة');
                const items = (inv.items || []).concat([{ desc: 'مشروع: ' + m.name, qty: 1, price: m.value }]);
                const total = items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0);
                await run('saveInvoiceToSheet', { invoiceNumber: inv.number, clientSelect: inv.client, issueDate: inv.date, status: inv.status, totalAmount: total, items, notes: inv.notes, footerText: inv.footerText });
                btn.classList.add('ok');
                btn.innerHTML = `${ic('check_circle')}<span><b>أُضيف للفاتورة</b><small class="en-num" dir="ltr">${esc(inv.number)}</small></span>`;
                const other = wrap.querySelector('[data-done="invoice"]');
                if (other) other.remove();
                reload();
            } else if (what === 'invoice') {
                const d = ymd(today()), items = [{ desc: 'مشروع: ' + m.name, qty: 1, price: m.value }];
                const res = await run('saveInvoiceToSheet', { invoiceNumber: 'تلقائي', clientSelect: m.client, issueDate: d, status: 'قيد الانتظار', totalAmount: m.value, items, notes: '', footerText });
                close();
                reload();
                if (typeof printInvoiceDirectly === 'function') printInvoiceDirectly({ number: res && res.id, client: m.client, date: d, amount: m.value, items, notes: '', footerText, status: 'قيد الانتظار' });
            }
        } catch (e) {
            btn.disabled = false;
            btn.innerHTML = label;
            toast('تعذّر التنفيذ: ' + ((e && e.message) || e));
        }
    }

    // «مشروع جديد» من أي مكان يفتح هذه النافذة؛ التعديل يبقى على نافذة المشروع الكاملة
    let full = null;
    function hook() {
        if (full || typeof window.openProjectModal !== 'function') return;
        full = window.openProjectModal;
        window.openProjectModal = function (mode) {
            if (mode === 'new') return open();
            return full.apply(this, arguments);
        };
    }

    // زر عائم في صفحة المشاريع على الجوال
    function fab() {
        const page = document.getElementById('projects-page');
        if (!page) return;
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pn-fab no-print admin-only';
        b.setAttribute('aria-label', 'مشروع جديد');
        b.innerHTML = ic('add');
        b.addEventListener('click', () => open());
        document.body.appendChild(b);
        const sync = () => b.classList.toggle('show', !page.classList.contains('hidden'));
        new MutationObserver(sync).observe(page, { attributes: true, attributeFilter: ['class'] });
        sync();
    }

    function init() { hook(); fab(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    window.ProjectsUI = { active, compose: open, quickAdd: open, due, typeOf, TYPES };
})();
