/**
 * الاتفاقية الرسمية (agreement.html?k=<token>): تُبنى من العرض العام offer/<token> نفسه —
 * النطاق والبنود والمراحل والتسعير والشروط — مع بيانات الطرفين في offer/<token>/agreement
 * (تكتبها لوحة الإدارة من نافذة «الاتفاقية الرسمية»). للقراءة والطباعة فقط؛ لا تكتب شيئًا.
 * ‎&print=1‎ يفتح نافذة الطباعة تلقائيًا بعد التحميل.
 */
(function () {
    const $ = s => document.querySelector(s);
    const E = RNAN.esc;
    const params = new URLSearchParams(location.search);
    const token = params.get('k') || '';
    const KIND = { quote: 'عرض السعر', contract: 'عقد المشروع' };
    const ORD = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
        'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر'];

    const num = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const sar = n => `<span class="en">${num(n)}</span> ريال`;
    const pd = s => { if (/^\d{4}-\d{2}-\d{2}$/.test(s)) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); } return new Date(s); };
    const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
    const greg = s => pd(s).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) + 'م';
    const gregShort = s => pd(s).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short' });
    const hijri = s => pd(s).toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s*هـ$/, '') + 'هـ';
    const weekday = s => pd(s).toLocaleDateString('ar-SA', { weekday: 'long' });
    const time = s => new Date(s).toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' });

    // ── تفقيط المبالغ: 3500 → «فقط ثلاثة آلاف وخمسمائة ريال سعودي لا غير» ──
    const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر',
        'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
    function below1000(n, construct) {
        const h = Math.floor(n / 100), r = n % 100, out = [];
        if (h) out.push(h === 2 && construct ? 'مائتا' : HUNDREDS[h]);
        if (r) out.push(r < 20 ? ONES[r] : (r % 10 ? ONES[r % 10] + ' و' + TENS[Math.floor(r / 10)] : TENS[r / 10]));
        return out.join(' و');
    }
    function scale(n, one, two, plural) {
        if (n === 1) return one;
        if (n === 2) return two;
        const r = n % 100, w = below1000(n, r === 0);
        if (r >= 3 && r <= 10) return w + ' ' + plural;
        return w + ' ' + one;
    }
    function words(n) {
        n = Math.floor(n);
        if (!n) return 'صفر';
        const m = Math.floor(n / 1e6), t = Math.floor(n / 1000) % 1000, r = n % 1000, out = [];
        if (m) out.push(scale(m, 'مليون', 'مليونان', 'ملايين'));
        if (t) out.push(scale(t, 'ألف', 'ألفان', 'آلاف'));
        if (r) out.push(below1000(r, r % 100 === 0)); // «مائتا ريال»
        return out.join(' و');
    }
    function moneyWords(v) {
        v = Math.round((+v || 0) * 100) / 100;
        const riyals = Math.floor(v), hal = Math.round((v - riyals) * 100);
        return 'فقط ' + words(riyals) + ' ريال سعودي' + (hal ? ' و' + words(hal) + ' هللة' : '') + ' لا غير';
    }

    // صف في جدول الطرف: القيمة، أو خط فارغ للتعبئة باليد إن كان الحقل أساسيًا
    const row = (label, val, required) => val ? `<tr><th>${label}</th><td>${E(val)}</td></tr>`
        : (required ? `<tr><th>${label}</th><td><span class="blank"></span></td></tr>` : '');
    const ol = lines => `<ol>${lines.filter(Boolean).map(l => `<li>${l}</li>`).join('')}</ol>`;
    const lines = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
    const svg = n => `<svg class="icon"><use href="#i-${n}"/></svg>`;

    // ── نص البنود المحرَّر من لوحة الإدارة (agreement.edits[مفتاح البند] = { blocks }) ──
    // كتل نصية فقط: فقرة p أو بند مرقّم li، و keep للجداول المولَّدة (البنود والمراحل) فتبقى كما هي
    const keyOf = t => String(t).replace(/[.#$\/\[\]]/g, '-');
    function fromBlocks(blocks, origHtml) {
        const tpl = document.createElement('template');
        tpl.innerHTML = origHtml;
        const tables = [...tpl.content.querySelectorAll('table')];
        let out = '', li = [];
        const flush = () => { if (li.length) { out += `<ol>${li.map(x => `<li>${x}</li>`).join('')}</ol>`; li = []; } };
        (blocks || []).forEach(b => {
            if (b.t === 'li') { li.push(E(b.x).replace(/\n/g, '<br>')); return; }
            flush();
            if (b.t === 'keep') { if (tables[b.i]) out += tables[b.i].outerHTML; }
            else out += `<p>${E(b.x).replace(/\n/g, '<br>')}</p>`;
        });
        flush();
        return out;
    }
    function blocksOf(root) {
        const out = [];
        let ti = 0;
        const txt = n => (n.innerText || n.textContent || '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{2,}/g, '\n').trim();
        root.childNodes.forEach(n => {
            if (n.nodeType === 3) { const x = n.textContent.trim(); if (x) out.push({ t: 'p', x }); return; }
            if (n.nodeType !== 1 || n.tagName === 'BR' || n.classList.contains('cl-reset')) return;
            if (n.tagName === 'TABLE') { out.push({ t: 'keep', i: ti++ }); return; }
            if (n.tagName === 'OL' || n.tagName === 'UL') { n.querySelectorAll(':scope > li').forEach(li => { const x = txt(li); if (x) out.push({ t: 'li', x }); }); return; }
            const x = txt(n);
            if (x) out.push({ t: 'p', x });
        });
        return out;
    }
    const EDIT = params.get('edit') === '1' && window.parent !== window;
    let ORIG = {}, SAVED = {}, ready = false;
    const dirty = new Set(), resets = new Set();

    function render(o) {
        const a = o.agreement || {};
        const p1 = Object.assign({ name: 'رنان لخدمات التصميم' }, a.party1 || {});
        const p2 = Object.assign({ type: 'person', name: o.client || '' }, a.party2 || {});
        const org = p2.type === 'org';
        const kind = KIND[o.kind] || KIND.quote;
        const date = a.date || ymd(new Date());
        const reply = o.reply && o.reply.decision === 'approved' ? o.reply : null;
        const items = o.items || [], phases = o.phases || [], ms = o.milestones || [];
        const p2Name = p2.name || o.client || '';

        document.title = `اتفاقية ${o.number || ''} - ${p2Name || o.title}`.replace(/[\\/:*?"<>|]+/g, '-');

        // ── البنود (تُرقَّم تلقائيًا ويُتخطّى الفارغ منها) ──
        const C = [];
        C.push(['التمهيد والملاحق', `<p>يُعدّ التمهيد السابق جزءًا لا يتجزأ من هذه الاتفاقية ومكمّلًا لها، وكذلك ${kind} رقم (<span class="en">${E(o.number || '—')}</span>)${o.issuedAt ? ` الصادر بتاريخ ${greg(o.issuedAt)}` : ''} وما تضمّنه من نطاق عمل ومراحل وتسعير، ويُقرأ معها ويُفسَّر بها.</p>`]);

        C.push(['موضوع الاتفاقية ونطاق العمل', `
            <p>يلتزم الطرف الأول بتنفيذ أعمال «<b>${E(o.title)}</b>» لصالح الطرف الثاني${o.intro ? '، وفق الوصف الآتي:' : ' وفق البنود الآتية:'}</p>
            ${o.intro ? `<p>${E(o.intro).replace(/\n/g, '<br>')}</p>` : ''}
            <table class="ag-table">
                <thead><tr><th class="c">م</th><th>البند</th><th class="n hide-sm">الكمية</th><th class="n hide-sm">سعر الوحدة</th><th class="n">الإجمالي</th></tr></thead>
                <tbody>${items.map((i, k) => `<tr><td class="c en">${k + 1}</td><td>${E(i.desc)}</td><td class="n hide-sm"><span class="en">${num(i.qty)}</span></td><td class="n hide-sm">${sar(i.price)}</td><td class="n">${sar((+i.qty || 0) * (+i.price || 0))}</td></tr>`).join('')}</tbody>
                <tfoot>
                    ${o.discount || o.vat ? `<tr><td colspan="2">المجموع</td><td class="hide-sm" colspan="2"></td><td class="n">${sar(o.subtotal)}</td></tr>` : ''}
                    ${o.discount ? `<tr><td colspan="2">الخصم</td><td class="hide-sm" colspan="2"></td><td class="n">− ${sar(o.discount)}</td></tr>` : ''}
                    ${o.vat ? `<tr><td colspan="2">ضريبة القيمة المضافة 15%</td><td class="hide-sm" colspan="2"></td><td class="n">${sar(o.vat)}</td></tr>` : ''}
                    <tr class="grand"><td colspan="2">الإجمالي</td><td class="hide-sm" colspan="2"></td><td class="n">${sar(o.total)}</td></tr>
                </tfoot>
            </table>
            <p>وأي عمل لم يرد ذكره في هذا البند يُعدّ خارج نطاق الاتفاقية، ويُتفق عليه وعلى قيمته ومدته كتابيًا قبل تنفيذه.</p>`]);

        let acc = 0;
        const start = o.startDate || '';
        C.push(['مدة التنفيذ ومراحله', o.days ? `
            <p>مدة تنفيذ الأعمال (<span class="en">${o.days}</span>) يومًا، تبدأ ${start ? `من تاريخ ${greg(start)}` : 'من تاريخ استلام الدفعة المقدّمة'} بعد استلام المحتوى والمواد اللازمة من الطرف الثاني${phases.length ? '، وتُنفَّذ على المراحل الآتية:' : '.'}</p>
            ${phases.length ? `<table class="ag-table">
                <thead><tr><th class="c">م</th><th>المرحلة</th><th class="n">المدة</th><th class="n">التوقيت</th></tr></thead>
                <tbody>${phases.map((x, k) => {
                    const d = +x.days || 0, from = acc + 1;
                    acc += d;
                    const when = !d ? '—' : start ? `${gregShort(addDays(start, from - 1))}${d > 1 ? ' – ' + gregShort(addDays(start, acc - 1)) : ''}` : `اليوم <span class="en">${from}${d > 1 ? '–' + acc : ''}</span>`;
                    return `<tr><td class="c en">${k + 1}</td><td>${E(x.name)}</td><td class="n">${d ? `<span class="en">${d}</span> ${d === 1 ? 'يوم' : d === 2 ? 'يومان' : d <= 10 ? 'أيام' : 'يومًا'}` : '—'}</td><td class="n">${when}</td></tr>`;
                }).join('')}</tbody>
            </table>` : ''}
            ${ms.length ? `<p>ويُطلب اعتماد الطرف الثاني عند المحطات الآتية: ${ms.map(m => '«' + E(m.title) + '»').join('، ')}.</p>` : ''}
            <p>ولا تُحتسب ضمن مدة التنفيذ الأيام التي ينتظر فيها الطرف الأول ملاحظات الطرف الثاني أو اعتماده أو المواد المطلوبة منه.</p>`
            : `<p>تُنفَّذ الأعمال خلال المدة المتفق عليها بين الطرفين، وتبدأ من تاريخ استلام الدفعة المقدّمة والمواد اللازمة من الطرف الثاني.</p>`]);

        const bank = p1.bank || {};
        C.push(['قيمة الاتفاقية وطريقة الدفع', `
            <p>القيمة الإجمالية لهذه الاتفاقية <b class="money">${sar(o.total)} سعودي</b> <span class="words">(${moneyWords(o.total)})</span>${o.vat ? '، شاملةً ضريبة القيمة المضافة' : ''}${o.discount ? `، وذلك بعد خصم قدره ${sar(o.discount)}` : ''}، تُسدَّد على النحو الآتي:</p>
            ${ol(o.deposit ? [
                `الدفعة الأولى (مقدّمة): <b class="money">${sar(o.depositAmount)}</b> تمثّل (<span class="en">${o.deposit}%</span>) من القيمة، تُسدَّد عند توقيع الاتفاقية، ولا يبدأ العمل قبل سدادها.`,
                o.deposit < 100 ? `الدفعة الثانية (نهائية): <b class="money">${sar(o.remaining)}</b> تمثّل (<span class="en">${100 - o.deposit}%</span>) من القيمة، تُسدَّد عند التسليم النهائي وقبل تسليم الملفات المصدرية.` : '',
                bank.iban ? `يكون السداد بالتحويل إلى حساب الطرف الأول${bank.bank ? ' لدى ' + E(bank.bank) : ''}${bank.holder ? ' باسم ' + E(bank.holder) : ''}، رقم الآيبان: <span class="en">${E(bank.iban)}</span>.` : ''
            ] : [
                'يُسدَّد كامل المبلغ عند التسليم النهائي وقبل تسليم الملفات المصدرية.',
                bank.iban ? `يكون السداد بالتحويل إلى حساب الطرف الأول${bank.bank ? ' لدى ' + E(bank.bank) : ''}${bank.holder ? ' باسم ' + E(bank.holder) : ''}، رقم الآيبان: <span class="en">${E(bank.iban)}</span>.` : ''
            ])}`]);

        C.push(['التزامات الطرف الأول', ol([
            'تنفيذ الأعمال بجودة واحترافية وفق أفضل الممارسات المهنية، وبما يطابق نطاق العمل المتفق عليه.',
            'الالتزام بالجدول الزمني للمراحل، وإطلاع الطرف الثاني على سير العمل وعرض المخرجات عليه عند كل مرحلة.',
            'إجراء التعديلات المطلوبة ضمن النطاق وعدد المراجعات المتفق عليه.',
            'تسليم الملفات النهائية بالصيغ المتفق عليها بعد استكمال سداد المستحقات.',
            'عدم استخدام بيانات الطرف الثاني ومواده لغير أغراض هذه الاتفاقية.'
        ])]);
        C.push(['التزامات الطرف الثاني', ol([
            'سداد المستحقات المالية في مواعيدها المحددة في هذه الاتفاقية.',
            'تزويد الطرف الأول بالمحتوى والمعلومات والمواد اللازمة كاملةً وفي الوقت المناسب.',
            'مراجعة ما يُرسل إليه وإبداء ملاحظاته أو اعتماده خلال (<span class="en">3</span>) أيام عمل من استلامه، وفي حال التأخر تُمدَّد مدة التنفيذ بقدر مدة التأخير.',
            'ضمان أن المواد التي يقدّمها (نصوص، صور، شعارات، علامات) مملوكة له أو مرخّصة، ويتحمّل وحده المسؤولية عنها تجاه الغير.',
            'تسمية شخص واحد للتواصل يكون اعتماده للأعمال ملزمًا للطرف الثاني.'
        ])]);
        C.push(['التعديلات والأعمال الإضافية', `<p>يحق للطرف الثاني طلب التعديلات ضمن النطاق والعدد المتفق عليه، وأي تعديل جوهري أو عمل إضافي خارج النطاق يُسعَّر ويُتفق عليه كتابيًا — بما في ذلك المراسلات الإلكترونية — قبل تنفيذه، وقد يترتب عليه تمديد مدة التنفيذ.</p>`]);
        if (lines(o.terms).length) C.push(['الشروط الخاصة', `<p>اتفق الطرفان على الشروط الخاصة الآتية:</p>${ol(lines(o.terms).map(E))}`]);
        C.push(['حقوق الملكية الفكرية', ol([
            'تنتقل ملكية التصاميم النهائية المعتمدة إلى الطرف الثاني بعد سداد كامل قيمة الاتفاقية.',
            'تبقى المقترحات والمسودات غير المعتمدة وملفات العمل الداخلية ملكًا للطرف الأول.',
            'يحق للطرف الأول عرض الأعمال المنفّذة في معرض أعماله وحساباته ما لم يطلب الطرف الثاني خلاف ذلك كتابيًا.',
            'لا تشمل الملكية الخطوط والصور والعناصر المرخّصة من جهات أخرى، وتخضع لشروط تراخيصها.'
        ])]);
        C.push(['السرية', `<p>يلتزم كل طرف بالمحافظة على سرية ما يطّلع عليه من معلومات وبيانات تخص الطرف الآخر، وعدم الإفصاح عنها للغير إلا بموافقة كتابية مسبقة أو بموجب نظام، ويستمر هذا الالتزام بعد انتهاء الاتفاقية.</p>`]);
        C.push(['إنهاء الاتفاقية', ol([
            'يجوز لأي من الطرفين إنهاء الاتفاقية بإشعار كتابي إذا أخلّ الطرف الآخر بالتزاماته ولم يعالج الإخلال خلال (<span class="en">7</span>) أيام من إشعاره.',
            'إذا أنهى الطرف الثاني الاتفاقية بعد بدء العمل لغير إخلال من الطرف الأول، فلا تُسترد الدفعة المقدّمة، ويستحق الطرف الأول قيمة ما أنجزه من أعمال.',
            'عند الإنهاء يُسلَّم للطرف الثاني ما أُنجز من أعمال سُدّدت قيمتها.'
        ])]);
        C.push(['التواصل والإخطارات', `<p>تُعدّ وسائل التواصل المدوّنة لكل طرف في صدر هذه الاتفاقية (الجوال وواتساب والبريد الإلكتروني) وسائلَ معتمدة للمراسلات والإخطارات واعتماد الأعمال بين الطرفين، وتُنتج آثارها النظامية.</p>`]);
        if (lines(a.extra).length) C.push(['أحكام إضافية', ol(lines(a.extra).map(E))]);
        C.push(['النظام الواجب التطبيق وتسوية النزاعات', `<p>تخضع هذه الاتفاقية لأنظمة المملكة العربية السعودية، وما ينشأ عنها من خلاف يُحل وديًا بين الطرفين، فإن تعذّر ذلك خلال (<span class="en">15</span>) يومًا يُحال إلى الجهة القضائية المختصة${p1.city ? ' في مدينة ' + E(p1.city) : ' في المملكة العربية السعودية'}.</p>`]);
        const n = C.length + 1;
        C.push(['نسخ الاتفاقية', `<p>حُرّرت هذه الاتفاقية من (<span class="en">${n}</span>) بندًا ونسختين أصليتين، تسلّم كل طرف نسخة للعمل بموجبها. وتُعدّ موافقة الطرف الثاني الإلكترونية على ${kind} المرتبط بها، أو توقيعه على هذه الاتفاقية، قبولًا ملزمًا بكل ما ورد فيها. والله وليّ التوفيق.</p>`]);

        const contact = [p1.phone && `<span>الجوال: <span class="en">${E(p1.phone)}</span></span>`, p1.email && `<span class="en">${E(p1.email)}</span>`, p1.city && `<span>${E(p1.city)}</span>`].filter(Boolean).join('');

        // كل بند بمفتاح ثابت من عنوانه؛ النص المحرَّر يحلّ محل المولَّد، والمولَّد محفوظ لزر «النص الأصلي»
        SAVED = a.edits || {};
        ORIG = {};
        const sec = (head, t, html) => {
            const k = keyOf(t), ed = SAVED[k] && SAVED[k].blocks;
            ORIG[k] = html;
            return `<section class="cl" data-key="${E(k)}"${ed ? ' data-edited="1"' : ''}><h2>${head}</h2><div class="cl-body">${ed ? fromBlocks(ed, html) : html}</div></section>`;
        };

        // الترويسة الكحلية في thead: المتصفح يكرّرها أعلى كل صفحة مطبوعة
        $('#ag-doc').innerHTML = `<table class="ag-frame"><thead><tr><td>
            <header class="ag-head">
                <img src="images/invoice-wave.svg" alt="" class="ag-wave">
                <div class="ag-brand"><img src="images/ranan-logo.svg" alt="رنان"><div><b>${E(p1.name)}</b><small>${p1.cr ? `السجل / الوثيقة: <span class="en">${E(p1.cr)}</span>` : 'هوية بصرية · تصميم · محتوى إبداعي'}${p1.vat ? ` · الرقم الضريبي: <span class="en">${E(p1.vat)}</span>` : ''}</small></div></div>
                <div class="ag-doc">
                    <span class="ag-kind">اتفاقية تقديم خدمات تصميم</span>
                    <dl class="ag-meta">
                        <dt>رقم الاتفاقية</dt><dd class="en">${E(o.number || '—')}</dd>
                        <dt>التاريخ</dt><dd>${greg(date)}</dd>
                        <dt>الموافق</dt><dd>${hijri(date)}</dd>
                    </dl>
                </div>
            </header>
            </td></tr></thead><tbody><tr><td>
            <h1 class="ag-title">اتفاقية تقديم خدمات تصميم</h1>
            <p class="ag-sub">«${E(o.title)}»${o.revision > 1 ? `<span class="ref">النسخة <span class="en">${E(o.revision)}</span></span>` : ''}</p>

            <p class="ag-intro">إنه في يوم ${weekday(date)} ${hijri(date)} الموافق ${greg(date)}، تم الاتفاق بين كلٍّ من:</p>
            <div class="ag-parties">
                <section class="party">
                    <h3>الطرف الأول <small>مقدّم الخدمة</small></h3>
                    <table>
                        ${row('الاسم', p1.name, true)}
                        ${row('السجل التجاري / الوثيقة', p1.cr)}
                        ${row('الرقم الضريبي', p1.vat)}
                        ${row('العنوان', p1.address || p1.city, true)}
                        ${row('الجوال', p1.phone, true)}
                        ${row('البريد الإلكتروني', p1.email)}
                        ${row('ويمثّله في التوقيع', [p1.rep, p1.repTitle].filter(Boolean).join(' — '))}
                    </table>
                </section>
                <section class="party">
                    <h3>الطرف الثاني <small>العميل</small></h3>
                    <table>
                        ${row(org ? 'اسم المنشأة' : 'الاسم', p2Name, true)}
                        ${row(org ? 'رقم السجل التجاري' : 'رقم الهوية / الإقامة', p2.idNo, true)}
                        ${org ? row('ويمثّلها', [p2.rep, p2.repTitle].filter(Boolean).join(' — '), true) : ''}
                        ${row('العنوان', p2.address || p2.city, true)}
                        ${row('الجوال', p2.phone, true)}
                        ${row('البريد الإلكتروني', p2.email)}
                    </table>
                </section>
            </div>
            <p class="ag-both">ويُشار إليهما مجتمعَين بـ«الطرفين».</p>

            ${sec('<span>التمهيد</span>', 'التمهيد', `<p>لمّا كان الطرف الأول جهةً متخصصة في تقديم خدمات التصميم والهوية البصرية والمحتوى الإبداعي، ولمّا رغب الطرف الثاني في الاستعانة بخدماته لتنفيذ «${E(o.title)}»، فقد اتفق الطرفان — وهما بكامل أهليتهما المعتبرة شرعًا ونظامًا — على إبرام هذه الاتفاقية وفق البنود الآتية:</p>`)}
            ${C.map(([t, html], i) => sec(`<span>البند ${ORD[i] || i + 1}</span> ${t}`, t, html)).join('')}

            <div class="ag-sign">
                <div class="sig stamped">
                    <h3>الطرف الأول <small>${E(p1.name)}</small></h3>
                    <div class="row"><span>الاسم</span><b>${E(p1.rep || '')}</b></div>
                    <div class="row"><span>الصفة</span><b>${E(p1.repTitle || '')}</b></div>
                    <div class="row tall"><span>التوقيع</span><b></b></div>
                    <div class="row"><span>التاريخ</span><b></b></div>
                    <div class="stamp">الختم</div>
                </div>
                <div class="sig${org ? ' stamped' : ''}">
                    <h3>الطرف الثاني <small>${E(p2Name)}</small></h3>
                    <div class="row"><span>الاسم</span><b>${E(org ? (p2.rep || '') : (p2Name || (reply && reply.name) || ''))}</b></div>
                    <div class="row"><span>الصفة</span><b>${E(org ? (p2.repTitle || '') : 'أصالةً عن نفسه')}</b></div>
                    <div class="row tall"><span>التوقيع</span><b></b></div>
                    <div class="row"><span>التاريخ</span><b></b></div>
                    ${org ? '<div class="stamp">الختم</div>' : ''}
                </div>
            </div>
            ${reply ? `<div class="ag-annex"><b>الاعتماد الإلكتروني:</b> اعتمد الطرف الثاني ${kind} رقم (<span class="en">${E(o.number || '')}</span>) المرتبط بهذه الاتفاقية إلكترونيًا عبر رابطه الخاص بتاريخ ${greg(reply.at)} الساعة ${time(reply.at)} باسم «<b>${E(reply.name)}</b>»، مع إقراره بقراءة نطاق العمل والتسعير والشروط والموافقة عليها.</div>` : ''}
            <footer class="ag-foot"><span>${E(p1.name)}</span>${contact}</footer>
            </td></tr></tbody></table>`;

        // ترقيم الصفحات وتذييلها عند الطباعة (هوامش الصفحة)
        const css = s => String(s).replace(/["\\]/g, '\\$&');
        const st = document.createElement('style');
        st.textContent = `@page {
            @bottom-right { content: "${css(p1.name + ' · اتفاقية رقم ' + (o.number || ''))}"; font: 7.5pt 'IBM Plex Sans Arabic', sans-serif; color: #7A82AC; direction: rtl; }
            @bottom-left { content: "صفحة " counter(page) " من " counter(pages); font: 7.5pt 'IBM Plex Sans Arabic', sans-serif; color: #7A82AC; direction: rtl; }
        }`;
        document.head.appendChild(st);

        const offerLink = $('#ag-offer');
        offerLink.href = RNAN.pageUrl('offer.html', { k: token });
        offerLink.hidden = false;
        const printBtn = $('#ag-print');
        printBtn.disabled = false;
        printBtn.onclick = () => window.print();
        if (params.get('print') === '1') (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => window.print(), 400));
        if (EDIT) setupEdit(); else if (params.get('print') !== '1') setupRequests(o);
        ready = true;
    }

    // ── وضع التحرير: تفتح لوحة الإدارة الاتفاقية في إطار (iframe) وتحفظ ما يُعدَّل هنا عبر collect() ──
    function setupEdit() {
        document.documentElement.classList.add('ag-editing');
        $('.ag-desk').insertAdjacentHTML('afterbegin', `<p class="ag-tip edit no-print">${svg('pen')} انقر على أي فقرة أو بند في الاتفاقية وعدّل صياغته مباشرة، ثم اضغط «حفظ التعديلات» أسفل النافذة.</p>`);
        $('#ag-doc').querySelectorAll('section.cl').forEach(s => {
            const k = s.dataset.key, body = s.querySelector('.cl-body');
            const lock = () => body.querySelectorAll('table').forEach(t => { t.contentEditable = 'false'; });
            body.contentEditable = 'true';
            body.spellcheck = false;
            lock();
            body.addEventListener('input', () => { dirty.add(k); resets.delete(k); s.dataset.edited = '1'; });
            body.addEventListener('paste', e => {
                e.preventDefault();
                document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
            });
            const rb = document.createElement('button');
            rb.type = 'button';
            rb.className = 'cl-reset no-print';
            rb.textContent = '↺ النص الأصلي';
            rb.addEventListener('click', () => {
                body.innerHTML = ORIG[k];
                lock();
                dirty.delete(k);
                resets.add(k);
                delete s.dataset.edited;
            });
            s.querySelector('h2').appendChild(rb);
        });
    }
    function collect() {
        const out = {};
        Object.keys(SAVED).forEach(k => { if (!resets.has(k) && !dirty.has(k)) out[k] = SAVED[k]; });
        dirty.forEach(k => {
            const s = [...document.querySelectorAll('#ag-doc section.cl')].find(x => x.dataset.key === k);
            if (s) out[k] = { blocks: blocksOf(s.querySelector('.cl-body')) };
        });
        return out;
    }

    // ── طلبات العميل: يحدّد نصًا في الاتفاقية ويطلب تعديله (offer/<token>/agreementNotes) ──
    function setupRequests(o) {
        const doc = $('#ag-doc');
        $('.ag-desk').insertAdjacentHTML('afterbegin', `<p class="ag-tip no-print">${svg('cursor')} ظلّل أي نص في الاتفاقية لتطلب تعديله، وتصلنا ملاحظتك مباشرة.</p>`);
        doc.insertAdjacentHTML('afterend', '<section class="ag-reqs no-print" id="ag-reqs" hidden></section>');
        const fab = document.createElement('button');
        fab.type = 'button';
        fab.className = 'ag-ask no-print';
        fab.hidden = true;
        fab.innerHTML = `${svg('pen')}<span>اطلب تعديل على النص المحدد</span>`;
        document.body.appendChild(fab);
        let picked = null, t = 0;
        const update = () => {
            const s = window.getSelection();
            const txt = s && !s.isCollapsed ? s.toString().replace(/\s+/g, ' ').trim() : '';
            const node = s && s.rangeCount ? s.getRangeAt(0).commonAncestorContainer : null;
            if (txt.length < 3 || !node || !doc.contains(node)) { fab.hidden = true; picked = null; return; }
            const el = node.nodeType === 1 ? node : node.parentElement;
            const sec = el.closest('section.cl, .party');
            picked = { quote: txt.slice(0, 600), clause: sec ? (sec.querySelector('h2, h3').textContent || '').replace('↺ النص الأصلي', '').replace(/\s+/g, ' ').trim().slice(0, 120) : '' };
            const dock = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
            fab.classList.toggle('dock', dock);
            if (!dock) {
                const r = s.getRangeAt(0).getBoundingClientRect();
                fab.style.top = Math.max(64, r.top - 52) + 'px';
                fab.style.left = Math.min(innerWidth - 280, Math.max(10, r.left + r.width / 2 - 135)) + 'px';
            }
            fab.hidden = false;
        };
        document.addEventListener('selectionchange', () => { clearTimeout(t); t = setTimeout(update, 160); });
        window.addEventListener('scroll', () => { if (!fab.hidden) update(); }, { passive: true });
        fab.addEventListener('mousedown', e => e.preventDefault());
        fab.addEventListener('click', () => { if (picked) ask(picked, o); });
        db.ref('offer/' + token + '/agreementNotes').on('value', snap => renderReqs(snap.val() || {}), () => { });
    }

    function renderReqs(map) {
        const box = $('#ag-reqs');
        const list = Object.keys(map).map(k => map[k]).filter(n => n && n.quote).sort((a, b) => String(b.at).localeCompare(String(a.at)));
        box.hidden = !list.length;
        box.innerHTML = list.length ? `<h3>${svg('pen')} طلبات التعديل التي أرسلتها <span class="en">(${list.length})</span></h3>
            ${list.map(n => `<div class="ag-req${n.status === 'done' ? ' done' : ''}">
                <span class="st">${n.status === 'done' ? `${svg('check')} تم التعديل` : `${svg('clock')} قيد المراجعة`}</span>
                ${n.clause ? `<small>${E(n.clause)}</small>` : ''}
                <q>${E(n.quote)}</q>
                <p>${E(n.note)}</p>
            </div>`).join('')}` : '';
    }

    function ask(picked, o) {
        const old = $('.ag-modal');
        if (old) old.remove();
        let name = '';
        try { name = localStorage.getItem('rn-ag-name') || ''; } catch (e) { }
        if (!name && o.reply && o.reply.name) name = o.reply.name;
        const m = document.createElement('div');
        m.className = 'ag-modal no-print';
        m.innerHTML = `<div class="ag-scrim" data-x></div>
            <form class="ag-sheet" role="dialog" aria-modal="true" aria-labelledby="ag-ask-t">
                <div class="grab"></div>
                <h3 id="ag-ask-t">طلب تعديل على الاتفاقية</h3>
                ${picked.clause ? `<p class="where">${E(picked.clause)}</p>` : ''}
                <blockquote>${E(picked.quote)}</blockquote>
                <label><span>ما التعديل الذي تطلبه؟</span><textarea name="note" rows="4" maxlength="1500" required placeholder="اكتب الصياغة المقترحة أو ملاحظتك على هذا النص..."></textarea></label>
                <label><span>اسمك</span><input name="name" maxlength="80" value="${E(name)}" placeholder="الاسم"></label>
                <p class="err" hidden></p>
                <div class="btns">
                    <button type="submit" class="btn primary">${svg('send')}<span>إرسال الطلب</span></button>
                    <button type="button" class="btn ghost" data-x>إلغاء</button>
                </div>
            </form>`;
        document.body.appendChild(m);
        requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('open')));
        const close = () => { m.classList.remove('open'); setTimeout(() => m.remove(), 300); };
        m.addEventListener('click', e => { if (e.target.closest('[data-x]')) close(); });
        const f = m.querySelector('form'), err = m.querySelector('.err'), btn = f.querySelector('[type=submit]');
        setTimeout(() => f.note.focus(), 320);
        f.addEventListener('submit', async e => {
            e.preventDefault();
            const note = f.note.value.trim(), nm = f.name.value.trim();
            if (note.length < 2) { err.textContent = 'اكتب التعديل المطلوب'; err.hidden = false; return; }
            btn.disabled = true;
            err.hidden = true;
            try {
                const rec = { quote: picked.quote, note: note.slice(0, 1500), at: new Date().toISOString() };
                if (nm) rec.name = nm.slice(0, 80);
                if (picked.clause) rec.clause = picked.clause;
                await Promise.race([db.ref('offer/' + token + '/agreementNotes').push(rec), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 15000))]);
                try { if (nm) localStorage.setItem('rn-ag-name', nm); } catch (x) { }
                window.getSelection().removeAllRanges();
                close();
                toast('وصل طلبك ✓ سنراجعه ونحدّث الاتفاقية');
            } catch (x) {
                btn.disabled = false;
                err.textContent = 'تعذّر الإرسال، تحقّق من الاتصال وأعد المحاولة.';
                err.hidden = false;
            }
        });
    }
    function toast(msg) {
        let el = $('.ag-toast');
        if (!el) { el = document.createElement('div'); el.className = 'ag-toast no-print'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toast.t);
        toast.t = setTimeout(() => el.classList.remove('show'), 3200);
    }

    async function init() {
        if (!token || !window.db) { $('#ag-doc').innerHTML = `<p class="ag-empty">الرابط غير صحيح.</p>`; return; }
        let o = null;
        try {
            const snap = await Promise.race([db.ref('offer/' + token).once('value'), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 15000))]);
            o = snap.val();
        } catch (e) { o = null; }
        if (!o || !o.title) { $('#ag-doc').innerHTML = `<p class="ag-empty">الاتفاقية غير متاحة. تواصل معنا وسنرسل لك رابطًا جديدًا.</p>`; return; }
        render(o);
    }

    window.AgreementPage = { words, moneyWords, collect, get ready() { return ready; } };
    document.addEventListener('DOMContentLoaded', init);
})();
