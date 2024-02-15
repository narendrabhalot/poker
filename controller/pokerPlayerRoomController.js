const pokerPlayerRoomModel = require('../models/pokerPlayerRoom')
const createPokerPlayerRoom = async (req, res) => {
    try {
        console.log(req.body)
        const { playerId, chips, roomId, contestId } = req.body;
        const newpokerPlayerRoom = new pokerPlayerRoomModel({
            playerId, chips,
            roomId,
            contestId,
        });
        await newpokerPlayerRoom.save();
        res.status(201).json({ status: true, message: 'new poker player room  created  successfully', playerRoom: newpokerPlayerRoom });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const getAllPlayersInRoomId = async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const allplayerInRoom = await pokerPlayerRoomModel.find({ roomId: roomId });
        console.log(roomId, allplayerInRoom)
        return res.status(200).json({ status: true, roomLength: allplayerInRoom.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


const getAvgStackSize = async (req, res) => {
    try {
        const averageRoomStackSizes = await pokerPlayerRoomModel.aggregate([
            {
                $group: {
                    _id: "$roomId",
                    avgChips: { $avg: "$chips" }
                }
            }
        ]);
        res.status(200).json({ status: true, data: averageRoomStackSizes });
    } catch (error) {
        console.error('Error in getAvgStackSize:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { createPokerPlayerRoom, getAllPlayersInRoomId, getAvgStackSize }