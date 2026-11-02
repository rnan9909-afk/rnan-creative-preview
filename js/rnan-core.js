/**
 * RNAN Core — ثوابت ودوال مشتركة بين الموقع العام وصفحة العميل ولوحة الإدارة.
 * أي تعديل هنا (الخدمات، المكافآت، المستويات) يظهر في الأنظمة الثلاثة معًا.
 */
(function () {
    // ── الخدمات المعروضة في الموقع ونموذج الطلب ──
    const SERVICES = [
        { id: 'branding', title: 'الهوية البصرية', short: 'هوية بصرية', icon: 'i-pen',
          desc: 'شعار يُعرّف بك من النظرة الأولى، ودليل هوية يحفظ اتساقك في كل مكان تظهر فيه علامتك.',
          tags: ['شعار', 'دليل هوية', 'قرطاسية', 'ألوان وخطوط'] },
        { id: 'social', title: 'تصاميم السوشيال ميديا', short: 'سوشيال ميديا', icon: 'i-grid',
          desc: 'منشورات وحملات بصرية متّسقة ترفع التفاعل وتجعل حسابك مميّزًا وسط الزحام.',
          tags: ['منشورات', 'حملات', 'قوالب', 'ستوري'] },
        { id: 'print', title: 'المطبوعات والتغليف', short: 'مطبوعات', icon: 'i-package',
          desc: 'بروشورات وبطاقات وتغليف تُلمس جودته باليد، مجهّز للطباعة بدقّة ومعايير احترافية.',
          tags: ['بروشور', 'بطاقات أعمال', 'تغليف', 'بوسترات'] },
        { id: 'ui', title: 'واجهات المواقع والتطبيقات', short: 'واجهات UI/UX', icon: 'i-layout',
          desc: 'واجهات واضحة وسهلة الاستخدام تُحوّل الزائر إلى عميل، من الفكرة حتى النموذج التفاعلي.',
          tags: ['UI/UX', 'مواقع', 'تطبيقات', 'نماذج تفاعلية'] },
        { id: 'presentation', title: 'العروض والملفات التعريفية', short: 'عروض تقديمية', icon: 'i-present',
          desc: 'ملف تعريفي وعرض تقديمي يروي قصتك بإقناع أمام المستثمرين والعملاء والشركاء.',
          tags: ['بروفايل شركة', 'عروض استثمارية', 'تقارير'] },
        { id: 'consulting', title: 'الاستشارات الإبداعية', short: 'استشارة إبداعية', icon: 'i-bulb',
          desc: 'جلسة نفهم فيها مشروعك وجمهورك، ونخرج معك باتجاه بصري واضح قبل أن تبدأ الإنفاق.',
          tags: ['تحليل العلامة', 'اتجاه بصري', 'خطة محتوى'] }
    ];

    const PORTFOLIO_CATEGORIES = [
        { id: 'branding', title: 'هوية بصرية' },
        { id: 'social', title: 'سوشيال ميديا' },
        { id: 'print', title: 'مطبوعات' },
        { id: 'ui', title: 'واجهات' },
        { id: 'presentation', title: 'عروض' }
    ];

    // نماذج تصميمية تظهر حتى تُضاف أعمال حقيقية من لوحة الإدارة (بلا أسماء عملاء)
    const DEFAULT_PORTFOLIO = [
        { id: 'd1', title: 'هوية بصرية متكاملة', category: 'branding',
          thumb: 'images/work/brand.jpg', description: 'شعار وقرطاسية ودليل استخدام بطابع فاخر يعكس الدقة والتقنية.',
          tags: ['شعار', 'قرطاسية', 'دليل هوية'] },
        { id: 'd2', title: 'واجهة تطبيق لوحة أعمال', category: 'ui',
          thumb: 'images/work/ui.jpg', description: 'تجربة استخدام لتطبيق جوال يعرض الأداء والمشاريع في لمحة واحدة.',
          tags: ['UI/UX', 'تطبيق جوال'] },
        { id: 'd3', title: 'حملة سوشيال ميديا', category: 'social',
          thumb: 'images/work/social.jpg', description: 'سلسلة منشورات متّسقة رفعت التفاعل وأبرزت روح الحدث.',
          tags: ['حملة', 'منشورات'] },
        { id: 'd4', title: 'مطبوعات فنية راقية', category: 'print',
          thumb: 'images/work/print.jpg', description: 'كتيّبات وبطاقات وملصقات بطابع حداثي وخامات مختارة بعناية.',
          tags: ['مطبوعات', 'بوسترات'] }
    ];

    // ── المكافآت: يجب أن تطابق REWARDS_MENU في لوحة الإدارة ──
    const REWARDS = [
        { id: 1, title: 'خصم 20 ريال', cost: 400, value: 20 },
        { id: 2, title: 'خصم 50 ريال', cost: 1000, value: 50 },
        { id: 3, title: 'خصم 70 ريال', cost: 1400, value: 70 }
    ];

    // نقاط تُمنح للعميل الذي يدعو صديقًا يتحوّل طلبه إلى مشروع
    const REFERRAL_BONUS = 100;

    // ── مستويات الولاء: نفس منطق _updateLoyaltyPoints ──
    function tierOf(totalSpent) {
        const spent = parseFloat(totalSpent) || 0;
        if (spent >= 5000) return { key: 'gold', name: 'ذهبي', next: null, nextAt: null, progress: 100, multiplier: 1.25, remaining: 0 };
        if (spent >= 1000) return { key: 'silver', name: 'فضي', next: 'ذهبي', nextAt: 5000, progress: ((spent - 1000) / 4000) * 100, multiplier: 1.1, remaining: 5000 - spent };
        return { key: 'bronze', name: 'برونزي', next: 'فضي', nextAt: 1000, progress: (spent / 1000) * 100, multiplier: 1.0, remaining: 1000 - spent };
    }

    // ── مولّدات الرموز ──
    function randomString(len, alphabet) {
        const out = [];
        const bytes = new Uint8Array(len);
        (window.crypto || window.msCrypto).getRandomValues(bytes);
        for (let i = 0; i < len; i++) out.push(alphabet[bytes[i] % alphabet.length]);
        return out.join('');
    }
    const SAFE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const URLSAFE = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

    // رابط العميل الخاص: 14 حرفًا (~80 بت) — لا يمكن تخمينه
    function newToken() { return randomString(14, URLSAFE); }
    // رمز الدعوة العام: يُشارك مع الأصدقاء ولا يفتح صفحة العميل
    function newRefCode() { return randomString(6, SAFE); }
    // رقم التتبع: RN-XXXXX
    function newTrackCode() { return 'RN-' + randomString(5, SAFE); }

    function normalizeCode(code) {
        let c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (c.startsWith('RN')) c = c.slice(2);
        return c ? 'RN-' + c : '';
    }

    // ── مراحل التتبع ──
    const STAGES = [
        { key: 'received', title: 'استلام الطلب', hint: 'وصلنا طلبك وسُجّل برقم تتبع' },
        { key: 'review', title: 'المراجعة والتسعير', hint: 'ندرس التفاصيل ونتواصل معك بعرض السعر' },
        { key: 'progress', title: 'التنفيذ', hint: 'فريقنا يعمل على تصاميمك الآن' },
        { key: 'done', title: 'التسليم', hint: 'تم تسليم الملفات النهائية' }
    ];

    function trackFromRequest(r) {
        const map = {
            'جديد': { stage: 0, state: 'active', label: 'تم استلام طلبك' },
            'قيد المراجعة': { stage: 1, state: 'active', label: 'نراجع طلبك ونجهّز عرض السعر' },
            'مرفوض': { stage: 1, state: 'cancelled', label: 'تعذّر قبول الطلب — تواصل معنا للتفاصيل' }
        };
        const m = map[r.status] || map['جديد'];
        return {
            code: r.code, kind: 'request', title: serviceTitles(r.services) || 'طلب خدمة',
            stage: m.stage, state: m.state, label: m.label, progress: 0, steps: [],
            createdAt: r.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
        };
    }

    function trackFromProject(p, createdAt) {
        let stage = 2, state = 'active', label = 'التصميم قيد التنفيذ';
        if (p.status === 'مكتمل') { stage = 3; state = 'done'; label = 'تم تسليم المشروع'; }
        else if (p.status === 'معلق') { state = 'hold'; label = 'المشروع متوقف مؤقتًا'; }
        const steps = Array.isArray(p.steps) ? p.steps : (typeof p.steps === 'string' ? safeJSON(p.steps, []) : []);
        return {
            code: p.code, kind: 'project', title: p.name || 'مشروع',
            stage: stage, state: state, label: label,
            progress: p.status === 'مكتمل' ? 100 : (parseInt(p.progress) || 0),
            steps: steps.map(s => ({ text: String(s.text || ''), done: !!s.done })),
            startDate: p.startDate || '', deadline: p.deadline || '',
            createdAt: createdAt || p.startDate || new Date().toISOString(), updatedAt: new Date().toISOString()
        };
    }

    function serviceTitles(ids) {
        if (!ids) return '';
        const list = Array.isArray(ids) ? ids : Object.values(ids);
        return list.map(id => (SERVICES.find(s => s.id === id) || {}).title || id).join(' + ');
    }

    // ── روابط ──
    function pageUrl(file, params) {
        const u = new URL(file, window.location.href);
        Object.keys(params || {}).forEach(k => u.searchParams.set(k, params[k]));
        return u.href;
    }
    function portalUrl(token) { return pageUrl('client.html', { k: token }); }
    function referralUrl(refCode) { return pageUrl('index.html', { ref: refCode }) + '#request'; }
    function trackUrl(code) { return pageUrl('track.html', { c: code }); }

    function intlPhone(phone) {
        let p = String(phone || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
        if (p.startsWith('00')) p = p.slice(2);
        if (p.startsWith('05')) p = '966' + p.slice(1);
        else if (p.startsWith('5') && p.length === 9) p = '966' + p;
        return p;
    }
    function waLink(phone, text) {
        const p = intlPhone(phone);
        return 'https://wa.me/' + p + (text ? '?text=' + encodeURIComponent(text) : '');
    }

    // ── أدوات ──
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function safeJSON(s, fallback) { try { return JSON.parse(s); } catch (e) { return fallback; } }
    function fmtNum(n, digits) {
        return (parseFloat(n) || 0).toLocaleString('en-US', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
    }
    function fmtDate(iso) {
        if (!iso) return '-';
        const d = new Date(iso);
        if (isNaN(d)) return String(iso);
        return d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    // «غدًا / بعد يومين / بعد 5 أيام / بعد 12 يومًا» بصيغة عربية صحيحة
    function inDays(n) {
        if (n <= 0) return 'اليوم';
        if (n === 1) return 'غدًا';
        if (n === 2) return 'بعد يومين';
        if (n <= 10) return 'بعد <span class="en">' + n + '</span> أيام';
        return 'بعد <span class="en">' + n + '</span> يومًا';
    }
    function daysUntil(dateStr) {
        if (!dateStr) return null;
        const d = new Date(dateStr + 'T23:59:59');
        if (isNaN(d)) return null;
        return Math.ceil((d - new Date()) / 86400000);
    }

    // تصغير صورة قبل حفظها في قاعدة البيانات (dataURL بصيغة JPEG)
    function resizeImage(file, maxSide, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => {
                const img = new Image();
                img.onerror = reject;
                img.onload = () => {
                    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#050c3f';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', quality || 0.82));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    window.RNAN = {
        SERVICES, PORTFOLIO_CATEGORIES, DEFAULT_PORTFOLIO, REWARDS, REFERRAL_BONUS, STAGES,
        tierOf, newToken, newRefCode, newTrackCode, normalizeCode,
        trackFromRequest, trackFromProject, serviceTitles,
        pageUrl, portalUrl, referralUrl, trackUrl, intlPhone, waLink,
        esc, safeJSON, fmtNum, fmtDate, daysUntil, inDays, resizeImage
    };
})();
