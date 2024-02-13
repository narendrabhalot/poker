
const pokerPlayerRoomModel = require('../models/pokerPlayerRoom')
const createPokerPlayerRoom = async (req, res) => {
    try {
        const { playerId, chips, roomId, contestId } = req.body;
        const newpokerPlayerRoom = new pokerPlayerRoomModel({
            playerId, chips,
            roomId,
            contestId,
        });
        await newContest.save();
        res.status(201).json({ status: true, message: 'new poker contest created  successfully', playerRoom: newpokerPlayerRoom });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getAllPlayersInRoomId = async (req, res) => {
    try {
        const roomId = req.params.id;
        const allplayerInRoom = await pokerPlayerRoomModel.find({ roomId: roomId });
        return res.status(200).json({ status: true, message: 'new poker contest created  successfully', roomLength: allplayerInRoom.length });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};





module.exports = { createPokerPlayerRoom, getAllPlayersInRoomId }