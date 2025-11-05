import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import logger from './utils/logger.js';
import pool from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import userRoutes from './routes/userRoutes.js';

import roleRoutes from './routes/roleRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ DEBUG MIDDLEWARE - Log all incoming requests
app.use((req, res, next) => {
  console.log('\n========== INCOMING REQUEST ==========');
  console.log('📍 Method:', req.method);
  console.log('📍 URL:', req.url);
  console.log('📍 Path:', req.path);
  console.log('📍 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📍 Body:', JSON.stringify(req.body, null, 2));
  console.log('📍 Query:', JSON.stringify(req.query, null, 2));
  console.log('======================================\n');
  next();
});

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      success: true,
      service: 'role-permission-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      service: 'role-permission-service',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// API routes
app.use('/api', roleRoutes);
app.use('/api', permissionRoutes);
app.use('/api', assignmentRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ✅ Test database connection before starting server
(async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('✅ Database connection successful');
  } catch (err) {
    logger.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }

  // Start server
  app.listen(PORT, () => {
    logger.info(`🚀 Role & Permission Service running on port ${PORT}`);
    logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🗄️  Database: ${process.env.DB_NAME}`);
    logger.info(`🔧 Debug mode: ENABLED`);
  });
})();

export default app;
// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
// import dotenv from 'dotenv';

// import logger from './utils/logger.js';
// import pool from './config/database.js';
// import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
// import userRoutes from './routes/userRoutes.js';

// import roleRoutes from './routes/roleRoutes.js';
// import permissionRoutes from './routes/permissionRoutes.js';
// import assignmentRoutes from './routes/assignmentRoutes.js';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3004;

// // Security middleware
// app.use(helmet());

// // CORS configuration
// const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true
// }));

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000, // limit each IP to 1000 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// // Body parsing middleware
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Request logging
// app.use((req, res, next) => {
//   logger.info(`${req.method} ${req.path}`, {
//     ip: req.ip,
//     userAgent: req.get('user-agent')
//   });
//   next();
// });

// // Health check endpoint
// app.get('/health', async (req, res) => {
//   try {
//     await pool.query('SELECT 1');
//     res.status(200).json({
//       success: true,
//       service: 'role-permission-service',
//       status: 'healthy',
//       timestamp: new Date().toISOString(),
//       database: 'connected'
//     });
//   } catch (error) {
//     logger.error('Health check failed:', error);
//     res.status(503).json({
//       success: false,
//       service: 'role-permission-service',
//       status: 'unhealthy',
//       timestamp: new Date().toISOString(),
//       database: 'disconnected'
//     });
//   }
// });

// // API routes
// app.use('/api', roleRoutes);
// app.use('/api', permissionRoutes);
// app.use('/api', assignmentRoutes);
// app.use('/api/users', userRoutes);

// // 404 handler
// app.use(notFoundHandler);

// // Error handler
// app.use(errorHandler);

// // Graceful shutdown
// const gracefulShutdown = async () => {
//   logger.info('Shutting down gracefully...');
//   await pool.end();
//   process.exit(0);
// };

// process.on('SIGTERM', gracefulShutdown);
// process.on('SIGINT', gracefulShutdown);

// // ✅ Test database connection before starting server
// (async () => {
//   try {
//     await pool.query('SELECT 1');
//     logger.info('✅ Database connection successful');
//   } catch (err) {
//     logger.error('❌ Failed to connect to database:', err.message);
//     process.exit(1);
//   }

//   // Start server
//   app.listen(PORT, () => {
//     logger.info(`🚀 Role & Permission Service running on port ${PORT}`);
//     logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
//     logger.info(`🗄️  Database: ${process.env.DB_NAME}`);
//   });
// })();

// export default app;

// import express from 'express';
// import cors from 'cors';
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
// import dotenv from 'dotenv';

// import logger from './utils/logger.js';
// import pool from './config/database.js';
// import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// import roleRoutes from './routes/roleRoutes.js';
// import permissionRoutes from './routes/permissionRoutes.js';
// import assignmentRoutes from './routes/assignmentRoutes.js';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3004;

// // Security middleware
// app.use(helmet());

// // CORS configuration
// const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true
// }));

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000, // limit each IP to 1000 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// // Body parsing middleware
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Request logging
// app.use((req, res, next) => {
//   logger.info(`${req.method} ${req.path}`, {
//     ip: req.ip,
//     userAgent: req.get('user-agent')
//   });
//   next();
// });

// // Health check endpoint
// app.get('/health', async (req, res) => {
//   try {
//     await pool.query('SELECT 1');
//     res.status(200).json({
//       success: true,
//       service: 'role-permission-service',
//       status: 'healthy',
//       timestamp: new Date().toISOString(),
//       database: 'connected'
//     });
//   } catch (error) {
//     logger.error('Health check failed:', error);
//     res.status(503).json({
//       success: false,
//       service: 'role-permission-service',
//       status: 'unhealthy',
//       timestamp: new Date().toISOString(),
//       database: 'disconnected'
//     });
//   }
// });

// // API routes
// app.use('/api', roleRoutes);
// app.use('/api', permissionRoutes);
// app.use('/api', assignmentRoutes);

// // 404 handler
// app.use(notFoundHandler);

// // Error handler
// app.use(errorHandler);

// // Graceful shutdown
// const gracefulShutdown = async () => {
//   logger.info('Shutting down gracefully...');
//   await pool.end();
//   process.exit(0);
// };

// process.on('SIGTERM', gracefulShutdown);
// process.on('SIGINT', gracefulShutdown);

// // Start server
// app.listen(PORT, () => {
//   logger.info(`🚀 Role & Permission Service running on port ${PORT}`);
//   logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
//   logger.info(`Database: ${process.env.DB_NAME}`);
// });

// export default app;
