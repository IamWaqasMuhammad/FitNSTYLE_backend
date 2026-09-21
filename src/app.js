/**
 * @file app.js
 * @layer Application Bootstrap
 *
 * This is the application entry point. It is responsible for:
 *   1. Creating and configuring the Express application instance.
 *   2. Registering global middleware (CORS, JSON parser, request logging).
 *   3. Mounting versioned API route modules.
 *   4. Registering a global 404 handler for unmatched routes.
 *   5. Registering a global error handler for uncaught synchronous/async errors.
 *   6. Starting the HTTP server on the configured port.
 *
 * Environment Variables:
 *   PORT - The port to listen on (defaults to 3000 if not set).
 *           Used by cloud platforms (Render, Koyeb, Railway) automatically.
 */

import express from 'express';
import cors from 'cors';
import productRoutes from './routes/productRoutes.js';

// ─────────────────────────────────────────────────────────────────────────────
// Application Initialization
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Global Middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CORS — Wildcard enabled for Flutter/mobile clients.
 * In production, replace `origin: '*'` with an explicit allowlist:
 *   origin: ['https://yourapp.com', 'https://admin.yourapp.com']
 */
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/**
 * Body Parser — Enables parsing of JSON request bodies.
 * The 10mb limit accommodates potential bulk payload endpoints in future versions.
 */
app.use(express.json({ limit: '10mb' }));

/**
 * Request Logger — Lightweight structured console logging for every request.
 * Replace with a proper logging library (e.g., Winston, Pino) for production.
 */
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Health Check (Root Endpoint)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /
 * @desc    Health check / API root — useful for cloud platform uptime monitors.
 * @access  Public
 */
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: '🛍️ FitNSTYLE API is live and running.',
    version: 'v1',
    documentation: '/api/v1',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /api/v1
 * @desc    API v1 root — returns available routes for discoverability.
 * @access  Public
 */
app.get('/api/v1', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'FitNSTYLE REST API — Version 1',
    availableEndpoints: [
      {
        method: 'GET',
        path: '/api/v1/products',
        description: 'List all products. Supports ?gender=, ?type=, ?search= filters.',
      },
      {
        method: 'GET',
        path: '/api/v1/products/:id',
        description: 'Get a single product by its unique ID.',
      },
      {
        method: 'GET',
        path: '/api/v1/categories',
        description: 'Get all available filter categories and their label/value pairs.',
      },
    ],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Routes — Versioned Mounting
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/v1', productRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler — Catches All Unmatched Routes
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: 'Visit GET /api/v1 to see all available endpoints.',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler — Catches All Errors Passed via next(error)
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, _next) => {
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'An unexpected internal server error occurred.';

  console.error(
    `[GlobalErrorHandler] ${req.method} ${req.originalUrl} → ${statusCode}: ${message}`
  );

  // Do not leak stack traces in production
  const responseBody = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(statusCode).json(responseBody);
});

// ─────────────────────────────────────────────────────────────────────────────
// Server Start
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║        🛍️  FitNSTYLE API Server              ║');
  console.log('  ╠══════════════════════════════════════════════╣');
  console.log(`  ║  Status  : ✅ Running                        ║`);
  console.log(`  ║  Port    : ${PORT}                              ║`);
  console.log(`  ║  Env     : ${(process.env.NODE_ENV || 'development').padEnd(12)}                  ║`);
  console.log(`  ║  Base    : http://localhost:${PORT}/api/v1      ║`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
});

export default app;
