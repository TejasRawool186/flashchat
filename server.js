require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cheerio = require('cheerio');

// ─── Configuration ───────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const ROOM_CODE_LENGTH = 6;
const MAX_ROOM_USERS = 5;
const SOCKET_RATE_LIMIT = 30; // messages per minute per socket
const SOCKET_RATE_WINDOW = 60 * 1000; // 1 minute
const LINK_CACHE_MAX = 100;
const LINK_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const MAX_MESSAGES_PER_ROOM = 500;

// ─── Express App Setup ───────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS
app.use(cors({ origin: CORS_ORIGIN, methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '1mb' }));

// HTTP rate limiter: 100 requests per 15 minutes
const httpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', httpLimiter);

// ─── Socket.IO Setup ────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 10e6, // 10MB for file transfers
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── In-Memory Stores ───────────────────────────────────────────────────────

const rooms = new Map();
const linkPreviewCache = new Map();

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Sanitize user input — strip HTML tags and script injections.
 */
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, 5000); // hard cap at 5000 chars
}

/**
 * Sanitize a filename — remove path traversal and dangerous chars.
 */
function sanitizeFilename(name) {
  if (typeof name !== 'string') return 'unnamed';
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\.\./g, '_')
    .trim()
    .slice(0, 255) || 'unnamed';
}

/**
 * Generate a random alphanumeric room code (6 chars).
 */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let code;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

/**
 * Generate a unique message ID.
 */
function generateMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build the user list for a room (to broadcast).
 */
function getUserList(room) {
  const users = [];
  for (const [id, user] of room.users) {
    users.push({
      id,
      name: user.name,
      joinedAt: user.joinedAt,
      hasPublicKey: !!user.publicKey,
    });
  }
  return users;
}

/**
 * Broadcast user list update to everyone in a room.
 */
function broadcastUserList(roomCode, room) {
  io.to(roomCode).emit('user-list-update', {
    users: getUserList(room),
    deviceCount: room.users.size,
  });
}

// ─── Socket Rate Limiting ───────────────────────────────────────────────────

const socketMessageCounts = new Map();

function checkSocketRateLimit(socketId) {
  const now = Date.now();
  let entry = socketMessageCounts.get(socketId);

  if (!entry || now - entry.windowStart > SOCKET_RATE_WINDOW) {
    entry = { windowStart: now, count: 0 };
    socketMessageCounts.set(socketId, entry);
  }

  entry.count++;
  return entry.count <= SOCKET_RATE_LIMIT;
}

function clearSocketRateLimit(socketId) {
  socketMessageCounts.delete(socketId);
}

// ─── SSRF Protection for Link Previews ──────────────────────────────────────

function isPrivateIP(hostname) {
  // Block private/reserved IPs
  const privateRanges = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^0\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
    /^fd/i,
    /^localhost$/i,
  ];
  return privateRanges.some((re) => re.test(hostname));
}

// ─── Link Preview Cache Management ─────────────────────────────────────────

function getCachedPreview(url) {
  const cached = linkPreviewCache.get(url);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > LINK_CACHE_TTL) {
    linkPreviewCache.delete(url);
    return null;
  }
  return cached.data;
}

function setCachedPreview(url, data) {
  // Evict oldest entries if over capacity
  if (linkPreviewCache.size >= LINK_CACHE_MAX) {
    const firstKey = linkPreviewCache.keys().next().value;
    linkPreviewCache.delete(firstKey);
  }
  linkPreviewCache.set(url, { data, timestamp: Date.now() });
}

// ─── HTTP Endpoints ─────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  let totalUsers = 0;
  for (const [, room] of rooms) {
    totalUsers += room.users.size;
  }

  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    rooms: rooms.size,
    connectedUsers: totalUsers,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// Link preview endpoint
