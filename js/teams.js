// teams.js - Team Generation and Management

import { CONFIG } from './config.js';
import { getRegion, getTeamName, generateRandomStat, shuffle } from './utils.js';

// Generate team stats based on round
export function generateTeamStats(round) {
    const roundKey = CONFIG.ROUND_MAPPING[round];
    const statsRange = CONFIG.OPPONENT[roundKey];

    return {
        pass: generateRandomStat(statsRange.min, statsRange.max, true),
        dribble: generateRandomStat(statsRange.min, statsRange.max, true),
        shoot: generateRandomStat(statsRange.min, statsRange.max, true)
    };
}

// Create team object from prefecture
export function createTeam(id, prefecture, round, isSeeded = false) {
    const name = getTeamName(prefecture);
    const region = getRegion(prefecture);
    const stats = generateTeamStats(round);
    const tactic = CONFIG.REGIONAL[region];

    return {
        id: id,
        name: name,
        prefecture: prefecture,
        region: region,
        isSeeded: isSeeded,
        stats: stats,
        tactic: tactic,
        eliminated: false,
        aces: []
    };
}

// Generate all tournament teams
export function generateAllTeams() {
    const teams = [];

    // Create teams from all prefectures
    CONFIG.PREFECTURES.forEach((prefecture, index) => {
        const isSeeded = index < CONFIG.GAME.SEEDED_TEAMS;
        const team = createTeam(index, prefecture, 1, isSeeded);
        teams.push(team);
    });

    return teams;
}

// Generate opponent team for specific round
export function generateOpponent(prefecture, round) {
    const region = getRegion(prefecture);
    const name = getTeamName(prefecture);
    const stats = generateTeamStats(round);
    const tactic = CONFIG.REGIONAL[region];

    return {
        name: name,
        prefecture: prefecture,
        region: region,
        stats: stats,
        tactic: tactic
    };
}

// Create initial tournament bracket (48 teams)
export function createInitialBracket() {
    let teams = generateAllTeams();

    // Ensure K航拿 (てぇでぇ's学園) is in seeded position
    const finalBossIndex = teams.findIndex(t => t.prefecture === "K航拿");
    if (finalBossIndex > 0) {
        // Swap with first seeded team
        [teams[0], teams[finalBossIndex]] = [teams[finalBossIndex], teams[0]];
        teams[0].id = 0;
        teams[finalBossIndex].id = finalBossIndex;
    }

    // Ensure 奈良 (player team) is NOT seeded
    const naraIndex = teams.findIndex(t => t.prefecture === "奈良");
    if (naraIndex < CONFIG.GAME.SEEDED_TEAMS) {
        // Swap with first non-seeded team
        const swapIndex = CONFIG.GAME.SEEDED_TEAMS;
        [teams[naraIndex], teams[swapIndex]] = [teams[swapIndex], teams[naraIndex]];
        teams[naraIndex].id = naraIndex;
        teams[swapIndex].id = swapIndex;
        teams[swapIndex].isSeeded = false;
        teams[naraIndex].isSeeded = true;
    }

    // Shuffle non-seeded teams (except player team)
    const seededTeams = teams.slice(0, CONFIG.GAME.SEEDED_TEAMS);
    let nonSeededTeams = teams.slice(CONFIG.GAME.SEEDED_TEAMS);

    // Find player team in non-seeded
    const playerIndex = nonSeededTeams.findIndex(t => t.prefecture === "奈良");
    let playerTeam = null;
    if (playerIndex >= 0) {
        playerTeam = nonSeededTeams.splice(playerIndex, 1)[0];
    }

    // Shuffle remaining non-seeded teams
    nonSeededTeams = shuffle(nonSeededTeams);

    // Add player team back at random position
    if (playerTeam) {
        const insertPos = Math.floor(Math.random() * (nonSeededTeams.length + 1));
        nonSeededTeams.splice(insertPos, 0, playerTeam);
    }

    // Combine back
    const finalBracket = [...seededTeams, ...nonSeededTeams];

    // Update IDs
    finalBracket.forEach((team, index) => {
        team.id = index;
    });

    return finalBracket;
}

