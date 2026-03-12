/**
 * Restaurant Demo - JavaScript principal
 * Funcionalidad del sitio (menú móvil, scroll suave, etc.)
 */

(function () {
    'use strict';

    // ===== AOS (Animate On Scroll) – scroll reveal suave =====
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,           // 700–900ms: suave pero con respuesta rápida
            once: true,
            offset: 120,
            easing: 'ease-out-quart', // easing más elegante que se desacelera al final
            disable: function () {
                // Respeta prefers-reduced-motion
                return window.matchMedia &&
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            }
        });
    }

    // ===== Navbar + barra de progreso de scroll + parallax hero =====
    const navbar = document.getElementById('navbar');
    const scrollProgress = document.getElementById('scroll-progress');
    const heroSection = document.querySelector('.hero-section');

    // Parallax: control de estado y suavizado
    let lastKnownScrollY = 0;
    let parallaxTicking = false;

    function shouldEnableHeroParallax() {
        if (!heroSection) return false;
        if (window.innerWidth <= 768) return false; // solo desktop/tablet grande
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return false;
        }
        return true;
    }

    function updateHeroParallax() {
        if (!heroSection) return;

        if (!shouldEnableHeroParallax()) {
            // Restaurar posición por defecto cuando no se use el efecto
            heroSection.style.backgroundPosition = '';
            parallaxTicking = false;
            return;
        }

        const offset = lastKnownScrollY * 0.25; // factor sutil
        heroSection.style.backgroundPosition = 'center ' + offset + 'px';
        parallaxTicking = false;
    }

    function updateNavbarOnScroll() {
        if (!navbar) return;
        if (window.scrollY > 10) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    }

    function updateScrollProgress() {
        if (!scrollProgress) return;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? scrollTop / docHeight : 0;
        scrollProgress.style.width = (progress * 100) + '%';
        scrollProgress.style.opacity = progress > 0 ? '1' : '0';
    }

    function handleScroll() {
        updateNavbarOnScroll();
        updateScrollProgress();
        // Parallax hero: usar requestAnimationFrame para suavizar
        if (!parallaxTicking) {
            lastKnownScrollY = window.scrollY || document.documentElement.scrollTop || 0;
            parallaxTicking = true;
            window.requestAnimationFrame(updateHeroParallax);
        } else {
            lastKnownScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateHeroParallax);
    handleScroll();
    updateHeroParallax();

    // ===== Tabs del menú (categorías) =====
    var menuTabs = document.querySelectorAll('[data-menu-tab]');
    var menuItems = document.querySelectorAll('[data-menu-category]');

    // Animación inicial (stagger) al cargar la página sobre los items visibles
    function runInitialMenuStagger() {
        if (!menuItems.length) return;

        var visibleItems = [];

        menuItems.forEach(function (item) {
            if (!item.classList.contains('menu-item-hidden')) {
                visibleItems.push(item);
            }
        });

        visibleItems.forEach(function (item, index) {
            // Reiniciar estado de animación
            item.classList.remove('menu-item-visible');
            // Forzar reflow para que tome opacity:0, translateY(20px)
            item.offsetHeight;
            setTimeout(function () {
                item.classList.add('menu-item-visible');
            }, index * 80);
        });
    }

    function activateMenuCategory(category) {
        if (!menuTabs.length || !menuItems.length) return;

        // Actualizar estado visual de las tabs
        menuTabs.forEach(function (tab) {
            var isActive = tab.getAttribute('data-menu-tab') === category;
            tab.classList.toggle('menu-tab-active', isActive);
        });

        // Primero, decidir qué items deben mostrarse y preparar el stagger
        var visibleItems = [];

        menuItems.forEach(function (item) {
            var itemCategory = item.getAttribute('data-menu-category');
            var shouldShow = category === 'todos'
                ? true
                : (itemCategory === category);

            // Reiniciar estado de animación y ocultar por defecto
            item.classList.remove('menu-item-visible');

            if (shouldShow) {
                // Marcamos como oculto primero; se mostrará en el stagger
                item.classList.add('menu-item-hidden');
                visibleItems.push(item);
            } else {
                item.classList.add('menu-item-hidden');
            }
        });

        // Aplicar stagger: quitar hidden, forzar reflow, luego añadir visible para que la transición se vea
        visibleItems.forEach(function (item, index) {
            setTimeout(function () {
                item.classList.remove('menu-item-hidden');
                // Forzar que el navegador pinte el estado inicial (opacity:0, translateY) antes de animar
                item.offsetHeight;
                requestAnimationFrame(function () {
                    item.classList.add('menu-item-visible');
                });
            }, index * 80);
        });
    }

    if (menuTabs.length && menuItems.length) {
        menuTabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                var category = tab.getAttribute('data-menu-tab');
                var menuSection = document.getElementById('menu');
                if (menuSection) {
                    menuSection.scrollIntoView({ behavior: 'smooth' });
                }
                activateMenuCategory(category);
            });
        });
        // Estado inicial: mostrar todos los platos
        activateMenuCategory('todos');
        // Stagger inicial solo para los ítems visibles en la categoría "Todos"
        runInitialMenuStagger();
    }

    // ========== MENÚ MÓVIL (HAMBURGUESA) ==========
    // Incluye: backdrop click, Escape, icono X, ARIA, focus trap, scroll lock, animaciones.

    const menuButton = document.getElementById('menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');
    const menuIconHamburger = document.getElementById('menu-icon-hamburger');
    const menuIconClose = document.getElementById('menu-icon-close');

    // --- Utilidad: elementos enfocables dentro del menú (para focus trap) ---
    function getMobileMenuFocusables() {
        if (!mobileMenu) return [];
        return Array.from(mobileMenu.querySelectorAll('a[href], button:not([disabled])'));
    }

    // --- Abrir menú: panel, backdrop, ARIA, icono X, scroll lock, foco al primer enlace ---
    function openMobileMenu() {
        if (!mobileMenu || !menuButton) return;
        mobileMenu.classList.remove('opacity-0', 'pointer-events-none');
        mobileMenu.classList.add('mobile-menu-open');
        mobileMenu.setAttribute('aria-hidden', 'false');
        if (mobileMenuBackdrop) {
            mobileMenuBackdrop.classList.remove('pointer-events-none', 'opacity-0');
            mobileMenuBackdrop.classList.add('opacity-100');
            mobileMenuBackdrop.setAttribute('aria-hidden', 'false');
        }
        menuButton.setAttribute('aria-expanded', 'true');
        menuButton.setAttribute('aria-label', 'Cerrar menú');
        if (menuIconHamburger) menuIconHamburger.classList.add('hidden');
        if (menuIconClose) menuIconClose.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        var focusables = getMobileMenuFocusables();
        if (focusables.length > 0) focusables[0].focus();
    }

    // --- Cerrar menú: restaurar panel, backdrop, ARIA, icono hamburguesa, scroll, foco al botón ---
    function closeMobileMenu() {
        if (!mobileMenu || !menuButton) return;
        mobileMenu.classList.add('opacity-0', 'pointer-events-none');
        mobileMenu.classList.remove('mobile-menu-open');
        mobileMenu.setAttribute('aria-hidden', 'true');
        if (mobileMenuBackdrop) {
            mobileMenuBackdrop.classList.add('pointer-events-none', 'opacity-0');
            mobileMenuBackdrop.classList.remove('opacity-100');
            mobileMenuBackdrop.setAttribute('aria-hidden', 'true');
        }
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Abrir menú');
        if (menuIconHamburger) menuIconHamburger.classList.remove('hidden');
        if (menuIconClose) menuIconClose.classList.add('hidden');
        document.body.style.overflow = '';
        menuButton.focus();
    }

    function isMobileMenuOpen() {
        return mobileMenu && mobileMenu.classList.contains('mobile-menu-open');
    }

    // --- Toggle al hacer clic en el botón hamburguesa/X ---
    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', function () {
            if (isMobileMenuOpen()) closeMobileMenu();
            else openMobileMenu();
        });
    }

    // --- Cerrar al hacer clic fuera (backdrop) ---
    if (mobileMenuBackdrop) {
        mobileMenuBackdrop.addEventListener('click', function () {
            if (isMobileMenuOpen()) closeMobileMenu();
        });
    }

    // --- Cerrar con tecla Escape ---
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (isMobileMenuOpen()) {
            closeMobileMenu();
            e.preventDefault();
        }
    });

    // --- Focus trap: Tab/Shift+Tab mantienen el foco dentro del menú ---
    if (mobileMenu) {
        mobileMenu.addEventListener('keydown', function (e) {
            if (!isMobileMenuOpen()) return;
            var focusables = getMobileMenuFocusables();
            if (focusables.length === 0) return;
            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        });
    }

    // --- Cerrar al hacer clic en un enlace del menú (navegación) ---
    var mobileLinks = document.querySelectorAll('#mobile-menu a');
    mobileLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            closeMobileMenu();
        });
    });

    // ===== Scroll suave para anclas (opcional) =====
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // ===== Lightbox Galería: conectado a las imágenes del Swiper =====
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxBackdrop = document.getElementById('lightbox-backdrop');
    // Usamos directamente las imágenes dentro de las slides del Swiper como disparadores
    const galleryItems = document.querySelectorAll('.gallery-swiper .swiper-slide img');

    function openLightbox(src, alt) {
        if (!lightbox || !lightboxImage) return;
        lightboxImage.src = src;
        lightboxImage.alt = alt;
        lightbox.classList.remove('hidden');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        lightboxClose.focus();
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.add('hidden');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    // Conectar cada imagen del carrusel: al hacer clic se abre el lightbox con esa imagen
    galleryItems.forEach(function (img) {
        img.addEventListener('click', function (e) {
            e.preventDefault();
            if (img && img.src) {
                openLightbox(img.src, img.alt || 'Imagen de la galería');
            }
        });
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (isMobileMenuOpen()) return;
        if (lightbox && !lightbox.classList.contains('hidden')) {
            closeLightbox();
        }
    });

    // ===== Carrusel Galería - Swiper Coverflow =====
    (function initGallerySwiper() {
        if (typeof Swiper === 'undefined') return;
        var galleryEl = document.querySelector('.gallery-swiper');
        if (!galleryEl) return;

        new Swiper('.gallery-swiper', {
            effect: 'coverflow',
            grabCursor: true,
            centeredSlides: true,
            loop: true,
            slidesPerView: 1.2,
            spaceBetween: 24,
            autoplay: {
                delay: 4000,
                disableOnInteraction: false
            },
            coverflowEffect: {
                rotate: 40,
                stretch: 0,
                depth: 120,
                modifier: 1,
                slideShadows: true
            },
            breakpoints: {
                640: {
                    slidesPerView: 2
                },
                1024: {
                    slidesPerView: 3
                }
            },
            navigation: {
                nextEl: '.gallery-swiper-next',
                prevEl: '.gallery-swiper-prev'
            },
            pagination: {
                el: '.gallery-swiper-pagination',
                clickable: true
            }
        });
    })();

})();
