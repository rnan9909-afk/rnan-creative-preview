/**
 * Auth Component - Handles Glassmorphic Login & Authentication
 */

export const AuthComponent = {
    render: function(containerId, onLoginSuccess) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div id="login-overlay" class="fixed inset-0 z-[100] flex items-center justify-center bg-[#07070a] overflow-hidden">
                <!-- Glowing Orbs in Background -->
                <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full filter blur-[120px] animate-pulse"></div>
                <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/15 rounded-full filter blur-[120px] animate-pulse" style="animation-delay: 2s;"></div>

                <div class="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden mx-4 animate-slide-up">
                    <!-- Top accent line -->
                    <div class="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-primary via-secondary to-accent"></div>
                    
                    <div class="flex flex-col items-center mb-8">
                        <div class="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary to-secondary p-[2px] mb-4 shadow-glow-primary animate-glow">
                            <div class="w-full h-full bg-[#0d0d12] rounded-2xl flex items-center justify-center">
                                <span class="material-symbols-rounded text-3xl text-white">fingerprint</span>
                            </div>
                        </div>
                        <h2 class="text-2xl font-black text-white tracking-wide">نظام رنان الإبداعي</h2>
                        <p class="text-xs text-muted mt-2">بوابة التحكم وإدارة المشاريع الفنية</p>
                    </div>

                    <div class="space-y-6">
                        <div>
                            <label class="block text-xs font-bold text-slate-300 mb-2 mr-1">رمز الدخول أو رقم الجوال</label>
                            <div class="relative">
                                <span class="material-symbols-rounded absolute right-3 top-3.5 text-muted text-lg">vpn_key</span>
                                <input type="password" id="login-input" placeholder="أدخل الرمز أو رقم الهاتف..." 
                                    class="form-input-modern pr-10 text-center en-num text-lg font-semibold tracking-widest placeholder:tracking-normal placeholder:text-sm">
                            </div>
                        </div>

                        <div id="login-error" class="hidden flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs animate-fade-in">
                            <span class="material-symbols-rounded text-sm">error</span>
                            <span id="login-error-text">رمز الدخول أو رقم الجوال غير صحيح</span>
                        </div>

                        <button id="login-btn" class="w-full btn-glow bg-gradient-to-r from-primary to-secondary text-white py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                            <span class="material-symbols-rounded text-lg">login</span>
                            دخول للنظام
                        </button>
                    </div>

                    <div class="mt-8 pt-6 border-t border-white/5 text-center">
                        <p class="text-[10px] text-muted-600 text-slate-500">© 2026 رنان للإستشارات الإبداعية. جميع الحقوق محفوظة.</p>
                        <p class="text-[10px] text-slate-600 mt-1.5">صنع بـ<span class="text-rose-500 animate-pulse">♥</span></p>
                    </div>
                </div>
            </div>
        `;

        // Bind events
        const loginBtn = document.getElementById('login-btn');
        const loginInput = document.getElementById('login-input');
        const errorMsg = document.getElementById('login-error');
        const errorText = document.getElementById('login-error-text');

        const attemptLogin = () => {
            const val = loginInput.value.trim();
            if (!val) return;

            loginBtn.disabled = true;
            loginBtn.innerHTML = '<div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>';
            errorMsg.classList.add('hidden');

            window.google.script.run.withSuccessHandler((res) => {
                if (res && res.success) {
                    localStorage.setItem('userType', res.type);
                    localStorage.setItem('userName', res.name);
                    
                    if (res.type === 'client') {
                        localStorage.setItem('userId', res.id || '');
                        localStorage.setItem('userPhone', res.phone || '');
                        localStorage.setItem('userPoints', res.points || 0);
                        localStorage.setItem('userTotalSpent', res.totalSpent || 0);
                    }

                    // Remove login overlay
                    const overlay = document.getElementById('login-overlay');
                    if (overlay) overlay.remove();

                    if (onLoginSuccess) onLoginSuccess(res);
                } else {
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span class="material-symbols-rounded text-lg">login</span> دخول للنظام';
                    errorText.textContent = 'رمز الدخول أو رقم الجوال غير صحيح';
                    errorMsg.classList.remove('hidden');
                }
            }).checkLogin(val);
        };

        loginBtn.addEventListener('click', attemptLogin);
        loginInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
    }
};
