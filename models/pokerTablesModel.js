const mongoose = require('mongoose');
const pokercontestModel = require('../models/pokerContextModel')

const pokerTableSchema = new mongoose.Schema({
    minBuyIn: { type: String, required: true },
    maxBuyIn: { type: String, required: true },
    contestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: pokercontestModel
    },
    maxNumOfPlayer: {
        type: Number,
        max: 6,
        required: true,
        default: 6
    },
}, { timestamps: true });

module.exports = mongoose.model('PokerTable', pokerTableSchema);
