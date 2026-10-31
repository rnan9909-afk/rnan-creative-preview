/**
 * منصّات صفحة الروابط (links.html) — مشتركة بين الصفحة العامة ومدير الروابط في لوحة الإدارة.
 * تُعرف المنصّة من الرابط تلقائيًا، ويمكن تحديدها يدويًا عند الإضافة.
 */
(function () {
    const PLATFORMS = [
        { id: 'whatsapp', name: 'واتساب', icon: 'whatsapp', bg: '#25D366', fg: '#fff', social: true, match: /wa\.me|whatsapp\.com/i },
        { id: 'telegram', name: 'تيليجرام', icon: 'telegram', bg: '#2AABEE', fg: '#fff', social: true, match: /t\.me\/|telegram\.(me|org)/i },
        { id: 'instagram', name: 'إنستغرام', icon: 'instagram', bg: 'linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)', fg: '#fff', social: true, match: /instagram\.com|instagr\.am/i },
        { id: 'x', name: 'إكس', icon: 'xlogo', bg: '#000', fg: '#fff', social: true, match: /(^|\/\/|\.)(x|twitter)\.com/i },
        { id: 'tiktok', name: 'تيك توك', icon: 'tiktok', bg: '#000', fg: '#fff', social: true, match: /tiktok\.com/i },
        { id: 'snapchat', name: 'سناب شات', icon: 'snapchat', bg: '#FFFC00', fg: '#111', social: true, match: /snapchat\.com/i },
        { id: 'behance', name: 'بيهانس', icon: 'behance', bg: '#1769FF', fg: '#fff', social: true, match: /behance\.net/i },
        { id: 'linkedin', name: 'لينكدإن', icon: 'linkedin', bg: '#0A66C2', fg: '#fff', social: true, match: /linkedin\.com/i },
        { id: 'youtube', name: 'يوتيوب', icon: 'youtube', bg: '#FF0000', fg: '#fff', social: true, match: /youtube\.com|youtu\.be/i },
        { id: 'email', name: 'بريد إلكتروني', icon: 'mail', bg: '#47E0AC', fg: '#02083A', social: false, match: /^mailto:/i },
        { id: 'phone', name: 'اتصال', icon: 'phone', bg: '#47E0AC', fg: '#02083A', social: false, match: /^tel:/i },
        { id: 'location', name: 'الموقع على الخريطة', icon: 'pin', bg: '#47E0AC', fg: '#02083A', social: false, match: /maps\.(google|app)|goo\.gl\/maps/i },
        { id: 'website', name: 'موقع / رابط', icon: 'globe', bg: '#47E0AC', fg: '#02083A', social: false, match: null }
    ];

    // الروابط الحالية في linktr.ee/rnan_des — تظهر حتى يحفظ المستخدم صفحته من لوحة الإدارة
    const DEFAULTS = {
        title: 'رنان لخدمات التصميم',
        bio: 'عبدالعزيز النهدي · هوية بصرية · سوشيال ميديا · مطبوعات',
        links: [
            { id: 'site', title: 'موقع رنان — اطلب خدمتك', url: 'index.html', platform: 'website', active: true, featured: true },
            { id: 'wa', title: 'WhatsApp', url: 'https://t.co/bJLX9tltKo', platform: 'whatsapp', active: true },
            { id: 'tg', title: 'رنان لخدمات التصميم', url: 'https://t.me/rnandeign', platform: 'telegram', active: true },
            { id: 'be', title: 'Behance', url: 'https://www.behance.net/bbf5ad64', platform: 'behance', active: true },
            { id: 'tt', title: 'TikTok', url: 'https://www.tiktok.com/@rnandesign2024', platform: 'tiktok', active: true },
            { id: 'sc', title: 'Snapchat', url: 'https://www.snapchat.com/add/azooz9909', platform: 'snapchat', active: true },
            { id: 'ig', title: 'Instagram', url: 'https://www.instagram.com/rnan_des2025/', platform: 'instagram', active: true },
            { id: 'xx', title: 'X', url: 'https://x.com/rnandesign', platform: 'x', active: true }
        ]
    };

    function byId(id) {
        return PLATFORMS.find(p => p.id === id) || PLATFORMS[PLATFORMS.length - 1];
    }

    function detect(url) {
        const u = String(url || '').trim();
        return (PLATFORMS.find(p => p.match && p.match.test(u)) || PLATFORMS[PLATFORMS.length - 1]).id;
    }

    // أي رابط بلا بروتوكول يُعامل كرابط ويب: instagram.com/x → https://instagram.com/x
    function normalizeUrl(url) {
        let u = String(url || '').trim();
        if (!u) return '';
        if (/^(https?:|mailto:|tel:)/i.test(u) || /^[\w-]+\.html/i.test(u) || u.startsWith('#') || u.startsWith('/')) return u;
        if (/^\+?\d[\d\s-]{7,}$/.test(u)) return 'tel:' + u.replace(/[\s-]/g, '');
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) return 'mailto:' + u;
        return 'https://' + u;
    }

    window.LinkPlatforms = { PLATFORMS, DEFAULTS, byId, detect, normalizeUrl };
})();
