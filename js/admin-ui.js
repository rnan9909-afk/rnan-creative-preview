// توهّج البطاقات مع حركة المؤشر — نفس تأثير بطاقات الموقع (css/admin-site.css يرسمه بـ --mx/--my)
document.addEventListener('pointermove', function (e) {
    var card = e.target.closest && e.target.closest('.glass-panel');
    if (!card || card.id === 'sidebar') return;
    var r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
}, { passive: true });
