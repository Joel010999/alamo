// js/main.js — Catalog Page Logic
let allProducts = [];

// ── Load Products ─────────────────────────────────────────────────────────────
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allProducts = await response.json();
        initFilters();
        renderProducts(allProducts);
    } catch (error) {
        console.error('Error fetching products:', error);
        container.innerHTML = '<p class="error-msg">Error al cargar el catálogo. Por favor reintentá más tarde.</p>';
    }
}

// ── Filters ───────────────────────────────────────────────────────────────────
function initFilters() {
    const searchInput = document.getElementById('searchInput');
    const filterBtns  = document.querySelectorAll('.filter-btn');

    if (!searchInput || !filterBtns.length) return;

    let currentQuery    = '';
    let currentCategory = 'todos';

    function applyFilters() {
        let filtered = allProducts;

        if (currentCategory !== 'todos') {
            filtered = filtered
                .filter(p => p.category === currentCategory)
                .sort((a, b) => {
                    const posA = a.category_position !== undefined ? a.category_position : 0;
                    const posB = b.category_position !== undefined ? b.category_position : 0;
                    return posA - posB;
                });
        }

        if (currentQuery) {
            const q = currentQuery.toLowerCase();
            filtered = filtered.filter(p =>
                ((p.name  || '').toLowerCase().includes(q)) ||
                ((p.color || '').toLowerCase().includes(q)) ||
                ((p.talle || '').toLowerCase().includes(q))
            );
        }

        renderProducts(filtered);
    }

    searchInput.addEventListener('input', (e) => {
        currentQuery = e.target.value;
        applyFilters();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            applyFilters();
        });
    });
}

// ── Render Cards ──────────────────────────────────────────────────────────────
function renderProducts(products) {
    const container = document.getElementById('products-container');
    if (!container) return;
    container.innerHTML = '';

    if (products.length === 0) {
        container.innerHTML = '<p class="no-results fade-in-up" style="grid-column:1/-1;text-align:center;padding:40px;color:#555;font-size:1.2rem;">No se encontraron prendas con estos filtros.</p>';
        return;
    }

    products.forEach((product, index) => {
        const card = document.createElement('div');
        const delayClass = `delay-${(index % 3) + 1}`;
        card.className = `product-card fade-in-up ${delayClass}`;
        card.style.cursor = 'pointer';

        // Normalize images
        let images = product.images || [product.image];
        if (typeof images === 'string') { try { images = JSON.parse(images); } catch { images = []; } }
        images = images.filter(Boolean);
        const hasMultiple = images.length > 1;

        // Tags
        const talleHTML = product.talle ? `<span class="product-tag">Talle: ${product.talle}</span>` : "";
        const colorHTML = product.color ? `<span class="product-tag">Color: ${product.color}</span>` : "";

        // Media
        let mediaHTML = "";
        if (hasMultiple) {
            const items = images.map(img => `<div class="carousel-item"><img src="${img}" alt="${product.name}" loading="lazy"></div>`).join('');
            const dots  = images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('');
            mediaHTML = `
                <div class="product-carousel" id="carousel-${product.id}">
                    <div class="carousel-stage">${items}</div>
                    <button class="carousel-nav carousel-prev"><i class="fas fa-chevron-left"></i></button>
                    <button class="carousel-nav carousel-next"><i class="fas fa-chevron-right"></i></button>
                    <div class="carousel-dots">${dots}</div>
                </div>`;
        } else {
            mediaHTML = `<img src="${images[0] || ''}" alt="${product.name}" class="product-image" loading="lazy">`;
        }

        card.innerHTML = `
            <div class="product-image-wrapper">
                ${mediaHTML}
                <div class="product-overlay-hint"><i class="fas fa-expand-alt"></i></div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">${product.price}</p>
                <div class="product-details">
                    ${talleHTML}
                    ${colorHTML}
                </div>
            </div>
        `;

        // Navigate to product detail page on click (skip carousel controls)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.carousel-nav') || e.target.closest('.dot')) return;
            window.location.href = `/product.html?id=${product.id}`;
        });

        container.appendChild(card);

        if (hasMultiple) {
            setupCarousel(card.querySelector('.product-carousel'));
        }

        setTimeout(() => card.classList.add('is-visible'), 50 + (index % 6) * 40);
    });
}

// ── Card Carousel (thumbnail only) ───────────────────────────────────────────
function setupCarousel(carousel) {
    const stage = carousel.querySelector('.carousel-stage');
    const prev  = carousel.querySelector('.carousel-prev');
    const next  = carousel.querySelector('.carousel-next');
    const dots  = carousel.querySelectorAll('.dot');
    let currentIndex = 0;
    const count = carousel.querySelectorAll('.carousel-item').length;

    function update() {
        stage.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
    }

    prev.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); currentIndex = (currentIndex - 1 + count) % count; update(); });
    next.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); currentIndex = (currentIndex + 1) % count; update(); });
    dots.forEach(dot => {
        dot.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); currentIndex = parseInt(dot.dataset.index); update(); });
    });
}

// ── Scroll Animations ─────────────────────────────────────────────────────────
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05 });

    document.querySelectorAll('.fade-in, .fade-in-up').forEach(el => {
        if (!el.classList.contains('product-card')) observer.observe(el);
    });
}

// ── Sticky Navbar ─────────────────────────────────────────────────────────────
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    initNavbar();
    initScrollAnimations();
});
