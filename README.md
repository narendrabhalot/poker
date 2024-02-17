## POKER GAME


- Type - `Card` - `{value:'1', suit:'Hearts'}`
- Suits - `['Hearts', 'Diamonds', 'Clubs', 'Spades']`
- Type -`[]` - represents `List|Array`
- As per below table
**` client listener  events`** - [cards,blindName,displayPlayerOptions,bigblindTrnWithOutAction,flopCards,turnCards,riverCards,winner,winnerAmount,room message,disconnect,]



**` client emiting   events`** [
    1.  gameJoin(with three argument):-  playerId, gameId, chips,contestId
    2. playerAction :- example {
                              "action":"call",
                               "chips" :50
                                }
]
**`cards`** - Client receive 2 cards with value and suit type
**`blindName`** - Client receive blind name like [D,SB.BB]
**`displayPlayerOptions`** - all player receive message depend on privious player action 
**`flopCards`** - after completing batting round open 3 card on desk
**`turnCards`** -  after completing flop round round open 1 card on desk
**`riverCards`** - after completing turn round round open 1 card on desk
**`winner`** - after completing river round  , get winner in room 
**`winnerAmount`** - get winner amount  in room 





