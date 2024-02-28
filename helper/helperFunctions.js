
const removePlayer = (players, index) => {
    let lastIndex = players.length - 1;
    [players[index], players[lastIndex]] = [players[lastIndex], players[index]];
    players.pop();

    console.log("Active players after removal: ", players);

}

module.exports = { removePlayer };

