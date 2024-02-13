const socketIO = require('socket.io');
const PokerPlayer = require('../utils/pokerPlayer');
const PokerGame = require('../utils/pokerGame');


function handleSocket(server) {
    const io = socketIO(server);
    const rooms = {};
    io.on('connection', (socket) => {
        console.log('User is connected');
        socket.on('gameJoin', async (playerId, tableId, chips) => {
            try {
                if (!playerId || !tableId || isNaN(chips) || chips <= 0) {
                    throw new Error('Invalid playerId, tableId, or chips');
                }
                await handleplayer(tableId, rooms)
                socket.join(tableId, () => {
                    socket.tableId = tableId;
                    socket.playerId = playerId
                });
                console.log(`Received data: ${playerId} joined ${tableId} with ${chips} chips`);
                const sockets = io.sockets.adapter.rooms.get(tableId);
                console.log("Sockets in room:", sockets.size);

                if (!rooms[tableId]) {
                    rooms[tableId] = { players: [], pokerGame: null };
                }
                const player = new PokerPlayer(socket.id, playerId, tableId, chips);
                player.socket = socket;
                rooms[tableId].players.push(player);
                const numPlayers = rooms[tableId].players.length;
                if (numPlayers >= 2 && !rooms[tableId].pokerGame) {
                    console.log("numPlayers is", numPlayers);
                    rooms[tableId].pokerGame = new PokerGame(rooms[tableId].players, tableId, 2);
                    try {
                        rooms[tableId].pokerGame.startGame(io, tableId);
                    } catch (error) {
                        console.error('Error starting game:', error);
                    }
                }
            } catch (error) {
                console.error('Error in gameJoin:', error);
                console.error(error.stack);
                io.to(socket.id).emit('error', error.message);
            }
        });
        socket.on('disconnect', () => {
            console.log('A user disconnected');
            const sockets = io.sockets.adapter.rooms.get("123aa");
            console.log("Sockets in room:", sockets.size);
            for (const roomId in rooms) {
                const room = rooms[tableId];
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
