# Implementation Guidance for Claude Code - Handball Simulation Game

## Project Overview
Create a handball simulation game "Zukkyun Middle School Story" as a single-page web application using vanilla JavaScript, HTML5, and CSS3. The game runs entirely in the browser with LocalStorage for data persistence.

## IMPORTANT: Configuration-Based Development
This project uses a centralized configuration system. **ALL game parameters, values, and settings must be loaded from `config.js`** which is generated from `settings_config.md`. This allows for easy balance adjustments and prevents hardcoding. Never hardcode values that exist in the configuration.

## 1. Project Structure

```
handball-game/
├── index.html           # Main HTML file
├── css/
│   └── style.css       # All styles (mobile-first, responsive)
├── js/
│   ├── config.js       # Game configuration (from settings_config.md)
│   ├── main.js         # Entry point, game initialization
│   ├── gameState.js    # Game state management & LocalStorage
│   ├── screens.js      # All screen/UI management
│   ├── training.js     # Training system logic
│   ├── match.js        # Match system & real-time simulation
│   ├── tournament.js   # Tournament bracket & progression
│   ├── teams.js        # Team data & opponent generation
│   └── utils.js        # Utility functions
└── assets/             # Placeholder for future images
```

## 2. Implementation Order (Critical Path)

### Phase 0: Configuration (Start Here First)
1. Create `config.js` from `settings_config.md` - all game parameters

### Phase 1: Foundation 
2. Create `index.html` with basic structure
3. Implement `gameState.js` - data structures and LocalStorage
4. Create `screens.js` - screen management system
5. Build `main.js` - initialization and game loop

### Phase 2: Core Mechanics
6. Implement `teams.js` - team generation and stats
7. Create `training.js` - training menu and stat growth
8. Build `tournament.js` - bracket system and progression

### Phase 3: Match System (Most Complex)
9. Implement `match.js` - complete match simulation
10. Add real-time animation (30fps)
11. Implement AI behavior patterns

### Phase 4: Polish
12. Style with `style.css`
13. Add transitions and animations
14. Test and debug

## 3. Detailed Implementation Guidelines

### 3.1 Data Structures (gameState.js)

```javascript
// Import configuration from settings
import { CONFIG } from './config.js';

// Core game state structure
const gameState = {
    // Current game status
    currentWeek: 1,        // 1-6
    currentDay: 1,         // 1-7 (Mon-Sun)
    
    // Team stats
    team: {
        name: CONFIG.PLAYER_TEAM.name,
        stats: {
            pass: 5.5,      // Float values allowed
            dribble: 7,
            shoot: 4.5
        },
        restBonus: false,   // Friday rest bonus
        aces: []           // Array of ace positions [0-6]
    },
    
    // Captain system
    captain: {
        personality: "熱血",  // From CONFIG.CAPTAIN.PERSONALITY keys
        policy: "論理的",     // From CONFIG.CAPTAIN.POLICY keys
    },
    
    // Tournament data
    tournament: {
        bracket: [],        // Array of teams from CONFIG
        currentRound: 1,    // 1-6
        playerPosition: 15, // Position in bracket (0-46)
        results: []         // Match results history
    },
    
    // Match in progress data (temporary)
    currentMatch: {
        opponent: null,
        playerScore: 0,
        opponentScore: 0,
        tactics: [],       // Array of planned actions
        isPlaying: false
    }
};

// LocalStorage operations using CONFIG
function saveGame() {
    localStorage.setItem(CONFIG.GAME.STORAGE_KEY, JSON.stringify(gameState));
}

function loadGame() {
    const saved = localStorage.getItem(CONFIG.GAME.STORAGE_KEY);
    if (saved) {
        Object.assign(gameState, JSON.parse(saved));
        return true;
    }
    return false;
}

function resetGame() {
    localStorage.removeItem(CONFIG.GAME.STORAGE_KEY);
    initializeNewGame();
}
```

### 3.2 Screen Management System (screens.js)

