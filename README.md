## POKER GAME


- Type - `Card` - `{value:'1', suit:'Hearts'}`
- Suits - `['Hearts', 'Diamonds', 'Clubs', 'Spades']`
- Type -`[]` - represents `List|Array`
- As per below table
**` client listener  events`** -[cards,blindName,flopCards,turnCards,riverCards,displayPlayerOptions,blindTrnWithOutAction,gameEnded,winner,winnerAmount,disconnect,game-message,room message
pot-amount,playerNames,turn-player ,player-action,countdown,player-message]
**` client emiting   events`** [
    1.  gameJoin(with  7 argument):- playerId, tableId, chips, contestId, smallBlindAmount, bigBlindAmount, playerName
    2. playerAction :- example {
                              "action":"call",
                               "chips" :50
                                }
   Note:
   1) If player wants to choose total chips then change action name "Bet" to "allIn"  
   2) If the player chooses the action "Check" or "Fold" the amount of chips is zero.
]
**`cards`** - Client receive 2 cards with value and suit type
**`blindName`** - Client receive blind name like [D,SB.BB]
**`displayPlayerOptions`** - all player receive message depend on privious player action 
**`flopCards`** - after completing batting round open 3 card on desk
**`turnCards`** -  after completing flop round round open 1 card on desk
**`riverCards`** - after completing turn round round open 1 card on desk
**`winner`** - after completing river round  , get winner in room 
**`winnerAmount`** - get winner amount  in room 
**`room message`** - get message if new player join the game 
**`gameEnded`** - after complete the game 
**`game-message`** - message for player for waiting 
**`pot-amount`** - get a updated pot amount 
**`playerNames`** - get all player name after reset the game 
**`turn-player`** - get winner amount  in room 
**`player-action`** -After hitting any action like "Call", get playerName, current chips in a room
**`countdown`** - Get time remaining for current player action
**`player-message`** - Receive message if player has no chips
