const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const config = require('./config/config');
const database = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const http = require('http');
const socketService = require('./services/socketService');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());

// CORS configuration for multiple frontends
const allowedOrigins = [
  'http://localhost:3000',    // Website frontend (default)
  'http://localhost:3001',    // Website frontend (alternative/auth service)
  'http://localhost:8081',    // Mobile app (Expo web)
  'http://localhost:19006',   // Alternative Expo web port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  // Deployed domains
  'https://celfedu.com',
  'https://www.celfedu.com',
  'https://mobile.celfedu.com',
  'https://www.mobile.celfedu.com',
  'https://website.celfedu.com',
  'https://www.website.celfedu.com',
  'https://celf-website.vikiflow.com',
  'https://celf-mobile.vikiflow.com',
  process.env.FRONTEND_URL,   // Custom frontend URL from env
  process.env.MOBILE_URL      // Custom mobile URL from env
].filter(Boolean); // Remove undefined values

function isOriginAllowed(origin) {
  if (allowedOrigins.includes(origin)) return true;
  // Allow any Vercel preview/production deployment URLs
  if (origin.endsWith('.vercel.app')) return true;
  return false;
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // limit each IP to 1000 requests per minute (very generous for development)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure MongoDB is connected before handling any request (critical for Vercel serverless)
let dbConnectionPromise = null;

async function ensureDbConnected() {
  if (database.isConnected) return;
  if (!dbConnectionPromise) {
    dbConnectionPromise = database.connect(0, 2).then((conn) => {
      if (conn) {
        console.log('✅ MongoDB connected (serverless)');
      } else {
        console.error('❌ MongoDB connection failed (serverless)');
      }
      dbConnectionPromise = null;
    }).catch((err) => {
      console.error('❌ MongoDB connection error (serverless):', err.message);
      dbConnectionPromise = null;
    });
  }
  await dbConnectionPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureDbConnected();
  } catch (err) {
    console.error('DB connection middleware error:', err.message);
  }
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();

    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'Service Unavailable',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Add a friendly root route for Vercel
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CELF backend is running',
    endpoints: {
      health: '/health',
      api_root: '/api',
      donations_initialize: '/api/donations/initialize',
      donations_verify: '/api/donations/verify/:reference'
    }
  });
});

// API routes
app.use('/api', routes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = config.port || 5000;

// Initialize database and start server (only for non-serverless environments)
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

if (!isVercel) {
  const startServer = async () => {
    try {
      const MAX_ATTEMPTS = 5;
      let connection = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        console.log(`🔄 Connecting to MongoDB (attempt ${attempt}/${MAX_ATTEMPTS})...`);
        try {
          connection = await database.connect(0, 0);
        } catch (error) {
          console.error(`❌ MongoDB single attempt failed: ${error.message}`);
        }

        if (connection) {
          console.log('✅ MongoDB connection successful');
          database.setupEventHandlers();
          break;
        } else if (attempt < MAX_ATTEMPTS) {
          console.warn('⚠️  MongoDB not connected. Retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!connection) {
        console.error('❌ Failed to connect to MongoDB after 5 attempts. Server will not start.');
        console.error('   - Check MongoDB Atlas IP whitelist');
        console.error('   - Verify MONGODB_URI in environment');
        console.error('   - Confirm network connectivity and DNS for SRV records');
        process.exit(1);
        return;
      }

      // Initialize Socket.IO
      socketService.initialize(server);

      // Start server only after successful database connection
      server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Environment: ${config.nodeEnv}`);
        console.log(`🗄️  Database: MongoDB (Connected)`);
        console.log(`🔌 Socket.IO: Initialized`);
        console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  };

  startServer();
}

module.exports = app;
