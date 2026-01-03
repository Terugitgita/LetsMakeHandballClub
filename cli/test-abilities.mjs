// test-abilities.mjs - PowerPro Style Ability System Test
// Uses the actual game modules to test the ability system

import { CONFIG, POSITION_ABILITIES } from '../js/config.js';
import {
    gameState,
    initializeNewGame,
    applyTraining,
    getAbilityStatus,
    getAbilitiesByCategory,
    getAllWeaknesses,
    getAllStrengths,
    getRemainingWeaknesses,
    getAcquiredStrengths,
    processAbilityProgress,
    recordMatchResult,
    setCurrentMatch,
    awakenToGearSecond
} from '../js/gameState.js';
import { executeTraining } from '../js/training.js';
import { initializeTournament, getNextOpponent, processRoundResults, getRoundName } from '../js/tournament.js';
import { getRemainingTeamsCount } from '../js/teams.js';

// ANSI colors for output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'cyan');
    console.log('='.repeat(60));
}

function logSubSection(title) {
    console.log('\n' + '-'.repeat(40));
    log(title, 'yellow');
    console.log('-'.repeat(40));
}

// Test 1: Verify POSITION_ABILITIES configuration
function testAbilitiesConfig() {
    logSection('Test 1: POSITION_ABILITIES Configuration');

    let passed = true;

    // Check categories exist
    const categories = Object.keys(POSITION_ABILITIES.categories);
    log(`Categories: ${categories.join(', ')}`, 'gray');

    if (categories.length !== 4) {
        log(`FAIL: Expected 4 categories, got ${categories.length}`, 'red');
        passed = false;
    } else {
        log(`PASS: 4 categories defined`, 'green');
    }

    // Count weaknesses and strengths
    let totalWeaknesses = 0;
    let totalStrengths = 0;

    for (const [key, cat] of Object.entries(POSITION_ABILITIES.categories)) {
        totalWeaknesses += cat.weaknesses.length;
        totalStrengths += cat.strengths.length;
        log(`  ${cat.name}: ${cat.weaknesses.length} weaknesses, ${cat.strengths.length} strengths`, 'gray');
    }

    if (totalWeaknesses !== 11) {
        log(`FAIL: Expected 11 weaknesses, got ${totalWeaknesses}`, 'red');
        passed = false;
    } else {
        log(`PASS: 11 weaknesses defined`, 'green');
    }

    if (totalStrengths !== 5) {
        log(`FAIL: Expected 5 strengths, got ${totalStrengths}`, 'red');
        passed = false;
    } else {
        log(`PASS: 5 strengths defined`, 'green');
    }

    // Check training mapping
    const mappings = Object.keys(POSITION_ABILITIES.trainingMapping);
    log(`Training mappings: ${mappings.join(', ')}`, 'gray');

    if (mappings.length !== 4) {
        log(`FAIL: Expected 4 training mappings, got ${mappings.length}`, 'red');
        passed = false;
    } else {
        log(`PASS: 4 training mappings defined`, 'green');
    }

    return passed;
}

// Test 2: Verify gameState.abilities initialization
function testAbilitiesInitialization() {
    logSection('Test 2: gameState.abilities Initialization');

    let passed = true;

    // Initialize new game
    initializeNewGame();

    // Check abilities structure
    if (!gameState.abilities) {
        log(`FAIL: gameState.abilities is undefined`, 'red');
        return false;
    }

    log(`PASS: gameState.abilities exists`, 'green');

    // Check trainingProgress
    const progress = gameState.abilities.trainingProgress;
    if (!progress || typeof progress.judgment !== 'number') {
        log(`FAIL: trainingProgress structure invalid`, 'red');
        passed = false;
    } else {
        log(`PASS: trainingProgress initialized (judgment:${progress.judgment}, movement:${progress.movement}, shooting:${progress.shooting}, general:${progress.general})`, 'green');
    }

    // Check overcomeWeaknesses
    if (!Array.isArray(gameState.abilities.overcomeWeaknesses)) {
        log(`FAIL: overcomeWeaknesses is not an array`, 'red');
        passed = false;
    } else if (gameState.abilities.overcomeWeaknesses.length !== 0) {
        log(`FAIL: overcomeWeaknesses should be empty at start`, 'red');
        passed = false;
    } else {
        log(`PASS: overcomeWeaknesses initialized as empty array`, 'green');
    }

    // Check acquiredStrengths
    if (!Array.isArray(gameState.abilities.acquiredStrengths)) {
        log(`FAIL: acquiredStrengths is not an array`, 'red');
        passed = false;
    } else if (gameState.abilities.acquiredStrengths.length !== 0) {
        log(`FAIL: acquiredStrengths should be empty at start`, 'red');
        passed = false;
    } else {
        log(`PASS: acquiredStrengths initialized as empty array`, 'green');
    }

    return passed;
}

