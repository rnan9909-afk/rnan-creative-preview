/**
 * صفحة الروابط العامة (links.html) — بديل Linktree بهوية رنان.
 * المصدر: linksPage في قاعدة البيانات (تكتبه نافذة «صفحة الروابط» في لوحة الإدارة)،
 * ومع غيابه تظهر الروابط الافتراضية من LinkPlatforms.DEFAULTS.
 */
(function () {
    const $ = (sel) => document.querySelector(sel);
    const E = RNAN.esc;
    const LP = window.LinkPlatforms;

    function withTimeout(promise, ms) {
        return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms || 12000))]);
    }

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

    // روابط الصفحات الداخلية تُفتح في نفس التبويب، والخارجية في تبويب جديد
    const isInternal = url => /^[\w-]+\.html/i.test(url) || url.startsWith('#') || (url.startsWith('/') && !url.startsWith('//'));

    function render(page) {
        const title = page.title || LP.DEFAULTS.title;
        const links = (Array.isArray(page.links) ? page.links : Object.values(page.links || {}))
            .filter(l => l && l.url && l.active !== false)
            .map(l => ({ ...l, url: LP.normalizeUrl(l.url), p: LP.byId(l.platform || LP.detect(l.url)) }));

        document.title = title + ' | روابط رنان';
        $('#lk-title').textContent = title;
        $('#lk-bio').textContent = page.bio || '';
        $('#lk-bio').hidden = !page.bio;

        // صف الأيقونات: أول رابط من كل منصّة اجتماعية
        const seen = new Set();
        const social = links.filter(l => l.p.social && !seen.has(l.p.id) && seen.add(l.p.id));
        $('#lk-social').innerHTML = social.map(l =>
            `<a href="${E(l.url)}" target="_blank" rel="noopener" aria-label="${E(l.p.name)}" title="${E(l.p.name)}">${icon(l.p.icon)}</a>`).join('');
        $('#lk-social').hidden = social.length < 2;

        $('#lk-list').innerHTML = links.length ? links.map((l, i) => {
            const internal = isInternal(l.url);
            return `
            <a class="lk-card${l.featured ? ' featured' : ''}" href="${E(l.url)}"${internal ? '' : ' target="_blank" rel="noopener"'} style="animation-delay:${(0.18 + i * 0.05).toFixed(2)}s">
                <span class="lk-chip" style="background:${E(l.p.bg)};color:${E(l.p.fg)}">${icon(l.p.icon)}</span>
                <span class="lk-label">${E(l.title || l.p.name)}</span>
                <span class="lk-go">${icon('arrow')}</span>
            </a>`;
        }).join('') : `<div class="lk-empty">لا توجد روابط حاليًا.</div>`;

        // توهّج يتبع المؤشر داخل البطاقة
        document.querySelectorAll('.lk-card').forEach(card => card.addEventListener('pointermove', e => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }));
    }

    async function init() {
        $('#year').textContent = new Date().getFullYear();
        $('#share-btn').addEventListener('click', () => {
            const data = { title: $('#lk-title').textContent, text: 'كل حسابات رنان لخدمات التصميم في مكان واحد', url: location.href };
            if (navigator.share) navigator.share(data).catch(() => {});
            else copy(location.href).then(() => toast('نُسخ رابط الصفحة ✓'));
        });

        let page = null;
        if (window.db) page = await withTimeout(db.ref('linksPage').once('value')).then(s => s.val()).catch(() => null);
        // updatedAt يعني أن الصفحة حُفظت من الإدارة (حتى لو حُذفت كل الروابط)
        render(page && (page.links || page.updatedAt) ? page : LP.DEFAULTS);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
