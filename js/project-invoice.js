// إضافة سعر مشروع إلى فاتورة مفتوحة لنفس العميل (غير مدفوعة ولا ملغاة) بدل إصدار فاتورة منفصلة، وإزالته منها عند إلغاء المشروع.
// تستعملها نافذة المشروع (js/project-edit.js)، وقائمة «⋯» في صفحة المشاريع (js/projects-page.js)، وخطوات ما بعد «مشروع جديد» (js/projects-ui.js)،
// ونافذة إلغاء المشروع (js/project-cancel.js).
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

    // بنود الخصم آخرًا، والخصم بالنسبة يُعاد حسابه على المجموع الجديد كما يحفظه محرر الفاتورة
    function rebuild(rest, disc) {
        const sub = rest.reduce((s, x) => s + lineOf(x), 0);
        disc.forEach(x => { const m = String(x.desc).match(/(\d+(\.\d+)?)%/); if (m) x.price = -round(sub * m[1] / 100); });
        const all = rest.concat(disc);
        return { items: all, total: round(all.reduce((s, x) => s + lineOf(x), 0)) };
    }
    function split(inv) {
        const items = (inv.items || []).map(x => Object.assign({}, x));
        return { disc: items.filter(isDisc), rest: items.filter(x => !isDisc(x)) };
    }
    function withProject(inv, name, value) {
        const { disc, rest } = split(inv);
        rest.push({ desc: line(name), qty: 1, price: value });
        return rebuild(rest, disc);
    }
    const save = (inv, items, total, status) => run('saveInvoiceToSheet', { invoiceNumber: inv.number, clientSelect: inv.client, issueDate: inv.date, status: status || inv.status, totalAmount: total, items, notes: inv.notes, footerText: inv.footerText });

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
        await save(inv, items, total);
        inv.items = items;
        inv.amount = total;
        return { number: inv.number, total };
    }

    // فواتير العميل التي فيها بند المشروع، وما يمكن فعله بكل منها عند إلغائه:
    // remove = حذف البند (للفاتورة بنود أخرى)، void = إلغاء الفاتورة (المشروع بندها الوحيد)، paid / payments = تُراجع يدويًا
    function linked(client, name) {
        const c = trim(client);
        return I().filter(i => trim(i.client) === c && i.status !== 'ملغاة' && i.status !== 'ملغي' && has(i, name)).map(inv => {
            const own = (inv.items || []).filter(x => trim(x.desc) === line(name)).reduce((s, x) => s + lineOf(x), 0);
            const others = (inv.items || []).filter(x => !isDisc(x) && trim(x.desc) !== line(name)).length;
            const paidSome = window.InvoiceMoney ? InvoiceMoney.paid(inv) > 0 : false;
            const action = inv.status === 'مدفوعة' ? 'paid' : paidSome ? 'payments' : others ? 'remove' : 'void';
            const after = action === 'remove' ? (() => { const { disc, rest } = split(inv); return rebuild(rest.filter(x => trim(x.desc) !== line(name)), disc).total; })() : 0;
            return { inv, own: round(own), action, after };
        });
    }
    async function detach(inv, name) {
        const { disc, rest } = split(inv);
        const left = rest.filter(x => trim(x.desc) !== line(name));
        if (!left.length) {
            await save(inv, inv.items || [], parseFloat(inv.amount) || 0, 'ملغاة');
            inv.status = 'ملغاة';
            return { number: inv.number, voided: true };
        }
        const { items, total } = rebuild(left, disc);
        await save(inv, items, total);
        inv.items = items;
        inv.amount = total;
        return { number: inv.number, total };
    }

    window.ProjectInvoice = { open, has, add, count, linked, detach };
})();
