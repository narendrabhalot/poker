const express = require('express');
const router = express.Router();
const { createUser, listUsers, getUserById, updateUser, deleteUser } = require('../controller/userController');
const { createPokerGame, getPokerGameById } = require('../controller/pokerGameController');
const { createPokerContest, getAllcontest } = require('../controller/pokerContextcontroller');
const { createPokerTable } = require('../controller/pokerTablesController');
const { createPokerPlayerRoom, getAllPlayersInRoomId, getAvgStackSize } = require('../controller/pokerPlayerRoomController');
// routes for users
router.post('/createplayer', createUser);
router.get('/userList', listUsers);
router.get('/getuser/:id', getUserById);
router.put('/updateuser/:id', updateUser);
router.delete('/deleteuser/:id', deleteUser);
//routes for game 
router.post('/game', createPokerGame);
router.get('/getgame/:id', getPokerGameById);
// routes for contest
router.post('/contest', createPokerContest);
router.get('/contest', getAllcontest);
// for tables
router.post('/table', createPokerTable);
// for rooms
router.post('/playersroom', createPokerPlayerRoom);
router.get('/playerslength/:roomId', getAllPlayersInRoomId);
router.get('/avgStackChips', getAvgStackSize);

module.exports = router;
