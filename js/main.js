// Base WhatsApp Phone Number
const WHATSAPP_PHONE = "543512751860";

// Current active filter
let currentFilter = 'todos';
let currentSearch = '';

// Render Products from API
async function renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        container.innerHTML = ''; // Clear existing

        products.forEach((product, index) => {
            const card = document.createElement('div');
            const delayClass = `delay-${(index % 3) + 1}`; 
            card.className = `product-card fade-in-up ${delayClass}`;
            
            // Set category data attribute for filtering
            const category = (product.category || '').toLowerCase().trim();
            card.setAttribute('data-category', category);

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

            // Category badge
            const categoryLabel = product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : '';
            const categoryHTML = categoryLabel ? `<span class="product-tag product-tag-category">${categoryLabel}</span>` : "";

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
                        ${categoryHTML}
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

        // Apply current filter after rendering
        applyFilter(currentFilter);

        // Setup filter buttons
        initFilterButtons();

    } catch (error) {
        console.error('Error fetching products:', error);
        container.innerHTML = '<p class="error-msg">Error al cargar el catálogo. Por favor reintentá más tarde.</p>';
    }
}

// --- Filter Logic ---

function initFilterButtons() {
    const filterBar = document.getElementById('filter-bar');
    if (!filterBar) return;

    const buttons = filterBar.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.getAttribute('data-category');
            currentFilter = category;
            applyFilter(category);
        });
    });

    // Setup search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase().trim();
            applyFilter(currentFilter);
        });
    }
}

function applyFilter(category) {
    const container = document.getElementById('products-container');
    if (!container) return;

    const cards = container.querySelectorAll('.product-card');
    
    // Remove any previous empty state
    const existingEmpty = container.querySelector('.filter-empty');
    if (existingEmpty) existingEmpty.remove();

    let visibleCount = 0;

    cards.forEach((card, index) => {
        const cardCategory = card.getAttribute('data-category');
        const cardName = card.querySelector('.product-name').textContent.toLowerCase();
        
        const matchesCategory = category === 'todos' || cardCategory === category;
        const matchesSearch = currentSearch === '' || cardName.includes(currentSearch);

        if (matchesCategory && matchesSearch) {
            card.classList.remove('filter-hidden');
            card.classList.add('filter-show');
            // Stagger animation
            card.style.animationDelay = `${visibleCount * 0.06}s`;
            visibleCount++;
        } else {
            card.classList.add('filter-hidden');
            card.classList.remove('filter-show');
        }
    });

    // Show empty state if no products match
    if (visibleCount === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'filter-empty';
        emptyDiv.innerHTML = `
            <i class="fas fa-search"></i>
            <p>No hay productos en esta categoría por ahora.</p>
        `;
        container.appendChild(emptyDiv);
    }
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
    renderProducts();
    initNavbar();
});
