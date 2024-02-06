class PokerPlayer {
    constructor(id, playerId, gameId, chips = 0, folded = false, allIn = false, cards = []) {
        this.id = id; // Player ID
        this.playerId = playerId; // Player ID
        this.gameId = gameId; // Player ID
        this.chips = chips; 
        this.totalChips=0// Player's chips/money
        this.folded = folded; // Flag indicating if the player has folded
        this.allIn = allIn; // Flag indicating if the player is all-in
        this.cards = cards; // Player's cards (initially empty)
        this.blindName = null    // gives to position
        this.action = null
        this.currentBet = 0   // take for reference for next player 
    }


    // Getter methods to access player details
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
    // Setter methods to update player details
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