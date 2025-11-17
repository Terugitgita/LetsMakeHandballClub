// training.js - Training System

import { CONFIG } from './config.js';
import { gameState, applyTraining, isBoycottActive, getCurrentDayInfo } from './gameState.js';
import { deepClone } from './utils.js';

// Get available training menus for current day
export function getAvailableMenus() {
    const currentDayName = getCurrentDayInfo().day;
    const menus = [];

    Object.keys(CONFIG.TRAINING).forEach(menuName => {
        const menu = CONFIG.TRAINING[menuName];
        if (menu.available.includes(currentDayName)) {
            menus.push({
                name: menuName,
                description: menu.description,
                effect: menu.effect,
                bonus: menu.bonus
            });
        }
    });

    return menus;
}

// Preview training growth
export function previewTrainingGrowth(menuName) {
    const menu = CONFIG.TRAINING[menuName];
    if (!menu) return null;

    // Handle rest menu
    if (menuName === "休養") {
        return {
            pass: `+${menu.bonus.all}（試合時）`,
            dribble: `+${menu.bonus.all}（試合時）`,
            shoot: `+${menu.bonus.all}（試合時）`
        };
    }

    // Handle total training (dynamically calculated)
    if (menuName === "総合練習") {
        // Check for アンポンタン special case
        const personality = CONFIG.CAPTAIN.PERSONALITY[gameState.captain.personality];
        if (personality.specialTraining && gameState.captain.personality === "アンポンタン") {
            const currentDay = getCurrentDayInfo().day;

            if (currentDay === "金") {
                // 金曜：7.0ずつ
                return {
                    pass: '+7.0',
                    dribble: '+7.0',
                    shoot: '+7.0'
                };
            } else {
                // 月〜木：0.0
                return {
                    pass: '+0.0',
                    dribble: '+0.0',
                    shoot: '+0.0'
                };
            }
        }

        // Find the highest single training value across all weekly training
        let maxValue = 0;

        if (gameState.team.weeklyTraining.length > 0) {
            // Use actual weekly training data
            gameState.team.weeklyTraining.forEach(training => {
                const values = Object.values(training);
                const max = Math.max(...values);
                if (max > maxValue) {
                    maxValue = max;
                }
            });
        } else {
            // No training this week - calculate potential max from available trainings
            // Calculate what each training would give
            const trainings = ['パス練習', 'ドリブル練習', 'シュート練習'];
            trainings.forEach(trainingName => {
                const preview = previewTrainingGrowth(trainingName);
                if (preview) {
                    const values = [
                        parseFloat(preview.pass.replace('+', '')) || 0,
                        parseFloat(preview.dribble.replace('+', '')) || 0,
                        parseFloat(preview.shoot.replace('+', '')) || 0
                    ];
                    const max = Math.max(...values);
                    if (max > maxValue) {
                        maxValue = max;
                    }
                }
            });
        }

        // Divide by 3 and floor to 1 decimal place
        const baseValue = maxValue / 3;
        const equalValue = Math.floor(baseValue * 10) / 10;

        // Calculate remainder
        const totalEqual = equalValue * 3;
        const remainder = Math.round((maxValue - totalEqual) * 10) / 10;

        // Determine which stat gets the remainder based on captain policy
        const policy = CONFIG.CAPTAIN.POLICY[gameState.captain.policy];
        let bonusStat = 'pass'; // default

        if (policy.focusLowest) {
            const stats = gameState.team.stats;
            bonusStat = Object.keys(stats).reduce((a, b) =>
                stats[a] < stats[b] ? a : b
            );
        } else if (policy.statModifier) {
            const modifiers = policy.statModifier;
            bonusStat = Object.keys(modifiers).reduce((a, b) =>
                modifiers[a] > modifiers[b] ? a : b
            );
        }

        // Build preview with remainder allocated
        const preview = {
            pass: equalValue,
            dribble: equalValue,
            shoot: equalValue
        };

        if (remainder > 0) {
            preview[bonusStat] += remainder;
        }

        return {
            pass: preview.pass > 0 ? `+${preview.pass.toFixed(1)}` : '+0.0',
            dribble: preview.dribble > 0 ? `+${preview.dribble.toFixed(1)}` : '+0.0',
            shoot: preview.shoot > 0 ? `+${preview.shoot.toFixed(1)}` : '+0.0'
        };
    }

    // Calculate growth with modifiers
    let growth = deepClone(menu.effect);

    // Apply personality modifier
    const personality = CONFIG.CAPTAIN.PERSONALITY[gameState.captain.personality];
    let personalityMod = personality.growthMultiplier;

    // Check boycott
    if (personality.boycottWeek && gameState.currentWeek >= personality.boycottWeek) {
        personalityMod = personality.boycottEffect;
    }

    // アンポンタン special training effect
    if (personality.specialTraining && gameState.captain.personality === "アンポンタン") {
        const currentDay = getCurrentDayInfo().day;

        if (currentDay === "金") {
            // 金曜：21倍効果
            personalityMod = 21;
        } else {
            // 月〜木：0.1倍効果
            personalityMod = 0.1;
        }
    }

    growth.pass *= personalityMod;
    growth.dribble *= personalityMod;
    growth.shoot *= personalityMod;

    // Apply policy modifier
    const policy = CONFIG.CAPTAIN.POLICY[gameState.captain.policy];

    if (policy.focusLowest) {
        // Find lowest stat
        const stats = gameState.team.stats;
        const lowestStat = Object.keys(stats).reduce((a, b) =>
            stats[a] < stats[b] ? a : b
        );
        growth[lowestStat] *= policy.multiplier;
    } else if (policy.statModifier) {
        growth.pass *= policy.statModifier.pass;
        growth.dribble *= policy.statModifier.dribble;
        growth.shoot *= policy.statModifier.shoot;
    }

    // Format for display
    return {
        pass: growth.pass > 0 ? `+${growth.pass.toFixed(1)}` : '±0',
        dribble: growth.dribble > 0 ? `+${growth.dribble.toFixed(1)}` : '±0',
        shoot: growth.shoot > 0 ? `+${growth.shoot.toFixed(1)}` : '±0'
    };
}

