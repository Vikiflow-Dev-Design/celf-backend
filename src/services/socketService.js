/**
 * Socket Service
 * Manages WebSocket connections and real-time events
 */

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

class SocketService {
    constructor() {
        this.io = null;
        this.userSockets = new Map(); // Maps userId -> Set of socketIds
    }

    /**
     * Initialize Socket.IO
     * @param {Object} server - HTTP server instance
     */
    initialize(server) {
        console.log('🔌 SocketService: Initializing Socket.IO...');
        this.io = socketIo(server, {
            cors: {
                origin: "*", // Allow all origins for mobile app access
                methods: ["GET", "POST"]
            }
        });

        // Authentication middleware
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            try {
                // Verify JWT token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.userId;
                next();
            } catch (err) {
                return next(new Error('Authentication error: Invalid token'));
            }
        });

        // Connection handler
        this.io.on('connection', (socket) => {
            console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.userId})`);

            this.addUserSocket(socket.userId, socket.id);

            socket.on('disconnect', () => {
                console.log(`🔌 Socket disconnected: ${socket.id} (User: ${socket.userId})`);
                this.removeUserSocket(socket.userId, socket.id);
            });
        });
    }

    /**
     * Add socket ID to user's connection list
     */
    addUserSocket(userId, socketId) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socketId);
    }

    /**
     * Remove socket ID from user's connection list
     */
    removeUserSocket(userId, socketId) {
        if (this.userSockets.has(userId)) {
            const sockets = this.userSockets.get(userId);
            sockets.delete(socketId);
            if (sockets.size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }

    /**
     * Emit event to specific user
     * @param {string} userId - Target user ID
     * @param {string} event - Event name
     * @param {Object} data - Event payload
     */
    emitToUser(userId, event, data) {
        if (!this.io) {
            console.warn('⚠️ SocketService: IO not initialized');
            return;
        }

        if (this.userSockets.has(userId)) {
            const sockets = this.userSockets.get(userId);
            console.log(`📡 SocketService: Emitting ${event} to user ${userId} (${sockets.size} active connections)`);

            sockets.forEach(socketId => {
                this.io.to(socketId).emit(event, data);
            });
        } else {
            console.log(`ℹ️ SocketService: User ${userId} is offline, skipping emit ${event}`);
        }
    }

    /**
     * Emit event to all connected users
     */
    emitToAll(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }
}

// Singleton instance
module.exports = new SocketService();
