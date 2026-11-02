// النسخة الاحتياطية: تحميل كل بيانات رنان في ملف واحد (rnan-backup-YYYY-MM-DD.json)، صور مراجعات التصاميم اختيارية لأنها تُحذف تلقائيًا بعد مدتها،
// تذكير في الجرس إذا مضى شهر بلا نسخة، واستعادة من ملف بمعاينة لمحتواه وتأكيد مكتوب. آخر نسخة في settings/backup_last. الأنماط في css/polish.css.
(function () {
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    const size = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' م.ب' : Math.max(1, Math.round(b / 1024)) + ' ك.ب';
    const daysAgo = iso => Math.floor((Date.now() - Date.parse(iso)) / 864e5);
    const agoText = iso => { const n = daysAgo(iso); return n <= 0 ? 'اليوم' : n === 1 ? 'أمس' : n === 2 ? 'قبل يومين' : `قبل ${n} ${n <= 10 ? 'أيام' : 'يومًا'}`; };
    // أقسام تظهر في المعاينة بأسماء مفهومة
    const LABELS = { clients: 'العملاء', invoices: 'الفواتير', projects: 'المشاريع', proposals: 'العروض', expenses: 'المصروفات', subscriptions: 'الاشتراكات', requests: 'طلبات الموقع',
        recurring: 'الفواتير المتكررة', timeLogs: 'جلسات الوقت', templates: 'قوالب العروض', portfolioImages: 'صور معرض الأعمال', proofs: 'مراجعات التصاميم', proofFiles: 'ملفات المراجعات' };
    const SKIP_RESTORE = ['admins'];
    let wrap = null, last = null, pending = null;
    const db = () => window.db;

    async function readLast() {
        try { last = (await db().ref('settings/backup_last').once('value')).val(); } catch (e) { last = null; }
        bell();
        return last;
    }
    // تذكير في الجرس إذا لم تُحمَّل نسخة منذ 30 يومًا
    function bell() {
        if (!window.AdminBell) return;
        const stale = !last || !last.at || daysAgo(last.at) >= 30;
        AdminBell.set('backup', stale ? `<div class="nb-item" data-bk-open role="button">${ic('cloud_download')}<div><b>${last && last.at ? 'مضى شهر على آخر نسخة احتياطية' : 'لم تحمّل نسخة احتياطية بعد'}</b>
            <small>${last && last.at ? 'آخر نسخة ' + agoText(last.at) : 'احفظ بياناتك كلها في ملف عندك'} · بضغطة واحدة</small></div></div>` : '', stale ? 1 : 0);
    }

    function counts(data) {
        return Object.entries(LABELS).map(([k, t]) => [t, data[k] && typeof data[k] === 'object' ? Object.keys(data[k]).length : 0]).filter(x => x[1]);
    }
    async function download(btn) {
        const withFiles = (wrap.querySelector('#bk-files') || {}).checked;
        btn.disabled = true;
        btn.innerHTML = `<span class="bk-spin"></span> جارٍ تجهيز النسخة...`;
        try {
            const data = (await db().ref().once('value')).val() || {};
            if (!withFiles) delete data.proofFiles;
            const at = new Date().toISOString();
            const file = { app: 'rnan', kind: 'backup', version: 1, at, withFiles: !!withFiles, data };
            const text = JSON.stringify(file);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
            a.download = 'rnan-backup-' + ymd(new Date()) + '.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
            last = { at, bytes: text.length, counts: Object.fromEntries(counts(data)) };
            await db().ref('settings/backup_last').set(last).catch(() => null);
            bell();
            render();
            toast('💾 حُمّلت النسخة الاحتياطية (' + size(text.length) + ') — احفظها في مكان آمن');
        } catch (e) {
            btn.disabled = false;
            btn.innerHTML = `${ic('cloud_download')} تحميل نسخة الآن`;
            toast('تعذّر تجهيز النسخة: ' + ((e && e.message) || 'تحقّق من الاتصال'));
        }
    }

    function pick(file) {
        const r = new FileReader();
        r.onload = () => {
            try {
                const f = JSON.parse(r.result);
                if (!f || f.app !== 'rnan' || !f.data || typeof f.data !== 'object') throw new Error('bad');
                pending = f;
                render();
            } catch (e) { pending = null; render(); toast('⚠️ هذا الملف ليس نسخة احتياطية من رنان'); }
        };
        r.readAsText(file);
    }
    async function restore(btn) {
        const word = (wrap.querySelector('#bk-word') || {}).value || '';
        const err = wrap.querySelector('.bk-err');
        if (word.trim() !== 'استعادة') { err.hidden = false; err.textContent = 'اكتب كلمة «استعادة» للتأكيد'; return; }
        btn.disabled = true;
        btn.innerHTML = `<span class="bk-spin"></span> جارٍ الاستعادة...`;
        try {
            const updates = {};
            Object.entries(pending.data).forEach(([k, v]) => { if (!SKIP_RESTORE.includes(k)) updates[k] = v; });
            if (updates.settings) updates.settings.backup_last = last || null;
            await db().ref().update(updates);
            pending = null;
            toast('✅ استُعيدت البيانات من النسخة — يُعاد تحميل اللوحة');
            setTimeout(() => location.reload(), 1200);
        } catch (e) {
            btn.disabled = false;
            btn.innerHTML = `${ic('settings_backup_restore')} استعادة البيانات`;
            err.hidden = false;
            err.textContent = 'تعذّرت الاستعادة: ' + ((e && e.message) || 'تحقّق من الاتصال');
        }
    }

    function render() {
        if (!wrap) return;
        const L = last && last.at;
        wrap.querySelector('.bk-body').innerHTML = `
            <div class="bk-status ${L && daysAgo(last.at) < 30 ? 'ok' : 'warn'}">${ic(L && daysAgo(last.at) < 30 ? 'verified_user' : 'warning')}
                <div><b>${L ? 'آخر نسخة ' + agoText(last.at) : 'لا توجد نسخة احتياطية بعد'}</b>
                <small>${L ? `${new Date(last.at).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })}${last.bytes ? ' · ' + size(last.bytes) : ''}` : 'بياناتك محفوظة في Firebase، والنسخة عندك تحميك من أي حذف بالخطأ'}</small></div></div>
            <section class="bk-card">
                <h4>${ic('cloud_download')} تحميل نسخة كاملة</h4>
                <p>ملف واحد فيه كل شيء: العملاء والفواتير والمشاريع والعروض والمصروفات والإعدادات وصور معرض الأعمال. احفظه في جهازك أو Google Drive.</p>
                <label class="bk-check"><input type="checkbox" id="bk-files"> تضمين صور مراجعات التصاميم <small>(أكبر حجمًا، وتُحذف تلقائيًا بعد مدتها)</small></label>
                <button type="button" class="bk-btn main" data-bk="download">${ic('cloud_download')} تحميل نسخة الآن</button>
                <small class="bk-tip">${ic('event_repeat')} ننبّهك في الجرس إذا مضى شهر بلا نسخة.</small>
            </section>
            <section class="bk-card">
                <h4>${ic('settings_backup_restore')} استعادة من نسخة</h4>
                ${pending ? `<div class="bk-preview"><b>نسخة ${new Date(pending.at).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
                        <ul>${counts(pending.data).map(([t, n]) => `<li><span>${t}</span><em class="en-num">${n}</em></li>`).join('') || '<li>لا بيانات</li>'}</ul></div>
                    <p class="bk-warn">${ic('report')} الاستعادة تستبدل البيانات الحالية بمحتوى هذه النسخة، وما أُضيف بعدها يُحذف. حمّل نسخة من الوضع الحالي أولًا.</p>
                    <label class="bk-word"><span>اكتب <b>استعادة</b> للتأكيد</span><input id="bk-word" autocomplete="off"></label>
                    <p class="bk-err" hidden></p>
                    <div class="bk-row"><button type="button" class="bk-btn danger" data-bk="restore">${ic('settings_backup_restore')} استعادة البيانات</button>
                        <button type="button" class="bk-btn ghost" data-bk="cancel">إلغاء</button></div>`
                : `<p>اختر ملف نسخة سابقة (rnan-backup-….json) لمعاينة محتواه قبل الاستعادة.</p>
                    <label class="bk-btn ghost bk-file">${ic('upload_file')} اختيار ملف النسخة<input type="file" accept=".json,application/json" data-bk="file" hidden></label>`}
            </section>`;
    }
    function open() {
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'bk-wrap no-print';
            wrap.hidden = true;
            wrap.innerHTML = `<div class="bk-scrim" data-bk="close"></div><section class="bk-dlg" role="dialog" aria-modal="true" aria-labelledby="bk-t">
                <header><span class="bk-ic">${ic('backup')}</span><div><h3 id="bk-t">النسخة الاحتياطية</h3><p>احتفظ بنسخة من كل بياناتك عندك</p></div>
                <button type="button" class="bk-x" data-bk="close" aria-label="إغلاق">${ic('close')}</button></header><div class="bk-body"></div></section>`;
            document.body.appendChild(wrap);
            wrap.addEventListener('click', e => {
                const b = e.target.closest('[data-bk]');
                if (!b || b.disabled) return;
                const a = b.dataset.bk;
                if (a === 'close') close();
                else if (a === 'download') download(b);
                else if (a === 'restore') restore(b);
                else if (a === 'cancel') { pending = null; render(); }
            });
            wrap.addEventListener('change', e => { if (e.target.matches('[data-bk="file"]') && e.target.files[0]) pick(e.target.files[0]); });
        }
        render();
        wrap.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
        readLast().then(render);
    }
    function close() {
        if (!wrap) return;
        wrap.classList.remove('open');
        setTimeout(() => { if (!wrap.classList.contains('open')) wrap.hidden = true; }, 260);
    }
    document.addEventListener('click', e => { if (e.target.closest('[data-bk-open]')) { e.preventDefault(); open(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && wrap && !wrap.hidden) close(); });
    // التذكير بعد الدخول (loadAllData يُستدعى بعد تسجيل الدخول)
    const origLoad = window.loadAllData;
    let checked = false;
    if (typeof origLoad === 'function') window.loadAllData = function () {
        const r = origLoad.apply(this, arguments);
        if (!checked && window.db) { checked = true; setTimeout(readLast, 2500); }
        return r;
    };
    window.RnBackup = { open, close, readLast };
})();