```javascript
// Screen types enum
const SCREENS = {
    TITLE: 'title',
    MAIN: 'main',
    TRAINING: 'training',
    MATCH: 'match',
    TOURNAMENT: 'tournament',
    RESULT: 'result'
};

// Screen rendering functions
const screenRenderers = {
    title: renderTitleScreen,
    main: renderMainScreen,
    training: renderTrainingScreen,
    match: renderMatchScreen,
    tournament: renderTournamentScreen,
    result: renderResultScreen
};

// Core screen switching logic
function switchScreen(screenName) {
    const container = document.getElementById('game-container');
    container.className = `screen-${screenName}`;
    container.innerHTML = '';
    screenRenderers[screenName](container);
}
```

### 3.3 Training System (training.js)

```javascript
// Import configuration
import { CONFIG } from './config.js';

// Training menu implementation from CONFIG
const trainingMenus = CONFIG.TRAINING;

// Calculate actual stat growth with captain modifiers
function calculateGrowth(baseGrowth) {
    let growth = {...baseGrowth};
    
    // Apply personality modifier from CONFIG
    const personalityMod = getPersonalityModifier();
    Object.keys(growth).forEach(stat => {
        growth[stat] *= personalityMod;
    });
    
    // Apply policy modifier from CONFIG
    growth = applyPolicyModifier(growth);
    
    return growth;
}

// Personality effects from CONFIG
function getPersonalityModifier() {
    const week = gameState.currentWeek;
    const personality = gameState.captain.personality;
    const personalityConfig = CONFIG.CAPTAIN.PERSONALITY[personality];
    
    if (personalityConfig.boycottWeek && week >= personalityConfig.boycottWeek) {
        return personalityConfig.boycottEffect;
    }
    return personalityConfig.growthMultiplier;
}

// Policy effects from CONFIG
function applyPolicyModifier(growth) {
    const policy = gameState.captain.policy;
    const policyConfig = CONFIG.CAPTAIN.POLICY[policy];
    
    if (policyConfig.focusLowest) {
        // Find lowest stat and apply multiplier
        const stats = gameState.team.stats;
        const lowestStat = Object.keys(stats).reduce((a, b) => 
            stats[a] < stats[b] ? a : b
        );
        growth[lowestStat] *= policyConfig.multiplier;
    } else if (policyConfig.statModifier) {
        // Apply specific stat modifiers
        Object.keys(growth).forEach(stat => {
            growth[stat] *= policyConfig.statModifier[stat];
        });
    }
    
    return growth;
}
```

### 3.4 Match System - Core (match.js)

```javascript
// Court setup (100x100 grid)
const COURT = {
    width: 100,
    height: 100,
    goalY: 50,        // Center of goal
    goalWidth: 7,     // Goal spans 7 units
    centerLine: 50
};

// Player positions structure
class Player {
    constructor(x, y, team, isAce = false) {
        this.x = x;
        this.y = y;
        this.team = team;  // 'player' or 'opponent'
        this.isAce = isAce;
        this.vx = 0;       // Velocity X
        this.vy = 0;       // Velocity Y
    }
    
    getSpeed() {
        const baseSpeed = this.team === 'player' ? 
            gameState.team.stats.dribble : 
            gameState.currentMatch.opponent.stats.dribble;
        return this.isAce ? baseSpeed * 1.5 : baseSpeed;
    }
}

// Tactic action structure
class TacticAction {
    constructor(type, from, to, duration = 0) {
        this.type = type;      // 'pass', 'dribble', 'shoot'
        this.from = from;      // Player index
        this.to = to;          // Target player or direction
        this.duration = duration; // For dribble: 1, 3, or 5 seconds
    }
}

// Real-time simulation engine
class MatchSimulator {
    constructor(tactics, opponentStrategy) {
        this.tactics = tactics;
        this.opponentStrategy = opponentStrategy;
        this.currentAction = 0;
        this.players = this.initializePlayers();
        this.opponents = this.initializeOpponents();
        this.ball = { x: 50, y: 25, holder: 0 };
        this.score = { player: 0, opponent: 0 };
        this.frameCount = 0;
        this.isRunning = false;
    }
    
    // Main simulation loop (30 FPS)
    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
    }
    
    animate() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        
        if (deltaTime >= 1/30) { // 30 FPS
            this.update(deltaTime);
            this.render();
            this.lastTime = currentTime;
        }
        
        requestAnimationFrame(() => this.animate());
    }
    
    update(dt) {
        // Execute current tactic
        if (this.currentAction < this.tactics.length) {
            const action = this.tactics[this.currentAction];
            if (this.executeAction(action, dt)) {
                this.currentAction++;
            }
        }
        
        // Update opponent AI
        this.updateOpponents(dt);
        
        // Check for interceptions
        this.checkInterceptions();
        
        // Check win condition
        if (this.score.player >= 5 || this.score.opponent >= 5) {
            this.endMatch();
        }
    }
}
```

