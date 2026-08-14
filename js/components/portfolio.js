/**
 * Portfolio Component - Creative Showcase Grid & Lightbox
 */

export const PortfolioComponent = {
    currentCategory: 'all',
    
    items: [
        {
            id: 'branding-1',
            title: 'الهوية البصرية لمجموعة رنان الإبداعية',
            category: 'branding',
            categoryName: 'الهوية البصرية',
            image: 'images/brand_mockup.png',
            client: 'شركة رنان القابضة',
            year: '2026',
            description: 'تصميم هوية بصرية متكاملة تعكس التطور والابتكار الفني والتقني، تشمل شعار الشركة، القرطاسية، دليل استخدام العلامة التجارية، والنمذجة ثلاثية الأبعاد للمطبوعات.',
            tags: ['شعار', 'هوية بصرية', 'دليل العلامة', 'قرطاسية فاخرة'],
            tools: ['Adobe Illustrator', 'Adobe Photoshop', 'Cinema 4D']
        },
        {
            id: 'uiux-1',
            title: 'منصة رنان الرقمية - واجهات وتطبيقات',
            category: 'ui',
            categoryName: 'تصميم واجهات المستخدم',
            image: 'images/ui_mockup.png',
            client: 'تطبيق رنان للمحترفين',
            year: '2026',
            description: 'دراسة وتصميم وتطوير واجهات المستخدم وتجربة الاستخدام (UI/UX) للوحة التحكم الفاخرة وتطبيق الجوال المتناسق، مع مراعاة أعلى معايير سهولة الاستخدام والوصول.',
            tags: ['UI/UX', 'تطبيق جوال', 'لوحة تحكم', 'تصميم تفاعلي'],
            tools: ['Figma', 'Adobe XD', 'Prototyping']
        },
        {
            id: 'social-1',
            title: 'حملة إعلانية مبتكرة لشبكات التواصل',
            category: 'social',
            categoryName: 'شبكات التواصل الاجتماعي',
            image: 'images/social_mockup.png',
            client: 'مهرجان الرياض للتصميم',
            year: '2025',
            description: 'سلسلة منشورات إعلانية إبداعية وتصميمات تفاعلية مصممة خصيصاً لمنصات التواصل الاجتماعي، تهدف إلى إبراز الجانب الفني ورفع نسبة المشاركة والتفاعل بشكل ملموس.',
            tags: ['منشورات إبداعية', 'حملة إعلانية', 'سوشيال ميديا', 'إنستغرام'],
            tools: ['Adobe Illustrator', 'Adobe Photoshop', 'After Effects']
        },
        {
            id: 'print-1',
            title: 'مطبوعات وملصقات فنية راقية',
            category: 'print',
            categoryName: 'المطبوعات الفنية',
            image: 'images/print_mockup.png',
            client: 'متحف الفن المعاصر',
            year: '2025',
            description: 'تصميمات مطبوعة فاخرة تشمل مجلات فنية، بطاقات أعمال منسوجة بتقنيات حفر مبتكرة، بروشورات تعريفية للشركات، وملصقات جدارية فنية بطابع حداثي متميز.',
            tags: ['مطبوعات فاخرة', 'كتيبات', 'بطاقات أعمال', 'بوسترات'],
            tools: ['Adobe InDesign', 'Adobe Illustrator', 'Print Production']
        }
    ],

    render: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Filter items
        const filteredItems = this.currentCategory === 'all'
            ? this.items
            : this.items.filter(item => item.category === this.currentCategory);

        container.innerHTML = `
            <div class="space-y-12 animate-fade-in">
                <!-- Header & Intro -->
                <div class="text-center max-w-2xl mx-auto space-y-4">
                    <h1 class="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">معرض روائع رنان</h1>
                    <p class="text-sm text-slate-300 leading-relaxed">
                        نحن لا نصمم فقط، بل نخلق تجارب بصرية فريدة تروي قصصاً وتجسد قيماً. استعرض نخبة من أعمالنا الإبداعية في مجالات الهوية الرقمية، المطبوعات، وتصميمات واجهات المستخدم.
                    </p>
                </div>

                <!-- Filters -->
                <div class="flex flex-wrap justify-center gap-2 p-1.5 bg-white/5 border border-white/5 rounded-2xl max-w-lg mx-auto">
                    <button data-cat="all" class="px-5 py-2 rounded-xl text-xs font-bold transition-all ${this.currentCategory === 'all' ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow-primary' : 'text-slate-400 hover:text-white'}">الكل</button>
                    <button data-cat="branding" class="px-5 py-2 rounded-xl text-xs font-bold transition-all ${this.currentCategory === 'branding' ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow-primary' : 'text-slate-400 hover:text-white'}">الهوية البصرية</button>
                    <button data-cat="ui" class="px-5 py-2 rounded-xl text-xs font-bold transition-all ${this.currentCategory === 'ui' ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow-primary' : 'text-slate-400 hover:text-white'}">واجهات المستخدم</button>
                    <button data-cat="social" class="px-5 py-2 rounded-xl text-xs font-bold transition-all ${this.currentCategory === 'social' ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow-primary' : 'text-slate-400 hover:text-white'}">التواصل الاجتماعي</button>
                    <button data-cat="print" class="px-5 py-2 rounded-xl text-xs font-bold transition-all ${this.currentCategory === 'print' ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow-primary' : 'text-slate-400 hover:text-white'}">المطبوعات</button>
                </div>

                <!-- Masonry/Grid Showcase -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    ${filteredItems.map(item => `
                        <div class="portfolio-card group cursor-pointer aspect-[1.4/1] relative overflow-hidden rounded-3xl border border-white/10" data-id="${item.id}">
                            <!-- Image -->
                            <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover">
                            
                            <!-- Hover Overlay -->
                            <div class="portfolio-overlay absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                                <div class="space-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
                                    <div class="flex items-center justify-between">
                                        <span class="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-extrabold uppercase tracking-wide">
                                            ${item.categoryName}
                                        </span>
                                        <span class="text-[10px] text-slate-400 en-num font-medium">${item.year}</span>
                                    </div>
                                    
                                    <h3 class="text-xl md:text-2xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-slate-100 group-hover:to-accent transition-all duration-300">
                                        ${item.title}
                                    </h3>
                                    
                                    <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                        ${item.description}
                                    </p>
                                    
                                    <!-- Tags -->
                                    <div class="flex flex-wrap gap-1.5 pt-2">
                                        ${item.tags.map(t => `<span class="text-[10px] bg-white/5 border border-white/5 text-slate-300 px-2 py-0.5 rounded-md">${t}</span>`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Studio Philosophy Widget -->
                <div class="glass-panel p-8 rounded-3xl border border-white/5 relative overflow-hidden mt-12">
                    <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-secondary/10 rounded-full filter blur-[80px] pointer-events-none"></div>
                    <div class="absolute -left-20 -top-20 w-80 h-80 bg-primary/10 rounded-full filter blur-[80px] pointer-events-none"></div>
                    
                    <div class="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                        <div class="space-y-4 text-right">
                            <h3 class="text-2xl font-black text-white">هل لديك مشروع جديد ترغب بتصميمه؟</h3>
                            <p class="text-sm text-slate-300 max-w-xl leading-relaxed">
                                تواصل معنا مباشرة لمناقشة أفكارك الإبداعية وتحويلها إلى لوحات فنية واقعية. بصفتنا شريكاً إبداعياً، سنساعدك على تحقيق التميز البصري الكامل لعلامتك التجارية.
                            </p>
                        </div>
                        
                        <a href="https://wa.me/966555555555" target="_blank" class="btn-glow px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-2xl font-bold flex items-center gap-2 text-sm whitespace-nowrap">
                            <span class="material-symbols-rounded text-lg">chat</span>
                            ابدأ مشروعك الآن
                        </a>
                    </div>
                </div>
            </div>

            <!-- Lightbox Modal Container -->
            <div id="portfolioLightbox" class="modal fixed inset-0 z-[90] bg-black/95 backdrop-blur-md items-center justify-center p-4">
                <div class="glass-modal w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row relative overflow-hidden modal-content-anim max-h-[90vh]">
                    <button id="close-lightbox-btn" class="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/60 border border-white/10 hover:bg-white/15 text-white flex items-center justify-center transition z-20">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                    
                    <!-- Left: Large Image Show -->
                    <div class="w-full md:w-3/5 bg-black/40 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                        <img id="lightbox-img" src="" alt="Showcase" class="w-full h-full object-contain max-h-[85vh]">
                    </div>

                    <!-- Right: Info Panel -->
                    <div class="w-full md:w-2/5 p-8 overflow-y-auto flex flex-col justify-between border-t md:border-t-0 md:border-r border-white/5 space-y-6">
                        <div class="space-y-6">
                            <div class="space-y-2">
                                <span id="lightbox-category" class="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-extrabold"></span>
                                <h3 id="lightbox-title" class="text-2xl font-black text-white pt-1"></h3>
                            </div>
                            
                            <p id="lightbox-desc" class="text-sm text-slate-300 leading-relaxed"></p>
                            
                            <!-- Project Details Table -->
                            <div class="space-y-3 bg-white/5 border border-white/5 rounded-2xl p-4">
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-slate-400">العميل</span>
                                    <span id="lightbox-client" class="text-white font-bold"></span>
                                </div>
                                <div class="flex justify-between items-center text-xs">
                                    <span class="text-slate-400">سنة الإنتاج</span>
                                    <span id="lightbox-year" class="text-white font-bold en-num"></span>
                                </div>
                            </div>

                            <!-- Tools Used -->
                            <div class="space-y-2">
                                <h4 class="text-xs font-bold text-slate-300">أدوات العمل والتقنيات</h4>
                                <div id="lightbox-tools" class="flex flex-wrap gap-1.5"></div>
                            </div>
                        </div>

                        <div class="pt-4 border-t border-white/5 flex gap-3">
                            <a id="lightbox-wa-btn" href="" target="_blank" class="flex-1 btn-glow py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs">
                                <span class="material-symbols-rounded text-base">chat</span>
                                طلب تصميم مماثل
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind Filters
        const filterBtns = container.querySelectorAll('button[data-cat]');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentCategory = btn.getAttribute('data-cat');
                this.render(containerId);
            });
        });

        // Lightbox elements
        const lightbox = document.getElementById('portfolioLightbox');
        const closeLightboxBtn = document.getElementById('close-lightbox-btn');
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCategory = document.getElementById('lightbox-category');
        const lightboxTitle = document.getElementById('lightbox-title');
        const lightboxDesc = document.getElementById('lightbox-desc');
        const lightboxClient = document.getElementById('lightbox-client');
        const lightboxYear = document.getElementById('lightbox-year');
        const lightboxTools = document.getElementById('lightbox-tools');
        const lightboxWaBtn = document.getElementById('lightbox-wa-btn');

        const closeLightbox = () => {
            if (lightbox) lightbox.classList.remove('open');
        };

        if (closeLightboxBtn) {
            closeLightboxBtn.addEventListener('click', closeLightbox);
        }
        if (lightbox) {
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) closeLightbox();
            });
        }

        // Open Lightbox Event Binding
        const cards = container.querySelectorAll('.portfolio-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const itemId = card.getAttribute('data-id');
                const item = this.items.find(i => i.id === itemId);
                if (!item) return;

                // Populate lightbox
                lightboxImg.src = item.image;
                lightboxCategory.textContent = item.categoryName;
                lightboxTitle.textContent = item.title;
                lightboxDesc.textContent = item.description;
                lightboxClient.textContent = item.client;
                lightboxYear.textContent = item.year;
                
                lightboxTools.innerHTML = item.tools.map(tool => `
                    <span class="text-[10px] bg-[#0d0d12] border border-white/10 text-slate-300 px-2.5 py-1 rounded-lg font-medium">${tool}</span>
                `).join('');

                const message = encodeURIComponent(`مرحباً رنان الإبداعية، أرغب بالاستفسار عن تصميم مماثل لمشروع: "${item.title}" المعروض في معرض الأعمال.`);
                lightboxWaBtn.href = `https://api.whatsapp.com/send?phone=966555555555&text=${message}`;

                lightbox.classList.add('open');
            });
        });
    }
};
