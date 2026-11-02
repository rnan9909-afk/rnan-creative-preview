// الأرقام في حقول الإدخال لاتينية دائمًا: حقول number يعرضها المتصفح العربي بالأرقام الهندية (٦٤)، فتصير نصية بلوحة أرقام،
// وما يُكتب بالأرقام الهندية أو الفارسية يتحوّل فورًا. يعمل على كل ما يُضاف للصفحة لاحقًا (النوافذ والصفحات المرسومة بالجافاسكربت).
(function () {
    const MAP = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9, '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9 };
    // الفاصلة للآلاف تُحذف، و«٫» العربية فاصلة عشرية
    const latin = v => String(v == null ? '' : v).replace(/[٠-٩۰-۹]/g, d => MAP[d]).replace(/[٬,،]/g, '').replace(/٫/g, '.');
    const NUM = 'input[data-num], input[inputmode="decimal"], input[inputmode="numeric"]';

    function fix(root) {
        if (!root || !root.querySelectorAll) return;
        const list = root.matches && root.matches('input[type="number"]') ? [root] : root.querySelectorAll('input[type="number"]');
        list.forEach(el => {
            const v = el.value, step = el.getAttribute('step');
            el.type = 'text';
            el.dataset.num = '1';
            if (!el.getAttribute('inputmode')) el.setAttribute('inputmode', step && step !== 'any' && !step.includes('.') && !(+el.getAttribute('min') < 0) ? 'numeric' : 'decimal');
            if (!el.getAttribute('dir')) el.setAttribute('dir', 'ltr');
            el.setAttribute('autocomplete', 'off');
            el.value = latin(v);
        });
    }
    document.addEventListener('input', e => {
        const t = e.target;
        if (!t.matches || !t.matches(NUM)) return;
        const v = latin(t.value).replace(/[^\d.\-]/g, '');
        if (v !== t.value) t.value = v;
    }, true);
    new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && fix(n))))
        .observe(document.documentElement, { childList: true, subtree: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => fix(document)); else fix(document);
    window.RnDigits = { latin, fix };
})();
