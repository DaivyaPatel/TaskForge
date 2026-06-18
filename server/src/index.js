import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import cors from 'cors';
import { env } from './config/env.js';

// Route Imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import taskRoutes from './routes/task.routes.js';
import mediaRoutes from './routes/media.routes.js';
import healthRoutes from './routes/health.routes.js'; // <-- Imported health routes

// Background Jobs
import './jobs/emailWorker.js'; 
import './jobs/reminderWorker.js'; 

// Middleware & Utilities
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './utils/socket.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// --- PUBLIC GLOBAL ROUTES ---
// Mount the health check BEFORE the rate limiter so health probes don't get blocked
app.use('/health', healthRoutes); 

app.get('/', (req, res) => res.send('Server is running with valid Env vars!'));

// --- PROTECTED API ROUTES ---
app.use('/api/v1', apiLimiter); 

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1', taskRoutes);
app.use('/api/media', mediaRoutes);

app.use(errorHandler);

await initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});