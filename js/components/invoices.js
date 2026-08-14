/**
 * Invoices Component - Invoice Builder & Print Previews
 */

export const InvoicesComponent = {
    searchQuery: '',
    statusFilter: 'all',
    DEFAULT_BANK_INFO: `عبدالعزيز خميس أحمد النهدي\nرقم الحساب: 077040010006087202999\nرقم الآيبان (IBAN): SA38 8000 0859 6080 1720 2999`,

    render: function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const invoices = data.invoices || [];
        const clients = data.clients || [];
        const role = localStorage.getItem('userType') || 'client';

        // Apply filters
        const filteredInvoices = invoices.filter(i => {
            const matchesSearch = (i.client || '').toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                                  (i.number || '').toLowerCase().includes(this.searchQuery.toLowerCase());
            
            const matchesStatus = this.statusFilter === 'all' || 
                                  (this.statusFilter === 'paid' && i.status === 'مدفوعة') ||
                                  (this.statusFilter === 'pending' && i.status !== 'مدفوعة');

            return matchesSearch && matchesStatus;
        });

        // Stats Calcs
        const totalBilled = invoices.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        const totalPaid = invoices.filter(i => i.status === 'مدفوعة').reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        const totalPending = invoices.filter(i => i.status !== 'مدفوعة').reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        const unpaidCount = invoices.filter(i => i.status !== 'مدفوعة').length;

        container.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h1 class="text-3xl font-black text-white">إدارة الفواتير والعمليات المالية</h1>
                        <p class="text-sm text-muted mt-1">إنشاء الفواتير للعملاء، متابعة التحصيلات، وإصدار عروض الأسعار</p>
                    </div>
                    ${role === 'admin' ? `
                        <button id="add-invoice-btn" class="btn-glow bg-gradient-to-r from-primary to-secondary text-white py-3 px-6 rounded-xl font-bold flex items-center gap-2 text-sm">
                            <span class="material-symbols-rounded text-lg">receipt_long</span>
                            إصدار فاتورة جديدة
                        </button>
                    ` : ''}
                </div>

                <!-- Stats Cards -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block font-semibold">إجمالي المبالغ المفوترة</span>
                        <span class="text-xl font-black text-white mt-1 en-num block">${totalBilled.toLocaleString('ar-SA')} <span class="text-xs font-normal">ريال</span></span>
                    </div>
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block font-semibold">المدفوعات المحصلة</span>
                        <span class="text-xl font-black text-emerald-400 mt-1 en-num block">${totalPaid.toLocaleString('ar-SA')} <span class="text-xs font-normal">ريال</span></span>
                    </div>
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block font-semibold">مبالغ قيد الانتظار</span>
                        <span class="text-xl font-black text-amber-500 mt-1 en-num block">${totalPending.toLocaleString('ar-SA')} <span class="text-xs font-normal">ريال</span></span>
                    </div>
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block font-semibold">الفواتير غير المسددة</span>
                        <span class="text-xl font-black text-red-400 mt-1 en-num block">${unpaidCount} <span class="text-xs font-normal">فاتورة</span></span>
                    </div>
                </div>

                <!-- Toolbar Search & Filter -->
                <div class="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                    <div class="relative flex-1">
                        <span class="material-symbols-rounded absolute right-3.5 top-3.5 text-muted text-lg">search</span>
                        <input type="text" id="invoice-search-input" placeholder="البحث برقم الفاتورة أو العميل..." 
                            value="${this.searchQuery}"
                            class="form-input-modern pr-11 text-sm">
                    </div>
                    <!-- Status Filter Tabs -->
                    <div class="flex bg-black/40 rounded-xl p-1 border border-white/5 self-start">
                        <button data-inv-filter="all" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${this.statusFilter === 'all' ? 'bg-primary text-white shadow-glow-primary' : 'text-muted hover:text-white'}">الكل</button>
                        <button data-inv-filter="paid" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${this.statusFilter === 'paid' ? 'bg-primary text-white shadow-glow-primary' : 'text-muted hover:text-white'}">مدفوعة</button>
                        <button data-inv-filter="pending" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${this.statusFilter === 'pending' ? 'bg-primary text-white shadow-glow-primary' : 'text-muted hover:text-white'}">قيد الانتظار</button>
                    </div>
                </div>

                <!-- Invoices Table -->
                <div class="glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                    <div class="overflow-x-auto">
                        <table class="w-full text-right text-sm">
                            <thead class="bg-white/5 border-b border-white/5 text-slate-300 font-bold text-xs">
                                <tr>
                                    <th class="px-6 py-4">رقم الفاتورة</th>
                                    <th class="px-6 py-4">العميل</th>
                                    <th class="px-6 py-4">التاريخ</th>
                                    <th class="px-6 py-4">الإجمالي</th>
                                    <th class="px-6 py-4 text-center">الحالة</th>
                                    <th class="px-6 py-4 text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                ${filteredInvoices.length === 0 ? `
                                    <tr>
                                        <td colspan="6" class="text-center py-16 text-muted">
                                            <span class="material-symbols-rounded text-4xl block mb-2">receipt</span>
                                            لا توجد فواتير مطابقة
                                        </td>
                                    </tr>
                                ` : filteredInvoices.map(i => {
                                    const statusClass = i.status === 'مدفوعة' ? 'status-paid' : 'status-pending';
                                    const statusText = i.status || 'قيد الانتظار';

                                    return `
                                        <tr class="transition-all hover:bg-white/5">
                                            <td class="px-6 py-4 font-bold text-primary en-num">#${i.number}</td>
                                            <td class="px-6 py-4 text-white font-semibold">${i.client}</td>
                                            <td class="px-6 py-4 text-muted en-num text-xs">${i.date || '-'}</td>
                                            <td class="px-6 py-4 font-bold text-white en-num">${(parseFloat(i.amount) || 0).toLocaleString('ar-SA')} <span class="text-[10px] font-normal text-muted">ريال</span></td>
                                            <td class="px-6 py-4 text-center">
                                                <span class="status-pill ${statusClass}">${statusText}</span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="flex items-center justify-center gap-2">
                                                    <button class="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition" data-action="print" data-row="${i.number}" title="طباعة الفاتورة">
                                                        <span class="material-symbols-rounded text-lg">print</span>
                                                    </button>
                                                    ${role === 'admin' ? `
                                                        <button class="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition" data-action="edit-inv" data-row="${i.number}" title="تعديل الفاتورة">
                                                            <span class="material-symbols-rounded text-lg">edit</span>
                                                        </button>
                                                        <button class="w-8 h-8 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 flex items-center justify-center transition" data-action="delete-inv" data-row="${i.number}" title="حذف الفاتورة">
                                                            <span class="material-symbols-rounded text-lg">delete</span>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Invoice Modal Form -->
            <div id="invoiceModal" class="modal fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm items-center justify-center p-4">
                <div class="glass-modal w-full max-w-3xl rounded-3xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden modal-content-anim max-h-[90vh]">
                    <div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
                    
                    <div class="p-6 border-b border-white/5 flex justify-between items-center bg-black/25">
                        <h3 id="invoice-modal-title" class="text-lg font-bold text-white">إصدار فاتورة ضريبية جديدة</h3>
                        <button id="close-invoice-modal-btn" class="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    <div class="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar text-right">
                        <input type="hidden" id="inv-id">
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">رقم الفاتورة</label>
                                <input type="text" id="inv-number" value="تلقائي" readonly class="form-input-modern text-sm text-center en-num bg-white/5 opacity-70">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">العميل *</label>
                                <select id="inv-client" class="form-input-modern text-sm">
                                    <option value="">اختر عميل...</option>
                                    ${clients.map(c => `<option value="${c.name}">${c.name} (${c.company || 'فردي'})</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">تاريخ الإصدار *</label>
                                <input type="date" id="inv-date" class="form-input-modern text-xs text-center en-num">
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">حالة السداد</label>
                                <select id="inv-status" class="form-input-modern text-sm">
                                    <option value="قيد الانتظار">قيد الانتظار</option>
                                    <option value="مدفوعة">مدفوعة</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">نوع الوثيقة</label>
                                <div class="flex bg-black/40 rounded-xl p-1 border border-white/5">
                                    <button id="doc-invoice-btn" class="flex-1 py-1.5 rounded-lg text-xs font-bold bg-primary text-white">فاتورة ضريبية</button>
                                    <button id="doc-quotation-btn" class="flex-1 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-white">عرض سعر</button>
                                </div>
                            </div>
                        </div>

                        <!-- Item row builder -->
                        <div>
                            <div class="flex justify-between items-center mb-3">
                                <label class="block text-xs font-bold text-slate-300 mr-1">البنود والخدمات المطلوبة</label>
                                <button id="add-invoice-item-btn" class="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-white hover:bg-white/10 transition flex items-center gap-0.5"><span class="material-symbols-rounded text-xs">add</span>إضافة بند جديد</button>
                            </div>
                            <div id="inv-items-container" class="space-y-3">
                                <!-- Dynamic rows -->
                            </div>
                        </div>

                        <!-- Pricing Summary -->
                        <div class="glass-panel p-4 rounded-xl border border-white/5 space-y-2 max-w-sm mr-auto text-xs">
                            <div class="flex justify-between text-slate-400">
                                <span>الإجمالي الفرعي:</span>
                                <span class="en-num font-bold text-white"><span id="inv-subtotal">0</span> ريال</span>
                            </div>
                            <div class="flex justify-between text-slate-400 items-center">
                                <span>خصم خاص (ريال):</span>
                                <input type="number" id="inv-discount" value="0" min="0" class="w-20 bg-black/40 border border-white/5 text-center text-white py-1 rounded en-num">
                            </div>
                            <div class="flex justify-between text-slate-400 items-center">
                                <span>ضريبة القيمة المضافة (15%):</span>
                                <div class="flex items-center gap-1.5">
                                    <input type="checkbox" id="inv-tax-toggle" checked class="w-4 h-4 text-primary bg-transparent border-gray-600 rounded">
                                    <span class="en-num font-bold text-white"><span id="inv-tax-amount">0</span> ريال</span>
                                </div>
                            </div>
                            <div class="h-[1px] bg-white/5 my-2"></div>
                            <div class="flex justify-between text-sm font-bold text-white">
                                <span>المبلغ الإجمالي المستحق:</span>
                                <span class="en-num text-primary"><span id="inv-grandtotal">0</span> ريال</span>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">شروط الدفع وبيانات الحساب البنكي</label>
                            <textarea id="inv-footer" rows="2" class="form-input-modern text-xs resize-none"></textarea>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-400 mb-2 mr-1">ملاحظات داخلية (لا تظهر في الفاتورة المطبوعة)</label>
                            <textarea id="inv-notes" rows="2" placeholder="أضف ملاحظات أو تفاصيل للتسجيل الإداري..." class="form-input-modern text-xs resize-none"></textarea>
                        </div>
                    </div>

                    <div class="p-6 border-t border-white/5 bg-black/25 flex justify-end gap-3">
                        <button id="cancel-invoice-btn" class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 transition border border-white/5">إلغاء</button>
                        <button id="save-invoice-btn" class="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-blue-600 text-white transition flex items-center gap-1 shadow-glow-primary">
                            <span class="material-symbols-rounded text-sm">print</span>
                            حفظ واستعراض الفاتورة
                        </button>
                    </div>
                </div>
            </div>

            <!-- Main Print Preview Modal -->
            <div id="mainModal" class="modal fixed inset-0 z-[90] bg-black/95 items-center justify-center p-4 overflow-y-auto">
                <div class="w-full max-w-[210mm] relative flex flex-col my-8">
                    <!-- Close button in preview -->
                    <div class="absolute -top-12 left-0 right-0 flex justify-between items-center no-print">
                        <span class="text-sm font-bold text-white">معاينة المستند الفني الفاخر</span>
                        <div class="flex gap-2">
                            <button id="print-doc-btn" class="px-4 py-1.5 rounded-lg bg-primary hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1 transition shadow-glow-primary"><span class="material-symbols-rounded text-sm">print</span>طباعة المستند</button>
                            <button id="close-print-preview-btn" class="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 transition border border-white/10"><span class="material-symbols-rounded text-sm">close</span>إغلاق</button>
                        </div>
                    </div>

                    <!-- Invoice stationery mockup inside A4 template -->
                    <div id="invoice-preview-template" class="p-[15mm] flex flex-col justify-between text-right relative overflow-hidden select-text leading-relaxed">
                        <!-- Red/Blue decorative stripes -->
                        <div class="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-primary via-secondary to-accent"></div>
                        
                        <!-- Stamp watermarked -->
                        <div id="quotation-stamp" class="quotation-stamp">عرض سعر</div>

                        <!-- Top Header info -->
                        <div>
                            <div class="flex justify-between items-start mb-10">
                                <div>
                                    <h1 id="preview-doc-title" class="text-3xl font-black text-slate-800 tracking-tight">فاتورة ضريبية مبسطة</h1>
                                    <p class="text-slate-500 mt-1 text-xs">رقم الفاتورة: <span class="en-num font-bold text-slate-900" id="prev-number">#INV-2026-X</span></p>
                                    <p class="text-slate-500 text-xs">تاريخ الإصدار: <span class="en-num text-slate-900" id="prev-date">2026-05-21</span></p>
                                </div>
                                <div class="text-left flex flex-col items-end">
                                    <div class="w-16 h-16 rounded-xl bg-slate-900 flex items-center justify-center p-2 mb-2">
                                        <img src="https://ia902801.us.archive.org/4/items/1-22_20260517/%D8%B4%D8%B9%D8%A7%D8%B1%5B1%5D332-0%D9%A4.png" class="max-w-full max-h-full object-contain brightness-0 invert" alt="رنان">
                                    </div>
                                    <h4 class="font-extrabold text-slate-800 text-sm">رنان للإستشارات الإبداعية</h4>
                                    <p class="text-slate-500 text-[10px] mt-0.5 leading-snug">صناعة وتصميم الهويات البصرية والمشاريع الإبداعية</p>
                                    <p class="text-slate-500 text-[9px] en-num">rannan.design | info@rannan.design</p>
                                </div>
                            </div>

                            <hr class="border-slate-100 mb-8">

                            <!-- Client info -->
                            <div class="grid grid-cols-2 gap-6 mb-8 text-xs">
                                <div>
                                    <p class="text-slate-400 font-bold mb-1.5">مفوتر إلى العميل:</p>
                                    <h4 class="font-extrabold text-slate-800 text-sm" id="prev-client-name">أ. أحمد عبد الله</h4>
                                    <p class="text-slate-500 mt-1" id="prev-client-company">شركة رنان للتجارة</p>
                                </div>
                                <div class="text-left">
                                    <p class="text-slate-400 font-bold mb-1.5">طريقة الدفع والتفاصيل:</p>
                                    <p class="text-slate-700">تحويل بنكي مباشر للآيبان المرفق أدناه</p>
                                    <p class="text-slate-500 mt-1">حالة السداد: <span class="font-bold text-slate-800" id="prev-status">مدفوعة</span></p>
                                </div>
                            </div>

                            <!-- Document Items Table -->
                            <table class="w-full text-right text-xs print-table border-collapse mb-10">
                                <thead>
                                    <tr class="border-b-2 border-slate-200 bg-slate-50">
                                        <th class="px-4 py-3 font-extrabold text-slate-700">البند / الخدمة الإبداعية</th>
                                        <th class="px-4 py-3 text-center font-extrabold text-slate-700 w-16">الكمية</th>
                                        <th class="px-4 py-3 text-left font-extrabold text-slate-700 w-24">سعر الوحدة</th>
                                        <th class="px-4 py-3 text-left font-extrabold text-slate-700 w-28">الإجمالي الفرعي</th>
                                    </tr>
                                </thead>
                                <tbody id="prev-items-body">
                                    <!-- Items rows injected dynamically -->
                                </tbody>
                            </table>
                        </div>

                        <!-- Summary and Bank coords -->
                        <div class="mt-auto">
                            <div class="flex flex-col md:flex-row justify-between items-end gap-6 border-t border-slate-100 pt-6">
                                <!-- Bank details -->
                                <div class="text-slate-500 text-[10px] space-y-1 max-w-sm">
                                    <p class="font-bold text-slate-800 text-xs">معلومات التحويل المصرفي:</p>
                                    <p class="whitespace-pre-line leading-relaxed" id="prev-footer-details">
                                        ABDULLAH SALEM ABDULLAH BESHER
                                        مصرف الراجحي (IBAN): SA1030100991102121331820
                                    </p>
                                </div>

                                <!-- Financial totals -->
                                <div class="w-64 space-y-2 text-xs">
                                    <div class="flex justify-between text-slate-500">
                                        <span>الإجمالي الفرعي:</span>
                                        <span class="en-num font-bold text-slate-800"><span id="prev-subtotal">0</span> ر.س</span>
                                    </div>
                                    <div class="flex justify-between text-slate-500" id="prev-discount-row">
                                        <span>الخصم الممنوح:</span>
                                        <span class="en-num font-bold text-red-600">-<span id="prev-discount">0</span> ر.س</span>
                                    </div>
                                    <div class="flex justify-between text-slate-500" id="prev-tax-row">
                                        <span>ضريبة القيمة المضافة (15%):</span>
                                        <span class="en-num font-bold text-slate-800"><span id="prev-tax">0</span> ر.س</span>
                                    </div>
                                    <div class="border-t border-slate-200 my-1 pt-1 flex justify-between font-black text-sm text-slate-900">
                                        <span>الإجمالي النهائي المستحق:</span>
                                        <span class="en-num text-primary"><span id="prev-grandtotal">0</span> ريال</span>
                                    </div>
                                </div>
                            </div>

                            <hr class="border-slate-100 my-8">

                            <div class="text-center text-slate-400 text-[9px] leading-relaxed">
                                <p>هذه الوثيقة صادرة إلكترونياً عن استوديو رنان الإبداعي. شكراً لثقتكم بنا واختياركم لنا لتصميم أعمالكم الفنية.</p>
                                <p class="en-num mt-1">rannan.design | 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents(containerId, data);
    },

    bindEvents: function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const invoices = data.invoices || [];
        const role = localStorage.getItem('userType') || 'client';

        // Search Input Filter
        const searchInput = document.getElementById('invoice-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.render(containerId, data);
            });
        }

        // Status Tabs Filter
        container.querySelectorAll('button[data-inv-filter]').forEach(tab => {
            tab.addEventListener('click', () => {
                this.statusFilter = tab.getAttribute('data-inv-filter');
                this.render(containerId, data);
            });
        });

        // Add Invoice modal toggle
        const addBtn = document.getElementById('add-invoice-btn');
        const modal = document.getElementById('invoiceModal');
        const closeBtn = document.getElementById('close-invoice-modal-btn');
        const cancelBtn = document.getElementById('cancel-invoice-btn');
        const saveBtn = document.getElementById('save-invoice-btn');

        const openModal = () => {
            if (modal) modal.classList.add('open');
        };

        const closeModal = () => {
            if (modal) modal.classList.remove('open');
        };

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                document.getElementById('inv-id').value = '';
                document.getElementById('inv-number').value = 'تلقائي';
                document.getElementById('inv-client').value = '';
                document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
                document.getElementById('inv-status').value = 'قيد الانتظار';
                document.getElementById('inv-discount').value = '0';
                document.getElementById('inv-tax-toggle').checked = true;
                document.getElementById('inv-footer').value = (window.appData && window.appData.settings && window.appData.settings.invoice_footer) || this.DEFAULT_BANK_INFO;
                document.getElementById('inv-notes').value = '';
                document.getElementById('inv-items-container').innerHTML = '';
                document.getElementById('invoice-modal-title').textContent = 'إصدار فاتورة ضريبية جديدة';
                
                // Add initial empty item row
                this.addItemRow("", 1, 0);

                // Reset doc mode classes
                document.getElementById('doc-invoice-btn').className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-primary text-white';
                document.getElementById('doc-quotation-btn').className = 'flex-1 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-white';
                
                this.calculateInvoiceTotals();
                openModal();
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // Document layout switch (Invoice vs Quotation) inside modal
        const docInvBtn = document.getElementById('doc-invoice-btn');
        const docQuotBtn = document.getElementById('doc-quotation-btn');

        if (docInvBtn && docQuotBtn) {
            docInvBtn.addEventListener('click', () => {
                docInvBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-primary text-white';
                docQuotBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-white';
                document.getElementById('invoice-modal-title').textContent = 'إصدار فاتورة ضريبية جديدة';
            });
            docQuotBtn.addEventListener('click', () => {
                docQuotBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-primary text-white';
                docInvBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-white';
                document.getElementById('invoice-modal-title').textContent = 'إصدار عرض سعر فني';
            });
        }

        // Add Binds for Row calculations
        const discountInput = document.getElementById('inv-discount');
        const taxToggle = document.getElementById('inv-tax-toggle');
        const addRowBtn = document.getElementById('add-invoice-item-btn');

        if (discountInput) discountInput.addEventListener('input', () => this.calculateInvoiceTotals());
        if (taxToggle) taxToggle.addEventListener('change', () => this.calculateInvoiceTotals());
        if (addRowBtn) addRowBtn.addEventListener('click', () => this.addItemRow("", 1, 0));

        // Save Invoice listener
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const invId = document.getElementById('inv-id').value;
                const number = document.getElementById('inv-number').value;
                const client = document.getElementById('inv-client').value;
                const date = document.getElementById('inv-date').value;
                const status = document.getElementById('inv-status').value;
                const notes = document.getElementById('inv-notes').value;
                const footer = document.getElementById('inv-footer').value;

                if (!client || !date) {
                    alert('يرجى اختيار العميل وتاريخ الفاتورة');
                    return;
                }

                // Check doc type (invoice vs quotation)
                const isQuotation = docQuotBtn.classList.contains('bg-primary');

                // Collect items
                const items = [];
                const rows = document.querySelectorAll('.inv-item-row');
                rows.forEach(r => {
                    const desc = r.querySelector('.item-desc').value.trim();
                    const qty = parseInt(r.querySelector('.item-qty').value) || 1;
                    const price = parseFloat(r.querySelector('.item-price').value) || 0;
                    if (desc) items.push({ desc, qty, price });
                });

                if (items.length === 0) {
                    alert('يرجى إضافة بند واحد على الأقل في الفاتورة');
                    return;
                }

                const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
                const discount = parseFloat(document.getElementById('inv-discount').value) || 0;
                const hasTax = document.getElementById('inv-tax-toggle').checked;
                const tax = hasTax ? Math.round((subtotal - discount) * 0.15) : 0;
                const grandtotal = subtotal - discount + tax;

                saveBtn.disabled = true;
                saveBtn.innerHTML = 'جاري الحفظ والتحصيل...';

                const invoiceSaveData = {
                    invoiceNumber: number,
                    clientSelect: client,
                    issueDate: date,
                    status: isQuotation ? "مسودة" : status,
                    totalAmount: grandtotal,
                    items: items,
                    notes: notes,
                    footerText: footer
                };

                window.google.script.run.withSuccessHandler((res) => {
                    alert(res.message || "تم حفظ الفاتورة بنجاح!");
                    closeModal();
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<span class="material-symbols-rounded text-sm">print</span> حفظ واستعراض الفاتورة';
                    
                    if (window.loadAllData) window.loadAllData();

                    // Open A4 preview of saved invoice
                    const savedInv = {
                        number: res.id || number,
                        client: client,
                        date: date,
                        amount: grandtotal,
                        items: items,
                        notes: notes,
                        footerText: footer,
                        status: isQuotation ? "مسودة" : status
                    };
                    this.openPrintPreview(savedInv, isQuotation);

                }).saveInvoiceToSheet(invoiceSaveData);
            });
        }

        // Table actions delegation
        container.querySelectorAll('button[data-action]').forEach(btn => {
            const action = btn.getAttribute('data-action');
            const invNum = btn.getAttribute('data-row');
            const inv = invoices.find(i => i.number === invNum);

            if (action === 'print' && inv) {
                btn.addEventListener('click', () => {
                    const isQuotation = inv.status === 'مسودة';
                    this.openPrintPreview(inv, isQuotation);
                });
            } else if (action === 'edit-inv' && inv) {
                btn.addEventListener('click', () => {
                    document.getElementById('inv-id').value = inv.id;
                    document.getElementById('inv-number').value = inv.number;
                    document.getElementById('inv-client').value = inv.client;
                    document.getElementById('inv-date').value = inv.date || '';
                    document.getElementById('inv-status').value = inv.status || 'قيد الانتظار';
                    document.getElementById('inv-footer').value = inv.footerText || (window.appData && window.appData.settings && window.appData.settings.invoice_footer) || this.DEFAULT_BANK_INFO;
                    document.getElementById('inv-notes').value = inv.notes || '';
                    
                    document.getElementById('inv-items-container').innerHTML = '';
                    const items = inv.items || [];
                    if (items.length === 0) {
                        this.addItemRow("", 1, 0);
                    } else {
                        items.forEach(item => {
                            this.addItemRow(item.desc || item.name || '', item.qty || 1, item.price || item.unitPrice || 0);
                        });
                    }

                    // Pre-fill discount (find from total or check if saved. Fallback discount logic)
                    // If no stored discount field, let's keep it as 0 or subtract
                    document.getElementById('inv-discount').value = '0';
                    document.getElementById('inv-tax-toggle').checked = true;

                    // Set header
                    document.getElementById('invoice-modal-title').textContent = 'تعديل الفاتورة رقم ' + inv.number;
                    
                    // Doc switch
                    if (inv.status === 'مسودة') {
                        docQuotBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-primary text-white';
                        docInvBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-white';
                    } else {
                        docInvBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-primary text-white';
                        docQuotBtn.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-white';
                    }

                    this.calculateInvoiceTotals();
                    openModal();
                });
            } else if (action === 'delete-inv' && inv) {
                btn.addEventListener('click', () => {
                    if (confirm(`هل أنت متأكد من حذف الفاتورة رقم ${inv.number}؟`)) {
                        window.google.script.run.withSuccessHandler((msg) => {
                            alert(msg);
                            if (window.loadAllData) window.loadAllData();
                        }).deleteInvoiceFromSheet(inv.number);
                    }
                });
            }
        });

        // Print Preview Modals binding
        const printPreviewModal = document.getElementById('mainModal');
        const printBtn = document.getElementById('print-doc-btn');
        const closePreviewBtn = document.getElementById('close-print-preview-btn');

        if (closePreviewBtn && printPreviewModal) {
            closePreviewBtn.addEventListener('click', () => {
                printPreviewModal.classList.remove('open');
            });
        }

        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    },

    addItemRow: function(desc = "", qty = 1, price = 0) {
        const container = document.getElementById('inv-items-container');
        if (!container) return;

        const div = document.createElement('div');
        div.className = "inv-item-row grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white/5 p-4 rounded-xl border border-white/5 items-center";
        div.innerHTML = `
            <div class="sm:col-span-7">
                <input type="text" class="item-desc form-input-modern text-xs" placeholder="اسم الخدمة (مثال: تصميم شعار جديد)" value="${desc}">
            </div>
            <div class="sm:col-span-2">
                <input type="number" class="item-qty form-input-modern text-xs text-center en-num" placeholder="الكمية" value="${qty}" min="1">
            </div>
            <div class="sm:col-span-2">
                <input type="number" class="item-price form-input-modern text-xs text-center en-num" placeholder="السعر" value="${price}">
            </div>
            <div class="sm:col-span-1 text-center">
                <button class="w-8 h-8 rounded-lg hover:bg-red-500/20 text-red-400 flex items-center justify-center transition border border-transparent hover:border-red-500/20 mx-auto" title="حذف البند">
                    <span class="material-symbols-rounded text-sm">delete</span>
                </button>
            </div>
        `;

        // Bind delete
        div.querySelector('button').addEventListener('click', () => {
            div.remove();
            this.calculateInvoiceTotals();
        });

        // Bind events on inputs to update pricing summary
        div.querySelector('.item-qty').addEventListener('input', () => this.calculateInvoiceTotals());
        div.querySelector('.item-price').addEventListener('input', () => this.calculateInvoiceTotals());

        container.appendChild(div);
        this.calculateInvoiceTotals();
    },

    calculateInvoiceTotals: function() {
        const rows = document.querySelectorAll('.inv-item-row');
        let subtotal = 0;

        rows.forEach(r => {
            const qty = parseInt(r.querySelector('.item-qty').value) || 1;
            const price = parseFloat(r.querySelector('.item-price').value) || 0;
            subtotal += (qty * price);
        });

        const discountInput = document.getElementById('inv-discount');
        const discount = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
        const taxToggle = document.getElementById('inv-tax-toggle');
        const hasTax = taxToggle ? taxToggle.checked : true;

        const taxableAmount = Math.max(0, subtotal - discount);
        const tax = hasTax ? Math.round(taxableAmount * 0.15) : 0;
        const grandtotal = taxableAmount + tax;

        // Update HTML fields
        const subtotalEl = document.getElementById('inv-subtotal');
        const taxAmountEl = document.getElementById('inv-tax-amount');
        const grandtotalEl = document.getElementById('inv-grandtotal');

        if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString('ar-SA');
        if (taxAmountEl) taxAmountEl.textContent = tax.toLocaleString('ar-SA');
        if (grandtotalEl) grandtotalEl.textContent = grandtotal.toLocaleString('ar-SA');
    },

    openPrintPreview: function(inv, isQuotation = false) {
        const printPreviewModal = document.getElementById('mainModal');
        if (!printPreviewModal) return;

        // Set Title
        const docTitle = document.getElementById('preview-doc-title');
        const stamp = document.getElementById('quotation-stamp');
        
        if (isQuotation) {
            if (docTitle) docTitle.innerText = "عرض سعر فني";
            if (stamp) {
                stamp.style.display = 'block';
                stamp.innerText = "عرض سعر";
                stamp.style.borderColor = "#dc2626";
                stamp.style.color = "#dc2626";
            }
        } else {
            if (docTitle) docTitle.innerText = "فاتورة ضريبية مبسطة";
            if (stamp) {
                if (inv.status === 'مدفوعة') {
                    stamp.style.display = 'block';
                    stamp.innerText = "مدفوعة";
                    stamp.style.borderColor = "#10b981";
                    stamp.style.color = "#10b981";
                } else {
                    stamp.style.display = 'none';
                }
            }
        }

        // Set Fields
        document.getElementById('prev-number').innerText = "#" + inv.number;
        document.getElementById('prev-date').innerText = inv.date || '';
        document.getElementById('prev-client-name').innerText = inv.client || '';
        
        // Find company (find from database or fallback to empty)
        document.getElementById('prev-client-company').innerText = inv.clientCompany || 'شريك نجاح رنان';
        document.getElementById('prev-status').innerText = isQuotation ? "مسودة عرض سعر" : (inv.status || "قيد الانتظار");
        document.getElementById('prev-footer-details').innerText = inv.footerText || (window.appData && window.appData.settings && window.appData.settings.invoice_footer) || this.DEFAULT_BANK_INFO;

        // Render Table Binds
        const tbody = document.getElementById('prev-items-body');
        tbody.innerHTML = '';
        const items = inv.items || [];

        let subtotal = 0;
        items.forEach(item => {
            const desc = item.desc || item.name || '';
            const qty = item.qty || 1;
            const price = item.price || item.unitPrice || 0;
            const itemTotal = qty * price;
            subtotal += itemTotal;

            tbody.innerHTML += `
                <tr class="border-b border-slate-100">
                    <td class="px-4 py-3 text-slate-800 font-medium">${desc}</td>
                    <td class="px-4 py-3 text-center en-num font-semibold text-slate-800">${qty}</td>
                    <td class="px-4 py-3 text-left en-num text-slate-700">${price.toLocaleString('ar-SA')} ر.س</td>
                    <td class="px-4 py-3 text-left en-num font-bold text-slate-900">${itemTotal.toLocaleString('ar-SA')} ر.س</td>
                </tr>
            `;
        });

        // Set totals
        // Calculate tax based on amount (estimate tax at 15%)
        // Grandtotal is inv.amount
        const grandtotal = parseFloat(inv.amount) || subtotal;
        
        // Backwards compute discount/tax if not stored
        // Typically, grandtotal = (subtotal - discount) * 1.15
        // Let's assume standard tax toggle = true, compute discount if stored
        let discount = 0;
        let tax = 0;
        
        // Stored invoice properties may vary. If we assume tax was 15% and stored total is grandtotal:
        // Let's check if the invoice amount includes VAT
        // For simplicity:
        const hasTax = !isQuotation; // quotations don't show VAT on items unless checked, but invoices do
        if (hasTax) {
            tax = Math.round((grandtotal / 1.15) * 0.15);
            discount = Math.max(0, Math.round(subtotal + tax - grandtotal));
            // Recalc clean totals
            const cleanTaxable = subtotal - discount;
            tax = Math.round(cleanTaxable * 0.15);
        } else {
            discount = Math.max(0, subtotal - grandtotal);
        }

        document.getElementById('prev-subtotal').textContent = subtotal.toLocaleString('ar-SA');
        document.getElementById('prev-grandtotal').textContent = grandtotal.toLocaleString('ar-SA');

        const prevDiscountRow = document.getElementById('prev-discount-row');
        const prevTaxRow = document.getElementById('prev-tax-row');

        if (discount > 0) {
            if (prevDiscountRow) prevDiscountRow.classList.remove('hidden');
            document.getElementById('prev-discount').textContent = discount.toLocaleString('ar-SA');
        } else {
            if (prevDiscountRow) prevDiscountRow.classList.add('hidden');
        }

        if (tax > 0) {
            if (prevTaxRow) prevTaxRow.classList.remove('hidden');
            document.getElementById('prev-tax').textContent = tax.toLocaleString('ar-SA');
        } else {
            if (prevTaxRow) prevTaxRow.classList.add('hidden');
        }

        // Open Modal
        printPreviewModal.classList.add('open');
    }
};

// Expose directly to window for global inline calls (like dashboard invis clicks)
window.printInvoiceDirectly = function(i) {
    InvoicesComponent.openPrintPreview(i, i.status === 'مسودة');
};
