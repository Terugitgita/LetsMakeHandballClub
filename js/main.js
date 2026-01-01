// main.js - Game Entry Point

import { CONFIG, DEBUG_CONFIG } from './config.js';
import { gameState, initializeNewGame, saveGame, loadGame, resetGame, setCurrentMatch } from './gameState.js';
import { initializeScreens, switchScreen, SCREENS } from './screens.js';
import { initializeTournament } from './tournament.js';
import { getPlayerOpponent } from './teams.js';

// Initialize game on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Handball Game...');
    console.log('Game Title:', CONFIG.MESSAGES.TITLE.gameTitle);

    // Set up viewport for mobile
    setupViewport();

    // Initialize game screens
    initializeScreens();

    // Set up debug tools if enabled
    if (CONFIG.DEBUG.ENABLED) {
        setupDebugTools();
    }

    // Add visibility change handler to pause game if needed
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Prevent pull-to-refresh on mobile
    preventPullToRefresh();

    console.log('Game initialized successfully!');
});

// Setup viewport for mobile devices
function setupViewport() {
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
    }
    viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
}

// Prevent pull-to-refresh gesture on mobile (while allowing normal scrolling)
function preventPullToRefresh() {
    let lastTouchY = 0;

    document.body.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        lastTouchY = e.touches[0].clientY;
    }, { passive: true });

    document.body.addEventListener('touchmove', (e) => {
        const container = document.getElementById('game-container');
        if (!container) return;

        const touchY = e.touches[0].clientY;
        const touchYDelta = touchY - lastTouchY;
        lastTouchY = touchY;

        // Only prevent pull-to-refresh when:
        // 1. Container is scrolled to top (scrollTop === 0)
        // 2. User is trying to scroll down (pull down gesture)
        const isAtTop = container.scrollTop === 0;
        const isPullingDown = touchYDelta > 0;

        if (isAtTop && isPullingDown) {
            e.preventDefault();
        }
        // All other cases: allow normal scrolling (up and down)
    }, { passive: false });
}

// Handle visibility change (pause when tab is hidden)
function handleVisibilityChange() {
    if (document.hidden) {
        // Page is hidden - could pause animations here
        console.log('Game paused (tab hidden)');
    } else {
        // Page is visible again
        console.log('Game resumed (tab visible)');
    }
}

// Debug tools setup
function setupDebugTools() {
    console.log('Debug mode enabled!');

    // Expose debug functions to window
    window.debugGame = {
        // Skip to specific week
        skipToWeek: (week) => {
            if (week >= 1 && week <= CONFIG.GAME.TOTAL_WEEKS) {
                gameState.currentWeek = week;
                gameState.currentDay = 1;
                saveGame();
                console.log(`Skipped to week ${week}`);
                location.reload();
            }
        },

        // Set team stats
        setStats: (pass, dribble, shoot) => {
            gameState.team.stats.pass = pass;
            gameState.team.stats.dribble = dribble;
            gameState.team.stats.shoot = shoot;
            saveGame();
            console.log('Stats updated:', gameState.team.stats);
            location.reload();
        },

        // Add aces
        addAces: (count) => {
            for (let i = 0; i < count; i++) {
                const aceIndex = Math.floor(Math.random() * CONFIG.GAME.PLAYERS_PER_TEAM);
                if (!gameState.team.aces.includes(aceIndex)) {
                    gameState.team.aces.push(aceIndex);
                }
            }
            saveGame();
            console.log('Aces added:', gameState.team.aces);
            location.reload();
        },

        // Show current state
        showState: () => {
            console.log('Current Game State:', JSON.parse(JSON.stringify(gameState)));
        },

        // Reset game
        resetGame: () => {
            if (confirm('Are you sure you want to reset the game?')) {
                resetGame();
                console.log('Game reset!');
                location.reload();
            }
        },

        // Enable rest bonus
        enableRestBonus: () => {
            gameState.team.restBonus = true;
            saveGame();
            console.log('Rest bonus enabled');
            location.reload();
        },

        // Change captain
        changeCaptain: (personality, policy) => {
            const validPersonalities = Object.keys(CONFIG.CAPTAIN.PERSONALITY);
            const validPolicies = Object.keys(CONFIG.CAPTAIN.POLICY);

            if (validPersonalities.includes(personality)) {
                gameState.captain.personality = personality;
            }
            if (validPolicies.includes(policy)) {
                gameState.captain.policy = policy;
            }

            saveGame();
            console.log('Captain changed:', gameState.captain);
            location.reload();
        },

        // Advance to finals
        advanceToFinals: () => {
            // ゲームが初期化されていなければ初期化
            if (!gameState.team || !gameState.tournament.bracket) {
                initializeNewGame();
                initializeTournament();
            }
            gameState.currentWeek = 6;
            gameState.currentDay = 6;
            gameState.tournament.currentRound = 6;

            // 他のチームを全て敗退させて、てぇでぇ's学園のみ残す
            const bracket = gameState.tournament.bracket;
            const playerTeamId = gameState.tournament.playerTeamId;
            for (let i = 0; i < bracket.length; i++) {
                if (i !== playerTeamId && bracket[i].prefecture !== CONFIG.FINAL_BOSS.prefecture) {
                    bracket[i].eliminated = true;
                }
            }

            saveGame();
            console.log('Advanced to finals!');

            // 対戦相手を取得して試合準備画面へ遷移
            const opponent = getPlayerOpponent(bracket, playerTeamId, 6);
            console.log('Final opponent:', opponent);
            setCurrentMatch(opponent);
            switchScreen(SCREENS.MATCH_SETUP, { opponent });
        }
    };

    // Display debug instructions
    console.log(`
=== DEBUG COMMANDS ===
window.debugGame.skipToWeek(week) - Skip to specific week (1-6)
window.debugGame.setStats(pass, dribble, shoot) - Set team stats
window.debugGame.addAces(count) - Add ace players
window.debugGame.showState() - Display current game state
window.debugGame.resetGame() - Reset game data
window.debugGame.enableRestBonus() - Enable rest bonus
window.debugGame.changeCaptain(personality, policy) - Change captain
window.debugGame.advanceToFinals() - Jump to finals
=====================
`);
}

// Export for potential use in other modules
export { setupDebugTools };
