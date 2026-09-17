import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import authRoutes from './server/routes/auth.ts';
import courseRoutes from './server/routes/courses.ts';
import paymentRoutes from './server/routes/payments.ts';
import watchRoutes from './server/routes/watch.ts';
import adminRoutes from './server/routes/admin.ts';
import { razorpayService } from './server/razorpay.ts';
import { cloudflareStreamService } from './server/cloudflare.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // CORS & Body parsing
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Health & Diagnostics
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'NextGen Learn',
      timestamp: new Date().toISOString(),
      services: {
        database: 'Cloudflare D1 SQL (SQLite Engine)',
        razorpay: razorpayService.isConfigured() ? 'Live Production' : 'Sandbox Test Mode',
        cloudflareStream: cloudflareStreamService.isConfigured()
          ? 'Cloudflare Stream Live'
          : 'Cloudflare Stream Sandbox',
      },
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/watch', watchRoutes);
  app.use('/api/admin', adminRoutes);

  // API 404 handler
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // Central Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server exception:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error occurred.',
    });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================================`);
    console.log(` NextGen Learn server listening on port ${PORT}`);
    console.log(` Razorpay: ${razorpayService.isConfigured() ? 'LIVE' : 'SANDBOX / TEST'}`);
    console.log(` Stream: ${cloudflareStreamService.isConfigured() ? 'LIVE' : 'SANDBOX / TEST'}`);
    console.log(`=================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