// Execute training
export function executeTraining(menuName) {
    // Check if boycott active
    if (isBoycottActive() && menuName !== "休養") {
        return {
            success: false,
            message: CONFIG.MESSAGES.TRAINING.boycott
        };
    }

    // Apply training
    const success = applyTraining(menuName);

    if (success) {
        if (menuName === "休養") {
            return {
                success: true,
                message: CONFIG.MESSAGES.TRAINING.restBonus,
                stats: gameState.team.stats
            };
        } else {
            return {
                success: true,
                message: CONFIG.MESSAGES.TRAINING.growth,
                stats: gameState.team.stats
            };
        }
    }

    return {
        success: false,
        message: "練習を実行できませんでした"
    };
}

// Get captain info
export function getCaptainInfo() {
    const personality = gameState.captain.personality;
    const policy = gameState.captain.policy;

    const personalityInfo = CONFIG.CAPTAIN.PERSONALITY[personality];
    const policyInfo = CONFIG.CAPTAIN.POLICY[policy];

    // Check if boycott warning should be shown
    const boycottWarning = personalityInfo.boycottWeek &&
        gameState.currentWeek === personalityInfo.boycottWeek - 1;

    return {
        personality: {
            name: personality,
            description: personalityInfo.description,
            multiplier: personalityInfo.growthMultiplier,
            boycottWarning: boycottWarning
        },
        policy: {
            name: policy,
            description: policyInfo.description
        }
    };
}

// Get training history (if needed for UI)
export function getTrainingHistory() {
    // Could be implemented to track which trainings were done each week
    // For now, just return basic info
    return {
        week: gameState.currentWeek,
        day: gameState.currentDay,
        boycottActive: isBoycottActive()
    };
}

// Check if training is available today
export function canTrainToday() {
    const dayInfo = getCurrentDayInfo();
    return dayInfo.type === "training";
}

// Get recommended training based on stats
export function getRecommendedTraining() {
    const stats = gameState.team.stats;

    // Find lowest stat
    const lowestStat = Object.keys(stats).reduce((a, b) =>
        stats[a] < stats[b] ? a : b
    );

    // Map stat to training menu
    const statToMenu = {
        pass: "パス練習",
        dribble: "ドリブル練習",
        shoot: "シュート練習"
    };

    return statToMenu[lowestStat] || "総合練習";
}

// Get training effect multiplier display
export function getTrainingMultiplierInfo() {
    const personality = CONFIG.CAPTAIN.PERSONALITY[gameState.captain.personality];
    let multiplier = personality.growthMultiplier;

    if (personality.boycottWeek && gameState.currentWeek >= personality.boycottWeek) {
        multiplier = personality.boycottEffect;
    }

    return {
        multiplier: multiplier,
        isBoycott: multiplier === 0,
        personalityName: gameState.captain.personality
    };
}
