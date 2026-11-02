// عامل خدمة لوحة التحكم (نطاقه ./admin فقط): الصفحة تُطلب من الشبكة دائمًا (no-cache) فيظهر آخر نشر فورًا،
// ومع انقطاع الاتصال تظهر صفحة «لا يوجد اتصال» بدل صفحة خطأ المتصفح.
const OFFLINE = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#02083A">
<title>رنان</title><style>
html,body{height:100%;margin:0}body{display:grid;place-items:center;background:#02083A;color:#fff;font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
.i{width:84px;height:84px;border-radius:24px;margin:0 auto 22px;background:#101965 url(images/app/icon-192.png) center/cover;box-shadow:0 18px 40px -12px rgba(0,0,0,.6)}
h1{margin:0 0 8px;font-size:20px}p{margin:0 0 24px;color:#A9B2D8;font-size:14px;line-height:1.8}
button{height:46px;padding:0 26px;border:0;border-radius:14px;background:linear-gradient(135deg,#47E0AC,#43D9C4);color:#02083A;font:700 15px inherit;font-family:inherit;cursor:pointer}
</style></head><body><main><div class="i"></div><h1>لا يوجد اتصال بالإنترنت</h1>
<p>لوحة رنان تحتاج اتصالًا لعرض بياناتك المحدّثة.<br>تأكد من الشبكة ثم أعد المحاولة.</p>
<button onclick="location.reload()">إعادة المحاولة</button></main></body></html>`;

self.addEventListener('install', e => e.waitUntil(caches.open('rnan-app-v2').then(c => c.add('images/app/icon-192.png')).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== 'rnan-app-v2').map(k => caches.delete(k))))
    .then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
    if (e.request.mode === 'navigate') {
        e.respondWith(fetch(e.request, { cache: 'no-cache' }).catch(() => new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
    } else if (e.request.url.endsWith('/images/app/icon-192.png')) {
        e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    }
});

// الضغط على تنبيه (ملاحظة عميل أو اعتماد) يفتح اللوحة على المشروع المعني
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const d = e.notification.data || {};
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        const win = list.find(w => /\/admin/.test(w.url));
        if (win) { if (d.project) win.postMessage({ type: 'rnan-open-project', project: d.project }); return win.focus(); }
        return self.clients.openWindow(d.url || 'admin.html');
    }));
});
