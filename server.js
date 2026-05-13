const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bornand';

// Determine storage mode
const USE_PG = !!process.env.DATABASE_URL;
let pool = null;

if (USE_PG) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    // Migrate DB
    pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "position" INTEGER DEFAULT 0;')
        .catch(err => console.error("Error migrating DB (position):", err));
    pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT '';")
        .catch(err => console.error("Error migrating DB (category):", err));
    console.log("📦 Usando PostgreSQL como almacenamiento.");
} else {
    console.log("📁 Usando JSON local como almacenamiento (no se detectó DATABASE_URL).");
}

// Ensure directories exist
fs.ensureDirSync(path.join(__dirname, 'data'));
fs.ensureDirSync(UPLOADS_DIR);

// --- JSON Storage Functions (fallback local) ---
async function readProducts() {
    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
        const products = JSON.parse(data);
        return products.map(p => {
            if (!p.images && p.image) p.images = [p.image];
            else if (!p.images) p.images = [];
            if (!p.category) p.category = '';
            if (p.position === undefined) p.position = 0;
            return p;
        });
    } catch (error) {
        return [];
    }
}

async function writeProducts(products) {
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 4));
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'alamo-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Multer for multiple image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Auth Middleware
const requireAuth = (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
        res.status(401).json({ error: 'No autorizado' });
    }
};

// --- API Endpoints ---

// Login
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Contraseña incorrecta' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
    res.json({ authenticated: !!req.session.authenticated });
});

// ===================== PRODUCTS CRUD =====================

// GET all products
app.get('/api/products', async (req, res) => {
    try {
        if (USE_PG) {
            const result = await pool.query('SELECT * FROM products ORDER BY position ASC, id DESC');
            res.json(result.rows);
        } else {
            const products = await readProducts();
            products.sort((a, b) => (a.position || 0) - (b.position || 0));
            res.json(products);
        }
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// REORDER products
app.patch('/api/products/reorder', requireAuth, async (req, res) => {
    try {
        const { orderedIds } = req.body;
        if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array' });
        
        if (USE_PG) {
            for (let i = 0; i < orderedIds.length; i++) {
                await pool.query('UPDATE products SET position = $1 WHERE id = $2', [i, orderedIds[i]]);
            }
        } else {
            const products = await readProducts();
            for (let i = 0; i < orderedIds.length; i++) {
                const p = products.find(x => x.id === orderedIds[i]);
                if (p) p.position = i;
            }
            await writeProducts(products);
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Error reordering products:", error);
        res.status(500).json({ error: 'Error al reordenar productos' });
    }
});

// CREATE product
app.post('/api/products', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        // Handle images
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(f => `uploads/${f.filename}`);
        } else if (req.body.image) {
            images = [req.body.image];
        }

        const image = images[0] || "";

        if (USE_PG) {
            const result = await pool.query(
                'INSERT INTO products (name, price, talle, color, image, images, category) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [req.body.name, req.body.price, req.body.talle || "", req.body.color || "", image, JSON.stringify(images), req.body.category || ""]
            );
            res.json(result.rows[0]);
        } else {
            const products = await readProducts();
            const newProduct = {
                id: Date.now(),
                name: req.body.name,
                price: req.body.price,
                talle: req.body.talle || "",
                color: req.body.color || "",
                category: req.body.category || "",
                images: images,
                image: image,
                position: 0
            };
            products.push(newProduct);
            await writeProducts(products);
            res.json(newProduct);
        }
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE product
app.put('/api/products/:id', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (USE_PG) {
            const currentResult = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
            if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
            
            const currentProduct = currentResult.rows[0];

            const name = req.body.name || currentProduct.name;
            const price = req.body.price || currentProduct.price;
            const talle = req.body.talle !== undefined ? req.body.talle : currentProduct.talle;
            const color = req.body.color !== undefined ? req.body.color : currentProduct.color;
            const category = req.body.category !== undefined ? req.body.category : (currentProduct.category || '');

            let images = currentProduct.images;
            let image = currentProduct.image;

            if (req.files && req.files.length > 0) {
                const oldImages = currentProduct.images || (currentProduct.image ? [currentProduct.image] : []);
                for (const img of oldImages) {
                    if (img && img.startsWith('uploads/')) {
                        const oldPath = path.join(__dirname, img);
                        if (await fs.exists(oldPath)) await fs.remove(oldPath);
                    }
                }
                images = req.files.map(f => `uploads/${f.filename}`);
                image = images[0];
            }

            const updateResult = await pool.query(
                'UPDATE products SET name = $1, price = $2, talle = $3, color = $4, image = $5, images = $6, category = $7 WHERE id = $8 RETURNING *',
                [name, price, talle, color, image, JSON.stringify(images), category, id]
            );

            res.json(updateResult.rows[0]);
        } else {
            const products = await readProducts();
            const index = products.findIndex(p => p.id === id);
            if (index === -1) return res.status(404).json({ error: 'Producto no encontrado' });

            const currentProduct = products[index];
            const updatedProduct = {
                ...currentProduct,
                name: req.body.name || currentProduct.name,
                price: req.body.price || currentProduct.price,
                talle: req.body.talle !== undefined ? req.body.talle : currentProduct.talle,
                color: req.body.color !== undefined ? req.body.color : currentProduct.color,
                category: req.body.category !== undefined ? req.body.category : (currentProduct.category || '')
            };

            if (req.files && req.files.length > 0) {
                const oldImages = currentProduct.images || (currentProduct.image ? [currentProduct.image] : []);
                for (const img of oldImages) {
                    if (img && img.startsWith('uploads/')) {
                        const oldPath = path.join(__dirname, img);
                        if (await fs.exists(oldPath)) await fs.remove(oldPath);
                    }
                }
                updatedProduct.images = req.files.map(f => `uploads/${f.filename}`);
                updatedProduct.image = updatedProduct.images[0];
            }

            products[index] = updatedProduct;
            await writeProducts(products);
            res.json(updatedProduct);
        }
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE product
app.delete('/api/products/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (USE_PG) {
            const currentResult = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
            if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
            
            const product = currentResult.rows[0];
            const imagesToDelete = product.images || (product.image ? [product.image] : []);
            for (const img of imagesToDelete) {
                if (img && img.startsWith('uploads/')) {
                    const imgPath = path.join(__dirname, img);
                    if (await fs.exists(imgPath)) await fs.remove(imgPath);
                }
            }

            await pool.query('DELETE FROM products WHERE id = $1', [id]);
        } else {
            let products = await readProducts();
            const product = products.find(p => p.id === id);
            if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

            const imagesToDelete = product.images || (product.image ? [product.image] : []);
            for (const img of imagesToDelete) {
                if (img && img.startsWith('uploads/')) {
                    const imgPath = path.join(__dirname, img);
                    if (await fs.exists(imgPath)) await fs.remove(imgPath);
                }
            }

            products = products.filter(p => p.id !== id);
            await writeProducts(products);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Static Files ---

// Serve uploads folder
app.use('/uploads', express.static(UPLOADS_DIR));

// Admin route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve main app
app.use(express.static(__dirname));

app.listen(PORT, () => {
    console.log(`Servidor ÁLAMO corriendo en http://localhost:${PORT}`);
});