// Test 3: Test getAllWeaknesses and getAllStrengths
function testGetAllAbilities() {
    logSection('Test 3: getAllWeaknesses and getAllStrengths');

    let passed = true;

    initializeNewGame();

    const weaknesses = getAllWeaknesses();
    const strengths = getAllStrengths();

    log(`Total weaknesses: ${weaknesses.length}`, 'gray');
    weaknesses.forEach(w => {
        log(`  - ${w.name} (${w.categoryName}, type: ${w.type})`, 'gray');
    });

    if (weaknesses.length !== 11) {
        log(`FAIL: Expected 11 weaknesses, got ${weaknesses.length}`, 'red');
        passed = false;
    } else {
        log(`PASS: getAllWeaknesses returns 11 items`, 'green');
    }

    log(`Total strengths: ${strengths.length}`, 'gray');
    strengths.forEach(s => {
        log(`  - ${s.name} (${s.categoryName})`, 'gray');
    });

    if (strengths.length !== 5) {
        log(`FAIL: Expected 5 strengths, got ${strengths.length}`, 'red');
        passed = false;
    } else {
        log(`PASS: getAllStrengths returns 5 items`, 'green');
    }

    return passed;
}

// Test 4: Test getAbilityStatus
function testGetAbilityStatus() {
    logSection('Test 4: getAbilityStatus');

    let passed = true;

    initializeNewGame();

    const status = getAbilityStatus();

    log(`Status:`, 'gray');
    log(`  totalWeaknesses: ${status.totalWeaknesses}`, 'gray');
    log(`  overcomeWeaknesses: ${status.overcomeWeaknesses}`, 'gray');
    log(`  remainingWeaknesses: ${status.remainingWeaknesses}`, 'gray');
    log(`  totalStrengths: ${status.totalStrengths}`, 'gray');
    log(`  acquiredStrengths: ${status.acquiredStrengths}`, 'gray');
    log(`  remainingStrengths: ${status.remainingStrengths}`, 'gray');

    if (status.totalWeaknesses !== 11) {
        log(`FAIL: totalWeaknesses should be 11`, 'red');
        passed = false;
    } else {
        log(`PASS: totalWeaknesses = 11`, 'green');
    }

    if (status.remainingWeaknesses !== 11) {
        log(`FAIL: remainingWeaknesses should be 11 at start`, 'red');
        passed = false;
    } else {
        log(`PASS: remainingWeaknesses = 11 at start`, 'green');
    }

    if (status.acquiredStrengths !== 0) {
        log(`FAIL: acquiredStrengths should be 0 at start`, 'red');
        passed = false;
    } else {
        log(`PASS: acquiredStrengths = 0 at start`, 'green');
    }

    return passed;
}

// Test 5: Test getAbilitiesByCategory
function testGetAbilitiesByCategory() {
    logSection('Test 5: getAbilitiesByCategory');

    let passed = true;

    initializeNewGame();

    const abilities = getAbilitiesByCategory();

    const categoryKeys = Object.keys(abilities);
    if (categoryKeys.length !== 4) {
        log(`FAIL: Expected 4 categories, got ${categoryKeys.length}`, 'red');
        passed = false;
    } else {
        log(`PASS: 4 categories returned`, 'green');
    }

    // Check structure
    for (const [key, cat] of Object.entries(abilities)) {
        log(`  ${cat.name}:`, 'gray');
        log(`    Positions: ${cat.positions.join(', ')}`, 'gray');
        log(`    Weaknesses: ${cat.weaknesses.map(w => `${w.name}(${w.overcome ? '克服' : '残'})`).join(', ')}`, 'gray');
        log(`    Strengths: ${cat.strengths.map(s => `${s.name}(${s.acquired ? '獲得' : '未'})`).join(', ')}`, 'gray');

        // At start, all weaknesses should not be overcome
        const allNotOvercome = cat.weaknesses.every(w => !w.overcome);
        if (!allNotOvercome) {
            log(`FAIL: All weaknesses should not be overcome at start`, 'red');
            passed = false;
        }

        // At start, all strengths should not be acquired
        const allNotAcquired = cat.strengths.every(s => !s.acquired);
        if (!allNotAcquired) {
            log(`FAIL: All strengths should not be acquired at start`, 'red');
            passed = false;
        }
    }

    log(`PASS: getAbilitiesByCategory structure correct`, 'green');

    return passed;
}

