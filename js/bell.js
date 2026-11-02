// جرس الإشعارات في لوحة الإدارة: أقسام إضافية تبقى فيه حتى تُفتح (مثل ملاحظات العملاء على التصاميم)،
// ولوحة سفلية للجرس على الجوال (القائمة المنسدلة الأصلية تظهر على الشاشات الكبيرة فقط)،
// وتنبيهات الجهاز عبر عامل الخدمة بعد إذن المستخدم. الأنماط في css/bell.css.
(function () {
    const sections = {};
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const small = () => window.matchMedia('(max-width: 1023.98px)').matches;
    const canAsk = () => 'Notification' in window && Notification.permission === 'default';
    const list = () => document.getElementById('notif-list');
    let sheet = null, observer = null, painting = false;

    function permRow() {
        if (!canAsk()) return '';
        return `<button type="button" class="nb-perm" data-nb-perm>${ic('notifications_active')}<span><b>فعّل تنبيهات الجهاز</b><small>تصلك ملاحظات العملاء واعتماداتهم كتنبيه على الجوال أو الكمبيوتر</small></span></button>`;
    }
    function count() { return Object.values(sections).reduce((a, s) => a + s.count, 0); }
    // يُعاد رسم القسم كلما أعادت اللوحة بناء قائمة الجرس (تنبيهات المواعيد وطلبات الموقع)
    function paint() {
        const el = list();
        if (!el || painting) return;
        painting = true;
        let box = document.getElementById('notif-extra');
        if (!box) { el.insertAdjacentHTML('afterbegin', '<div id="notif-extra"></div>'); box = document.getElementById('notif-extra'); }
        else if (box !== el.firstElementChild) el.prepend(box);
        box.innerHTML = Object.values(sections).map(s => s.html).join('') + permRow();
        const n = count();
        el.querySelectorAll(':scope > p.text-center').forEach(p => { p.hidden = n > 0; });
        if (n > 0) ['notif-badge', 'notif-badge-mobile'].forEach(id => { const b = document.getElementById(id); if (b) b.classList.remove('hidden'); });
        if (sheet) fillSheet();
        painting = false;
    }
    function watch() {
        const el = list();
        if (!el || observer) return;
        observer = new MutationObserver(() => { if (!painting && !document.getElementById('notif-extra')) paint(); else if (!painting) syncBadge(); });
        observer.observe(el, { childList: true });
    }
    function syncBadge() {
        if (count() > 0) ['notif-badge', 'notif-badge-mobile'].forEach(id => { const b = document.getElementById(id); if (b) b.classList.remove('hidden'); });
    }
    function set(key, html, n) {
        sections[key] = { html: html || '', count: n || 0 };
        watch();
        paint();
        // تُعيد دالة المواعيد إخفاء الشارة بعد بنائها؛ نعيد إظهارها بعدها
        setTimeout(syncBadge, 0);
    }

    // ── لوحة الجرس على الجوال ──
    function fillSheet() {
        const body = sheet.querySelector('.nb-body');
        const el = list();
        body.innerHTML = el ? el.innerHTML.replace(/\sid="[^"]*"/g, '') : '';
        if (!body.textContent.trim()) body.innerHTML = '<p class="nb-empty">لا توجد إشعارات جديدة</p>';
    }
    function openSheet() {
        if (sheet) return closeSheet();
        sheet = document.createElement('div');
        sheet.className = 'nb-wrap no-print';
        sheet.innerHTML = `<div class="nb-scrim" data-nb-x></div><div class="nb-sheet" role="dialog" aria-label="الإشعارات"><div class="nb-grab"></div>
            <header><b>${ic('notifications')} الإشعارات</b><button type="button" data-nb-x aria-label="إغلاق">${ic('close')}</button></header><div class="nb-body"></div></div>`;
        document.body.appendChild(sheet);
        fillSheet();
        requestAnimationFrame(() => requestAnimationFrame(() => sheet && sheet.classList.add('open')));
        sheet.addEventListener('click', e => {
            if (e.target.closest('[data-nb-x]')) return closeSheet();
            // عناصر القائمة تنفّذ ما تحمله ثم تُغلق اللوحة
            if (e.target.closest('.nb-body [onclick], .nb-body [data-nb-proj]')) setTimeout(closeSheet, 0);
        });
    }
    function closeSheet() {
        if (!sheet) return;
        const s = sheet;
        sheet = null;
        s.classList.remove('open');
        setTimeout(() => s.remove(), 260);
    }
    function hook() {
        if (typeof window.toggleNotifications === 'function' && !window.toggleNotifications.__nb) {
            const orig = window.toggleNotifications;
            window.toggleNotifications = function () {
                if (small()) return openSheet();
                return orig.apply(this, arguments);
            };
            window.toggleNotifications.__nb = true;
        }
        watch();
        paint();
    }

    document.addEventListener('click', e => {
        const perm = e.target.closest('[data-nb-perm]');
        if (perm) {
            Notification.requestPermission().then(() => { paint(); if (Notification.permission === 'granted') notify('تم تفعيل التنبيهات ✓', 'ستصلك ملاحظات العملاء على التصاميم هنا.'); });
            return;
        }
        const it = e.target.closest('[data-nb-proj]');
        if (it) {
            const i = (typeof projectsData !== 'undefined' ? projectsData : []).findIndex(p => p.rowIndex === it.dataset.nbProj);
            const dd = document.getElementById('notif-dropdown');
            if (dd) dd.classList.remove('show');
            if (i > -1) window.openProjectModal('edit', i, { focus: 'proof' });
        }
    });

    // ── تنبيه الجهاز (يعمل والتطبيق مفتوح أو في الخلفية) ──
    async function notify(title, body, data) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return false;
        const opts = { body, icon: 'images/app/icon-192.png', badge: 'images/app/icon-192.png', tag: (data && data.tag) || undefined, renotify: !!(data && data.tag), data: Object.assign({ url: 'admin.html' }, data || {}) };
        try {
            const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration('./admin');
            if (reg && reg.showNotification) { await reg.showNotification(title, opts); return true; }
        } catch (e) { /* نجرّب الإشعار المباشر */ }
        try { new Notification(title, opts); return true; } catch (e) { return false; }
    }
    // الضغط على تنبيه الجهاز يفتح المشروع المعني
    if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => {
        const d = e.data || {};
        if (d.type !== 'rnan-open-project') return;
        const i = (typeof projectsData !== 'undefined' ? projectsData : []).findIndex(p => p.rowIndex === d.project);
        if (i > -1) window.openProjectModal('edit', i, { focus: 'proof' });
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
    window.AdminBell = { set, notify, paint, get canAsk() { return canAsk(); } };
})();
