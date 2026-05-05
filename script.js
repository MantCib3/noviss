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

    // Known Identifiers — dynamic add/remove
    const addIdentifierBtn = document.getElementById('addIdentifierBtn');

    function addIdentifierRow() {
        const list = document.getElementById('identifiersList');
        const row = document.createElement('div');
        row.className = 'identifier-row';
        const aliasInput = document.createElement('input');
        aliasInput.type = 'text';
        aliasInput.name = 'identifierAlias[]';
        aliasInput.placeholder = 'Alias';
        aliasInput.autocomplete = 'off';
        aliasInput.maxLength = 100;
        const platformInput = document.createElement('input');
        platformInput.type = 'text';
        platformInput.name = 'identifierPlatform[]';
        platformInput.placeholder = 'Platform';
        platformInput.autocomplete = 'off';
        platformInput.maxLength = 100;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'identifier-remove-btn';
        removeBtn.setAttribute('aria-label', 'Remove');
        removeBtn.textContent = '\u00d7';
        removeBtn.addEventListener('click', function() { row.remove(); });
        row.appendChild(aliasInput);
        row.appendChild(platformInput);
        row.appendChild(removeBtn);
        list.appendChild(row);
    }

    addIdentifierBtn.addEventListener('click', addIdentifierRow);
    addIdentifierRow(); // pre-open one row on load

    document.getElementById('contactForm').addEventListener('submit', e => {
        e.preventDefault();
        const form = e.target;

        // Clear previous validation state
        form.querySelectorAll('.field-error').forEach(el => el.remove());
        form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

        let valid = true;

        function flagField(id, msg) {
            valid = false;
            const input = document.getElementById(id);
            if (!input) return;
            input.classList.add('input-error');
            const err = document.createElement('span');
            err.className = 'field-error';
            err.textContent = msg;
            input.parentElement.appendChild(err);
        }

        const name    = form.name.value.trim();
        const email   = form.email.value.trim();
        const purpose = form.purpose.value.trim();
        const info    = form.info.value.trim();

        if (!name)    flagField('contactName',    'Name is required.');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                      flagField('contactEmail',   'A valid email address is required.');
        if (!purpose) flagField('contactPurpose', 'Please describe the purpose.');
        if (!info)    flagField('contactInfo',    'Investigation details are required.');

        if (!form.legalConsent.checked) {
            valid = false;
            const legalWrap = document.getElementById('legalConsent').parentElement.parentElement;
            const err = document.createElement('span');
            err.className = 'field-error';
            err.textContent = 'You must accept the Privacy Policy and Terms to proceed.';
            legalWrap.appendChild(err);
        }

        if (!valid) return;

        // ── Guard: Turnstile error state ────────────────────────────────────────
        if (form.dataset.turnstileError) {
            const statusEl = document.getElementById('formStatus');
            statusEl.textContent = 'Verification failed. Please refresh the page and try again.';
            statusEl.className   = 'form-status error';
            return;
        }

        // ── Guard: Turnstile must have resolved a token ──────────────────────────
        const turnstileInput = form.querySelector('[name="cf-turnstile-response"]');
        if (!turnstileInput || !turnstileInput.value) {
            const statusEl = document.getElementById('formStatus');
            statusEl.textContent = 'Please wait for the verification check to complete, then try again.';
            statusEl.className   = 'form-status error';
            return;
        }

        // ── Submit to Cloudflare Worker ──────────────────────────────────────────
        const submitBtn = form.querySelector('.contact-submit');
        const statusEl  = document.getElementById('formStatus');

        submitBtn.disabled    = true;
        submitBtn.textContent = 'Sending\u2026';
        statusEl.textContent  = '';
        statusEl.className    = 'form-status';

        const controller = new AbortController();
        const timeout    = setTimeout(() => controller.abort(), 15000);

        fetch('https://tight-pond-8193.noviss-osint.workers.dev', {
            method: 'POST',
            body:   new FormData(form),
            signal: controller.signal,
        })
        .then(res => res.json())
        .then(json => {
            if (json.ok) {
                form.reset();
                document.getElementById('identifiersList').innerHTML = '';
                addIdentifierRow();
                document.getElementById('uploadFilename').textContent = '';
                // Only reset Turnstile on success so it's ready for a fresh submission
                if (window.turnstile) window.turnstile.reset();
                statusEl.textContent = 'Your enquiry has been sent. We\u2019ll be in touch within 24 hours.';
                statusEl.className   = 'form-status success';
            } else {
                statusEl.textContent = json.error || 'Something went wrong. Please try again.';
                statusEl.className   = 'form-status error';
            }
        })
        .catch(err => {
            if (err.name === 'AbortError') {
                statusEl.textContent = 'The request timed out. Please check your connection and try again.';
            } else {
                statusEl.textContent = 'A network error occurred. Please check your connection and try again.';
            }
            statusEl.className = 'form-status error';
        })
        .finally(() => {
            clearTimeout(timeout);
            submitBtn.disabled    = false;
            submitBtn.textContent = 'Send';
        });
    });
})();

