/**
 * Notifications Component - System Logs & Client Timeline Updates
 */

export const NotificationsComponent = {
    render: function(containerId, data) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const userType = localStorage.getItem('userType') || 'client';
        const clientName = localStorage.getItem('userName') || '';
        const notifications = data.notifications || [];

        // Header and layout variables
        const titleText = userType === 'admin' ? 'سجل أحداث النظام' : 'تحديثات مشاريعي الإبداعية';
        const subtitleText = userType === 'admin' 
            ? 'سجل حي لجميع الإجراءات المالية وتحديثات مشاريع العملاء وعمليات السداد' 
            : 'متابعة لحظية لتقدم مشاريعك، ومستويات نقاط الولاء، والفواتير الصادرة';

        // Filter out for clients
        const displayNotifs = userType === 'admin' 
            ? notifications 
            : notifications.filter(n => n.client === clientName);

        const unreadCount = displayNotifs.filter(n => !n.isRead).length;

        container.innerHTML = `
            <div class="space-y-8 animate-fade-in max-w-4xl mx-auto">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <h1 class="text-3xl font-black text-white">${titleText}</h1>
                        <p class="text-sm text-muted mt-1">${subtitleText}</p>
                    </div>
                    
                    ${unreadCount > 0 ? `
                        <button id="mark-all-read-btn" class="btn-glow bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white py-2.5 px-5 rounded-xl font-bold flex items-center gap-2 text-xs border border-white/5 transition">
                            <span class="material-symbols-rounded text-base">done_all</span>
                            تحديد الكل كمقروء (${unreadCount})
                        </button>
                    ` : ''}
                </div>

                <!-- Notifications Panel -->
                <div class="glass-panel p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full filter blur-xl"></div>
                    
                    ${displayNotifs.length === 0 ? `
                        <div class="text-center py-20 text-muted">
                            <span class="material-symbols-rounded text-5xl block mb-3 text-slate-600">notifications_off</span>
                            <h3 class="text-md font-bold text-white mb-1">صندوق الإشعارات فارغ</h3>
                            <p class="text-xs text-slate-500">لا توجد تنبيهات أو سجلات أحداث مسجلة في الوقت الحالي.</p>
                        </div>
                    ` : `
                        <div class="relative border-r border-white/10 pr-6 space-y-6">
                            ${displayNotifs.map(n => {
                                let icon = 'notifications';
                                let colorClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                                
                                // Parse type
                                switch(n.type) {
                                    case 'invoice_paid':
                                        icon = 'payments';
                                        colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                                        break;
                                    case 'points_earned':
                                        icon = 'stars';
                                        colorClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                                        break;
                                    case 'new_invoice':
                                        icon = 'receipt_long';
                                        colorClass = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                                        break;
                                    case 'project_new':
                                    case 'new_project':
                                        icon = 'design_services';
                                        colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                                        break;
                                    case 'project_completed':
                                        icon = 'workspace_premium';
                                        colorClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                                        break;
                                }

                                const isUnread = !n.isRead;
                                const dateStr = n.date ? n.date.split('T')[0] : '';
                                const timeStr = n.date && n.date.includes('T') ? n.date.split('T')[1].substring(0, 5) : '';

                                return `
                                    <div class="relative flex items-start gap-4 transition-all hover:translate-x-[-4px] duration-300 group" data-id="${n.id}">
                                        <!-- Timeline node -->
                                        <div class="absolute -right-[35px] top-1.5 w-[18px] h-[18px] rounded-full border-2 ${isUnread ? 'bg-primary border-primary animate-pulse' : 'bg-[#0d0d12] border-white/20'} z-10 transition-colors"></div>
                                        
                                        <!-- Notification Box -->
                                        <div class="flex-1 glass-panel p-4 rounded-2xl border ${isUnread ? 'border-primary/20 bg-primary/5 shadow-[0_0_15px_-3px_rgba(37,99,235,0.15)]' : 'border-white/5 bg-white/2'} flex items-center justify-between gap-4 cursor-pointer">
                                            <div class="flex items-center gap-4">
                                                <div class="w-10 h-10 rounded-xl flex items-center justify-center border ${colorClass}">
                                                    <span class="material-symbols-rounded text-lg">${icon}</span>
                                                </div>
                                                <div>
                                                    <div class="flex items-center gap-2">
                                                        ${userType === 'admin' ? `<span class="text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded bg-white/5">${n.client}</span>` : ''}
                                                        <span class="text-[10px] text-slate-500 en-num font-medium">${dateStr} ${timeStr}</span>
                                                    </div>
                                                    <p class="text-xs font-bold text-white mt-1 group-hover:text-primary transition-colors leading-relaxed">${n.message}</p>
                                                </div>
                                            </div>
                                            
                                            ${isUnread ? `
                                                <span class="w-2.5 h-2.5 rounded-full bg-primary" title="غير مقروء"></span>
                                            ` : `
                                                <span class="material-symbols-rounded text-slate-600 text-sm select-none">done</span>
                                            `}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Event: Mark all as read
        const markAllReadBtn = document.getElementById('mark-all-read-btn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', (e) => {
                markAllReadBtn.disabled = true;
                markAllReadBtn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>';
                
                const callback = () => {
                    if (window.loadAllData) window.loadAllData();
                };

                if (userType === 'admin') {
                    // Admins mark all
                    window.google.script.run.withSuccessHandler(callback).markAllNotificationsRead('admin'); // Custom admin endpoint or mark all
                } else {
                    // Clients mark their own
                    window.google.script.run.withSuccessHandler(callback).markAllNotificationsRead(clientName);
                }
            });
        }

        // Event: Click notification to mark read
        container.querySelectorAll('[data-id]').forEach(elem => {
            elem.addEventListener('click', () => {
                const id = elem.getAttribute('data-id');
                const notif = displayNotifs.find(n => n.id === id);
                if (notif && !notif.isRead) {
                    window.google.script.run.withSuccessHandler(() => {
                        if (window.loadAllData) window.loadAllData();
                    }).markNotificationRead(id);
                }
            });
        });
    }
};
