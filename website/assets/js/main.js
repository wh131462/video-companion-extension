/**
 * Video Companion Website - Main Script
 */

// Initialize AOS (Animate On Scroll)
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-out-cubic',
            once: true,
            offset: 50,
        });
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });

        // Close mobile menu when clicking a link
        mobileMenu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // Screenshot tabs
    const screenshotTabs = document.querySelectorAll('.screenshot-tab');
    const screenshotImages = document.querySelectorAll('.screenshot-image');

    screenshotTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            const targetId = this.dataset.target;

            // Update active tab
            screenshotTabs.forEach(function(t) {
                t.classList.remove('active');
                t.classList.remove('bg-primary', 'text-white');
                t.classList.add('bg-gray-800', 'text-gray-300');
            });

            this.classList.add('active');
            this.classList.remove('bg-gray-800', 'text-gray-300');
            this.classList.add('bg-primary', 'text-white');

            // Show target image
            screenshotImages.forEach(function(img) {
                if (img.id === targetId) {
                    img.classList.remove('hidden');
                } else {
                    img.classList.add('hidden');
                }
            });
        });
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                }
            }
        });
    });

    // Header shadow on scroll
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                header.classList.add('shadow-lg');
            } else {
                header.classList.remove('shadow-lg');
            }
        });
    }

    // Highlight current section in navigation
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('header nav a[href^="#"]');

    function highlightNavLink() {
        const scrollPosition = window.scrollY + 100;

        sections.forEach(function(section) {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(function(link) {
                    link.classList.remove('text-white');
                    link.classList.add('text-gray-300');

                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.remove('text-gray-300');
                        link.classList.add('text-white');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNavLink);
    highlightNavLink(); // Initial call
});
