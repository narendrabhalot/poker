// controllers/rummyController.js
const pokerModel = require('../models/pokerGameModel');







const createPokerGame = async (req, res) => {
    try {
        const { name, type, countries, chips, noOfPlayer } = req.body;

        console.log('Received data:', req.body); // Log received data

        // Your additional logic to validate selectedPlayersRange here
      
        const newGame = new pokerModel({
            name, type, countries, chips, noOfPlayer
        });

        // Save the game to the database
        await newGame.save();
        res.status(201).json({status:true, message: 'poker game created successfully', game: newGame });
    } catch (err) {
        console.error('Error:', err); // Log any caught error
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getPokerGameById = async (req, res) => {
    try {
        const gameId = req.params.id; // Assuming the ID is in the URL parameter

        // Find the game by its ID
        const game = await pokerModel.findById(gameId);

        if (!game) {
            // If the game with the given ID is not found, return a 404 response
            res.status(404).json({ message: 'Game not found' });
            return;
        }

        // If the game is found, return it in the response
        res.status(200).json({ game });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};



// exports.joinGame = async (req, res) => {
//     try {
//         const { gameId, playerId } = req.body;

//         const game = await rummyGameModel.findById(gameId);

//         if (!game) {
//             return res.status(404).json({ message: 'Game not found' });
//         }

//         if (game.players.length >= game.selectedPlayersRange.max) {
//             return res.status(400).json({ message: 'Game is full' });
//         }
//         game.players.push(playerId);
//         await game.save();
//         res.status(200).json({ message: 'Player joined the game' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };



// Controller function for leaving the game with confirmation
// exports.leaveGame = async (req, res) => {
//     try {
//         const { gameId, playerId } = req.body; // Assuming both game ID and user ID are passed in the request body

//         // Find the game by its ID
//         const game = await rummyGameModel.findById(gameId);

//         if (!game) {
//             return res.status(404).json({ message: 'Game not found' });
//         }

//         // Check if the player is in the game
//         const playerIndex = game.players.indexOf(playerId);
//         if (playerIndex === -1) {
//             return res.status(404).json({ message: 'Player not found in the game' });
//         }

//         // Remove the player from the game
//         game.players.splice(playerIndex, 1);

//         // Update the game in the database
//         await game.save();

//         res.status(200).json({ message: 'Player left the game' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: 'Server error' });
//     }
// };



module.exports={createPokerGame,getPokerGameById}