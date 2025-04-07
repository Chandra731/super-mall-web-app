const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve images

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
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

// Route to handle multiple image uploads
app.post('/upload', upload.array('images', 5), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    // Generate image URLs
    const imageUrls = req.files.map(file => `http://localhost:5000/uploads/${file.filename}`);
    res.json({ imageUrls });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.message);
    if (err instanceof multer.MulterError) {
        // Handle Multer-specific errors
        res.status(400).json({ error: err.message });
    } else if (err.message === 'Only JPG, JPEG, and PNG files are allowed.') {
        // Handle file type errors
        res.status(400).json({ error: err.message });
    } else {
        // Handle other errors
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});