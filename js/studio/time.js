/**
 * تتبّع الوقت: مؤقت (عادي / عد تنازلي / بومودورو) على مشروع ومهمة، يبقى شغّالًا بعد إعادة التحميل
 * ويظهر كمؤشر عائم في كل صفحات الإدارة. خطة اليوم: جدولة المهام على تقويم ومقارنة المخطط بالفعلي،
 * مع معدل الساعة الفعلي لكل مشروع (قيمة المشروع ÷ ساعات العمل عليه).
 * timer/active · timeLogs/<id> · dayPlan/<YYYY-MM-DD>/<id>
 */
(function () {
    const S = window.Studio, E = S.esc, ic = S.ic;
    const HOUR = 48;
    const MODES = { stopwatch: 'مؤقت', countdown: 'عد تنازلي', pomodoro: 'بومودورو', manual: 'يدوي' };
    let logs = [], raw = {}, plan = [], planToday = [], active = null, loaded = false, booted = false, phaseBusy = false;
    let planDate = S.today(), logTab = 'week';
    const sel = { projectKey: '', task: '', note: '', mode: 'stopwatch', minutes: 60 };

    const elapsed = a => (a ? (+a.elapsedMs || 0) + (a.runSince ? Date.now() - a.runSince : 0) : 0);
    const dayOf = iso => S.ymd(new Date(iso));
    const minsOf = d => d.getHours() * 60 + d.getMinutes();
    const hm = m => S.pad(Math.floor(m / 60) % 24) + ':' + S.pad(m % 60);
    const toMin = s => { const [h, m] = String(s || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
    const projName = k => (raw[k] && raw[k].name) || '';

    async function load() {
        const [l, p, d] = await Promise.all([S.get('timeLogs'), S.get('projects'), S.get('dayPlan/' + planDate)]);
        logs = S.toList(l).sort((a, b) => String(b.start || '').localeCompare(String(a.start || '')));
        raw = p || {};
        plan = S.toList(d);
        planToday = planDate === S.today() ? plan : S.toList(await S.get('dayPlan/' + S.today()));
        loaded = true;
    }

    // ── المؤقت ──
    function beep() {
        try {
            const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
            o.connect(g); g.connect(a.destination); o.frequency.value = 880;
            g.gain.setValueAtTime(0.18, a.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.7);
            o.start(); o.stop(a.currentTime + 0.7);
        } catch (e) { /* المتصفح يمنع الصوت قبل أي تفاعل */ }
    }
    async function saveLog(a, ms) {
        const end = Date.now();
        const rec = { projectKey: a.projectKey || '', projectName: a.projectName || '', client: a.client || '', task: a.task || '', note: a.note || '',
            start: new Date(Math.min(a.startedAt || end, end - ms)).toISOString(), end: new Date(end).toISOString(), seconds: Math.round(ms / 1000), mode: a.mode || 'stopwatch' };
        const id = S.newId();
        await S.ref('timeLogs/' + id).set(rec);
        logs.unshift(Object.assign({ id }, rec));
        return rec;
    }
    async function start() {
        const now = Date.now(), pr = raw[sel.projectKey] || {};
        const mins = Math.max(1, S.toNum(sel.minutes) || 60);
        await S.ref('timer/active').set({
            mode: sel.mode, projectKey: sel.projectKey || '', projectName: pr.name || '', client: pr.client || '', task: sel.task || '', note: (sel.note || '').trim(),
            startedAt: now, elapsedMs: 0, runSince: now, targetMs: sel.mode === 'countdown' ? mins * 60000 : sel.mode === 'pomodoro' ? 25 * 60000 : 0, phase: 'work', round: 1
        });
    }
    async function pause() { await S.ref('timer/active').update({ elapsedMs: elapsed(active), runSince: null }); }
    async function resume() { await S.ref('timer/active').update({ runSince: Date.now() }); }
    async function stop() {
        if (!active) return;
        const a = active, ms = elapsed(a);
        await S.ref('timer/active').remove();
        if (a.phase !== 'break' && ms >= 5000) {
            const rec = await saveLog(a, ms);
            S.toast(`سُجّلت جلسة ${S.dur(rec.seconds)}${a.projectName ? ' على ' + a.projectName : ''} ✓`);
        } else S.toast('أُوقف المؤقت');
        if (S.page('time') && !S.page('time').classList.contains('hidden')) render();
    }
    async function discard() {
        if (!await rnConfirm('إلغاء المؤقت بدون حفظ الجلسة؟')) return;
        await S.ref('timer/active').remove();
    }
    // نهاية العد التنازلي أو فترة البومودورو
    async function finishPhase() {
        const a = active, now = Date.now();
        beep();
        if (a.mode === 'countdown') {
            await S.ref('timer/active').remove();
            await saveLog(a, a.targetMs);
            S.toast('⏰ انتهى الوقت المحدد — سُجّلت الجلسة');
        } else if (a.phase === 'work') {
            await saveLog(a, a.targetMs);
            const long = a.round % 4 === 0;
            await S.ref('timer/active').update({ phase: 'break', startedAt: now, elapsedMs: 0, runSince: now, targetMs: (long ? 15 : 5) * 60000 });
            S.toast(`🍅 أحسنت! استراحة ${long ? 15 : 5} دقائق`);
        } else {
            await S.ref('timer/active').update({ phase: 'work', round: (a.round || 1) + 1, startedAt: now, elapsedMs: 0, runSince: now, targetMs: 25 * 60000 });
            S.toast('🍅 انتهت الاستراحة — جولة جديدة');
        }
        if (S.page('time') && !S.page('time').classList.contains('hidden')) render();
    }

    function tick() {
        const a = active;
        const pill = document.getElementById('st-timer-pill');
        if (a && a.runSince && a.targetMs && elapsed(a) >= a.targetMs && !phaseBusy) {
            phaseBusy = true;
            finishPhase().catch(e => console.error(e)).finally(() => { phaseBusy = false; });
        }
        const ms = elapsed(a);
        const shown = a && a.targetMs ? Math.max(a.targetMs - ms, 0) : ms;
        const clockEl = document.getElementById('st-clock');
        if (clockEl && a) clockEl.textContent = S.clock(shown);
        const ring = document.getElementById('st-ring');
        if (ring && a && a.targetMs) ring.style.width = Math.min(ms / a.targetMs * 100, 100) + '%';
        if (pill) {
            pill.classList.toggle('show', !!a);
            pill.classList.toggle('paused', !!a && !a.runSince);
            if (a) {
                pill.querySelector('.t').textContent = S.clock(shown);
                pill.querySelector('.n').textContent = a.phase === 'break' ? 'استراحة' : (a.task || a.projectName || MODES[a.mode]);
            }
        }
    }

    function boot() {
        if (booted || !window.db) return;
        booted = true;
        const pill = document.createElement('div');
        pill.id = 'st-timer-pill';
        pill.title = 'فتح تتبّع الوقت';
        pill.innerHTML = `<span class="dot"></span><span class="t">00:00:00</span><span class="n"></span><button type="button" title="إنهاء وحفظ">${ic('stop')}</button>`;
        pill.addEventListener('click', e => { if (e.target.closest('button')) { e.stopPropagation(); stop(); } else if (typeof switchPage === 'function') switchPage('time'); });
        document.body.appendChild(pill);
        S.ref('timer/active').on('value', snap => {
            active = snap.val();
            tick();
            if (document.getElementById('st-timer-card')) renderTimer();
        });
        setInterval(tick, 1000);
    }

    // ── العرض ──
    function taskOptions(pk) {
        const p = raw[pk];
        if (!p) return '';
        const steps = (Array.isArray(p.steps) ? p.steps : []).filter(s => s && !s.done).map(s => s.text);
        const tasks = (Array.isArray(p.tasks) ? p.tasks : []).filter(t => t && !t.done).map(t => t.title);
        return [...new Set([...tasks, ...steps])].map(t => `<option ${sel.task === t ? 'selected' : ''}>${E(t)}</option>`).join('');
    }
    const activeProjects = () => Object.keys(raw).map(k => Object.assign({ id: k }, raw[k])).filter(p => p.status !== 'مكتمل');

    function renderTimer() {
        const box = document.getElementById('st-timer-card');
        if (!box) return;
        const a = active;
        if (a) {
            const brk = a.phase === 'break';
            box.innerHTML = `
                <div class="st-block-h"><span class="st-badge ${brk ? 'amber' : 'mint'}">${brk ? 'استراحة' : MODES[a.mode]}${a.mode === 'pomodoro' ? ` · جولة <span class="st-num">${a.round || 1}</span>` : ''}</span>
                    <span class="st-muted text-xs">${a.runSince ? 'يعمل' : 'متوقف مؤقتًا'}</span></div>
                <div id="st-clock" class="st-clock ${a.runSince ? 'run' : ''}">00:00:00</div>
                <div class="st-clock-sub">${brk ? 'خذ نفسًا، وارجع بتركيز ☕' : `${E(a.task || 'بدون مهمة محددة')}${a.projectName ? ' · ' + E(a.projectName) : ''}`}</div>
                ${a.targetMs ? `<div class="st-ring"><i id="st-ring" style="width:0"></i></div>` : ''}
                <div class="st-actions" style="justify-content:center">
                    ${a.runSince ? `<button class="st-btn ghost" onclick="Studio.Time.pause()">${ic('pause')} إيقاف مؤقت</button>` : `<button class="st-btn soft" onclick="Studio.Time.resume()">${ic('play_arrow')} استئناف</button>`}
                    <button class="st-btn primary" onclick="Studio.Time.stop()">${ic('stop')} إنهاء وحفظ</button>
                    <button class="st-btn icon ghost" title="إلغاء بدون حفظ" onclick="Studio.Time.discard()">${ic('delete')}</button>
                </div>`;
            tick();
            return;
        }
        const projOpts = activeProjects().map(p => `<option value="${E(p.id)}" ${sel.projectKey === p.id ? 'selected' : ''}>${E(p.name)}${p.client ? ' — ' + E(p.client) : ''}</option>`).join('');
        box.innerHTML = `
            <div class="st-tabs" style="align-self:flex-start">${['stopwatch', 'countdown', 'pomodoro'].map(m => `<button class="${sel.mode === m ? 'on' : ''}" onclick="Studio.Time.mode('${m}')">${MODES[m]}</button>`).join('')}</div>
            <div class="st-form">
                <label class="st-f"><span>المشروع</span><select class="form-input-modern" onchange="Studio.Time.pick(this.value)"><option value="">بدون مشروع محدد</option>${projOpts}</select></label>
                <label class="st-f"><span>المهمة</span><select class="form-input-modern" onchange="Studio.Time.set('task', this.value)"><option value="">بدون مهمة محددة</option>${taskOptions(sel.projectKey)}</select></label>
                ${sel.mode === 'countdown' ? `<label class="st-f"><span>المدة (دقائق)</span><input type="text" inputmode="decimal" min="1" dir="ltr" class="form-input-modern" value="${+sel.minutes}" oninput="Studio.Time.set('minutes', this.value)"></label>` : ''}
                <label class="st-f ${sel.mode === 'countdown' ? '' : 'full'}"><span>ملاحظة <em>(اختياري)</em></span><input class="form-input-modern" placeholder="على ماذا تعمل؟" value="${E(sel.note)}" oninput="Studio.Time.set('note', this.value)"></label>
            </div>
            ${sel.mode === 'pomodoro' ? '<p class="st-muted text-xs" style="margin:0">25 دقيقة تركيز ثم 5 دقائق استراحة، وكل رابع جولة استراحة 15 دقيقة. كل جولة تُسجَّل تلقائيًا.</p>' : ''}
            <button class="st-btn primary lg block" onclick="Studio.Time.start(this)">${ic('play_arrow')} ابدأ ${sel.mode === 'pomodoro' ? 'البومودورو' : 'المؤقت'}</button>`;
    }

    function stats() {
        const t = S.today(), ws = S.weekStart();
        const run = active && active.phase !== 'break' ? elapsed(active) / 1000 : 0;
        const todayLogs = logs.filter(l => dayOf(l.start) === t);
        const todayS = todayLogs.reduce((s, l) => s + (+l.seconds || 0), 0) + run;
        const weekS = logs.filter(l => dayOf(l.start) >= ws).reduce((s, l) => s + (+l.seconds || 0), 0) + run;
        const planned = planToday.reduce((s, p) => s + (+p.minutes || 0), 0) * 60;
        const doneN = planToday.filter(p => p.done).length;
        const card = (icon, color, lbl, val, sub) => `<div class="st-stat"><span class="st-ico ${color}">${ic(icon)}</span><span class="lbl">${lbl}</span><span class="val">${val}</span><span class="sub">${sub}</span></div>`;
        return `<div class="st-stats">
            ${card('today', 'mint', 'اليوم', S.dur(todayS), 'وقت مسجّل')}
            ${card('date_range', 'amber', 'هذا الأسبوع', S.dur(weekS), 'منذ يوم الأحد')}
            ${card('play_circle', 'blue', 'جلسات اليوم', `<span class="st-num">${todayLogs.length}</span>`, active ? 'ومؤقت يعمل الآن' : 'جلسة مسجّلة')}
            ${card('event_note', 'violet', 'المخطط اليوم', planned ? S.dur(planned) : '—', planned ? `أنجزت <span class="st-num">${doneN}</span> من <span class="st-num">${planToday.length}</span> · الفعلي ${Math.round(todayS / planned * 100)}%` : 'جدول مهامك في خطة اليوم أدناه')}
        </div>`;
    }

    function byProject() {
        const ws = S.weekStart(), wk = {}, all = {};
        logs.forEach(l => {
            const k = l.projectKey || '';
            all[k] = (all[k] || 0) + (+l.seconds || 0);
            if (dayOf(l.start) >= ws) wk[k] = (wk[k] || 0) + (+l.seconds || 0);
        });
        const rows = Object.entries(wk).sort((a, b) => b[1] - a[1]);
        if (!rows.length) return `<p class="st-muted text-sm" style="margin:0">لا جلسات هذا الأسبوع بعد. ابدأ المؤقت على مشروع لترى أين يذهب وقتك.</p>`;
        const max = rows[0][1];
        return `<div class="st-proj-bars">${rows.map(([k, s]) => {
            const p = raw[k], val = p ? +p.value || 0 : 0, hrs = all[k] / 3600;
            const rate = val && hrs >= 0.25 ? Math.round(val / hrs) : 0;
            return `<div><div class="row1"><b>${E(k ? projName(k) || 'مشروع محذوف' : 'بلا مشروع')}</b><span class="st-num" style="color:#fff;font-weight:800">${S.dur(s)}</span></div>
                <div class="st-bar"><i style="width:${Math.max(s / max * 100, 3)}%"></i></div>
                ${rate ? `<small class="st-muted" style="display:block;margin-top:5px">معدل الساعة الفعلي ≈ <b class="st-num" style="color:#7df0c9">${S.num(rate)}</b> ر.س (${S.dur(all[k])} إجمالًا)</small>` : ''}</div>`;
        }).join('')}</div>`;
    }

    function timeline() {
        const isToday = planDate === S.today();
        const acts = logs.filter(l => dayOf(l.start) === planDate).map(l => { const st = new Date(l.start); return { from: minsOf(st), mins: (+l.seconds || 0) / 60, l }; });
        if (isToday && active && active.phase !== 'break') { const st = new Date(Date.now() - elapsed(active)); acts.push({ from: minsOf(st), mins: elapsed(active) / 60000, running: true }); }
        const plans = plan.map(p => ({ from: toMin(p.start), mins: +p.minutes || 30, p }));
        const nowM = minsOf(new Date());
        let lo = 8 * 60, hi = 20 * 60;
        [...acts, ...plans].forEach(x => { lo = Math.min(lo, Math.floor(x.from / 60) * 60); hi = Math.max(hi, Math.ceil((x.from + x.mins) / 60) * 60); });
        if (isToday) { lo = Math.min(lo, Math.floor(nowM / 60) * 60); hi = Math.max(hi, Math.ceil((nowM + 1) / 60) * 60); }
        hi = Math.min(hi, 24 * 60);
        const H = (hi - lo) / 60 * HOUR;
        const y = m => (m - lo) / 60 * HOUR;
        const hours = [];
        for (let m = lo; m <= hi; m += 60) {
            const h = m / 60;
            hours.push(`<span style="top:${y(m)}px">${h === 0 || h === 24 ? '12 ص' : h < 12 ? h + ' ص' : h === 12 ? '12 م' : (h - 12) + ' م'}</span>`);
        }
        const now = isToday ? `<div class="st-now" style="top:${y(nowM)}px"></div>` : '';
        const pBlocks = plans.map(x => `<div class="st-blk ${x.p.done ? 'done' : ''}" style="top:${y(x.from)}px;height:${Math.max(x.mins / 60 * HOUR - 2, 22)}px" onclick="Studio.Time.planMenu('${x.p.id}')" title="${E(x.p.title)}">
            <b>${E(x.p.title)}</b>${x.mins >= 40 ? `<span class="st-num">${hm(x.from)}</span> · ${S.dur(x.mins * 60)}` : ''}</div>`).join('');
        const aBlocks = acts.map(x => `<div class="st-blk act" style="top:${y(x.from)}px;height:${Math.max(x.mins / 60 * HOUR - 2, 6)}px" title="${x.running ? 'المؤقت يعمل' : E(x.l.task || x.l.projectName || '')}">
            ${x.mins >= 25 ? `<b>${x.running ? '● الآن' : E(x.l.task || x.l.projectName || 'جلسة')}</b>` : ''}</div>`).join('');
        return `<div class="st-tl">
            <div class="st-tl-h"><div></div><div>المخطط</div><div>الفعلي</div></div>
            <div class="st-tl-hours" style="height:${H}px">${hours.join('')}</div>
            <div class="st-tl-col" style="height:${H}px">${pBlocks}${now}</div>
            <div class="st-tl-col" style="height:${H}px">${aBlocks}${now}</div>
        </div>`;
    }

    function planForm() {
        const opts = activeProjects().map(p => {
            const steps = (Array.isArray(p.steps) ? p.steps : []).filter(s => s && !s.done).map(s => s.text);
            const tasks = (Array.isArray(p.tasks) ? p.tasks : []).filter(t => t && !t.done).map(t => t.title);
            const all = [...new Set([...tasks, ...steps])];
            return all.length ? `<optgroup label="${E(p.name)}">${all.map(t => `<option value="${E(p.id + '|' + t)}">${E(t)}</option>`).join('')}</optgroup>` : '';
        }).join('');
        const nextHour = hm(Math.min((new Date().getHours() + 1) * 60, 23 * 60));
        return `<div class="st-block"><div class="st-form" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) auto;align-items:end">
            <label class="st-f"><span>جدولة مهمة في هذا اليوم</span><select id="st-pl-task" class="form-input-modern" onchange="document.getElementById('st-pl-free').style.display = this.value === '__free' ? '' : 'none'">
                <option value="__free">مهمة حرة...</option>${opts}</select>
                <input id="st-pl-free" class="form-input-modern" style="margin-top:8px" placeholder="اكتب المهمة"></label>
            <label class="st-f"><span>البداية</span><input id="st-pl-start" type="time" class="form-input-modern" value="${nextHour}"></label>
            <label class="st-f"><span>المدة (دقائق)</span><input id="st-pl-min" type="text" inputmode="decimal" min="5" step="5" dir="ltr" class="form-input-modern" value="60"></label>
            <button class="st-btn soft" onclick="Studio.Time.addPlan(this)">${ic('add')} إضافة</button>
        </div></div>`;
    }

    function logList() {
        const t = S.today(), ws = S.weekStart(), from30 = S.addDays(t, -30);
        const f = { today: l => dayOf(l.start) === t, week: l => dayOf(l.start) >= ws, all: l => dayOf(l.start) >= from30 }[logTab];
        const shown = logs.filter(f);
        if (!shown.length) return `<p class="st-muted text-sm">لا جلسات في هذه الفترة.</p>`;
        const days = {};
        shown.forEach(l => { (days[dayOf(l.start)] = days[dayOf(l.start)] || []).push(l); });
        return Object.keys(days).sort().reverse().map(d => `
            <div class="st-log-day"><span>${S.fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}</span><span class="st-num">${S.dur(days[d].reduce((s, l) => s + (+l.seconds || 0), 0))}</span></div>
            ${days[d].map(l => {
                const end = new Date(new Date(l.start).getTime() + (+l.seconds || 0) * 1000);
                return `<div class="st-log"><div class="main"><b>${E(l.task || l.note || 'عمل بلا مهمة محددة')}</b>
                    <small>${E(l.projectName || 'بلا مشروع')} · <span class="st-num">${S.fmtTime(l.start)} ← ${S.fmtTime(end)}</span></small></div>
                    <span class="st-badge ${l.mode === 'pomodoro' ? 'amber' : l.mode === 'manual' ? 'gray' : 'blue'}">${MODES[l.mode] || 'مؤقت'}</span>
                    <span class="d st-num">${S.dur(l.seconds)}</span>
                    <button class="st-btn xs icon ghost" title="حذف الجلسة" onclick="Studio.Time.delLog('${l.id}')">${ic('close')}</button></div>`;
            }).join('')}`).join('');
    }

    function render() {
        const el = S.page('time');
        if (!el) return;
        const isToday = planDate === S.today();
        el.innerHTML = `
            <div class="st-head"><div><h1>تتبّع الوقت</h1><p>شغّل المؤقت على مهمتك، وخطّط يومك في التقويم، وقارن المخطط بالفعلي. واعرف معدل ساعتك الحقيقي في كل مشروع.</p></div>
                <div class="st-head-actions"><button class="st-btn ghost" onclick="Studio.Time.manual()">${ic('more_time')} جلسة يدوية</button></div></div>
            ${stats()}
            <div class="st-two">
                <div><h2 class="st-sec-title" style="margin:0 0 12px">المؤقت</h2><div class="st-card" id="st-timer-card" style="display:flex;flex-direction:column;gap:14px"></div></div>
                <div><h2 class="st-sec-title" style="margin:0 0 12px">أسبوعك حسب المشروع</h2><div class="st-card">${byProject()}</div></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px">
                <div class="st-head" style="align-items:center"><h2 class="st-sec-title" style="margin:0">خطة اليوم</h2>
                    <div class="st-actions">
                        ${isToday ? '' : `<button class="st-btn xs ghost" onclick="Studio.Time.day(0)">اليوم</button>`}
                        <button class="st-btn xs icon ghost" title="اليوم السابق" onclick="Studio.Time.day(-1)">${ic('chevron_right')}</button>
                        <b style="min-width:150px;text-align:center;color:#fff;font-size:14px">${S.fmtDate(planDate, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
                        <button class="st-btn xs icon ghost" title="اليوم التالي" onclick="Studio.Time.day(1)">${ic('chevron_left')}</button>
                    </div></div>
                ${planForm()}
                ${timeline()}
            </div>
            <div style="display:flex;flex-direction:column;gap:12px">
                <div class="st-head" style="align-items:center"><h2 class="st-sec-title" style="margin:0">سجل الجلسات</h2>
                    <div class="st-tabs">${[['today', 'اليوم'], ['week', 'هذا الأسبوع'], ['all', 'آخر 30 يومًا']].map(([k, t]) => `<button class="${logTab === k ? 'on' : ''}" onclick="Studio.Time.logs('${k}')">${t}</button>`).join('')}</div></div>
                <div>${logList()}</div>
            </div>`;
        renderTimer();
    }

    async function open() {
        boot();
        const el = S.page('time');
        if (el && !loaded) el.innerHTML = `<div class="st-empty"><p class="st-muted">جاري التحميل...</p></div>`;
        await load();
        render();
    }

    // ── خطة اليوم ──
    async function day(step) {
        planDate = step === 0 ? S.today() : S.addDays(planDate, step);
        plan = S.toList(await S.get('dayPlan/' + planDate));
        if (planDate === S.today()) planToday = plan;
        render();
    }
    async function addPlan(btn) {
        const v = document.getElementById('st-pl-task').value;
        let title = '', projectKey = '';
        if (v === '__free') title = document.getElementById('st-pl-free').value.trim();
        else { const i = v.indexOf('|'); projectKey = v.slice(0, i); title = v.slice(i + 1); }
        if (!title) { S.toast('اكتب المهمة أو اخترها من مشروع'); document.getElementById('st-pl-free').focus(); return; }
        const start = document.getElementById('st-pl-start').value || '09:00';
        const minutes = Math.max(5, S.toNum(document.getElementById('st-pl-min').value) || 60);
        await S.busy(btn, async () => {
            await S.ref('dayPlan/' + planDate + '/' + S.newId()).set({ title, projectKey, projectName: projName(projectKey), start, minutes, done: false });
            plan = S.toList(await S.get('dayPlan/' + planDate));
            if (planDate === S.today()) planToday = plan;
            render();
        }, '...');
    }
    function planMenu(id) {
        const p = plan.find(x => x.id === id);
        if (!p) return;
        S.modal(`${S.mHead('event_note', p.title, `${S.fmtDate(planDate, { weekday: 'long', day: 'numeric', month: 'long' })} · ${p.start} · ${S.dur((+p.minutes || 0) * 60)}${p.projectName ? ' · ' + p.projectName : ''}`)}
            <div class="st-m-body"><div class="st-pick">
                <button type="button" onclick="Studio.Time.startPlan('${id}')">${ic('play_arrow')}<span>ابدأ المؤقت عليها<small>تُسجَّل الجلسة على المهمة</small></span></button>
                <button type="button" onclick="Studio.Time.donePlan('${id}')">${ic(p.done ? 'undo' : 'task_alt')}<span>${p.done ? 'إلغاء الإنجاز' : 'تمّت ✓'}<small>${p.done ? 'أعدها للخطة' : 'علّمها كمنجزة'}</small></span></button>
                <button type="button" onclick="Studio.Time.delPlan('${id}')">${ic('delete')}<span>حذف من الخطة<small>لا يؤثر على الجلسات</small></span></button>
            </div></div>`, 'narrow');
    }
    async function startPlan(id) {
        const p = plan.find(x => x.id === id);
        S.closeModal();
        if (active) { S.toast('أنهِ المؤقت الحالي أولًا'); return; }
        Object.assign(sel, { projectKey: p.projectKey || '', task: p.title, note: '', mode: 'stopwatch' });
        await start();
    }
    async function donePlan(id) {
        const p = plan.find(x => x.id === id);
        await S.ref('dayPlan/' + planDate + '/' + id + '/done').set(!p.done);
        p.done = !p.done;
        S.closeModal();
        render();
    }
    async function delPlan(id) {
        await S.ref('dayPlan/' + planDate + '/' + id).remove();
        plan = plan.filter(x => x.id !== id);
        if (planDate === S.today()) planToday = plan;
        S.closeModal();
        render();
    }

    // ── الجلسات ──
    async function delLog(id) {
        if (!await rnConfirm('حذف هذه الجلسة من السجل؟')) return;
        await S.ref('timeLogs/' + id).remove();
        logs = logs.filter(l => l.id !== id);
        render();
    }
    function manual() {
        const projOpts = Object.keys(raw).map(k => `<option value="${E(k)}">${E(raw[k].name || '')}</option>`).join('');
        S.modal(`${S.mHead('more_time', 'جلسة يدوية', 'نسيت تشغيل المؤقت؟ سجّل الوقت هنا.')}
            <div class="st-m-body"><div class="st-form">
                <label class="st-f full"><span>المشروع</span><select id="st-m-proj" class="form-input-modern"><option value="">بدون مشروع</option>${projOpts}</select></label>
                <label class="st-f full"><span>المهمة / الوصف *</span><input id="st-m-task" class="form-input-modern"></label>
                <label class="st-f full"><span>التاريخ</span><input id="st-m-date" type="date" class="form-input-modern" value="${S.today()}"></label>
                <label class="st-f"><span>من</span><input id="st-m-from" type="time" class="form-input-modern" value="09:00"></label>
                <label class="st-f"><span>إلى</span><input id="st-m-to" type="time" class="form-input-modern" value="10:00"></label>
            </div></div>
            <div class="st-m-foot"><button class="st-btn primary" onclick="Studio.Time.saveManual(this)">${ic('save')} تسجيل</button><button class="st-btn ghost" onclick="Studio.closeModal()">إلغاء</button></div>`, 'narrow');
    }
    async function saveManual(btn) {
        const task = document.getElementById('st-m-task').value.trim();
        const date = document.getElementById('st-m-date').value || S.today();
        const from = toMin(document.getElementById('st-m-from').value), to = toMin(document.getElementById('st-m-to').value);
        if (!task) { S.toast('اكتب المهمة'); return; }
        if (to <= from) { S.toast('وقت النهاية يجب أن يكون بعد البداية'); return; }
        const pk = document.getElementById('st-m-proj').value;
        const st = S.parseYmd(date); st.setMinutes(from);
        await S.busy(btn, async () => {
            const id = S.newId();
            const rec = { projectKey: pk, projectName: projName(pk), client: (raw[pk] && raw[pk].client) || '', task, note: '', start: st.toISOString(),
                end: new Date(st.getTime() + (to - from) * 60000).toISOString(), seconds: (to - from) * 60, mode: 'manual' };
            await S.ref('timeLogs/' + id).set(rec);
            logs.unshift(Object.assign({ id }, rec));
            logs.sort((a, b) => String(b.start).localeCompare(String(a.start)));
            S.closeModal();
            render();
            S.toast('سُجّلت الجلسة ✓');
        });
    }

    S.register('time', { open, boot });
    S.Time = {
        start: btn => S.busy(btn, start, '...'), pause, resume, stop, discard, day, addPlan, planMenu, startPlan, donePlan, delPlan, delLog, manual, saveManual,
        mode: m => { sel.mode = m; renderTimer(); },
        pick: k => { sel.projectKey = k; sel.task = ''; renderTimer(); },
        set: (k, v) => { sel[k] = v; },
        logs: k => { logTab = k; render(); }
    };
})();