### 3.5 Regional Defense Patterns (teams.js)

```javascript
// Defense strategies by region
const DEFENSE_PATTERNS = {
    '北海道': {
        name: '全員プレス',
        behavior: 'all_to_ball',
        update: function(defenders, ball) {
            defenders.forEach(defender => {
                const dx = ball.x - defender.x;
                const dy = ball.y - defender.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                defender.vx = (dx / dist) * defender.getSpeed();
                defender.vy = (dy / dist) * defender.getSpeed();
            });
        }
    },
    '東北': {
        name: 'マンツーマン',
        behavior: 'man_to_man',
        assignments: [], // Populated at match start
        update: function(defenders, attackers) {
            defenders.forEach((defender, i) => {
                const target = attackers[this.assignments[i]];
                const dx = target.x - defender.x;
                const dy = target.y - defender.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 2) { // Maintain 2-unit distance
                    defender.vx = (dx / dist) * defender.getSpeed();
                    defender.vy = (dy / dist) * defender.getSpeed();
                }
            });
        }
    },
    '関東': {
        name: 'ゾーンディフェンス',
        behavior: 'zone',
        zones: [
            {x: 85, y: 40}, {x: 85, y: 50}, {x: 85, y: 60},
            {x: 90, y: 35}, {x: 90, y: 50}, {x: 90, y: 65},
            {x: 95, y: 50}
        ],
        update: function(defenders, ball) {
            defenders.forEach((defender, i) => {
                const zone = this.zones[i];
                const dx = zone.x - defender.x;
                const dy = zone.y - defender.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 1) {
                    defender.vx = (dx / dist) * defender.getSpeed() * 0.5;
                    defender.vy = (dy / dist) * defender.getSpeed() * 0.5;
                }
            });
        }
    }
    // Continue for other regions...
};
```

### 3.6 Tournament System (tournament.js)

```javascript
// Prefecture teams data
const PREFECTURES = [
    '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
    '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
    // ... all 47 prefectures
];

// Generate tournament bracket
function generateBracket() {
    const teams = PREFECTURES.map((pref, index) => ({
        id: index,
        name: pref === '奈良' ? 'ズッキュン中学' : `${pref}代表`,
        prefecture: pref,
        region: getRegion(pref),
        isSeeded: index < 17,  // First 17 teams are seeded
        stats: generateTeamStats(1), // Round 1 stats
        eliminated: false
    }));
    
    // Special case: Final boss
    teams[0].name = "てぇでぇ's学園";  // Replace first seeded team
    
    return shuffleBracket(teams);
}

// Simulate other matches
function simulateOtherMatches(round) {
    const matches = getCurrentRoundMatches(round);
    const results = [];
    
    matches.forEach(match => {
        if (match.team1.id === gameState.tournament.playerPosition || 
            match.team2.id === gameState.tournament.playerPosition) {
            return; // Skip player's match
        }
        
        // Simple probability based on stats
        const team1Power = Object.values(match.team1.stats).reduce((a, b) => a + b, 0);
        const team2Power = Object.values(match.team2.stats).reduce((a, b) => a + b, 0);
        const team1WinProb = team1Power / (team1Power + team2Power);
        
        const winner = Math.random() < team1WinProb ? match.team1 : match.team2;
        const loser = winner === match.team1 ? match.team2 : match.team1;
        
        loser.eliminated = true;
        results.push({
            winner: winner.name,
            loser: loser.name,
            score: `5-${Math.floor(Math.random() * 5)}`
        });
    });
    
    return results;
}
```

