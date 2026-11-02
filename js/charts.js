// مخطط الإيرادات الشهرية (الرئيسية والمالية): آخر 12 شهرًا من الفواتير المدفوعة بمقياس نسبي حقيقي،
// وخط للهدف الشهري، وبطاقة للشهر المحدّد، وملخّص (المتوسط، أعلى شهر، هذا الشهر مقارنة بالسابق). الأنماط في css/charts.css.
(function () {
    const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const SHORT = ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'];
    const num = v => Math.round(v).toLocaleString('en-US');
    const compact = v => v >= 1e6 ? +(v / 1e6).toFixed(1) + 'M' : v >= 1000 ? +(v / 1000).toFixed(v < 1e4 ? 1 : 0) + 'K' : String(Math.round(v));
    const money = v => (typeof formatCurrency === 'function' ? formatCurrency(v) : num(v));
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); const d = new Date(s); return isNaN(d) ? null : d; };
    const invWord = n => n === 1 ? 'فاتورة واحدة' : n === 2 ? 'فاتورتان' : n + (n <= 10 ? ' فواتير' : ' فاتورة');

    function series(invoices) {
        const now = new Date(), out = [], at = {};
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            at[d.getFullYear() + '-' + d.getMonth()] = out.length;
            out.push({ y: d.getFullYear(), m: d.getMonth(), v: 0, n: 0 });
        }
        (invoices || []).forEach(inv => {
            if (inv.status !== 'مدفوعة') return;
            const d = parse(inv.date);
            const k = d && d.getFullYear() + '-' + d.getMonth();
            if (k in at) { out[at[k]].v += parseFloat(inv.amount) || 0; out[at[k]].n++; }
        });
        return out;
    }
    // أعلى المقياس: أكبر من أعلى شهر والهدف، مقرّبًا لخطوة «جميلة» على 4 خطوط
    function scale(max) {
        const raw = Math.max(max, 1) * 1.12 / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
        const step = [1, 2, 2.5, 5, 10].map(x => x * p).find(x => x >= raw);
        return { step, top: step * 4 };
    }

    function render(host, opt) {
        if (!host) return [];
        const o = Object.assign({ goal: 4000, onPick: null }, opt);
        const data = series(o.invoices);
        const { step, top } = scale(Math.max(...data.map(d => d.v), o.goal || 0));
        const cur = data.length - 1;
        const total = data.reduce((s, d) => s + d.v, 0);
        const active = data.filter(d => d.v > 0);
        const best = data.reduce((a, d) => (d.v > a.v ? d : a), data[0]);
        const prev = data[cur - 1].v, now = data[cur].v;
        const delta = prev ? Math.round((now - prev) / prev * 100) : null;
        const pct = v => Math.max(0, Math.min(100, v / top * 100));

        host.classList.add('rc-host');
        host.innerHTML = `<div class="rc">
            <div class="rc-plot">
                <div class="rc-grid" aria-hidden="true">${[1, 2, 3, 4].map(i => `<span style="bottom:${pct(step * i)}%"><em>${o.goal && Math.abs(step * i - o.goal) < step * .3 ? '' : compact(step * i)}</em></span>`).join('')}<span class="zero" style="bottom:0"><em>0</em></span>
                    ${o.goal ? `<span class="goal" style="bottom:${pct(o.goal)}%"><b>${compact(o.goal)}</b></span>` : ''}</div>
                <div class="rc-bars">${data.map((d, i) => `<button type="button" class="rc-col${i === cur ? ' cur' : ''}${o.goal && d.v >= o.goal ? ' hit' : ''}${d.v ? '' : ' none'}${d.m === 0 && i ? ' ny' : ''}" data-i="${i}"
                        aria-label="${MONTHS[d.m]} ${d.y}: ${num(d.v)} ريال" style="--h:${pct(d.v)}%;--d:${i * 35}ms"${d.m === 0 && i ? ` data-y="${d.y}"` : ''}>
                        <span class="rc-bar"><i></i></span>
                        <span class="rc-m"><span class="l">${MONTHS[d.m]}</span><span class="s">${SHORT[d.m]}</span></span>
                    </button>`).join('')}</div>
                <div class="rc-tip" role="status"></div>
            </div>
            <div class="rc-sum">
                <div><small>متوسط الشهر</small><b>${money(active.length ? total / 12 : 0)}</b></div>
                <div><small>أعلى شهر</small><b>${best.v ? `${MONTHS[best.m]} <span class="en-num">${compact(best.v)}</span>` : '—'}</b></div>
                <div><small>${MONTHS[data[cur].m]} مقارنة بـ${MONTHS[data[cur - 1].m]}</small><b class="${delta == null ? '' : delta >= 0 ? 'up' : 'down'}">${delta == null ? (now ? 'أول دخل' : '—') : `<span class="en-num">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%</span>`}</b></div>
            </div>
        </div>`;

        const plot = host.querySelector('.rc-plot'), tip = host.querySelector('.rc-tip');
        const cols = [...host.querySelectorAll('.rc-col')];
        let sel = cur;
        const show = i => {
            const d = data[i], col = cols[i];
            cols.forEach((c, k) => c.classList.toggle('on', k === i));
            tip.innerHTML = `<small>${MONTHS[d.m]} <span class="en-num">${d.y}</span></small><b>${money(d.v)}</b><em>${d.n ? invWord(d.n) : 'لا مدفوعات'}${o.goal ? ` · <span class="en-num">${Math.round(d.v / o.goal * 100)}%</span> من الهدف` : ''}</em>`;
            // الموضع من الارتفاع النهائي للعمود (لا من رسمه أثناء الحركة)؛ الصفحة المخفية تُعاد عند ظهورها
            const pr = plot.getBoundingClientRect(), tr = col.querySelector('.rc-bar').getBoundingClientRect();
            if (!pr.width) return;
            const w = tip.offsetWidth;
            let x = tr.left - pr.left + tr.width / 2;
            x = Math.max(w / 2 + 2, Math.min(pr.width - w / 2 - 2, x));
            tip.style.left = x + 'px';
            tip.style.top = Math.max(tip.offsetHeight + 4, tr.bottom - tr.height * pct(d.v) / 100 - pr.top - 10) + 'px';
            tip.classList.add('show');
        };
        // المرور بالفأرة يعرض الشهر، واللمس/النقر يختاره (ويحدّث بطاقة الإنجاز في الرئيسية)
        cols.forEach((c, i) => {
            c.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(i); });
            c.addEventListener('focus', () => show(i));
            c.addEventListener('click', () => { sel = i; show(i); if (o.onPick) o.onPick(data[i]); });
        });
        plot.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') show(sel); });
        // يُعاد وضع البطاقة كلما تغيّر عرض المخطط (تدوير الجوال، أو ظهور الصفحة بعد إخفائها)
        if (host._rcObs) host._rcObs.disconnect();
        if (window.ResizeObserver) (host._rcObs = new ResizeObserver(() => show(sel))).observe(plot);
        // النمو من الصفر عند الرسم، ثم بطاقة الشهر الحالي
        requestAnimationFrame(() => requestAnimationFrame(() => { host.querySelector('.rc').classList.add('in'); setTimeout(() => show(sel), 60); }));
        return data;
    }

    window.RevenueChart = { render, series, MONTHS };
})();