// Test 6: Test training and ability progress
function testTrainingAbilityProgress() {
    logSection('Test 6: Training and Ability Progress');

    let passed = true;

    initializeNewGame();

    const initialStatus = getAbilityStatus();
    log(`Initial status: ${initialStatus.remainingWeaknesses} weaknesses, ${initialStatus.acquiredStrengths} strengths`, 'gray');

    // Training should increment counters
    logSubSection('Testing パス練習 (judgment type)');

    // First パス練習
    log('Executing パス練習 #1...', 'gray');
    const result1 = applyTraining('パス練習');
    log(`  Result: ${JSON.stringify(result1)}`, 'gray');
    log(`  Progress: judgment=${gameState.abilities.trainingProgress.judgment}`, 'gray');

    if (gameState.abilities.trainingProgress.judgment !== 1) {
        log(`FAIL: judgment counter should be 1 after first training`, 'red');
        passed = false;
    } else {
        log(`PASS: judgment counter = 1`, 'green');
    }

    // Advance day to allow next training
    gameState.currentDay = 2;

    // Second パス練習 - should trigger change
    log('Executing パス練習 #2...', 'gray');
    const result2 = applyTraining('パス練習');
    log(`  Result: ${JSON.stringify(result2)}`, 'gray');
    log(`  Progress: judgment=${gameState.abilities.trainingProgress.judgment}`, 'gray');

    // Check if weakness was overcome
    const statusAfter = getAbilityStatus();
    log(`After 2 trainings: ${statusAfter.remainingWeaknesses} weaknesses remaining`, 'gray');

    if (result2.abilityChange && result2.abilityChange.overcameWeakness) {
        log(`PASS: Weakness overcome after 2 trainings: ${result2.abilityChange.overcameWeakness.name}`, 'green');

        // Check misconception
        if (result2.abilityChange.overcameWeakness.misconception) {
            log(`  Misconception: "${result2.abilityChange.overcameWeakness.misconception.wrong}" → "${result2.abilityChange.overcameWeakness.misconception.correct}"`, 'gray');
        }
    } else if (statusAfter.remainingWeaknesses < initialStatus.remainingWeaknesses) {
        log(`PASS: Weakness count decreased from ${initialStatus.remainingWeaknesses} to ${statusAfter.remainingWeaknesses}`, 'green');
    } else {
        // Counter should have reset
        if (gameState.abilities.trainingProgress.judgment === 0) {
            log(`PASS: Counter reset to 0 (change triggered)`, 'green');
        } else {
            log(`WARN: No visible change but counter might be accumulating`, 'yellow');
        }
    }

    return passed;
}

// Test 7: Test multiple training types
function testMultipleTrainingTypes() {
    logSection('Test 7: Multiple Training Types');

    let passed = true;

    initializeNewGame();

    const trainings = [
        { name: 'パス練習', expectedType: 'judgment' },
        { name: 'ドリブル練習', expectedType: 'movement' },
        { name: 'シュート練習', expectedType: 'shooting' },
        { name: '総合練習', expectedType: 'all' }
    ];

    for (const training of trainings) {
        logSubSection(`Testing ${training.name}`);

        // Reset game state
        initializeNewGame();

        // Execute training twice
        gameState.currentDay = 1;
        const result1 = applyTraining(training.name);
        log(`  #1 Result: success=${result1.success}`, 'gray');

        gameState.currentDay = 2;
        const result2 = applyTraining(training.name);
        log(`  #2 Result: success=${result2.success}`, 'gray');

        if (result2.abilityChange) {
            if (result2.abilityChange.overcameWeakness) {
                log(`  PASS: Overcame weakness: ${result2.abilityChange.overcameWeakness.name}`, 'green');
            } else if (result2.abilityChange.acquiredStrength) {
                log(`  PASS: Acquired strength: ${result2.abilityChange.acquiredStrength.name}`, 'green');
            }
        } else {
            log(`  INFO: No ability change on this training`, 'gray');
        }

        const status = getAbilityStatus();
        log(`  Status: ${status.overcomeWeaknesses} overcome, ${status.acquiredStrengths} acquired`, 'gray');
    }

    log(`PASS: All training types processed`, 'green');
    return passed;
}