### 3.7 Mobile-Responsive CSS (style.css)

```css
/* Core mobile-first design */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f0f0f0;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
}

#game-container {
    width: 100%;
    height: 100%;
    position: relative;
    background-image: var(--bg-image, none);
    background-size: cover;
    background-position: center;
}

/* Court visualization */
.match-court {
    position: relative;
    width: 100%;
    max-width: 500px;
    height: 60vh;
    margin: 0 auto;
    background: linear-gradient(to bottom, #4a7c4e 0%, #5a8c5e 100%);
    border: 2px solid #fff;
    overflow: hidden;
}

.player-icon {
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #0066cc;
    border: 2px solid #fff;
    transform: translate(-50%, -50%);
    transition: all 0.1s linear;
    z-index: 10;
}

.player-icon.ace {
    width: 30px;
    height: 30px;
    background: #ff6600;
    box-shadow: 0 0 10px rgba(255, 102, 0, 0.5);
}

.player-icon.opponent {
    background: #cc0000;
}

/* Tactic planning UI */
.tactic-planner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    padding: 15px;
    border-top: 2px solid #333;
    max-height: 40vh;
    overflow-y: auto;
}

.action-button {
    padding: 10px 15px;
    margin: 5px;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 14px;
    font-weight: bold;
    touch-action: manipulation;
}

/* Responsive breakpoints */
@media (min-width: 768px) {
    .match-court {
        max-width: 700px;
        height: 70vh;
    }
    
    .action-button {
        font-size: 16px;
        padding: 12px 20px;
    }
}

@media (orientation: landscape) {
    .match-court {
        height: 80vh;
        max-width: 60vw;
    }
}
```

## 4. Critical Algorithms

### 4.1 Line Intersection Detection (for pass/shoot)
```javascript
function checkLineIntersection(x1, y1, x2, y2, defenders) {
    for (let defender of defenders) {
        const dist = pointToLineDistance(defender.x, defender.y, x1, y1, x2, y2);
        if (dist < 2) { // Within 2 units of line
            return defender;
        }
    }
    return null;
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}
```

### 4.2 Success Rate Calculation
```javascript
function calculateSuccessRate(attackerStat, defenderStat) {
    // Apply rest bonus if active
    if (gameState.team.restBonus) {
        attackerStat += 2;
    }
    
    // Basic formula: attacker / (attacker + defender) * 100
    const successRate = (attackerStat / (attackerStat + defenderStat)) * 100;
    
    // Clamp between 5% and 95%
    return Math.max(5, Math.min(95, successRate));
}
```

## 5. Testing Checklist

### Phase 1 Tests
- [ ] Game initializes with random stats (1-10)
- [ ] Captain personality and policy are randomly assigned
- [ ] LocalStorage save/load works
- [ ] Screen switching works smoothly

### Phase 2 Tests
- [ ] Training increases stats correctly
- [ ] Captain modifiers apply properly
- [ ] Boycott triggers on week 3 for パワハラ
- [ ] Friday rest option appears and works

### Phase 3 Tests
- [ ] Tournament bracket generates 47 teams
- [ ] Seeding works correctly (17 teams)
- [ ] Player advances through rounds
- [ ] Final boss is always てぇでぇ's学園

### Phase 4 Tests
- [ ] Match court renders correctly
- [ ] Players move at 30 FPS
- [ ] Pass/shoot line detection works
- [ ] Defense patterns behave correctly
- [ ] Score tracking and win conditions work

## 6. Error Handling

