// teams.js - Team Generation and Management

import { CONFIG } from './config.js';
import { getRegion, getTeamName, generateRandomStat, shuffle } from './utils.js';

// Generate team stats based on round
export function generateTeamStats(round) {
    // ラウンドが範囲外（7以上）の場合は決勝のステータスを使用
    const clampedRound = Math.min(Math.max(round, 1), 6);
    const roundKey = CONFIG.ROUND_MAPPING[clampedRound];
    const statsRange = CONFIG.OPPONENT[roundKey];

    // 念のためnullチェック
    if (!statsRange) {
        console.warn(`generateTeamStats: Invalid round ${round}, using FINAL stats`);
        const finalStats = CONFIG.OPPONENT.FINAL;
        return {
            pass: generateRandomStat(finalStats.min, finalStats.max, true),
            dribble: generateRandomStat(finalStats.min, finalStats.max, true),
            shoot: generateRandomStat(finalStats.min, finalStats.max, true)
        };
    }

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

// P68: Create initial tournament bracket (64 teams, シード廃止)
export function createInitialBracket() {
    let teams = generateAllTeams();

    // K航拿 (てぇでぇ's学園) をブラケット前半（ID=0）に配置
    const finalBossIndex = teams.findIndex(t => t.prefecture === "K航拿");
    if (finalBossIndex > 0) {
        [teams[0], teams[finalBossIndex]] = [teams[finalBossIndex], teams[0]];
        teams[0].id = 0;
        teams[finalBossIndex].id = finalBossIndex;
    }

    // 奈良（プレーヤーチーム）を抽出
    const naraIndex = teams.findIndex(t => t.prefecture === "奈良");
    let playerTeam = null;
    if (naraIndex >= 0) {
        playerTeam = teams.splice(naraIndex, 1)[0];
    }

    // K航拿を抽出（ID=0を維持）
    const bossTeam = teams.splice(0, 1)[0];

    // 残りのチームをシャッフル
    teams = shuffle(teams);

    // ブラケット構築:
    // - K航拿をID=0（前半ブラケットの先頭）
    // - プレーヤーをブラケット後半（ID >= 32）に配置
    // これにより決勝まで対戦しない
    const halfPoint = Math.floor(CONFIG.GAME.TOTAL_TEAMS / 2);  // 32

    // 前半ブラケット: K航拿 + 他チーム31個
    const firstHalf = [bossTeam, ...teams.slice(0, halfPoint - 1)];

    // 後半ブラケット: 他チーム + プレーヤー
    let secondHalf = teams.slice(halfPoint - 1);
    if (playerTeam) {
        // プレーヤーを後半のランダムな位置に挿入
        const insertPos = Math.floor(Math.random() * (secondHalf.length + 1));
        secondHalf.splice(insertPos, 0, playerTeam);
    }

    // 結合
    const finalBracket = [...firstHalf, ...secondHalf];

    // IDを更新
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
    // K航拿（てぇでぇ's学園）は必ず勝利する（決勝で必ず対戦するため）
    const isFinalBoss1 = team1.prefecture === CONFIG.FINAL_BOSS.prefecture;
    const isFinalBoss2 = team2.prefecture === CONFIG.FINAL_BOSS.prefecture;

    let winner, loser;

    if (isFinalBoss1) {
        winner = team1;
        loser = team2;
    } else if (isFinalBoss2) {
        winner = team2;
        loser = team1;
    } else {
        // 通常のAI対戦
        let team1Power = team1.stats.pass + team1.stats.dribble + team1.stats.shoot;
        let team2Power = team2.stats.pass + team2.stats.dribble + team2.stats.shoot;

        // Add ace bonuses
        team1Power += team1.aces.length * CONFIG.ACE.STAT_MULTIPLIER;
        team2Power += team2.aces.length * CONFIG.ACE.STAT_MULTIPLIER;

        // Calculate win probability
        const team1WinProb = team1Power / (team1Power + team2Power);

        // Random determination with slight randomness
        const roll = Math.random();
        winner = roll < team1WinProb ? team1 : team2;
        loser = winner === team1 ? team2 : team1;
    }

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
// P68: ブラケット構造を尊重してマッチをペアリング
export function simulateRoundMatches(bracket, round, playerTeamId) {
    const results = [];
    const windowSize = Math.pow(2, round);  // Round 1: 2, Round 2: 4, Round 3: 8, etc.
    const numWindows = CONFIG.GAME.TOTAL_TEAMS / windowSize;

    // Process each window in the bracket
    for (let w = 0; w < numWindows; w++) {
        const windowStart = w * windowSize;
        const windowEnd = windowStart + windowSize;

        // Find the two non-eliminated teams in this window
        const teamsInWindow = [];
        for (let i = windowStart; i < windowEnd; i++) {
            if (bracket[i] && !bracket[i].eliminated) {
                teamsInWindow.push(bracket[i]);
            }
        }

        // If exactly 2 teams remain in this window, they fight
        if (teamsInWindow.length === 2) {
            const [team1, team2] = teamsInWindow;

            // Skip player match
            if (team1.id === playerTeamId || team2.id === playerTeamId) {
                continue;
            }

            const result = simulateAIMatch(team1, team2);
            results.push(result);
        }
    }

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
