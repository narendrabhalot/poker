
const winners = require('../helper/winner')
class PokerGame {
  constructor(players, gameId, cardsPerPlayer = 2) {
    if (players.length < 2) {
      throw new Error('Poker game requires at least 2 players')
    }
    this.gameId = gameId;
    this.cardsPerPlayer = cardsPerPlayer;
    this.players = players;
    this.numberOfPlayers = this.players.length;
    this.dealerPosition = 0;
    this.smallBlindPosition = (this.dealerPosition + 1) % this.numberOfPlayers;
    this.bigBlindPosition = (this.dealerPosition + 2) % this.numberOfPlayers;
    this.pot = 0;
    this.deck = [];
    this.gameRound = 0
    this.currentPlayerIndex = this.smallBlindPosition
    this.previousPlayer = this.players[this.currentPlayerIndex]
    this.currentPlayer = this.players[this.smallBlindPosition]
    this.maxBet = 0.2
    this.minBet = 0
    this.currentBet = 0.1
    this.activePlayers = players.slice()
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
  async startGame(io, room) {
    try {
      await this.emitCardsAndPositions(io, room);
      await this.emitPositions(io, room);
      await this.startBettingRound(io, room);
      console.log('Game has completed the first round.');
      await this.startFlopRound(io, room);
      console.log('Game has completed the flop round');
      await this.startTurnRound(io, room)
      console.log('Game has completed the turn round');
      await this.startRiverRound(io, room)
      console.log('Game has completed the river round');
      await this.declareWinner(io, room)
    } catch (err) {
      console.error('Error occurred:', err);
    } finally {
      console.log('Terminating the game.');
      this.endGame(io, room);
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
        this.players[j].cards.push(this.deck.pop());
      }
    }
  }
  async resetGame(io, room) {
    console.log("game have comleted new game start")
    for (const player of this.players) {
      player.cards = [];
    }
    this.dealerPosition = (this.dealerPosition + 1) % this.numberOfPlayers;
    this.smallBlindPosition = (this.dealerPosition + 1) % this.numberOfPlayers;
    this.bigBlindPosition = (this.dealerPosition + 2) % this.numberOfPlayers;
    this.pot = 0;
    this.deck = [];
    this.currentPlayerIndex = this.smallBlindPosition
    this.previousPlayer = this.players[this.currentPlayerIndex]
    this.currentPlayer = this.players[this.smallBlindPosition]
    this.maxBet = 0.2
    this.currentBet = 0.1
    this.initialBet = 0.1
    this.roundNumber = 0
    this.activePlayers = this.players.slice()
    this.status = 'started';
    this.firstRoundCompleted = false;
    this.communityCard = []
    this.initializeGame();
    console.log("new game instanse", this.PokerGame)
    this.startGame(io, room)
  }
  async emitCardsAndPositions(io, room) {
    for (const player of this.players) {
      try {
        await io.to(player.id).emit('cards', player.cards);
      } catch (err) {
        console.error('Error emitting cards to player:', player.id, err);

      }
    }
  }
  async emitPositions(io, room) {
    try {
      let positionArr = ["D", "SB", "BB"];
      let count = 0;
      if (this.players.length == 2) {
        this.players[this.dealerPosition].blindName = "BB"
        this.players[this.smallBlindPosition].blindName = "SB"
        await io.to(this.players[this.smallBlindPosition].id).emit('blindName', "SB");
        await io.to(this.players[this.dealerPosition].id).emit('blindName', "BB");
      } else if (this.players.length > 2 && this.dealerPosition > this.bigBlindPosition) {
        this.players[this.dealerPosition].blindName = "D"
        this.players[this.smallBlindPosition].blindName = "SB"
        this.players[this.bigBlindPosition].blindName = "BB"
        await io.to(this.players[this.dealerPosition].id).emit('blindName', "D");
        await io.to(this.players[this.smallBlindPosition].id).emit('blindName', "SB");
        await io.to(this.players[this.bigBlindPosition].id).emit('blindName', "BB");
      } else {
        for (let i = this.dealerPosition; i <= this.bigBlindPosition; i++) {
          this.players[i].blindName = positionArr[count];
          try {
            await io.to(this.players[i].id).emit('blindName', positionArr[count]);
          } catch (err) {
            console.error("Error emitting blindName to player:", this.players[i].id, err);
          }
          count++;
        }
      }
    } catch (err) {
      console.error("Error in emitPositions:", err);
    }
  }
  async startBettingRound(io, room) {
    try {
      await this.deductChips(this.currentPlayer, 0.1)
      this.previousPlayer = this.currentPlayer;
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
      this.currentPlayer = this.players[this.currentPlayerIndex]
      this.currentBet = 0.2
      while (this.status !== 'ended' && this.activePlayers.length > 1) {
        try {
          await this.displayPlayerOptions(io, this.currentPlayer);
          let action = await waitForPlayerActionOrTimeout(this.currentPlayer, io);
          this.currentBet = action.chips
          if (this.maxBet < action.chips) {
            this.maxBet = action.chips
          }
          await this.handlePlayerAction(this.currentPlayer, action);

          this.previousPlayer = this.currentPlayer;
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
          this.currentPlayer = this.players[this.currentPlayerIndex]
        } catch (err) {
          console.error('Error handling in next player:', err);
        }
        if (this.activePlayers.length <= 1 || this.maxBet == this.currentPlayer.totalChips) {
          this.players.forEach(player => { player.totalChips = 0 });
          this.currentBet = 0
          this.maxBet = 0
          this.gameRound = 1
          break;
        }
      }
    } catch (err) {
      console.error('Error during betting round:', err);
    }
  }
  async startFlopRound(io, room) {
    try {
      const flopCards = this.deck.splice(-3);
      this.communityCard = this.communityCard.concat(flopCards)
      console.log("flopCards", flopCards)
      await io.to(room).emit('flopCards', flopCards);
      await this.flopCardBattingRound(io)
    } catch (err) {
      console.error('Error starting Flop round:', err);
    }
  }
  async startTurnRound(io, room) {
    try {
      const turnCard = this.deck.splice(-1);
      this.communityCard = this.communityCard.concat(turnCard)
      console.log("turnCards", turnCard)
      await io.to(room).emit('turnCards', turnCard);
      await this.flopCardBattingRound(io)
    } catch (err) {
      console.error('Error starting turn  round:', err);
    }
  }
  async startRiverRound(io, room) {
    try {
      const riverCards = this.deck.splice(-1);
      this.communityCard = this.communityCard.concat(riverCards)
      console.log("riverCards", riverCards)
      await io.to(room).emit('riverCards', riverCards);
      await this.flopCardBattingRound(io)

    } catch (err) {
      console.error('Error starting river round:', err);
    }
  }
  async declareWinner(io, room) {
    const winner = winners.mergeHandwithCommunityCard(this.players, this.communityCard)
    let filterWinner = this.players.filter(data => data.id == winner.winnerId)
    filterWinner[0].chips += this.pot
    this.pot = 0
    await io.to(room).emit('winner', winner);
    await io.to(winner.winnerId).emit('winnerAmount', filterWinner[0].chips)
  }
  async flopCardBattingRound(io) {
    try {
      this.currentPlayerIndex = this.smallBlindPosition
      this.currentPlayer = this.players[this.currentPlayerIndex]
      while (this.status !== 'ended' && this.activePlayers.length > 1) {
        try {

          await this.displayPlayerOptions(io, this.currentPlayer);
          let action = await waitForPlayerActionOrTimeout(this.currentPlayer, io);
          // console.log("action inside the flopcard batttinground ", action)
          this.currentBet = action.chips
          if (this.maxBet < action.chips) {
            this.maxBet = action.chips
          }
          await this.handlePlayerAction(this.currentPlayer, action);
          console.log("player detail before the action option ", this.currentPlayer)
          console.log("maximum bet amount  before the action option ", this.maxBet)
          console.log("current amount  before the action option ", this.currentBet)
          this.previousPlayer = this.currentPlayer;
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
          this.currentPlayer = this.players[this.currentPlayerIndex]
        } catch (err) {
          console.error('Error handling in next player:', err);
        }
        // console.log("this.maxBet == this.currentPlayer.totalChips", this.maxBet, this.currentPlayer.totalChips)
        if (this.activePlayers.length <= 1 || this.maxBet == this.currentPlayer.totalChips) {
          if (this.currentPlayerIndex == this.smallBlindPosition) {
            this.players.forEach(player => {
              player.totalChips = 0;
            })
            break;
          } else if (this.maxBet > 0) {
            this.players.forEach(player => { player.totalChips = 0 });
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
      this.currentPlayer = this.players[this.currentPlayerIndex]
      while (this.status !== 'ended' && this.activePlayers.length > 1) {

        try {
          await this.displayPlayerOptions(io, this.currentPlayer);
          let action = await waitForPlayerActionOrTimeout(this.currentPlayer, io);
          await this.handlePlayerAction(this.currentPlayer, action);
          this.previousPlayer = this.currentPlayer;
          // console.log("previousPlayer is inside the elae of player", this.previousPlayer)
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
          this.currentPlayer = this.players[this.currentPlayerIndex]
        } catch (err) {
          console.error('Error handling in next player:', err);
        }

        if (this.activePlayers.length <= 1 || this.currentPlayerIndex == this.smallBlindPosition) {
          break;
        }
      }
    } catch (err) {
      console.error('Error during river betting round:', err);
    }
  }
  async displayPlayerOptions(io, currentPlayer) {
    try {
      const { chips: betChips, totalChips } = currentPlayer;
      // console.log("betChips,totalChips", betChips, totalChips)
      let callChips = 0
      if (this.currentBet == 0 || this.currentBet == 0.1) {
        callChips = 0.1
      } else {
        callChips = this.maxBet - totalChips;
        callChips = callChips.toFixed(2);
      }
      const maxbet = this.maxBet;
      if (betChips <= maxbet) {
        await io.to(currentPlayer.id).emit('displayPlayerOptions', {
          detail: {
            action: ["allIn"],
            betChipsRange: betChips
          }
        });
      } else {
        const actionOptions = this.previousPlayer.action === "check" || (this.gameRound == 1 && this.maxBet == 0)
          ? ["call", "bet", "check", "allIn"]
          : ["call", "bet", "allIn"];
        await io.to(currentPlayer.id).emit('displayPlayerOptions', {
          detail: {
            action: actionOptions,
            callChips: callChips,
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

      switch (action) {
        case 'bet':
          this.handleBet(normalizedChips);
          break;
        case 'call':
          this.handleCall(normalizedChips);
          break;
        case 'fold':
          player.action = 'fold';
          this.activePlayers.splice(this.activePlayers.indexOf(player), 1);
          break;
        case 'check':
        case 'allIn':
          player.action = action;
          player.chips = action === 'allIn' ? 0 : player.chips;
          this.players[this.currentPlayerIndex].totalChips += chips
          break;
        default:
          console.warn('Invalid player action:', action);
      }
    } catch (err) {
      console.error('Error handling player action:', err);
    }
  }
  handleBet(chips) {
    this.players[this.currentPlayerIndex].chips -= chips
    this.players[this.currentPlayerIndex].totalChips += chips
    this.maxBet = this.players[this.currentPlayerIndex].totalChips
    this.pot += chips
    this.players[this.currentPlayerIndex].action = 'bet';
  }
  handleCall(chips) {
    this.players[this.currentPlayerIndex].chips -= chips
    this.players[this.currentPlayerIndex].totalChips += chips
    this.pot += chips
    this.players[this.currentPlayerIndex].action = "call"
  }
  async deductChips(player, chips) {
    if (player.chips >= chips) {
      this.players[this.currentPlayerIndex].chips -= chips
      this.players[this.currentPlayerIndex].totalChips += chips
      this.pot += chips;
    }
  }
  async endGame(io, room) {
    this.gameOver = true;
    io.to(room).emit('gameEnded', { message: 'Game over! Thank you for playing!' });
    console.log("after conplete the game ")

    await this.resetGame(io, room)
  }
}
async function waitForPlayerActionOrTimeout(currentPlayer, io) {
  const timeout = 50000;
  return new Promise((resolve, reject) => {
    let timeoutId = setTimeout(() => {
      io.to(currentPlayer.id).emit('blindTrnWithOutAction', { data: currentPlayer.socket.id });
      resolve({ action: 'call', chips: 0.2 });
    }, timeout);
    currentPlayer.socket.on('playerAction', (data) => {
      clearTimeout(timeoutId);
      console.log("data after clear time out", data)
      resolve(data);
    });
    currentPlayer.socket.on('disconnect `', reject);
  });
}


module.exports = PokerGame;