### Critical Error Points
1. **LocalStorage Quota**: Implement size check before saving
2. **Animation Performance**: Fallback to reduced FPS on slow devices
3. **Touch Events**: Ensure both mouse and touch events work
4. **State Corruption**: Validate gameState on load, reset if invalid

### Recovery Strategies
```javascript
// Wrap all critical operations
function safeExecute(fn, fallback) {
    try {
        return fn();
    } catch (error) {
        console.error('Error:', error);
        if (fallback) return fallback();
        showErrorModal('An error occurred. Please refresh the game.');
    }
}

// State validation
function validateGameState() {
    const required = ['currentWeek', 'team', 'captain', 'tournament'];
    for (let key of required) {
        if (!gameState[key]) return false;
    }
    if (gameState.currentWeek < 1 || gameState.currentWeek > 6) return false;
    if (!gameState.team.stats.pass || !gameState.team.stats.dribble || !gameState.team.stats.shoot) return false;
    return true;
}
```

## 7. Performance Optimization

### Mobile Performance
1. Use CSS transforms instead of position changes
2. Batch DOM updates
3. Use requestAnimationFrame for animations
4. Limit particle effects on low-end devices
5. Preload all assets during initialization

### Memory Management
```javascript
// Clear match data after completion
function cleanupMatch() {
    gameState.currentMatch = null;
    if (window.matchSimulator) {
        window.matchSimulator.destroy();
        window.matchSimulator = null;
    }
}

// Throttle expensive operations
const throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
};
```

## 8. Development Workflow

### Initial Setup
1. Create all files with basic structure
2. Set up HTML with viewport meta tag for mobile
3. Implement core game loop
4. Add basic CSS for mobile layout

### Incremental Testing
After implementing each module:
1. Test in Chrome DevTools mobile view
2. Test on actual mobile device
3. Check LocalStorage persistence
4. Verify no memory leaks

### Debug Mode
Add debug panel for development:
```javascript
const DEBUG = true; // Set to false for production

if (DEBUG) {
    window.debugPanel = {
        skipToWeek: (week) => { gameState.currentWeek = week; },
        setStats: (p, d, s) => { 
            gameState.team.stats = {pass: p, dribble: d, shoot: s};
        },
        winMatch: () => { gameState.currentMatch.playerScore = 5; },
        showState: () => console.log(gameState)
    };
}
```

## Final Notes

1. **Configuration First**: Create `config.js` from `settings_config.md` before any other file
2. **Start Simple**: Get basic game loop working before adding complexity
3. **Mobile First**: Test on mobile frequently during development
4. **Save Often**: Implement auto-save after every significant action
5. **User Feedback**: Add visual/haptic feedback for all interactions
6. **Progressive Enhancement**: Game should be playable even without all features

## Config.js Creation Example

Transform the `settings_config.md` into a JavaScript module:

```javascript
// config.js - Generated from settings_config.md
export const CONFIG = {
    // Story settings
    PLAYER_TEAM: {
        name: "ズッキュン中学",
        prefecture: "奈良",
        city: "奈良市",
        description: "全国大会初出場の公立中学校",
        uniformColor: "#0066cc"
    },
    
    FINAL_BOSS: {
        name: "てぇでぇ's学園",
        prefecture: "K航拿",
        description: "偏差値の超高い進学校",
        uniformColor: "#ff0000",
        guaranteedFinal: true
    },
    
    // Game configuration
    GAME: {
        POINTS_TO_WIN: 5,
        PLAYERS_PER_TEAM: 7,
        FPS: 30,
        TOTAL_TEAMS: 47,
        SEEDED_TEAMS: 17,
        TOTAL_WEEKS: 6,
        COURT_WIDTH: 100,
        COURT_HEIGHT: 100,
        GOAL_WIDTH: 7,
        CENTER_LINE: 50,
        STORAGE_KEY: "handballGame",
        AUTO_SAVE: true
    },
    
    // Add all other configurations from settings_config.md
    // ...
};
```

This document provides complete implementation guidance. Follow the phases sequentially, always reference CONFIG for values, test frequently, and the game will be successfully built.
