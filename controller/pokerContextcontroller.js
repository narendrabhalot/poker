const pokercontestModel = require('../models/pokerContextModel')
const createPokerContest = async (req, res) => {
    try {
        const { gameType, smallBlindAmount, bigBlindAmount, contestAmount } = req.body;
        if (smallBlindAmount > smallBlindAmount) {
            res.status(400).json({ status: false, message: 'Big blind amount must be greater then samall blind amount ' });
        }
        const newContest = new pokercontestModel({
            gameType, smallBlindAmount,
            bigBlindAmount,
            contestAmount,
        });
        await newContest.save();
        res.status(201).send({ status: true, message: 'new poker contest created  successfully', game: newContest });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const getAllcontest = async (req, res) => {
    try {
        const getContest = await pokercontestModel.find()
        console.log(getContest)
        if (getContest.length == 0) {
            res.status(400).json({ status: false, message: 'Contest is not available ', contests: getContest });
        }
        res.status(201).json({ status: true, message: 'new poker contest created  successfully', contests: getContest });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
module.exports = { createPokerContest, getAllcontest }