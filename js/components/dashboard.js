/**
 * Dashboard Component - Handles Admin & Client Dashboard Rendering
 */

export const DashboardComponent = {
    // Keep track of Chart instance to destroy/recreate cleanly
    chartInstance: null,

    render: function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const role = localStorage.getItem('userType') || 'client';

        if (role === 'admin') {
            this.renderAdmin(container, data);
        } else {
            this.renderClient(container, data);
        }
    },

    renderAdmin: function(container, data) {
        const clients = data.clients || [];
        const projects = data.projects || [];
        const invoices = data.invoices || [];
        const settings = data.settings || { monthly_target: 30000 };

        // Calculations
        const activeClientsCount = clients.filter(c => c.status === 'نشط').length;
        const activeProjects = projects.filter(p => p.status !== 'مكتمل' && p.status !== 'معلق');
        const completedProjectsCount = projects.filter(p => p.status === 'مكتمل').length;
        
        // Financials
        const totalRevenue = invoices
            .filter(i => i.status === 'مدفوعة')
            .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

        // Current Month target calc
        const target = parseFloat(settings.monthly_target) || 30000;
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11

        const currentMonthPaid = invoices
            .filter(i => {
                if (i.status !== 'مدفوعة' || !i.date) return false;
                const d = new Date(i.date);
                return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
            })
            .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

        const progressPercent = Math.min(100, Math.round((currentMonthPaid / target) * 100)) || 0;

        container.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                <!-- Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 class="text-3xl font-black text-white tracking-tight">لوحة القيادة الإبداعية</h1>
                        <p class="text-sm text-muted mt-1">متابعة الأداء الإداري والمالي الفوري للاستوديو</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button id="dashboard-bank-settings-btn" class="glass-panel px-4 py-2.5 rounded-xl border border-white/5 hover:border-primary/45 hover:bg-primary/10 text-xs font-bold text-white flex items-center gap-2 transition">
                            <span class="material-symbols-rounded text-primary text-base">settings</span>
                            <span>إعدادات الحساب البنكي</span>
                        </button>
                        <div class="glass-panel px-4 py-2.5 rounded-xl border border-white/5 flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <span class="text-xs font-bold text-white en-num">${new Date().toLocaleDateString('ar-SA')}</span>
                        </div>
                    </div>
                </div>

                <!-- KPIs Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <!-- Revenue -->
                    <div class="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-xs font-bold text-slate-400">إجمالي الإيرادات</p>
                                <h3 class="text-2xl font-black text-white mt-2 en-num">${totalRevenue.toLocaleString('ar-SA')} <span class="text-xs font-normal text-muted">ريال</span></h3>
                            </div>
                            <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-glow-primary">
                                <span class="material-symbols-rounded">payments</span>
                            </div>
                        </div>
                        <p class="text-[10px] text-emerald-400 flex items-center gap-1 mt-4">
                            <span class="material-symbols-rounded text-xs">trending_up</span>
                            <span>مدفوعة بالكامل عبر الفواتير</span>
                        </p>
                    </div>

                    <!-- Active Projects -->
                    <div class="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-xs font-bold text-slate-400">المشاريع النشطة</p>
                                <h3 class="text-2xl font-black text-white mt-2 en-num">${activeProjects.length} <span class="text-xs font-normal text-muted">مشروع</span></h3>
                            </div>
                            <div class="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shadow-glow-primary" style="--tw-shadow-color: rgba(139, 92, 246, 0.3)">
                                <span class="material-symbols-rounded">architecture</span>
                            </div>
                        </div>
                        <p class="text-[10px] text-muted flex items-center gap-1 mt-4">
                            <span>جاري العمل على تسليمها في الوقت المحدد</span>
                        </p>
                    </div>

                    <!-- Clients -->
                    <div class="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-xs font-bold text-slate-400">العملاء النشطين</p>
                                <h3 class="text-2xl font-black text-white mt-2 en-num">${activeClientsCount} <span class="text-xs font-normal text-muted">عميل</span></h3>
                            </div>
                            <div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20 shadow-glow-primary" style="--tw-shadow-color: rgba(6, 182, 212, 0.3)">
                                <span class="material-symbols-rounded">group</span>
                            </div>
                        </div>
                        <p class="text-[10px] text-muted flex items-center gap-1 mt-4">
                            <span>مسجلين نشطين في النظام</span>
                        </p>
                    </div>

                    <!-- Finished Projects -->
                    <div class="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-xs font-bold text-slate-400">المشاريع المنجزة</p>
                                <h3 class="text-2xl font-black text-white mt-2 en-num">${completedProjectsCount} <span class="text-xs font-normal text-muted">مشروع</span></h3>
                            </div>
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-glow-primary" style="--tw-shadow-color: rgba(16, 185, 129, 0.3)">
                                <span class="material-symbols-rounded">verified</span>
                            </div>
                        </div>
                        <p class="text-[10px] text-emerald-400 flex items-center gap-1 mt-4">
                            <span class="material-symbols-rounded text-xs">emoji_events</span>
                            <span>تم إنجازها وتسليمها بالكامل</span>
                        </p>
                    </div>
                </div>

                <!-- Graphs & Target Progress Section -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Interactive Chart -->
                    <div class="glass-panel p-6 rounded-3xl border border-white/5 lg:col-span-2 flex flex-col justify-between">
                        <div class="flex justify-between items-center mb-6">
                            <div>
                                <h3 class="text-lg font-bold text-white">التحليلات المالية</h3>
                                <p class="text-xs text-muted">رصد الأداء المالي للمدفوعات الشهرية</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                                <span class="text-xs text-slate-300">المدفوعات (ريال)</span>
                            </div>
                        </div>
                        <div class="h-64 relative w-full">
                            <canvas id="revenueChart"></canvas>
                        </div>
                    </div>

                    <!-- Target Circular Progress Widget -->
                    <div class="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <!-- Top header -->
                        <div class="absolute top-6 right-6 text-right">
                            <h3 class="text-sm font-bold text-white">هدف الشهر المالي</h3>
                            <p class="text-[10px] text-muted">المستهدف: ${target.toLocaleString('ar-SA')} ريال</p>
                        </div>

                        <!-- Progress Ring -->
                        <div class="relative flex items-center justify-center my-6">
                            <svg class="w-40 h-40 transform -rotate-90">
                                <circle cx="80" cy="80" r="66" stroke="rgba(255, 255, 255, 0.03)" stroke-width="10" fill="transparent" />
                                <circle cx="80" cy="80" r="66" stroke="url(#dashboardGlow)" stroke-width="10" fill="transparent"
                                    stroke-dasharray="414" stroke-dashoffset="${414 - (414 * progressPercent) / 100}" 
                                    stroke-linecap="round" class="progress-ring-circle" />
                                <defs>
                                    <linearGradient id="dashboardGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#3b82f6" />
                                        <stop offset="100%" stop-color="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div class="absolute inset-0 flex flex-col items-center justify-center">
                                <span class="text-3xl font-black text-white en-num">${progressPercent}%</span>
                                <span class="text-[10px] text-muted mt-0.5">من الهدف</span>
                            </div>
                        </div>

                        <!-- Details -->
                        <div class="w-full space-y-3 mt-2">
                            <div class="flex justify-between text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                                <span class="text-muted">المحقق هذا الشهر:</span>
                                <span class="font-bold text-white en-num">${currentMonthPaid.toLocaleString('ar-SA')} ريال</span>
                            </div>
                            <p class="text-[10px] text-slate-400">يتم احتساب النسبة تلقائياً بناءً على فواتير هذا الشهر ذات الحالة "مدفوعة".</p>
                        </div>
                    </div>
                </div>

                <!-- Bottom Dashboard Row -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Active Projects Tracking -->
                    <div class="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <div>
                                <h3 class="text-lg font-bold text-white">تتبع المشاريع الجارية</h3>
                                <p class="text-xs text-muted">نسبة الإنجاز وتاريخ التسليم المتوقع</p>
                            </div>
                            <span class="text-xs text-primary font-bold hover:underline cursor-pointer" onclick="switchPage('projects')">عرض الكل</span>
                        </div>

                        <div class="space-y-4 flex-1 overflow-y-auto max-h-[320px] pr-1">
                            ${activeProjects.length === 0 ? `
                                <div class="flex flex-col items-center justify-center py-12 text-center">
                                    <span class="material-symbols-rounded text-4xl text-muted">assignment_late</span>
                                    <p class="text-sm text-muted mt-2">لا توجد مشاريع جارية حالياً</p>
                                </div>
                            ` : activeProjects.slice(0, 5).map(p => {
                                const prog = parseInt(p.progress) || 0;
                                let barColor = 'bg-primary';
                                if (prog > 70) barColor = 'bg-emerald-500';
                                else if (prog > 30) barColor = 'bg-secondary';
                                
                                return `
                                    <div class="p-4 rounded-xl border border-white/5 bg-white/5 flex items-center justify-between gap-4">
                                        <div class="flex-1">
                                            <div class="flex justify-between items-start mb-1">
                                                <h4 class="font-bold text-white text-sm">${p.name}</h4>
                                                <span class="text-[10px] text-slate-300 en-num">التسليم: ${p.deadline || '-'}</span>
                                            </div>
                                            <div class="flex items-center gap-2 mt-2">
                                                <div class="flex-1 bg-black/40 h-1.5 rounded-full overflow-hidden">
                                                    <div class="h-full ${barColor} transition-all duration-500" style="width: ${prog}%"></div>
                                                </div>
                                                <span class="text-[10px] font-bold text-white en-num">${prog}%</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Client Status & Activity Feed -->
                    <div class="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col">
                        <div class="flex justify-between items-center mb-6">
                            <div>
                                <h3 class="text-lg font-bold text-white">النشاطات الأخيرة</h3>
                                <p class="text-xs text-muted">آخر التحديثات والإشعارات الصادرة</p>
                            </div>
                        </div>

                        <div id="dashboard-activity-feed" class="space-y-4 flex-1 overflow-y-auto max-h-[320px] pr-1">
                            <!-- Injected dynamically or shows default fallback -->
                            <div class="flex flex-col items-center justify-center py-12 text-center">
                                <span class="material-symbols-rounded text-4xl text-muted animate-pulse">timeline</span>
                                <p class="text-sm text-muted mt-2">جاري تحميل سجل النشاطات...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bank Settings Modal -->
            <div id="dashboardBankSettingsModal" class="modal fixed inset-0 z-[60] bg-black/90 backdrop-blur-md items-center justify-center p-4">
                <div class="glass-panel p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/5 text-right relative">
                    <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-accent mx-auto mb-6 flex items-center justify-center shadow-glow-primary">
                        <span class="material-symbols-rounded text-3xl text-white">account_balance</span>
                    </div>
                    <h3 class="font-bold text-2xl text-white mb-2 text-center">إعدادات الحساب البنكي</h3>
                    <p class="text-xs text-muted mb-6 text-center">هذا الحساب سيظهر تلقائياً في جميع الفواتير الصادرة والمطبوعة.</p>
                    
                    <div class="space-y-4 mb-8">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1.5 mr-1">اسم صاحب الحساب *</label>
                            <input id="dash-bank-acc-name" placeholder="مثال: عبدالعزيز خميس أحمد النهدي" class="form-input-modern text-right font-bold text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1.5 mr-1">رقم الحساب *</label>
                            <input id="dash-bank-acc-number" placeholder="مثال: 077040010006087202999" class="form-input-modern text-center en-num text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-1.5 mr-1">رقم الآيبان (IBAN) *</label>
                            <input id="dash-bank-acc-iban" placeholder="مثال: SA38 8000 0859 6080 1720 2999" class="form-input-modern text-center en-num text-sm">
                        </div>
                    </div>
                    
                    <div class="flex gap-3">
                        <button id="save-dash-bank-settings-btn" class="flex-1 btn-glow bg-primary text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5">
                            <span class="material-symbols-rounded text-base">save</span>
                            <span>حفظ وتحديث الكل</span>
                        </button>
                        <button id="close-dash-bank-modal" class="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-colors">
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Render Activity Feed
        this.renderActivityFeed(data.notifications || []);

        // Initialize Chart
        setTimeout(() => this.initChart(invoices), 100);

        // Bind Bank Settings Events
        const settingsBtn = document.getElementById('dashboard-bank-settings-btn');
        const bankModal = document.getElementById('dashboardBankSettingsModal');
        if (settingsBtn && bankModal) {
            settingsBtn.addEventListener('click', () => {
                document.getElementById('dash-bank-acc-name').value = "جاري التحميل...";
                document.getElementById('dash-bank-acc-number').value = "جاري التحميل...";
                document.getElementById('dash-bank-acc-iban').value = "جاري التحميل...";
                bankModal.classList.add('open');

                window.google.script.run.withSuccessHandler((settings) => {
                    let name = settings.bank_account_name || "";
                    let number = settings.bank_account_number || "";
                    let iban = settings.bank_iban || "";

                    if (!name && !number && !iban) {
                        const footerText = settings.invoice_footer || "عبد الله سالم عبد الله بشر\nمصرف الراجحي (IBAN): SA1030100991102121331820";
                        const lines = footerText.split('\n');
                        if (lines.length >= 1) name = lines[0].trim();
                        if (lines.length >= 2) {
                            const numMatch = lines[1].match(/رقم الحساب:\s*(.*)/);
                            number = numMatch ? numMatch[1].trim() : lines[1].replace(/رقم الحساب:\s*/g, '').trim();
                        }
                        if (lines.length >= 3) {
                            const ibanMatch = lines[2].match(/رقم الآيبان \(IBAN\):\s*(.*)/);
                            iban = ibanMatch ? ibanMatch[1].trim() : lines[2].replace(/رقم الآيبان \(IBAN\):\s*/g, '').trim();
                        }
                    }

                    document.getElementById('dash-bank-acc-name').value = name;
                    document.getElementById('dash-bank-acc-number').value = number;
                    document.getElementById('dash-bank-acc-iban').value = iban;
                }).getSettingsData();
            });

            document.getElementById('close-dash-bank-modal').addEventListener('click', () => {
                bankModal.classList.remove('open');
            });

            document.getElementById('save-dash-bank-settings-btn').addEventListener('click', () => {
                const name = document.getElementById('dash-bank-acc-name').value.trim();
                const number = document.getElementById('dash-bank-acc-number').value.trim();
                const iban = document.getElementById('dash-bank-acc-iban').value.trim();

                if (!name || !number || !iban) {
                    alert("يرجى ملء جميع الحقول المطلوبة.");
                    return;
                }

                const saveBtn = document.getElementById('save-dash-bank-settings-btn');
                const originalText = saveBtn.innerHTML;
                saveBtn.disabled = true;
                saveBtn.innerHTML = `<span class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block"></span> جاري الحفظ...`;

                window.google.script.run
                    .withSuccessHandler((msg) => {
                        alert(msg || "تم تحديث الحساب البنكي لجميع الفواتير بنجاح!");
                        if (window.loadAllData) window.loadAllData();
                        bankModal.classList.remove('open');
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = originalText;
                    })
                    .withFailureHandler((err) => {
                        alert("حدث خطأ أثناء الحفظ: " + (err.message || err));
                        saveBtn.disabled = false;
                        saveBtn.innerHTML = originalText;
                    })
                    .updateBankSettings({
                        bank_account_name: name,
                        bank_account_number: number,
                        bank_iban: iban
                    });
            });
        }
    },

    renderClient: function(container, data) {
        const clientName = localStorage.getItem('userName') || '';
        const clientPhone = localStorage.getItem('userPhone') || '';
        const projects = data.projects || [];
        const invoices = data.invoices || [];

        // Client filtered
        const myProjects = projects.filter(p => p.client === clientName);
        const myInvoices = invoices.filter(i => i.client === clientName);

        // Loyalty Status Logic
        const totalSpent = myInvoices
            .filter(i => i.status === 'مدفوعة')
            .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

        let loyaltyTier = 'برونزي';
        let tierColor = 'from-orange-500 to-amber-600';
        let tierText = 'المستوى البرونزي';
        let badgeGlow = 'rgba(245, 158, 11, 0.3)';

        if (totalSpent >= 15000) {
            loyaltyTier = 'بلاتيني';
            tierColor = 'from-slate-300 via-slate-100 to-cyan-200';
            tierText = 'المستوى البلاتيني النخبة';
            badgeGlow = 'rgba(186, 230, 253, 0.4)';
        } else if (totalSpent >= 5000) {
            loyaltyTier = 'ذهبي';
            tierColor = 'from-yellow-400 via-amber-300 to-yellow-600';
            tierText = 'المستوى الذهبي الممتاز';
            badgeGlow = 'rgba(251, 191, 36, 0.4)';
        } else if (totalSpent >= 1000) {
            loyaltyTier = 'فضي';
            tierColor = 'from-slate-400 via-slate-300 to-slate-500';
            tierText = 'المستوى الفضي المتقدم';
            badgeGlow = 'rgba(148, 163, 184, 0.3)';
        }

        // Calculate points (fallback or math)
        // 1 point per 10 riyals, gold multiplier 1.1, platinum 1.25
        let mult = 1.0;
        if (totalSpent >= 15000) mult = 1.25;
        else if (totalSpent >= 5000) mult = 1.1;
        const estimatedPoints = Math.floor(totalSpent * mult);

        container.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                <!-- Welcome Banner -->
                <div class="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div class="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full filter blur-[80px] pointer-events-none"></div>
                    <div class="z-10">
                        <h1 class="text-3xl font-black text-white">مرحباً بك، <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">${clientName}</span> 👋</h1>
                        <p class="text-sm text-slate-300 mt-2">يسعدنا متابعتك لسير العمل الفني لمشاريعك ومستحقاتك.</p>
                        
                        <div class="flex items-center gap-2 mt-4">
                            <span class="text-xs text-muted">رقم الجوال المسجل:</span>
                            <span class="text-xs text-white font-bold en-num" dir="ltr">${clientPhone}</span>
                        </div>
                    </div>

                    <!-- Loyalty Badge -->
                    <div class="glass-panel p-5 rounded-2xl border border-white/10 flex items-center gap-4 relative overflow-hidden bg-black/40 z-10 self-stretch md:self-auto md:w-80 shadow-glow-primary" style="--tw-shadow-color: ${badgeGlow}">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-tr ${tierColor} flex items-center justify-center shadow-lg flex-shrink-0 animate-glow">
                            <span class="material-symbols-rounded text-2xl text-slate-900">workspace_premium</span>
                        </div>
                        <div>
                            <p class="text-[10px] text-muted">نظام الولاء والمكافآت</p>
                            <h4 class="text-base font-black text-white mt-0.5">${tierText}</h4>
                            <div class="flex justify-between items-center mt-2 text-xs">
                                <span class="text-slate-400">النقاط المكتسبة:</span>
                                <span class="font-bold text-accent en-num">${estimatedPoints} نقطة</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Projects & Invoices Section -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Client Projects -->
                    <div class="lg:col-span-2 space-y-6">
                        <div class="flex justify-between items-center">
                            <div>
                                <h3 class="text-xl font-bold text-white">المشاريع الجارية</h3>
                                <p class="text-xs text-muted">مراحل التنفيذ للمشروع والخط الزمني</p>
                            </div>
                        </div>

                        <div id="client-active-projects" class="space-y-4">
                            <!-- Injected by client loading -->
                        </div>

                        <div class="pt-4">
                            <h3 class="text-xl font-bold text-white mb-4">المشاريع المنتهية</h3>
                            <div id="client-completed-projects" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <!-- Injected by client loading -->
                            </div>
                        </div>
                    </div>

                    <!-- Client Invoices -->
                    <div class="space-y-6">
                        <div>
                            <h3 class="text-xl font-bold text-white">الفواتير والمستحقات</h3>
                            <p class="text-xs text-muted">سجل الفواتير والدفعات المالية الخاصة بك</p>
                        </div>

                        <div class="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full text-right text-xs">
                                    <thead class="bg-white/5 text-slate-300 font-bold border-b border-white/5">
                                        <tr>
                                            <th class="px-4 py-3">رقم الفاتورة</th>
                                            <th class="px-4 py-3">التاريخ</th>
                                            <th class="px-4 py-3">المبلغ</th>
                                            <th class="px-4 py-3 text-center">الحالة</th>
                                            <th class="px-4 py-3 text-center">الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody id="client-invoices-list" class="divide-y divide-white/5">
                                        <!-- Injected dynamically -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Render items inside containers using local DOM methods
        this.renderClientDetails(myProjects, myInvoices);
    },

    renderClientDetails: function(myProjects, myInvoices) {
        const formatCurrency = (val) => parseFloat(val).toLocaleString('ar-SA') + ' ريال';
        
        // Render Active Projects
        const activeContainer = document.getElementById('client-active-projects');
        if (activeContainer) {
            activeContainer.innerHTML = '';
            const activeProjs = myProjects.filter(p => p.status !== 'مكتمل');
            if (activeProjs.length === 0) {
                activeContainer.innerHTML = `
                    <div class="glass-panel p-8 text-center text-muted rounded-2xl border border-white/5">
                        <span class="material-symbols-rounded text-3xl text-muted mb-2">folder_open</span>
                        <p class="text-sm">لا توجد مشاريع قيد التنفيذ حالياً.</p>
                    </div>
                `;
            } else {
                activeProjs.forEach(p => {
                    activeContainer.innerHTML += this.createProjectCardHTML(p, false);
                });
            }
        }

        // Render Completed Projects
        const completedContainer = document.getElementById('client-completed-projects');
        if (completedContainer) {
            completedContainer.innerHTML = '';
            const completedProjs = myProjects.filter(p => p.status === 'مكتمل');
            if (completedProjs.length === 0) {
                completedContainer.innerHTML = `
                    <div class="glass-panel p-6 text-center text-muted rounded-2xl border border-white/5 col-span-2">
                        <p class="text-xs">لا توجد مشاريع منجزة في السجل.</p>
                    </div>
                `;
            } else {
                completedProjs.forEach(p => {
                    completedContainer.innerHTML += this.createProjectCardHTML(p, true);
                });
            }
        }

        // Render Invoices Table
        const invContainer = document.getElementById('client-invoices-list');
        if (invContainer) {
            invContainer.innerHTML = '';
            if (myInvoices.length === 0) {
                invContainer.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-muted">لا توجد فواتير صادرة</td></tr>';
            } else {
                myInvoices.forEach(i => {
                    const statusClass = i.status === 'مدفوعة' ? 'status-paid' : 'status-pending';
                    const statusText = i.status || 'معلقة';
                    const row = document.createElement('tr');
                    row.className = 'transition-all hover:bg-white/5 border-b border-white/5';
                    row.innerHTML = `
                        <td class="px-4 py-3.5 font-bold text-primary en-num">#${i.number}</td>
                        <td class="px-4 py-3.5 text-muted en-num text-[10px]">${i.date || '-'}</td>
                        <td class="px-4 py-3.5 font-bold text-white en-num">${formatCurrency(i.amount)}</td>
                        <td class="px-4 py-3.5 text-center"><span class="status-pill ${statusClass} text-[10px] py-0.5 px-2">${statusText}</span></td>
                        <td class="px-4 py-3.5 text-center">
                            <button class="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition mx-auto" title="عرض الفاتورة">
                                <span class="material-symbols-rounded text-sm">visibility</span>
                            </button>
                        </td>
                    `;
                    // Bind visibility click
                    row.querySelector('button').addEventListener('click', () => {
                        if (window.printInvoiceDirectly) window.printInvoiceDirectly(i);
                    });
                    invContainer.appendChild(row);
                });
            }
        }
    },

    createProjectCardHTML: function(p, isCompleted) {
        const prog = parseInt(p.progress) || 0;
        let barColor = 'bg-primary';
        let statusBg = 'bg-primary/10 text-primary border-primary/20';
        let actionHTML = '';

        if (isCompleted) {
            barColor = 'bg-emerald-500';
            statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

            // Rating Stars
            let stars = '';
            const currentRating = parseInt(p.rating) || 0;
            for (let i = 1; i <= 5; i++) {
                const icon = i <= currentRating ? 'star' : 'star_outline';
                const color = i <= currentRating ? 'text-amber-400' : 'text-slate-600';
                stars += `<span class="material-symbols-rounded cursor-pointer ${color} hover:text-amber-300 transition text-sm" data-star="${i}" data-row="${p.rowIndex}">${icon}</span>`;
            }
            actionHTML = `
                <div class="flex items-center gap-1 mt-3 p-2 bg-white/5 rounded-xl border border-white/5 w-fit">
                    <span class="text-[10px] text-slate-400 ml-2">تقييمك للمشروع:</span>
                    <div class="flex items-center star-rating-container">${stars}</div>
                </div>
            `;
        } else {
            if (p.status === 'معلق') {
                barColor = 'bg-amber-500';
                statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            }
            actionHTML = `
                <button class="mt-4 w-full text-xs font-bold bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl transition border border-white/5 flex items-center justify-center gap-1" data-action="details" data-row="${p.rowIndex}">
                    <span class="material-symbols-rounded text-sm">page_info</span>
                    عرض وتتبع خطوات التنفيذ
                </button>
            `;
        }

        // Return HTML string
        return `
            <div class="glass-panel rounded-2xl p-5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/5 transition-all"> 
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-1.5">
                        <h4 class="text-lg font-black text-white">${p.name}</h4>
                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusBg}">${p.status || 'نشط'}</span>
                    </div>
                    <div class="flex gap-4 text-[10px] text-muted">
                        <span class="flex items-center gap-1"><span class="material-symbols-rounded text-xs text-slate-400">calendar_today</span> البدء: <span class="en-num text-slate-300">${p.startDate || '-'}</span></span>
                        <span class="flex items-center gap-1"><span class="material-symbols-rounded text-xs text-slate-400">event</span> التسليم: <span class="en-num text-slate-300">${p.deadline || '-'}</span></span>
                    </div>
                    ${actionHTML}
                </div>

                <div class="w-full md:w-1/4 flex flex-col justify-center">
                    <div class="flex justify-between text-xs mb-1.5">
                        <span class="text-muted">نسبة الإنجاز</span>
                        <span class="font-bold text-white en-num">${prog}%</span>
                    </div>
                    <div class="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
                        <div class="h-full ${barColor} transition-all duration-1000" style="width: ${prog}%"></div>
                    </div>
                </div>
            </div>
        `;
    },

    renderActivityFeed: function(notifications) {
        const feed = document.getElementById('dashboard-activity-feed');
        if (!feed) return;

        feed.innerHTML = '';
        const limitNotifs = notifications.slice(0, 5);

        if (limitNotifs.length === 0) {
            feed.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 text-center">
                    <span class="material-symbols-rounded text-2xl text-slate-600">notifications_off</span>
                    <p class="text-xs text-slate-500 mt-2">لا توجد تحديثات أخيرة</p>
                </div>
            `;
            return;
        }

        limitNotifs.forEach(n => {
            const dateStr = n.date ? new Date(n.date).toLocaleDateString('ar-SA') : '---';
            let icon = 'notifications';
            let iconColor = 'text-primary bg-primary/10';

            if (n.type === 'invoice_paid' || n.type === 'points_earned') {
                icon = 'check_circle';
                iconColor = 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
            } else if (n.type === 'new_invoice' || n.type === 'project_new') {
                icon = 'add_circle';
                iconColor = 'text-sky-400 bg-sky-500/10 border border-sky-500/20';
            }

            feed.innerHTML += `
                <div class="p-3.5 rounded-xl border border-white/5 bg-white/5 flex gap-3 items-start">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center ${iconColor} flex-shrink-0">
                        <span class="material-symbols-rounded text-base">${icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-white leading-snug">${n.message}</p>
                        <div class="flex justify-between items-center mt-2 text-[9px] text-muted">
                            <span class="font-semibold">${n.client || 'العام'}</span>
                            <span class="en-num">${dateStr}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    },

    initChart: function(invoices) {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;

        // Group invoice revenues by month
        const monthlyData = {};
        const monthsNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        // Fill current year months
        const year = new Date().getFullYear();
        for (let m = 0; m < 12; m++) {
            monthlyData[m] = 0;
        }

        invoices
            .filter(i => i.status === 'مدفوعة' && i.date)
            .forEach(i => {
                const d = new Date(i.date);
                if (d.getFullYear() === year) {
                    const month = d.getMonth();
                    monthlyData[month] += parseFloat(i.amount || 0);
                }
            });

        const labels = monthsNames;
        const revenueValues = monthsNames.map((_, index) => monthlyData[index]);

        // Destroy existing chart if it exists
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        // Draw chart
        const ctx = canvas.getContext('2d');
        
        // Gradient background
        const primaryGlow = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight);
        primaryGlow.addColorStop(0, 'rgba(216, 176, 106, 0.34)');
        primaryGlow.addColorStop(1, 'rgba(216, 176, 106, 0.0)');

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'المدفوعات',
                    data: revenueValues,
                    borderColor: '#d8b06a',
                    borderWidth: 2.5,
                    backgroundColor: primaryGlow,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#f0dcaa',
                    pointBorderColor: 'rgba(0,0,0,0.6)',
                    pointHoverRadius: 7,
                    pointHoverBackgroundColor: '#f3e2b4'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        rtl: true,
                        titleFont: { family: 'Cairo', size: 12 },
                        bodyFont: { family: 'Cairo', size: 12 },
                        backgroundColor: 'rgba(14, 12, 9, 0.95)',
                        borderColor: 'rgba(216,176,106,0.35)',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return ` الإيرادات: ${context.parsed.y.toLocaleString('ar-SA')} ريال`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#7d7466',
                            font: { family: 'Cairo', size: 10 }
                        }
                    },
                    y: {
                        grid: { color: 'rgba(216,176,106,0.06)' },
                        ticks: {
                            color: '#7d7466',
                            font: { family: 'Cairo', size: 10 },
                            callback: function(value) {
                                return value.toLocaleString('ar-SA') + ' ر.س';
                            }
                        }
                    }
                }
            }
        });
    }
};
