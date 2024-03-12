const socketIO = require('socket.io');
const PokerPlayer = require('../utils/pokerPlayer');
const PokerGame = require('../utils/pokerGame');
const pokerPlayerRoomModel = require('../models/pokerPlayerRoom')
function handleSocket(server) {
    const io = socketIO(server);
    const rooms = new Map();
    io.on('connection', (socket) => {
        console.log('User is connected');
        socket.on('gameJoin', async (playerId, tableId, chips, contestId, smallBlindAmount, bigBlindAmount, playerName) => {
            try {
                if (!playerId || !tableId || isNaN(chips) || chips <= 0 || !contestId || !playerName) {
                    throw new Error('Invalid playerId, playerName,tableId, contestId or chips');
                }
                let room = rooms.get(tableId);
                if (!room) {
                    room = { players: [], pokerGame: null };
                    rooms.set(tableId, room);
                }
                const numPlayers = room.players.length;

                if (numPlayers > 6) {
                    await io.to(socket.id).emit('game-message', "Wait until a seat becomes available");
                    return;
                }
                const player = new PokerPlayer(socket.id, playerId, playerName, tableId, chips);
                player.socket = socket;
                room.players.push(player);
                socket.join(tableId);
                socket.tableId = tableId;
                socket.player = player;

                const roomSockets = io.sockets.adapter.rooms.get(tableId);
                console.log(`Received data: ${playerId} joined ${tableId} with ${chips} chips`);
                io.to(tableId).emit('room message', {
                    playerCount: roomSockets ? roomSockets.size : 0,
                    message: `${playerId} joined ${tableId} with ${chips} chips`,
                    id: socket.id,
                    playerId: playerId,
                    playerName: playerName,
                    chips: chips
                });
                room = rooms.get(tableId);
                const reqParameter = { playerId, chips, roomId: tableId, contestId };
                await pokerPlayerRoomModel.create(reqParameter);

                if (room.players.length >= 2 && room.pokerGame == null) {
                    try {
                        rooms.get(tableId).pokerGame = new PokerGame(room.players, tableId, bigBlindAmount, 2);
                        await io.to(socket.id).emit('gameInfo', {
                            communityCard: room.pokerGame.getCommunityCard(),
                            playersInGame: room.pokerGame.getPlayers(),
                        });
                        rooms.get(tableId).pokerGame.startGame(io, tableId, rooms, smallBlindAmount, bigBlindAmount);
                    } catch (error) {
                        console.error('Error starting game:', error);
                    } finally {
                        room.creatingGame = false;
                    }
                } else if (room.players.length >= 2) {
                    try {
                        // Emit game message to the socket
                        await io.to(socket.id).emit('game-message', "Wait for the game to complete");
                        // Emit game info to the socket
                        await io.to(socket.id).emit('gameInfo', {
                            communityCard: room.pokerGame.getCommunityCard(),
                            playersInGame: room.pokerGame.getPlayers(),
                        });
                    } catch (error) {
                        console.error('Error emitting game message or game info:', error);
                    }
                } else {
                    await io.to(socket.id).emit('game-message', "Wait for a new player to join the game");
                }

            } catch (error) {
                console.error('Error in gameJoin:', error);
                console.error(error.stack);
                io.to(socket.id).emit('error', error.message);
            }
        });
        console.log(socket)
        socket.on('disconnect', () => {
            console.log('A user disconnected');
            console.log(socket)
            io.to(socket.id).emit('room message', { msg: `${socket.player.playerId} disconnect socket` });
            const tableId = socket.tableId;
            if (!tableId) return;
            const room = rooms.get(tableId);
            if (!room) return;
            const index = room.players.findIndex((p) => p.id === socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                if (room.pokerGame) {
                    const activePlayers = room.pokerGame.getActivePlayers()
                    let totalPlayer = room.pokerGame.getNumberOfPlayers()
                    totalPlayer -= 1
                    room.pokerGame.setNumberOfPlayers(totalPlayer)
                    const disConnectActiveIndex = activePlayers.findIndex((p) => p.id === socket.id);
                    activePlayers.splice(disConnectActiveIndex, 1)

                }
            }
        });
    });
}
module.exports = handleSocket;
