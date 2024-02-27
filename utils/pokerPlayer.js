class PokerPlayer {
    constructor(id, playerId, playerName = null, gameId, chips = 0, cards = []) {
        this.id = id;
        this.playerIndex = null
        this.status = 0
        this.playerId = playerId;
        this.playerName = playerName
        this.gameId = gameId;
        this.chips = chips;
        this.totalChips = 0
        this.folded = false;
        this.allIn = false;
        this.cards = cards;
        this.blindName = null
        this.action = null
        this.currentBet = 0
    }
    getId() {
        return this.id;
    }
    getplayerId() {
        return this.playerId;
    }
    getgameId() {
        return this.gameId;
    }
    getChips() {
        return this.chips;
    }
    isFolded() {
        return this.folded;
    }
    isAllIn() {
        return this.allIn;
    }
    getCards() {
        return this.cards;
    }
    setChips(amount) {
        this.chips = amount;
    }
    setFolded(status) {
        this.folded = status;
    }
    setAllIn(status) {
        this.allIn = status;
    }

    setCards(cards) {
        this.cards = cards;
    }
}

module.exports = PokerPlayer