// إضافة سعر مشروع إلى فاتورة مفتوحة لنفس العميل (غير مدفوعة ولا ملغاة) بدل إصدار فاتورة منفصلة.
// تستعملها نافذة المشروع (js/project-edit.js)، وقائمة «⋯» في صفحة المشاريع (js/projects-page.js)، وخطوات ما بعد «مشروع جديد» (js/projects-ui.js).
(function () {
    const CLOSED = ['مدفوعة', 'ملغاة', 'ملغي'];
    const I = () => (typeof invoicesData !== 'undefined' ? invoicesData : []);
    const P = () => (typeof projectsData !== 'undefined' ? projectsData : []);
    const trim = s => String(s == null ? '' : s).trim();
    const round = v => Math.round(v * 100) / 100;
    const lineOf = x => (parseFloat(x.qty) || 0) * (parseFloat(x.price) || 0);
    const isDisc = x => lineOf(x) < 0 && /خصم|discount/i.test(String(x.desc || '')) && !/مكافأة/.test(String(x.desc || ''));
    const run = (fn, ...a) => new Promise((res, rej) => google.script.run.withSuccessHandler(res).withFailureHandler(rej)[fn](...a));
    const line = name => 'مشروع: ' + trim(name);

    // فواتير العميل المفتوحة، الأحدث أولًا
    function open(client) {
        const c = trim(client);
        if (!c) return [];
        return I().filter(i => trim(i.client) === c && !CLOSED.includes(i.status))
            .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.number).localeCompare(String(a.number)));
    }
    const has = (inv, name) => !!trim(name) && (inv.items || []).some(x => trim(x.desc) === line(name));
    const count = inv => (inv.items || []).filter(x => !isDisc(x)).length;

    // بند المشروع قبل بنود الخصم، والخصم بالنسبة يُعاد حسابه على المجموع الجديد كما يحفظه محرر الفاتورة
    function withProject(inv, name, value) {
        const items = (inv.items || []).map(x => Object.assign({}, x));
        const disc = items.filter(isDisc), rest = items.filter(x => !isDisc(x));
        rest.push({ desc: line(name), qty: 1, price: value });
        const sub = rest.reduce((s, x) => s + lineOf(x), 0);
        disc.forEach(x => { const m = String(x.desc).match(/(\d+(\.\d+)?)%/); if (m) x.price = -round(sub * m[1] / 100); });
        const all = rest.concat(disc);
        return { items: all, total: round(all.reduce((s, x) => s + lineOf(x), 0)) };
    }

    // p: { rowIndex, name, value, saved } — saved قيمة المشروع المحفوظة؛ إن اختلفت عن المضافة تُحفظ أولًا لتطابق الفاتورة
    async function add(inv, p) {
        const value = round(parseFloat(String(p.value == null ? '' : p.value).replace(/[^\d.]/g, '')) || 0);
        if (!(value > 0)) throw new Error('أدخل قيمة المشروع أولًا');
        if (!trim(p.name)) throw new Error('اكتب اسم المشروع أولًا');
        if (has(inv, p.name)) throw new Error('المشروع مضاف لهذه الفاتورة من قبل');
        if (p.rowIndex && window.db && round(parseFloat(p.saved) || 0) !== value) {
            await window.db.ref('projects/' + p.rowIndex + '/value').set(value);
            const local = P().find(x => x.rowIndex === p.rowIndex);
            if (local) local.value = value;
        }
        const { items, total } = withProject(inv, p.name, value);
        await run('saveInvoiceToSheet', { invoiceNumber: inv.number, clientSelect: inv.client, issueDate: inv.date, status: inv.status, totalAmount: total, items, notes: inv.notes, footerText: inv.footerText });
        inv.items = items;
        inv.amount = total;
        return { number: inv.number, total };
    }

    window.ProjectInvoice = { open, has, add, count };
})();
