import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let io;

export const initSocket = async (httpServer) => {
  // 1. Initialize Socket.io
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN,
      credentials: true
    }
  });

  // 2. Setup Redis Adapter for Pub/Sub (Scaling)
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  // 3. JWT Authentication Middleware (Using Cookies!)
  io.use((socket, next) => {
    const cookieString = socket.handshake.headers.cookie;
    if (!cookieString) return next(new Error("Authentication error: No cookies"));

    const tokenMatch = cookieString.match(/(?:^|;\s*)token=([^;]*)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; 
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // 4. Connection & Event Handling
  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.user.userId} (Socket ID: ${socket.id})`);

    // Handle Workspace Join Request
    socket.on('workspace:join', async (workspaceId, callback) => {
      try {
        const membership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: workspaceId,
              userId: socket.user.userId
            }
          }
        });

        if (!membership) {
          if (typeof callback === 'function') callback({ error: "Unauthorized access" });
          return;
        }

        // Leave previous room if switching workspaces
        if (socket.workspaceId) {
          socket.leave(`workspace:${socket.workspaceId}`);
          socket.to(`workspace:${socket.workspaceId}`).emit('presence:leave', socket.user.userId);
        }

        const roomName = `workspace:${workspaceId}`;
        socket.join(roomName);
        socket.workspaceId = workspaceId; // Track current room

        // Fetch user info for the presence avatar/name
        const user = await prisma.user.findUnique({
          where: { id: socket.user.userId },
          select: { id: true, displayName: true, avatarUrl: true }
        });
        
        socket.presenceData = user;

        // Broadcast to others that this user joined
        socket.to(roomName).emit('presence:join', user);

        // Get the list of all *other* users currently in the room
        const socketsInRoom = await io.in(roomName).fetchSockets();
        const activeUsersMap = new Map();
        for (const s of socketsInRoom) {
          if (s.presenceData && s.presenceData.id !== user.id) {
            activeUsersMap.set(s.presenceData.id, s.presenceData);
          }
        }
        const activeUsers = Array.from(activeUsersMap.values());

        // Acknowledge success and pass back the active users list
        if (typeof callback === 'function') callback({ success: true, activeUsers });
      } catch (error) {
        console.error("[Socket] Workspace join error:", error);
        if (typeof callback === 'function') callback({ error: "Server error" });
      }
    });

    // Explicit leave
    socket.on('workspace:leave', () => {
      if (socket.workspaceId && socket.presenceData) {
        const roomName = `workspace:${socket.workspaceId}`;
        socket.leave(roomName);
        socket.to(roomName).emit('presence:leave', socket.presenceData.id);
        socket.workspaceId = null;
      }
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      if (socket.workspaceId && socket.presenceData) {
        // Let the workspace know they dropped off
        socket.to(`workspace:${socket.workspaceId}`).emit('presence:leave', socket.presenceData.id);
      }
    });
  });
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io has not been initialized!");
  return io;
};

export const broadcastToWorkspace = (workspaceId, event, payload, excludeSocketId = null) => {
  if (!io) return; 

  const room = `workspace:${workspaceId}`;
  
  if (excludeSocketId) {
    io.to(room).except(excludeSocketId).emit(event, payload);
  } else {
    io.to(room).emit(event, payload);
  }
};