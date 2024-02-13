class PokerPlayer {
    constructor(id, playerId, gameId, chips = 0, folded = false, allIn = false, cards = []) {
        this.id = id;
        this.status = 0
        this.playerId = playerId;
        this.gameId = gameId;
        this.chips = chips;
        this.totalChips = 0
        this.folded = folded;
        this.allIn = allIn;
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