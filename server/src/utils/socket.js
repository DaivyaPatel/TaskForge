import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' } // We will tighten this for production later
  });

  io.on('connection', (socket) => {
    // When a user logs in on the frontend, they will tell the socket to join a room with their User ID
    socket.on('join_user_room', (userId) => {
      socket.join(userId);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) throw new Error("Socket.io has not been initialized!");
  return io;
};

// Export the raw IO instance just in case we need it
export const getIO = () => {
  if (!io) throw new Error("Socket.io has not been initialized!");
  return io;
};

// The main broadcast helper for our controllers
export const broadcastToWorkspace = (workspaceId, event, payload, excludeSocketId = null) => {
  if (!io) return; 

  const room = `workspace:${workspaceId}`;
  
  if (excludeSocketId) {
    // Broadcast to everyone in the room EXCEPT the sender
    io.to(room).except(excludeSocketId).emit(event, payload);
  } else {
    // Broadcast to absolutely everyone in the room
    io.to(room).emit(event, payload);
  }
};
