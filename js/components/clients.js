/**
 * Clients Component - Client Management View & Modals
 */

export const ClientsComponent = {
    currentFilter: 'all',
    searchQuery: '',

    render: function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const clients = data.clients || [];
        const invoices = data.invoices || [];

        // Apply filters
        let filteredClients = clients.filter(c => {
            const matchesSearch = (c.name || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                                  (c.company || '').toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                                  (c.phone || '').includes(this.searchQuery);
            
            const matchesStatus = this.currentFilter === 'all' || 
                                  (this.currentFilter === 'active' && c.status === 'نشط') ||
                                  (this.currentFilter === 'inactive' && c.status !== 'نشط');

            return matchesSearch && matchesStatus;
        });

        // Calculations for header statistics
        const totalCount = clients.length;
        const activeCount = clients.filter(c => c.status === 'نشط').length;
        const totalPoints = clients.reduce((sum, c) => sum + (parseInt(c.points) || 0), 0);
        const averagePoints = totalCount > 0 ? Math.round(totalPoints / totalCount) : 0;
        const totalRevenue = invoices.filter(i => i.status === 'مدفوعة').reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

        container.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h1 class="text-3xl font-black text-white">إدارة شركاء النجاح</h1>
                        <p class="text-sm text-muted mt-1">عرض وتحديث بيانات العملاء وتتبع نقاط الولاء والمشتريات</p>
                    </div>
                    <button id="add-client-btn" class="btn-glow bg-gradient-to-r from-primary to-secondary text-white py-3 px-6 rounded-xl font-bold flex items-center gap-2 text-sm">
                        <span class="material-symbols-rounded text-lg">person_add</span>
                        إضافة عميل جديد
                    </button>
                </div>

                <!-- Stats Overview -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block">إجمالي العملاء</span>
                        <span class="text-xl font-black text-white mt-1 en-num block">${totalCount}</span>
                    </div>
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block">النشطين حالياً</span>
                        <span class="text-xl font-black text-emerald-400 mt-1 en-num block">${activeCount}</span>
                    </div>
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block">متوسط نقاط الولاء</span>
                        <span class="text-xl font-black text-amber-400 mt-1 en-num block">${averagePoints} <span class="text-xs font-normal">نقطة</span></span>
                    </div>
                    <div class="glass-panel p-4 rounded-xl border border-white/5">
                        <span class="text-[10px] text-muted block">إجمالي المبيعات</span>
                        <span class="text-xl font-black text-cyan-400 mt-1 en-num block">${totalRevenue.toLocaleString('ar-SA')} <span class="text-xs font-normal">ريال</span></span>
                    </div>
                </div>

                <!-- Filters & Search Toolbar -->
                <div class="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                    <!-- Search Input -->
                    <div class="relative flex-1">
                        <span class="material-symbols-rounded absolute right-3.5 top-3.5 text-muted text-lg">search</span>
                        <input type="text" id="client-search-input" placeholder="البحث باسم العميل أو الشركة أو رقم الهاتف..." 
                            value="${this.searchQuery}"
                            class="form-input-modern pr-11 text-sm">
                    </div>
                    <!-- Status Filter Tabs -->
                    <div class="flex bg-black/40 rounded-xl p-1 border border-white/5 self-start">
                        <button data-filter="all" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${this.currentFilter === 'all' ? 'bg-primary text-white shadow-glow-primary' : 'text-muted hover:text-white'}">الكل</button>
                        <button data-filter="active" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${this.currentFilter === 'active' ? 'bg-primary text-white shadow-glow-primary' : 'text-muted hover:text-white'}">نشط</button>
                        <button data-filter="inactive" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${this.currentFilter === 'inactive' ? 'bg-primary text-white shadow-glow-primary' : 'text-muted hover:text-white'}">غير نشط</button>
                    </div>
                </div>

                <!-- Clients Responsive Table -->
                <div class="glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                    <div class="overflow-x-auto">
                        <table class="w-full text-right text-sm">
                            <thead class="bg-white/5 border-b border-white/5 text-slate-300 font-bold text-xs uppercase">
                                <tr>
                                    <th class="px-6 py-4">العميل والشركة</th>
                                    <th class="px-6 py-4">الاتصال</th>
                                    <th class="px-6 py-4 text-center">نقاط الولاء</th>
                                    <th class="px-6 py-4 text-center">حجم المشتريات</th>
                                    <th class="px-6 py-4 text-center">الحالة</th>
                                    <th class="px-6 py-4 text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                ${filteredClients.length === 0 ? `
                                    <tr>
                                        <td colspan="6" class="text-center py-16 text-muted">
                                            <span class="material-symbols-rounded text-4xl block mb-2">person_off</span>
                                            لا توجد نتائج مطابقة لمؤشرات البحث
                                        </td>
                                    </tr>
                                ` : filteredClients.map(c => {
                                    const statusClass = c.status === 'نشط' ? 'status-paid' : 'status-pending';
                                    const statusText = c.status || 'نشط';
                                    const rawPhone = (c.phone || '').replace(/\s+/g, '');
                                    const waLink = `https://api.whatsapp.com/send?phone=${rawPhone.startsWith('+') ? rawPhone.substring(1) : rawPhone.startsWith('00') ? rawPhone.substring(2) : rawPhone.startsWith('0') ? '966' + rawPhone.substring(1) : rawPhone}`;

                                    return `
                                        <tr class="transition-all hover:bg-white/5">
                                            <td class="px-6 py-4">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 flex items-center justify-center font-bold text-white border border-white/5 select-none">
                                                        ${(c.name || 'ع').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 class="font-bold text-white">${c.name}</h4>
                                                        <span class="text-[10px] text-muted block mt-0.5">${c.company || 'فردي'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="text-xs block text-slate-300 en-num" dir="ltr">${c.phone || '-'}</span>
                                                <span class="text-[10px] text-muted block mt-0.5">${c.email || '-'}</span>
                                            </td>
                                            <td class="px-6 py-4 text-center font-bold text-amber-400 en-num">
                                                ${c.points || 0}
                                            </td>
                                            <td class="px-6 py-4 text-center font-bold text-white en-num">
                                                ${(c.totalSpent || 0).toLocaleString('ar-SA')} <span class="text-[10px] font-normal text-muted">ريال</span>
                                            </td>
                                            <td class="px-6 py-4 text-center">
                                                <span class="status-pill ${statusClass}">${statusText}</span>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="flex items-center justify-center gap-2">
                                                    <a href="${waLink}" target="_blank" class="w-8 h-8 rounded-lg hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition border border-transparent hover:border-emerald-500/20" title="إرسال رسالة واتساب">
                                                        <span class="material-symbols-rounded text-lg">chat</span>
                                                    </a>
                                                    <button class="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition" data-action="edit" data-row="${c.rowIndex}" title="تعديل البيانات">
                                                        <span class="material-symbols-rounded text-lg">edit</span>
                                                    </button>
                                                    <button class="w-8 h-8 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 flex items-center justify-center transition" data-action="delete" data-row="${c.rowIndex}" title="حذف العميل">
                                                        <span class="material-symbols-rounded text-lg">delete</span>
                                                    </button>
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

            <!-- Add/Edit Client Modal (Injected in DOM if not exists) -->
            <div id="clientModal" class="modal fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm items-center justify-center p-4">
                <div class="glass-modal w-full max-w-md rounded-3xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden modal-content-anim">
                    <div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent"></div>
                    <div class="p-6 border-b border-white/5 flex justify-between items-center bg-black/25">
                        <h3 id="client-modal-title" class="text-lg font-bold text-white">إضافة عميل جديد</h3>
                        <button id="close-client-modal-btn" class="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                    
                    <div class="p-6 space-y-4">
                        <input type="hidden" id="client-row-index">
                        
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">اسم العميل الثلاثي *</label>
                            <input type="text" id="client-name-input" placeholder="مثال: أحمد عبد الله الغامدي" class="form-input-modern text-sm">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">اسم الشركة / الجهة التجارية</label>
                            <input type="text" id="client-company-input" placeholder="مثال: رنان للتجارة والمقاولات" class="form-input-modern text-sm">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">رقم الجوال المسجل *</label>
                            <input type="text" id="client-phone-input" placeholder="مثال: 9665XXXXXXXX" class="form-input-modern text-sm text-center en-num">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">البريد الإلكتروني للعميل</label>
                            <input type="email" id="client-email-input" placeholder="مثال: client@rannan.design" class="form-input-modern text-sm text-center en-num">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">الرمز التعريفي للمُحيل (اختياري)</label>
                            <input type="text" id="client-invited-input" placeholder="العميل الذي قام بدعوة هذا العميل..." class="form-input-modern text-sm">
                        </div>
                    </div>

                    <div class="p-6 border-t border-white/5 bg-black/25 flex justify-end gap-3">
                        <button id="cancel-client-btn" class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 transition border border-white/5">إلغاء</button>
                        <button id="save-client-btn" class="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary hover:bg-blue-600 text-white transition flex items-center gap-1 shadow-glow-primary">
                            <span class="material-symbols-rounded text-sm">save</span>
                            حفظ العميل
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind Search Event
        const searchInput = document.getElementById('client-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.render(containerId, data);
            });
        }

        // Bind Status Filter Tabs
        const tabs = container.querySelectorAll('button[data-filter]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.currentFilter = tab.getAttribute('data-filter');
                this.render(containerId, data);
            });
        });

        // Add Client Modal Binding
        const addBtn = document.getElementById('add-client-btn');
        const modal = document.getElementById('clientModal');
        const closeBtn = document.getElementById('close-client-modal-btn');
        const cancelBtn = document.getElementById('cancel-client-btn');
        const saveBtn = document.getElementById('save-client-btn');

        if (addBtn && modal) {
            addBtn.addEventListener('click', () => {
                document.getElementById('client-row-index').value = '';
                document.getElementById('client-name-input').value = '';
                document.getElementById('client-company-input').value = '';
                document.getElementById('client-phone-input').value = '';
                document.getElementById('client-email-input').value = '';
                document.getElementById('client-invited-input').value = '';
                document.getElementById('client-modal-title').textContent = 'إضافة عميل جديد';
                modal.classList.add('open');
            });
        }

        const closeModal = () => {
            if (modal) modal.classList.remove('open');
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        // Edit & Delete Button Event Delegation
        container.querySelectorAll('button[data-action]').forEach(btn => {
            const action = btn.getAttribute('data-action');
            const rowIdx = btn.getAttribute('data-row');
            const client = clients.find(c => c.rowIndex === rowIdx);

            if (action === 'edit' && client) {
                btn.addEventListener('click', () => {
                    document.getElementById('client-row-index').value = rowIdx;
                    document.getElementById('client-name-input').value = client.name || '';
                    document.getElementById('client-company-input').value = client.company || '';
                    document.getElementById('client-phone-input').value = client.phone || '';
                    document.getElementById('client-email-input').value = client.email || '';
                    document.getElementById('client-invited-input').value = client.invitedBy || '';
                    document.getElementById('client-modal-title').textContent = 'تعديل بيانات العميل';
                    modal.classList.add('open');
                });
            } else if (action === 'delete') {
                btn.addEventListener('click', () => {
                    if (confirm(`هل أنت متأكد من حذف العميل "${client.name}" بالكامل؟`)) {
                        window.google.script.run.withSuccessHandler((msg) => {
                            alert(msg);
                            if (window.loadAllData) window.loadAllData();
                        }).deleteClient(rowIdx);
                    }
                });
            }
        });

        // Save Client Logic
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const rIdx = document.getElementById('client-row-index').value;
                const cName = document.getElementById('client-name-input').value.trim();
                const cCompany = document.getElementById('client-company-input').value.trim();
                const cPhone = document.getElementById('client-phone-input').value.trim();
                const cEmail = document.getElementById('client-email-input').value.trim();
                const cInvited = document.getElementById('client-invited-input').value.trim();

                if (!cName || !cPhone) {
                    alert('يرجى ملء جميع الحقول المطلوبة (*)');
                    return;
                }

                saveBtn.disabled = true;
                saveBtn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>';

                const dataToSave = {
                    rowIndex: rIdx,
                    clientName: cName,
                    companyName: cCompany,
                    phone: cPhone,
                    email: cEmail,
                    invitedBy: cInvited
                };

                window.google.script.run.withSuccessHandler((msg) => {
                    alert(msg);
                    closeModal();
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<span class="material-symbols-rounded text-sm">save</span> حفظ العميل';
                    if (window.loadAllData) window.loadAllData();
                }).saveClientToSheet(dataToSave);
            });
        }
    }
};
