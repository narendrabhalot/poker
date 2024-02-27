
const winners = require('../helper/winner')
const { removePlayer } = require('../helper/helperFunctions')
class PokerGame {
  constructor(players, gameId, cardsPerPlayer = 2) {
    if (players.length < 2) {
      throw new Error('Poker game requires at least 2 players')
    }
    this.gameId = gameId;
    this.cardsPerPlayer = cardsPerPlayer;
    this.players = players;
    this.activePlayers = this.players.slice()
    this.numberOfPlayers = this.activePlayers.length;
    this.dealerPosition = 0;
    this.smallBlindPosition = (this.dealerPosition + 1) % this.numberOfPlayers;
    this.bigBlindPosition = (this.dealerPosition + 2) % this.numberOfPlayers;
    this.pot = 0;
    this.deck = [];
    this.gameRound = 0
    this.currentPlayerIndex = this.smallBlindPosition
    this.previousPlayer = this.activePlayers[this.currentPlayerIndex]
    this.currentPlayer = this.activePlayers[this.smallBlindPosition]
    this.maxBet = 0
    this.minBet = 0
    this.currentBet = 0.1
    this.status = 'started';
    this.firstRoundCompleted = false;
    this.communityCard = []
    this.initializeGame();
  }
  initializeGame() {
    this.initializeDeck();
    this.shuffleDeck();
    this.dealInitialCards();
  }
  async startGame(io, tableId, rooms, smallBlindAmount, bigBlindAmount) {
    try {
      await this.emitCardsAndPositions(io, tableId);
      await this.emitPositions(io, tableId);
      // console.log(' before the start batting round player ', this.activePlayers)
      // console.log(' before the start batting round  a ctive  player ', this.activePlayers)
      await this.startBettingRound(io, tableId, smallBlindAmount, bigBlindAmount);
      // console.log(' after the start batting round player ', this.activePlayers)
      // console.log(' afterthe start batting round  active player ', this.activePlayers)
      console.log('Game has completed the first round.');
      await this.startFlopRound(io, tableId);
      console.log("start round player", this.activePlayers)
      console.log('Game has completed the flop round');
      await this.startTurnRound(io, tableId)
      console.log('Game has completed the turn round');
      await this.startRiverRound(io, tableId)
      console.log('Game has completed the river round');
      await this.declareWinner(io, tableId)
    } catch (err) {
      console.error('Error occurred:', err);
    } finally {
      console.log('Terminating the game.');
      await this.endGame(io, tableId, rooms, smallBlindAmount, bigBlindAmount);
    }
  }
  initializeDeck() {
    const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    for (let suit of suits) {
      for (let rank of ranks) {
        this.deck.push({ value: rank, suit });
      }
    }
  }
  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }
  dealInitialCards() {
    for (let i = 0; i < this.cardsPerPlayer; i++) {
      for (let j = 0; j < this.numberOfPlayers; j++) {
        this.activePlayers[j].cards.push(this.deck.pop());
      }
    }
  }
  async resetGame(io, tableId, rooms, smallBlindAmount, bigBlindAmount) {
    for (const [index, player] of this.players.entries()) {
      if (player.chips == 0) {
        await io.to(player.id).emit('player-message', " you need to add more chips to the table in order to continue ");
        this.players.splice(index, 1)
        continue;
      }
      player.status = 0
      player.totalChips = 0
      player.folded = false;
      player.allIn = false;
      player.cards = []
      player.blindName = null
      player.action = null
      player.currentBet = 0
    }
    this.activePlayers = this.players.slice()
    this.numberOfPlayers = this.activePlayers.length;
    this.maxBet = 0
    this.minBet = 0
    this.dealerPosition = (this.dealerPosition + 1) % this.numberOfPlayers;
    this.smallBlindPosition = (this.dealerPosition + 1) % this.numberOfPlayers;
    this.bigBlindPosition = (this.dealerPosition + 2) % this.numberOfPlayers;
    this.pot = 0;
    this.deck = [];
    this.currentPlayerIndex = this.smallBlindPosition
    this.previousPlayer = this.activePlayers[this.currentPlayerIndex]
    this.currentPlayer = this.activePlayers[this.smallBlindPosition]
    this.currentBet = 0.1
    this.initialBet = 0.1
    this.RoundNumber = 0
    this.status = 'started';
    this.firstRoundCompleted = false;
    this.communityCard = []
    this.initializeGame();
    this.startGame(io, tableId, rooms, smallBlindAmount, bigBlindAmount)
  }
  async emitCardsAndPositions(io, tableId) {
    for (const player of this.activePlayers) {
      try {
        await io.to(player.id).emit('cards', player.cards);
      } catch (err) {
        console.error('Error emitting cards to player:', player.id, err);
      }
    }
  }
  async emitPositions(io, tableId) {
    try {
      let positionArr = ["D", "SB", "BB"];
      let count = 0;
      if (this.activePlayers.length == 2) {
        this.activePlayers[this.dealerPosition].blindName = "BB"
        this.activePlayers[this.smallBlindPosition].blindName = "SB"
        await io.to(tableId).emit('blindName', { blindName: "SB", player: this.activePlayers[this.smallBlindPosition].playerId });
        await io.to(tableId).emit('blindName', { blindName: "BB", player: this.activePlayers[this.dealerPosition].playerId });
      } else if (this.activePlayers.length > 2 && this.dealerPosition > this.bigBlindPosition) {
        this.activePlayers[this.dealerPosition].blindName = "D"
        this.activePlayers[this.smallBlindPosition].blindName = "SB"
        this.activePlayers[this.bigBlindPosition].blindName = "BB"
        await io.to(tableId).emit('blindName', { blindName: "D", player: this.players[this.dealerPosition].playerId });
        await io.to(tableId).emit('blindName', { blindName: "SB", player: this.players[this.smallBlindPosition].playerId });
        await io.to(tableId).emit('blindName', { blindName: "BB", player: this.players[this.bigBlindPosition].playerId });
      } else {
        for (let i = this.dealerPosition; i <= this.bigBlindPosition; i++) {
          this.activePlayers[i].blindName = positionArr[count];
          try {
            await io.to(tableId).emit('blindName', { blindName: positionArr[count], player: this.players[i].playerId });
          } catch (err) {
            console.error("Error emitting blindName to player:", this.activePlayers[i].id, err);
          }
          count++;
        }
      }
    } catch (err) {
      console.error("Error in emitPositions:", err);
    }
  }
  async startBettingRound(io, tableId, smallBlindAmount, bigBlindAmount) {
    try {
      await this.deductChips(this.currentPlayer, smallBlindAmount)
      this.maxBet = smallBlindAmount
      this.minBet = smallBlindAmount
      this.previousPlayer = this.currentPlayer;
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
      this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
      await this.deductChips(this.currentPlayer, bigBlindAmount)
      this.previousPlayer = this.currentPlayer;
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
      this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
      // console.log("this.currentPlayer  before the while loop ", this.currentPlayer)
      this.minBet = bigBlindAmount
      this.currentBet = bigBlindAmount
      this.maxBet = bigBlindAmount
      console.log("the pot amount is ", this.pot)
      while (this.status !== 'ended' && this.activePlayers.length > 1) {
        try {
          console.log("inside the while loop ")
          await this.displayPlayerOptions(io, this.currentPlayer);
          console.log("the pot amount is ", this.pot)
          let action = await waitForPlayerActionOrTimeout(this.currentPlayer, io, tableId);
          this.currentBet = action.chips
          if (this.maxBet < action.chips) {
            this.maxBet = action.chips
          }
          if (this.currentPlayer.action == "allIn") {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
            this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
          }
          await this.handlePlayerAction(this.currentPlayer, action);
          console.log("the pot amount is ", this.pot)
          this.previousPlayer = this.currentPlayer;
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
          this.currentPlayer = this.activePlayers[this.currentPlayerIndex]

          // console.log("this.currentPlayer", this.currentPlayer)
        } catch (err) {
          console.error('Error handling in next player:', err);
        }
        if (this.activePlayers.length <= 1 || (this.maxBet == this.currentPlayer.totalChips && this.currentPlayer.action == "call")) {
          this.activePlayers.forEach(player => { player.totalChips = 0 });
          this.currentBet = 0
          this.maxBet = 0
          this.minBet = 1
          this.gameRound = 1
          break;
        }
      }
    } catch (err) {
      console.error('Error during betting round:', err);
    }
  }
  async startFlopRound(io, tableId) {
    try {
      const flopCards = this.deck.splice(-3);
      this.communityCard = this.communityCard.concat(flopCards)
      console.log("flopCards", flopCards)
      await io.to(tableId).emit('flopCards', flopCards);
      await this.flopCardBattingRound(io)
    } catch (err) {
      console.error('Error starting Flop round:', err);
    }
  }
  async startTurnRound(io, tableId) {
    try {
      const turnCard = this.deck.splice(-1);
      this.communityCard = this.communityCard.concat(turnCard)
      console.log("turnCards", turnCard)
      await io.to(tableId).emit('turnCards', turnCard);
      await this.flopCardBattingRound(io)
    } catch (err) {
      console.error('Error starting turn  round:', err);
    }
  }
  async startRiverRound(io, tableId) {
    try {
      const riverCards = this.deck.splice(-1);
      this.communityCard = this.communityCard.concat(riverCards)
      console.log("riverCards", riverCards)
      await io.to(tableId).emit('riverCards', riverCards);
      await this.flopCardBattingRound(io)

    } catch (err) {
      console.error('Error starting river round:', err);
    }
  }
  async declareWinner(io, tableId) {
    const winner = winners.mergeHandwithCommunityCard(this.activePlayers, this.communityCard)
    let filterWinner = this.activePlayers.filter(data => data.id == winner.winnerId)
    filterWinner[0].chips += this.pot
    this.pot = 0
    await io.to(tableId).emit('winner', winner);
    await io.to(winner.winnerId).emit('winnerAmount', filterWinner[0].chips)
  }
  async flopCardBattingRound(io) {
    try {
      this.currentPlayerIndex = this.smallBlindPosition
      this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
      while (this.status !== 'ended' && this.numberOfPlayers > 1) {
        try {
          console.log("this.maxBet == this.currentPlayer.totalChips", this.maxBet, this.currentPlayer.totalChips, this.minBet)
          await this.displayPlayerOptions(io, this.currentPlayer);
          let action = await waitForPlayerActionOrTimeout(this.currentPlayer, io, tableId);
          console.log("the pot amount is ", this.pot)
          this.currentBet = action.chips
          if (this.minBet < this.currentBet) {
            this.minBet = this.currentBet
          }
          if (this.maxBet < action.chips) {
            this.maxBet = action.chips
          }
          await this.handlePlayerAction(this.currentPlayer, action);
          this.previousPlayer = this.currentPlayer;
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
          this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
          if (this.currentPlayer.action == "allIn") {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
            this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
          }
        } catch (err) {
          console.error('Error handling in next player:', err);
        }
        if (this.activePlayers.length <= 1 || this.maxBet == this.currentPlayer.totalChips) {
          if (this.currentPlayerIndex == this.smallBlindPosition) {
            this.activePlayers.forEach(player => {
              player.totalChips = 0;
            })
            break;
          } else if (this.maxBet > 0) {
            this.activePlayers.forEach(player => { player.totalChips = 0 });
            this.currentBet = 0
            this.maxBet = 0
            break;
          }
        }
      }
    } catch (err) {
      console.error('Error during flop betting round:', err);
    }
  }
  async riverCardBattingRound(io) {
    try {
      this.currentPlayerIndex = this.smallBlindPosition
      this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
      while (this.status !== 'ended' && this.activePlayers.length > 1) {
        try {
          await this.displayPlayerOptions(io, this.currentPlayer);
          let action = await waitForPlayerActionOrTimeout(this.currentPlayer, io, tableId);
          await this.handlePlayerAction(this.currentPlayer, action);
          console.log("the pot amount is ", this.pot)
          this.previousPlayer = this.currentPlayer;
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
          this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
          if (this.currentPlayer.action == "allIn") {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
            this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
          }
        } catch (err) {
          console.error('Error handling in next player:', err);
        }
        if (this.activePlayers.length <= 1 || this.maxBet == this.currentPlayer.totalChips) {
          break;
        }
      }
    } catch (err) {
      console.error('Error during river betting round:', err);
    }
  }
  async displayPlayerOptions(io, currentPlayer) {
    try {
      console.log("this.currentPlayer inside the displayPlayervOtion  ", this.currentPlayer, this.minBet, this.maxBet)
      const { chips: betChips, totalChips } = currentPlayer;
      const maxbet = this.maxBet;
      let callChip = totalChips > 0 ? this.maxBet - Number(totalChips) : this.minBet - Number(totalChips)
      let callChips = Number(callChip).toFixed(2);
      if (betChips <= callChips) {
        await io.to(currentPlayer.id).emit('displayPlayerOptions', {
          detail: {
            action: ["allIn"],
            betChipsRange: betChips
          }
        });
      } else {
        const actionOptions = this.previousPlayer.action === "check" || this.maxBet - totalChips == 0
          ? ["bet", "check", "fold"]
          : ["call", "bet", "fold"];
        await io.to(currentPlayer.id).emit('displayPlayerOptions', {
          detail: {
            action: actionOptions,
            callChips: callChips == 0 ? null : callChips,
            betChipsRange: betChips
          }
        });
      }
    } catch (error) {
      console.error("Error retrieving maximum bet:", error);
    }
  }
  async handlePlayerAction(player, actionData) {
    try {
      const { action, chips } = actionData;
      const normalizedChips = Number(chips);
      // console.log("current player inside handle player action ", this.currentPlayer)

      switch (action) {
        case 'bet':
          this.handleBet(normalizedChips);
          break;
        case 'call':
          this.handleCall(normalizedChips);
          break;
        case 'fold':
          this.handleFold(this.currentPlayerIndex);
          break;
        case 'check':
        case 'allIn':
          player.action = action;
          player.chips = action === 'allIn' ? 0 : player.chips;
          this.activePlayers[this.currentPlayerIndex].totalChips += chips
          break;
        default:
          console.warn('Invalid player action:', action);
      }
    } catch (err) {
      console.error('Error handling player action:', err);
    }
  }
  handleBet(chips) {
    console.log("player before thehandle  bet ", this.currentPlayer)
    this.activePlayers[this.currentPlayerIndex].chips -= chips
    this.activePlayers[this.currentPlayerIndex].totalChips += chips
    this.maxBet = this.activePlayers[this.currentPlayerIndex].totalChips
    this.pot += chips
    this.activePlayers[this.currentPlayerIndex].action = 'bet';
    console.log("player after thehandle  bet ", this.currentPlayer)
  }
  handleCall(chips) {
    this.activePlayers[this.currentPlayerIndex].chips -= chips
    this.activePlayers[this.currentPlayerIndex].totalChips += chips
    this.pot += chips
    this.activePlayers[this.currentPlayerIndex].action = "call"
  }
  handleFold(index) {
    removePlayer(this.activePlayers, index)
    console.log("this.numberOfPlayers before the the fold", this.numberOfPlayers)
    this.numberOfPlayers -= 1
    console.log("this.numberOfPlayers after the the fold", this.numberOfPlayers)
    console.log("after remove player inactive player array ", this.activePlayers)
  }
  async deductChips(player, chips) {
    chips = Number(chips)
    if (player.chips >= chips) {
      this.activePlayers[this.currentPlayerIndex].chips -= chips
      this.activePlayers[this.currentPlayerIndex].totalChips += chips
      this.pot += chips;
    }
  }
  async endGame(io, tableId, rooms, smallBlindAmount, bigBlindAmount) {
    try {
      this.gameOver = true;
      io.to(tableId).emit('gameEnded', { message: 'Game over! Thank you for playing!' });
      if (this.players.length === 1) {
        try {
          await io.to(this.players[0].id).emit('room message', "Please wait for a new player to join the game ");
        } catch (error) {
          console.error("Error sending message to player:", error);
        }
        if (rooms.has(tableId)) {
          rooms.get(tableId).pokerGame = null;
          console.log("rooms after remove the player ", rooms);
          return;
        } else {
          console.warn("Room not found; ignoring attempt to remove pokerGame");
        }
      } else {
        setTimeout(async () => {
          try {
            await this.resetGame(io, tableId, rooms, smallBlindAmount, bigBlindAmount);
          } catch (error) {
            console.error("Error resetting game:", error);
          }
        }, 10000);
      }
    } catch (error) {
      console.error("An error occurred during endGame:", error);
    }
  }
  getActivePlayers() {
    return this.activePlayers;
  }
  getNumberOfPlayers() {
    return this.numberOfPlayers;
  }
  setNumberOfPlayers(totalPlayer) {
    this.numberOfPlayers = totalPlayer;
  }
}
async function waitForPlayerActionOrTimeout(currentPlayer, io, tableId) {
  const timeout = 50000;
  let remainingTime = timeout;
  io.to(tableId).emit('countdown', { remainingTime });
  return new Promise((resolve, reject) => {
    const countdownInterval = setInterval(() => {
      remainingTime -= 1000;
      io.to(tableId).emit('countdown', { remainingTime });
      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        io.to(tableId).emit('blindTrnWithOutAction', { data: currentPlayer.socket.id });
        resolve({ action: 'fold', chips: 0 });
      }
    }, 1000);
    currentPlayer.socket.once('playerAction', (data) => {
      clearInterval(countdownInterval);
      io.to(tableId).emit('blindTrnWithOutAction', { data: currentPlayer.socket.id });
      resolve(data);
    });
    currentPlayer.socket.once('disconnect', () => {
      clearInterval(countdownInterval);
      reject();
    });
  });
}





module.exports = PokerGame;
