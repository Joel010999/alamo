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
    let selectedFiles = [];

    // --- Category State ---
    let currentCategoryTab = 'Todos';
    let allProducts = [];

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
            allProducts = await res.json();
            renderTable();
        } catch (err) {
            console.error('Error loading products:', err);
        }
    }

    let sortableInstance = null;
    let pendingOrder = null;
    const saveBtn = document.getElementById('save-order-btn');

    function showSaveButton() {
        if (saveBtn) {
            saveBtn.style.display = 'inline-flex';
            saveBtn.classList.add('pulse');
            setTimeout(() => saveBtn.classList.remove('pulse'), 600);
        }
    }

    function hideSaveButton() {
        if (saveBtn) {
            saveBtn.style.display = 'none';
        }
        pendingOrder = null;
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!pendingOrder) return;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            try {
                await fetch('/api/products/reorder', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(pendingOrder)
                });
                // Refresh allProducts to keep local state in sync
                const res = await fetch('/api/products');
                allProducts = await res.json();
                hideSaveButton();
            } catch (e) {
                console.error("Error al guardar orden", e);
                alert('Error al guardar el orden');
            }
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
        });
    }

    function renderTable() {
        let filtered;

        if (currentCategoryTab === 'Todos') {
            // Global view: show all products sorted by global position
            filtered = [...allProducts].sort((a, b) => {
                const posA = a.position !== undefined ? a.position : 0;
                const posB = b.position !== undefined ? b.position : 0;
                if (posA !== posB) return posA - posB;
                return b.id - a.id;
            });
        } else {
            // Category view: filter by category and sort by category_position
            filtered = allProducts
                .filter(p => p.category === currentCategoryTab)
                .sort((a, b) => {
                    const posA = a.category_position !== undefined ? a.category_position : 0;
                    const posB = b.category_position !== undefined ? b.category_position : 0;
                    if (posA !== posB) return posA - posB;
                    return b.id - a.id;
                });
        }

        productsList.innerHTML = '';
        filtered.forEach(p => {
            const tr = document.createElement('tr');
            tr.dataset.id = p.id;
            const mainImg = (p.images && p.images.length > 0) ? p.images[0] : p.image;
            const categoryBadge = p.category ? `<span class="category-badge">${p.category}</span>` : '';
            tr.innerHTML = `
                <td class="drag-handle" style="cursor: grab; color: #ccc; text-align: center;"><i class="fas fa-bars"></i></td>
                <td><img src="${mainImg}" alt="${p.name}" class="table-img"></td>
                <td><strong>${p.name}</strong>${currentCategoryTab === 'Todos' ? '<br>' + categoryBadge : ''}</td>
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

        if (sortableInstance) sortableInstance.destroy();
        sortableInstance = new Sortable(productsList, {
            handle: '.drag-handle',
            animation: 150,
            scroll: true,
            forceAutoScrollFallback: true,
            bubbleScroll: true,
            scrollSensitivity: 100,
            scrollSpeed: 20,
            onEnd: function () {
                const orderedIds = Array.from(productsList.children).map(tr => parseInt(tr.dataset.id));
                const orderType = currentCategoryTab === 'Todos' ? 'global' : 'category';
                pendingOrder = { orderedIds, orderType };
                showSaveButton();
            }
        });
    }

    // --- Category Tabs ---

    const categoryTabsContainer = document.getElementById('category-tabs');
    if (categoryTabsContainer) {
        categoryTabsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.category-tab');
            if (!btn) return;

            // Update active class
            categoryTabsContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');

            // Discard pending order changes and hide save button
            hideSaveButton();

            // Update state and re-render
            currentCategoryTab = btn.dataset.category;
            renderTable();
        });
    }

    // --- Modal Management ---

    function openAddModal() {
        isEditing = false;
        currentId = null;
        selectedFiles = [];
        modalTitle.textContent = 'Agregar Producto';
        productForm.reset();
        imagePreview.innerHTML = '';
        productModal.style.display = 'flex';
    }

    function openEditModal(product) {
        isEditing = true;
        currentId = product.id;
        selectedFiles = [];
        modalTitle.textContent = 'Editar Producto';
        
        document.getElementById('product-id').value = product.id;
        document.getElementById('name').value = product.name;
        document.getElementById('price').value = product.price;
        document.getElementById('talle').value = product.talle || '';
        document.getElementById('color').value = product.color || '';
        document.getElementById('category').value = product.category || 'Tops & Remeras';
        
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

    async function renderPreviews() {
        imagePreview.innerHTML = '';
        
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const result = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${result}" title="${file.name}" />
                <button type="button" class="remove-image-btn" data-index="${i}"><i class="fas fa-trash-alt"></i></button>
            `;
            imagePreview.appendChild(div);
        }

        document.querySelectorAll('.remove-image-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const idx = parseInt(e.currentTarget.dataset.index);
                selectedFiles.splice(idx, 1);
                renderPreviews();
            };
        });
    }

    imageInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        // Accumulate newly selected files
        selectedFiles.push(...files);
        
        // Reset input value so it allows selecting the same file again
        // and prevents FormData from blindly taking only the last batch
        imageInput.value = '';
        
        // Update the preview
        await renderPreviews();
    };

    productForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(productForm);
        
        // Ensure accumulated and sorted multiple images are captured correctly
        if (selectedFiles.length > 0) {
            formData.delete('images'); // Clear any empty/default input values grab by FormData
            for (let i = 0; i < selectedFiles.length; i++) {
                formData.append('images', selectedFiles[i]);
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

    // ── About Image Modal ─────────────────────────────────────────────────────

    const aboutImageBtn   = document.getElementById('about-image-btn');
    const aboutImageModal = document.getElementById('about-image-modal');
    const aboutImgClose   = document.getElementById('about-img-close');
    const aboutImgCurrent = document.getElementById('about-img-current');
    const aboutImgNone    = document.getElementById('about-img-none');
    const aboutImgUpload  = document.getElementById('about-img-upload');
    const aboutImgDelete  = document.getElementById('about-img-delete');
    const aboutImgFeedback= document.getElementById('about-img-feedback');

    function showAboutFeedback(msg, isError = false) {
        aboutImgFeedback.textContent = msg;
        aboutImgFeedback.style.color = isError ? '#c0392b' : '#27ae60';
        setTimeout(() => { aboutImgFeedback.textContent = ''; }, 3500);
    }

    function setAboutModalImage(src) {
        if (src) {
            aboutImgCurrent.src = src;
            aboutImgCurrent.style.display = 'block';
            aboutImgNone.style.display = 'none';
        } else {
            aboutImgCurrent.style.display = 'none';
            aboutImgNone.style.display = 'flex';
        }
    }

    async function openAboutImageModal() {
        aboutImgFeedback.textContent = '';
        aboutImageModal.style.display = 'flex';
        try {
            const res = await fetch('/api/settings');
            const settings = await res.json();
            setAboutModalImage(settings.aboutImage || null);
        } catch (e) {
            showAboutFeedback('Error al cargar la configuración.', true);
        }
    }

    if (aboutImageBtn) aboutImageBtn.onclick = openAboutImageModal;

    if (aboutImgClose) {
        aboutImgClose.onclick = () => { aboutImageModal.style.display = 'none'; };
    }

    // Close on backdrop click (but not on the product modal too)
    window.addEventListener('click', (e) => {
        if (e.target === aboutImageModal) aboutImageModal.style.display = 'none';
    });

    // Upload new image
    if (aboutImgUpload) {
        aboutImgUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            aboutImgDelete.disabled = true;
            showAboutFeedback('Subiendo imagen...');

            const formData = new FormData();
            formData.append('image', file);

            try {
                const res = await fetch('/api/settings/about-image', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (res.ok) {
                    setAboutModalImage(data.aboutImage);
                    showAboutFeedback('✓ Imagen actualizada correctamente.');
                } else {
                    showAboutFeedback(data.error || 'Error al subir imagen.', true);
                }
            } catch (err) {
                showAboutFeedback('Error de red al subir imagen.', true);
            } finally {
                aboutImgUpload.value = '';
                aboutImgDelete.disabled = false;
            }
        });
    }

    // Delete / revert to default
    if (aboutImgDelete) {
        aboutImgDelete.onclick = async () => {
            if (!confirm('¿Eliminar la imagen de presentación y volver a la imagen por defecto?')) return;

            aboutImgDelete.disabled = true;
            showAboutFeedback('Eliminando...');

            try {
                const res = await fetch('/api/settings/about-image', { method: 'DELETE' });
                const data = await res.json();
                if (res.ok) {
                    setAboutModalImage(data.aboutImage);
                    showAboutFeedback('✓ Imagen eliminada. Se restauró la imagen por defecto.');
                } else {
                    showAboutFeedback(data.error || 'Error al eliminar.', true);
                }
            } catch (err) {
                showAboutFeedback('Error de red.', true);
            } finally {
                aboutImgDelete.disabled = false;
            }
        };
    }

    // Init
    checkAuth();
});

