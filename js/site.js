/**
 * الموقع العام لرنان: معرض الأعمال، طلب الخدمة، تتبّع الطلب، والتواصل.
 * يقرأ/يكتب في Firebase مباشرة بمفاتيح محدّدة فقط (لا يستعلم عن بيانات العملاء).
 */
(function () {
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
    const E = RNAN.esc;
    const params = new URLSearchParams(location.search);
    const WORKS_STEP = 4; // أعمال تظهر أولًا، ويضيف «عرض المزيد» ضعفها كل مرة

    const state = {
        site: {},
        settings: {},
        works: RNAN.DEFAULT_PORTFOLIO.slice(),
        filter: 'all',
        limit: 4,       // عدد الأعمال الظاهرة في المعرض
        shown: 0,
        lbIndex: 0,
        client: null,   // عميل قادم من رابطه الخاص (?k=)
        referrer: null  // صاحب رمز الدعوة (?ref=)
    };

    // مهلة لعمليات Firebase: بدون اتصال تبقى الوعود معلّقة للأبد
    function withTimeout(promise, ms) {
        return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms || 15000))]);
    }
    const read = (path) => withTimeout(db.ref(path).once('value')).then(s => s.val());

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

    // ═══ واجهة عامة: تنقّل، ظهور، توهّج البطاقات ═══
    function initChrome() {
        const nav = $('#nav');
        const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        const menu = $('#mobile-menu');
        const toggle = (open) => {
            menu.classList.toggle('open', open);
            menu.setAttribute('aria-hidden', String(!open));
            $('#nav-toggle').setAttribute('aria-expanded', String(open));
            document.body.style.overflow = open ? 'hidden' : '';
        };
        $('#nav-toggle').addEventListener('click', () => toggle(true));
        $('#menu-close').addEventListener('click', () => toggle(false));
        $$('#mobile-menu a').forEach(a => a.addEventListener('click', () => toggle(false)));

        // الرابط النشط حسب القسم الظاهر
        const links = $$('#nav-links a');
        const spy = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (!en.isIntersecting) return;
                links.forEach(a => a.classList.toggle('active', a.dataset.nav === en.target.id));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        ['home', 'services', 'work', 'how', 'track', 'contact'].forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });

        observeReveal(document);

        document.addEventListener('pointermove', e => {
            const card = e.target.closest && e.target.closest('.card');
            if (!card) return;
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }, { passive: true });

        // ميلان خفيف لعرض الأعمال مع حركة المؤشر
        const stage = $('#showcase-stage');
        const showcase = $('#showcase');
        if (stage && window.matchMedia('(hover: hover)').matches) {
            showcase.addEventListener('pointermove', e => {
                const r = showcase.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - .5;
                const y = (e.clientY - r.top) / r.height - .5;
                stage.style.transform = `rotateX(${16 - y * 8}deg) rotateY(${x * 10}deg)`;
            });
            showcase.addEventListener('pointerleave', () => { stage.style.transform = ''; });
        }

        $('#year').textContent = new Date().getFullYear();
    }

    let revealObserver;
    function observeReveal(root) {
        if (!('IntersectionObserver' in window)) { $$('.reveal', root).forEach(el => el.classList.add('in')); return; }
        revealObserver = revealObserver || new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        $$('.reveal:not(.in)', root).forEach(el => revealObserver.observe(el));
    }

    // ═══ الخدمات + شريط الخدمات ═══
    function renderServices() {
        $('#services-grid').innerHTML = RNAN.SERVICES.map((s, i) => `
            <article class="card service reveal" data-delay="${i % 3}">
                <div class="service-top">
                    <span class="service-icon">${icon(s.icon.replace('i-', ''))}</span>
                    <span class="service-num en">0${i + 1}</span>
                </div>
                <h3>${E(s.title)}</h3>
                <p>${E(s.desc)}</p>
                <div class="tags">${s.tags.map(t => `<span class="tag">${E(t)}</span>`).join('')}</div>
                <a href="#request" class="service-link" data-service="${s.id}">اطلب هذه الخدمة ${icon('arrow')}</a>
            </article>`).join('');

        const group = RNAN.SERVICES.map(s => `<span class="marquee-item"><b>${E(s.title)}</b><span class="star">✦</span></span>`).join('');
        $('#marquee-track').innerHTML = group + group;

        $('#footer-services').innerHTML = RNAN.SERVICES.map(s => `<li><a href="#request" data-service="${s.id}">${E(s.title)}</a></li>`).join('');

        $('#service-chips').innerHTML = RNAN.SERVICES.map(s =>
            `<button type="button" class="chip-opt" aria-pressed="false" data-value="${s.id}">${icon('check')}${E(s.short)}</button>`).join('');

        document.addEventListener('click', e => {
            const link = e.target.closest('[data-service]');
            if (link && link.dataset.service) preselectService(link.dataset.service);
        });
        observeReveal($('#services'));
    }

    function preselectService(id) {
        const chip = $(`#service-chips [data-value="${id}"]`);
        if (chip) chip.setAttribute('aria-pressed', 'true');
    }

    // ═══ معرض الأعمال ═══
    function renderFilters() {
        const used = new Set(state.works.map(w => w.category));
        const cats = [{ id: 'all', title: 'الكل' }].concat(RNAN.PORTFOLIO_CATEGORIES.filter(c => used.has(c.id)));
        $('#work-filters').innerHTML = cats.map(c =>
            `<button class="filter-btn${state.filter === c.id ? ' active' : ''}" role="tab" aria-selected="${state.filter === c.id}" data-filter="${c.id}">${E(c.title)}</button>`).join('');
    }

    function visibleWorks() {
        return state.works.filter(w => state.filter === 'all' || w.category === state.filter);
    }

    function renderWorks() {
        const all = visibleWorks();
        const list = all.slice(0, state.limit);
        const catTitle = id => (RNAN.PORTFOLIO_CATEGORIES.find(c => c.id === id) || {}).title || '';
        // كل أربعة أعمال: [عريض + عادي] ثم [عادي + عريض]؛ آخر مجموعة ناقصة تملأ صفها بلا فراغ
        const n = list.length;
        const layout = i => {
            if (n < 3) return '';
            const size = Math.min(4, n - (i - i % 4));
            if (size === 4) return i % 4 === 0 || i % 4 === 3 ? ' featured' : '';
            if (size === 2) return i % 4 === 0 ? ' featured' : '';
            if (size === 1) return ' lone';
            return '';
        };
        const grid = $('#work-grid');
        grid.classList.toggle('few', n > 0 && n < 3);
        grid.style.setProperty('--n', n);
        // ما ظهر سابقًا لا يُعاد تحريكه عند «عرض المزيد»
        grid.innerHTML = list.map((w, i) => `
            <button class="work reveal${i < state.shown ? ' in' : ''}${layout(i)}" data-index="${i}" data-delay="${i % 4}" aria-label="${E(w.title)}">
                <img src="${E(w.thumb)}" alt="${E(w.title)}" loading="lazy" decoding="async">
                <span class="work-info">
                    <span><small>${E(catTitle(w.category))}</small><strong>${E(w.title)}</strong></span>
                    <span class="work-arrow">${icon('arrow')}</span>
                </span>
            </button>`).join('') || '<p style="grid-column:1/-1;text-align:center;color:var(--text-3)">لا توجد أعمال في هذا التصنيف بعد.</p>';
        state.shown = n;
        observeReveal($('#work-grid'));

        const rest = all.length - n;
        $('#work-more').hidden = all.length <= WORKS_STEP;
        $('#work-more-btn').innerHTML = rest > 0
            ? `عرض المزيد <span class="count en">+${rest}</span> ${icon('chevron-down')}`
            : `عرض أقل ${icon('chevron-down', 'flip')}`;
    }

    function initWork() {
        $('#work-filters').addEventListener('click', e => {
            const b = e.target.closest('.filter-btn');
            if (!b) return;
            state.filter = b.dataset.filter;
            state.limit = WORKS_STEP;
            state.shown = 0;
            renderFilters();
            renderWorks();
        });
        $('#work-more-btn').addEventListener('click', () => {
            if (state.limit < visibleWorks().length) {
                state.limit += WORKS_STEP * 2;
                renderWorks();
            } else {
                state.limit = WORKS_STEP;
                state.shown = WORKS_STEP;
                renderWorks();
                document.getElementById('work').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        $('#work-grid').addEventListener('click', e => {
            const w = e.target.closest('.work');
            if (w) openLightbox(+w.dataset.index);
        });
        $('#lb-close').addEventListener('click', closeLightbox);
        $('#lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });
        $('#lb-prev').addEventListener('click', () => stepLightbox(-1));
        $('#lb-next').addEventListener('click', () => stepLightbox(1));
        $('#lb-cta').addEventListener('click', () => {
            const w = visibleWorks()[state.lbIndex];
            if (w) preselectService(w.category);
            closeLightbox();
        });
        document.addEventListener('keydown', e => {
            if (!$('#lightbox').classList.contains('open')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') stepLightbox(1);
            if (e.key === 'ArrowRight') stepLightbox(-1);
        });
        renderFilters();
        renderWorks();
    }

    function openLightbox(i) {
        const list = visibleWorks();
        const w = list[i];
        if (!w) return;
        state.lbIndex = i;
        const img = $('#lb-img');
        img.src = w.thumb;
        img.alt = w.title;
        // النسخة الكبيرة تُحمّل عند الطلب فقط
        if (w.hasFull && window.db) {
            read('portfolioImages/' + w.id).then(full => { if (full && state.lbIndex === i) img.src = full; }).catch(() => {});
        }
        $('#lb-cat').textContent = (RNAN.PORTFOLIO_CATEGORIES.find(c => c.id === w.category) || {}).title || '';
        $('#lb-title').textContent = w.title;
        $('#lb-desc').textContent = w.description || '';
        $('#lb-meta').innerHTML = [
            w.client ? `<div><span>العميل</span><b>${E(w.client)}</b></div>` : '',
            w.year ? `<div><span>السنة</span><b class="en">${E(w.year)}</b></div>` : ''
        ].join('');
        $('#lb-tags').innerHTML = (w.tags || []).map(t => `<span class="tag">${E(t)}</span>`).join('');
        const multi = list.length > 1;
        $('#lb-prev').hidden = !multi;
        $('#lb-next').hidden = !multi;
        $('#lightbox').classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function stepLightbox(d) {
        const n = visibleWorks().length;
        openLightbox((state.lbIndex + d + n) % n);
    }
    function closeLightbox() {
        $('#lightbox').classList.remove('open');
        document.body.style.overflow = '';
    }

    // ═══ بيانات التواصل والإحصائيات (من لوحة الإدارة) ═══
    function waNumber() {
        const s = state.site, g = state.settings;
        const n = s.whatsapp || s.phone || g.phone || '';
        return RNAN.intlPhone(n).length >= 9 ? n : '';
    }

    function renderContact() {
        const s = state.site, g = state.settings;
        const wa = waNumber();
        const phone = s.phone || g.phone || '';
        const email = s.email || g.email || '';
        const cards = [];
        if (wa) cards.push(`<a class="card contact-card reveal" href="${RNAN.waLink(wa, 'السلام عليكم، أرغب بالاستفسار عن خدماتكم')}" target="_blank" rel="noopener"><span class="ci">${icon('whatsapp')}</span><div><small>واتساب</small><b class="en">${E(wa)}</b></div></a>`);
        if (phone) cards.push(`<a class="card contact-card reveal" data-delay="1" href="tel:${E(phone)}"><span class="ci">${icon('phone')}</span><div><small>اتصال</small><b class="en">${E(phone)}</b></div></a>`);
        if (email) cards.push(`<a class="card contact-card reveal" data-delay="2" href="mailto:${E(email)}"><span class="ci">${icon('mail')}</span><div><small>البريد الإلكتروني</small><b class="en">${E(email)}</b></div></a>`);
        if (s.city || s.hours) cards.push(`<div class="card contact-card reveal" data-delay="3"><span class="ci">${icon(s.city ? 'pin' : 'clock')}</span><div>${s.city ? `<small>الموقع</small><b>${E(s.city)}</b>` : ''}${s.hours ? `<small style="margin-top:6px">ساعات العمل</small><b>${E(s.hours)}</b>` : ''}</div></div>`);
        const socials = socialLinks();
        if (socials) cards.push(`<div class="card contact-card wide reveal"><div style="flex:1"><small>تابعنا</small><b>أحدث أعمالنا أولًا بأول</b></div><div class="socials">${socials}</div></div>`);
        if (cards.length % 2 === 1 && !socials) cards[cards.length - 1] = cards[cards.length - 1].replace('class="card contact-card', 'class="card contact-card wide');
        $('#contact-cards').innerHTML = cards.join('') || `<div class="card contact-card wide"><span class="ci">${icon('send')}</span><div><small>راسلنا</small><b>استخدم النموذج وسنعود إليك قريبًا</b></div></div>`;
        $('#footer-socials').innerHTML = socials;
        observeReveal($('#contact-cards'));

        if (wa) {
            const fab = $('#wa-fab');
            fab.href = RNAN.waLink(wa, 'السلام عليكم، أرغب بالاستفسار عن خدماتكم');
            fab.hidden = false;
            $('#alt-contact-link').href = RNAN.waLink(wa, 'السلام عليكم، أرغب بطلب خدمة تصميم');
            $('#alt-contact').hidden = false;
        }
    }

    function socialLinks() {
        const s = state.site;
        const map = [['instagram', 'instagram', 'إنستغرام'], ['x', 'xlogo', 'إكس'], ['behance', 'behance', 'بيهانس'], ['linkedin', 'linkedin', 'لينكدإن']];
        return map.filter(([k]) => s[k]).map(([k, ic, label]) =>
            `<a class="social" href="${E(s[k])}" target="_blank" rel="noopener" aria-label="${label}">${icon(ic)}</a>`).join('');
    }

    function renderStats() {
        const s = state.site;
        const items = [['statProjects', 'مشروع منجز'], ['statClients', 'عميل وثق بنا'], ['statYears', 'سنوات خبرة']]
            .filter(([k]) => parseInt(s[k]) > 0);
        if (!items.length) return;
        const box = $('#stats');
        box.style.setProperty('--cols', items.length);
        box.innerHTML = items.map(([k, label]) => `<div class="stat"><b class="grad-text en" data-count="${parseInt(s[k])}">0</b><span>${label}</span></div>`).join('');
        $('#stats-wrap').hidden = false;
        observeReveal($('#stats-wrap'));
        const io = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            io.disconnect();
            $$('[data-count]', box).forEach(el => {
                const target = +el.dataset.count, t0 = performance.now();
                const tick = now => {
                    const p = Math.min(1, (now - t0) / 1400);
                    el.textContent = '+' + Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US');
                    if (p < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            });
        });
        io.observe(box);
    }

    // ═══ طلب الخدمة ═══
    function initRequestForm() {
        const form = $('#request-form');
        form.addEventListener('click', e => {
            const chip = e.target.closest('.chip-opt');
            if (!chip) return;
            const group = chip.parentElement;
            const pressed = chip.getAttribute('aria-pressed') === 'true';
            if (group.dataset.single) $$('.chip-opt', group).forEach(c => c.setAttribute('aria-pressed', 'false'));
            chip.setAttribute('aria-pressed', String(!pressed));
            group.classList.remove('invalid');
        });
        $$('.input', form).forEach(inp => inp.addEventListener('input', () => inp.classList.remove('invalid')));
        form.addEventListener('submit', submitRequest);
        $('#copy-code').addEventListener('click', () => copy($('#success-code').textContent));
        $('#success-track').addEventListener('click', () => {
            $('#track-input').value = $('#success-code').textContent.replace('RN-', '');
            setTimeout(() => lookupTrack($('#success-code').textContent), 400);
        });
    }

    function showFormError(id, msg) {
        const el = $(id);
        el.textContent = msg;
        el.classList.toggle('show', !!msg);
    }

    async function submitRequest(e) {
        e.preventDefault();
        const form = e.target;
        if ($('#rq-website').value) return; // فخ الروبوتات
        const services = $$('#service-chips [aria-pressed="true"]').map(c => c.dataset.value);
        const pick = name => { const c = $(`[data-single="${name}"] [aria-pressed="true"]`, form); return c ? c.dataset.value : ''; };
        const data = {
            name: $('#rq-name').value.trim(),
            company: $('#rq-company').value.trim(),
            phone: $('#rq-phone').value.trim(),
            email: $('#rq-email').value.trim(),
            details: $('#rq-details').value.trim(),
            links: $('#rq-links').value.trim(),
            budget: pick('budget'),
            timeline: pick('timeline')
        };

        let firstBad = null;
        const bad = (el) => { el.classList.add('invalid'); firstBad = firstBad || el; };
        if (!services.length) bad($('#service-chips'));
        if (data.name.length < 2) bad($('#rq-name'));
        if (RNAN.intlPhone(data.phone).length < 9) bad($('#rq-phone'));
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) bad($('#rq-email'));
        if (data.details.length < 10) bad($('#rq-details'));
        if (firstBad) {
            showFormError('#request-error', !services.length ? 'اختر خدمة واحدة على الأقل، وأكمل الحقول المطلوبة.' : 'تأكّد من الحقول المطلوبة: الاسم، رقم جوال صحيح، ووصف مختصر لمشروعك.');
            firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        let last = 0;
        try { last = +localStorage.getItem('rnan-last-request') || 0; } catch (err) { }
        if (Date.now() - last < 60000) {
            showFormError('#request-error', 'أرسلت طلبًا للتو. انتظر دقيقة قبل إرسال طلب آخر.');
            return;
        }
        showFormError('#request-error', '');

        const btn = $('#request-submit');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `${icon('clock', 'spin')} جاري الإرسال...`;
        try {
            let code = RNAN.newTrackCode();
            for (let i = 0; i < 4 && (await read('track/' + code)); i++) code = RNAN.newTrackCode();

            const req = Object.assign(data, {
                code: code,
                services: services,
                status: 'جديد',
                source: state.client ? 'portal' : 'website',
                createdAt: new Date().toISOString()
            });
            if (state.client) req.clientKey = state.client.key;
            if (state.referrer && (!state.client || state.client.key !== state.referrer.key)) {
                req.referrerKey = state.referrer.key;
                req.referrerName = state.referrer.name;
            }
            const updates = {};
            updates['requests/' + db.ref('requests').push().key] = req;
            updates['track/' + code] = RNAN.trackFromRequest(req);
            await withTimeout(db.ref().update(updates));
            try { localStorage.setItem('rnan-last-request', String(Date.now())); } catch (err) { }

            form.hidden = true;
            $('#success-code').textContent = code;
            $('#success-track').href = '#track';
            const wa = waNumber();
            if (wa) {
                const link = $('#success-wa');
                link.href = RNAN.waLink(wa, `السلام عليكم، أرسلت طلبًا من الموقع برقم ${code} (${RNAN.serviceTitles(services)}). الاسم: ${data.name}`);
                link.hidden = false;
            }
            $('#request-success').hidden = false;
            $('#request-success').scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) {
            showFormError('#request-error', err.message === 'timeout'
                ? 'تعذّر الاتصال. تأكّد من الإنترنت وحاول مرة أخرى.'
                : 'حدث خطأ أثناء الإرسال، حاول مرة أخرى.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    // عميل قادم من صفحته الخاصة أو صديق قادم برابط دعوة
    async function initVisitorContext() {
        const banner = $('#request-banner');
        const token = params.get('k');
        let ref = params.get('ref');
        try { if (ref) sessionStorage.setItem('rnan-ref', ref); else ref = sessionStorage.getItem('rnan-ref'); } catch (err) { }

        if (token) {
            try {
                const key = await read('portal/' + token);
                const c = key ? await read('clients/' + key) : null;
                if (c) {
                    state.client = { key: key, name: c.name || c.company };
                    $('#rq-name').value = c.name || '';
                    $('#rq-company').value = c.company && c.company !== c.name ? c.company : '';
                    $('#rq-phone').value = c.phone || '';
                    $('#rq-email').value = c.email || '';
                    banner.innerHTML = `${icon('shield')} <span>أهلًا ${E(state.client.name)} — سيُضاف هذا الطلب إلى صفحتك الخاصة تلقائيًا.</span>`;
                    banner.hidden = false;
                }
            } catch (err) { }
        }
        if (ref && !state.client) {
            try {
                const key = await read('referrals/' + String(ref).toUpperCase());
                const c = key ? await read('clients/' + key) : null;
                if (c) {
                    state.referrer = { key: key, name: c.name || c.company };
                    const first = String(state.referrer.name).split(' ')[0];
                    banner.innerHTML = `${icon('gift')} <span>دعاك ${E(first)} إلى رنان — أهلًا بك! اطلب خدمتك وسنعتني بك جيدًا.</span>`;
                    banner.hidden = false;
                }
            } catch (err) { }
        }
    }

    // ═══ تتبّع الطلب ═══
    function initTrack() {
        $('#track-form').addEventListener('submit', e => {
            e.preventDefault();
            lookupTrack($('#track-input').value);
        });
        const fromUrl = params.get('track');
        if (fromUrl) {
            $('#track-input').value = RNAN.normalizeCode(fromUrl).replace('RN-', '');
            lookupTrack(fromUrl);
        }
    }

    async function lookupTrack(raw) {
        const code = RNAN.normalizeCode(raw);
        const box = $('#track-result');
        if (!code || code.length < 6) {
            box.innerHTML = `<div class="track-empty">أدخل رقم التتبّع كاملًا، مثل <b class="mono">RN-7K3QX</b>.</div>`;
            return;
        }
        box.innerHTML = `<div class="track-result"><div class="skeleton" style="height:64px;border-radius:16px;margin-bottom:16px"></div><div class="skeleton" style="height:120px;border-radius:16px"></div></div>`;
        try {
            const t = await read('track/' + code);
            if (!t) {
                box.innerHTML = `<div class="track-empty"><b>لم نجد طلبًا بالرقم <span class="mono">${E(code)}</span>.</b><br>تأكّد من الرقم، أو تواصل معنا وسنساعدك.</div>`;
                return;
            }
            box.innerHTML = renderTrack(t);
            requestAnimationFrame(() => { const bar = $('.tr-progress .bar i', box); if (bar) bar.style.width = bar.dataset.w + '%'; });
            if (location.hash !== '#track') document.getElementById('track').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (err) {
            box.innerHTML = `<div class="track-empty"><b>تعذّر الاتصال.</b> تأكّد من الإنترنت وحاول مرة أخرى.</div>`;
        }
    }

    function renderTrack(t) {
        const stage = parseInt(t.stage) || 0;
        const stateCls = t.state === 'hold' ? 'hold' : (t.state === 'cancelled' ? 'cancelled' : '');
        const stages = RNAN.STAGES.map((s, i) => {
            let cls = i < stage || t.state === 'done' ? 'done' : (i === stage ? 'now ' + stateCls : '');
            const inner = cls.startsWith('done') ? icon('check') : (cls.includes('cancelled') ? icon('x') : `<span class="en">${i + 1}</span>`);
            return `<div class="stage ${cls}"><span class="stage-dot">${inner}</span><div><b>${s.title}</b><span>${s.hint}</span></div></div>`;
        }).join('');
        const steps = (t.steps || []);
        // مراجعة التصميم: ترفعه الإدارة من نافذة المشروع ويفتحه العميل من هنا
        const rv = t.review && t.review.k && (!t.review.until || Date.parse(t.review.until) > Date.now()) ? t.review : null;
        const review = rv ? `<a class="tr-review" href="${E(RNAN.pageUrl('review.html', { k: rv.k }))}"><span class="tr-review-ic">${icon('eye')}</span><span><b>التصميم جاهز لمراجعتك${rv.round > 1 ? ' — النسخة ' + rv.round : ''}</b><small>شاهده واكتب ملاحظاتك عليه مباشرة، أو اعتمده إن كان مناسبًا</small></span>${icon('arrow')}</a>` : '';
        const progress = stage >= 2 ? `
            <div class="tr-progress">
                <div class="tr-progress-top"><span>نسبة الإنجاز</span><b class="en">${parseInt(t.progress) || 0}%</b></div>
                <div class="bar"><i data-w="${parseInt(t.progress) || 0}"></i></div>
                ${steps.length ? `<ul class="substeps">${steps.map(s => `<li class="${s.done ? 'done' : ''}"><span class="ck">${s.done ? icon('check') : ''}</span>${E(s.text)}</li>`).join('')}</ul>` : ''}
            </div>` : '';
        const days = RNAN.daysUntil(t.deadline);
        const meta = [
            `<div><span>تاريخ الطلب</span><b>${RNAN.fmtDate(t.createdAt)}</b></div>`,
            t.deadline ? `<div><span>موعد التسليم</span><b>${RNAN.fmtDate(t.deadline)}${days !== null && t.state !== 'done' && days >= 0 ? ` <small style="color:var(--text-3)">(${RNAN.inDays(days)})</small>` : ''}</b></div>` : '',
            `<div><span>آخر تحديث</span><b>${RNAN.fmtDate(t.updatedAt)}</b></div>`
        ].join('');
        return `
            <div class="track-result">
                <div class="tr-head">
                    <div><small class="mono">${E(t.code)}</small><h3>${E(t.title)}</h3></div>
                    <span class="status-badge ${stateCls}">${E(t.label)}</span>
                </div>
                ${review}
                <div class="stages">${stages}</div>
                ${progress}
                <div class="tr-meta">${meta}</div>
            </div>`;
    }

    // ═══ نموذج التواصل ═══
    function initContactForm() {
        const form = $('#contact-form');
        $$('.input', form).forEach(inp => inp.addEventListener('input', () => inp.classList.remove('invalid')));
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if ($('#ct-website').value) return;
            const msg = { name: $('#ct-name').value.trim(), contact: $('#ct-contact').value.trim(), message: $('#ct-message').value.trim() };
            let ok = true;
            if (msg.name.length < 2) { $('#ct-name').classList.add('invalid'); ok = false; }
            if (msg.contact.length < 6) { $('#ct-contact').classList.add('invalid'); ok = false; }
            if (msg.message.length < 5) { $('#ct-message').classList.add('invalid'); ok = false; }
            if (!ok) return showFormError('#contact-error', 'أكمل الحقول المطلوبة.');
            showFormError('#contact-error', '');
            const btn = $('#contact-submit');
            const original = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `${icon('clock', 'spin')} جاري الإرسال...`;
            try {
                msg.createdAt = new Date().toISOString();
                msg.isRead = false;
                await withTimeout(db.ref('messages').push(msg));
                form.hidden = true;
                $('#contact-success').hidden = false;
            } catch (err) {
                showFormError('#contact-error', 'تعذّر الإرسال، حاول مرة أخرى.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = original;
            }
        });
    }

    // ═══ تحميل البيانات ═══
    async function loadData() {
        if (!window.db) return;
        try {
            const [site, settings, works] = await Promise.all([
                read('settings/site').catch(() => null),
                Promise.all(['phone', 'email', 'agency_name'].map(k => read('settings/' + k).catch(() => null)))
                    .then(([phone, email, agency_name]) => ({ phone, email, agency_name })),
                read('portfolio').catch(() => null)
            ]);
            state.site = site || {};
            state.settings = settings || {};
            // رقم الإعدادات الافتراضي في النظام وهمي (966555555555) فلا يُعرض
            if (/^0?9665{9}$/.test(String(state.settings.phone || ''))) state.settings.phone = '';
            if (works) {
                const list = Object.keys(works).map(id => Object.assign({ id: id }, works[id])).filter(w => w.thumb);
                if (list.length) {
                    state.works = list.sort((a, b) => (a.order || 0) - (b.order || 0));
                    state.filter = 'all';
                    state.limit = WORKS_STEP;
                    state.shown = 0;
                    renderFilters();
                    renderWorks();
                    // صور الواجهة الرئيسية من أحدث الأعمال
                    const shots = $$('#showcase-stage img');
                    state.works.slice(0, 3).forEach((w, i) => { const order = [2, 0, 1][i]; if (shots[order]) shots[order].src = w.thumb; });
                }
            }
        } catch (err) { }
        renderContact();
        renderStats();
    }

    document.addEventListener('DOMContentLoaded', () => {
        initChrome();
        renderServices();
        initWork();
        initRequestForm();
        initTrack();
        initContactForm();
        renderContact();
        if (params.get('service')) preselectService(params.get('service'));
        loadData();
        initVisitorContext();
    });
})();
