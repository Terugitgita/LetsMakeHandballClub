// tournament.js - Tournament Bracket Management

import { CONFIG } from './config.js';
import { gameState } from './gameState.js';
import {
    createInitialBracket,
    getPlayerOpponent,
    simulateRoundMatches,
    getActiveTeams,
    updateTeamStatsForNextRound,
    isFinalBoss
} from './teams.js';

// Initialize tournament bracket
export function initializeTournament() {
    const bracket = createInitialBracket();

    // Find player team ID
    const playerTeam = bracket.find(t => t.prefecture === CONFIG.PLAYER_TEAM.prefecture);

    gameState.tournament.bracket = bracket;
    gameState.tournament.playerTeamId = playerTeam.id;
    gameState.tournament.currentRound = 1;
    gameState.tournament.results = [];

    return bracket;
}

// Get player's next opponent
export function getNextOpponent() {
    const bracket = gameState.tournament.bracket;
    const playerTeamId = gameState.tournament.playerTeamId;
    const round = gameState.tournament.currentRound;

    const opponent = getPlayerOpponent(bracket, playerTeamId, round);

    // Update opponent stats for current round
    if (opponent) {
        updateTeamStatsForNextRound(opponent, round);
    }

    return opponent;
}

// Process round results (simulate AI matches)
export function processRoundResults() {
    const bracket = gameState.tournament.bracket;
    const round = gameState.tournament.currentRound;
    const playerTeamId = gameState.tournament.playerTeamId;

    // Simulate all AI vs AI matches
    const results = simulateRoundMatches(bracket, round, playerTeamId);

    return results;
}

// Advance tournament after player wins
export function advanceTournament() {
    // Increment round
    gameState.tournament.currentRound++;

    // Update all remaining teams' stats for next round
    const activeTeams = getActiveTeams(gameState.tournament.bracket);
    activeTeams.forEach(team => {
        if (team.id !== gameState.tournament.playerTeamId) {
            updateTeamStatsForNextRound(team, gameState.tournament.currentRound);
        }
    });
}

// Check if tournament is completed
export function isTournamentComplete() {
    return gameState.tournament.currentRound > 6;
}

// Check if current round is finals
export function isFinals() {
    return gameState.tournament.currentRound === 6;
}

// Get round name
export function getRoundName(round) {
    const names = {
        1: "1回戦",
        2: "2回戦",
        3: "3回戦",
        4: "準々決勝",
        5: "準決勝",
        6: "決勝"
    };
    return names[round] || "試合";
}

// Get current round name
export function getCurrentRoundName() {
    return getRoundName(gameState.tournament.currentRound);
}

// Get bracket structure for display
export function getBracketStructure() {
    const bracket = gameState.tournament.bracket;
    const rounds = [];

    // Generate each round's matches
    for (let round = 1; round <= 6; round++) {
        const teamsInRound = CONFIG.GAME.TOTAL_TEAMS / Math.pow(2, round - 1);
        const matchesInRound = teamsInRound / 2;
        const matches = [];

        for (let m = 0; m < matchesInRound; m++) {
            const matchStart = m * Math.pow(2, round);
            const matchEnd = matchStart + Math.pow(2, round);

            const teamsInMatch = [];
            for (let i = matchStart; i < matchEnd; i++) {
                if (bracket[i] && !bracket[i].eliminated) {
                    teamsInMatch.push(bracket[i]);
                }
            }

            if (teamsInMatch.length > 0) {
                matches.push({
                    teams: teamsInMatch,
                    matchIndex: m
                });
            }
        }

        rounds.push({
            round: round,
            name: getRoundName(round),
            matches: matches
        });
    }

    return rounds;
}

// Get simplified bracket for UI (just showing key matches)
export function getSimplifiedBracket() {
    const bracket = gameState.tournament.bracket;
    const playerTeamId = gameState.tournament.playerTeamId;
    const currentRound = gameState.tournament.currentRound;

    // Get player's path
    const playerPath = [];
    for (let round = 1; round <= 6; round++) {
        if (round < currentRound) {
            // Past rounds - show results
            const result = gameState.tournament.results.find(r => r.round === round);
            if (result) {
                playerPath.push({
                    round: round,
                    roundName: getRoundName(round),
                    opponent: result.opponent,
                    result: result.won ? '勝利' : '敗北',
                    score: `${result.playerScore}-${result.opponentScore}`
                });
            }
        } else if (round === currentRound) {
            // Current round - show opponent
            const opponent = getNextOpponent();
            if (opponent) {
                playerPath.push({
                    round: round,
                    roundName: getRoundName(round),
                    opponent: opponent.name,
                    result: '試合前',
                    score: '-'
                });
            }
        } else {
            // Future rounds
            playerPath.push({
                round: round,
                roundName: getRoundName(round),
                opponent: '???',
                result: '未定',
                score: '-'
            });
        }
    }

    return playerPath;
}

// Get tournament statistics
export function getTournamentStats() {
    const results = gameState.tournament.results;
    const wins = results.filter(r => r.won).length;
    const losses = results.filter(r => !r.won).length;

    let totalPlayerScore = 0;
    let totalOpponentScore = 0;

    results.forEach(r => {
        totalPlayerScore += r.playerScore;
        totalOpponentScore += r.opponentScore;
    });

    return {
        wins: wins,
        losses: losses,
        totalPlayerScore: totalPlayerScore,
        totalOpponentScore: totalOpponentScore,
        currentRound: gameState.tournament.currentRound,
        roundName: getCurrentRoundName()
    };
}

// Check if player reached finals
export function playerReachedFinals() {
    return gameState.tournament.currentRound >= 6;
}

// Check if next opponent is final boss
export function isNextOpponentFinalBoss() {
    const opponent = getNextOpponent();
    return opponent && isFinalBoss(opponent);
}

// Get remaining teams in tournament
export function getRemainingTeams() {
    return getActiveTeams(gameState.tournament.bracket);
}

// Get eliminated teams
export function getEliminatedTeams() {
    return gameState.tournament.bracket.filter(t => t.eliminated);
}

// Reset tournament (for new game)
export function resetTournament() {
    gameState.tournament.bracket = [];
    gameState.tournament.playerTeamId = null;
    gameState.tournament.currentRound = 1;
    gameState.tournament.results = [];
}
