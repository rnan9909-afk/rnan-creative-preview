// تطبيق رنان على الجوال: التثبيت (beforeinstallprompt أو شرح Safari)، وعند الفتح كتطبيق مثبّت
// تتحوّل القائمة الجانبية إلى شريط سفلي بأهم أربع صفحات و«المزيد» للباقي. العناصر تُبنى من #sidebar نفسه
// فأي زر يُضاف للقائمة يظهر هنا تلقائيًا. الأنماط في css/pwa.css.
(function () {
    const html = document.documentElement;
    const mq = q => window.matchMedia && window.matchMedia(q).matches;
    const isApp = () => mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)') || navigator.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const store = {
        get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } }
    };
    const toast = m => (window.showAdminToast ? window.showAdminToast(m) : null);
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    let deferred = null;
    const refresh = () => {
        const app = isApp();
        html.classList.toggle('rn-app', app);
        html.classList.toggle('rn-installable', !app && (!!deferred || !store.get('rn-installed')));
        if (app) buildTabbar();
    };

    // ── التثبيت ──
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferred = e;
        store.set('rn-installed', '');
        refresh();
        maybePromo();
    });
    window.addEventListener('appinstalled', () => {
        deferred = null;
        store.set('rn-installed', '1');
        hidePromo();
        refresh();
        toast('تم تثبيت تطبيق رنان — تجده على الشاشة الرئيسية بالأيقونة الزرقاء');
    });

    async function install() {
        hidePromo();
        if (deferred) {
            const e = deferred;
            deferred = null;
            e.prompt();
            await e.userChoice.catch(() => null);
            refresh();
            return;
        }
        openSheet(guideHtml(), 'طريقة تثبيت التطبيق');
    }

    function guideHtml() {
        const step = (n, icon, title, hint) => `<li><span class="rn-step-ic">${ic(icon)}<em>${n}</em></span><div><b>${title}</b><small>${hint}</small></div></li>`;
        const steps = isIOS
            ? step(1, 'ios_share', 'اضغط زر المشاركة', 'في شريط Safari أسفل الشاشة (أو أعلاها في iPad).')
            + step(2, 'add_box', 'اختر «إضافة إلى الشاشة الرئيسية»', 'مرّر القائمة للأسفل إن لم تجده مباشرة.')
            + step(3, 'check_circle', 'اضغط «إضافة»', 'تظهر أيقونة رنان الزرقاء على شاشتك، افتح اللوحة منها.')
            : step(1, 'more_vert', 'افتح قائمة المتصفح', 'زر النقاط الثلاث أعلى الشاشة أو أسفلها.')
            + step(2, 'install_mobile', 'اختر «تثبيت التطبيق»', 'أو «إضافة إلى الشاشة الرئيسية» حسب المتصفح.')
            + step(3, 'check_circle', 'أكّد التثبيت', 'تظهر أيقونة رنان الزرقاء على شاشتك، افتح اللوحة منها.');
        return `<div class="rn-guide">
            <img class="rn-guide-ic" src="images/app/icon-192.png" alt="">
            <h3>ثبّت رنان على جوالك</h3>
            <p>تفتح لوحة التحكم بملء الشاشة وبقائمة سفلية، مثل أي تطبيق.</p>
            <ol class="rn-steps">${steps}</ol>
            <button type="button" class="rn-btn block" data-close>فهمت</button>
        </div>`;
    }

    // ── بطاقة الدعوة: مرة بعد الدخول على الجوال، وتُؤجَّل أسبوعين عند «لاحقًا» ──
    let promo = null, promoTimer = 0;
    function maybePromo() {
        const later = +store.get('rn-install-later') || 0;
        const login = document.getElementById('login-overlay');
        if (promo || isApp() || !html.classList.contains('rn-installable') || !mq('(max-width: 1023.98px)')) return;
        if (Date.now() - later < 14 * 864e5 || (login && !login.classList.contains('hidden'))) return;
        clearTimeout(promoTimer);
        promoTimer = setTimeout(() => {
            if (promo || !html.classList.contains('rn-installable')) return;
            promo = document.createElement('div');
            promo.className = 'rn-promo no-print';
            promo.setAttribute('role', 'dialog');
            promo.innerHTML = `<img src="images/app/icon-192.png" alt="">
                <div class="rn-promo-tx"><b>ثبّت رنان على جوالك</b><small>افتح اللوحة من الشاشة الرئيسية كتطبيق، بقائمة سفلية سريعة.</small></div>
                <div class="rn-promo-act"><button type="button" class="rn-btn sm" data-act="install">تثبيت</button><button type="button" class="rn-x" data-act="later" aria-label="لاحقًا">${ic('close')}</button></div>`;
            promo.addEventListener('click', e => {
                const act = e.target.closest('[data-act]');
                if (!act) return;
                if (act.dataset.act === 'later') { store.set('rn-install-later', String(Date.now())); hidePromo(); }
                else install();
            });
            document.body.appendChild(promo);
            requestAnimationFrame(() => requestAnimationFrame(() => promo && promo.classList.add('show')));
        }, 1600);
    }
    function hidePromo() {
        clearTimeout(promoTimer);
        if (!promo) return;
        const el = promo;
        promo = null;
        el.classList.remove('show');
        setTimeout(() => el.remove(), 450);
    }

    // ── اللوحة السفلية ──
    let wrap = null, sheetKind = '';
    function openSheet(body, label, kind) {
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'rn-sheet-wrap no-print';
            wrap.hidden = true;
            wrap.innerHTML = '<div class="rn-scrim" data-close></div><section class="rn-sheet" role="dialog" aria-modal="true"><div class="rn-grab"></div><div class="rn-sheet-body"></div></section>';
            document.body.appendChild(wrap);
            wrap.addEventListener('click', onSheetClick);
            dragToClose(wrap.querySelector('.rn-sheet'));
        }
        sheetKind = kind || '';
        wrap.querySelector('.rn-sheet').setAttribute('aria-label', label);
        wrap.querySelector('.rn-sheet-body').innerHTML = body;
        wrap.querySelector('.rn-sheet-body').scrollTop = 0;
        if (wrap.hidden) {
            wrap.hidden = false;
            history.pushState({ rnSheet: 1 }, '');
            requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
        }
        syncTabs();
    }
    function closeSheet(fromHistory) {
        if (!wrap || wrap.hidden) return;
        wrap.classList.remove('open');
        sheetKind = '';
        syncTabs();
        setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 420);
        if (!fromHistory && history.state && history.state.rnSheet) history.back();
    }
    window.addEventListener('popstate', () => closeSheet(true));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

    function onSheetClick(e) {
        if (e.target.closest('[data-close]')) return closeSheet();
        const tile = e.target.closest('[data-key]');
        if (tile) { closeSheet(); return go(tile.dataset.key); }
        const act = e.target.closest('[data-act]');
        if (!act) return;
        if (act.dataset.act === 'theme') {
            if (typeof window.toggleTheme === 'function') window.toggleTheme();
            act.innerHTML = ic(html.classList.contains('light-mode') ? 'dark_mode' : 'light_mode');
        } else if (act.dataset.act === 'logout') {
            closeSheet();
            if (typeof window.doLogout === 'function') window.doLogout();
        }
    }

    // سحب اللوحة للأسفل يغلقها (من المقبض أو رأس اللوحة، أو من المحتوى إن كان في أعلاه)
    function dragToClose(sheet) {
        let y0 = null, dy = 0;
        sheet.addEventListener('touchstart', e => {
            const body = sheet.querySelector('.rn-sheet-body');
            if (!e.target.closest('.rn-grab, .rn-me') && body.scrollTop > 0) return;
            y0 = e.touches[0].clientY; dy = 0;
        }, { passive: true });
        sheet.addEventListener('touchmove', e => {
            if (y0 == null) return;
            dy = Math.max(0, e.touches[0].clientY - y0);
            if (dy > 6) { sheet.classList.add('drag'); sheet.style.transform = `translateY(${dy}px)`; }
        }, { passive: true });
        sheet.addEventListener('touchend', () => {
            if (y0 == null) return;
            sheet.classList.remove('drag');
            sheet.style.transform = '';
            if (dy > 90) closeSheet();
            y0 = null;
        });
    }

    // ── عناصر القائمة من #sidebar ──
    const TABS = ['dashboard', 'invoices', 'proposals', 'clients'];
    const SHORT = { proposals: 'العروض' };
    const GROUPS = [
        ['أدوات العمل', ['templates', 'time', 'subs']],
        ['الموقع والإعدادات', ['requests', 'site', 'bank', 'linkpage', 'visit']]
    ];
    function navItems() {
        const nav = document.querySelector('#sidebar nav');
        if (!nav) return [];
        return [...nav.children].filter(el => el.matches('button, a') && !el.hasAttribute('data-rn-install')).map(el => {
            const badge = el.querySelector('[id$="badge"]');
            const shown = badge && getComputedStyle(badge).display !== 'none';
            return {
                el,
                key: el.id ? el.id.replace(/^nav-/, '') : 'visit',
                icon: (el.querySelector('.material-symbols-rounded') || {}).textContent || 'circle',
                label: ((el.querySelector('span.font-bold') || {}).textContent || '').trim(),
                badge: shown ? (badge.textContent.trim() || '•') : '',
                on: el.classList.contains('bg-primary')
            };
        }).filter(it => getComputedStyle(it.el).display !== 'none');
    }
    function go(key) {
        const it = navItems().find(i => i.key === key);
        if (!it) return;
        const code = it.el.getAttribute('onclick') || '';
        const page = code.match(/switchPage\('([\w-]+)'\)/);
        const fn = code.match(/^\s*(\w+)\(\)/);
        if (page && typeof window.switchPage === 'function') {
            window.switchPage(page[1]);
            const main = document.querySelector('main');
            if (main) main.scrollTo({ top: 0 });
        } else if (fn && typeof window[fn[1]] === 'function') {
            window[fn[1]]();
        } else if (it.el.href) {
            window.open(it.el.href, '_blank', 'noopener');
        }
    }
    function split(items) {
        const tabs = TABS.map(k => items.find(i => i.key === k)).filter(Boolean);
        for (const i of items) if (tabs.length < 4 && !tabs.includes(i)) tabs.push(i);
        return { tabs, more: items.filter(i => !tabs.includes(i)) };
    }

    let bar = null;
    function buildTabbar() {
        if (bar || !document.querySelector('#sidebar nav')) return;
        const status = document.createElement('div');
        status.className = 'rn-statusbar';
        bar = document.createElement('nav');
        bar.className = 'rn-tabbar no-print';
        bar.setAttribute('aria-label', 'القائمة');
        document.body.append(status, bar);
        bar.addEventListener('click', e => {
            const t = e.target.closest('.rn-tab');
            if (!t) return;
            if (navigator.vibrate) navigator.vibrate(8);
            if (t.dataset.tab === 'more') return wrap && !wrap.hidden && sheetKind === 'more' ? closeSheet() : openMore();
            closeSheet();
            go(t.dataset.tab);
        });
        // أي تغيير في القائمة (الصفحة النشطة، الشارات، الدخول) ينعكس على الشريط
        new MutationObserver(() => schedule()).observe(document.getElementById('sidebar'), { subtree: true, attributes: true, attributeFilter: ['class'], childList: true, characterData: true });
        const login = document.getElementById('login-overlay');
        if (login) new MutationObserver(() => schedule()).observe(login, { attributes: true, attributeFilter: ['class'] });
        renderTabs();
    }
    let raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(syncTabs); };

    function renderTabs() {
        const { tabs } = split(navItems());
        const one = (key, icon, label) => `<button type="button" class="rn-tab" data-tab="${key}"><span class="rn-tab-ic">${ic(esc(icon))}<i class="rn-badge"></i></span><span class="rn-tab-tx">${esc(label)}</span></button>`;
        bar.innerHTML = tabs.map(t => one(t.key, t.icon, SHORT[t.key] || t.label)).join('') + one('more', 'grid_view', 'المزيد');
        bar.dataset.keys = tabs.map(t => t.key).join(',');
        syncTabs();
    }
    function syncTabs() {
        if (!bar) return;
        const items = navItems();
        const { tabs, more } = split(items);
        if (tabs.map(t => t.key).join(',') !== bar.dataset.keys) return renderTabs();
        const moreOpen = !!wrap && !wrap.hidden && sheetKind === 'more';
        tabs.forEach(t => {
            const b = bar.querySelector(`[data-tab="${t.key}"]`);
            b.classList.toggle('on', t.on && !moreOpen);
            const badge = b.querySelector('.rn-badge');
            badge.textContent = t.badge === '•' ? '' : t.badge;
            badge.classList.toggle('show', !!t.badge);
            badge.classList.toggle('dot', t.badge === '•');
        });
        const m = bar.querySelector('[data-tab="more"]');
        m.classList.toggle('on', moreOpen || more.some(i => i.on));
        m.querySelector('.rn-badge').classList.toggle('show', more.some(i => i.badge));
        m.querySelector('.rn-badge').classList.add('dot');
        if (moreOpen) wrap.querySelector('.rn-sheet-body').querySelectorAll('.rn-tile').forEach(t => {
            const it = more.find(i => i.key === t.dataset.key);
            t.classList.toggle('on', !!(it && it.on));
        });
    }

    function openMore() {
        const { more } = split(navItems());
        const used = new Set();
        const tile = i => `<button type="button" class="rn-tile${i.on ? ' on' : ''}" data-key="${esc(i.key)}">
            <span class="rn-tile-ic">${ic(esc(i.icon))}</span><span class="rn-tile-tx">${esc(i.label)}</span>
            ${i.badge ? `<i class="rn-badge show${i.badge === '•' ? ' dot' : ''}">${i.badge === '•' ? '' : esc(i.badge)}</i>` : ''}</button>`;
        const groups = GROUPS.map(([title, keys]) => {
            const list = more.filter(i => keys.includes(i.key));
            list.forEach(i => used.add(i));
            return [title, list];
        });
        groups.unshift(['الإدارة', more.filter(i => !used.has(i))]);
        const name = (document.getElementById('user-name-display') || {}).textContent || 'رنان';
        const avatar = (document.getElementById('user-avatar') || {}).textContent || name.charAt(0);
        openSheet(`<header class="rn-me">
                <div class="rn-avatar">${esc(avatar.trim())}</div>
                <div class="rn-me-tx"><b>${esc(name.trim())}</b><small><i></i> متصل الآن</small></div>
                <button type="button" class="rn-round" data-act="theme" aria-label="تبديل المظهر">${ic(html.classList.contains('light-mode') ? 'dark_mode' : 'light_mode')}</button>
            </header>
            ${groups.filter(g => g[1].length).map(([title, list]) => `<h4 class="rn-group">${title}</h4><div class="rn-grid">${list.map(tile).join('')}</div>`).join('')}
            <button type="button" class="rn-logout" data-act="logout">${ic('logout')} تسجيل الخروج</button>
            <p class="rn-ver">رنان لخدمات التصميم · تطبيق لوحة التحكم</p>`, 'المزيد', 'more');
    }

    // ── التشغيل ──
    function init() {
        refresh();
        const login = document.getElementById('login-overlay');
        if (login) new MutationObserver(maybePromo).observe(login, { attributes: true, attributeFilter: ['class'] });
        maybePromo();
        if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
            navigator.serviceWorker.register('sw.js', { scope: './admin' }).catch(() => { });
        }
    }
    ['(display-mode: standalone)', '(display-mode: fullscreen)'].forEach(q => {
        const m = window.matchMedia && window.matchMedia(q);
        if (m && m.addEventListener) m.addEventListener('change', refresh);
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    window.RnanApp = { install, openMore, isApp };
})();
