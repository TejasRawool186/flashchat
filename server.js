const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 10e6 // 10MB for file transfers
});

app.use(cors());
app.use(express.json());

// Store active rooms in memory (no database)
const rooms = new Map();

// Generate random 6-digit room code
function generateRoomCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
}

// Room cleanup timeout (5 minutes of inactivity)
const ROOM_TIMEOUT = 5 * 60 * 1000;

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentRoom = null;

  // Create a new room
  socket.on('create-room', (callback) => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      users: new Map(),
      messages: [],
      createdAt: Date.now(),
      timeout: null
    });

    currentRoom = roomCode;
    socket.join(roomCode);
    rooms.get(roomCode).users.set(socket.id, { joinedAt: Date.now() });

    console.log(`Room ${roomCode} created by ${socket.id}`);
    callback({ success: true, roomCode, deviceCount: 1 });
  });

  // Join an existing room
  socket.on('join-room', (roomCode, callback) => {
    const room = rooms.get(roomCode);

    if (!room) {
      callback({ success: false, error: 'Invalid or expired room code' });
      return;
    }

    if (room.users.size >= 5) {
      callback({ success: false, error: 'Room is full (max 5 devices)' });
      return;
    }

    // Clear timeout if exists
    if (room.timeout) {
      clearTimeout(room.timeout);
      room.timeout = null;
    }

    currentRoom = roomCode;
    socket.join(roomCode);
    room.users.set(socket.id, { joinedAt: Date.now() });

    const deviceCount = room.users.size;

    // Notify all users in room about new device
    io.to(roomCode).emit('device-update', {
      deviceCount,
      message: 'A new device joined'
    });

    console.log(`User ${socket.id} joined room ${roomCode}. Devices: ${deviceCount}`);

    // Send chat history to the new user
    if (room.messages && room.messages.length > 0) {
      socket.emit('chat-history', room.messages);
    }

    callback({ success: true, roomCode, deviceCount });
  });

  // Send a text message
  socket.on('send-message', (data) => {
    if (!currentRoom) return;

    const messageData = {
      id: Date.now().toString(),
      text: data.text,
      senderId: socket.id,
      senderName: data.senderName || 'Anonymous',
      timestamp: new Date().toISOString(),
      type: data.type || 'text',
      language: data.language || null,
      messageType: data.type || 'text'
    };

    // Store message in room history
    const room = rooms.get(currentRoom);
    if (room) {
      room.messages.push(messageData);
    }

    // Broadcast to all devices in room (including sender for confirmation)
    io.to(currentRoom).emit('new-message', messageData);
  });

  // Typing indicator events
  socket.on('typing-start', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('typing-start');
  });

  socket.on('typing-stop', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('typing-stop');
  });

  // File transfer - start
  socket.on('file-start', (data) => {
    if (!currentRoom) return;

    socket.to(currentRoom).emit('file-start', {
      fileId: data.fileId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType,
      senderId: socket.id,
      senderName: data.senderName || 'Anonymous',
      totalChunks: data.totalChunks
    });
  });

  // File transfer - chunk
  socket.on('file-chunk', (data) => {
    if (!currentRoom) return;

    socket.to(currentRoom).emit('file-chunk', {
      fileId: data.fileId,
      chunk: data.chunk,
      chunkIndex: data.chunkIndex
    });
  });

  // File transfer - complete
  socket.on('file-complete', (data) => {
    if (!currentRoom) return;

    socket.to(currentRoom).emit('file-complete', {
      fileId: data.fileId,
      fileName: data.fileName,
      senderId: socket.id
    });

    // Notify all (including sender) about the file message
    const fileMessage = {
      id: data.fileId,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType,
      senderId: socket.id,
      senderName: data.senderName || 'Anonymous',
      timestamp: new Date().toISOString(),
      type: 'file'
    };

    // Store file message in room history
    const room = rooms.get(currentRoom);
    if (room) {
      room.messages.push(fileMessage);
    }

    io.to(currentRoom).emit('new-message', fileMessage);
  });

  // Leave room
  socket.on('leave-room', () => {
    handleDisconnect();
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    handleDisconnect();
  });

  function handleDisconnect() {
    if (!currentRoom) return;

    const room = rooms.get(currentRoom);
    if (!room) return;

    room.users.delete(socket.id);
    const deviceCount = room.users.size;

    if (deviceCount === 0) {
      // Set timeout to destroy room
      room.timeout = setTimeout(() => {
        rooms.delete(currentRoom);
        console.log(`Room ${currentRoom} destroyed (empty)`);
      }, ROOM_TIMEOUT);
    } else {
      // Notify remaining users
      io.to(currentRoom).emit('device-update', {
        deviceCount,
        message: 'A device left'
      });
    }

    socket.leave(currentRoom);
    console.log(`User ${socket.id} left room ${currentRoom}. Remaining: ${deviceCount}`);
    currentRoom = null;
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 FlashChat server running on port ${PORT}`);
});
