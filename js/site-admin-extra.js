// إدارة الموقع (إضافات): «الأسعار في الموقع» — إظهار «تبدأ من» على بطاقات الخدمات من قائمة الأسعار (settings/site_prices)،
// و«آراء العملاء في الموقع» — اختيار تقييمات العملاء الحقيقية (من المشاريع المقيَّمة) لتظهر في قسم «آراء عملائنا» (settings/testimonials).
(function () {
    const ic = n => `<span class="material-symbols-rounded">${n}</span>`;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const num = v => (parseFloat(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const toast = m => (window.ProjectsPage && ProjectsPage.toast ? ProjectsPage.toast(m) : window.showAdminToast ? showAdminToast(m) : null);
    const SERVICES = [['branding', 'الهوية البصرية'], ['social', 'تصاميم السوشيال ميديا'], ['print', 'المطبوعات والتغليف'], ['presentation', 'العروض والملفات التعريفية']];
    let show = true, chosen = [];

    // نفس حساب الموقع العام (js/site-extra.js)
    function fromPrices() {
        const list = window.PriceList ? PriceList.items() : [];
        const min = f => { const xs = list.filter(f).filter(x => +x.price > 0); if (!xs.length) return null; const m = xs.reduce((a, b) => (+b.price < +a.price ? b : a)); return { p: +m.price, u: m.unit }; };
        return { branding: min(x => x.cat === 'brand'), social: min(x => x.id === 'brochure') || min(x => x.cat === 'media' && x.unit !== 'minute'), print: min(x => x.cat === 'print'), presentation: min(x => x.cat === 'reports') };
    }
    const unit = u => u === 'page' ? 'ريال للورقة' : u === 'minute' ? 'ريال للدقيقة' : 'ريال';
    const rated = () => P().filter(p => (parseInt(p.rating) || 0) >= 4 && String(p.review || '').trim()).sort((a, b) => (b.ratedAt || 0) - (a.ratedAt || 0));

    async function load() {
        const read = p => window.db.ref(p).once('value').then(s => s.val()).catch(() => null);
        const [s, t] = await Promise.all([read('settings/site_prices'), read('settings/testimonials')]);
        show = s !== false;
        chosen = Array.isArray(t) ? t.filter(Boolean) : Object.values(t || {});
        if (window.PriceList) await PriceList.load();
    }
    function render() {
        const page = document.getElementById('site-page');
        if (!page) return;
        let box = document.getElementById('sx-cards');
        if (!box) { page.insertAdjacentHTML('beforeend', '<div id="sx-cards" class="sx-cards"></div>'); box = document.getElementById('sx-cards'); }
        const map = fromPrices(), list = rated();
        box.innerHTML = `
            <section class="sx-card">
                <header><h3>${ic('sell')} الأسعار في الموقع</h3>
                    <label class="sx-switch"><input type="checkbox" data-sx="prices" ${show ? 'checked' : ''}><span></span>${show ? 'ظاهرة' : 'مخفية'}</label></header>
                <p>يظهر «تبدأ من» على بطاقات الخدمات في موقعك، محسوبًا من <a href="#" data-sx="go-prices">قائمة الأسعار</a> تلقائيًا.</p>
                <ul class="sx-prices">${SERVICES.map(([k, t]) => `<li><span>${t}</span><b>${map[k] ? `تبدأ من <span class="en-num">${num(map[k].p)}</span> ${unit(map[k].u)}` : '<em>بلا سعر</em>'}</b></li>`).join('')}</ul>
            </section>
            <section class="sx-card">
                <header><h3>${ic('reviews')} آراء العملاء في الموقع <em class="en-num">${chosen.length}</em></h3></header>
                <p>اختر من تقييمات عملائك الحقيقية (4 نجوم فأكثر مع تعليق) ما يظهر في قسم «آراء عملائنا» في موقعك.</p>
                ${list.length ? `<ul class="sx-reviews">${list.map(p => { const on = chosen.some(x => String(x.k) === String(p.rowIndex)); return `<li class="${on ? 'on' : ''}">
                    <div><span class="sx-stars">${'★'.repeat(parseInt(p.rating) || 0)}</span><blockquote>«${esc(p.review)}»</blockquote><small>${esc(p.client)} · ${esc(p.name)}</small></div>
                    <label class="sx-switch"><input type="checkbox" data-sx="review" data-k="${esc(p.rowIndex)}" ${on ? 'checked' : ''}><span></span>${on ? 'معروض' : 'عرض'}</label></li>`; }).join('')}</ul>`
                : `<div class="sx-empty">${ic('star')}<p>لا تقييمات بعد — عند تسليم المشروع يطلب النظام من العميل تقييم تجربته، وتظهر التقييمات هنا لتختار منها.</p></div>`}
            </section>`;
    }
    async function save(path, val, msg) {
        try { await window.db.ref(path).set(val); toast(msg); } catch (e) { rnAlert('تعذّر الحفظ: ' + ((e && e.message) || 'تحقّق من الاتصال')); }
    }
    document.addEventListener('change', e => {
        const t = e.target;
        if (!t.closest || !t.closest('#sx-cards')) return;
        if (t.dataset.sx === 'prices') { show = t.checked; save('settings/site_prices', show, show ? '💲 «تبدأ من» ظاهرة في موقعك' : 'أُخفيت الأسعار من الموقع'); render(); }
        else if (t.dataset.sx === 'review') {
            const p = P().find(x => String(x.rowIndex) === String(t.dataset.k));
            chosen = chosen.filter(x => String(x.k) !== String(t.dataset.k));
            if (t.checked && p) chosen.unshift({ k: p.rowIndex, name: p.client || 'عميل رنان', project: p.name || '', text: String(p.review || '').trim().slice(0, 400), rating: parseInt(p.rating) || 5 });
            save('settings/testimonials', chosen.slice(0, 12), t.checked ? '⭐ أُضيف التقييم إلى موقعك' : 'أُزيل التقييم من الموقع');
            render();
        }
    });
    document.addEventListener('click', e => { if (e.target.closest('#sx-cards [data-sx="go-prices"]')) { e.preventDefault(); switchPage('prices'); } });
    const orig = window.loadSitePage;
    if (typeof orig === 'function') window.loadSitePage = function () { const r = orig.apply(this, arguments); load().then(render); return r; };
    window.SiteAdminExtra = { render };
})();
