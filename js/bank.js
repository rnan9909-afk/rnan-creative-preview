/**
 * صفحة الحساب البنكي العامة (bank.html): بطاقة بهوية رنان + نسخ الآيبان ورقم الحساب.
 * المصدر: settings/bank (تكتبه نافذة «الحساب البنكي» في لوحة الإدارة)،
 * ومع غيابه تُقرأ البيانات من نص تذييل الفواتير settings/invoice_footer.
 */
(function () {
    const $ = (sel) => document.querySelector(sel);
    const E = RNAN.esc;

    function withTimeout(promise, ms) {
        return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms || 15000))]);
    }
    const read = (path) => withTimeout(db.ref(path).once('value')).then(s => s.val()).catch(() => null);

    function toast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.classList.remove('show'), 2200);
    }

    function copy(text) {
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        return Promise.resolve();
    }

    // SA38800008596080172022999 → SA38 8000 0859 6080 1720 2999
    const groupIban = iban => String(iban || '').replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();

    // نص تذييل الفاتورة: «البنك: …» (اختياري) ثم الاسم ثم «رقم الحساب: …» ثم «رقم الآيبان (IBAN): …»
    function parseFooter(text) {
        const out = {};
        String(text || '').split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
            let m;
            if ((m = line.match(/^البنك\s*:\s*(.+)$/))) out.bank = m[1];
            else if ((m = line.match(/رقم الحساب\s*:\s*(.+)$/))) out.number = m[1];
            else if ((m = line.match(/(?:الآيبان|الايبان|IBAN)[^:]*:\s*(.+)$/i))) out.iban = m[1];
            else if ((m = line.match(/^اسم (?:صاحب )?(?:الحساب|المستفيد)\s*:\s*(.+)$/))) out.holder = m[1];
            else if (!out.holder) out.holder = line;
        });
        return out;
    }

    function render(acc, whatsapp) {
        const iban = String(acc.iban || '').replace(/\s+/g, '').toUpperCase();
        const number = String(acc.number || '').replace(/\s+/g, '');
        const rows = [
            iban && { key: 'iban', label: 'رقم الآيبان (IBAN)', show: groupIban(iban), value: iban, mono: true },
            number && { key: 'number', label: 'رقم الحساب', show: number, value: number, mono: true },
            acc.holder && { key: 'holder', label: 'اسم المستفيد', show: acc.holder, value: acc.holder },
            acc.bank && { key: 'bank', label: 'البنك', show: acc.bank, value: acc.bank }
        ].filter(Boolean);

        $('#bank-view').innerHTML = `
            <div class="bank-card">
                <img class="bc-wave" src="images/bank-card-wave.svg" alt="">
                <div class="bc-top">
                    <img class="bc-logo" src="images/ranan-logo.svg" alt="رنان">
                    <div class="bc-bank"><small>البنك</small><b>${E(acc.bank || 'الحساب البنكي')}</b></div>
                </div>
                <div class="bc-chip"></div>
                <div class="bc-iban">${E(groupIban(iban))}</div>
                ${number ? `<div class="bc-accline">${E(number)}</div>` : ''}
                <div class="bc-holder"><small>اسم المستفيد</small><b>${E(acc.holder || '')}</b></div>
            </div>
            <div class="copy-list">
                ${rows.map(r => `
                <button type="button" class="copy-row" data-value="${E(r.value)}" data-label="${E(r.label)}">
                    <span><small>${E(r.label)}</small><b class="${r.mono ? 'mono' : ''}">${E(r.show)}</b></span>
                    <span class="copy-pill">${icon('copy')}<span>نسخ</span></span>
                </button>`).join('')}
            </div>
            ${acc.holder ? `<div class="bank-note">${icon('shield')}<span>تأكّد أن اسم المستفيد في تطبيق البنك هو <b style="color:var(--text)">${E(acc.holder)}</b> قبل إتمام التحويل.</span></div>` : ''}
            <div class="bank-actions">
                ${whatsapp ? `<a class="btn btn-primary" target="_blank" rel="noopener" href="${RNAN.waLink(whatsapp, 'السلام عليكم، حوّلت المبلغ إلى حساب رنان، وهذا إيصال التحويل:')}">${icon('whatsapp')} أرسل الإيصال</a>` : ''}
                <button type="button" class="btn btn-ghost" id="share-btn">${icon('send')} مشاركة الصفحة</button>
            </div>`;

        document.querySelectorAll('.copy-row').forEach(btn => btn.addEventListener('click', () => {
            copy(btn.dataset.value).then(() => {
                document.querySelectorAll('.copy-row.done').forEach(b => { b.classList.remove('done'); b.querySelector('.copy-pill span').textContent = 'نسخ'; });
                btn.classList.add('done');
                btn.querySelector('.copy-pill span').textContent = 'تم النسخ';
                toast('نُسخ ' + btn.dataset.label + ' ✓');
            });
        }));
        $('#share-btn').addEventListener('click', () => {
            const data = { title: 'الحساب البنكي — رنان لخدمات التصميم', url: location.href };
            if (navigator.share) navigator.share(data).catch(() => {});
            else copy(location.href).then(() => toast('نُسخ رابط الصفحة ✓'));
        });
    }

    async function init() {
        $('#year').textContent = new Date().getFullYear();
        if (!window.db) return;
        const [bank, footer, site] = await Promise.all([read('settings/bank'), read('settings/invoice_footer'), read('settings/site')]);
        let acc = bank && (bank.iban || bank.number) ? bank : parseFooter(footer);
        const s = site || {};
        const wa = s.whatsapp || s.phone || '';
        if (!acc.iban && !acc.number) {
            $('#bank-view').innerHTML = `<div class="bank-empty">لم تُضف بيانات الحساب بعد. تواصل معنا وسنرسلها لك.</div>`;
            return;
        }
        render(acc, RNAN.intlPhone(wa).length >= 9 ? wa : '');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
