import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: 'http://localhost:5175', // Vite dev server URL
  methods: ['GET', 'POST'],
  credentials: true
}));

// Create Socket.IO server with CORS config
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5175',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Store active rooms and users
const rooms = new Map();
const users = new Map();

io.on('connection', (socket) => {
  console.log('New client connected');

  // Handle joining a room
  socket.on('joinRoom', ({ roomId, username, nickname, avatarIndex = 0 }) => {
    // O nickname será o mesmo que o username por padrão
    // O cliente pode enviar um nickname diferente se desejar
    const userNickname = nickname || username;
    
    // Leave previous room if any
    const prevRoom = [...socket.rooms].find(room => room !== socket.id);
    if (prevRoom) {
      socket.leave(prevRoom);
      const roomUsers = rooms.get(prevRoom) || new Set();
      
      // Encontrar e remover o usuário pelo socket.id, não pelo username
      let userToRemove = null;
      for (const user of roomUsers) {
        if (user.socketId === socket.id) {
          userToRemove = user;
          break;
        }
      }
      
      if (userToRemove) {
        roomUsers.delete(userToRemove);
        if (roomUsers.size === 0) {
          rooms.delete(prevRoom);
        } else {
          rooms.set(prevRoom, roomUsers);
        }
        io.to(prevRoom).emit('userLeft', { 
          username: userToRemove.username,
          nickname: userToRemove.nickname,
          avatarIndex: userToRemove.avatarIndex,
          users: Array.from(roomUsers).map(u => ({ 
            username: u.username, 
            nickname: u.nickname,
            avatarIndex: u.avatarIndex,
            status: u.status,
            lastSeen: u.lastSeen
          }))
        });
      }
    }

    // Join new room
    socket.join(roomId);
    const roomUsers = rooms.get(roomId) || new Set();
    
    // Armazenar informações do usuário com nickname e avatarIndex
    const userInfo = { 
      socketId: socket.id,
      username, 
      nickname: userNickname,
      avatarIndex,
      status: 'online',
      lastSeen: 'Agora'
    };
    
    roomUsers.add(userInfo);
    rooms.set(roomId, roomUsers);
    users.set(socket.id, { 
      roomId, 
      username, 
      nickname: userNickname, 
      avatarIndex 
    });

    // Notify room about new user
    io.to(roomId).emit('userJoined', { 
      username,
      nickname: userNickname,
      avatarIndex,
      users: Array.from(roomUsers).map(u => ({ 
        username: u.username, 
        nickname: u.nickname,
        avatarIndex: u.avatarIndex,
        status: u.status,
        lastSeen: u.lastSeen
      }))
    });

    // Send room history to new user
    socket.emit('roomHistory', {
      users: Array.from(roomUsers).map(u => ({ 
        username: u.username, 
        nickname: u.nickname,
        avatarIndex: u.avatarIndex,
        status: u.status,
        lastSeen: u.lastSeen
      }))
    });
  });

  // Handle chat messages
  socket.on('message', (message) => {
    const user = users.get(socket.id);
    if (user) {
      io.to(user.roomId).emit('message', {
        ...message,
        sender: user.nickname || user.username, // Usar nickname como remetente
        avatarIndex: user.avatarIndex, // Incluir o índice do avatar
        timestamp: new Date()
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      const roomUsers = rooms.get(user.roomId);
      if (roomUsers) {
        // Encontrar e remover o usuário pelo socket.id
        let userToRemove = null;
        for (const roomUser of roomUsers) {
          if (roomUser.socketId === socket.id) {
            userToRemove = roomUser;
            break;
          }
        }
        
        if (userToRemove) {
          roomUsers.delete(userToRemove);
          if (roomUsers.size === 0) {
            rooms.delete(user.roomId);
          } else {
            rooms.set(user.roomId, roomUsers);
            io.to(user.roomId).emit('userLeft', { 
              username: user.username,
              nickname: user.nickname,
              avatarIndex: user.avatarIndex,
              users: Array.from(roomUsers).map(u => ({ 
                username: u.username, 
                nickname: u.nickname,
                avatarIndex: u.avatarIndex,
                status: u.status,
                lastSeen: u.lastSeen
              }))
            });
          }
        }
      }
      users.delete(socket.id);
    }
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});