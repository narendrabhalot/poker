const express = require('express');
const router = express.Router();
const {createUser,listUsers,getUserById,updateUser,deleteUser} = require('../controller/userController');
const {createPokerGame,getPokerGameById} = require('../controller/pokerGameController');

// routes for users
router.post('/createplayer', createUser);
router.get('/userList',listUsers );
router.get('/getuser/:id', getUserById);
router.put('/updateuser/:id', updateUser);
router.delete('/deleteuser/:id',deleteUser);


//routes for game 
router.post('/game', createPokerGame);
router.get('/getgame/:id', getPokerGameById);

module.exports = router;
