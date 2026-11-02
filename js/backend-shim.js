/**
 * Backend Shim to replace Google Apps Script (google.script.run)
 * Translates calls to Firebase Realtime Database
 */

// ── فترات الفواتير المتكررة (YYYY-MM) — تُصدر في آخر يوم من كل شهر ──
window.RecurringPeriods = {
    ym: d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
    next: p => { let [y, m] = p.split('-').map(Number); return m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0'); },
    lastDay: p => { let [y, m] = p.split('-').map(Number); return p + '-' + String(new Date(y, m, 0).getDate()).padStart(2, '0'); },
    // آخر شهر حان موعده: الشهر الحالي إن كان اليوم آخر أيامه، وإلا الشهر السابق
    lastDue: today => {
        let t = today || new Date();
        if (t.getDate() === new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()) return window.RecurringPeriods.ym(t);
        return window.RecurringPeriods.ym(new Date(t.getFullYear(), t.getMonth() - 1, 1));
    },
    nextDue: r => {
        let n = r.lastIssued ? window.RecurringPeriods.next(r.lastIssued) : r.startPeriod;
        return (r.startPeriod && n < r.startPeriod) ? r.startPeriod : n;
    },
    label: p => { let [y, m] = p.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'long', year: 'numeric' }); }
};

const backendFunctions = {
    // الدخول للإدارة فقط — العميل لا يملك حسابًا، بل رابطًا خاصًا ثابتًا (client.html?k=...)
    checkLogin: async function(input) {
        if (!window.db) return { success: false, message: "Firebase not initialized" };
        let foundUser = null;

        let snap = await window.db.ref('users').once('value');
        if (snap.exists()) {
            snap.forEach(child => {
                if (child.val().password === input) {
                    foundUser = child.val();
                }
            });
        }

        if (foundUser) {
            return { success: true, type: 'admin', name: foundUser.name || 'مدير' };
        }
        return { success: false };
    },

    // يُنشئ للعميل رابطًا خاصًا (token) ورمز دعوة (refCode) ويُسجّل فهرسيهما
    _issueClientKeys: function(clientKey, updates) {
        let token = RNAN.newToken();
        let refCode = RNAN.newRefCode();
        updates['clients/' + clientKey + '/token'] = token;
        updates['clients/' + clientKey + '/refCode'] = refCode;
        updates['portal/' + token] = clientKey;
        updates['referrals/' + refCode] = clientKey;
        return { token: token, refCode: refCode };
    },

    getClientsData: async function() {
        let snap = await window.db.ref('clients').once('value');
        let clients = [];
        let updates = {};
        if (snap.exists()) {
            snap.forEach(child => {
                let val = child.val();
                // إصدار تلقائي للروابط للعملاء القدامى الذين أُضيفوا قبل هذه الميزة
                if (!val.token || !val.refCode) {
                    let keys = backendFunctions._issueClientKeys(child.key, updates);
                    val.token = keys.token;
                    val.refCode = keys.refCode;
                }
                clients.push({
                    rowIndex: child.key,
                    name: val.name || '',
                    company: val.company || val.name || '',
                    email: val.email || '',
                    phone: val.phone || '',
                    status: val.status || 'نشط',
                    address: val.address || '',
                    points: parseInt(val.points) || 0,
                    totalSpent: parseFloat(val.totalSpent) || 0,
                    invitedBy: val.invitedBy || '',
                    token: val.token,
                    refCode: val.refCode,
                    dateAdded: val.dateAdded || ''
                });
            });
        }
        if (Object.keys(updates).length > 0) {
            await window.db.ref().update(updates);
        }
        return clients;
    },

    saveClientToSheet: async function(data) {
        if (data.rowIndex) {
            await window.db.ref('clients/' + data.rowIndex).update({
                name: data.clientName,
                company: data.companyName,
                phone: data.phone,
                invitedBy: data.invitedBy || ''
            });
            return "تم تحديث بيانات العميل بنجاح";
        } else {
            let key = await backendFunctions._createClient({
                name: data.clientName,
                company: data.companyName,
                phone: data.phone,
                invitedBy: data.invitedBy || ''
            });
            return { message: "تمت إضافة العميل بنجاح", rowIndex: key };
        }
    },

    _createClient: async function(fields) {
        let key = window.db.ref('clients').push().key;
        let token = RNAN.newToken();
        let refCode = RNAN.newRefCode();
        let updates = {};
        // مسارات متداخلة غير مسموحة في update واحد، لذا يُكتب العميل كاملًا مع رموزه
        updates['clients/' + key] = {
            name: fields.name,
            company: fields.company || fields.name,
            phone: fields.phone || '',
            email: fields.email || '',
            status: 'نشط',
            points: 0,
            totalSpent: 0,
            invitedBy: fields.invitedBy || '',
            dateAdded: new Date().toISOString(),
            token: token,
            refCode: refCode
        };
        updates['portal/' + token] = key;
        updates['referrals/' + refCode] = key;
        await window.db.ref().update(updates);
        return key;
    },

    // يُبطل الرابط القديم (إن تسرّب) ويُصدر رابطًا جديدًا
    regenerateClientToken: async function(rowIndex) {
        let snap = await window.db.ref('clients/' + rowIndex).once('value');
        if (!snap.exists()) throw new Error('العميل غير موجود');
        let old = snap.val().token;
        let token = RNAN.newToken();
        let updates = {};
        if (old) updates['portal/' + old] = null;
        updates['portal/' + token] = rowIndex;
        updates['clients/' + rowIndex + '/token'] = token;
        await window.db.ref().update(updates);
        return token;
    },

    getInvoicesData: async function() {
        let snap = await window.db.ref('invoices').once('value');
        let invoices = [];
        if (snap.exists()) {
            snap.forEach(child => {
                let val = child.val();
                invoices.push({
                    number: val.number || child.key,
                    client: val.client || '',
                    amount: val.amount || 0,
                    date: val.date || '',
                    status: val.status || 'قيد الانتظار',
                    items: val.items ? (typeof val.items === 'string' ? JSON.parse(val.items) : val.items) : [],
                    notes: val.notes || '',
                    footerText: val.footerText || '',
                    id: child.key
                });
            });
        }
        return invoices.reverse(); // Assuming chronological order from Firebase
    },

    saveInvoiceToSheet: async function(data) {
        let isUpdate = data.invoiceNumber && data.invoiceNumber !== "تلقائي";
        let invoiceId = isUpdate ? data.invoiceNumber : 'INV-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 10000); // Simplistic ID generator for demo
        
        let invData = {
            number: invoiceId,
            client: data.clientSelect,
            amount: data.totalAmount,
            date: data.issueDate,
            status: data.status || 'قيد الانتظار',
            items: data.items,
            notes: data.notes || '',
            footerText: data.footerText || ''
        };
        if (data.recurringId) invData.recurringId = data.recurringId;
        
        // Find existing to update status/loyalty points
        if (isUpdate) {
            let snap = await window.db.ref('invoices').orderByChild('number').equalTo(invoiceId).once('value');
            if (snap.exists()) {
                let key = Object.keys(snap.val())[0];
                let oldData = snap.val()[key];
                await window.db.ref('invoices/' + key).update(invData);
                if (data.status === 'مدفوعة' && oldData.status !== 'مدفوعة') {
                    await backendFunctions._updateLoyaltyPoints(data.clientSelect, data.totalAmount);
                    backendFunctions.logNotification(data.clientSelect, "invoice_paid", "تم سداد الفاتورة رقم " + invoiceId + " بنجاح.");
                }
                return { success: true, message: "تم التحديث", id: invoiceId };
            }
        } 
        
        // New invoice
        await window.db.ref('invoices').push(invData);
        if (data.status === 'مدفوعة') {
            await backendFunctions._updateLoyaltyPoints(data.clientSelect, data.totalAmount);
        } else {
            backendFunctions.logNotification(data.clientSelect, "new_invoice", "تم إصدار فاتورة جديدة رقم " + invoiceId + " بقيمة " + data.totalAmount + " ريال.");
        }
        return { success: true, message: "تم الإصدار", id: invoiceId };
    },
    
    _updateLoyaltyPoints: async function(clientName, amountPaid) {
        let amount = parseFloat(amountPaid) || 0;
        if (amount <= 0) return;
        
        let cSnap = await window.db.ref('clients').once('value');
        if (cSnap.exists()) {
            cSnap.forEach(child => {
                let val = child.val();
                if (val.name === clientName || val.company === clientName) {
                    let currentPoints = parseInt(val.points) || 0;
                    let currentSpent = parseFloat(val.totalSpent) || 0;
                    
                    let projectedTotal = currentSpent + amount;
                    let multiplier = 1.0;
                    if (projectedTotal >= 5000) multiplier = 1.25;
                    else if (projectedTotal >= 1000) multiplier = 1.1;
                    
                    let earnedPoints = Math.floor(amount * multiplier);
                    window.db.ref('clients/' + child.key).update({
                        points: currentPoints + earnedPoints,
                        totalSpent: projectedTotal
                    });
                    
                    if (earnedPoints > 0) {
                        backendFunctions.logNotification(clientName, "points_earned", "لقد اكتسبت " + earnedPoints + " نقطة ولاء من سداد فاتورة جديدة.");
                    }
                }
            });
        }
    },

    deleteInvoiceFromSheet: async function(invoiceId) {
        let snap = await window.db.ref('invoices').orderByChild('number').equalTo(invoiceId).once('value');
        if (snap.exists()) {
            let key = Object.keys(snap.val())[0];
            await window.db.ref('invoices/' + key).remove();
            return "تم حذف الفاتورة بنجاح";
        }
        return "لم يتم العثور على الفاتورة";
    },

    getProjectsData: async function() {
        let snap = await window.db.ref('projects').once('value');
        let projects = [];
        let updates = {};
        if (snap.exists()) {
            snap.forEach(child => {
                let val = child.val();
                // رقم تتبع تلقائي للمشاريع القديمة + صفحة تتبعها العامة
                if (!val.code) {
                    val.code = RNAN.newTrackCode();
                    updates['projects/' + child.key + '/code'] = val.code;
                    updates['track/' + val.code] = RNAN.trackFromProject(val);
                }
                projects.push({
                    code: val.code,
                    rowIndex: child.key,
                    name: val.name || '',
                    client: val.client || '',
                    status: val.status || '',
                    deadline: val.deadline || '',
                    value: parseFloat(val.value) || 0,
                    progress: parseInt(val.progress) || 0,
                    steps: val.steps ? (typeof val.steps === 'string' ? JSON.parse(val.steps) : val.steps) : [],
                    startDate: val.startDate || '',
                    notes: val.notes || '',
                    rating: val.rating || 0,
                    review: val.review || '',
                    quotation: val.quotation || null,
                    type: val.type || ''
                });
            });
        }
        if (Object.keys(updates).length > 0) {
            await window.db.ref().update(updates);
        }
        return projects.reverse();
    },

    saveProjectToSheet: async function(data) {
        let projData = {
            name: data.name,
            client: data.client,
            status: data.status,
            deadline: data.deadline,
            value: data.value,
            progress: data.progress,
            steps: data.steps,
            startDate: data.startDate,
            notes: data.notes || ''
        };
        if (data.quotation) projData.quotation = data.quotation;
        if (data.type) projData.type = data.type; // نوع العمل من نافذة «مشروع جديد»

        if (data.rowIndex) {
            let oldSnap = await window.db.ref('projects/' + data.rowIndex).once('value');
            let old = oldSnap.val() || {};
            projData.code = old.code || data.code || RNAN.newTrackCode();
            let trackSnap = await window.db.ref('track/' + projData.code + '/createdAt').once('value');
            await window.db.ref('projects/' + data.rowIndex).update(projData);
            await window.db.ref('track/' + projData.code).set(RNAN.trackFromProject(projData, trackSnap.val()));
            if (old.status !== projData.status) {
                if (projData.status === 'مكتمل') {
                    backendFunctions.logNotification(data.client, "project_done", "🎉 تم تسليم مشروع '" + data.name + "'. يسعدنا تقييمك للتجربة.");
                } else if (projData.status === 'معلق') {
                    backendFunctions.logNotification(data.client, "project_hold", "مشروع '" + data.name + "' متوقف مؤقتًا، وسنتواصل معك قريبًا.");
                }
            } else if ((parseInt(projData.progress) || 0) > (parseInt(old.progress) || 0)) {
                backendFunctions.logNotification(data.client, "project_progress", "تقدّم مشروع '" + data.name + "' إلى " + projData.progress + "%.");
            }
            return "تم تحديث المشروع بنجاح";
        } else {
            projData.code = data.code || RNAN.newTrackCode();
            backendFunctions.logNotification(data.client, "project_new", "تم إنشاء مشروع جديد باسم '" + data.name + "' برقم تتبع " + projData.code + ".");
            let ref = await window.db.ref('projects').push(projData);
            await window.db.ref('track/' + projData.code).set(RNAN.trackFromProject(projData));
            return { message: "تم حفظ المشروع الجديد", rowIndex: ref.key, code: projData.code };
        }
    },

    // عرض سعر المشروع: رقم وتاريخ ثابتان يُحفظان داخل المشروع
    saveProjectQuotation: async function(rowIndex, quotation) {
        await window.db.ref('projects/' + rowIndex + '/quotation').set(quotation);
        return quotation;
    },

    deleteProjectFromSheet: async function(rowIndex) {
        let snap = await window.db.ref('projects/' + rowIndex + '/code').once('value');
        await window.db.ref('projects/' + rowIndex).remove();
        if (snap.val()) await window.db.ref('track/' + snap.val()).remove();
        return "تم حذف المشروع بنجاح";
    },

    saveProjectDetails: async function(rowIndex, details) {
        await window.db.ref('projects/' + rowIndex).update({ notes: details });
        return "تم حفظ التفاصيل بنجاح";
    },

    saveProjectRating: async function(rowIndex, rating, review) {
        await window.db.ref('projects/' + rowIndex).update({ rating: rating, review: review });
        return "تم إرسال التقييم بنجاح";
    },

    redeemReward: async function(rewardValue, costPoints, clientPhone) {
        return { success: false, message: "ميزة استبدال النقاط قيد التطوير للعمل مع Firebase." }; // Can fully implement later
    },

    logNotification: async function(clientName, type, message) {
        await window.db.ref('notifications').push({
            client: clientName,
            type: type,
            message: message,
            isRead: false,
            date: new Date().toISOString()
        });
    },

    getUnreadNotifications: async function(clientName) {
        let snap = await window.db.ref('notifications').orderByChild('client').equalTo(clientName).once('value');
        let notifs = [];
        if (snap.exists()) {
            snap.forEach(child => {
                let val = child.val();
                if (!val.isRead) {
                    notifs.push({
                        id: child.key,
                        type: val.type,
                        message: val.message,
                        date: val.date ? val.date.split('T')[0] : ''
                    });
                }
            });
        }
        return notifs.reverse();
    },

    getClientUpdates: async function(clientName) {
        let snap = await window.db.ref('notifications').orderByChild('client').equalTo(clientName).once('value');
        let notifs = [];
        if (snap.exists()) {
            snap.forEach(child => {
                let val = child.val();
                notifs.push({
                    id: child.key,
                    type: val.type,
                    message: val.message,
                    date: val.date ? val.date.split('T')[0] : '',
                    isRead: val.isRead
                });
            });
        }
        return notifs.reverse().slice(0, 50);
    },

    markNotificationRead: async function(id) {
        await window.db.ref('notifications/' + id).update({ isRead: true });
        return "Marked as read";
    },

    markAllNotificationsRead: async function(clientName) {
        let snap;
        if (clientName === 'admin') {
            snap = await window.db.ref('notifications').once('value');
        } else {
            snap = await window.db.ref('notifications').orderByChild('client').equalTo(clientName).once('value');
        }
        if (snap.exists()) {
            let updates = {};
            snap.forEach(child => {
                if (!child.val().isRead) {
                    updates[child.key + '/isRead'] = true;
                }
            });
            if (Object.keys(updates).length > 0) {
                await window.db.ref('notifications').update(updates);
            }
        }
        return "تم تحديث الإشعارات";
    },
    
    recalculateAllPoints: async function() {
        return "تم احتساب النقاط";
    },

    deleteClient: async function(rowIndex) {
        let snap = await window.db.ref('clients/' + rowIndex).once('value');
        let val = snap.val() || {};
        let updates = {};
        updates['clients/' + rowIndex] = null;
        if (val.token) updates['portal/' + val.token] = null;
        if (val.refCode) updates['referrals/' + val.refCode] = null;
        await window.db.ref().update(updates);
        return "تم حذف العميل بنجاح";
    },

    getSettingsData: async function() {
        let snap = await window.db.ref('settings').once('value');
        if (snap.exists()) {
            return snap.val();
        }
        return {
            monthly_target: 30000,
            vat_rate: 15,
            invoice_footer: 'عبدالعزيز خميس أحمد النهدي\nرقم الحساب: 077040010006087202999\nرقم الآيبان (IBAN): SA38 8000 0859 6080 1720 2999',
            bank_account_name: 'عبدالعزيز خميس أحمد النهدي',
            bank_account_number: '077040010006087202999',
            bank_iban: 'SA38 8000 0859 6080 1720 2999',
            agency_name: 'رنان للإستشارات الإبداعية',
            email: 'hello@rannan.design',
            phone: '966555555555'
        };
    },

    saveSettingsData: async function(data) {
        await window.db.ref('settings').update(data);
        return "تم حفظ الإعدادات بنجاح";
    },

    updateBankSettings: async function(data) {
        let bankLine = data.bank_name ? `البنك: ${data.bank_name}\n` : '';
        let footerText = `${bankLine}${data.bank_account_name}\nرقم الحساب: ${data.bank_account_number}\nرقم الآيبان (IBAN): ${data.bank_iban}`;
        
        await window.db.ref('settings').update({
            bank_name: data.bank_name || '',
            bank_account_name: data.bank_account_name,
            bank_account_number: data.bank_account_number,
            bank_iban: data.bank_iban,
            invoice_footer: footerText,
            // نسخة عامة تقرؤها صفحة الحساب البنكي (bank.html) — بيانات تحويل فقط
            bank: {
                bank: data.bank_name || '',
                holder: data.bank_account_name,
                number: String(data.bank_account_number).replace(/\s+/g, ''),
                iban: String(data.bank_iban).replace(/\s+/g, '').toUpperCase(),
                updatedAt: new Date().toISOString()
            }
        });
        
        let snap = await window.db.ref('invoices').once('value');
        if (snap.exists()) {
            let updates = {};
            snap.forEach(child => {
                updates[child.key + '/footerText'] = footerText;
            });
            if (Object.keys(updates).length > 0) {
                await window.db.ref('invoices').update(updates);
            }
        }
        return "تم تحديث الحساب البنكي وتحديث جميع الفواتير بنجاح";
    },

    changeAdminPassword: async function(newPassword) {
        await window.db.ref('settings').update({ admin_password: newPassword });
        let snap = await window.db.ref('users').once('value');
        if (snap.exists()) {
            let updates = {};
            snap.forEach(child => {
                if (child.val().role === 'admin') {
                    updates[child.key + '/password'] = newPassword;
                }
            });
            if (Object.keys(updates).length > 0) {
                await window.db.ref('users').update(updates);
            }
        }
        return "تم تحديث رمز مرور الإدارة بنجاح";
    },

    getAllNotifications: async function() {
        let snap = await window.db.ref('notifications').once('value');
        let notifs = [];
        if (snap.exists()) {
            snap.forEach(child => {
                let val = child.val();
                notifs.push({
                    id: child.key,
                    client: val.client || 'عام',
                    type: val.type || 'info',
                    message: val.message || '',
                    isRead: !!val.isRead,
                    date: val.date || new Date().toISOString()
                });
            });
        }
        return notifs.reverse().slice(0, 100);
    },

    deleteClientFromSheet: async function(rowIndex) {
        return this.deleteClient(rowIndex);
    },


    // ── صفحة الروابط العامة (links.html) ────────────────────
    getLinksPage: async function() {
        let snap = await window.db.ref('linksPage').once('value');
        return snap.val();
    },

    saveLinksPage: async function(data) {
        await window.db.ref('linksPage').set({
            title: data.title || '',
            bio: data.bio || '',
            links: data.links || [],
            updatedAt: new Date().toISOString()
        });
        return "تم حفظ صفحة الروابط";
    },

    // ── الفواتير المتكررة ───────────────────────────────────
    getRecurringData: async function() {
        let snap = await window.db.ref('recurring').once('value');
        let list = [];
        if (snap.exists()) snap.forEach(child => {
            let v = child.val();
            v.id = child.key;
            v.items = v.items ? (Array.isArray(v.items) ? v.items : Object.values(v.items)) : [];
            list.push(v);
        });
        return list.reverse();
    },

    saveRecurring: async function(data) {
        let id = data.id || window.db.ref('recurring').push().key;
        let rec = {
            client: data.client,
            items: data.items || [],
            notes: data.notes || '',
            footerText: data.footerText || '',
            startPeriod: data.startPeriod,
            endPeriod: data.endPeriod || null,
            active: data.active !== false,
            updatedAt: new Date().toISOString()
        };
        if (!data.id) {
            rec.createdAt = rec.updatedAt;
            rec.issuedCount = 0;
            if (data.lastInvoice) rec.lastInvoice = data.lastInvoice;
        }
        await window.db.ref('recurring/' + id).update(rec);
        return { id: id };
    },

    deleteRecurring: async function(id) {
        await window.db.ref('recurring/' + id).remove();
        return "تم حذف الفاتورة المتكررة (الفواتير الصادرة منها باقية)";
    },

    // يُصدر كل فاتورة حان موعدها ولم تصدر بعد. آمن للتشغيل المتكرر ومن أكثر من جهاز:
    // كل شهر «يُحجز» بمعاملة ذرّية على lastIssued قبل إنشاء فاتورته، فلا تتكرر.
    issueDueRecurring: async function(opts) {
        opts = opts || {};
        const RP = window.RecurringPeriods;
        let stop = opts.forcePeriod || RP.lastDue(opts.today ? new Date(opts.today) : new Date());
        let snap = await window.db.ref('recurring').once('value');
        if (!snap.exists()) return [];
        let footer = (await window.db.ref('settings/invoice_footer').once('value')).val() || '';
        let list = [];
        snap.forEach(child => { list.push({ id: child.key, r: child.val() }); });
        let issued = [];
        for (const { id, r } of list) {
            if (!r.active || !r.client || !r.startPeriod) continue;
            if (opts.onlyId && opts.onlyId !== id) continue;
            let items = Array.isArray(r.items) ? r.items : Object.values(r.items || {});
            let amount = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0);
            for (let p = RP.nextDue(r), guard = 0; p <= stop && guard < 24; p = RP.next(p), guard++) {
                if (r.endPeriod && p > r.endPeriod) break;
                let previous = r.lastIssued || null;
                let claim = await window.db.ref('recurring/' + id + '/lastIssued').transaction(cur => (cur && cur >= p) ? undefined : p);
                if (!claim.committed) continue;
                try {
                    let res = await backendFunctions.saveInvoiceToSheet({
                        invoiceNumber: 'تلقائي',
                        clientSelect: r.client,
                        issueDate: RP.lastDay(p),
                        status: 'قيد الانتظار',
                        totalAmount: amount,
                        items: items,
                        footerText: r.footerText || footer,
                        recurringId: id,
                        notes: [r.notes, 'فاتورة شهرية — ' + RP.label(p)].filter(Boolean).join('\n')
                    });
                    r.issuedCount = (parseInt(r.issuedCount) || 0) + 1;
                    r.lastIssued = p;
                    await window.db.ref('recurring/' + id).update({ lastInvoice: res.id, issuedCount: r.issuedCount });
                    issued.push({ id: id, client: r.client, number: res.id, period: p, amount: amount });
                } catch (e) {
                    // فشل الإنشاء: أعد الشهر حتى تُعاد المحاولة في التشغيل القادم
                    await window.db.ref('recurring/' + id + '/lastIssued').set(previous);
                    throw e;
                }
            }
        }
        return issued;
    },

    // ── طلبات الموقع ─────────────────────────────────────────
    getRequestsData: async function() {
        let snap = await window.db.ref('requests').once('value');
        let list = [];
        if (snap.exists()) {
            snap.forEach(child => {
                let val = child.val();
                val.id = child.key;
                val.services = val.services ? (Array.isArray(val.services) ? val.services : Object.values(val.services)) : [];
                list.push(val);
            });
        }
        return list.reverse();
    },

    updateRequestStatus: async function(id, status) {
        let snap = await window.db.ref('requests/' + id).once('value');
        if (!snap.exists()) throw new Error('الطلب غير موجود');
        let req = snap.val();
        req.status = status;
        await window.db.ref('requests/' + id).update({ status: status, updatedAt: new Date().toISOString() });
        if (req.code && status !== 'تم التحويل') {
            await window.db.ref('track/' + req.code).set(RNAN.trackFromRequest(req));
        }
        return "تم تحديث حالة الطلب";
    },

    // يحوّل طلب الموقع إلى عميل (إن لم يكن موجودًا) + مشروع بنفس رقم التتبع
    convertRequestToProject: async function(id, opts) {
        opts = opts || {};
        let snap = await window.db.ref('requests/' + id).once('value');
        if (!snap.exists()) throw new Error('الطلب غير موجود');
        let req = snap.val();
        if (req.status === 'تم التحويل' && req.projectKey) throw new Error('هذا الطلب حُوّل لمشروع مسبقًا');

        // 1) العميل: الرابط المرسل من صفحة العميل، ثم المطابقة بالجوال، وإلا عميل جديد
        let clientKey = req.clientKey || null;
        let clientName = null;
        let isNewClient = false;
        let cSnap = await window.db.ref('clients').once('value');
        let reqPhone = RNAN.intlPhone(req.phone);
        cSnap.forEach(child => {
            let c = child.val();
            if (clientKey && child.key === clientKey) clientName = c.name || c.company;
            if (!clientKey && reqPhone && RNAN.intlPhone(c.phone) === reqPhone) {
                clientKey = child.key;
                clientName = c.name || c.company;
            }
        });
        let referrer = null;
        if (req.referrerKey) {
            let rSnap = await window.db.ref('clients/' + req.referrerKey).once('value');
            if (rSnap.exists()) referrer = Object.assign({ key: req.referrerKey }, rSnap.val());
        }
        if (!clientKey || !clientName) {
            clientName = req.company || req.name;
            clientKey = await backendFunctions._createClient({
                name: clientName,
                company: clientName,
                phone: req.phone,
                email: req.email || '',
                invitedBy: referrer ? (referrer.phone || referrer.name) : ''
            });
            isNewClient = true;
        }

        // 2) المشروع بنفس رقم تتبع الطلب
        let steps = [
            { text: "جمع البيانات", done: false },
            { text: "التصاميم الأولية", done: false },
            { text: "المراجعة والتعديل", done: false },
            { text: "التسليم النهائي", done: false }
        ];
        let notes = [req.details, req.links ? ('روابط مرجعية: ' + req.links) : '', req.budget ? ('الميزانية: ' + req.budget) : '', req.timeline ? ('المدة المطلوبة: ' + req.timeline) : '']
            .filter(Boolean).join('\n');
        let projData = {
            name: opts.name || RNAN.serviceTitles(req.services) || 'مشروع جديد',
            client: clientName,
            status: 'قيد التنفيذ',
            deadline: opts.deadline || '',
            value: opts.value || 0,
            progress: 0,
            steps: steps,
            startDate: new Date().toISOString().split('T')[0],
            notes: notes,
            code: req.code
        };
        let ref = await window.db.ref('projects').push(projData);
        await window.db.ref('track/' + req.code).set(RNAN.trackFromProject(projData, req.createdAt));
        await window.db.ref('requests/' + id).update({
            status: 'تم التحويل', projectKey: ref.key, clientKey: clientKey, updatedAt: new Date().toISOString()
        });
        backendFunctions.logNotification(clientName, "project_new", "بدأنا العمل على مشروعك '" + projData.name + "' برقم تتبع " + req.code + ".");

        // 3) مكافأة الدعوة: تُمنح مرة واحدة عند أول مشروع لعميل جديد
        if (referrer && isNewClient && referrer.key !== clientKey) {
            await window.db.ref('clients/' + referrer.key + '/points').transaction(p => (parseInt(p) || 0) + RNAN.REFERRAL_BONUS);
            backendFunctions.logNotification(referrer.name || referrer.company, "referral_bonus", "🎁 حصلت على " + RNAN.REFERRAL_BONUS + " نقطة لأن " + clientName + " انضم لرنان عن طريق دعوتك.");
        }
        return { clientKey: clientKey, projectKey: ref.key, clientName: clientName, isNewClient: isNewClient };
    },

    deleteRequest: async function(id) {
        let snap = await window.db.ref('requests/' + id).once('value');
        let req = snap.val() || {};
        await window.db.ref('requests/' + id).remove();
        // رقم التتبع يبقى فعّالًا إذا تحوّل الطلب لمشروع
        if (req.code && !req.projectKey) await window.db.ref('track/' + req.code).remove();
        return "تم حذف الطلب";
    },

    // ── رسائل نموذج التواصل ─────────────────────────────────
    getMessagesData: async function() {
        let snap = await window.db.ref('messages').once('value');
        let list = [];
        if (snap.exists()) snap.forEach(child => { let v = child.val(); v.id = child.key; list.push(v); });
        return list.reverse();
    },
    markMessageRead: async function(id) {
        await window.db.ref('messages/' + id).update({ isRead: true });
        return "ok";
    },
    deleteMessage: async function(id) {
        await window.db.ref('messages/' + id).remove();
        return "تم حذف الرسالة";
    },

    // ── استبدال النقاط (تُنشأ من صفحة العميل) ───────────────
    getRedemptionsData: async function() {
        let snap = await window.db.ref('redemptions').once('value');
        let list = [];
        if (snap.exists()) snap.forEach(child => { let v = child.val(); v.id = child.key; list.push(v); });
        return list.reverse();
    },
    markRedemptionUsed: async function(id) {
        await window.db.ref('redemptions/' + id).update({ status: 'مستخدم', usedAt: new Date().toISOString() });
        return "تم تعليم الكوبون كمستخدم";
    },

    // ── معرض الأعمال ────────────────────────────────────────
    getPortfolioData: async function() {
        let snap = await window.db.ref('portfolio').once('value');
        let list = [];
        if (snap.exists()) snap.forEach(child => { let v = child.val(); v.id = child.key; list.push(v); });
        return list.sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    // data: { id?, title, category, client, year, description, tags[], thumb, full?, order }
    savePortfolioItem: async function(data) {
        let id = data.id || window.db.ref('portfolio').push().key;
        let item = {
            title: data.title || '',
            category: data.category || 'branding',
            client: data.client || '',
            year: data.year || '',
            description: data.description || '',
            tags: data.tags || [],
            order: data.order != null ? data.order : Date.now(),
            updatedAt: new Date().toISOString()
        };
        if (data.thumb) item.thumb = data.thumb;
        if (data.full) item.hasFull = true;
        await window.db.ref('portfolio/' + id).update(item);
        if (data.full) await window.db.ref('portfolioImages/' + id).set(data.full);
        return { id: id, message: "تم حفظ العمل في المعرض" };
    },

    deletePortfolioItem: async function(id) {
        await window.db.ref().update({ ['portfolio/' + id]: null, ['portfolioImages/' + id]: null });
        return "تم حذف العمل من المعرض";
    },

    // ── بيانات الموقع العام (التواصل والإحصائيات) ───────────
    getSiteSettings: async function() {
        let snap = await window.db.ref('settings/site').once('value');
        return snap.val() || {};
    },
    saveSiteSettings: async function(data) {
        await window.db.ref('settings/site').set(data);
        return "تم حفظ بيانات الموقع";
    }
};

// Polyfill window.google.script.run
function createRunProxy(successCallback = null, failureCallback = null) {
    return new Proxy({}, {
        get: function(target, prop) {
            if (prop === 'withSuccessHandler') {
                return (callback) => createRunProxy(callback, failureCallback);
            }
            if (prop === 'withFailureHandler') {
                return (callback) => createRunProxy(successCallback, callback);
            }
            return function(...args) {
                if (backendFunctions[prop]) {
                    backendFunctions[prop](...args)
                        .then(res => {
                            if (successCallback) successCallback(res);
                        })
                        .catch(err => {
                            if (failureCallback) {
                                failureCallback(err);
                            } else {
                                console.error("Backend Error in " + prop + ":", err);
                            }
                        });
                } else {
                    console.error("Function " + prop + " not implemented in Firebase shim");
                    if (failureCallback) {
                        failureCallback(new Error("Function " + prop + " not implemented in Firebase shim"));
                    }
                }
            };
        }
    });
}

window.google = window.google || {};
window.google.script = window.google.script || {};
window.google.script.run = createRunProxy(null, null);
