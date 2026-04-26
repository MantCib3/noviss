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

// ===== Blog Page =====
(function () {
    const BLOG_POSTS = [
        {
            id: 1,
            title: 'How Open Source Intelligence Has Changed Private Investigations',
            lead: "Digital footprints have transformed what's discoverable through public channels alone.",
            date: '2026-04',
            tag: 'OSINT',
            body: [
                "Traditional private investigation relied on physical surveillance, court records, and direct interviews. The shift to documented digital behaviour has fundamentally altered what can be discovered without leaving a desk.",
                "Social platforms, gaming networks, and public forums generate a continuous stream of behavioural data — location check-ins, activity timestamps, communication patterns, and linked accounts. A skilled investigator can map years of digital history from a single starting point.",
                "The change isn't just in volume. It's in permanence. Old posts, deleted accounts, and cached pages form an archive that physical surveillance never could. OSINT has raised the baseline of what a thorough investigation looks like."
            ]
        },
        {
            id: 2,
            title: 'What Your Username Reveals About You',
            lead: "Most people reuse a core handle across dozens of platforms without realising how much it links together.",
            date: '2026-03',
            tag: 'Digital Identity',
            body: [
                "Most usernames are not chosen at random. People pick handles they find memorable, meaningful, or aesthetically appealing — and they reuse them. A username that appears on one platform in 2016 often appears, with minor variations, across dozens of others.",
                "Cross-referencing a single handle across social media, gaming networks, forums, and archives frequently surfaces associated email addresses, location data, profile photos, and years of interaction history. Each new connection narrows the picture further.",
                "Variations matter too. Suffixes like numbers or underscores follow predictable patterns. Investigators familiar with common handle conventions can systematically search derivatives, dramatically expanding what a single starting username can yield."
            ]
        },
        {
            id: 3,
            title: 'The Ethical Boundaries of OSINT: Where We Draw the Line',
            lead: "Not all publicly available information is fair game. Here's our ethical framework.",
            date: '2026-02',
            tag: 'Ethics',
            body: [
                "Publicly available information is not a licence to collect everything. The fact that something is technically accessible does not make its use appropriate in every context. Ethical OSINT practice requires constant consideration of purpose, proportionality, and potential harm.",
                "At NOVISS, we don't reproduce private messages, access restricted content, or engage in any form of impersonation. Where light public interaction is used — such as verifying whether a profile is visible to a connected account — it is minimal, targeted, and non-deceptive.",
                "We also decline engagements where the stated or inferred purpose suggests harassment, surveillance of a protected person, or any use inconsistent with Australian law. A refusal at intake is sometimes the most appropriate outcome."
            ]
        },
        {
            id: 4,
            title: 'Image Reverse Search: What It Can and Cannot Tell You',
            lead: 'Profile photos carry more metadata and linkable context than most people realise.',
            date: '2026-01',
            tag: 'Techniques',
            body: [
                "A profile photo carries more linkable context than most people expect. Reverse image search tools can surface the same image — or near-identical versions — across platforms the subject may not have considered connected.",
                "Metadata embedded in original image files can include device identifiers, GPS coordinates, and timestamps. While platforms often strip this on upload, original files shared via email, direct messages, or download links may retain it intact.",
                "The practical limit is image uniqueness. Stock photos or heavily cropped images reduce linkability significantly. But a distinctive profile photo used consistently across accounts remains one of the more reliable cross-platform identity signals available."
            ]
        },
        {
            id: 5,
            title: 'Cross-Platform Correlation: Linking Accounts Across Networks',
            lead: 'Consistent behavioural patterns, writing style, and timestamps often bridge accounts more reliably than usernames alone.',
            date: '2025-12',
            tag: 'Techniques',
            body: [
                "The most robust way to link accounts across networks isn't a shared username — it's consistent behaviour. Writing style, punctuation patterns, posting times, and topic focus often persist across pseudonymous accounts in ways that usernames don't.",
                "Timestamp overlap is particularly useful. Someone who posts across two accounts at the same unusual hours, reacts to the same events, and references the same locations is likely the same person even if the handles are entirely different.",
                "Network mapping — identifying shared followers, mutual connections, or co-mentions — adds structural confirmation. A graph of interactions across platforms can reveal clusters that point to a common identity, especially when combined with content-level signals."
            ]
        },
        {
            id: 6,
            title: 'Reading Gaming Profiles: Steam, Discord, and Beyond',
            lead: 'Gaming networks have become one of the richest sources of persistent, cross-linked digital identity.',
            date: '2025-11',
            tag: 'Gaming OSINT',
            body: [
                "Gaming networks have become one of the richest sources of persistent digital identity. Steam profiles, Discord servers, Battle.net tags, and Roblox usernames are frequently tied to real names, linked social accounts, friend lists, and years of timestamped activity.",
                "Games with friend list directories or activity feeds allow investigators to map social connections that may not appear anywhere else. A Discord server membership list can link a username to a community — and from there to other members with more visible profiles.",
                "Gaming handles are also heavily reused. Many players establish a main tag early and carry it forward across every platform they join. This makes gaming-origin handles among the most stable cross-platform identifiers available."
            ]
        }
    ];

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
        grid.innerHTML = posts.map(p =>
            '<div class="blog-page-card" data-id="' + p.id + '">' +
                '<span class="blog-page-card-tag">' + p.tag + '</span>' +
                '<h3 class="blog-page-card-title">' + p.title + '</h3>' +
                '<p class="blog-page-card-lead">' + p.lead + '</p>' +
                '<span class="blog-page-card-meta">' + fmtDate(p.date) + '</span>' +
            '</div>'
        ).join('');
    }

    function populateDateFilter() {
        const sel = document.getElementById('blogDateFilter');
        if (!sel || sel.options.length > 1) return;
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
        document.getElementById('articleBody').innerHTML = post.body.map(p => '<p>' + p + '</p>').join('');
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
