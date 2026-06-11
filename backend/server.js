import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom } from './game/GameRoom.js';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Primary Storage In-Memory
const rooms = new Map();

io.on('connection', (socket) => {
  console.log(`Connected client: ${socket.id}`);

  // 1. Create Room
  socket.on('createRoom', ({ name }) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = new GameRoom(roomId);
    room.addPlayer(socket.id, name, true);
    
    rooms.set(roomId, room);
    socket.join(roomId);

    socket.emit('roomJoined', { roomId, state: room.toPublicState() });
  });

  // 2. Join Room
  socket.on('joinRoom', ({ roomId, name }) => {
    const room = rooms.get(roomId?.toUpperCase());
    if (!room) {
      return socket.emit('errorNotification', 'Room not found.');
    }
    if (room.status !== 'LOBBY') {
      return socket.emit('errorNotification', 'Game already started.');
    }

    room.addPlayer(socket.id, name, false);
    socket.join(roomId);

    io.to(roomId).emit('roomStateUpdate', room.toPublicState());
    socket.emit('roomJoined', { roomId, state: room.toPublicState() });

    io.to(roomId).emit('systemMessage', { text: `${name} entered the room!`, type: 'join' });
  });

  // 3. Start Game
  socket.on('startGame', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.getDrawer()?.id !== socket.id) return;
    if (room.players.length < 2) {
      return socket.emit('errorNotification', 'Need at least 2 players to start!');
    }
    
    room.startWordSelection(io);
  });

  // 4. Word Chosen
  socket.on('chooseWord', ({ roomId, word }) => {
    const room = rooms.get(roomId);
    if (!room || room.getDrawer()?.id !== socket.id) return;
    room.startDrawing(word, io);
  });

  // 5. Drawing Pipe Events
  socket.on('draw', ({ roomId, data }) => {
    socket.to(roomId).emit('draw', data);
  });

  socket.on('clearCanvas', ({ roomId }) => {
    socket.to(roomId).emit('clearCanvas');
  });

  // 6. Messaging / Guessing Logic
  socket.on('sendMessage', ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Check if correct guess
    const isCorrect = room.handleGuess(socket.id, message, io);

    if (!isCorrect) {
      // Regular Chat Routing
      io.to(roomId).emit('chatMessage', {
        sender: player.name,
        text: message,
        system: false
      });
    }
  });

  // 7. Typing Indicator
  socket.on('typing', ({ roomId, isTyping }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      socket.to(roomId).emit('typingUpdate', { name: player.name, isTyping });
    }
  });

  // 8. Disconnect Handler
  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const p = room.players.find(pl => pl.id === socket.id);
      if (p) {
        room.removePlayer(socket.id);
        io.to(roomId).emit('systemMessage', { text: `${p.name} left the game.`, type: 'leave' });
        
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else if (room.players.length === 1 && room.status !== 'LOBBY') {
          if (room.timerInterval) clearInterval(room.timerInterval);
          room.status = 'LOBBY';
          io.to(roomId).emit('roomStateUpdate', room.toPublicState());
          io.to(roomId).emit('systemMessage', { text: 'Waiting for players...', type: 'info' });
        } else {
          io.to(roomId).emit('roomStateUpdate', room.toPublicState());
        }
      }
    });
    console.log(`Disconnected client: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`In-Memory Engine running on port ${PORT}`));