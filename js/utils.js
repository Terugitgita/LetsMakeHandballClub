// utils.js - Utility Functions

import { CONFIG } from './config.js';

// Random number generation
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min, max, decimals = 1) {
    const value = Math.random() * (max - min) + min;
    return parseFloat(value.toFixed(decimals));
}

// Random array element
export function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Clamp value between min and max
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Distance calculation
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Point to line distance
export function pointToLineDistance(px, py, x1, y1, x2, y2) {
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

// Normalize vector
export function normalize(vx, vy) {
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len === 0) return { x: 0, y: 0 };
    return { x: vx / len, y: vy / len };
}

// Format number with decimal places
export function formatNumber(value, decimals = 1) {
    return parseFloat(value.toFixed(decimals));
}

// Shuffle array (Fisher-Yates)
export function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Get region from prefecture
export function getRegion(prefecture) {
    return CONFIG.PREFECTURE_TO_REGION[prefecture] || "その他";
}

// Get team name from prefecture
export function getTeamName(prefecture) {
    if (CONFIG.TEAM_NAME_FORMAT.special[prefecture]) {
        return CONFIG.TEAM_NAME_FORMAT.special[prefecture];
    }
    return CONFIG.TEAM_NAME_FORMAT.default.replace("{prefecture}", prefecture);
}

// Deep clone object
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Safe division (avoid division by zero)
export function safeDivide(numerator, denominator, fallback = 0) {
    if (denominator === 0) return fallback;
    return numerator / denominator;
}

// Linear interpolation
export function lerp(start, end, t) {
    return start + (end - start) * t;
}

// Check if point is in goal area
export function isInGoalArea(x, y) {
    const goalY = CONFIG.GAME.COURT_HEIGHT - 5; // Goal line at y=95
    const goalLeft = (CONFIG.GAME.COURT_WIDTH - CONFIG.GAME.GOAL_WIDTH) / 2;
    const goalRight = goalLeft + CONFIG.GAME.GOAL_WIDTH;

    return y >= goalY && x >= goalLeft && x <= goalRight;
}

// Format time (seconds to MM:SS)
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Create element with class and text
export function createElement(tag, className = '', text = '') {
    const elem = document.createElement(tag);
    if (className) elem.className = className;
    if (text) elem.textContent = text;
    return elem;
}

// Create button with click handler
export function createButton(text, onClick, className = 'btn') {
    const button = createElement('button', className, text);
    button.addEventListener('click', onClick);
    return button;
}

// Wait for milliseconds (for async operations)
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if mobile device
export function isMobile() {
    return window.innerWidth <= CONFIG.SCREEN.MOBILE.maxWidth;
}

// Check if tablet device
export function isTablet() {
    const width = window.innerWidth;
    return width > CONFIG.SCREEN.MOBILE.maxWidth && width <= CONFIG.SCREEN.TABLET.maxWidth;
}

// Throttle function
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Safe localStorage operations
export function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
        return false;
    }
}

export function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
        return null;
    }
}

export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.error('Failed to remove from localStorage:', e);
        return false;
    }
}

// Get random stat value within range
export function generateRandomStat(min, max, allowFloat = true) {
    if (allowFloat) {
        return randomFloat(min, max, 1);
    }
    return randomInt(min, max);
}

// Calculate success rate using formula from config
export function calculateSuccessRate(attackStat, defenseStat, hasRestBonus = false) {
    return CONFIG.SUCCESS.calculate(attackStat, defenseStat, hasRestBonus);
}

// Check if action succeeds based on success rate
export function rollSuccess(successRate) {
    return Math.random() * 100 < successRate;
}
