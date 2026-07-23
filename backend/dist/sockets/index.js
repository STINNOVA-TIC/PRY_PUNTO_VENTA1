"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = void 0;
const setupSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('🔌 Cliente conectado:', socket.id);
        socket.on('disconnect', () => {
            console.log('🔌 Cliente desconectado:', socket.id);
        });
        // Eventos para entregas en tiempo real
        socket.on('nueva-entrega', (data) => {
            console.log('📦 Nueva entrega solicitada:', data);
            io.emit('entrega-pendiente', data);
        });
        socket.on('entrega-completada', (data) => {
            console.log('✅ Entrega completada:', data);
            io.emit('entrega-realizada', data);
        });
        // Evento de prueba
        socket.on('ping', () => {
            socket.emit('pong', { message: 'pong', timestamp: new Date() });
        });
    });
    console.log('📡 WebSocket configurado correctamente');
};
exports.setupSocket = setupSocket;
