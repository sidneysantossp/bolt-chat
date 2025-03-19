const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = http.createServer(app);

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
        users.delete(socket.id);
        
        // Notificar outros usuários que este usuário saiu
        socket.to(prevRoom).emit('userLeft', {
          username: userToRemove.username,
          nickname: userToRemove.nickname,
          users: [...roomUsers].map(user => ({ 
            username: user.username, 
            nickname: user.nickname,
            avatarIndex: user.avatarIndex 
          }))
        });
        
        console.log(`User ${userNickname} left room ${prevRoom}`);
      }
    }
    
    // Criar sala se não existir
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    // Adicionar usuário à sala
    const roomUsers = rooms.get(roomId);
    const roomUser = { 
      socketId: socket.id, 
      username, 
      nickname: userNickname,
      avatarIndex,
      roomId // Adicionar roomId ao usuário para fácil referência
    };
    
    roomUsers.add(roomUser);
    
    // Armazenar informações do usuário para referência rápida
    users.set(socket.id, { 
      roomId, 
      username, 
      nickname: userNickname,
      avatarIndex
    });
    
    // Join new room
    socket.join(roomId.toString());
    console.log(`[${new Date().toLocaleTimeString()}] User ${userNickname} joined room ${roomId}. Socket ID: ${socket.id}`);
    console.log(`[${new Date().toLocaleTimeString()}] Rooms do socket:`, [...socket.rooms]);
    
    // Notify other users that this user joined
    socket.to(roomId.toString()).emit('userJoined', {
      username,
      nickname: userNickname,
      users: [...roomUsers].map(user => ({ 
        username: user.username, 
        nickname: user.nickname,
        avatarIndex: user.avatarIndex 
      }))
    });
    
    // Send current users to the newly joined user
    socket.emit('userJoined', {
      username,
      nickname: userNickname,
      users: [...roomUsers].map(user => ({ 
        username: user.username, 
        nickname: user.nickname,
        avatarIndex: user.avatarIndex 
      }))
    });
  });

  // Handle chat messages
  socket.on('message', (message) => {
    const user = users.get(socket.id);
    if (user) {
      const roomId = user.roomId.toString();
      
      // Enviar a mensagem para todos na sala, incluindo o remetente
      console.log(`[${new Date().toLocaleTimeString()}] RECEBIDA mensagem de ${user.nickname} (${socket.id}): "${message.content}"`);
      console.log(`[${new Date().toLocaleTimeString()}] Enviando para sala ${roomId} com ${rooms.get(user.roomId)?.size || 0} usuários`);
      
      const formattedMessage = {
        ...message,
        sender: user.nickname || user.username, // Usar nickname como remetente
        avatarIndex: user.avatarIndex, // Incluir o índice do avatar
        timestamp: new Date()
      };

      // Debugar usuários na sala
      const roomUsers = rooms.get(user.roomId);
      if (roomUsers) {
        console.log(`[${new Date().toLocaleTimeString()}] Usuários na sala ${roomId}:`);
        for (const roomUser of roomUsers) {
          console.log(`- ${roomUser.nickname} (${roomUser.socketId})`);
        }
      }

      // Verificar se o socket está na sala antes de enviar
      console.log(`[${new Date().toLocaleTimeString()}] O socket está na sala ${roomId}?`, socket.rooms.has(roomId));
      
      // Emitir primeiro para todos na sala EXCETO o remetente
      socket.to(roomId).emit('message', formattedMessage);
      console.log(`[${new Date().toLocaleTimeString()}] Mensagem enviada para outros usuários na sala ${roomId}`);
      
      // Então emitir de volta para o remetente para confirmar
      socket.emit('message', formattedMessage);
      console.log(`[${new Date().toLocaleTimeString()}] Mensagem enviada de volta para o remetente ${user.nickname}`);
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] ERRO: Usuário não encontrado para socket ${socket.id}`);
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

const PORT = process.env.PORT || 3003;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
