/**
 * Settings Component - System Configuration & Security
 */

export const SettingsComponent = {
    render: function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const settings = data.settings || {
            monthly_target: 30000,
            vat_rate: 15,
            invoice_footer: 'عبدالعزيز خميس أحمد النهدي\nرقم الحساب: 077040010006087202999\nرقم الآيبان (IBAN): SA38 8000 0859 6080 1720 2999',
            agency_name: 'رنان للإستشارات الإبداعية',
            email: 'hello@rannan.design',
            phone: '966555555555'
        };

        container.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                <!-- Header -->
                <div>
                    <h1 class="text-3xl font-black text-white">إعدادات النظام</h1>
                    <p class="text-sm text-muted mt-1">تخصيص أهداف لوحة التحكم، تفاصيل الفواتير الافتراضية، وإجراءات الأمان</p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Right/Main: Settings Forms -->
                    <div class="lg:col-span-2 space-y-8">
                        
                        <!-- Section 1: Dashboard Target & Agency Info -->
                        <div class="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full filter blur-xl"></div>
                            
                            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                <span class="material-symbols-rounded text-primary">analytics</span>
                                أهداف لوحة التحكم والبيانات الإبداعية
                            </h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">المستهدف المالي الشهري (ريال) *</label>
                                    <input type="number" id="settings-target-input" value="${settings.monthly_target}" 
                                        class="form-input-modern text-sm en-num">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">نسبة ضريبة القيمة المضافة (%) *</label>
                                    <input type="number" id="settings-vat-input" value="${settings.vat_rate}" 
                                        class="form-input-modern text-sm en-num">
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">اسم الاستوديو / الوكالة *</label>
                                    <input type="text" id="settings-agency-input" value="${settings.agency_name}" 
                                        class="form-input-modern text-sm">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">رقم هاتف الاستوديو</label>
                                    <input type="text" id="settings-phone-input" value="${settings.phone}" 
                                        class="form-input-modern text-sm en-num">
                                </div>
                            </div>

                            <div class="flex justify-end pt-2">
                                <button id="save-general-settings-btn" class="btn-glow px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-white flex items-center gap-1.5 shadow-glow-primary">
                                    <span class="material-symbols-rounded text-base">save</span>
                                    حفظ الإعدادات العامة
                                </button>
                            </div>
                        </div>

                        <!-- Section 2: Invoice Default Layout & IBAN -->
                        <div class="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full filter blur-xl"></div>
                            
                            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                <span class="material-symbols-rounded text-accent">receipt_long</span>
                                تذييل الفاتورة الافتراضي (معلومات التحويل البنكي)
                            </h3>
                            
                            <div>
                                <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">نص الحساب البنكي والتحويل والـ IBAN</label>
                                <textarea id="settings-footer-input" rows="4" 
                                    placeholder="أدخل معلومات البنك والآيبان ليتم إرفاقها تلقائياً بأسفل الفواتير الصادرة..." 
                                    class="form-input-modern text-sm resize-none leading-relaxed">${settings.invoice_footer}</textarea>
                                <p class="text-[10px] text-slate-500 mt-1.5 mr-1">سوف يظهر هذا النص في أسفل الفاتورة بتصميم A4 الفاخر.</p>
                            </div>

                            <div class="flex justify-end pt-2">
                                <button id="save-invoice-settings-btn" class="btn-glow px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-white flex items-center gap-1.5 shadow-glow-primary">
                                    <span class="material-symbols-rounded text-base">save</span>
                                    حفظ تذييل الفواتير
                                </button>
                            </div>
                        </div>

                        <!-- Section 3: Security & Passcode Change -->
                        <div class="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full filter blur-xl"></div>
                            
                            <h3 class="text-lg font-bold text-white flex items-center gap-2">
                                <span class="material-symbols-rounded text-secondary">security</span>
                                أمان النظام ورمز المرور
                            </h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">رمز المرور الجديد للإدارة *</label>
                                    <input type="password" id="settings-new-pass-input" placeholder="أدخل رمزاً جديداً..." 
                                        class="form-input-modern text-sm text-center en-num tracking-widest placeholder:tracking-normal">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">تأكيد رمز المرور الجديد *</label>
                                    <input type="password" id="settings-confirm-pass-input" placeholder="أعد إدخال الرمز..." 
                                        class="form-input-modern text-sm text-center en-num tracking-widest placeholder:tracking-normal">
                                </div>
                            </div>

                            <div class="flex justify-end pt-2">
                                <button id="save-security-btn" class="btn-glow px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-primary to-secondary text-white flex items-center gap-1.5">
                                    <span class="material-symbols-rounded text-base">lock_open</span>
                                    تحديث رمز المرور
                                </button>
                            </div>
                        </div>

                    </div>

                    <!-- Left Sidebar: Info Panel & Quick System Stats -->
                    <div class="space-y-6">
                        <div class="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 relative overflow-hidden">
                            <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full filter blur-3xl"></div>
                            
                            <h3 class="text-md font-bold text-white">تفاصيل بيئة الاستوديو</h3>
                            
                            <div class="space-y-4 text-xs">
                                <div class="flex justify-between border-b border-white/5 pb-3">
                                    <span class="text-slate-400">إصدار قاعدة البيانات</span>
                                    <span class="text-slate-200 en-num font-bold">Firebase RTDB v9.0</span>
                                </div>
                                <div class="flex justify-between border-b border-white/5 pb-3">
                                    <span class="text-slate-400">حالة الاتصال بالخادم</span>
                                    <span class="text-emerald-400 font-bold flex items-center gap-1">
                                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                        متصل وقيد التشغيل
                                    </span>
                                </div>
                                <div class="flex justify-between border-b border-white/5 pb-3">
                                    <span class="text-slate-400">مسؤول النظام النشط</span>
                                    <span class="text-white font-bold">${localStorage.getItem('userName') || 'مدير النظام'}</span>
                                </div>
                                <div class="flex justify-between pb-1">
                                    <span class="text-slate-400">المنطقة الزمنية</span>
                                    <span class="text-slate-200 en-num font-bold">Asia/Riyadh (UTC+3)</span>
                                </div>
                            </div>
                        </div>

                        <div class="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
                            <h3 class="text-md font-bold text-white">تنظيف وتهيئة البيانات</h3>
                            <p class="text-xs text-slate-400 leading-relaxed">
                                يمكنك إعادة احتساب نقاط الولاء الإجمالية لجميع الشركاء وتحديث السجلات بالتنسيق مع الفواتير المدفوعة.
                            </p>
                            <button id="recalc-points-btn" class="w-full py-3 rounded-xl border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/10 text-slate-300 hover:text-amber-400 text-xs font-bold transition flex items-center justify-center gap-2">
                                <span class="material-symbols-rounded text-base">refresh</span>
                                إعادة مزامنة نقاط الولاء
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Event Binding: Save General Settings
        document.getElementById('save-general-settings-btn').addEventListener('click', (e) => {
            const target = parseFloat(document.getElementById('settings-target-input').value) || 0;
            const vat = parseFloat(document.getElementById('settings-vat-input').value) || 0;
            const agency = document.getElementById('settings-agency-input').value.trim();
            const phone = document.getElementById('settings-phone-input').value.trim();

            if (target <= 0 || vat < 0 || !agency) {
                alert('يرجى التحقق من المدخلات وملء الحقول المطلوبة (*)');
                return;
            }

            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>';

            const updatedSettings = {
                ...settings,
                monthly_target: target,
                vat_rate: vat,
                agency_name: agency,
                phone: phone
            };

            window.google.script.run.withSuccessHandler((msg) => {
                alert(msg || 'تم حفظ الإعدادات بنجاح!');
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-rounded text-base">save</span> حفظ الإعدادات العامة';
                if (window.loadAllData) window.loadAllData();
            }).saveSettingsData(updatedSettings);
        });

        // Event Binding: Save Invoice Footer Settings
        document.getElementById('save-invoice-settings-btn').addEventListener('click', (e) => {
            const footer = document.getElementById('settings-footer-input').value.trim();

            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>';

            const updatedSettings = {
                ...settings,
                invoice_footer: footer
            };

            window.google.script.run.withSuccessHandler((msg) => {
                alert(msg || 'تم حفظ تذييل الفاتورة بنجاح!');
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-rounded text-base">save</span> حفظ تذييل الفواتير';
                if (window.loadAllData) window.loadAllData();
            }).saveSettingsData(updatedSettings);
        });

        // Event Binding: Update Admin Password
        document.getElementById('save-security-btn').addEventListener('click', (e) => {
            const newPass = document.getElementById('settings-new-pass-input').value.trim();
            const confirmPass = document.getElementById('settings-confirm-pass-input').value.trim();

            if (!newPass || !confirmPass) {
                alert('يرجى ملء حقول رمز المرور');
                return;
            }

            if (newPass !== confirmPass) {
                alert('رمز المرور وتأكيده غير متطابقين!');
                return;
            }

            const btn = e.currentTarget;
            btn.disabled = true;
            btn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>';

            window.google.script.run.withSuccessHandler((msg) => {
                alert(msg || 'تم تحديث رمز مرور الإدارة بنجاح!');
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-rounded text-base">lock_open</span> تحديث رمز المرور';
                document.getElementById('settings-new-pass-input').value = '';
                document.getElementById('settings-confirm-pass-input').value = '';
            }).changeAdminPassword(newPass);
        });

        // Event Binding: Recalculate Points
        document.getElementById('recalc-points-btn').addEventListener('click', (e) => {
            if (confirm('هل ترغب بمزامنة وإعادة احتساب نقاط الولاء لجميع العملاء بناءً على فواتيرهم المسددة؟')) {
                const btn = e.currentTarget;
                btn.disabled = true;
                btn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-amber-400 border-t-transparent rounded-full"></div>';

                window.google.script.run.withSuccessHandler((msg) => {
                    alert(msg || 'تمت إعادة مزامنة نقاط الولاء بنجاح.');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-rounded text-base">refresh</span> إعادة مزامنة نقاط الولاء';
                    if (window.loadAllData) window.loadAllData();
                }).recalculateAllPoints();
            }
        });
    }
};
