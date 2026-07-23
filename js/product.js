// js/product.js — Product Detail Page Logic
const WHATSAPP_PHONE = "543512751860";

// ── Helpers ────────────────────────────────────────────────────────────────────
function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

function buildWaLink(product) {
    let detail = "";
    if (product.talle) detail += ` [Talles: ${product.talle}]`;
    if (product.color) detail += ` [Colores: ${product.color}]`;
    const message = `Hola ÁLAMO, quiero consultar/comprar el producto: ${product.name} (${product.price})${detail}`;
    return `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(message)}`;
}

// ── Gallery / Carousel ────────────────────────────────────────────────────────
let galleryImages = [];
let activeIndex = 0;

function renderGallery(product) {
    const images = (product.images && product.images.length) ? product.images : [product.image];
    galleryImages = images.filter(Boolean);

    const mainEl = document.getElementById('pd-main-media');
    const thumbsEl = document.getElementById('pd-thumbs');

    if (galleryImages.length > 1) {
        // Build carousel
        const items = galleryImages.map((src, i) =>
            `<div class="pd-carousel-item"><img src="${src}" alt="${product.name}"></div>`
        ).join('');

        const dots = galleryImages.map((_, i) =>
            `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`
        ).join('');

        mainEl.innerHTML = `
            <div class="pd-carousel" id="pd-carousel">
                <div class="pd-carousel-stage" id="pd-stage">${items}</div>
                <button class="pd-carousel-prev" id="pd-prev" aria-label="Anterior">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="pd-carousel-next" id="pd-next" aria-label="Siguiente">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <div class="pd-carousel-dots">${dots}</div>
            </div>
        `;

        setupCarousel();

        // Thumbnails
        thumbsEl.innerHTML = galleryImages.map((src, i) =>
            `<div class="pd-thumb ${i === 0 ? 'active' : ''}" data-index="${i}">
                <img src="${src}" alt="${product.name}">
             </div>`
        ).join('');

        thumbsEl.querySelectorAll('.pd-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const idx = parseInt(thumb.dataset.index);
                goTo(idx);
            });
        });

    } else {
        // Single image
        mainEl.innerHTML = `<img src="${galleryImages[0] || ''}" alt="${product.name}">`;
        thumbsEl.innerHTML = '';
    }
}

function goTo(index) {
    const stage = document.getElementById('pd-stage');
    const dots  = document.querySelectorAll('#pd-carousel .dot');
    const thumbs = document.querySelectorAll('.pd-thumb');

    activeIndex = index;
    if (stage) stage.style.transform = `translateX(-${activeIndex * 100}%)`;
    dots.forEach((d, i)  => d.classList.toggle('active', i === activeIndex));
    thumbs.forEach((t, i) => t.classList.toggle('active', i === activeIndex));
}

function setupCarousel() {
    const count = galleryImages.length;

    document.getElementById('pd-prev')?.addEventListener('click', () => {
        goTo((activeIndex - 1 + count) % count);
    });

    document.getElementById('pd-next')?.addEventListener('click', () => {
        goTo((activeIndex + 1) % count);
    });

    document.querySelectorAll('#pd-carousel .dot').forEach(dot => {
        dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index)));
    });
}

// ── Info Panel ────────────────────────────────────────────────────────────────
function renderInfo(product) {
    document.title = `ÁLAMO — ${product.name}`;

    document.getElementById('pd-breadcrumb-name').textContent = product.name;
    document.getElementById('pd-name').textContent = product.name;
    document.getElementById('pd-price').textContent = product.price;
    document.getElementById('pd-wa-btn').href = buildWaLink(product);

    const metaEl = document.getElementById('pd-meta');
    let metaHTML = '';

    if (product.color) {
        const colors = product.color.split(',').map(c => c.trim()).filter(Boolean);
        const tagsHTML = colors.map(c => `<span class="pd-meta-tag">${c}</span>`).join('');
        metaHTML += `
            <div class="pd-meta-group">
                <span class="pd-meta-label">Color</span>
                <div class="pd-meta-tags">${tagsHTML}</div>
            </div>`;
    }

    if (product.talle) {
        const talles = product.talle.split(',').map(t => t.trim()).filter(Boolean);
        const tagsHTML = talles.map(t => `<span class="pd-meta-tag">${t}</span>`).join('');
        metaHTML += `
            <div class="pd-meta-group">
                <span class="pd-meta-label">Talle</span>
                <div class="pd-meta-tags">${tagsHTML}</div>
            </div>`;
    }

    metaEl.innerHTML = metaHTML || '<p style="color:var(--clr-text-muted); font-size:0.9rem">Sin especificaciones adicionales.</p>';
}

// ── Navbar scroll effect ──────────────────────────────────────────────────────
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    navbar.classList.add('scrolled'); // always visible on product page
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
    });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function loadProduct() {
    const id = getProductId();
    if (!id) {
        window.location.href = '/';
        return;
    }

    try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error('Producto no encontrado');
        const product = await res.json();

        // Normalize images field (PG returns JSON string)
        if (typeof product.images === 'string') {
            try { product.images = JSON.parse(product.images); } catch { product.images = []; }
        }

        renderGallery(product);
        renderInfo(product);

    } catch (err) {
        console.error(err);
        document.getElementById('pd-main-media').innerHTML =
            `<p style="padding:40px; color:var(--clr-text-muted); text-align:center;">No se pudo cargar el producto.</p>`;
        document.getElementById('pd-name').textContent = 'Producto no encontrado';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    loadProduct();
});
