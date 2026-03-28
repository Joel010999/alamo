// Real Product Data from ÁLAMO
const products = [
    {
        id: 1,
        name: "Conjunto Bruma",
        price: "$40.000",
        talle: "M, L",
        color: "Crudo, Blanco, Chocolate",
        image: "image copy 17.webp"
    },
    {
        id: 2,
        name: "Vestido Espalda Descubierta",
        price: "$30.000",
        talle: "S, M",
        image: "image copy 2.webp"
    },
    {
        id: 3,
        name: "Conjunto Arena",
        price: "$49.000",
        talle: "S, M, L",
        image: "image copy 7.webp"
    },
    {
        id: 4,
        name: "Conjunto Lino",
        price: "$48.000",
        talle: "S, M, L",
        image: "image copy 9.webp"
    },
    {
        id: 5,
        name: "Conjunto Rayado",
        price: "$29.000",
        talle: "M, L",
        image: "image copy 10.webp"
    },
    {
        id: 6,
        name: "Buzitos Finitos",
        price: "$20.000",
        talle: "S, M",
        color: "Gris, Marrón",
        image: "image copy 22.webp"
    },
    {
        id: 7,
        name: "Pantalón Amplio",
        price: "$25.000",
        talle: "M, L",
        color: "Negro, Beige, Marrón",
        image: "image copy 23.webp"
    },
    {
        id: 8,
        name: "Conjunto Short Chocolate",
        price: "$35.500",
        talle: "S, M",
        image: "image copy 6.webp"
    },
    {
        id: 9,
        name: "Básicas",
        price: "$15.000",
        talle: "S, M",
        color: "Marrón, Negro, Crudo",
        image: "image copy 29.webp"
    },
    {
        id: 10,
        name: "Roma Set",
        price: "$38.000", // Placeholder if not found
        talle: "S, M, L",
        color: "Chocolate, Blanco",
        image: "image copy 12.webp"
    },
    {
        id: 11,
        name: "Top S/M",
        price: "$31.000",
        talle: "S, M",
        image: "image copy 13.webp"
    },
    {
        id: 12,
        name: "Cintos Leather",
        price: "$20.000",
        image: "image copy 19.webp"
    },
    {
        id: 13,
        name: "Lentes Premium",
        price: "$20.000",
        image: "image copy 24.webp"
    },
    {
        id: 14,
        name: "Conjunto Comfy",
        price: "$38.000",
        talle: "S, M, L",
        image: "image copy 27.webp"
    }
];

// Base WhatsApp Phone Number
const WHATSAPP_PHONE = "543512751860";

// Render Products
function renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    products.forEach((product, index) => {
        const card = document.createElement('div');
        const delayClass = `delay-${(index % 3) + 1}`; 
        card.className = `product-card fade-in-up ${delayClass}`;

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

        card.innerHTML = `
            <div class="product-image-wrapper">
                <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
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
    initAnimations();
});
