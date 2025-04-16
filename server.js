const express = require('express');
const nodemon = require('nodemon');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
// Custom file cleanup function
function cleanupOldFiles(dir, maxAgeMs) {
  fs.readdir(dir, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error('Cleanup error:', err);
      return;
    }

    const now = Date.now();
    files.forEach(file => {
      if (file.isFile()) {
        const filePath = path.join(dir, file.name);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlink(filePath, err => {
              if (err) {
                console.error('Failed to delete:', filePath, err);
              } else {
                console.log('Cleaned up:', filePath);
              }
            });
          }
        });
      }
    });
  });
}
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 5001;

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

// Unified upload handler
const handleUpload = (type, files) => {
  if (!files || files.length === 0 || !files[0]) {
    throw new Error('No files uploaded');
  }

  // Ensure the file object exists and has filename property
  const validFiles = files.filter(file => file && file.filename);
  if (validFiles.length === 0) {
    throw new Error('Invalid file upload');
  }

  const urls = validFiles.map(file => 
    `http://localhost:${PORT}/uploads/${uploadDirs[type]}${file.filename}`
  );

  return { 
    success: true, 
    urls,
    imageUrl: urls[0] // Always return first URL for single file uploads
  };
};

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type;
    if (uploadDirs[type]) {
      cb(null, uploadDirs[type]);
    } else {
      cb(new Error('Invalid upload type'));
    }
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
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting to upload routes
app.use('/upload', limiter);

// CORS setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Enhanced static file serving with proper MIME types
app.use(express.static('public', {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath);
    const mimeTypes = {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };

    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// Expose uploaded images
app.use('/uploads', express.static('uploads'));

// Handle favicon requests (both .ico and .png)
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    res.sendFile(path.join(__dirname, 'public', 'favicon.png'));
  }
});

app.get('/favicon.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'favicon.png'));
});

// Fallback route for client-side routing
// Only serve index.html for non-API routes
app.get(/^\/(?!api|upload|uploads|api-docs).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Request logging and timing middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} from ${req.ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

/**
 * @swagger
 * /upload/shop:
 *   post:
 *     summary: Upload shop images
 *     description: Upload up to 5 images for a shop
 *     tags: [Shops]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Image URLs of uploaded files
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 urls:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Invalid file upload
 *       500:
 *         description: Server error
 */
// Unified upload endpoint with support for both single and multiple files
app.post('/upload/:type', (req, res, next) => {
  const { type } = req.params;
  
  // Handle product images differently (single file)
  if (type === 'products') {
    upload.single('productImage')(req, res, (err) => {
      if (err) return next(err);
      req.files = [req.file]; // Convert to array format for handleUpload
      next();
    });
  } else {
    // Handle other types (shops, profile) with multiple files
    upload.array('images', 5)(req, res, next);
  }
}, (req, res) => {
  try {
    const { type } = req.params;
    
    if (!uploadDirs[type]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid upload type'
      });
    }

    const response = handleUpload(type, req.files);

    console.log('📝 Sending response:', response);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(response);
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// 404 Fallback for unmatched API routes
app.use('/upload', (req, res) => {
  res.status(404).json({ success: false, message: 'Upload route not found' });
});

// Catch-all for any other errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: err.message || 'Server error' });
});

// Setup file cleanup job (runs daily)
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
setInterval(() => {
  Object.values(uploadDirs).forEach(dir => {
    cleanupOldFiles(path.join(__dirname, dir), THIRTY_DAYS_MS);
  });
}, 24 * 60 * 60 * 1000); // Run daily

// Start server with nodemon in development
if (process.env.NODE_ENV === 'development') {
  nodemon({
    script: 'server.js',
    ext: 'js json',
    ignore: ['uploads/']
  }).on('restart', () => {
    console.log('🔄 Server restarted due to changes');
  });
}

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Super Mall API',
      version: '1.0.0',
      description: 'API for shop and product image uploads'
    },
    servers: [
      { url: `http://localhost:${PORT}` }
    ],
  },
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`⚙️  Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 API docs at http://localhost:${PORT}/api-docs`);
});
