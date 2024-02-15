const pokertableModel = require('../models/pokerTablesModel')
const PokerContest = require('../models/pokerContextModel')

const createPokerTable = async (req, res) => {
    try {
        const { minBuyIn, contestId, maxNumOfPlayer } = req.body
        const newTable = new pokertableModel({
            minBuyIn,
            maxNumOfPlayer
        });
        if (contestId) {
            const contest = await PokerContest.findById(contestId);
            if (!contest) {
                return res.status(404).json({ error: 'Poker contest not found' });
            }
            newTable.contestId = contest;
        }
        await newTable.save();
        await newTable.populate('contestId')
        res.status(201).json({ status: true, message: 'New poker table created successfully', tableInfo: newTable });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { createPokerTable }