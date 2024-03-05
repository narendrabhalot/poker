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
                console.log(numPlayers);
                if (numPlayers > 6) {
                    await io.to(socket.id).emit('game-message', "Wait until a seat becomes available");
                    return;
                }
                const player = new PokerPlayer(socket.id, playerId, playerName, tableId, chips);
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
                    playerId: playerId,
                    playerName: playerName,
                    chips: chips
                });
                room = rooms.get(tableId);
                const reqParameter = { playerId, chips, roomId: tableId, contestId };
                await pokerPlayerRoomModel.create(reqParameter);
                console.log("room.players.length", room.players)
                console.log("room.pokerGame", room.pokerGame)
                if (room.players.length >= 2 && room.pokerGame == null) {
                    try {
                        rooms.get(tableId).pokerGame = new PokerGame(room.players, tableId, bigBlindAmount, 2);
                        rooms.get(tableId).pokerGame.startGame(io, tableId, rooms, smallBlindAmount, bigBlindAmount);
                    } catch (error) {
                        console.error('Error starting game:', error);
                    } finally {
                        room.creatingGame = false;
                    }
                } else {
                    const playerMessage = room.players.length >= 2
                        ? "Wait for the game to complete"
                        : "Wait for a new player to join the game";
                    await io.to(socket.id).emit('game-message', playerMessage)
                    await io.to(socket.id).emit('communityCard', room.pokerGame.getCommunityCard());
                }
            } catch (error) {
                console.error('Error in gameJoin:', error);
                console.error(error.stack);
                io.to(socket.id).emit('error', error.message);
            }
        });
        socket.on('disconnect', () => {
            console.log('A user disconnected');
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
                    console.log("active player after the disconect ", activePlayers)
                }
            }
        });
    });
}
module.exports = handleSocket;