app.get('/api/link-preview', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid url parameter' });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
    }

    // SSRF protection — block private IPs
    if (isPrivateIP(parsedUrl.hostname)) {
      return res.status(403).json({ error: 'Access to private/internal addresses is blocked' });
    }

    // Check cache
    const cached = getCachedPreview(url);
    if (cached) {
      return res.json(cached);
    }

    // Fetch the URL with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'FlashChat-LinkPreview/2.0 (compatible)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ error: 'Request timed out' });
      }
      return res.status(502).json({ error: 'Failed to fetch URL' });
    }
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: `Remote server returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.status(400).json({ error: 'URL does not return HTML content' });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const preview = {
      title:
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        null,
      description:
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        null,
      image:
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        null,
      siteName:
        $('meta[property="og:site_name"]').attr('content') || null,
      url,
    };

    // Resolve relative image URLs
    if (preview.image && !preview.image.startsWith('http')) {
      try {
        preview.image = new URL(preview.image, url).href;
      } catch {
        preview.image = null;
      }
    }

    // Trim long strings
    if (preview.title) preview.title = preview.title.slice(0, 300);
    if (preview.description) preview.description = preview.description.slice(0, 500);

    setCachedPreview(url, preview);
    res.json(preview);
  } catch (err) {
    console.error('Link preview error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Socket.IO Connection Handling ──────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentRoom = null;
  let currentUserName = 'Anonymous';

  // ── Create Room ────────────────────────────────────────────────────────

  socket.on('create-room', (data, callback) => {
    // Support old signature: (callback) and new: (data, callback)
    if (typeof data === 'function') {
      callback = data;
      data = {};
    }

    try {
      const roomCode = generateRoomCode();
      const userName = sanitize(data?.userName || data?.senderName || 'Anonymous');
      currentUserName = userName;

      rooms.set(roomCode, {
        users: new Map(),
        messages: [],
        reactions: new Map(), // messageId -> Map(emoji -> Set(userId))
        createdAt: Date.now(),
        createdBy: socket.id,
        creatorName: userName,
        timeout: null,
      });

      currentRoom = roomCode;
      socket.join(roomCode);

      const room = rooms.get(roomCode);
      room.users.set(socket.id, {
        name: userName,
        joinedAt: Date.now(),
        publicKey: null,
      });

      console.log(`Room ${roomCode} created by ${userName} (${socket.id})`);
      broadcastUserList(roomCode, room);

      if (typeof callback === 'function') {
        callback({ success: true, roomCode, deviceCount: 1 });
      }
    } catch (err) {
      console.error('Error creating room:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to create room' });
      }
    }
  });

  // ── Join Room ──────────────────────────────────────────────────────────

  socket.on('join-room', (roomCode, data, callback) => {
    // Support old signature: (roomCode, callback) and new: (roomCode, data, callback)
    if (typeof data === 'function') {
      callback = data;
      data = {};
    }

    try {
      if (typeof roomCode !== 'string') {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Invalid room code' });
        }
        return;
      }

      roomCode = roomCode.toUpperCase().trim();
      const room = rooms.get(roomCode);

      if (!room) {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Invalid or expired room code' });
        }
        return;
      }

      if (room.users.size >= MAX_ROOM_USERS) {
        if (typeof callback === 'function') {
          callback({ success: false, error: `Room is full (max ${MAX_ROOM_USERS} devices)` });
        }
        return;
      }

      // Clear timeout if exists
      if (room.timeout) {
        clearTimeout(room.timeout);
        room.timeout = null;
      }

      const userName = sanitize(data?.userName || data?.senderName || 'Anonymous');
      currentUserName = userName;
      currentRoom = roomCode;
      socket.join(roomCode);

      room.users.set(socket.id, {
        name: userName,
        joinedAt: Date.now(),
        publicKey: null,
      });

      const deviceCount = room.users.size;

      // Notify all users about new device
      io.to(roomCode).emit('device-update', {
        deviceCount,
        message: `${userName} joined`,
      });

      broadcastUserList(roomCode, room);

      console.log(`User ${userName} (${socket.id}) joined room ${roomCode}. Devices: ${deviceCount}`);

      // Send chat history to the new user with reactions populated
      if (room.messages && room.messages.length > 0) {
        const messagesWithReactions = room.messages.map(msg => {
          const emojiMap = room.reactions.get(msg.id);
          const reactionSummary = [];
          if (emojiMap) {
            for (const [em, userSet] of emojiMap) {
              const usersArray = [];
              for (const uid of userSet) {
                const u = room.users.get(uid);
                usersArray.push({
                  id: uid,
                  name: u ? u.name : 'Anonymous'
                });
              }
              reactionSummary.push({
                emoji: em,
                users: usersArray
              });
            }
          }
          return {
            ...msg,
            reactions: reactionSummary
          };
        });
        socket.emit('chat-history', messagesWithReactions);
      }

      // Send current reaction state
      if (room.reactions.size > 0) {
        const reactionsSnapshot = {};
        for (const [messageId, emojiMap] of room.reactions) {
          reactionsSnapshot[messageId] = {};
          for (const [emoji, userSet] of emojiMap) {
            reactionsSnapshot[messageId][emoji] = Array.from(userSet);
          }
        }
        socket.emit('reactions-sync', reactionsSnapshot);
      }

      if (typeof callback === 'function') {
        callback({ success: true, roomCode, deviceCount });
      }
    } catch (err) {
      console.error('Error joining room:', err.message);
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Failed to join room' });
      }
    }
  });

  // ── E2E Encryption Key Exchange ────────────────────────────────────────

  socket.on('key-exchange', (data) => {
    if (!currentRoom) return;

    const room = rooms.get(currentRoom);
    if (!room) return;

    // Store the public key for this user
    const user = room.users.get(socket.id);
    if (user && data?.publicKey) {
      user.publicKey = data.publicKey;
    }

    // Relay the public key to all other room members
    socket.to(currentRoom).emit('public-key', {
      userId: socket.id,
      userName: currentUserName,
      publicKey: data?.publicKey,
    });

    // Update user list so others know this user has a key
    broadcastUserList(currentRoom, room);
  });

  // ── Send Message ───────────────────────────────────────────────────────

  socket.on('send-message', (data) => {
    if (!currentRoom) return;

    // Socket rate limiting
    if (!checkSocketRateLimit(socket.id)) {
      socket.emit('error-message', {
        error: 'Rate limit exceeded. Please slow down.',
        code: 'RATE_LIMIT',
      });
      return;
    }

    try {
      const room = rooms.get(currentRoom);
      if (!room) return;

      const messageId = generateMessageId();

      const messageData = {
        id: messageId,
        text: data.encrypted ? data.text : sanitize(data.text), // don't sanitize encrypted blobs
        senderId: socket.id,
        senderName: sanitize(data.senderName) || currentUserName,
        timestamp: new Date().toISOString(),
        type: data.type || 'text',
        language: data.language || null,
        messageType: data.type || 'text',
        encrypted: data.encrypted || null,
        replyTo: data.replyTo
          ? {
              id: data.replyTo.id,
              text: data.encrypted ? data.replyTo.text : sanitize(data.replyTo.text),
              senderName: sanitize(data.replyTo.senderName),
            }
          : null,
      };

      // Store message in room history (cap at MAX_MESSAGES_PER_ROOM)
      room.messages.push(messageData);
      if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
        room.messages.shift();
      }

      // Broadcast to all in room
      io.to(currentRoom).emit('new-message', messageData);

      // Send delivery confirmation to sender
      socket.emit('message-delivered', {
        messageId,
        deliveredAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error sending message:', err.message);
    }
  });

  // ── Message Reactions ──────────────────────────────────────────────────

  socket.on('add-reaction', (data) => {
    if (!currentRoom) return;

    try {
      const room = rooms.get(currentRoom);
      if (!room) return;

      const { messageId, emoji } = data;
      if (!messageId || !emoji) return;

      // Initialize reaction map for this message if needed
      if (!room.reactions.has(messageId)) {
        room.reactions.set(messageId, new Map());
      }

      const emojiMap = room.reactions.get(messageId);
      if (!emojiMap.has(emoji)) {
        emojiMap.set(emoji, new Set());
      }

      emojiMap.get(emoji).add(socket.id);

      // Build reaction summary for broadcast (Reaction[] format)
      const reactionSummary = [];
      for (const [em, userSet] of emojiMap) {
        const usersArray = [];
        for (const uid of userSet) {
          const u = room.users.get(uid);
          usersArray.push({
            id: uid,
            name: u ? u.name : 'Anonymous'
          });
        }
        reactionSummary.push({
          emoji: em,
          users: usersArray
        });
      }

      io.to(currentRoom).emit('reaction-update', {
        messageId,
        reactions: reactionSummary,
        action: 'add',
        emoji,
        userId: socket.id,
        userName: currentUserName,
      });
    } catch (err) {
      console.error('Error adding reaction:', err.message);
    }
  });

  socket.on('remove-reaction', (data) => {
    if (!currentRoom) return;

    try {
      const room = rooms.get(currentRoom);
      if (!room) return;

      const { messageId, emoji } = data;
      if (!messageId || !emoji) return;

      const emojiMap = room.reactions.get(messageId);
      if (!emojiMap) return;

      const userSet = emojiMap.get(emoji);
      if (!userSet) return;

      userSet.delete(socket.id);

      // Clean up empty sets/maps
      if (userSet.size === 0) emojiMap.delete(emoji);
      if (emojiMap.size === 0) room.reactions.delete(messageId);

      // Build reaction summary for broadcast (Reaction[] format)
      const reactionSummary = [];
      if (room.reactions.has(messageId)) {
        for (const [em, us] of room.reactions.get(messageId)) {
          const usersArray = [];
          for (const uid of us) {
            const u = room.users.get(uid);
            usersArray.push({
              id: uid,
              name: u ? u.name : 'Anonymous'
            });
          }
          reactionSummary.push({
            emoji: em,
            users: usersArray
          });
        }
      }

      io.to(currentRoom).emit('reaction-update', {
        messageId,
        reactions: reactionSummary,
        action: 'remove',
        emoji,
        userId: socket.id,
        userName: currentUserName,
      });
    } catch (err) {
      console.error('Error removing reaction:', err.message);
    }
  });

  // ── Read Receipts ─────────────────────────────────────────────────────

  socket.on('message-read', (data) => {
    if (!currentRoom) return;

    try {
      const { messageId } = data;
      if (!messageId) return;

      // Broadcast read status to everyone in the room
      io.to(currentRoom).emit('message-status-update', {
        messageId,
        readBy: socket.id,
        readByName: currentUserName,
        readAt: new Date().toISOString(),
        status: 'read',
      });
    } catch (err) {
      console.error('Error processing read receipt:', err.message);
    }
  });

  // ── Typing Indicators ─────────────────────────────────────────────────

  socket.on('typing-start', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('typing-start', {
      userId: socket.id,
      userName: data?.userName || currentUserName,
    });
  });

  socket.on('typing-stop', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('typing-stop', {
      userId: socket.id,
      userName: data?.userName || currentUserName,
    });
  });

  // ── File Transfer ─────────────────────────────────────────────────────

  socket.on('file-start', (data) => {
    if (!currentRoom) return;

    socket.to(currentRoom).emit('file-start', {
      fileId: data.fileId,
      fileName: sanitizeFilename(data.fileName),
      fileSize: data.fileSize,
      fileType: data.fileType,
      senderId: socket.id,
      senderName: sanitize(data.senderName) || currentUserName,
      totalChunks: data.totalChunks,
    });
  });

  socket.on('file-chunk', (data) => {
    if (!currentRoom) return;

    socket.to(currentRoom).emit('file-chunk', {
      fileId: data.fileId,
      chunk: data.chunk,
      chunkIndex: data.chunkIndex,
    });
  });

  socket.on('file-complete', (data) => {
    if (!currentRoom) return;

    try {
      socket.to(currentRoom).emit('file-complete', {
        fileId: data.fileId,
        fileName: sanitizeFilename(data.fileName),
        senderId: socket.id,
      });

      const fileMessage = {
        id: data.fileId,
        fileName: sanitizeFilename(data.fileName),
        fileSize: data.fileSize,
        fileType: data.fileType,
        senderId: socket.id,
        senderName: sanitize(data.senderName) || currentUserName,
        timestamp: new Date().toISOString(),
        type: 'file',
      };

      const room = rooms.get(currentRoom);
      if (room) {
        room.messages.push(fileMessage);
        if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
          room.messages.shift();
        }
      }

      io.to(currentRoom).emit('new-message', fileMessage);
    } catch (err) {
      console.error('Error completing file transfer:', err.message);
    }
  });

  // ── Leave Room ─────────────────────────────────────────────────────────

  socket.on('leave-room', () => {
    handleDisconnect();
  });

  // ── Disconnect ─────────────────────────────────────────────────────────

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${currentUserName} (${socket.id})`);
    handleDisconnect();
  });

  function handleDisconnect() {
    if (!currentRoom) return;

    const roomCode = currentRoom;
    const room = rooms.get(roomCode);
    if (!room) {
      currentRoom = null;
      return;
    }

    const leavingUser = room.users.get(socket.id);
    const leavingName = leavingUser?.name || currentUserName;

    room.users.delete(socket.id);
    const deviceCount = room.users.size;

    if (deviceCount === 0) {
      // Set timeout to destroy room after ROOM_TIMEOUT
      room.timeout = setTimeout(() => {
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} destroyed (empty for ${ROOM_TIMEOUT / 60000} min)`);
      }, ROOM_TIMEOUT);
    } else {
      // Notify remaining users
      io.to(roomCode).emit('device-update', {
        deviceCount,
        message: `${leavingName} left`,
      });

      broadcastUserList(roomCode, room);
    }

    socket.leave(roomCode);
    clearSocketRateLimit(socket.id);
    console.log(`User ${leavingName} (${socket.id}) left room ${roomCode}. Remaining: ${deviceCount}`);
    currentRoom = null;
  }
});

// ─── AI Assistant Endpoint ──────────────────────────────────────────────────

app.post('/api/ai/ask', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (GEMINI_API_KEY) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500 }
        })
      });
      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return res.json({ response: text.trim() });
        }
      }
    } else if (OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500
        })
      });
      if (response.ok) {
        const json = await response.json();
        const text = json.choices?.[0]?.message?.content;
        if (text) {
          return res.json({ response: text.trim() });
        }
      }
    }

    return res.json({
      response: `⚡ **FlashBot (AI Demo Mode)**\n\nI received your question: *"${prompt}"*\n\nTo enable live generative answers, please configure the \`GEMINI_API_KEY\` or \`OPENAI_API_KEY\` in your server's \`.env\` file.\n\nFlashChat uses E2E client-side encryption. This means even when interacting with me, your messages remain secure and are only decrypted by clients inside your room.`
    });

  } catch (err) {
    console.error('AI assistant error:', err.message);
    res.status(500).json({ error: 'AI Assistant failed to process request' });
  }
});

// ─── Start Server ───────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`🚀 FlashChat server v2.0 running on port ${PORT}`);
  console.log(`   CORS origins: ${CORS_ORIGIN.join(', ')}`);
  console.log(`   Room timeout: ${ROOM_TIMEOUT / 60000} minutes`);
  console.log(`   Rate limit: ${SOCKET_RATE_LIMIT} msgs/min per socket`);
});
