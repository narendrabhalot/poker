
function mergeHandwithCommunityCard(players, communityCard) {


    try {
        let AllbestCardofEachPlayer = [];
        let winnerHand = []
        let winnerRank = 0
        let winnerId, winnerInfo;
        for (let i = 0; i < players.length; i++) {
            let currentPlayerInfo = {};
            players[i].cards = players[i].cards.concat(communityCard);
            currentPlayerInfo.id = players[i].id;
            let playerCard = players[i].cards;
            try {
                let bestHandsss = analyzePlayerHand(playerCard);
                currentPlayerInfo.bestvalueAndcard = bestHandsss;
                winnerInfo = winner(currentPlayerInfo, winnerHand, winnerRank, winnerId)
                winnerHand = winnerInfo.winnerHand
                winnerRank = winnerInfo.winnerRank
                winnerId = winnerInfo.winnerId
            } catch (error) {
                console.error("Error analyzing player hand:", error);
            }
            // AllbestCardofEachPlayer.push(playerInfo);
            // console.log("AllbestCardofEachPlayer is ", AllbestCardofEachPlayer)
        }
        return {
            winnerHand,
            winnerRank,
            winnerId
        }
    } catch (error) {
        console.error("Error in mergeHandwithCommunityCard:", error);
        throw error;
    }
}
function winner(player, winnerHand, winnerRank, winnerId) {
    let currentPlayerRank = player.bestvalueAndcard.bestHandvalue
    if (currentPlayerRank == winnerRank) {
        const sortCurrentHand = player.bestvalueAndcard.bestHand.map(card => getValue(card.value));
        const sortBestHand = winnerHand.map(card => getValue(card.value));
        if (compareHands(sortCurrentHand, sortBestHand) > 0) {
            bestHand = hand;
            winnerId = player.id
        }
    } else if (currentPlayerRank > winnerRank) {
        winnerRank = player.bestvalueAndcard.bestHandvalue
        winnerHand = player.bestvalueAndcard.bestHand
        winnerId = player.id
    }
    return { winnerHand, winnerRank, winnerId }
}
function analyzePlayerHand(allCards) {
    // console.log("allCards is ", allCards);
    const handCombinations = generateCombinations(allCards, 5);
    let bestHandvalue = 0;
    let bestHand = [];
    for (const hand of handCombinations) {
        const currentHandvalue = evaluateHand(hand);
        if (currentHandvalue === bestHandvalue) {
            const sortCurrentHand = hand.map(card => getValue(card.value));
            const sortBestHand = bestHand.map(card => getValue(card.value));
            if (compareHands(sortCurrentHand, sortBestHand) > 0) {
                bestHand = hand;
            }
        } else if (currentHandvalue > bestHandvalue) {
            bestHandvalue = currentHandvalue;
            bestHand = hand;
        }
    }
    // console.log("Final best hand value:", bestHandvalue);
    // console.log("Final best hand:", bestHand);
    return { bestHandvalue, bestHand };
}
function getValue(value) {
    const valueValues = { 'A': 14, 'K': 13, 'Q': 12, 'J': 10 };
    return valueValues[value] || parseInt(value);
}
function compareHands(hand1, hand2) {
    for (let i = 0; i < hand1.length; i++) {
        if (hand1[i] !== hand2[i]) {
            return hand1[i] - hand2[i];
        }
    }
    return 0;
}
function generateCombinations(cards, k) {
    const combinations = [];
    function combineUtil(temp, start, k) {
        if (k === 0) {
            combinations.push([...temp]);
            return;
        }
        for (let i = start; i < cards.length; i++) {
            temp.push(cards[i]);
            combineUtil(temp, i + 1, k - 1);
            temp.pop();
        }
    }
    combineUtil([], 0, k);
    return combinations;
}
function evaluateHand(hand) {
    const valueValues = {
        'A': 14,
        'K': 13,
        'Q': 12,
        'J': 10,
    };
    hand.sort((a, b) => {
        const valueAValue = valueValues[a.value] || parseInt(a.value);
        const valueBValue = valueValues[b.value] || parseInt(b.value);
        return valueBValue - valueAValue || a.suit.localeCompare(b.suit);
    });
    const isStraight = checkStraight(hand);
    const isFlush = checkFlush(hand);
    const handvalue = checkBasicPatterns(hand);
    if (isStraight && isFlush) {
        return hand[0].value === 'A' ? 10 : 9;
    } else if (isStraight && handvalue <= 5) {
        return 6;
    } else if (isFlush && handvalue <= 5) {
        return 5;
    } else {
        return handvalue
    }
}
function checkBasicPatterns(hand) {
    const valueCounts = {};
    for (const card of hand) {
        valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
    }
    if (Object.values(valueCounts).includes(4)) {
        return 8; // Four of a kind
    } else if (Object.values(valueCounts).includes(3) && Object.values(valueCounts).includes(2)) {
        return 7; // Full house
    } else if (Object.values(valueCounts).includes(3)) {
        return 4; // Three of a kind
    } else if (Object.values(valueCounts).filter(count => count === 2).length === 2) {
        return 3; // Two pair
    } else if (Object.values(valueCounts).includes(2)) {
        return 2; // Pair
    } else {
        return 1; // High card
    }
}
function checkStraight(hand) {
    let sortedvalues = hand.map(card => card.value);
    const valueValues = {
        'A': 14,
        'K': 13,
        'Q': 12,
        'J': 11,
    };
    sortedvalues.forEach((value, index) => {
        sortedvalues[index] = valueValues[value] || parseInt(value);
    });
    const aceLow = sortedvalues.includes(14) && sortedvalues.includes(2);
    const sortedvaluesLowAce = aceLow ? sortedvalues.map(value => value === 14 ? 1 : value) : sortedvalues;
    if (aceLow) {
        sortedvaluesLowAce.sort((a, b) => {
            return b - a
        });
    }

    for (let i = 0; i < 4; i++) {
        if (sortedvaluesLowAce[i] !== (sortedvaluesLowAce[i + 1] + 1)) {
            return false;
        }
    }
    return true;
}
function checkFlush(hand) {
    const firstSuit = hand[0].suit;
    return hand.every(card => card.suit === firstSuit);
}

module.exports = { mergeHandwithCommunityCard }