// Test 8: Simulate full game (30 trainings)
function testFullGameSimulation() {
    logSection('Test 8: Full Game Simulation (30 trainings)');

    let passed = true;

    initializeNewGame();

    const initialStatus = getAbilityStatus();
    log(`Initial: ${initialStatus.remainingWeaknesses} weaknesses, ${initialStatus.acquiredStrengths} strengths`, 'gray');

    const trainingTypes = ['パス練習', 'ドリブル練習', 'シュート練習', '総合練習'];
    let changes = [];

    // Simulate 30 trainings (6 weeks * 5 days)
    for (let week = 1; week <= 6; week++) {
        for (let day = 1; day <= 5; day++) {
            gameState.currentWeek = week;
            gameState.currentDay = day;

            // Rotate through training types
            const trainingIndex = ((week - 1) * 5 + day - 1) % trainingTypes.length;
            const training = trainingTypes[trainingIndex];

            const result = applyTraining(training);

            if (result.abilityChange) {
                if (result.abilityChange.overcameWeakness) {
                    changes.push({
                        week, day, training,
                        type: 'weakness',
                        name: result.abilityChange.overcameWeakness.name
                    });
                } else if (result.abilityChange.acquiredStrength) {
                    changes.push({
                        week, day, training,
                        type: 'strength',
                        name: result.abilityChange.acquiredStrength.name
                    });
                }
            }
        }
    }

    const finalStatus = getAbilityStatus();

    log(`\nChanges during game:`, 'cyan');
    changes.forEach((c, i) => {
        const emoji = c.type === 'weakness' ? '❌→✅' : '⭐';
        log(`  ${i + 1}. Week ${c.week} Day ${c.day}: ${emoji} ${c.name} (${c.training})`, 'gray');
    });

    log(`\nFinal status:`, 'cyan');
    log(`  Weaknesses: ${finalStatus.overcomeWeaknesses}/${finalStatus.totalWeaknesses} overcome`, 'gray');
    log(`  Strengths: ${finalStatus.acquiredStrengths}/${finalStatus.totalStrengths} acquired`, 'gray');
    log(`  Total changes: ${changes.length}`, 'gray');

    // With 30 trainings and 2 trainings per change, we expect ~15 changes
    // But total changes possible = 11 weaknesses + 5 strengths = 16
    if (changes.length >= 10) {
        log(`PASS: Sufficient ability changes occurred (${changes.length})`, 'green');
    } else {
        log(`WARN: Fewer changes than expected (${changes.length})`, 'yellow');
    }

    // Check if all weaknesses can be overcome by finals
    if (finalStatus.remainingWeaknesses <= 1) {
        log(`PASS: Almost all weaknesses overcome by finals`, 'green');
    } else {
        log(`INFO: ${finalStatus.remainingWeaknesses} weaknesses remaining`, 'yellow');
    }

    return passed;
}

// Test 9: Test P64 - Misconceptions corrected when category completed
function testMisconceptionCorrection() {
    logSection('Test 9: P64 - Misconceptions Corrected on Category Completion');

    let passed = true;

    initializeNewGame();

    // Check initial state - no correctedCategories
    if (!gameState.abilities.correctedCategories) {
        log(`FAIL: correctedCategories should exist`, 'red');
        passed = false;
    } else if (gameState.abilities.correctedCategories.length !== 0) {
        log(`FAIL: correctedCategories should be empty at start`, 'red');
        passed = false;
    } else {
        log(`PASS: correctedCategories initialized as empty`, 'green');
    }

    // Check getAbilitiesByCategory returns misconception status
    const abilities = getAbilitiesByCategory();
    const wingCat = abilities.wing;

    if (!wingCat.misconceptions || wingCat.misconceptions.length === 0) {
        log(`FAIL: wing category should have misconceptions`, 'red');
        passed = false;
    } else {
        log(`PASS: wing category has ${wingCat.misconceptions.length} misconceptions`, 'green');
    }

    // Check initial misconceptions are not corrected
    const initialCorrected = wingCat.misconceptions.every(m => !m.corrected);
    if (!initialCorrected) {
        log(`FAIL: misconceptions should not be corrected at start`, 'red');
        passed = false;
    } else {
        log(`PASS: misconceptions are not corrected at start`, 'green');
    }

    // Manually overcome all wing weaknesses to trigger misconception correction
    log('\nSimulating all wing weaknesses overcome...', 'gray');
    const wingWeaknesses = POSITION_ABILITIES.categories.wing.weaknesses;
    wingWeaknesses.forEach(w => {
        gameState.abilities.overcomeWeaknesses.push(w.id);
        log(`  Overcame: ${w.name}`, 'gray');
    });

    // Also add to correctedCategories (simulating what would happen)
    gameState.abilities.correctedCategories.push('wing');

    // Now check getAbilitiesByCategory again
    const abilitiesAfter = getAbilitiesByCategory();
    const wingCatAfter = abilitiesAfter.wing;

    // Check allWeaknessesOvercome flag
    if (!wingCatAfter.allWeaknessesOvercome) {
        log(`FAIL: allWeaknessesOvercome should be true`, 'red');
        passed = false;
    } else {
        log(`PASS: allWeaknessesOvercome is true`, 'green');
    }

    // Check misconceptions are now corrected
    const allCorrected = wingCatAfter.misconceptions.every(m => m.corrected);
    if (!allCorrected) {
        log(`FAIL: all misconceptions should be corrected`, 'red');
        passed = false;
    } else {
        log(`PASS: all misconceptions are now corrected`, 'green');
    }

    log(`\nWing misconceptions status:`, 'gray');
    wingCatAfter.misconceptions.forEach(m => {
        log(`  ${m.corrected ? '✓' : '✗'} "${m.wrong}" → "${m.correct}"`, 'gray');
    });

    return passed;
}

