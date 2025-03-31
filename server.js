const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve images

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, 'uploads/shops');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file limit
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png'];
        if (!allowedExtensions.includes(path.extname(file.originalname).toLowerCase())) {
            return cb(new Error('Only JPG, JPEG, and PNG files are allowed.'));
        }
        cb(null, true);
    }
});

// Route to handle image upload
app.post('/upload', upload.single('shopImage'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate image URL
    const imageUrl = `http://localhost:5000/uploads/shops/${req.file.filename}`;
    res.json({ imageUrl });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(500).json({ error: err.message });
});

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});
