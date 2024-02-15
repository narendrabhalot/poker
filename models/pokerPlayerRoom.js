const mongoose = require('mongoose');
const pokerPlayerRoom = new mongoose.Schema({
    playerId: { type: String, required: true },
    chips: { type: Number, required: true },
    roomId: { type: String, required: true },
    contestId: { type: String, required: true },
}, { timestamps: true });


module.exports = mongoose.model('pokerPlayerRoom', pokerPlayerRoom);


