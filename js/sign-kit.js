/**
 * أدوات التوقيع والختم — مشتركة بين لوحة الإدارة (توقيع رنان وختمها) وصفحة الاتفاقية (توقيع العميل وختمه):
 * pad(canvas) لوحة رسم بالإصبع أو الفأرة تُصدّر PNG شفافًا مقصوصًا على حدود التوقيع،
 * و fromFile(file) تجهّز صورة مرفوعة: تصغير، وإزالة الخلفية البيضاء (ورقة ممسوحة)، وقصّ الحواف.
 * الناتج data URL بصيغة PNG لا يتجاوز MAX_LEN (يطابق قاعدة offer/<token>/clientSign).
 */
(function () {
    const MAX_LEN = 280000;
    const INK = '#14206E';

    // يقصّ الحواف الشفافة ويصغّر إلى maxW×maxH، ثم يعيد PNG
    function trim(src, maxW, maxH) {
        const w = src.width, h = src.height;
        const data = src.getContext('2d').getImageData(0, 0, w, h).data;
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 8) {
                    if (x < x0) x0 = x;
                    if (x > x1) x1 = x;
                    if (y < y0) y0 = y;
                    if (y > y1) y1 = y;
                }
            }
        }
        if (x1 < 0) return '';
        const pad = 6;
        x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
        x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
        const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
        const k = Math.min(1, maxW / cw, maxH / ch);
        const out = document.createElement('canvas');
        out.width = Math.max(1, Math.round(cw * k));
        out.height = Math.max(1, Math.round(ch * k));
        const ctx = out.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, x0, y0, cw, ch, 0, 0, out.width, out.height);
        return out.toDataURL('image/png');
    }

    // لوحة الرسم: تتبع المؤشر بخط ناعم (منحنيات بين منتصفات النقاط) وتعيد التوقيع PNG
    function pad(canvas, onChange) {
        const ctx = canvas.getContext('2d');
        let drawn = false, pts = [], down = false;
        function fit() {
            const r = canvas.getBoundingClientRect();
            if (!r.width) return;
            const dpr = Math.min(3, window.devicePixelRatio || 1);
            const keep = drawn ? canvas.toDataURL() : null;
            canvas.width = Math.round(r.width * dpr);
            canvas.height = Math.round(r.height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = INK;
            if (keep) {
                const img = new Image();
                img.onload = () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); ctx.restore(); };
                img.src = keep;
            }
        }
        const at = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp }; };
        function stroke(p) {
            const a = pts[pts.length - 1];
            pts.push(p);
            // أسرع = أرفع، كالحبر الحقيقي
            const v = Math.hypot(p.x - a.x, p.y - a.y) / Math.max(1, p.t - a.t);
            ctx.lineWidth = Math.max(1.4, Math.min(3.2, 3.4 - v * 1.1));
            if (pts.length < 3) {
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y); ctx.stroke();
                return;
            }
            const b = pts[pts.length - 3];
            ctx.beginPath();
            ctx.moveTo((b.x + a.x) / 2, (b.y + a.y) / 2);
            ctx.quadraticCurveTo(a.x, a.y, (a.x + p.x) / 2, (a.y + p.y) / 2);
            ctx.stroke();
        }
        canvas.addEventListener('pointerdown', e => {
            e.preventDefault();
            canvas.setPointerCapture(e.pointerId);
            down = true;
            pts = [at(e)];
            const p = pts[0];
            ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
        });
        canvas.addEventListener('pointermove', e => {
            if (!down) return;
            e.preventDefault();
            (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(ev => stroke(at(ev)));
            if (!drawn) { drawn = true; if (onChange) onChange(true); }
        });
        const up = () => { down = false; pts = []; };
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);
        fit();
        window.addEventListener('resize', fit);
        return {
            fit,
            isEmpty: () => !drawn,
            clear() {
                ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore();
                drawn = false;
                if (onChange) onChange(false);
            },
            toDataURL: () => drawn ? trim(canvas, 640, 240) : ''
        };
    }

    function loadImage(file) {
        return new Promise((ok, fail) => {
            if (!file || !/^image\//.test(file.type)) return fail(new Error('اختر ملف صورة (PNG أو JPG)'));
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); ok(img); };
            img.onerror = () => { URL.revokeObjectURL(url); fail(new Error('تعذّر قراءة الصورة')); };
            img.src = url;
        });
    }

    // صورة مرفوعة → PNG شفاف: الخلفية البيضاء أو الرمادية الفاتحة تصير شفافة إن لم تكن الصورة شفافة أصلًا
    async function fromFile(file, max) {
        const img = await loadImage(file);
        let size = max || 640;
        for (let i = 0; i < 4; i++) {
            const k = Math.min(1, (size * 1.6) / Math.max(img.naturalWidth, img.naturalHeight));
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.naturalWidth * k));
            c.height = Math.max(1, Math.round(img.naturalHeight * k));
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, c.width, c.height);
            const im = ctx.getImageData(0, 0, c.width, c.height), d = im.data;
            let clear = 0;
            for (let p = 3; p < d.length; p += 4) if (d[p] < 250) clear++;
            if (clear < d.length / 4 * 0.02) {
                for (let p = 0; p < d.length; p += 4) {
                    const lo = Math.min(d[p], d[p + 1], d[p + 2]);
                    // أفتح من 235 شفاف تمامًا، وبين 190 و235 تدرّج كي لا تتكسّر حواف الحبر
                    if (lo >= 235) d[p + 3] = 0;
                    else if (lo > 190) d[p + 3] = Math.round(d[p + 3] * (235 - lo) / 45);
                }
                ctx.putImageData(im, 0, 0);
            }
            const out = trim(c, size, size);
            if (!out) throw new Error('الصورة فارغة — لم نجد توقيعًا أو ختمًا فيها');
            if (out.length <= MAX_LEN) return out;
            size = Math.round(size * 0.72);
        }
        throw new Error('الصورة كبيرة جدًا، جرّب صورة أصغر');
    }

    const valid = s => typeof s === 'string' && s.indexOf('data:image/png;base64,') === 0 && s.length <= MAX_LEN;

    window.SignKit = { pad, fromFile, valid, MAX_LEN };
})();
