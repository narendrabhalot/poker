const socketIO = require('socket.io');
const PokerPlayer = require('../utils/pokerPlayer');
const PokerGame = require('../utils/pokerGame');
const pokerPlayerRoomModel = require('../models/pokerPlayerRoom')
function handleSocket(server) {
    const io = socketIO(server);
    const rooms = new Map();
    io.on('connection', (socket) => {
        console.log('User is connected');
        socket.on('gameJoin', async (playerId, tableId, chips, contestId, smallBlindAmount, bigBlindAmount) => {
            try {
                if (!playerId || !tableId || isNaN(chips) || chips <= 0 || !contestId) {
                    throw new Error('Invalid playerId, tableId, contestId or chips');
                }
                let room = rooms.get(tableId);
                if (!room) {
                    room = { players: [], pokerGame: null, creatingGame: false };
                    rooms.set(tableId, room);
                }
                console.log("rooms is", rooms);
                const numPlayers = room.players.length;
                console.log(numPlayers);
                if (numPlayers > 6) {
                    await io.to(socket.id).emit('game-message', "Wait until a seat becomes available");
                    return;
                }
                const player = new PokerPlayer(socket.id, playerId, tableId, chips);
                player.socket = socket;
                room.players.push(player);
                socket.join(tableId, () => {
                    socket.tableId = tableId;
                });
                socket.tableId = tableId;
                console.log(" socket is ", socket)
                socket.player = player;
                const roomSockets = io.sockets.adapter.rooms.get(tableId);
                console.log(`Received data: ${playerId} joined ${tableId} with ${chips} chips`);
                io.to(tableId).emit('room message', {
                    playerCount: roomSockets ? roomSockets.size : 0,
                    message: `${playerId} joined ${tableId} with ${chips} chips`,
                    id: socket.id,
                    userId: socket.playerId
                });
                room = rooms.get(tableId);
                const reqParameter = { playerId, chips, roomId: tableId, contestId };
                await pokerPlayerRoomModel.create(reqParameter);
                if (room.players.length >= 2 && room.pokerGame == null) {
                    try {
                        rooms.get(tableId).pokerGame = new PokerGame(room.players, tableId, 2);
                        console.log(rooms.get(tableId).pokerGame);
                        rooms.get(tableId).pokerGame.startGame(io, tableId, smallBlindAmount, bigBlindAmount);
                    } catch (error) {
                        console.error('Error starting game:', error);
                    } finally {
                        room.creatingGame = false;
                    }
                } else {
                    const playerMessage = room.players.length >= 2
                        ? "Wait for the game to complete"
                        : "Wait for a new player to join the game";
                    await io.to(socket.id).emit('game-message', playerMessage);
                    return;
                }
            } catch (error) {
                console.error('Error in gameJoin:', error);
                console.error(error.stack);
                io.to(socket.id).emit('error', error.message);
            }
        });
        socket.on('disconnect', () => {
            console.log('A user disconnected');
            const tableId = socket.tableId;
            if (!tableId) return;
            const room = rooms.get(tableId);
            if (!room) return;
            const index = room.players.findIndex((p) => p.socketId === socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                if (room.pokerGame) {
                    const activePlayers = room.pokerGame.getActivePlayers()
                    console.log(activePlayers)
                }
            }
        });
    });
}

module.exports = handleSocket;
