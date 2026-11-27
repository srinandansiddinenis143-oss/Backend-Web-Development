'use strict';

const { Server } = require('socket.io');

function initSocket(httpServer) {
  // TODO 1: create a new Socket.IO server bound to httpServer
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log(`[+] connected: ${socket.id}`);

    // TODO 2: join a room
    socket.on('joinRoom', (data) => {
      socket.join(data.room);
    });

    // TODO 3: leave a room
    socket.on('leaveRoom', (data) => {
      socket.leave(data.room);
    });

    // TODO 4: broadcast a new comment to everyone in the room
    socket.on('newComment', (data) => {
      io.to(data.room).emit('commentAdded', data);
    });

    // TODO 5: log disconnects
    socket.on('disconnect', (reason) => {
      console.log(`[-] disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

module.exports = { initSocket };
