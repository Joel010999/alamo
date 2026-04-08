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
const ADMIN_PASSWORD = 'bornand';

// Ensure directories exist
fs.ensureDirSync(path.join(__dirname, 'data'));
fs.ensureDirSync(UPLOADS_DIR);

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

// Storage functions
async function readProducts() {
    try {
        const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
        const products = JSON.parse(data);
        // Migration: Ensure all have "images" array
        return products.map(p => {
            if (!p.images && p.image) {
                p.images = [p.image];
            } else if (!p.images) {
                p.images = [];
            }
            return p;
        });
    } catch (error) {
        return [];
    }
}

async function writeProducts(products) {
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 4));
}

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

// Products CRUD
app.get('/api/products', async (req, res) => {
    const products = await readProducts();
    res.json(products);
});

app.post('/api/products', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        const products = await readProducts();
        
        // Handle images
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(f => `uploads/${f.filename}`);
        } else if (req.body.image) {
            images = [req.body.image];
        }

        const newProduct = {
            id: Date.now(),
            name: req.body.name,
            price: req.body.price,
            talle: req.body.talle || "",
            color: req.body.color || "",
            images: images,
            image: images[0] || "" // Keep single image for compatibility
        };
        products.push(newProduct);
        await writeProducts(products);
        res.json(newProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/products/:id', requireAuth, upload.array('images', 10), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const products = await readProducts();
        const index = products.findIndex(p => p.id === id);
        
        if (index === -1) return res.status(404).json({ error: 'Producto no encontrado' });

        const updatedProduct = {
            ...products[index],
            name: req.body.name || products[index].name,
            price: req.body.price || products[index].price,
            talle: req.body.talle !== undefined ? req.body.talle : products[index].talle,
            color: req.body.color !== undefined ? req.body.color : products[index].color
        };

        if (req.files && req.files.length > 0) {
            // Delete old images if they were in uploads
            const oldImages = products[index].images || (products[index].image ? [products[index].image] : []);
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        let products = await readProducts();
        const product = products.find(p => p.id === id);
        
        if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

        // Delete all associated images
        const imagesToDelete = product.images || (product.image ? [product.image] : []);
        for (const img of imagesToDelete) {
            if (img && img.startsWith('uploads/')) {
                const imgPath = path.join(__dirname, img);
                if (await fs.exists(imgPath)) await fs.remove(imgPath);
            }
        }

        products = products.filter(p => p.id !== id);
        await writeProducts(products);
        res.json({ success: true });
    } catch (error) {
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
