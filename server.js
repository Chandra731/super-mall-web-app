const express = require('express');
const nodemon = require('nodemon');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const Razorpay = require('razorpay');

// Dialogflow integration imports
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');

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

// Dialogflow configuration - replace with your actual values
const CREDENTIALS_PATH = './credentials.json';
const projectId = 'divya-ygiu';

// Create a new session client
const sessionClient = new dialogflow.SessionsClient({
  keyFilename: CREDENTIALS_PATH,
});

// Razorpay instance with test credentials (replace with your own)
const razorpay = new Razorpay({
  key_id: 'rzp_test_aInlr2JkOeUewn',
  key_secret: 'wGUUFXRtNz6BW76rGArkBf1U'
});
// Upload folders
const uploadDirs = {
  shops: 'shop-images/',
  profile: 'profile-images/',
  products: 'product-images/'
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
      cb(null, 'uploads/' + uploadDirs[type]);
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

// Dialogflow API endpoint
app.post('/api/dialogflow', async (req, res) => {
  try {
    const { message, sessionId, userRole } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Use provided sessionId or generate a new one
    const sessionIdToUse = sessionId || uuid.v4();

    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionIdToUse);

    // Prepare input contexts based on user role
    const inputContexts = [];
    if (userRole) {
      inputContexts.push({
        name: `${sessionPath}/contexts/userrole_${userRole.toLowerCase()}`,
        lifespanCount: 5,
      });
    }

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: 'en-US',
        },
      },
      queryParams: {
        contexts: inputContexts,
      },
    };

    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    res.json({
      responseText: result.fulfillmentText,
      intent: result.intent ? result.intent.displayName : null,
      sessionId: sessionIdToUse,
      parameters: result.parameters ? result.parameters.fields : null,
    });
  } catch (error) {
    console.error('Dialogflow error:', error);
    res.status(500).json({ error: 'Dialogflow request failed' });
  }
});

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
app.get(/^\/(?!api|upload|uploads|api-docs|payment).*/, (req, res) => {
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

// Razorpay order creation endpoint
app.post('/payment/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt } = req.body;
    const options = {
      amount: amount * 100, // amount in the smallest currency unit
      currency: currency || 'INR',
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1
    };
    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
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
  } else if (type === 'shops') {
    // Handle shop images with single file upload
    upload.single('shopImage')(req, res, (err) => {
      if (err) return next(err);
      req.files = [req.file]; // Convert to array format for handleUpload
      next();
    });
  } else {
    // Handle other types (profile) with multiple files
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
      description: 'API for shop and product image uploads and Razorpay payment integration'
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
