document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('login-overlay');
    const adminContent = document.getElementById('admin-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    
    const productsList = document.getElementById('products-list');
    const addProductBtn = document.getElementById('add-product-btn');
    const productModal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const closeModal = document.querySelector('.close');
    const modalTitle = document.getElementById('modal-title');
    const imageInput = document.getElementById('images');
    const imagePreview = document.getElementById('image-preview');

    let isEditing = false;
    let currentId = null;

    // --- Authentication ---

    async function checkAuth() {
        try {
            const res = await fetch('/api/check-auth');
            const data = await res.json();
            if (data.authenticated) {
                showAdmin();
            } else {
                showLogin();
            }
        } catch (err) {
            showLogin();
        }
    }

    function showAdmin() {
        loginOverlay.style.display = 'none';
        adminContent.style.display = 'block';
        loadProducts();
    }

    function showLogin() {
        loginOverlay.style.display = 'flex';
        adminContent.style.display = 'none';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (data.success) {
                showAdmin();
            } else {
                loginError.textContent = 'Contraseña incorrecta';
            }
        } catch (err) {
            loginError.textContent = 'Error del servidor';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        location.reload();
    });

    // --- Products Management ---

    async function loadProducts() {
        try {
            const res = await fetch('/api/products');
            const products = await res.json();
            renderTable(products);
        } catch (err) {
            console.error('Error loading products:', err);
        }
    }

    function renderTable(products) {
        productsList.innerHTML = '';
        products.forEach(p => {
            const tr = document.createElement('tr');
            const mainImg = (p.images && p.images.length > 0) ? p.images[0] : p.image;
            tr.innerHTML = `
                <td><img src="${mainImg}" alt="${p.name}" class="table-img"></td>
                <td><strong>${p.name}</strong></td>
                <td>${p.price}</td>
                <td><small>${p.talle || '-'}</small><br><small>${p.color || '-'}</small></td>
                <td>
                    <button class="action-btn edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" data-id="${p.id}"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            
            tr.querySelector('.edit-btn').onclick = () => openEditModal(p);
            tr.querySelector('.delete-btn').onclick = () => deleteProduct(p.id);
            
            productsList.appendChild(tr);
        });
    }

    // --- Modal Management ---

    function openAddModal() {
        isEditing = false;
        currentId = null;
        modalTitle.textContent = 'Agregar Producto';
        productForm.reset();
        imagePreview.innerHTML = '';
        productModal.style.display = 'flex';
    }

    function openEditModal(product) {
        isEditing = true;
        currentId = product.id;
        modalTitle.textContent = 'Editar Producto';
        
        document.getElementById('product-id').value = product.id;
        document.getElementById('name').value = product.name;
        document.getElementById('price').value = product.price;
        document.getElementById('talle').value = product.talle || '';
        document.getElementById('color').value = product.color || '';
        
        imagePreview.innerHTML = '';
        const imgs = product.images || [product.image];
        imgs.forEach(img => {
            if (img) imagePreview.innerHTML += `<div class="preview-item"><img src="${img}" /></div>`;
        });
        productModal.style.display = 'flex';
    }

    addProductBtn.onclick = openAddModal;
    closeModal.onclick = () => productModal.style.display = 'none';
    window.onclick = (e) => { 
        if (e.target == productModal) productModal.style.display = 'none'; 
    };

    imageInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        imagePreview.innerHTML = '';
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.innerHTML += `<div class="preview-item"><img src="${e.target.result}" /></div>`;
            };
            reader.readAsDataURL(file);
        });
    };

    productForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(productForm);
        
        // Ensure multiple images are captured correctly
        const files = imageInput.files;
        if (files.length > 0) {
            formData.delete('images'); // Clear old ones if any
            for (let i = 0; i < files.length; i++) {
                formData.append('images', files[i]);
            }
        }

        const url = isEditing ? `/api/products/${currentId}` : '/api/products';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                body: formData
            });

            if (res.ok) {
                productModal.style.display = 'none';
                loadProducts();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Error al guardar producto');
        }
    };

    async function deleteProduct(id) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            if (res.ok) loadProducts();
        } catch (err) {
            alert('Error al eliminar');
        }
    }

    // Init
    checkAuth();
});
