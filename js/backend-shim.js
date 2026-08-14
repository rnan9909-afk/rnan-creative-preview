/**
 * Backend Shim to replace Google Apps Script (google.script.run)
 * Translates calls to Firebase Realtime Database
 */

const backendFunctions = {
    checkLogin: async function(input) {
        if (!window.db) return { success: false, message: "Firebase not initialized" };
        let isClient = false;
        let isAdmin = false;
        let foundUser = null;
        let cleanInput = String(input).replace(/\s+/g, '');
        
        let snap = await window.db.ref('users').once('value');
        if (snap.exists()) {
            snap.forEach(child => {
                if (child.val().password === input) {
                    isAdmin = true;
                    foundUser = child.val();
                }
            });
        }
        
        if (isAdmin) {
            return { success: true, type: 'admin', name: foundUser.name || 'مدير' };
        }
        
        let cSnap = await window.db.ref('clients').once('value');
        if (cSnap.exists()) {
            cSnap.forEach(child => {
                let phone = child.val().phone || '';
                if (phone.replace(/\s+/g, '') === cleanInput && cleanInput !== '') {
                    isClient = true;
                    foundUser = child.val();
                    foundUser.id = child.key;
                }
            });
        }
        
        if (isClient) {
            return { 
                success: true, 
                type: 'client', 
                name: foundUser.name || foundUser.company,
                phone: foundUser.phone,
                points: foundUser.points || 0,
                totalSpent: foundUser.totalSpent || 0
            };
        }
        
        return { success: false };
    },

    getClientsData: async function() {
        let snap = await window.db.ref('clients').once('value');
        let clients = [];
        if (snap.exists()) {
            snap.forEach(child => {
                let val = child.val();
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
                    invitedBy: val.invitedBy || ''
                });
            });
        }
        return clients;
    },

    saveClientToSheet: async function(data) {
        if (data.rowIndex) {
            await window.db.ref('clients/' + data.rowIndex).update({
                name: data.clientName,
                company: data.companyName,
                phone: data.phone
            });
            return "تم تحديث بيانات العميل بنجاح";
        } else {
            await window.db.ref('clients').push({
                name: data.clientName,
                company: data.companyName,
                phone: data.phone,
                status: 'نشط',
                points: 0,
                totalSpent: 0,
                invitedBy: data.invitedBy || '',
                dateAdded: new Date().toISOString()
            });
            return "تمت إضافة العميل بنجاح";
        }
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
        let invoiceId = isUpdate ? data.invoiceNumber : 'INV-2026-' + Math.floor(Math.random() * 10000); // Simplistic ID generator for demo
        
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
        if (snap.exists()) {
            snap.forEach(child => {
                let val = child.val();
                projects.push({
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
                    review: val.review || ''
                });
            });
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
        
        if (data.rowIndex) {
            await window.db.ref('projects/' + data.rowIndex).update(projData);
            return "تم تحديث المشروع بنجاح";
        } else {
            backendFunctions.logNotification(data.client, "project_new", "تم إنشاء مشروع جديد باسم '" + data.name + "'.");
            await window.db.ref('projects').push(projData);
            return "تم حفظ المشروع الجديد";
        }
    },

    deleteProjectFromSheet: async function(rowIndex) {
        await window.db.ref('projects/' + rowIndex).remove();
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
        await window.db.ref('clients/' + rowIndex).remove();
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
        let footerText = `${data.bank_account_name}\nرقم الحساب: ${data.bank_account_number}\nرقم الآيبان (IBAN): ${data.bank_iban}`;
        
        await window.db.ref('settings').update({
            bank_account_name: data.bank_account_name,
            bank_account_number: data.bank_account_number,
            bank_iban: data.bank_iban,
            invoice_footer: footerText
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