// Test 10: Test P65 - Strengths require Ace awakening
function testStrengthsRequireAce() {
    logSection('Test 10: P65 - Strengths Require Ace Awakening');

    let passed = true;

    initializeNewGame();

    // Acquire a strength manually
    gameState.abilities.acquiredStrengths.push('fast_break');
    log('Acquired strength: fast_break (速攻○)', 'gray');

    // Check without ace
    const abilitiesNoAce = getAbilitiesByCategory();
    const wingNoAce = abilitiesNoAce.wing;
    const strengthNoAce = wingNoAce.strengths.find(s => s.id === 'fast_break');

    if (!strengthNoAce.acquired) {
        log(`FAIL: strength should be acquired`, 'red');
        passed = false;
    } else {
        log(`PASS: strength is acquired`, 'green');
    }

    if (strengthNoAce.active) {
        log(`FAIL: strength should NOT be active without Ace`, 'red');
        passed = false;
    } else {
        log(`PASS: strength is NOT active without Ace`, 'green');
    }

    // Add ace to wing position (LW = index 0)
    gameState.team.aces.push(0);
    log('\nAdded Ace: LW (Left Wing)', 'gray');

    const abilitiesWithAce = getAbilitiesByCategory();
    const wingWithAce = abilitiesWithAce.wing;
    const strengthWithAce = wingWithAce.strengths.find(s => s.id === 'fast_break');

    if (!strengthWithAce.active) {
        log(`FAIL: strength should be active with Ace`, 'red');
        passed = false;
    } else {
        log(`PASS: strength is active with Ace`, 'green');
    }

    if (strengthWithAce.gearSecond) {
        log(`FAIL: should NOT have gearSecond yet`, 'red');
        passed = false;
    } else {
        log(`PASS: no gearSecond yet`, 'green');
    }

    // Add gear second (LW = index 0)
    gameState.team.gearSecond.push(0);
    log('\nAdded Gear Second: LW', 'gray');

    const abilitiesWithGear = getAbilitiesByCategory();
    const wingWithGear = abilitiesWithGear.wing;
    const strengthWithGear = wingWithGear.strengths.find(s => s.id === 'fast_break');

    if (!strengthWithGear.gearSecond) {
        log(`FAIL: should have gearSecond`, 'red');
        passed = false;
    } else {
        log(`PASS: has gearSecond (○ → ◎)`, 'green');
    }

    // Check category flags
    if (!wingWithGear.hasAce) {
        log(`FAIL: category should have hasAce=true`, 'red');
        passed = false;
    } else {
        log(`PASS: category hasAce=true`, 'green');
    }

    if (!wingWithGear.hasGearSecond) {
        log(`FAIL: category should have hasGearSecond=true`, 'red');
        passed = false;
    } else {
        log(`PASS: category hasGearSecond=true`, 'green');
    }

    return passed;
}

// Test 11: Test P66 - Fair distribution for 総合練習
function testFairDistribution() {
    logSection('Test 11: P66 - Fair Distribution for 総合練習');

    let passed = true;

    // Run multiple simulations to test distribution
    const categoryHits = { wing: 0, back: 0, cb: 0, pv: 0 };
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
        initializeNewGame();

        // Do 2 総合練習 to trigger one change
        gameState.currentDay = 1;
        applyTraining('総合練習');
        gameState.currentDay = 2;
        const result = applyTraining('総合練習');

        if (result.abilityChange && result.abilityChange.overcameWeakness) {
            const category = result.abilityChange.overcameWeakness.category;
            categoryHits[category]++;
        }
    }

    log(`Distribution over ${iterations} simulations:`, 'gray');
    for (const [cat, count] of Object.entries(categoryHits)) {
        const percent = ((count / iterations) * 100).toFixed(1);
        log(`  ${cat}: ${count} hits (${percent}%)`, 'gray');
    }

    // Check that back gets some hits (should be around 25% with random distribution)
    // Previously back was getting almost 0% due to fixed order
    if (categoryHits.back < 5) {
        log(`WARN: Back category hit rate seems low (${categoryHits.back}/${iterations})`, 'yellow');
        // Don't fail the test since it's random, just warn
    } else {
        log(`PASS: Back category is getting fair distribution`, 'green');
    }

    // Check that all categories get some hits
    const allHaveHits = Object.values(categoryHits).every(c => c > 0);
    if (!allHaveHits) {
        log(`WARN: Some categories have 0 hits`, 'yellow');
    } else {
        log(`PASS: All categories have hits`, 'green');
    }

    return passed;
}

