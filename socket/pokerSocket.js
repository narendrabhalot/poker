const socketIO = require('socket.io');
const PokerPlayer = require('../utils/pokerPlayer');
const PokerGame = require('../utils/pokerGame');

function handleSocket(server) {
    const io = socketIO(server);
    const rooms = {};
    io.on('connection', (socket) => {
        console.log('User is connected');
        socket.on('gameJoin', async (playerId, gameId, chips) => {
            try {
                if (!playerId || !gameId || isNaN(chips) || chips <= 0) {
                    throw new Error('Invalid playerId, gameId, or chips');
                }
                socket.join(gameId);
                console.log(`Received data: ${playerId} joined ${gameId} with ${chips} chips`);
                const sockets = io.sockets.adapter.rooms.get(gameId);
                console.log("Sockets in room:", sockets.size);
                if (!rooms[gameId]) {
                    rooms[gameId] = { players: [], pokerGame: null };
                }
                const player = new PokerPlayer(socket.id, playerId, gameId, chips);
                player.socket = socket;                
                rooms[gameId].players.push(player);
                const numPlayers = rooms[gameId].players.length;               
                if (numPlayers >= 3 && !rooms[gameId].pokerGame) {
                    console.log("Inside the room");
                    console.log("numPlayers is",numPlayers);
                    rooms[gameId].pokerGame = new PokerGame(rooms[gameId].players, gameId, 2);
                    try {
                        rooms[gameId].pokerGame.startGame(io, gameId);
                    } catch (error) {
                        console.error('Error starting game:', error);
                    }
                }
            } catch (error) {
                console.error('Error in gameJoin:', error);
                // Log detailed error information for debugging
                console.error(error.stack);
                io.to(socket.id).emit('error', error.message);
            }
        });
        socket.on('disconnect', () => {
            console.log('A user disconnected');
            const sockets = io.sockets.adapter.rooms.get("123aa");
                console.log("Sockets in room:", sockets.size);
            for (const gameId in rooms) {
                const room = rooms[gameId];
                const index = room.players.findIndex((p) => p.socketId === socket.id);
                if (index !== -1) {
                    room.players.splice(index, 1);
                    if (room.pokerGame) {
                        room.pokerGame.handlePlayerDisconnection(socket.id); // Assuming this method exists
                    }
                }
            }
        });
    });
}

module.exports = handleSocket;