// ===== FAQ Toggle =====
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    item.addEventListener('click', function() {
        item.classList.toggle('active');
    });
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

// ===== NOVISS logo scrolls to very top / exits blog page =====
const navLogo = document.getElementById('navLogo');
if (navLogo) {
    navLogo.addEventListener('click', e => {
        e.preventDefault();
        const blogPage = document.getElementById('blog-page');
        const articlePage = document.getElementById('article-page');
        const mainApp = document.getElementById('main-app');
        if (mainApp) {
            if (blogPage && blogPage.style.display !== 'none') blogPage.style.display = 'none';
            if (articlePage && articlePage.style.display !== 'none') articlePage.style.display = 'none';
            mainApp.style.display = '';
        }
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
        const href = this.getAttribute('href');
        if (!href || href === '#') return;
        // If blog/article page is visible, return to main content first
        const blogPage = document.getElementById('blog-page');
        const articlePage = document.getElementById('article-page');
        const mainApp = document.getElementById('main-app');
        if (mainApp) {
            if (blogPage && blogPage.style.display !== 'none') blogPage.style.display = 'none';
            if (articlePage && articlePage.style.display !== 'none') articlePage.style.display = 'none';
            mainApp.style.display = '';
        }
        try {
            const target = document.querySelector(href);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (_) { }
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
        // Navigation logic handled by blog page section below
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

// ===== Blog Page =====
(function () {
    let BLOG_POSTS = [];

    // Load posts from JSON DB
    fetch('posts.json')
        .then(r => r.json())
        .then(posts => {
            BLOG_POSTS = posts;
            populateSidebarCards(BLOG_POSTS.slice(0, 3));
            // If blog page is already open (unlikely), refresh it
            const blogPage = document.getElementById('blog-page');
            if (blogPage && blogPage.style.display !== 'none') {
                populateDateFilter();
                renderPosts(BLOG_POSTS);
            }
        })
        .catch(() => console.warn('posts.json could not be loaded'));

    function populateSidebarCards(posts) {
        const container = document.querySelector('.about-blog-right');
        if (!container) return;
        container.querySelectorAll('.blog-card').forEach(c => c.remove());
        posts.forEach(p => {
            const card = document.createElement('div');
            card.className = 'blog-card';
            card.dataset.articleId = p.id;
            const content = document.createElement('div');
            content.className = 'blog-card-content';
            const title = document.createElement('h3');
            title.className = 'sidebar-card-title';
            title.style.textAlign = 'left';
            title.textContent = p.title;
            const lead = document.createElement('p');
            lead.className = 'blog-card-lead';
            lead.textContent = p.lead;
            const meta = document.createElement('span');
            meta.className = 'blog-card-meta';
            meta.textContent = fmtDate(p.date);
            content.appendChild(title);
            content.appendChild(lead);
            content.appendChild(meta);
            card.appendChild(content);
            container.appendChild(card);
        });
    }

    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    function fmtDate(yyyyMM) {
        const [y, m] = yyyyMM.split('-');
        return MONTHS[parseInt(m, 10) - 1] + ' ' + y;
    }

    function renderPosts(posts) {
        const grid = document.getElementById('blogGrid');
        const none = document.getElementById('blogNoResults');
        if (!grid) return;
        if (posts.length === 0) {
            grid.innerHTML = '';
            none.style.display = 'block';
            return;
        }
        none.style.display = 'none';
        grid.innerHTML = '';
        posts.forEach(p => {
            const card = document.createElement('div');
            card.className = 'blog-page-card';
            card.dataset.id = p.id;
            const tag = document.createElement('span');
            tag.className = 'blog-page-card-tag';
            tag.textContent = p.tag;
            const title = document.createElement('h3');
            title.className = 'blog-page-card-title';
            title.textContent = p.title;
            const lead = document.createElement('p');
            lead.className = 'blog-page-card-lead';
            lead.textContent = p.lead;
            const meta = document.createElement('span');
            meta.className = 'blog-page-card-meta';
            meta.textContent = fmtDate(p.date);
            card.appendChild(tag);
            card.appendChild(title);
            card.appendChild(lead);
            card.appendChild(meta);
            grid.appendChild(card);
        });
    }

    function populateDateFilter() {
        const sel = document.getElementById('blogDateFilter');
        if (!sel) return;
        // Reset to just the default option before repopulating
        sel.innerHTML = '<option value="">All dates</option>';
        const seen = new Set();
        BLOG_POSTS.forEach(p => {
            if (!seen.has(p.date)) {
                seen.add(p.date);
                const opt = document.createElement('option');
                opt.value = p.date;
                opt.textContent = fmtDate(p.date);
                sel.appendChild(opt);
            }
        });
    }

    function doSearch() {
        const query = (document.getElementById('blogSearch').value || '').toLowerCase().trim();
        const dateFilter = document.getElementById('blogDateFilter').value;
        const results = BLOG_POSTS.filter(p => {
            const matchText = !query ||
                p.title.toLowerCase().includes(query) ||
                p.lead.toLowerCase().includes(query) ||
                p.tag.toLowerCase().includes(query);
            const matchDate = !dateFilter || p.date === dateFilter;
            return matchText && matchDate;
        });
        renderPosts(results);
    }

    function showBlogPage() {
        const mainApp = document.getElementById('main-app');
        const blogPage = document.getElementById('blog-page');
        const articlePage = document.getElementById('article-page');
        if (!mainApp || !blogPage) return;
        mainApp.style.display = 'none';
        if (articlePage) articlePage.style.display = 'none';
        blogPage.style.display = '';
        blogPage.style.animation = 'none';
        void blogPage.offsetHeight;
        blogPage.style.animation = '';
        window.scrollTo({ top: 0 });
        populateDateFilter();
        renderPosts(BLOG_POSTS);
        const searchInput = document.getElementById('blogSearch');
        if (searchInput) searchInput.value = '';
        const dateFilter = document.getElementById('blogDateFilter');
        if (dateFilter) dateFilter.value = '';
    }

    let _articleOrigin = 'blog'; // 'blog' or 'main'

    function showArticle(id, origin) {
        const post = BLOG_POSTS.find(p => p.id === id);
        if (!post) return;
        _articleOrigin = origin || 'blog';
        const blogPage = document.getElementById('blog-page');
        const articlePage = document.getElementById('article-page');
        if (!articlePage) return;
        document.getElementById('articleTag').textContent = post.tag;
        document.getElementById('articleTitle').textContent = post.title;
        document.getElementById('articleDate').textContent = fmtDate(post.date);
        const imgEl = document.getElementById('articleImage');
        if (imgEl) {
            if (post.image) {
                imgEl.src = post.image;
                imgEl.alt = post.title;
                imgEl.style.display = '';
            } else {
                imgEl.style.display = 'none';
            }
        }
        const bodyEl = document.getElementById('articleBody');
        bodyEl.innerHTML = '';
        post.body.forEach(para => {
            const p = document.createElement('p');
            p.textContent = para;
            bodyEl.appendChild(p);
        });
        if (blogPage) blogPage.style.display = 'none';
        articlePage.style.display = '';
        articlePage.style.animation = 'none';
        void articlePage.offsetHeight;
        articlePage.style.animation = '';
        window.scrollTo({ top: 0 });
    }

    // Blog nav link
    const blogNavLink = document.getElementById('blogNavLink');
    if (blogNavLink) {
        blogNavLink.addEventListener('click', e => {
            e.preventDefault();
            const navMenu = document.querySelector('.nav-menu');
            const hamburger = document.querySelector('.hamburger');
            if (navMenu) navMenu.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
            showBlogPage();
        });
    }

    // Blog teaser link
    const teaserLink = document.getElementById('blogTeaserLink');
    if (teaserLink) {
        teaserLink.addEventListener('click', e => {
            e.preventDefault();
            showBlogPage();
        });
    }

    // Search button
    const searchBtn = document.getElementById('blogSearchBtn');
    if (searchBtn) searchBtn.addEventListener('click', doSearch);

    // Enter key in search input
    const searchInput = document.getElementById('blogSearch');
    if (searchInput) {
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') doSearch();
        });
    }

    // Date filter change triggers search immediately
    const dateFilter = document.getElementById('blogDateFilter');
    if (dateFilter) dateFilter.addEventListener('change', doSearch);

    // Card click — open article (event delegation)
    const blogGrid = document.getElementById('blogGrid');
    if (blogGrid) {
        blogGrid.addEventListener('click', e => {
            const card = e.target.closest('.blog-page-card');
            if (card) showArticle(parseInt(card.dataset.id, 10));
        });
    }

    // Back button
    const backBtn = document.getElementById('articleBackBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const articlePage = document.getElementById('article-page');
            if (articlePage) articlePage.style.display = 'none';
            if (_articleOrigin === 'main') {
                const mainApp = document.getElementById('main-app');
                if (mainApp) { mainApp.style.display = ''; window.scrollTo({ top: 0 }); }
            } else {
                showBlogPage();
            }
        });
    }

    // Sidebar cards on the main page
    const aboutBlogRight = document.querySelector('.about-blog-right');
    if (aboutBlogRight) {
        aboutBlogRight.addEventListener('click', e => {
            const card = e.target.closest('.blog-card[data-article-id]');
            if (card) {
                const id = parseInt(card.dataset.articleId, 10);
                const mainApp = document.getElementById('main-app');
                if (mainApp) mainApp.style.display = 'none';
                showArticle(id, 'main');
            }
        });
    }
})();

// ===== Turnstile Error Callback =====
// Called by the widget when verification fails (e.g. hostname not allowed).
// data-retry="never" on the widget prevents automatic infinite retries;
// this callback surfaces a clear message and marks the form so submit is blocked.
function onTurnstileError(code) {
    const statusEl = document.getElementById('formStatus');
    if (statusEl) {
        statusEl.textContent = 'Verification could not be completed. Please refresh the page and try again.';
        statusEl.className   = 'form-status error';
    }
    const form = document.getElementById('contactForm');
    if (form) form.dataset.turnstileError = '1';
}
