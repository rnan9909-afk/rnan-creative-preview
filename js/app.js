/**
 * App Orchestrator & Router - Rannan Creative System
 */

import { AuthComponent } from './components/auth.js';
import { DashboardComponent } from './components/dashboard.js';
import { ClientsComponent } from './components/clients.js';
import { ProjectsComponent } from './components/projects.js';
import { InvoicesComponent } from './components/invoices.js';
import { PortfolioComponent } from './components/portfolio.js';
import { SettingsComponent } from './components/settings.js';
import { NotificationsComponent } from './components/notifications.js';

window.currentPage = 'dashboard';
window.appData = null;

// Initialize App
function initApp() {
    const userType = localStorage.getItem('userType');
    
    // Bind global logout
    window.logout = logout;

    if (!userType) {
        // Show login screen
        showAuthScreen();
    } else {
        // Logged in
        showMainApp(userType);
    }
}

// Show login screen overlay
function showAuthScreen() {
    // Hide main wrapper, show auth container
    const wrapper = document.getElementById('app-wrapper');
    if (wrapper) wrapper.classList.add('hidden');
    
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
        authContainer.classList.remove('hidden');
        AuthComponent.render('auth-container', (res) => {
            // Success callback
            authContainer.classList.add('hidden');
            showMainApp(res.type);
        });
    }
}

// Set up UI for authenticated state
function showMainApp(role) {
    const wrapper = document.getElementById('app-wrapper');
    if (wrapper) wrapper.classList.remove('hidden');
    
    // Configure Sidebar options visibility
    setupSidebar(role);
    
    // Bind Sidebar navigation events
    bindNavEvents();

    // Bind Mobile Sidebar toggles
    bindMobileEvents();

    // Initial Load of all data
    window.loadAllData();
}

// Show/Hide sidebar links based on role
function setupSidebar(role) {
    const adminItems = document.querySelectorAll('.admin-nav-item');
    if (role === 'admin') {
        adminItems.forEach(el => el.classList.remove('hidden'));
    } else {
        adminItems.forEach(el => el.classList.add('hidden'));
    }
    
    // Set Profile details
    const userName = localStorage.getItem('userName') || 'مستخدم رنان';
    const nameDisplay = document.getElementById('user-name-display');
    const avatarDisplay = document.getElementById('user-avatar-display');
    
    if (nameDisplay) nameDisplay.textContent = userName;
    if (avatarDisplay) avatarDisplay.textContent = userName.charAt(0);
}

// Bind clicks on navigation items
function bindNavEvents() {
    document.querySelectorAll('[data-page]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = el.getAttribute('data-page');
            window.switchPage(pageId);
            
            // Close mobile sidebar if open
            const sidebar = document.getElementById('sidebar');
            if (sidebar && !sidebar.classList.contains('translate-x-full')) {
                sidebar.classList.add('translate-x-full');
            }
        });
    });
}

// Mobile sidebar behavior
function bindMobileEvents() {
    const toggleBtn = document.getElementById('mobile-sidebar-toggle');
    const closeBtn = document.getElementById('mobile-sidebar-close');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.remove('translate-x-full');
        });
    }

    if (closeBtn && sidebar) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.add('translate-x-full');
        });
    }
}

// Fetch all database entities asynchronously
window.loadAllData = function() {
    const userType = localStorage.getItem('userType');
    const userName = localStorage.getItem('userName');
    
    if (!userType) return;
    
    // Show top indicator/spinner if available
    const refreshIndicator = document.getElementById('data-loading-indicator');
    if (refreshIndicator) refreshIndicator.classList.remove('hidden');

    const pClients = new Promise((resolve) => {
        window.google.script.run.withSuccessHandler((res) => {
            resolve(res || []);
        }).getClientsData();
    });

    const pInvoices = new Promise((resolve) => {
        window.google.script.run.withSuccessHandler((res) => {
            resolve(res || []);
        }).getInvoicesData();
    });

    const pProjects = new Promise((resolve) => {
        window.google.script.run.withSuccessHandler((res) => {
            resolve(res || []);
        }).getProjectsData();
    });

    const pSettings = new Promise((resolve) => {
        window.google.script.run.withSuccessHandler((res) => {
            resolve(res || {});
        }).getSettingsData();
    });

    const pNotifications = new Promise((resolve) => {
        if (userType === 'admin') {
            window.google.script.run.withSuccessHandler((res) => {
                resolve(res || []);
            }).getAllNotifications();
        } else {
            window.google.script.run.withSuccessHandler((res) => {
                resolve(res || []);
            }).getClientUpdates(userName);
        }
    });

    Promise.all([pClients, pInvoices, pProjects, pSettings, pNotifications])
        .then(([clients, invoices, projects, settings, notifications]) => {
            window.appData = { clients, invoices, projects, settings, notifications };
            
            // Render all components into their DOM containers
            window.renderAllComponents();
            
            // Switch to the current active page to apply displays
            window.switchPage(window.currentPage || 'dashboard');
            
            // Update unread notification badges
            updateNotificationBadges(notifications);

            if (refreshIndicator) refreshIndicator.classList.add('hidden');
        })
        .catch(err => {
            console.error("Error loading application datasets:", err);
            if (refreshIndicator) refreshIndicator.classList.add('hidden');
        });
};