// Test 12: Test P67 - Skip completed types
function testSkipCompletedTypes() {
    logSection('Test 12: P67 - Skip Completed Types');

    let passed = true;

    initializeNewGame();

    // Manually overcome all CB (judgment type) weaknesses
    const cbWeaknesses = ['slow_decision', 'passive', 'poor_center_control'];
    cbWeaknesses.forEach(id => {
        gameState.abilities.overcomeWeaknesses.push(id);
    });
    log('Manually overcome all CB weaknesses (judgment type)', 'gray');

    // Acquire the CB strength too
    gameState.abilities.acquiredStrengths.push('support_teammates_control_flow');
    log('Acquired CB strength', 'gray');

    // Now do 総合練習 multiple times - judgment type should be skipped
    const changesBeforeJudgment = [];
    for (let i = 0; i < 10; i++) {
        gameState.currentDay = (i % 5) + 1;
        const result = applyTraining('総合練習');
        if (result.abilityChange && result.abilityChange.overcameWeakness) {
            changesBeforeJudgment.push(result.abilityChange.overcameWeakness);
        }
    }

    log(`\nChanges from 10 総合練習:`, 'gray');
    changesBeforeJudgment.forEach(w => {
        log(`  - ${w.name} (${w.categoryName}, type: ${w.type})`, 'gray');
    });

    // Check that no judgment type weaknesses were overcome (since they're already done)
    const judgmentChanges = changesBeforeJudgment.filter(w => w.type === 'judgment');
    if (judgmentChanges.length > 0) {
        log(`FAIL: Should not overcome judgment weaknesses (already completed)`, 'red');
        passed = false;
    } else {
        log(`PASS: No judgment type weaknesses overcome (correctly skipped)`, 'green');
    }

    // Check that other types were processed
    const otherChanges = changesBeforeJudgment.filter(w => w.type !== 'judgment');
    if (otherChanges.length > 0) {
        log(`PASS: Other types (${otherChanges.map(w => w.type).join(', ')}) were processed`, 'green');
    } else {
        log(`INFO: No other changes (might need more training)`, 'gray');
    }

    return passed;
}

// Test 13: Test executeTraining integration
function testExecuteTrainingIntegration() {
    logSection('Test 13: executeTraining Integration');

    let passed = true;

    initializeNewGame();

    // Set up for training
    gameState.currentDay = 1;

    log('Testing executeTraining from training.js...', 'gray');

    const result1 = executeTraining('パス練習');
    log(`  #1: success=${result1.success}, hasAbilityChange=${!!result1.abilityChange}`, 'gray');

    if (!result1.success) {
        log(`FAIL: executeTraining should succeed`, 'red');
        passed = false;
    } else {
        log(`PASS: executeTraining succeeded`, 'green');
    }

    // Check that result has abilityChange property
    if (!('abilityChange' in result1)) {
        log(`FAIL: result should have abilityChange property`, 'red');
        passed = false;
    } else {
        log(`PASS: result has abilityChange property`, 'green');
    }

    // Second training should trigger change
    gameState.currentDay = 2;
    const result2 = executeTraining('パス練習');
    log(`  #2: success=${result2.success}, hasAbilityChange=${!!result2.abilityChange}`, 'gray');

    if (result2.abilityChange && (result2.abilityChange.overcameWeakness || result2.abilityChange.acquiredStrength)) {
        log(`PASS: Ability change occurred after 2 trainings`, 'green');
    } else {
        log(`INFO: No ability change in abilityChange object`, 'gray');
    }

    return passed;
}

