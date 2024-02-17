const mongoose = require('mongoose');
const pokercontextSchema = new mongoose.Schema({
    gameType: { type: String, enum: ['NLH', 'PLO'], required: true },
    smallBlindAmount: { type: String, required: true },
    bigBlindAmount: { type: String, required: true },

}, { timestamps: true });
module.exports = mongoose.model('context', pokercontextSchema);

