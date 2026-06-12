const fs = require('fs-extra');
const path = require('path');
const https = require('https');

const API_URL = 'https://alamo-tienda.com/api/products';
const BASE_URL = 'https://alamo-tienda.com/';
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const file = fs.createWriteStream(dest);
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                reject(`Failed to download ${url}: ${response.statusCode}`);
            }
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function sync() {
    console.log("Fetching products from", API_URL);
    
    https.get(API_URL, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async () => {
            try {
                const products = JSON.parse(data);
                await fs.ensureDir(path.dirname(DATA_FILE));
                await fs.writeJson(DATA_FILE, products, { spaces: 2 });
                console.log(`Saved ${products.length} products to ${DATA_FILE}`);

                await fs.ensureDir(UPLOADS_DIR);

                let downloadedCount = 0;
                for (const p of products) {
                    const images = p.images || (p.image ? [p.image] : []);
                    for (const imgPath of images) {
                        if (imgPath && imgPath.startsWith('uploads/')) {
                            const localPath = path.join(__dirname, imgPath);
                            const remoteUrl = BASE_URL + imgPath;
                            if (!(await fs.exists(localPath))) {
                                try {
                                    await downloadFile(remoteUrl, localPath);
                                    downloadedCount++;
                                    console.log(`Downloaded ${imgPath}`);
                                } catch (e) {
                                    console.error(`Error downloading ${imgPath}:`, e);
                                }
                            }
                        }
                    }
                }
                console.log(`Sync complete! Downloaded ${downloadedCount} new images.`);
            } catch (e) {
                console.error("Error parsing or saving data:", e);
            }
        });
    }).on('error', err => {
        console.error("Error fetching API:", err);
    });
}

sync();
