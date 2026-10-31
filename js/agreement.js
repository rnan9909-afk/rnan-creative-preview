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

    const WAVE = `<svg class="ag-wave" viewBox="0 0 150 150" aria-hidden="true">
        <circle cx="34" cy="34" r="30" fill="none" stroke="#47E0AC" stroke-opacity=".55" stroke-width="1.2"/>
        <circle cx="34" cy="34" r="54" fill="none" stroke="#47E0AC" stroke-opacity=".35" stroke-width="1.1"/>
        <circle cx="34" cy="34" r="80" fill="none" stroke="#43D9C4" stroke-opacity=".22" stroke-width="1"/>
        <circle cx="34" cy="34" r="108" fill="none" stroke="#101965" stroke-opacity=".1" stroke-width="1"/>
        <circle cx="34" cy="34" r="11" fill="#47E0AC"/></svg>`;

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

        $('#ag-doc').innerHTML = `
            ${WAVE}
            <header class="ag-head">
                <div class="ag-brand"><img src="images/ranan-logo-dark.svg" alt="رنان"><div><b>${E(p1.name)}</b><small>${p1.cr ? `السجل / الوثيقة: <span class="en">${E(p1.cr)}</span>` : 'هوية بصرية · تصميم · محتوى إبداعي'}${p1.vat ? ` · الرقم الضريبي: <span class="en">${E(p1.vat)}</span>` : ''}</small></div></div>
                <dl class="ag-meta">
                    <dt>رقم الاتفاقية</dt><dd class="en">${E(o.number || '—')}</dd>
                    <dt>التاريخ</dt><dd>${greg(date)}</dd>
                    <dt>الموافق</dt><dd>${hijri(date)}</dd>
                </dl>
            </header>
            <div class="ag-rule"></div>
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

            <section class="cl">
                <h2><span>التمهيد</span></h2>
                <p>لمّا كان الطرف الأول جهةً متخصصة في تقديم خدمات التصميم والهوية البصرية والمحتوى الإبداعي، ولمّا رغب الطرف الثاني في الاستعانة بخدماته لتنفيذ «${E(o.title)}»، فقد اتفق الطرفان — وهما بكامل أهليتهما المعتبرة شرعًا ونظامًا — على إبرام هذه الاتفاقية وفق البنود الآتية:</p>
            </section>
            ${C.map(([t, html], i) => `<section class="cl"><h2><span>البند ${ORD[i] || i + 1}</span> ${t}</h2>${html}</section>`).join('')}

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
            <footer class="ag-foot"><span>${E(p1.name)}</span>${contact}</footer>`;

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

    window.AgreementPage = { words, moneyWords };
    document.addEventListener('DOMContentLoaded', init);
})();
