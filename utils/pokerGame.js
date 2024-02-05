
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
    this.currentPlayerIndex = this.smallBlindPosition
    this.previousPlayer = this.players[this.currentPlayerIndex]
    this.currentPlayer = this.players[this.smallBlindPosition]
    this.maxBet = 0.1
    this.currentBet = 0.1
    this.initialBet = 0.1
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
    this.maxBet = 0.1
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
      const timeout = 30000;

      if (this.currentPlayer.blindName == 'SB') {
        try {
          await this.deductChips(this.currentPlayer, 0.1)
          this.previousPlayer = this.currentPlayer;
          // console.log("previousPlayer is inside th SB", this.previousPlayer)
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
          this.currentPlayer = this.players[this.currentPlayerIndex]
        } catch (error) {
          console.error("Error during small blind actions:", error);
        }
      }
      while (this.status !== 'ended' && this.activePlayers.length > 1) {
        // let this.currentPlayer = this.players[this.currentPlayerIndex];
        if (this.currentPlayer.blindName == 'BB') {
          try {
            // console.log("inside the BB")
            await this.displayPlayerOptions(io, this.currentPlayer);
            let action = await waitForPlayerActionOrTimeout(this.currentPlayer, io);
            console.log("action for BB", action)
            // console.log("type of in action i BB ", typeof action)
            // Handle player action (e.g., raise, fold, check)
            await this.handlePlayerAction(this.currentPlayer, action);
            this.previousPlayer = this.currentPlayer;
            // console.log("previousPlayer is inside the BB ", this.previousPlayer)
            // console.log("currunt player inddex brfore the bb", this.currentPlayerIndex)
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
            // console.log("currunt player brfore the bb", this.currentPlayer)
            this.currentPlayer = this.players[this.currentPlayerIndex]
            // console.log("currunt player after the bb", this.currentPlayer)
          } catch (err) {
            console.error('Error handling BB action:', err);
          }
        } else {
          try {
            await this.displayPlayerOptions(io, this.currentPlayer);
            let action = await waitForPlayerActionOrTimeout(this.currentPlayer, io);
            this.currentPlayer.action = action.action
            if (action.bet) {
              this.maxBet = action.bet
            }
            await this.handlePlayerAction(this.currentPlayer, action);
            this.previousPlayer = this.currentPlayer;
            // console.log("previousPlayer is inside the elae of player", this.previousPlayer)
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.numberOfPlayers;
            this.currentPlayer = this.players[this.currentPlayerIndex]
          } catch (err) {
            console.error('Error handling in next player:', err);
          }
        }
        if (this.activePlayers.length <= 1 || this.currentPlayerIndex == this.smallBlindPosition) {
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
      await this.riverCardBattingRound(io)
      // console.log("all player is", this.players)
      // console.log("all communitycard is", this.communityCard)
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
          await this.handlePlayerAction(this.currentPlayer, action);
          this.previousPlayer = this.currentPlayer;

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
    console.log("currentPlayer in a displayPlayerOptions", currentPlayer)
    try {
      let callChips = this.currentBet < 0.2 ? 0.2 : this.currentBet
      let betChips = currentPlayer.chips
      let maxbet = this.maxBet
      if (betChips <= maxbet) {
        await io.to(currentPlayer.id).emit('displayPlayerOptions', {
          detail: {
            action: ["allIn"],
            betChips: betChips
          }
        });
      } else if (betChips > maxbet && this.previousPlayer.action == "check") {
        await io.to(currentPlayer.id).emit('displayPlayerOptions', {
          detail: {
            action: ["call", "bet", "check"],
            callChips: callChips,
            betChips: betChips
          }
        })
      } else if (betChips > maxbet && this.previousPlayer.action == "check") {
        await io.to(currentPlayer.id).emit('displayPlayerOptions', {
          detail: {
            action: ["call", "bet", "check"],
            callChips: callChips,
            betChips: betChips
          }
        })
      } else if (betChips > maxbet && this.previousPlayer.action !== "check") {
        await io.to(currentPlayer.id).emit('displayPlayerOptions', {
          detail: {
            action: ["call", "bet",],
            callChips: callChips,
            betChips: betChips
          }
        })
      }
    } catch (error) {
      console.error("Error retrieving maximum bet:", error);

    }
  }
  async handlePlayerAction(player, actionData) {
    console.log("actionData is a ", actionData)
    try {
      const { action, chips } = actionData
      console.log(" inside the handlePlayeraction the bet ", action, chips)
      if (action == 'bet') {
        console.log("inside the bet ", action, chips)
        this.handleBet(Number(chips))
      } else if (action == 'call') {
        this.handleCall(Number(chips))
      } else if (action == 'fold') {
        player.action = "fold"
        this.activePlayers.splice(this.activePlayers.indexOf(player), 1);
      } else if (action === 'check') {
        player.action = "check"
      }
    } catch (err) {
      console.error('Error handling player action:', err);
    }
  }
  // checkRoundCompleted() {
  //   // Define conditions for round completion based on your game rules
  //   return  this.activePlayers.length <= 1 || this.currentPlayerIndex == this.smallBlindPosition
  // }
  handleBet(chips) {
    this.players[this.currentPlayerIndex].chips -= chips
    console.log("this.players[this.currentPlayerIndex].chips", this.players[this.currentPlayerIndex].chips)
    this.pot += chips
    this.currentBet = chips
    this.players[this.currentPlayerIndex].action = 'bet';
  }
  handleCall(chips) {
    this.players[this.currentPlayerIndex].chips -= chips
    this.pot += chips
    this.players[this.currentPlayerIndex].action = "call"
  }
  async deductChips(player, chips) {
    if (player.chips >= chips) {
      this.players[this.currentPlayerIndex].chips -= chips
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
  const timeout = 5000;
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
    currentPlayer.socket.on('disconnect', reject);
  });
}


module.exports = PokerGame;
