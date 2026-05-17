// Base WhatsApp Phone Number
const WHATSAPP_PHONE = "543512751860";

let allProducts = [];

// Load Products from API
async function loadProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
        
        initFilters();
        renderProducts(allProducts);
    } catch (error) {
        console.error('Error fetching products:', error);
        container.innerHTML = '<p class="error-msg">Error al cargar el catálogo. Por favor reintentá más tarde.</p>';
    }
}

function initFilters() {
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');

    if (!searchInput || !filterBtns.length) return;

    let currentQuery = '';
    let currentCategory = 'todos';

    function applyFilters() {
        let filtered = allProducts;
        
        // Filter by category
        if (currentCategory !== 'todos') {
            filtered = filtered.filter(p => {
                const name = (p.name || '').toLowerCase();
                if (currentCategory === 'remeras') return name.includes('remera') || name.includes('musculosa') || name.includes('top') || name.includes('remeron');
                if (currentCategory === 'pantalones') return name.includes('pantalon') || name.includes('palazo') || name.includes('pollera') || name.includes('jean') || name.includes('short');
                if (currentCategory === 'conjuntos') return name.includes('conjunto');
                if (currentCategory === 'abrigos') return name.includes('buzo') || name.includes('buzito') || name.includes('campera') || name.includes('sweater') || name.includes('abrigo');
                if (currentCategory === 'accesorios') return name.includes('cinto') || name.includes('lentes') || name.includes('collar') || name.includes('bolso') || name.includes('accesorio') || name.includes('lenceria');
                return true;
            });
        }

        // Filter by search query (name, color, talle)
        if (currentQuery) {
            const q = currentQuery.toLowerCase();
            filtered = filtered.filter(p => {
                return ((p.name || '').toLowerCase().includes(q)) ||
                       ((p.color || '').toLowerCase().includes(q)) ||
                       ((p.talle || '').toLowerCase().includes(q));
            });
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

function renderProducts(products) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    container.innerHTML = ''; // Clear existing

    if (products.length === 0) {
        container.innerHTML = '<p class="no-results fade-in-up" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #555; font-size: 1.2rem;">No se encontraron prendas con estos filtros.</p>';
        return;
    }

    products.forEach((product, index) => {
        const card = document.createElement('div');
        const delayClass = `delay-${(index % 3) + 1}`; 
        card.className = `product-card fade-in-up ${delayClass}`;

        const images = product.images || [product.image];
        const hasMultipleImages = images.length > 1;

        // Construct message description
        let detail = "";
        if (product.talle) detail += ` [Talles: ${product.talle}]`;
        if (product.color) detail += ` [Colores: ${product.color}]`;

        const message = `Hola ÁLAMO, quiero consultar/comprar el producto: ${product.name} (${product.price})${detail}`;
        const encodedMessage = encodeURIComponent(message);
        const waLink = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodedMessage}`;

        // Talle/Color UI labels
        const talleHTML = product.talle ? `<span class="product-tag">Talle: ${product.talle}</span>` : "";
        const colorHTML = product.color ? `<span class="product-tag">Color: ${product.color}</span>` : "";

        // Carousel HTML
        let mediaHTML = "";
        if (hasMultipleImages) {
            const items = images.map(img => `<div class="carousel-item"><img src="${img}" alt="${product.name}"></div>`).join('');
            const dots = images.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('');
            mediaHTML = `
                <div class="product-carousel" id="carousel-${product.id}">
                    <div class="carousel-stage">${items}</div>
                    <button class="carousel-nav carousel-prev"><i class="fas fa-chevron-left"></i></button>
                    <button class="carousel-nav carousel-next"><i class="fas fa-chevron-right"></i></button>
                    <div class="carousel-dots">${dots}</div>
                </div>
            `;
        } else {
            mediaHTML = `<img src="${images[0] || 'placeholder.jpg'}" alt="${product.name}" class="product-image" loading="lazy">`;
        }

        card.innerHTML = `
            <div class="product-image-wrapper">
                ${mediaHTML}
                <div class="product-overlay">
                    <a href="${waLink}" target="_blank" class="btn btn-wa-overlay"><i class="fab fa-whatsapp"></i> Consultar</a>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">${product.price}</p>
                <div class="product-details">
                    ${talleHTML}
                    ${colorHTML}
                </div>
                <a href="${waLink}" target="_blank" class="btn btn-wa-outline"><i class="fab fa-whatsapp"></i> Lo quiero</a>
            </div>
        `;

        container.appendChild(card);

        if (hasMultipleImages) {
            setupCarousel(card.querySelector('.product-carousel'));
        }
    });

    // Re-init animations for new elements
    initAnimations();
}

function setupCarousel(carousel) {
    const stage = carousel.querySelector('.carousel-stage');
    const items = carousel.querySelectorAll('.carousel-item');
    const prev = carousel.querySelector('.carousel-prev');
    const next = carousel.querySelector('.carousel-next');
    const dots = carousel.querySelectorAll('.dot');
    
    let currentIndex = 0;
    const count = items.length;

    function update() {
        stage.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
    }

    prev.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentIndex = (currentIndex - 1 + count) % count;
        update();
    });

    next.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentIndex = (currentIndex + 1) % count;
        update();
    });

    dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentIndex = parseInt(dot.dataset.index);
            update();
        });
    });
}

// Scroll animations
function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });

    // Slight delay to ensure elements are in DOM
    setTimeout(() => {
        document.querySelectorAll('.fade-in, .fade-in-up').forEach(el => observer.observe(el));
    }, 200);
}

// Sticky Navbar
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    initNavbar();
});
