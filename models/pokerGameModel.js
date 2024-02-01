const mongoose = require('mongoose');
const pokerGameSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['NLH', 'PLO'], required: true },
    countries: [String],
    chips: { type: Number, required: true },
    noOfPlayer: {
        type: Number,
        min: 2,
        max: 10,
        required: true,
        default:10
    },
});
module.exports = mongoose.model('PokerGame', pokerGameSchema);


