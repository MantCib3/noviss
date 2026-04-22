// ===== PDF Flipbook =====
(function () {
    const PDF_URL = 'report.pdf';

    function init() {
        if (typeof pdfjsLib === 'undefined') return;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.js';

        const canvas = document.getElementById('pdfCanvas');
        if (!canvas) return;
        const pageEl = document.getElementById('flipbookPage');
        const counter = document.getElementById('pageCounter');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const flipbook = document.getElementById('flipbook');

        let pdfDoc = null;
        let currentPage = 1;
        let rendering = false;

        function drawPage(num, onDone) {
            pdfDoc.getPage(num).then(p => {
                const containerWidth = flipbook.offsetWidth || 480;
                const defaultVp = p.getViewport({ scale: 1 });
                // Target ~460px tall (matches text column), derive width from A4 ratio
                const targetHeight = 560;
                const scaleByHeight = targetHeight / defaultVp.height;
                const scaleByWidth = (containerWidth * 0.85) / defaultVp.width;
                const scale = Math.min(scaleByHeight, scaleByWidth);
                const viewport = p.getViewport({ scale });

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                p.render({ canvasContext: ctx, viewport }).promise.then(onDone).catch(onDone);
            }).catch(onDone);
        }

        function renderPage(num, direction) {
            if (rendering) return;
            rendering = true;

            const outClass = direction === 'next' ? 'flip-out-left' : direction === 'prev' ? 'flip-out-right' : null;
            const inClass  = direction === 'next' ? 'flip-in-right'  : direction === 'prev' ? 'flip-in-left'   : null;

            if (!outClass) {
                // First load: no animation
                drawPage(num, () => {
                    counter.textContent = `${num} / ${pdfDoc.numPages}`;
                    rendering = false;
                });
                return;
            }

            // Phase 1: flip out
            pageEl.classList.add(outClass);

            // Wait for flip-out transition to finish, then render new page
            setTimeout(() => {
                drawPage(num, () => {
                    // Phase 2: snap to incoming position (no transition)
                    pageEl.classList.add('no-transition', inClass);
                    pageEl.classList.remove(outClass);
                    // Force reflow so the browser registers the snap position
                    void pageEl.offsetHeight;
                    // Phase 3: flip in
                    pageEl.classList.remove('no-transition', inClass);
                    counter.textContent = `${num} / ${pdfDoc.numPages}`;
                    rendering = false;
                });
            }, 420); // match transition duration
        }

        pdfjsLib.getDocument(PDF_URL).promise.then(doc => {
            pdfDoc = doc;
            counter.textContent = `1 / ${doc.numPages}`;
            renderPage(1, null); // no flip on first load
        }).catch(() => {
            canvas.parentElement.innerHTML =
                '<p style="color:#999;text-align:center;padding:2rem;">Preview unavailable — open the PDF directly.</p>';
        });

        function goNext() {
            if (!pdfDoc || currentPage >= pdfDoc.numPages || rendering) return;
            currentPage++;
            renderPage(currentPage, 'next');
        }

        function goPrev() {
            if (!pdfDoc || currentPage <= 1 || rendering) return;
            currentPage--;
            renderPage(currentPage, 'prev');
        }

        nextBtn.addEventListener('click', goNext);
        prevBtn.addEventListener('click', goPrev);

        let scrollDelta = 0;
        flipbook.addEventListener('wheel', e => {
            e.preventDefault();
            scrollDelta += e.deltaY;
            if (scrollDelta > 60) { scrollDelta = 0; goNext(); }
            else if (scrollDelta < -60) { scrollDelta = 0; goPrev(); }
        }, { passive: false });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// ===== Contact Form =====
(function () {
    const input = document.getElementById('contactUpload');
    const zone = document.getElementById('uploadZone');
    const filename = document.getElementById('uploadFilename');

    if (!input || !zone) return;

    input.addEventListener('change', () => {
        filename.textContent = input.files[0] ? input.files[0].name : '';
    });

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
            filename.textContent = file.name;
        }
    });

    document.getElementById('contactForm').addEventListener('submit', e => {
        e.preventDefault();
        // Form submission handler — wire to backend when ready
    });
})();

// ===== FAQ Toggle =====
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    
    if (question && answer) {
        question.addEventListener('click', function() {
            item.classList.toggle('active');
        });
    }
});

// ===== Mobile Menu Toggle =====
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}

// Close menu when a link is clicked
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// ===== data-link buttons (scroll to section) =====
document.querySelectorAll('[data-link]').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = document.querySelector(btn.getAttribute('data-link'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// ===== NOVISS logo scrolls to very top =====
const navLogo = document.getElementById('navLogo');
if (navLogo) {
    navLogo.addEventListener('click', e => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ===== Legal Modals =====
(function () {
    function openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Trigger buttons/links
    document.querySelectorAll('[data-modal]').forEach(el => {
        el.addEventListener('click', e => {
            e.preventDefault();
            openModal(el.getAttribute('data-modal'));
        });
    });

    // Close buttons inside modals
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close')));
    });

    // Click outside inner box to close
    document.querySelectorAll('.legal-modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal(modal.id);
        });
    });

    // Esc key closes any open modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.legal-modal.open').forEach(m => closeModal(m.id));
        }
    });
})();

// ===== Smooth Scrolling =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== Intersection Observer for Animations =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe sections
document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// ===== Button Click Handlers =====
const buttons = document.querySelectorAll('.btn');
buttons.forEach(button => {
    button.addEventListener('click', function(e) {
        // Add ripple effect
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
        
        // Log button click
        console.log('Button clicked:', this.textContent);
    });
});

// ===== Sticky Navigation Shadow =====
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 10) {
        navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
    } else {
        navbar.style.boxShadow = 'none';
    }
});

// ===== Blog Card Click Handler =====
const blogCards = document.querySelectorAll('.blog-card');
blogCards.forEach(card => {
    card.addEventListener('click', function() {
        console.log('Blog post clicked:', this.querySelector('h3').textContent);
        // You can add navigation logic here
    });
});

// ===== Counter Animation =====
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// ===== Add Ripple Effect CSS =====
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        width: 20px;
        height: 20px;
        margin-top: -10px;
        margin-left: -10px;
        animation: ripple-animation 0.6s ease-out;
    }

    @keyframes ripple-animation {
        0% {
            opacity: 1;
            transform: scale(1);
        }
        100% {
            opacity: 0;
            transform: scale(4);
        }
    }

    .fade-in {
        animation: fadeInUp 0.6s ease-out forwards;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// ===== Service Card Interaction =====
const serviceCards = document.querySelectorAll('.service-card');
serviceCards.forEach((card, index) => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// ===== Initialize =====
console.log('NOVISS OSINT website loaded successfully');
