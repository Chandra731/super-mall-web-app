const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 5000;

// Upload folders
const uploadDirs = {
  shops: 'uploads/shop-images/',
  profile: 'uploads/profile-images/',
  products: 'uploads/product-images/'
};

// Ensure upload directories exist
Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.originalUrl.includes('shop')) cb(null, uploadDirs.shops);
    else if (req.originalUrl.includes('profile')) cb(null, uploadDirs.profile);
    else if (req.originalUrl.includes('product')) cb(null, uploadDirs.products);
    else cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// CORS setup
app.use(cors({
  origin: '*', // Or 'http://localhost:3000'
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ⚠️ Place static after routes
// But expose uploaded images
app.use('/uploads', express.static('uploads'));

// ✅ SHOP IMAGE UPLOAD API
app.post('/upload/shop-images', upload.array('shopImages', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const imageUrls = req.files.map(file => `http://localhost:${PORT}/uploads/shop-images/${file.filename}`);
    res.json({ imageUrls });
  } catch (err) {
    console.error('Shop image upload error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Profile Image
app.post('/upload/profile-images', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  const imageUrl = `http://localhost:${PORT}/uploads/profile-images/${req.file.filename}`;
  return res.status(200).json({ imageUrl });
});

// Product Images
app.post('/upload/product-images', upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No images uploaded' });
  }
  const imageUrls = req.files.map(file => `http://localhost:${PORT}/uploads/product-images/${file.filename}`);
  return res.status(200).json({ imageUrls });
});

// 404 Fallback for unmatched API routes
app.use('/upload', (req, res) => {
  res.status(404).json({ message: 'Upload route not found' });
});

// Catch-all for any other errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