// Get opponent for player in current round
export function getPlayerOpponent(bracket, playerTeamId, round) {
    // Calculate match index based on round
    const matchesInRound = CONFIG.GAME.TOTAL_TEAMS / Math.pow(2, round);
    const playerMatchIndex = Math.floor(playerTeamId / Math.pow(2, round));

    // Find opponent in same match
    const matchStart = playerMatchIndex * Math.pow(2, round);
    const matchEnd = matchStart + Math.pow(2, round);

    for (let i = matchStart; i < matchEnd; i++) {
        if (i !== playerTeamId && !bracket[i].eliminated) {
            return bracket[i];
        }
    }

    return null;
}

// Simulate match between two AI teams
export function simulateAIMatch(team1, team2) {
    let team1Power = team1.stats.pass + team1.stats.dribble + team1.stats.shoot;
    let team2Power = team2.stats.pass + team2.stats.dribble + team2.stats.shoot;

    // Add ace bonuses
    team1Power += team1.aces.length * CONFIG.ACE.STAT_MULTIPLIER;
    team2Power += team2.aces.length * CONFIG.ACE.STAT_MULTIPLIER;

    // Calculate win probability
    const team1WinProb = team1Power / (team1Power + team2Power);

    // Random determination with slight randomness
    const roll = Math.random();
    const winner = roll < team1WinProb ? team1 : team2;
    const loser = winner === team1 ? team2 : team1;

    // Generate realistic score
    const winnerScore = CONFIG.GAME.POINTS_TO_WIN;
    const loserScore = Math.floor(Math.random() * CONFIG.GAME.POINTS_TO_WIN);

    // Mark loser as eliminated
    loser.eliminated = true;

    // Winner gains an ace
    const newAceIndex = Math.floor(Math.random() * CONFIG.GAME.PLAYERS_PER_TEAM);
    if (!winner.aces.includes(newAceIndex)) {
        winner.aces.push(newAceIndex);
    }

    return {
        winner: winner,
        loser: loser,
        score: `${winnerScore}-${loserScore}`
    };
}

// Simulate all AI matches in a round
export function simulateRoundMatches(bracket, round, playerTeamId) {
    const results = [];
    const teamsPerMatch = Math.pow(2, round);
    const totalMatches = CONFIG.GAME.TOTAL_TEAMS / teamsPerMatch / 2;

    // Group teams into matches
    const activeTeams = bracket.filter(t => !t.eliminated);
    const matches = [];

    for (let i = 0; i < activeTeams.length; i += 2) {
        if (i + 1 < activeTeams.length) {
            matches.push([activeTeams[i], activeTeams[i + 1]]);
        }
    }

    // Simulate each match (skip player match)
    matches.forEach(([team1, team2]) => {
        if (team1.id === playerTeamId || team2.id === playerTeamId) {
            return; // Skip player match
        }

        const result = simulateAIMatch(team1, team2);
        results.push(result);
    });

    return results;
}

// Get remaining teams count
export function getRemainingTeamsCount(bracket) {
    return bracket.filter(t => !t.eliminated).length;
}

// Get team by ID
export function getTeamById(bracket, id) {
    return bracket.find(t => t.id === id);
}

// Get team by prefecture
export function getTeamByPrefecture(bracket, prefecture) {
    return bracket.find(t => t.prefecture === prefecture);
}

// Check if team is final boss
export function isFinalBoss(team) {
    return team.prefecture === CONFIG.FINAL_BOSS.prefecture;
}

// Update team stats for next round (slight increase)
export function updateTeamStatsForNextRound(team, round) {
    const newStats = generateTeamStats(round);
    team.stats = newStats;
}

// Get all active teams in current round
export function getActiveTeams(bracket) {
    return bracket.filter(t => !t.eliminated);
}
