/**
 * Projects Component - Project Management Board & Calendar
 */

export const ProjectsComponent = {
    viewMode: 'grid', // 'grid' or 'calendar'
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    searchQuery: '',
    statusFilter: 'all',

    render: function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const projects = data.projects || [];
        const clients = data.clients || [];
        const role = localStorage.getItem('userType') || 'client';

        // Filter projects
        const filteredProjects = projects.filter(p => {
            const matchesSearch = (p.name || '').toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                                  (p.client || '').toLowerCase().includes(this.searchQuery.toLowerCase());
            
            const matchesStatus = this.statusFilter === 'all' ||
                                  (this.statusFilter === 'active' && p.status !== 'مكتمل' && p.status !== 'معلق') ||
                                  (this.statusFilter === 'suspended' && p.status === 'معلق') ||
                                  (this.statusFilter === 'completed' && p.status === 'مكتمل');
            
            return matchesSearch && matchesStatus;
        });

        // Totals
        const totalProj = projects.length;
        const activeProj = projects.filter(p => p.status !== 'مكتمل' && p.status !== 'معلق').length;
        const suspendedProj = projects.filter(p => p.status === 'معلق').length;
        const completedProj = projects.filter(p => p.status === 'مكتمل').length;

        container.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h1 class="text-3xl font-black text-white">إدارة المشاريع الإبداعية</h1>
                        <p class="text-sm text-muted mt-1">تتبع خط سير التصاميم، المهام اليومية، وتقييمات العملاء</p>
                    </div>
                    ${role === 'admin' ? `
                        <button id="add-project-btn" class="btn-glow bg-gradient-to-r from-primary to-secondary text-white py-3 px-6 rounded-xl font-bold flex items-center gap-2 text-sm">
                            <span class="material-symbols-rounded text-lg">add_task</span>
                            إنشاء مشروع جديد
                        </button>
                    ` : ''}
                </div>

                <!-- Stats Overview -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block font-semibold">إجمالي المشاريع</span>
                        <span class="text-xl font-black text-white mt-1 en-num block">${totalProj}</span>
                    </div>
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block font-semibold">قيد التنفيذ</span>
                        <span class="text-xl font-black text-primary mt-1 en-num block">${activeProj}</span>
                    </div>
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block font-semibold">معلق ومؤجل</span>
                        <span class="text-xl font-black text-amber-500 mt-1 en-num block">${suspendedProj}</span>
                    </div>
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block font-semibold">مشاريع مكتملة</span>
                        <span class="text-xl font-black text-emerald-400 mt-1 en-num block">${completedProj}</span>
                    </div>
                </div>

                <!-- Toolbar Filters -->
                <div class="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                    <!-- Search -->
                    <div class="relative flex-1">
                        <span class="material-symbols-rounded absolute right-3.5 top-3.5 text-muted text-lg">search</span>
                        <input type="text" id="project-search-input" placeholder="البحث باسم المشروع أو اسم العميل..." 
                            value="${this.searchQuery}"
                            class="form-input-modern pr-11 text-sm">
                    </div>

                    <!-- View & Filter Controls -->
                    <div class="flex flex-wrap gap-3 items-center">
                        <!-- Status Filter -->
                        <select id="project-status-filter" class="form-input-modern text-xs py-2 px-4 bg-black/40 border border-white/5 rounded-xl text-slate-300">
                            <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>كل الحالات</option>
                            <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>قيد التنفيذ</option>
                            <option value="suspended" ${this.statusFilter === 'suspended' ? 'selected' : ''}>معلق</option>
                            <option value="completed" ${this.statusFilter === 'completed' ? 'selected' : ''}>مكتمل</option>
                        </select>

                        <!-- View Toggle -->
                        <div class="flex bg-black/40 rounded-xl p-1 border border-white/5">
                            <button id="view-grid-btn" class="p-2 rounded-lg transition-all ${this.viewMode === 'grid' ? 'bg-primary text-white shadow-glow-primary' : 'text-muted hover:text-white'}" title="عرض لوحة التحكم">
                                <span class="material-symbols-rounded text-sm block">grid_view</span>
                            </button>
                            <button id="view-calendar-btn" class="p-2 rounded-lg transition-all ${this.viewMode === 'calendar' ? 'bg-primary text-white shadow-glow-primary' : 'text-muted hover:text-white'}" title="عرض التقويم">
                                <span class="material-symbols-rounded text-sm block">calendar_month</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Projects Content Area -->
                <div id="projects-container">
                    ${this.viewMode === 'grid' ? this.renderGridView(filteredProjects, role) : this.renderCalendarView(projects)}
                </div>
            </div>

            <!-- Project Details & Workflow steps modal -->
            <div id="projectModal" class="modal fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm items-center justify-center p-4">
                <div class="glass-modal w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden modal-content-anim max-h-[90vh]">
                    <div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
                    
                    <div class="p-6 border-b border-white/5 flex justify-between items-center bg-black/25">
                        <h3 id="project-modal-title" class="text-lg font-bold text-white">تفاصيل المشروع ومراحل العمل</h3>
                        <button id="close-project-modal-btn" class="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    <div class="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar text-right">
                        <input type="hidden" id="proj-row-index">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">اسم المشروع الفني *</label>
                                <input type="text" id="proj-name" placeholder="مثال: الهوية البصرية لشركة رنان" class="form-input-modern text-sm">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">العميل المرتبط *</label>
                                <select id="proj-client" class="form-input-modern text-sm">
                                    <option value="">اختر عميل...</option>
                                    ${clients.map(c => `<option value="${c.name}">${c.name} (${c.company || 'فردي'})</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">تاريخ البدء</label>
                                <input type="date" id="proj-start-date" class="form-input-modern text-xs text-center en-num">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">الموعد النهائي للتسليم</label>
                                <input type="date" id="proj-deadline" class="form-input-modern text-xs text-center en-num">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">حالة المشروع</label>
                                <select id="proj-status" class="form-input-modern text-sm">
                                    <option value="تحت التخطيط">تحت التخطيط</option>
                                    <option value="قيد التنفيذ">قيد التنفيذ</option>
                                    <option value="معلق">معلق</option>
                                    <option value="مكتمل">مكتمل</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">قيمة المشروع (ريال)</label>
                                <input type="number" id="proj-value" placeholder="مثال: 5000" class="form-input-modern text-sm en-num">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">نسبة الإنجاز الفعلي</label>
                                <div class="flex items-center gap-3 mt-1 bg-white/5 p-2 rounded-xl border border-white/5">
                                    <input type="range" id="proj-progress" min="0" max="100" class="custom-range flex-1">
                                    <span id="proj-progress-val" class="font-bold text-white en-num text-sm w-12 text-center">0%</span>
                                </div>
                            </div>
                        </div>

                        <!-- Project Milestones / Workflow -->
                        <div>
                            <div class="flex justify-between items-center mb-3">
                                <label class="block text-xs font-bold text-slate-300 mr-1">خطوات ومراحل العمل الإبداعية (المهام)</label>
                                <div class="flex gap-2">
                                    <button id="add-default-steps-btn" class="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-primary hover:bg-white/10 transition">المراحل الافتراضية</button>
                                    <button id="add-custom-step-btn" class="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-white hover:bg-white/10 transition flex items-center gap-0.5"><span class="material-symbols-rounded text-xs">add</span>إضافة خطوة</button>
                                </div>
                            </div>
                            <div id="proj-steps-container" class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                                <!-- Steps rows will be loaded dynamically -->
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">ملاحظات وروابط المشروع (روابط التسليم، مراجع التصميم)</label>
                            <textarea id="proj-notes" rows="3" placeholder="أضف ملاحظات أو روابط مجلد Drive..." class="form-input-modern text-sm resize-none"></textarea>
                        </div>
                    </div>

                    <div class="p-6 border-t border-white/5 bg-black/25 flex flex-wrap justify-between items-center gap-4">
                        <div class="flex gap-2 admin-only">
                            <button id="delete-proj-btn" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition flex items-center gap-1">
                                <span class="material-symbols-rounded text-sm">delete</span>
                                حذف المشروع
                            </button>
                            <button id="issue-invoice-direct-btn" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition flex items-center gap-1">
                                <span class="material-symbols-rounded text-sm">receipt</span>
                                إصدار فاتورة مباشرة
                            </button>
                        </div>
                        <div class="flex gap-3 mr-auto">
                            <button id="cancel-proj-btn" class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 transition border border-white/5">إلغاء</button>
                            <button id="save-proj-btn" class="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-blue-600 text-white transition flex items-center gap-1 shadow-glow-primary">
                                <span class="material-symbols-rounded text-sm">save</span>
                                حفظ التعديلات
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Client project details feedback rating modal -->
            <div id="ratingModal" class="modal fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm items-center justify-center p-4">
                <div class="glass-modal w-full max-w-md rounded-3xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden modal-content-anim">
                    <div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-yellow-400 to-amber-500"></div>
                    <div class="p-6 border-b border-white/5 flex justify-between items-center bg-black/25">
                        <h3 class="text-lg font-bold text-white flex items-center gap-2">
                            <span class="material-symbols-rounded text-amber-400">rate_review</span>
                            تقييم جودة المشروع الفني
                        </h3>
                        <button id="close-rating-modal-btn" class="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                    <div class="p-6 space-y-6 text-right">
                        <input type="hidden" id="rating-project-idx">
                        <input type="hidden" id="rating-stars-value" value="0">
                        
                        <div class="flex flex-col items-center gap-2">
                            <p class="text-xs text-slate-300 mb-2">أختر عدد النجوم لتقييم جودة الخدمة والتصاميم:</p>
                            <div class="flex gap-2 justify-center" id="modal-stars-container">
                                ${[1,2,3,4,5].map(num => `
                                    <span class="material-symbols-rounded text-3xl text-slate-600 cursor-pointer hover:text-amber-300 transition star-btn" data-modal-star="${num}">star_outline</span>
                                `).join('')}
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">شاركنا تعليقك أو ملاحظاتك الإبداعية</label>
                            <textarea id="rating-review-text" rows="3" placeholder="رأيك يساعدنا في تقديم الأفضل دائماً..." class="form-input-modern text-sm resize-none"></textarea>
                        </div>
                    </div>
                    <div class="p-6 border-t border-white/5 bg-black/25 flex justify-end gap-3">
                        <button id="cancel-rating-btn" class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 transition border border-white/5">تراجع</button>
                        <button id="submit-rating-btn" class="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1">
                            <span class="material-symbols-rounded text-sm">send</span>
                            إرسال التقييم
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind Controls
        this.bindEvents(containerId, data);
    },

    renderGridView: function(projects, role) {
        if (projects.length === 0) {
            return `
                <div class="glass-panel p-16 text-center text-muted rounded-2xl border border-white/5 shadow-inner">
                    <span class="material-symbols-rounded text-5xl text-slate-600 mb-3 block">folder_off</span>
                    <p class="text-base text-slate-400">لا توجد مشاريع مسجلة حالياً تطابق الفلاتر</p>
                </div>
            `;
        }

        return `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${projects.map(p => {
                    const prog = parseInt(p.progress) || 0;
                    let barColor = 'bg-primary';
                    let statusBg = 'bg-primary/10 text-primary border-primary/20';
                    let starsHTML = '';

                    if (p.status === 'مكتمل') {
                        barColor = 'bg-emerald-500';
                        statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                        
                        // Rating Preview
                        const currentRating = parseInt(p.rating) || 0;
                        if (currentRating > 0) {
                            starsHTML = `
                                <div class="flex items-center gap-0.5 mt-2 bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10 w-fit">
                                    <span class="text-[9px] text-amber-400 font-bold ml-1.5">التقييم:</span>
                                    <div class="flex">
                                        ${[1,2,3,4,5].map(i => `
                                            <span class="material-symbols-rounded text-[11px] ${i <= currentRating ? 'text-amber-400' : 'text-slate-700'}">star</span>
                                        `).join('')}
                                    </div>
                                </div>
                            `;
                        } else if (role === 'client') {
                            starsHTML = `
                                <button class="mt-2 text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-lg transition" data-action="rate-now" data-row="${p.rowIndex}">
                                    تقييم المشروع الفني
                                </button>
                            `;
                        }
                    } else if (p.status === 'معلق') {
                        barColor = 'bg-amber-500';
                        statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                    }

                    return `
                        <div class="glass-panel glass-panel-hover p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                            <div>
                                <div class="flex justify-between items-start gap-2 mb-3">
                                    <div>
                                        <h3 class="font-black text-white text-base leading-tight">${p.name}</h3>
                                        <span class="text-[10px] text-slate-400 block mt-1">${p.client}</span>
                                    </div>
                                    <span class="text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${statusBg} flex-shrink-0">${p.status || 'نشط'}</span>
                                </div>

                                <div class="flex flex-col gap-1.5 text-[10px] text-muted mb-4">
                                    <div class="flex items-center gap-1.5"><span class="material-symbols-rounded text-xs text-slate-400">calendar_today</span> البدء: <span class="en-num text-slate-300 font-medium">${p.startDate || '-'}</span></div>
                                    <div class="flex items-center gap-1.5"><span class="material-symbols-rounded text-xs text-slate-400">event</span> التسليم: <span class="en-num text-slate-300 font-medium">${p.deadline || '-'}</span></div>
                                    <div class="flex items-center gap-1.5"><span class="material-symbols-rounded text-xs text-slate-400">payments</span> القيمة: <span class="en-num text-slate-300 font-medium">${(parseFloat(p.value) || 0).toLocaleString('ar-SA')} ريال</span></div>
                                </div>
                                ${starsHTML}
                            </div>

                            <div class="mt-4 pt-4 border-t border-white/5">
                                <div class="flex justify-between text-xs mb-1.5">
                                    <span class="text-muted">مراحل العمل الفني</span>
                                    <span class="font-bold text-white en-num text-xs">${prog}%</span>
                                </div>
                                <div class="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                                    <div class="h-full ${barColor} transition-all duration-700" style="width: ${prog}%"></div>
                                </div>
                                
                                <div class="flex gap-2 mt-4">
                                    <button class="flex-1 text-[11px] font-bold bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg border border-white/5 transition flex items-center justify-center gap-1" data-action="open-detail" data-row="${p.rowIndex}">
                                        <span class="material-symbols-rounded text-xs">page_info</span>
                                        تتبع الخطوات
                                    </button>
                                    ${role === 'admin' ? `
                                        <button class="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-transparent hover:border-emerald-500/20 flex items-center justify-center transition" data-action="wa-share" data-row="${p.rowIndex}" title="مشاركة عبر الواتساب">
                                            <span class="material-symbols-rounded text-sm">share</span>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderCalendarView: function(projects) {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
        const firstDayIndex = new Date(this.currentYear, this.currentMonth, 1).getDay(); // 0 is Sunday, 6 is Saturday
        
        // Adjust for Arabic week start (Saturday as index 0, Sunday index 1)
        // Saturday: 6 in JS index, convert to 0
        // Sunday: 0 in JS index, convert to 1
        // Monday: 1 in JS index, convert to 2
        // Friday: 5 in JS index, convert to 6
        const adjustedFirstDay = (firstDayIndex + 1) % 7; 

        // Generate dates array
        const cells = [];
        // Pad previous month days
        for (let i = 0; i < adjustedFirstDay; i++) {
            cells.push({ pad: true });
        }
        // Fill active month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            // Find projects with this deadline
            const dayDeadlines = projects.filter(p => p.deadline === dateStr);
            cells.push({ day, dateStr, deadlines: dayDeadlines });
        }

        return `
            <div class="glass-panel p-6 rounded-3xl border border-white/5 select-none">
                <!-- Header Calendar Nav -->
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-base font-bold text-white flex items-center gap-1.5">
                        <span class="material-symbols-rounded text-primary">calendar_month</span>
                        <span class="en-num font-bold text-lg">${months[this.currentMonth]} ${this.currentYear}</span>
                    </h3>
                    <div class="flex gap-2">
                        <button id="prev-month-btn" class="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition"><span class="material-symbols-rounded text-lg">chevron_right</span></button>
                        <button id="next-month-btn" class="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition"><span class="material-symbols-rounded text-lg">chevron_left</span></button>
                    </div>
                </div>

                <!-- Calendar Weekdays -->
                <div class="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-2 border-b border-white/5 pb-2">
                    <div>السبت</div>
                    <div>الأحد</div>
                    <div>الاثنين</div>
                    <div>الثلاثاء</div>
                    <div>الأربعاء</div>
                    <div>الخميس</div>
                    <div>الجمعة</div>
                </div>

                <!-- Calendar Grid -->
                <div class="grid grid-cols-7 gap-2">
                    ${cells.map(cell => {
                        if (cell.pad) {
                            return `<div class="min-h-[85px] bg-transparent border border-transparent"></div>`;
                        }

                        let dotHTML = '';
                        if (cell.deadlines.length > 0) {
                            dotHTML = `
                                <div class="mt-2 space-y-1">
                                    ${cell.deadlines.slice(0, 2).map(p => {
                                        let dotColor = 'bg-primary';
                                        if (p.status === 'مكتمل') dotColor = 'bg-emerald-500';
                                        else if (p.status === 'معلق') dotColor = 'bg-amber-500';
                                        return `<div class="text-[9px] px-1.5 py-0.5 rounded-md ${dotColor}/20 text-white font-bold truncate leading-tight border border-${dotColor.split('-')[1]}/30 text-center block" title="${p.name}">${p.name}</div>`;
                                    }).join('')}
                                    ${cell.deadlines.length > 2 ? `<div class="text-[8px] text-slate-400 text-center font-bold en-num">+${cell.deadlines.length - 2} مشاريع</div>` : ''}
                                </div>
                            `;
                        }

                        return `
                            <div class="calendar-day min-h-[85px] p-2 rounded-xl flex flex-col justify-between" data-date="${cell.dateStr}">
                                <span class="text-xs font-bold text-slate-300 en-num mr-auto">${cell.day}</span>
                                ${dotHTML}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    bindEvents: function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const projects = data.projects || [];
        const role = localStorage.getItem('userType') || 'client';

        // Search Input
        const searchInput = document.getElementById('project-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.render(containerId, data);
            });
        }

        // Status Filter
        const statusFilter = document.getElementById('project-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.statusFilter = e.target.value;
                this.render(containerId, data);
            });
        }

        // View Mode buttons
        const gridBtn = document.getElementById('view-grid-btn');
        const calBtn = document.getElementById('view-calendar-btn');

        if (gridBtn) {
            gridBtn.addEventListener('click', () => {
                this.viewMode = 'grid';
                this.render(containerId, data);
            });
        }
        if (calBtn) {
            calBtn.addEventListener('click', () => {
                this.viewMode = 'calendar';
                this.render(containerId, data);
            });
        }

        // Calendar Prev/Next Months
        const prevMonth = document.getElementById('prev-month-btn');
        const nextMonth = document.getElementById('next-month-btn');
        if (prevMonth) {
            prevMonth.addEventListener('click', () => {
                this.currentMonth--;
                if (this.currentMonth < 0) {
                    this.currentMonth = 11;
                    this.currentYear--;
                }
                this.render(containerId, data);
            });
        }
        if (nextMonth) {
            nextMonth.addEventListener('click', () => {
                this.currentMonth++;
                if (this.currentMonth > 11) {
                    this.currentMonth = 0;
                    this.currentYear++;
                }
                this.render(containerId, data);
            });
        }

        // Add Project Modal Binding
        const addBtn = document.getElementById('add-project-btn');
        const modal = document.getElementById('projectModal');
        const closeBtn = document.getElementById('close-project-modal-btn');
        const cancelBtn = document.getElementById('cancel-project-btn');
        const saveBtn = document.getElementById('save-proj-btn');
        const deleteBtn = document.getElementById('delete-proj-btn');
        const issueInvoiceBtn = document.getElementById('issue-invoice-direct-btn');

        const openModal = () => {
            if (modal) modal.classList.add('open');
        };

        const closeModal = () => {
            if (modal) modal.classList.remove('open');
        };

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                document.getElementById('proj-row-index').value = '';
                document.getElementById('proj-name').value = '';
                document.getElementById('proj-client').value = '';
                document.getElementById('proj-start-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('proj-deadline').value = '';
                document.getElementById('proj-status').value = 'تحت التخطيط';
                document.getElementById('proj-value').value = '0';
                document.getElementById('proj-progress').value = '0';
                document.getElementById('proj-progress-val').textContent = '0%';
                document.getElementById('proj-notes').value = '';
                document.getElementById('proj-steps-container').innerHTML = '';
                document.getElementById('project-modal-title').textContent = 'إنشاء مشروع جديد';
                
                if (deleteBtn) deleteBtn.classList.add('hidden');
                if (issueInvoiceBtn) issueInvoiceBtn.classList.remove('hidden');
                openModal();
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // Grid/Calendar Item Click Event Delegation
        container.querySelectorAll('[data-action]').forEach(btn => {
            const action = btn.getAttribute('data-action');
            const rowIdx = btn.getAttribute('data-row');
            const p = projects.find(x => x.rowIndex === rowIdx);

            if (action === 'open-detail' && p) {
                btn.addEventListener('click', () => {
                    document.getElementById('proj-row-index').value = rowIdx;
                    document.getElementById('proj-name').value = p.name || '';
                    document.getElementById('proj-client').value = p.client || '';
                    document.getElementById('proj-start-date').value = p.startDate || '';
                    document.getElementById('proj-deadline').value = p.deadline || '';
                    document.getElementById('proj-status').value = p.status || 'قيد التنفيذ';
                    document.getElementById('proj-value').value = p.value || 0;
                    document.getElementById('proj-progress').value = p.progress || 0;
                    document.getElementById('proj-progress-val').textContent = (p.progress || 0) + '%';
                    document.getElementById('proj-notes').value = p.notes || '';
                    
                    if (deleteBtn) deleteBtn.classList.remove('hidden');
                    if (issueInvoiceBtn) issueInvoiceBtn.classList.add('hidden'); // Only new projects

                    // Load steps
                    const stepsContainer = document.getElementById('proj-steps-container');
                    stepsContainer.innerHTML = '';
                    
                    const steps = p.steps || [];
                    if (steps.length === 0) {
                        // Empty steps
                    } else {
                        steps.forEach(step => {
                            this.addStepRow(step.text, step.done);
                        });
                    }

                    document.getElementById('project-modal-title').textContent = 'تفاصيل وإدارة المشروع';
                    openModal();
                });
            } else if (action === 'wa-share' && p) {
                btn.addEventListener('click', () => {
                    this.shareWhatsApp(p);
                });
            } else if (action === 'rate-now' && p) {
                btn.addEventListener('click', () => {
                    this.openRatingModal(rowIdx);
                });
            }
        });

        // Add default/custom steps listeners inside Modal
        const defaultStepsBtn = document.getElementById('add-default-steps-btn');
        const customStepBtn = document.getElementById('add-custom-step-btn');
        const progressSlider = document.getElementById('proj-progress');
        const progressSliderVal = document.getElementById('proj-progress-val');

        if (defaultStepsBtn) {
            defaultStepsBtn.addEventListener('click', () => {
                document.getElementById('proj-steps-container').innerHTML = '';
                this.addStepRow("جمع البيانات والاتفاق", false);
                this.addStepRow("التصاميم الأولية والمسودات", false);
                this.addStepRow("المراجعة والتعديل", false);
                this.addStepRow("التسليم والاعتماد النهائي", false);
                this.updateProjectProgressFromSteps();
            });
        }

        if (customStepBtn) {
            customStepBtn.addEventListener('click', () => {
                this.addStepRow("", false);
            });
        }

        if (progressSlider) {
            progressSlider.addEventListener('input', (e) => {
                progressSliderVal.textContent = e.target.value + '%';
            });
        }

        // Save project implementation
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                const rowIdx = document.getElementById('proj-row-index').value;
                const name = document.getElementById('proj-name').value.trim();
                const client = document.getElementById('proj-client').value;
                const value = parseFloat(document.getElementById('proj-value').value) || 0;
                const progress = parseInt(document.getElementById('proj-progress').value) || 0;
                const deadline = document.getElementById('proj-deadline').value;
                const startDate = document.getElementById('proj-start-date').value;
                const status = document.getElementById('proj-status').value;
                const notes = document.getElementById('proj-notes').value;

                if (!name || !client) {
                    alert('يرجى ملء الحقول المطلوبة (اسم المشروع والعميل)');
                    return;
                }

                // Collect steps
                const steps = [];
                document.querySelectorAll('.step-item').forEach(item => {
                    const text = item.querySelector('input[type="text"]').value.trim();
                    const done = item.querySelector('input[type="checkbox"]').checked;
                    if (text) steps.push({ text: text, done: done });
                });

                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="material-symbols-rounded animate-spin">sync</span> جاري الحفظ...';

                const dataToSave = {
                    rowIndex: rowIdx,
                    name: name,
                    client: client,
                    value: value,
                    progress: progress,
                    deadline: deadline,
                    startDate: startDate,
                    status: status,
                    steps: steps,
                    notes: notes
                };

                window.google.script.run.withSuccessHandler((msg) => {
                    alert(msg);
                    closeModal();
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<span class="material-symbols-rounded">save</span> حفظ التعديلات';
                    if (window.loadAllData) window.loadAllData();
                }).saveProjectToSheet(dataToSave);
            });
        }

        // Delete project logic
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const rowIdx = document.getElementById('proj-row-index').value;
                if (!rowIdx) return;

                if (confirm('هل أنت متأكد من حذف هذا المشروع نهائياً؟')) {
                    deleteBtn.disabled = true;
                    deleteBtn.innerHTML = 'جاري الحذف...';

                    window.google.script.run.withSuccessHandler((msg) => {
                        alert(msg);
                        closeModal();
                        if (window.loadAllData) window.loadAllData();
                    }).deleteProjectFromSheet(rowIdx);
                }
            });
        }

        // Issue Invoice Direct logic
        if (issueInvoiceBtn) {
            issueInvoiceBtn.addEventListener('click', () => {
                const name = document.getElementById('proj-name').value.trim();
                const client = document.getElementById('proj-client').value;
                const value = parseFloat(document.getElementById('proj-value').value) || 0;
                const notes = document.getElementById('proj-notes').value;

                if (!name || !client) {
                    alert('الرجاء التأكد من ملء اسم المشروع والعميل');
                    return;
                }

                issueInvoiceBtn.disabled = true;
                issueInvoiceBtn.innerHTML = 'جاري الإصدار...';

                const items = [{ desc: "دفعة مشروع: " + name, qty: 1, price: value }];
                const today = new Date().toISOString().split('T')[0];

                const invoiceData = {
                    invoiceNumber: "تلقائي",
                    clientSelect: client,
                    issueDate: today,
                    status: "قيد الانتظار",
                    totalAmount: value,
                    items: items,
                    notes: notes,
                    footerText: window.DEFAULT_BANK_INFO || "رقم الحساب البنكي / IBAN..."
                };

                window.google.script.run.withSuccessHandler((res) => {
                    alert("تم إصدار الفاتورة المباشرة بنجاح!");
                    closeModal();
                    issueInvoiceBtn.disabled = false;
                    issueInvoiceBtn.innerHTML = '<span class="material-symbols-rounded text-sm">receipt</span> إصدار فاتورة مباشرة';
                    if (window.loadAllData) window.loadAllData();
                    
                    // Open Invoice direct print layout
                    const savedInv = {
                        number: res.id,
                        client: client,
                        date: today,
                        amount: value,
                        items: items,
                        notes: notes,
                        footerText: invoiceData.footerText,
                        status: "قيد الانتظار"
                    };
                    if (window.printInvoiceDirectly) window.printInvoiceDirectly(savedInv);
                }).saveInvoiceToSheet(invoiceData);
            });
        }

        // Calendar Day Click Event
        container.querySelectorAll('.calendar-day').forEach(cell => {
            cell.addEventListener('click', () => {
                const dateStr = cell.getAttribute('data-date');
                const dayDeadlines = projects.filter(p => p.deadline === dateStr);
                if (dayDeadlines.length === 0) return;

                alert(`مشاريع تنتهي في تاريخ ${dateStr}:\n` + dayDeadlines.map(p => `- ${p.name} (${p.client})`).join('\n'));
            });
        });

        // Rating Modal Events
        const ratingModal = document.getElementById('ratingModal');
        const closeRatingBtn = document.getElementById('close-rating-modal-btn');
        const cancelRatingBtn = document.getElementById('cancel-rating-btn');
        const submitRatingBtn = document.getElementById('submit-rating-btn');

        if (closeRatingBtn) closeRatingBtn.addEventListener('click', () => ratingModal.classList.remove('open'));
        if (cancelRatingBtn) cancelRatingBtn.addEventListener('click', () => ratingModal.classList.remove('open'));

        // Rating stars click handlers inside Rating Modal
        ratingModal.querySelectorAll('[data-modal-star]').forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.getAttribute('data-modal-star'));
                document.getElementById('rating-stars-value').value = val;
                
                // Highlight stars
                ratingModal.querySelectorAll('[data-modal-star]').forEach(s => {
                    const sVal = parseInt(s.getAttribute('data-modal-star'));
                    if (sVal <= val) {
                        s.textContent = 'star';
                        s.classList.add('text-amber-400');
                        s.classList.remove('text-slate-600');
                    } else {
                        s.textContent = 'star_outline';
                        s.classList.add('text-slate-600');
                        s.classList.remove('text-amber-400');
                    }
                });
            });
        });

        // Rating Submit Logic
        if (submitRatingBtn) {
            submitRatingBtn.addEventListener('click', () => {
                const rowIdx = document.getElementById('rating-project-idx').value;
                const rating = parseInt(document.getElementById('rating-stars-value').value);
                const review = document.getElementById('rating-review-text').value.trim();

                if (rating === 0) {
                    alert('يرجى اختيار عدد النجوم للتقييم');
                    return;
                }

                submitRatingBtn.disabled = true;
                submitRatingBtn.innerHTML = 'جاري الإرسال...';

                window.google.script.run.withSuccessHandler((msg) => {
                    alert(msg);
                    ratingModal.classList.remove('open');
                    submitRatingBtn.disabled = false;
                    submitRatingBtn.innerHTML = '<span class="material-symbols-rounded text-sm">send</span> إرسال التقييم';
                    if (window.loadAllData) window.loadAllData();
                }).saveProjectRating(rowIdx, rating, review);
            });
        }
    },

    addStepRow: function(text = "", done = false) {
        const container = document.getElementById('proj-steps-container');
        if (!container) return;

        const div = document.createElement('div');
        div.className = "step-item flex items-center gap-3 mb-2 group bg-white/5 p-3 rounded-xl border border-white/5 hover:border-primary/30 transition-colors";
        div.innerHTML = `
            <input type="checkbox" class="w-5 h-5 rounded border-gray-600 bg-transparent text-primary focus:ring-0 focus:ring-offset-0 milestone-checkbox" ${done ? 'checked' : ''}>
            <input type="text" class="bg-transparent border-none text-white text-sm focus:ring-0 w-full placeholder-gray-600 font-medium" placeholder="اكتب المهمة هنا..." value="${text}">
            <button class="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400/20 p-1 rounded-lg" title="حذف المهمة"><span class="material-symbols-rounded text-xs">close</span></button>
        `;

        // Bind delete
        div.querySelector('button').addEventListener('click', () => {
            div.remove();
            this.updateProjectProgressFromSteps();
        });

        // Bind checkbox
        div.querySelector('input[type="checkbox"]').addEventListener('change', () => {
            this.updateProjectProgressFromSteps();
        });

        container.appendChild(div);
    },

    updateProjectProgressFromSteps: function() {
        const steps = document.querySelectorAll('.step-item');
        if (steps.length === 0) return;

        let doneCount = 0;
        steps.forEach(s => {
            if (s.querySelector('input[type="checkbox"]').checked) {
                doneCount++;
            }
        });

        const percent = Math.round((doneCount / steps.length) * 100);
        const slider = document.getElementById('proj-progress');
        const displayVal = document.getElementById('proj-progress-val');
        if (slider) {
            slider.value = percent;
            displayVal.textContent = percent + '%';
        }
    },

    shareWhatsApp: function(p) {
        const prog = p.progress || 0;
        const msg = `مرحباً أ. *${p.client}*، يسعدنا في استوديو *رنان الإبداعي* إطلاعك على سير العمل في مشروعك المميز *${p.name}*.\n\nلقد تم إنجاز *${prog}%* من مراحل العمل للمشروع حتى الآن، ونحن نعمل حالياً على الخطوات التالية لضمان الجودة المثالية.\n\nيمكنك تسجيل الدخول لمتابعة التفاصيل مباشرة عبر بوابتك الخاصة في النظام. شكراً لثقتك بنا! ✨`;
        
        const rawPhone = (p.clientPhone || '').replace(/\s+/g, '');
        const waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        window.open(waLink, '_blank');
    },

    openRatingModal: function(rowIdx) {
        const modal = document.getElementById('ratingModal');
        if (!modal) return;

        document.getElementById('rating-project-idx').value = rowIdx;
        document.getElementById('rating-stars-value').value = 0;
        document.getElementById('rating-review-text').value = '';
        
        // Reset stars
        modal.querySelectorAll('[data-modal-star]').forEach(s => {
            s.textContent = 'star_outline';
            s.classList.add('text-slate-600');
            s.classList.remove('text-amber-400');
        });

        modal.classList.add('open');
    }
};
