const winners = require('../helper/winner')
const { removePlayer } = require('../helper/helperFunctions')
class PokerGame {
  constructor(players, gameId, bigBlindAmount, cardsPerPlayer = 2) {
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
    this.currentBet = 0
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
    console.log("inside the rooms ")
    try {
      await this.emitCardsAndPositions(io, tableId);
      await this.emitPositions(io, tableId)
      await this.startBettingRound(io, tableId, smallBlindAmount, bigBlindAmount);
      console.log('Game has completed the first round.');
      await this.startFlopRound(io, tableId, bigBlindAmount);
      // console.log("start round player", this.activePlayers);
      console.log('Game has completed the flop round');
      await this.startTurnRound(io, tableId, bigBlindAmount);
      console.log('Game has completed the turn round');
      await this.startRiverRound(io, tableId, bigBlindAmount);
      console.log('Game has completed the river round');
      await this.declareWinner(io, tableId);
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
    let playerName = []
    for (const [index, player] of this.players.entries()) {
      if (player.chips == 0) {
        await io.to(player.id).emit('player-message', " you need to add more chips to the table in order to continue ");
        this.players.splice(index, 1)
        continue;
      }
      playerName.push({ playerId: player.playerId, playerName: player.playerName, chips: player.chips })
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
    this.currentBet = 0
    this.initialBet = 0.1
    this.RoundNumber = 0
    this.status = 'started';
    this.firstRoundCompleted = false;
    await io.to(tableId).emit("gameInfo", { communityCard: [], playersInGame: playerName })
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
        await io.to(tableId).emit('blindName', { blindName: "SB", playerId: this.activePlayers[this.smallBlindPosition].playerId, playerName: this.activePlayers[this.smallBlindPosition].playerName });
        await io.to(tableId).emit('blindName', { blindName: "BB", playerId: this.activePlayers[this.dealerPosition].playerId });
      } else if (this.activePlayers.length > 2 && this.dealerPosition > this.bigBlindPosition) {
        this.activePlayers[this.dealerPosition].blindName = "D"
        this.activePlayers[this.smallBlindPosition].blindName = "SB"
        this.activePlayers[this.bigBlindPosition].blindName = "BB"
        await io.to(tableId).emit('blindName', { blindName: "D", playerId: this.players[this.dealerPosition].playerId, playerId: this.players[this.dealerPosition].playerName });
        await io.to(tableId).emit('blindName', { blindName: "SB", playerId: this.players[this.smallBlindPosition].playerId, playerName: this.activePlayers[this.smallBlindPosition].playerName });
        await io.to(tableId).emit('blindName', { blindName: "BB", playerId: this.players[this.bigBlindPosition].playerId, playerName: this.activePlayers[this.bigBlindPosition].playerName });
      } else {
        for (let i = this.dealerPosition; i <= this.bigBlindPosition; i++) {
          this.activePlayers[i].blindName = positionArr[count];
          try {
            await io.to(tableId).emit('blindName', { blindName: positionArr[count], playerId: this.players[i].playerId, playerName: this.players[i].playerName });
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
      await this.deductChips(this.currentPlayer, smallBlindAmount, tableId, io)
      this.maxBet = smallBlindAmount
      this.minBet = smallBlindAmount
      this.previousPlayer = this.currentPlayer;
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
      this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
      this.activePlayers[this.currentPlayerIndex].action = "bet"
      await this.deductChips(this.currentPlayer, bigBlindAmount, tableId, io)
      this.previousPlayer = this.currentPlayer;
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
      this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
      this.minBet = bigBlindAmount
      this.currentBet = bigBlindAmount
      this.maxBet = bigBlindAmount
      while (this.status !== 'ended' && this.activePlayers.length > 1) {
        try {
          console.log("inside the while loop ")
          await this.displayPlayerOptions(io, this.currentPlayer, tableId, bigBlindAmount);
          let action = await waitForPlayerActionOrTimeout(this.currentPlayer, io, tableId);
          await this.handlePlayerAction(this.currentPlayer, action);
          await io.to(tableId).emit('player-action', { player: this.currentPlayer.playerId, action: action, chips: this.currentPlayer.chips });
          await io.to(tableId).emit('pot-amount', { potAmount: this.pot });
          this.currentBet = action.chips
          if (this.maxBet < this.currentPlayer.totalChips) {
            this.maxBet = this.currentPlayer.totalChips
          }
          this.previousPlayer = this.currentPlayer;
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
          this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
          if (this.currentPlayer.action == 'allIn') {
            this.previousPlayer = this.currentPlayer;
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
            this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
          }
        } catch (err) {
          console.error('Error handling in next player:', err);
        }
        if (this.activePlayers.length <= 1 || (this.maxBet == this.currentPlayer.totalChips && this.currentPlayer.action == "call")) {
          this.activePlayers.forEach(player => { player.totalChips = 0 });
          this.currentBet = 0
          this.maxBet = 0
          this.minBet = bigBlindAmount
          this.gameRound = 1
          break;
        }
      }
    } catch (err) {
      console.error('Error during betting round:', err);
    }
  }
  async startFlopRound(io, tableId, bigBlindAmount) {
    return new Promise((resolve, reject) => {
      try {
        const flopCards = this.deck.splice(-3);
        this.communityCard = this.communityCard.concat(flopCards)
        console.log("flopCards", flopCards)
        io.to(tableId).emit('flopCards', flopCards);
        setTimeout(async () => {
          await this.flopCardBattingRound(io, tableId, bigBlindAmount);
          resolve(); // Resolve the promise after the flop round is completed
        }, 2000);
      } catch (err) {
        console.error('Error starting Flop round:', err);
        reject(err);
      }
    });
  }
  async startTurnRound(io, tableId, bigBlindAmount) {

    return new Promise((resolve, reject) => {
      try {
        const turnCard = this.deck.splice(-1);
        this.communityCard = this.communityCard.concat(turnCard)
        console.log("turnCards", turnCard)
        io.to(tableId).emit('turnCards', turnCard);
        setTimeout(async () => {
          await this.flopCardBattingRound(io, tableId, bigBlindAmount);
          resolve();
        }, 2000);
      } catch (err) {
        console.error('Error starting Flop round:', err);
        reject(err);
      }
    });
  }
  async startRiverRound(io, tableId, bigBlindAmount) {

    return new Promise((resolve, reject) => {
      try {
        const riverCards = this.deck.splice(-1);
        this.communityCard = this.communityCard.concat(riverCards)
        console.log("riverCards", riverCards)
        io.to(tableId).emit('riverCards', riverCards);
        setTimeout(async () => {
          await this.flopCardBattingRound(io, tableId, bigBlindAmount);
          resolve();
        }, 2000);
      } catch (err) {
        console.error('Error starting Flop round:', err);
        reject(err);
      }
    });
  }
  async declareWinner(io, tableId) {
    // console.log("inside the winner in a poke game ", this.activePlayers, this.communityCard);
    try {
      const winner = winners.mergeHandwithCommunityCard(this.activePlayers, this.communityCard);
      const winningPlayer = this.activePlayers.find(data => data.id === winner.winnerId);
      if (!winningPlayer) {
        throw new Error('No winning player found');
      }
      winningPlayer.chips += this.pot;
      await io.to(tableId).emit('winner', { winner, winnerId: winningPlayer.id, winnerName: winningPlayer.playerName, winningChips: this.pot });
      await io.to(tableId).emit('winnerAmount', winningPlayer.chips);
      this.pot = 0;
    } catch (error) {
      console.error('Error declaring winner:', error);
      await io.to(tableId).emit('error', 'An error occurred while determining the winner.');
    }
  }

  async flopCardBattingRound(io, tableId, bigBlindAmount) {
    try {
      this.currentPlayerIndex = this.smallBlindPosition
      this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
      if (this.currentPlayer.action == "allIn") {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
        this.currentPlayer = this.activePlayers[this.currentPlayerIndex]
      }
      while (this.status !== 'ended' && this.numberOfPlayers > 1) {
        try {
          await this.displayPlayerOptions(io, this.currentPlayer, tableId, bigBlindAmount);
          let action = await waitForPlayerActionOrTimeout(this.currentPlayer, io, tableId);
          await this.handlePlayerAction(this.currentPlayer, action);
          await io.to(tableId).emit('player-action', { player: this.currentPlayer.playerId, action: action, chips: this.currentPlayer.chips });
          await io.to(tableId).emit('pot-amount', { potAmount: this.pot });
          // console.log("this.current bet and nother", this.currentBet, this.maxBet, this.minBet)
          this.currentBet = action.chips
          if (this.minBet < this.currentBet) {
            this.minBet = this.currentBet
          }
          if (this.maxBet < this.currentPlayer.totalChips) {
            this.maxBet = this.currentPlayer.totalChips
          }
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
        if (this.numberOfPlayers <= 1 || this.maxBet == this.currentPlayer.totalChips) {
          if (this.currentPlayerIndex == this.smallBlindPosition) {
            this.activePlayers.forEach(player => {
              player.totalChips = 0;
              this.minBet = bigBlindAmount
            })
            break;
          } else if (this.maxBet > 0) {
            this.activePlayers.forEach(player => { player.totalChips = 0 });
            this.currentBet = 0
            this.maxBet = 0
            this.minBet = bigBlindAmount
            break;
          }
        }
      }
    } catch (err) {
      console.error('Error during flop betting round:', err);
    }
  }
  async displayPlayerOptions(io, currentPlayer, tableId, bigBlindAmount) {
    try {
      await io.to(tableId).emit('turn-player', { playerId: currentPlayer.playerId, PlayerName: currentPlayer.playerName });
      const { chips: betChips, totalChips } = currentPlayer;
      let callChip = totalChips > 0 ? this.maxBet - Number(totalChips) : this.minBet - Number(totalChips)
      let callChips = Number(callChip).toFixed(2);
      if (betChips <= callChips) {
        await io.to(currentPlayer.id).emit('displayPlayerOptions', {
          detail: {
            action: ["allIn", "fold"],
            totalChips: betChips
          }
        });
      } else {
        const actionOptions = this.previousPlayer.action === "check" || this.maxBet - totalChips == 0
          ? ["bet", "check", "fold"]
          : ["call", "bet", "fold"];
        let actionKey = callChips === 0 ? "minBetChips" : "callChips";
        let options = {
          detail: {
            action: actionOptions,
            betChipsRange: betChips
          }
        }
        options.detail[actionKey] = callChips === 0 ? bigBlindAmount : callChips;
        await io.to(currentPlayer.id).emit('displayPlayerOptions', options);
      }
    } catch (error) {
      console.error("Error retrieving maximum bet:", error);
    }
  }
  async handlePlayerAction(player, actionData) {
    try {
      const { action, chips } = actionData;
      const normalizedChips = Number((chips).toFixed(2));
      console.log("normalizedChips", typeof normalizedChips, normalizedChips)
      this.pot += normalizedChips
      console.log(normalizedChips)
      console.log("this .currentBet is ", this.currentBet)
      // console.log("current player detail before anu apdation ", this.activePlayers[this.currentPlayerIndex])
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
          this.currentBet = normalizedChips
          player.action = action;
          this.activePlayers[this.currentPlayerIndex].totalChips += chips
          this.activePlayers[this.currentPlayerIndex].chips -= chips
          // console.log(" this.activePlayers[this.currentPlayerIndex]    player chips after the allin is a ", this.activePlayers[this.currentPlayerIndex])
          break;
        default:
          console.warn('Invalid player action:', action);
      }
    } catch (err) {
      console.error('Error handling player action:', err);
    }
  }
  handleBet(chips) {
    this.currentBet = chips
    this.activePlayers[this.currentPlayerIndex].chips -= chips
    this.activePlayers[this.currentPlayerIndex].totalChips += chips
    this.maxBet = this.activePlayers[this.currentPlayerIndex].totalChips
    this.activePlayers[this.currentPlayerIndex].action = 'bet';
  }
  handleCall(chips) {
    this.activePlayers[this.currentPlayerIndex].chips -= chips
    this.activePlayers[this.currentPlayerIndex].totalChips += chips
    this.activePlayers[this.currentPlayerIndex].action = "call"
  }
  handleFold(index) {
    removePlayer(this.activePlayers, index)
    this.numberOfPlayers -= 1
  }
  async deductChips(player, chips, tableId, io) {
    try {

      if (!player || isNaN(chips) || chips <= 0 || !tableId || !io) {
        throw new Error('Invalid input');
      }
      const normalizedChips = Number((chips).toFixed(2));
      if (player.chips >= normalizedChips) {
        this.activePlayers[this.currentPlayerIndex].chips -= normalizedChips;
        this.activePlayers[this.currentPlayerIndex].totalChips += normalizedChips;
        this.pot += normalizedChips;
        await io.to(tableId).emit('pot-amount', { potAmount: this.pot });
        await io.to(tableId).emit('playerChips', {
          currentPlayerChips: this.activePlayers[this.currentPlayerIndex].chips,
          playerId: player.id,
          playerName: player.playerName
        });
      } else {
        throw new Error('Insufficient chips');
      }
    } catch (error) {
      console.error('Error deducting chips:', error);

    }
  }
  async endGame(io, tableId, rooms, smallBlindAmount, bigBlindAmount) {
    try {
      this.gameOver = true;
      io.to(tableId).emit('gameEnded', { message: 'Game over! Thank you for playing!' });
      console.log("this.players after disconnect then join ", this.players)
      if (this.players.length < 1) {
        rooms.get(tableId).pokerGame = null;
        return;
      }
      if (rooms.get(tableId).players.length === 1) {
        console.log("only one player is present ")
        try {
          await io.to(this.players[0].id).emit('room message', "Please wait for a new player to join the game ");
          rooms.get(tableId).pokerGame = null;
          return;
        } catch (error) {
          console.error("Error sending message to player:", error);
        }
      } else {
        setTimeout(async () => {
          try {
            // console.log("rooms after before the reset game ", rooms)
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
  getPlayer() {
    return this.players
  }
  getNumberOfPlayers() {
    return this.numberOfPlayers;
  }
  getPlayers() {
    let tempPlayer = []
    for (let player of this.players) {
      tempPlayer.push({ playerId: player.playerId, playerName: player.playerName, playerChips: player.chips })
    }
    return tempPlayer
  }
  getCommunityCard() {
    return this.communityCard;
  }
  setNumberOfPlayers(totalPlayer) {
    this.numberOfPlayers = totalPlayer;
  }
}
async function waitForPlayerActionOrTimeout(currentPlayer, io, tableId) {
  const timeoutSeconds = 50;
  let remainingTime = timeoutSeconds * 1000;
  let playerActionOccurred = false;
  io.to(tableId).emit('countdown', { remainingTime: remainingTime / 1000 });
  return new Promise((resolve, reject) => {
    const countdownInterval = setInterval(() => {
      remainingTime -= 1000;
      io.to(tableId).emit('countdown', { remainingTime: remainingTime / 1000 });
      if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        if (!playerActionOccurred) {
          io.to(tableId).emit('blindTrnWithOutAction', { data: currentPlayer.socket.id });
          resolve({ action: 'fold', chips: 0 });
        }
      }
    }, 1000);
    currentPlayer.socket.on('playerAction', (data) => {
      playerActionOccurred = true;
      clearInterval(countdownInterval);
      resolve(data);
    });
    currentPlayer.socket.once('disconnect', () => {
      clearInterval(countdownInterval);
      if (!playerActionOccurred) {
        io.to(tableId).emit('blindTrnWithOutAction', { data: currentPlayer.socket.id });
        reject();
      }
    });
  });
}
module.exports = PokerGame;