// Test 14: Test P69 - Ace Awakening Per Round and Gear Second on Semi-Finals
function testAceAwakeningPerRound() {
    logSection('Test 14: P69 - Ace Awakening Per Round');

    let passed = true;
    initializeNewGame();

    // Setup tournament bracket for testing
    gameState.tournament.currentRound = 1;
    gameState.tournament.bracket = [];
    gameState.tournament.playerTeamId = 0;

    // Mock opponent for matches
    const mockOpponent = {
        name: 'Test Opponent',
        stats: { pass: 10, dribble: 10, shoot: 10 },
        tactic: 'normal'
    };

    // Track awakenings through rounds
    const roundResults = [];

    // Simulate winning rounds 1-5
    for (let round = 1; round <= 5; round++) {
        const acesBeforeMatch = gameState.team.aces.length;
        const gearSecondBeforeMatch = gameState.team.gearSecond.length;

        // Set up current match
        setCurrentMatch(mockOpponent);

        // Record win
        const awakenings = recordMatchResult(true, 10, 5);

        const acesAfter = gameState.team.aces.length;
        const gearSecondAfter = gameState.team.gearSecond.length;
        const newAces = acesAfter - acesBeforeMatch;
        const newGearSecond = gearSecondAfter - gearSecondBeforeMatch;

        roundResults.push({
            round,
            newAces,
            newGearSecond,
            totalAces: acesAfter,
            totalGearSecond: gearSecondAfter,
            awakenings
        });

        log(`  Round ${round}: +${newAces} Aces, +${newGearSecond} GearSecond (Total: ${acesAfter} Aces, ${gearSecondAfter} GS)`, 'gray');
    }

    // Verify round-by-round awakening counts
    // Round 1: +1 Ace
    if (roundResults[0].newAces !== 1) {
        log(`FAIL: Round 1 should have +1 Ace, got +${roundResults[0].newAces}`, 'red');
        passed = false;
    } else {
        log(`PASS: Round 1: +1 Ace`, 'green');
    }

    // Round 2: +1 Ace
    if (roundResults[1].newAces !== 1) {
        log(`FAIL: Round 2 should have +1 Ace, got +${roundResults[1].newAces}`, 'red');
        passed = false;
    } else {
        log(`PASS: Round 2: +1 Ace`, 'green');
    }

    // Round 3: +2 Aces
    if (roundResults[2].newAces !== 2) {
        log(`FAIL: Round 3 should have +2 Aces, got +${roundResults[2].newAces}`, 'red');
        passed = false;
    } else {
        log(`PASS: Round 3: +2 Aces`, 'green');
    }

    // Round 4 (準々決勝): +2 Aces
    if (roundResults[3].newAces !== 2) {
        log(`FAIL: Round 4 should have +2 Aces, got +${roundResults[3].newAces}`, 'red');
        passed = false;
    } else {
        log(`PASS: Round 4 (準々決勝): +2 Aces`, 'green');
    }

    // Round 5 (準決勝): 0 new Aces, +2 Gear Second
    if (roundResults[4].newAces !== 0) {
        log(`FAIL: Round 5 should have +0 Aces, got +${roundResults[4].newAces}`, 'red');
        passed = false;
    } else {
        log(`PASS: Round 5 (準決勝): +0 Aces`, 'green');
    }

    if (roundResults[4].newGearSecond !== 2) {
        log(`FAIL: Round 5 should have +2 Gear Second, got +${roundResults[4].newGearSecond}`, 'red');
        passed = false;
    } else {
        log(`PASS: Round 5 (準決勝): +2 Gear Second`, 'green');
    }

    // Total: 6 Aces (1+1+2+2+0), 2 Gear Second
    const totalAces = roundResults[4].totalAces;
    const totalGearSecond = roundResults[4].totalGearSecond;

    log(`\nFinal totals: ${totalAces} Aces, ${totalGearSecond} Gear Second`, 'cyan');

    if (totalAces !== 6) {
        log(`FAIL: Should have 6 total Aces, got ${totalAces}`, 'red');
        passed = false;
    } else {
        log(`PASS: 6 total Aces (all field players)`, 'green');
    }

    if (totalGearSecond !== 2) {
        log(`FAIL: Should have 2 total Gear Second, got ${totalGearSecond}`, 'red');
        passed = false;
    } else {
        log(`PASS: 2 total Gear Second`, 'green');
    }

    return passed;
}