// Render all component modules in the document
window.renderAllComponents = function() {
    if (!window.appData) return;

    DashboardComponent.render('dashboard-page', window.appData);
    PortfolioComponent.render('portfolio-page');
    NotificationsComponent.render('notifications-page', window.appData);
    ProjectsComponent.render('projects-page', window.appData);
    
    // Only render admin panels if admin
    const role = localStorage.getItem('userType');
    if (role === 'admin') {
        ClientsComponent.render('clients-page', window.appData);
        InvoicesComponent.render('invoices-page', window.appData);
        SettingsComponent.render('settings-page', window.appData);
    }
};

// Routing: Toggle pages in SPA
window.switchPage = function(pageId) {
    const role = localStorage.getItem('userType');
    if (!role) return;

    // Route guards
    if (role === 'client' && ['clients', 'invoices', 'settings'].includes(pageId)) {
        pageId = 'dashboard';
    }

    window.currentPage = pageId;

    // Show selected container, hide others
    const allPages = ['dashboard', 'clients', 'projects', 'invoices', 'portfolio', 'settings', 'notifications'];
    allPages.forEach(p => {
        const el = document.getElementById(`${p}-page`);
        if (el) {
            if (p === pageId) {
                el.classList.remove('hidden');
                el.classList.add('block');
            } else {
                el.classList.add('hidden');
                el.classList.remove('block');
            }
        }
    });

    // Toggle navigation classes
    document.querySelectorAll('[data-page]').forEach(nav => {
        const p = nav.getAttribute('data-page');
        if (p === pageId) {
            nav.classList.add('active-nav-link');
            nav.classList.remove('text-slate-400', 'hover:bg-white/5', 'hover:text-white');
        } else {
            nav.classList.remove('active-nav-link');
            nav.classList.add('text-slate-400', 'hover:bg-white/5', 'hover:text-white');
        }
    });

    // Update section page title in topbar
    const titleEl = document.getElementById('navbar-page-title');
    if (titleEl) {
        const titles = {
            dashboard: 'لوحة القيادة الإبداعية',
            clients: 'شركاء النجاح',
            projects: 'المشاريع الفنية',
            invoices: 'الفواتير والمستحقات',
            portfolio: 'معرض الأعمال',
            settings: 'إعدادات النظام',
            notifications: 'التنبيهات والتحديثات'
        };
        titleEl.textContent = titles[pageId] || 'لوحة التحكم';
    }
};

// Update Notification counter badges
function updateNotificationBadges(notifications) {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const badge = document.getElementById('navbar-notif-badge');
    const sidebarBadge = document.getElementById('sidebar-notif-badge');
    
    if (badge) {
        if (unreadCount > 0) {
            badge.classList.remove('hidden');
            badge.textContent = unreadCount;
        } else {
            badge.classList.add('hidden');
        }
    }

    if (sidebarBadge) {
        if (unreadCount > 0) {
            sidebarBadge.classList.remove('hidden');
            sidebarBadge.textContent = unreadCount;
        } else {
            sidebarBadge.classList.add('hidden');
        }
    }
}

// Logout session clear
function logout() {
    localStorage.clear();
    window.appData = null;
    initApp();
}

// Dom Ready init
document.addEventListener('DOMContentLoaded', initApp);
export default { initApp };
