// إضافات الموقع العام: «تبدأ من» على بطاقات الخدمات من قائمة الأسعار (settings/price_list، يتحكّم بها settings/site_prices)،
// وقسم «آراء عملائنا» من تقييمات العملاء الحقيقية التي يختارها المصمم (settings/testimonials). الأنماط في css/site-extra.css.
(function () {
    const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => (parseFloat(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    // أسعار رنان المعتمدة إن لم تُحفظ قائمة في القاعدة
    const FALLBACK = { branding: { p: 250, u: 'item' }, social: { p: 50, u: 'item' }, print: { p: 40, u: 'item' }, presentation: { p: 15, u: 'page' } };
    function fromPrices(list) {
        if (!Array.isArray(list) || !list.length) return FALLBACK;
        const min = f => { const xs = list.filter(f).filter(x => +x.price > 0); if (!xs.length) return null; const m = xs.reduce((a, b) => (+b.price < +a.price ? b : a)); return { p: +m.price, u: m.unit || 'item' }; };
        return {
            branding: min(x => x.cat === 'brand'),
            social: min(x => x.id === 'brochure') || min(x => x.cat === 'media' && x.unit !== 'minute'),
            print: min(x => x.cat === 'print'),
            presentation: min(x => x.cat === 'reports')
        };
    }
    const unit = u => u === 'page' ? 'ريال للورقة' : u === 'minute' ? 'ريال للدقيقة' : 'ريال';
    function prices(map) {
        let tries = 0;
        const run = () => {
            const links = document.querySelectorAll('#services-grid .service-link[data-service]');
            if (!links.length && tries++ < 40) return setTimeout(run, 150);
            links.forEach(a => {
                const v = map[a.dataset.service], card = a.closest('.service');
                if (!v || !card || card.querySelector('.svc-from')) return;
                a.insertAdjacentHTML('beforebegin', `<p class="svc-from">تبدأ من <b class="en">${num(v.p)}</b> ${unit(v.u)}</p>`);
            });
        };
        run();
    }
    const stars = n => '★★★★★'.slice(0, Math.max(0, Math.min(5, n))) + '☆☆☆☆☆'.slice(0, 5 - Math.max(0, Math.min(5, n)));
    function reviews(list) {
        const items = (Array.isArray(list) ? list : Object.values(list || {})).filter(x => x && String(x.text || '').trim()).slice(0, 9);
        const anchor = document.getElementById('request');
        if (!items.length || !anchor || document.getElementById('reviews')) return;
        anchor.insertAdjacentHTML('beforebegin', `<section class="section" id="reviews" style="padding-top:40px">
            <div class="container">
                <div class="section-head reveal visible">
                    <span class="eyebrow">آراء عملائنا</span>
                    <h2 class="h2">ثقة نعتزّ بها <b>من عملاء حقيقيين</b></h2>
                </div>
                <div class="rv-grid">${items.map(x => `<figure class="card rv-card">
                    <div class="rv-stars" aria-label="${x.rating || 5} من 5">${stars(parseInt(x.rating) || 5)}</div>
                    <blockquote>«${E(String(x.text).trim())}»</blockquote>
                    <figcaption><b>${E(x.name || 'عميل رنان')}</b>${x.project ? `<small>${E(x.project)}</small>` : ''}</figcaption>
                </figure>`).join('')}</div>
            </div>
        </section>`);
    }
    async function init() {
        const read = p => window.db.ref(p).once('value').then(s => s.val()).catch(() => null);
        const [show, list, tm] = await Promise.all([read('settings/site_prices'), read('settings/price_list'), read('settings/testimonials')]);
        if (show !== false) prices(fromPrices(list && list.items));
        reviews(tm);
    }
    const wait = setInterval(() => { if (window.db) { clearInterval(wait); init(); } }, 200);
    setTimeout(() => clearInterval(wait), 15000);
    window.RnanSiteExtra = { fromPrices };
})();