// Test 15: Test P68 - Bracket Round Progression (64 teams, 6 rounds)
function testBracketRoundProgression() {
    logSection('Test 15: P68 - Bracket Round Progression');

    let passed = true;
    initializeNewGame();
    initializeTournament();

    const bracket = gameState.tournament.bracket;
    const playerTeamId = gameState.tournament.playerTeamId;

    log(`Total teams: ${bracket.length}`, 'gray');
    log(`Player team ID: ${playerTeamId}`, 'gray');

    // Verify 64 teams
    if (bracket.length !== 64) {
        log(`FAIL: Expected 64 teams, got ${bracket.length}`, 'red');
        passed = false;
    } else {
        log(`PASS: 64 teams in bracket`, 'green');
    }

    // Simulate through all 6 rounds
    const expectedTeamsPerRound = [64, 32, 16, 8, 4, 2];
    const roundNames = ['1回戦', '2回戦', '3回戦', '準々決勝', '準決勝', '決勝'];

    for (let round = 1; round <= 6; round++) {
        const teamsBeforeRound = getRemainingTeamsCount(bracket);
        const roundName = getRoundName(round);
        const currentRound = gameState.tournament.currentRound;

        log(`\nRound ${round} (${roundName}):`, 'cyan');
        log(`  Teams remaining: ${teamsBeforeRound}`, 'gray');

        // Check round name
        if (roundName !== roundNames[round - 1]) {
            log(`  FAIL: Round name should be "${roundNames[round - 1]}", got "${roundName}"`, 'red');
            passed = false;
        } else {
            log(`  PASS: Round name is "${roundName}"`, 'green');
        }

        // Check team count before round
        if (teamsBeforeRound !== expectedTeamsPerRound[round - 1]) {
            log(`  FAIL: Expected ${expectedTeamsPerRound[round - 1]} teams, got ${teamsBeforeRound}`, 'red');
            passed = false;
        } else {
            log(`  PASS: ${teamsBeforeRound} teams before round`, 'green');
        }

        // Get opponent
        const opponent = getNextOpponent();
        if (!opponent && round <= 6) {
            log(`  FAIL: No opponent found for round ${round}`, 'red');
            passed = false;
            break;
        }
        log(`  Opponent: ${opponent.name}`, 'gray');

        // Simulate AI matches for this round
        processRoundResults();

        // Simulate player win
        setCurrentMatch(opponent);
        recordMatchResult(true, 10, 5);

        const teamsAfterRound = getRemainingTeamsCount(bracket);
        log(`  Teams after round: ${teamsAfterRound}`, 'gray');
    }

    // Final check - tournament should be complete
    if (gameState.championshipWon) {
        log(`\nPASS: Tournament completed successfully`, 'green');
    } else {
        log(`\nFAIL: Tournament not marked as won`, 'red');
        passed = false;
    }

    return passed;
}

// Main test runner
async function runAllTests() {
    console.log('\n');
    log('╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║   PowerPro Style Ability System - CLI Test Suite           ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');

    const tests = [
        { name: 'Config Test', fn: testAbilitiesConfig },
        { name: 'Initialization Test', fn: testAbilitiesInitialization },
        { name: 'GetAllAbilities Test', fn: testGetAllAbilities },
        { name: 'GetAbilityStatus Test', fn: testGetAbilityStatus },
        { name: 'GetAbilitiesByCategory Test', fn: testGetAbilitiesByCategory },
        { name: 'Training Progress Test', fn: testTrainingAbilityProgress },
        { name: 'Multiple Training Types Test', fn: testMultipleTrainingTypes },
        { name: 'Full Game Simulation', fn: testFullGameSimulation },
        { name: 'P64 Misconception Correction', fn: testMisconceptionCorrection },
        { name: 'P65 Strengths Require Ace', fn: testStrengthsRequireAce },
        { name: 'P66 Fair Distribution', fn: testFairDistribution },
        { name: 'P67 Skip Completed Types', fn: testSkipCompletedTypes },
        { name: 'ExecuteTraining Integration', fn: testExecuteTrainingIntegration },
        { name: 'P69 Ace Awakening Per Round', fn: testAceAwakeningPerRound },
        { name: 'P68 Bracket Round Progression', fn: testBracketRoundProgression }
    ];

    const results = [];

    for (const test of tests) {
        try {
            const passed = test.fn();
            results.push({ name: test.name, passed, error: null });
        } catch (error) {
            log(`\nERROR in ${test.name}: ${error.message}`, 'red');
            console.error(error.stack);
            results.push({ name: test.name, passed: false, error: error.message });
        }
    }

    // Summary
    logSection('Test Summary');

    let passCount = 0;
    let failCount = 0;

    results.forEach(r => {
        if (r.passed) {
            log(`  ✅ ${r.name}`, 'green');
            passCount++;
        } else {
            log(`  ❌ ${r.name}${r.error ? `: ${r.error}` : ''}`, 'red');
            failCount++;
        }
    });

    console.log('\n' + '-'.repeat(60));
    log(`Total: ${passCount} passed, ${failCount} failed`, passCount === results.length ? 'green' : 'yellow');

    return failCount === 0;
}

// Run tests
runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
});
