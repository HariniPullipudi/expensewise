require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const connectDB = require('./src/config/db');
const { csrfInit, csrfVerify } = require('./src/middleware/csrf');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Render's reverse proxy so secure cookies & session work correctly in production
app.set('trust proxy', 1);

// 1. Initiate Database Connection in background (won't block server startup)
connectDB();

// 2. Security Headers via Helmet (with CSP configured for Chart.js, Font Awesome, Google Fonts)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com'
        ],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// 3. CORS Configuration — allow any origin in production (Render assigns dynamic URLs)
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? [process.env.ALLOWED_ORIGIN]
  : true; // true = reflect request origin (safe with credentials for same-site deploys)
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

// 4. Request Body & Cookie Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 5. Static Assets Served FIRST (fast, zero DB latency for CSS, JS, Images, HTML)
app.use(express.static(path.join(__dirname, 'public')));

// 6. Session Configuration (with MemoryStore default + MongoStore when connected)
let sessionStore = null;
if (process.env.USE_MONGO_STORE === 'true') {
  try {
    sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60,
      autoRemove: 'native'
    });
  } catch (err) {
    console.warn('[Session] Using resilient MemoryStore');
  }
}

app.use(
  session({
    name: 'expensewise.sid',
    secret: process.env.SESSION_SECRET || 'dev_secret_fallback_key_academic_project',
    resave: false,
    saveUninitialized: false,
    store: sessionStore || undefined, // undefined falls back to in-memory store
    cookie: {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax',
      maxAge: parseInt(process.env.SESSION_MAX_AGE_MS, 10) || 24 * 60 * 60 * 1000
    }
  })
);

// 7. CSRF Protection Middleware
app.use(csrfInit);

// 8. Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const isConnected = dbStatus === 1;

  res.status(200).json({
    status: 'healthy',
    application: 'ExpenseWise - Personal Expense Tracker with Charts',
    version: '1.0.0',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    database: {
      mode: isConnected ? 'MongoDB (Live Community/Atlas)' : 'Embedded Resilient Engine (Active)',
      connected: isConnected,
      status: isConnected ? 'connected' : 'offline_fallback_active'
    }
  });
});

// 9. API Routes (with CSRF verification on mutating endpoints)
app.use('/api/auth', csrfVerify, authRoutes);
app.use('/api/transactions', csrfVerify, transactionRoutes);
app.use('/api/budgets', csrfVerify, budgetRoutes);
app.use('/api/dashboard', csrfVerify, dashboardRoutes);
app.use('/api/reports', csrfVerify, reportRoutes);

// 10. Clean Page URL Redirects
const allowedPages = [
  'index',
  'login',
  'register',
  'dashboard',
  'transactions',
  'budgets',
  'reports',
  'settings'
];

app.get('/:page', (req, res, next) => {
  const page = req.params.page.replace('.html', '');
  if (allowedPages.includes(page)) {
    return res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  }
  next();
});

// 11. 404 Handler for unknown API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route '${req.originalUrl}' not found.`
  });
});

// 12. Centralized Error Handling Middleware
app.use(errorHandler);

// Global safety net for unhandled rejections during MongoDB background attempts
process.on('unhandledRejection', (reason) => {
  if (reason && reason.name === 'MongoServerSelectionError') {
    // Normal when local MongoDB service is offline
  } else {
    console.warn('[Server Notice]', reason?.message || reason);
  }
});

// 13. Start Server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 ExpenseWise Application Running & Deployed!`);
  console.log(`📍 Local URL:  http://localhost:${PORT}`);
  console.log(`🛡️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Database: Local & Cloud MongoDB / Embedded Resilient Engine`);
  console.log(`====================================================`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n[Server] Gracefully shutting down...');
  server.close(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    console.log('[Server] Process terminated.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
