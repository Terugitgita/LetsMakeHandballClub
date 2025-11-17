// screens.js - UI Screen Management

import { CONFIG } from './config.js';
import { gameState, initializeNewGame, saveGame, loadGame, hasSaveData, advanceDay, recordMatchResult, setCurrentMatch, clearCurrentMatch, isBoycottActive, changeCaptainPersonality, applyBoycottRestPenalty } from './gameState.js';
import { initializeTournament, getNextOpponent, getCurrentRoundName, getSimplifiedBracket, processRoundResults, advanceTournament } from './tournament.js';
import { getAvailableMenus, previewTrainingGrowth, executeTraining, getCaptainInfo } from './training.js';
import { MatchSimulator, createTactic, validateTactics } from './match.js';
import { createElement, createButton, deepClone } from './utils.js';

// Screen types
export const SCREENS = {
    TITLE: 'title',
    MAIN: 'main',
    TRAINING: 'training',
    MATCH_SETUP: 'match-setup',
    MATCH: 'match',
    ACE_AWAKENING: 'ace-awakening',
    RESULT: 'result',
    TOURNAMENT: 'tournament'
};

let currentScreen = SCREENS.TITLE;
let matchSimulator = null;
let currentTactics = [];

// Main screen switching function
export function switchScreen(screenName, data = {}) {
    currentScreen = screenName;
    const container = document.getElementById('game-container');
    container.innerHTML = '';
    container.className = `screen-${screenName}`;

    switch (screenName) {
        case SCREENS.TITLE:
            renderTitleScreen(container);
            break;
        case SCREENS.MAIN:
            renderMainScreen(container);
            break;
        case SCREENS.TRAINING:
            renderTrainingScreen(container);
            break;
        case SCREENS.MATCH_SETUP:
            renderMatchSetupScreen(container, data);
            break;
        case SCREENS.MATCH:
            renderMatchScreen(container, data);
            break;
        case SCREENS.ACE_AWAKENING:
            renderAceAwakeningScreen(container, data);
            break;
        case SCREENS.RESULT:
            renderResultScreen(container, data);
            break;
        case SCREENS.TOURNAMENT:
            renderTournamentScreen(container);
            break;
    }
}

// Title Screen
function renderTitleScreen(container) {
    const titleDiv = createElement('div', 'title-screen');

    const title = createElement('h1', 'game-title', CONFIG.MESSAGES.TITLE.gameTitle);
    const subtitle = createElement('p', 'game-subtitle', CONFIG.MESSAGES.TITLE.subtitle);

    titleDiv.appendChild(title);
    titleDiv.appendChild(subtitle);

    const btnContainer = createElement('div', 'button-container');

    const newGameBtn = createButton(CONFIG.MESSAGES.MENU.newGame, () => {
        initializeNewGame();
        initializeTournament();
        saveGame();
        switchScreen(SCREENS.MAIN);
    }, 'btn btn-primary');

    btnContainer.appendChild(newGameBtn);

    if (hasSaveData()) {
        const continueBtn = createButton(CONFIG.MESSAGES.MENU.continue, () => {
            loadGame();
            switchScreen(SCREENS.MAIN);
        }, 'btn btn-secondary');
        btnContainer.appendChild(continueBtn);
    }

    titleDiv.appendChild(btnContainer);
    container.appendChild(titleDiv);
}

// Main Screen
function renderMainScreen(container) {
    const mainDiv = createElement('div', 'main-screen');

    // Header with week info
    const header = createElement('div', 'main-header');
    const weekInfo = createElement('h2', 'week-info', `第${gameState.currentWeek}週 ${CONFIG.WEEK_SCHEDULE[gameState.currentDay].day}曜日`);
    header.appendChild(weekInfo);

    // Team stats
    const statsDiv = createElement('div', 'team-stats');

    // Format ace and gear second display
    const positionKeys = ['LW', 'RW', 'CB', 'LB', 'RB', 'P'];
    const acePositions = gameState.team.aces.map(index => CONFIG.POSITIONS[positionKeys[index]].shortName).join('、');
    const gearSecondPositions = gameState.team.gearSecond.map(index => CONFIG.POSITIONS[positionKeys[index]].shortName).join('、');

    statsDiv.innerHTML = `
        <h3>${gameState.team.name}</h3>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">パス</span>
                <span class="stat-value">${gameState.team.stats.pass.toFixed(1)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">ドリブル</span>
                <span class="stat-value">${gameState.team.stats.dribble.toFixed(1)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">シュート</span>
                <span class="stat-value">${gameState.team.stats.shoot.toFixed(1)}</span>
            </div>
        </div>
        ${gameState.team.restBonus ? '<div class="bonus-indicator">休養ボーナス有効</div>' : ''}
        ${gameState.team.aces.length > 0 ? `<div class="ace-info">エース：${acePositions}</div>` : ''}
        ${gameState.team.gearSecond && gameState.team.gearSecond.length > 0 ? `<div class="ace-info" style="color: #ff0066;">ギアセカンド：${gearSecondPositions}</div>` : ''}
    `;

    // Captain info (simplified display)
    const captainDiv = createElement('div', 'captain-info');
    const captainName = gameState.captain.name ? `キャプテン：${gameState.captain.name}<br>` : '';
    captainDiv.innerHTML = `
        ${captainName}
        <p>性格：${gameState.captain.personality}　方針：${gameState.captain.policy}</p>
    `;

    // Action buttons
    const actionDiv = createElement('div', 'action-buttons');

    const dayInfo = CONFIG.WEEK_SCHEDULE[gameState.currentDay];

    if (dayInfo.type === 'training') {
        const trainBtn = createButton(CONFIG.MESSAGES.MENU.training, () => {
            switchScreen(SCREENS.TRAINING);
        }, 'btn btn-primary btn-large');
        actionDiv.appendChild(trainBtn);
    } else if (dayInfo.type === 'match') {
        const matchBtn = createButton(CONFIG.MESSAGES.MENU.match, () => {
            const opponent = getNextOpponent();
            setCurrentMatch(opponent);
            switchScreen(SCREENS.MATCH_SETUP, { opponent });
        }, 'btn btn-primary btn-large');
        actionDiv.appendChild(matchBtn);
    } else if (dayInfo.type === 'rest') {
        const restInfo = createElement('p', 'rest-info', '日曜日は自動で休養日です');
        actionDiv.appendChild(restInfo);
        const nextWeekBtn = createButton('次週へ進む', () => {
            advanceDay();
            saveGame();
            switchScreen(SCREENS.MAIN);
        }, 'btn btn-primary btn-large');
        actionDiv.appendChild(nextWeekBtn);
    }

    const tournamentBtn = createButton(CONFIG.MESSAGES.MENU.tournament, () => {
        switchScreen(SCREENS.TOURNAMENT);
    }, 'btn btn-secondary');
    actionDiv.appendChild(tournamentBtn);

    // Reset button (add to action buttons for visibility)
    const resetBtn = createButton('🔄 リセット', () => {
        if (confirm('本当にリセット？\n全てのデータが失われます！')) {
            if (confirm('本当の本当にリセット？\n最初からやり直しになります！')) {
                localStorage.removeItem(CONFIG.GAME.STORAGE_KEY);
                alert('データをリセットしました');
                location.reload();
            }
        }
    }, 'btn btn-danger');
    actionDiv.appendChild(resetBtn);

    // Save/Load buttons
    const saveLoadDiv = createElement('div', 'save-load-buttons');

    const saveBtn = createButton('手動セーブ', () => {
        if (confirm('現在の進行状況を上書き保存しますか？\n（前の状態には戻せません）')) {
            const success = saveGame();
            if (success) {
                alert('セーブしました');
            } else {
                alert('セーブに失敗しました');
            }
        }
    }, 'btn btn-secondary');
    saveLoadDiv.appendChild(saveBtn);

    mainDiv.appendChild(header);
    mainDiv.appendChild(statsDiv);
    mainDiv.appendChild(captainDiv);
    mainDiv.appendChild(actionDiv);
    mainDiv.appendChild(saveLoadDiv);

    container.appendChild(mainDiv);
}

// Training Screen
function renderTrainingScreen(container) {
    const trainingDiv = createElement('div', 'training-screen');

    // Check for boycott
    const isBoycott = isBoycottActive();

    if (isBoycott) {
        // Boycott screen
        const boycottHeader = createElement('h2', 'boycott-header', 'パワハラは嫌だ！練習ボイコット！');
        boycottHeader.style.color = '#ff0000';
        trainingDiv.appendChild(boycottHeader);

        const boycottMessage = createElement('p', 'boycott-message', '選手たちが練習をボイコットしています...');
        trainingDiv.appendChild(boycottMessage);

        // Current stats
        const statsDiv = createElement('div', 'current-stats');
        statsDiv.innerHTML = `
            <h3>現在の能力値</h3>
            <p>パス: ${gameState.team.stats.pass.toFixed(1)}</p>
            <p>ドリブル: ${gameState.team.stats.dribble.toFixed(1)}</p>
            <p>シュート: ${gameState.team.stats.shoot.toFixed(1)}</p>
        `;
        trainingDiv.appendChild(statsDiv);

        // Boycott options
        const optionsDiv = createElement('div', 'boycott-options');

        // Option 1: 仕方ないので今日は練習休み
        const restOptionBtn = createButton('仕方ないので今日は練習休み', () => {
            if (confirm('全ステータス-0.3で次の日へ進みます。よろしいですか？')) {
                applyBoycottRestPenalty();
                advanceDay();
                saveGame();
                alert('全ステータスが0.3下がりました...');
                switchScreen(SCREENS.MAIN);
            }
        }, 'btn btn-warning');

        // Option 2: キャプテンと話し合い
        const talkOptionBtn = createButton('キャプテンと話し合い', () => {
            if (confirm('キャプテンの性格がパワハラ以外にランダムで変更されます。よろしいですか？')) {
                const newPersonality = changeCaptainPersonality();
                advanceDay();
                saveGame();
                alert(`キャプテンの性格が「${newPersonality}」に変わりました！\n翌日から新しい気持ちで練習が始まります。`);
                switchScreen(SCREENS.MAIN);
            }
        }, 'btn btn-primary');

        optionsDiv.appendChild(restOptionBtn);
        optionsDiv.appendChild(talkOptionBtn);
        trainingDiv.appendChild(optionsDiv);

        // Back button
        const backBtn = createButton('戻る', () => {
            switchScreen(SCREENS.MAIN);
        }, 'btn btn-secondary');
        trainingDiv.appendChild(backBtn);

        container.appendChild(trainingDiv);
        return;
    }

    const header = createElement('h2', 'training-header', CONFIG.MESSAGES.TRAINING.selectMenu);
    trainingDiv.appendChild(header);

    // Current stats
    const statsDiv = createElement('div', 'current-stats');
    statsDiv.innerHTML = `
        <h3>現在の能力値</h3>
        <p>パス: ${gameState.team.stats.pass.toFixed(1)}</p>
        <p>ドリブル: ${gameState.team.stats.dribble.toFixed(1)}</p>
        <p>シュート: ${gameState.team.stats.shoot.toFixed(1)}</p>
    `;
    trainingDiv.appendChild(statsDiv);

    // Training menus
    const menus = getAvailableMenus();
    const menuContainer = createElement('div', 'training-menu-container');

    menus.forEach(menu => {
        const menuDiv = createElement('div', 'training-menu-item');

        const menuTitle = createElement('h4', 'menu-title', menu.name);
        const menuDesc = createElement('p', 'menu-desc', menu.description);

        menuDiv.appendChild(menuTitle);
        menuDiv.appendChild(menuDesc);

        // Show growth preview
        const preview = previewTrainingGrowth(menu.name);
        if (preview) {
            const previewDiv = createElement('div', 'growth-preview');

            // Debug log for total training
            if (menu.name === '総合練習') {
                console.log('総合練習プレビュー:', preview);
            }

            previewDiv.innerHTML = `
                <span>パス: ${preview.pass || '-'}</span>
                <span>ドリブル: ${preview.dribble || '-'}</span>
                <span>シュート: ${preview.shoot || '-'}</span>
            `;
            menuDiv.appendChild(previewDiv);
        }

        const selectBtn = createButton('この練習をする', () => {
            const result = executeTraining(menu.name);
            if (result.success) {
                alert(result.message);
                advanceDay();
                saveGame();
                switchScreen(SCREENS.MAIN);
            } else {
                alert(result.message);
            }
        }, 'btn btn-primary');

        menuDiv.appendChild(selectBtn);

        // Add "fill all days until match" button if Round 3 cleared
        if (gameState.tournament.currentRound >= 4 && gameState.currentDay >= 1 && gameState.currentDay <= 5) {
            const fillAllBtn = createButton('次の試合までは全てこの練習', () => {
                const daysUntilMatch = 6 - gameState.currentDay; // Days from current to Saturday
                const confirmMsg = `残り${daysUntilMatch}日間、全て${menu.name}を行います。よろしいですか？`;

                if (confirm(confirmMsg)) {
                    let successCount = 0;
                    for (let i = 0; i < daysUntilMatch; i++) {
                        const result = executeTraining(menu.name);
                        if (result.success) {
                            successCount++;
                            advanceDay();
                        } else {
                            alert(`${i + 1}日目で失敗しました: ${result.message}`);
                            break;
                        }
                    }

                    if (successCount > 0) {
                        alert(`${successCount}日間の${menu.name}を完了しました！`);
                        saveGame();
                        switchScreen(SCREENS.MAIN);
                    }
                }
            }, 'btn btn-secondary btn-fill-all');

            menuDiv.appendChild(fillAllBtn);
        }

        menuContainer.appendChild(menuDiv);
    });

    trainingDiv.appendChild(menuContainer);

    // Back button
    const backBtn = createButton('戻る', () => {
        switchScreen(SCREENS.MAIN);
    }, 'btn btn-secondary');
    trainingDiv.appendChild(backBtn);

    container.appendChild(trainingDiv);
}

// Match Setup Screen (Tactic Planning) - New Position-Based System
function renderMatchSetupScreen(container, data) {
    const setupDiv = createElement('div', 'match-setup-screen');

    const header = createElement('h2', 'match-header', `${getCurrentRoundName()}`);
    const opponentInfo = createElement('div', 'opponent-info');
    opponentInfo.innerHTML = `
        <h3>対戦相手: ${data.opponent.name}</h3>
        <p>地方: ${data.opponent.region}</p>
        <p>守備戦術: ${data.opponent.tactic.name}</p>
        <p class="attempts-remaining"><strong>残りチャレンジ回数: ${gameState.currentMatch.attemptsRemaining} / ${CONFIG.GAME.MAX_ATTEMPTS}</strong></p>
    `;

    // Stats comparison
    const statsComparison = createElement('div', 'stats-comparison');
    const playerStats = gameState.team.stats;
    const opponentStats = data.opponent.stats;
    statsComparison.innerHTML = `
        <div class="stat-comparison-row">
            <div class="stat-comparison-label">パス</div>
            <div class="stat-comparison-values">
                <span class="player-stat">${playerStats.pass.toFixed(1)}</span>
                <span class="vs">vs</span>
                <span class="opponent-stat">${opponentStats.pass.toFixed(1)}</span>
            </div>
        </div>
        <div class="stat-comparison-row">
            <div class="stat-comparison-label">ドリブル</div>
            <div class="stat-comparison-values">
                <span class="player-stat">${playerStats.dribble.toFixed(1)}</span>
                <span class="vs">vs</span>
                <span class="opponent-stat">${opponentStats.dribble.toFixed(1)}</span>
            </div>
        </div>
        <div class="stat-comparison-row">
            <div class="stat-comparison-label">シュート</div>
            <div class="stat-comparison-values">
                <span class="player-stat">${playerStats.shoot.toFixed(1)}</span>
                <span class="vs">vs</span>
                <span class="opponent-stat">${opponentStats.shoot.toFixed(1)}</span>
            </div>
        </div>
    `;

    setupDiv.appendChild(header);
    setupDiv.appendChild(opponentInfo);
    setupDiv.appendChild(statsComparison);

    // Load saved tactics if in retry mode
    if (data.retryMode && gameState.currentMatch.savedTactics.length > 0) {
        currentTactics = deepClone(gameState.currentMatch.savedTactics);
        // Keep the failedTacticIndex for red highlighting
    } else {
        currentTactics = [];
        // Reset failed tactic index when starting fresh
        if (gameState.currentMatch) {
            gameState.currentMatch.failedTacticIndex = null;
        }
    }

    // Tactic builder
    const tacticBuilder = createElement('div', 'tactic-builder');
    const tacticTitle = createElement('h3', '', '作戦を立てる');
    tacticBuilder.appendChild(tacticTitle);

    const tacticList = createElement('div', 'tactic-list');
    tacticBuilder.appendChild(tacticList);

    // Current tactic being built
    let currentTacticBuild = null;

    // Editing mode tracking
    let isEditingTactic = false;
    let editingTacticIndex = -1;

    // Add tactic controls
    const addTacticDiv = createElement('div', 'add-tactic-controls');

    // Step 1: Action type selection
    const actionSelect = createElement('select', 'action-select');
    actionSelect.innerHTML = `
        <option value="">行動を選択</option>
        <option value="pass">パス</option>
        <option value="dribble">ドリブル</option>
        <option value="shoot">シュート</option>
    `;

    addTacticDiv.appendChild(actionSelect);

    // Dynamic controls container
    const dynamicControls = createElement('div', 'dynamic-controls');
    addTacticDiv.appendChild(dynamicControls);

    tacticBuilder.appendChild(addTacticDiv);

    // Action type change handler
    actionSelect.addEventListener('change', () => {
        const actionType = actionSelect.value;
        dynamicControls.innerHTML = '';
        currentTacticBuild = null;

        if (actionType === 'pass') {
            renderPassControls(dynamicControls);
        } else if (actionType === 'dribble') {
            renderDribbleControls(dynamicControls);
        } else if (actionType === 'shoot') {
            renderShootControls(dynamicControls);
        }
    });

    function renderPassControls(container) {
        currentTacticBuild = { type: 'pass' };

        // Determine current ball holder
        let ballHolder = 'CB'; // Default starter
        currentTactics.forEach(tactic => {
            if (tactic.type === 'pass') {
                ballHolder = tactic.to;
            } else if (tactic.type === 'dribble' && tactic.nextAction === 'pass') {
                ballHolder = tactic.passTo;
            }
        });

        const fromLabel = createElement('label', '', '誰が：');
        const fromSelect = createPositionSelect('from-select');
        fromSelect.value = ballHolder;
        fromSelect.disabled = true; // Ball holder is fixed

        const holderNote = createElement('small', 'holder-note', `（ボールホルダー: ${CONFIG.POSITIONS[ballHolder].name}）`);

        const toLabel = createElement('label', '', '誰に：');
        const toSelect = createPositionSelect('to-select');

        const addBtn = createButton('パス追加', () => {
            const from = fromSelect.value;
            const to = toSelect.value;

            if (!from || !to) {
                alert('パス元とパス先を選択してください');
                return;
            }

            if (from === to) {
                alert('同じポジションにはパスできません');
                return;
            }

            if (isEditingTactic && editingTacticIndex >= 0) {
                // Replace existing tactic
                currentTactics[editingTacticIndex] = {
                    type: 'pass',
                    from: from,
                    to: to
                };
                isEditingTactic = false;
                editingTacticIndex = -1;
                alert('作戦を変更しました');
            } else {
                // Add new tactic
                currentTactics.push({
                    type: 'pass',
                    from: from,
                    to: to
                });
            }

            updateTacticList(tacticList);
            actionSelect.value = '';
            container.innerHTML = '';
        }, 'btn btn-primary');

        container.appendChild(fromLabel);
        container.appendChild(fromSelect);
        container.appendChild(holderNote);
        container.appendChild(createElement('br'));
        container.appendChild(toLabel);
        container.appendChild(toSelect);
        container.appendChild(addBtn);
    }

    function renderDribbleControls(container) {
        currentTacticBuild = { type: 'dribble' };

        // Determine current ball holder
        let ballHolder = 'CB';
        currentTactics.forEach(tactic => {
            if (tactic.type === 'pass') {
                ballHolder = tactic.to;
            } else if (tactic.type === 'dribble' && tactic.nextAction === 'pass') {
                ballHolder = tactic.passTo;
            }
        });

        const holderNote = createElement('p', 'holder-note', `ボールホルダー: ${CONFIG.POSITIONS[ballHolder].name}`);
        container.appendChild(holderNote);

        // Step 1: Direction
        const dirLabel = createElement('label', '', '方向：');
        const dirSelect = createElement('select', 'dir-select');
        CONFIG.ACTION.DRIBBLE.directions.forEach(dir => {
            const option = createElement('option');
            option.value = dir.id;
            option.textContent = dir.label;
            dirSelect.appendChild(option);
        });

        // Step 2: Distance
        const distLabel = createElement('label', '', '距離：');
        const distSelect = createElement('select', 'dist-select');
        CONFIG.ACTION.DRIBBLE.distances.forEach(dist => {
            const option = createElement('option');
            option.value = dist.id;
            option.textContent = dist.label;
            distSelect.appendChild(option);
        });

        // Step 3: Next action
        const nextLabel = createElement('label', '', '次の行動：');
        const nextSelect = createElement('select', 'next-select');
        CONFIG.ACTION.DRIBBLE.nextActions.forEach(action => {
            const option = createElement('option');
            option.value = action.id;
            option.textContent = action.label;
            nextSelect.appendChild(option);
        });

        const passToContainer = createElement('div', 'pass-to-container');
        passToContainer.style.display = 'none';

        nextSelect.addEventListener('change', () => {
            if (nextSelect.value === 'pass') {
                passToContainer.style.display = 'block';
            } else {
                passToContainer.style.display = 'none';
            }
        });

        const passToLabel = createElement('label', '', 'パス先：');
        const passToSelect = createPositionSelect('pass-to-select');
        passToContainer.appendChild(passToLabel);
        passToContainer.appendChild(passToSelect);

        const addBtn = createButton('ドリブル追加', () => {
            const direction = dirSelect.value;
            const distanceId = distSelect.value;
            const nextAction = nextSelect.value;

            if (!direction || !distanceId || !nextAction) {
                alert('すべての項目を選択してください');
                return;
            }

            const distConfig = CONFIG.ACTION.DRIBBLE.distances.find(d => d.id === distanceId);

            const tacticData = {
                type: 'dribble',
                direction: direction,
                distance: distConfig.distance,
                duration: distConfig.time,
                nextAction: nextAction
            };

            if (nextAction === 'pass') {
                const passTo = passToSelect.value;
                if (!passTo) {
                    alert('パス先を選択してください');
                    return;
                }
                tacticData.passTo = passTo;
            }

            if (isEditingTactic && editingTacticIndex >= 0) {
                // Replace existing tactic
                currentTactics[editingTacticIndex] = tacticData;
                isEditingTactic = false;
                editingTacticIndex = -1;
                alert('作戦を変更しました');
            } else {
                // Add new tactic
                currentTactics.push(tacticData);
            }

            updateTacticList(tacticList);
            actionSelect.value = '';
            container.innerHTML = '';
        }, 'btn btn-primary');

        container.appendChild(dirLabel);
        container.appendChild(dirSelect);
        container.appendChild(distLabel);
        container.appendChild(distSelect);
        container.appendChild(nextLabel);
        container.appendChild(nextSelect);
        container.appendChild(passToContainer);
        container.appendChild(addBtn);
    }

    function renderShootControls(container) {
        currentTacticBuild = { type: 'shoot' };

        // Determine current ball holder
        let ballHolder = 'CB';
        currentTactics.forEach(tactic => {
            if (tactic.type === 'pass') {
                ballHolder = tactic.to;
            } else if (tactic.type === 'dribble' && tactic.nextAction === 'pass') {
                ballHolder = tactic.passTo;
            }
        });

        const holderNote = createElement('p', 'holder-note', `ボールホルダー: ${CONFIG.POSITIONS[ballHolder].name}`);
        container.appendChild(holderNote);

        const typeLabel = createElement('label', '', 'シュートタイプ：');
        const typeSelect = createElement('select', 'shoot-type-select');
        CONFIG.ACTION.SHOOT.types.forEach(type => {
            const option = createElement('option');
            option.value = type.id;
            option.textContent = `${CONFIG.POSITIONS[ballHolder].shortName} が ${type.label}`;
            typeSelect.appendChild(option);
        });

        const addBtn = createButton('シュート追加', () => {
            const shootType = typeSelect.value;

            if (!shootType) {
                alert('シュートタイプを選択してください');
                return;
            }

            if (isEditingTactic && editingTacticIndex >= 0) {
                // Replace existing tactic
                currentTactics[editingTacticIndex] = {
                    type: 'shoot',
                    shootType: shootType
                };
                isEditingTactic = false;
                editingTacticIndex = -1;
                alert('作戦を変更しました');
            } else {
                // Add new tactic
                currentTactics.push({
                    type: 'shoot',
                    shootType: shootType
                });
            }

            updateTacticList(tacticList);
            actionSelect.value = '';
            container.innerHTML = '';
        }, 'btn btn-primary');

        container.appendChild(typeLabel);
        container.appendChild(typeSelect);
        container.appendChild(addBtn);
    }

    function createPositionSelect(id) {
        const select = createElement('select', id);
        const positions = ['LW', 'RW', 'CB', 'LB', 'RB', 'P'];

        const defaultOption = createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '選択...';
        select.appendChild(defaultOption);

        positions.forEach(pos => {
            const option = createElement('option');
            option.value = pos;
            option.textContent = `${CONFIG.POSITIONS[pos].name} (${pos})`;
            select.appendChild(option);
        });

        return select;
    }

    // Clear tactics button
    const clearBtn = createButton('作戦クリア', () => {
        currentTactics = [];
        updateTacticList(tacticList);
    }, 'btn btn-secondary');
    tacticBuilder.appendChild(clearBtn);

    setupDiv.appendChild(tacticBuilder);

    // Start match button
    const startMatchBtn = createButton('試合開始', () => {
        const validation = validateTactics(currentTactics);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        switchScreen(SCREENS.MATCH, { opponent: data.opponent, tactics: currentTactics });
    }, 'btn btn-success btn-large');

    setupDiv.appendChild(startMatchBtn);

    // Back button
    const backBtn = createButton('戻る', () => {
        clearCurrentMatch();
        switchScreen(SCREENS.MAIN);
    }, 'btn btn-secondary');
    setupDiv.appendChild(backBtn);

    container.appendChild(setupDiv);

    function editTactic(tacticIndex, listElement) {
        const tactic = currentTactics[tacticIndex];

        // Set editing mode
        isEditingTactic = true;
        editingTacticIndex = tacticIndex;

        // Calculate ball holder at this point (based on previous tactics)
        let ballHolder = 'CB'; // Default starter
        for (let i = 0; i < tacticIndex; i++) {
            const prevTactic = currentTactics[i];
            if (!prevTactic) continue; // Safety check

            if (prevTactic.type === 'pass' && prevTactic.to) {
                ballHolder = prevTactic.to;
            } else if (prevTactic.type === 'dribble' && prevTactic.nextAction === 'pass' && prevTactic.passTo) {
                ballHolder = prevTactic.passTo;
            }
        }

        // Validate ball holder
        if (!ballHolder || !CONFIG.POSITIONS[ballHolder]) {
            ballHolder = 'CB'; // Fallback to center back
        }

        // Scroll to the action controls
        actionSelect.scrollIntoView({ behavior: 'smooth' });

        // Set the action type
        actionSelect.value = tactic.type;

        // Trigger change event to show dynamic controls
        const changeEvent = new Event('change');
        actionSelect.dispatchEvent(changeEvent);

        // Wait a moment for controls to render
        setTimeout(() => {
            if (tactic.type === 'pass') {
                const toSelect = document.getElementById('to-select');
                if (toSelect) toSelect.value = tactic.to;
            } else if (tactic.type === 'dribble') {
                const dirSelect = document.getElementById('dir-select');
                const distSelect = document.getElementById('dist-select');
                const nextSelect = document.getElementById('next-select');

                if (dirSelect) dirSelect.value = tactic.direction;

                // Find distance ID from distance value
                const distConfig = CONFIG.ACTION.DRIBBLE.distances.find(d => d.distance === tactic.distance);
                if (distSelect && distConfig) distSelect.value = distConfig.id;

                if (nextSelect) nextSelect.value = tactic.nextAction;

                // If pass, set pass target
                if (tactic.nextAction === 'pass') {
                    setTimeout(() => {
                        const passToSelect = document.getElementById('pass-to-select');
                        if (passToSelect && tactic.passTo) passToSelect.value = tactic.passTo;
                    }, 100);
                }
            } else if (tactic.type === 'shoot') {
                const typeSelect = document.getElementById('shoot-type-select');
                if (typeSelect) typeSelect.value = tactic.shootType;
            }

            // Clear dynamicControls to remove the add button
            dynamicControls.innerHTML = '';

            // Re-render the form controls without the add button
            if (tactic.type === 'pass') {
                // Show who has the ball at this point
                const fromLabel = createElement('label', '', '誰が：');
                const fromSelect = createPositionSelect('from-select');
                fromSelect.value = ballHolder;
                fromSelect.disabled = true; // Cannot change who has the ball

                const holderNote = createElement('small', 'holder-note', `（この時点のボールホルダー: ${CONFIG.POSITIONS[ballHolder].name}）`);

                const toLabel = createElement('label', '', '誰に：');
                const toSelect = createPositionSelect('to-select');
                toSelect.value = tactic.to;

                dynamicControls.appendChild(fromLabel);
                dynamicControls.appendChild(fromSelect);
                dynamicControls.appendChild(holderNote);
                dynamicControls.appendChild(createElement('br'));
                dynamicControls.appendChild(toLabel);
                dynamicControls.appendChild(toSelect);
            } else if (tactic.type === 'dribble') {
                // Show who has the ball at this point
                const holderNote = createElement('p', 'holder-note', `ボールホルダー: ${CONFIG.POSITIONS[ballHolder].name}`);
                dynamicControls.appendChild(holderNote);

                // Re-render dribble controls
                const dirLabel = createElement('label', '', '方向：');
                const dirSelect = createElement('select', 'dir-select');
                CONFIG.ACTION.DRIBBLE.directions.forEach(dir => {
                    const opt = createElement('option');
                    opt.value = dir.id;
                    opt.textContent = dir.label;
                    dirSelect.appendChild(opt);
                });
                dirSelect.value = tactic.direction;

                const distLabel = createElement('label', '', '距離：');
                const distSelect = createElement('select', 'dist-select');
                CONFIG.ACTION.DRIBBLE.distances.forEach(dist => {
                    const opt = createElement('option');
                    opt.value = dist.id;
                    opt.textContent = dist.label;
                    distSelect.appendChild(opt);
                });
                const distConfig = CONFIG.ACTION.DRIBBLE.distances.find(d => d.distance === tactic.distance);
                if (distConfig) distSelect.value = distConfig.id;

                const nextLabel = createElement('label', '', '次の行動：');
                const nextSelect = createElement('select', 'next-select');
                CONFIG.ACTION.DRIBBLE.nextActions.forEach(act => {
                    const opt = createElement('option');
                    opt.value = act.id;
                    opt.textContent = act.label;
                    nextSelect.appendChild(opt);
                });
                nextSelect.value = tactic.nextAction;

                dynamicControls.appendChild(dirLabel);
                dynamicControls.appendChild(dirSelect);
                dynamicControls.appendChild(createElement('br'));
                dynamicControls.appendChild(distLabel);
                dynamicControls.appendChild(distSelect);
                dynamicControls.appendChild(createElement('br'));
                dynamicControls.appendChild(nextLabel);
                dynamicControls.appendChild(nextSelect);

                if (tactic.nextAction === 'pass') {
                    const passToLabel = createElement('label', '', 'パス先：');
                    const passToSelect = createPositionSelect('pass-to-select');
                    if (tactic.passTo) passToSelect.value = tactic.passTo;
                    dynamicControls.appendChild(createElement('br'));
                    dynamicControls.appendChild(passToLabel);
                    dynamicControls.appendChild(passToSelect);
                }
            } else if (tactic.type === 'shoot') {
                // Show who has the ball at this point
                const holderNote = createElement('p', 'holder-note', `ボールホルダー: ${CONFIG.POSITIONS[ballHolder].name}`);
                dynamicControls.appendChild(holderNote);

                const typeLabel = createElement('label', '', 'シュートタイプ：');
                const typeSelect = createElement('select', 'shoot-type-select');
                CONFIG.ACTION.SHOOT.types.forEach(type => {
                    const opt = createElement('option');
                    opt.value = type.id;
                    opt.textContent = `${CONFIG.POSITIONS[ballHolder].shortName} が ${type.label}`;
                    typeSelect.appendChild(opt);
                });
                typeSelect.value = tactic.shootType;
                dynamicControls.appendChild(typeLabel);
                dynamicControls.appendChild(typeSelect);
            }

            // Add a button to confirm edit
            const confirmBtn = createButton('変更を確定', () => {
                // Collect new tactic data based on type
                let newTactic = null;

                if (tactic.type === 'pass') {
                    const toSelect = document.getElementById('to-select');
                    if (toSelect && toSelect.value) {
                        // Validate that pass is not to the same person
                        if (ballHolder === toSelect.value) {
                            alert('同じポジションにはパスできません');
                            return;
                        }

                        newTactic = {
                            type: 'pass',
                            from: ballHolder,
                            to: toSelect.value
                        };
                    }
                } else if (tactic.type === 'dribble') {
                    const dirSelect = document.getElementById('dir-select');
                    const distSelect = document.getElementById('dist-select');
                    const nextSelect = document.getElementById('next-select');

                    if (dirSelect && distSelect && nextSelect) {
                        const distConfig = CONFIG.ACTION.DRIBBLE.distances.find(d => d.id === distSelect.value);
                        newTactic = {
                            type: 'dribble',
                            direction: dirSelect.value,
                            distance: distConfig.distance,
                            duration: distConfig.time,
                            nextAction: nextSelect.value
                        };

                        if (nextSelect.value === 'pass') {
                            const passToSelect = document.getElementById('pass-to-select');
                            if (passToSelect && passToSelect.value) {
                                // Validate that pass is not to the same person
                                if (ballHolder === passToSelect.value) {
                                    alert('同じポジションにはパスできません');
                                    return;
                                }
                                newTactic.passTo = passToSelect.value;
                            }
                        }
                    }
                } else if (tactic.type === 'shoot') {
                    const typeSelect = document.getElementById('shoot-type-select');
                    if (typeSelect && typeSelect.value) {
                        newTactic = {
                            type: 'shoot',
                            shootType: typeSelect.value
                        };
                    }
                }

                if (newTactic) {
                    // Update the tactic
                    currentTactics[tacticIndex] = newTactic;

                    // Delete all tactics after this one to avoid contradictions
                    const deletedCount = currentTactics.length - tacticIndex - 1;
                    currentTactics.splice(tacticIndex + 1);

                    // Reset failed tactic index if we edited/deleted the failed tactic or earlier
                    if (gameState.currentMatch && gameState.currentMatch.failedTacticIndex !== null) {
                        if (tacticIndex <= gameState.currentMatch.failedTacticIndex) {
                            gameState.currentMatch.failedTacticIndex = null;
                        }
                    }

                    updateTacticList(listElement);
                    actionSelect.value = '';
                    dynamicControls.innerHTML = '';
                    isEditingTactic = false;
                    editingTacticIndex = -1;

                    if (deletedCount > 0) {
                        alert(`作戦${tacticIndex + 1}を変更しました\n以降の${deletedCount}個の作戦を削除しました（矛盾防止のため）`);
                    } else {
                        alert(`作戦${tacticIndex + 1}を変更しました`);
                    }
                }
            }, 'btn btn-success');

            const cancelBtn = createButton('キャンセル', () => {
                actionSelect.value = '';
                dynamicControls.innerHTML = '';
                isEditingTactic = false;
                editingTacticIndex = -1;
            }, 'btn btn-secondary');

            dynamicControls.appendChild(confirmBtn);
            dynamicControls.appendChild(cancelBtn);
        }, 100);
    }

    function updateTacticList(listElement) {
        listElement.innerHTML = '';
        currentTactics.forEach((tactic, i) => {
            const item = createElement('div', 'tactic-item clickable');
            let text = `${i + 1}. `;

            // Calculate ball holder at this point
            let ballHolder = 'CB';
            for (let j = 0; j < i; j++) {
                const prevTactic = currentTactics[j];
                if (prevTactic.type === 'pass') {
                    ballHolder = prevTactic.to;
                } else if (prevTactic.type === 'dribble' && prevTactic.nextAction === 'pass') {
                    ballHolder = prevTactic.passTo;
                }
            }

            if (tactic.type === 'pass') {
                const fromPos = CONFIG.POSITIONS[tactic.from];
                const toPos = CONFIG.POSITIONS[tactic.to];
                text += `${fromPos.name}が${toPos.name}にパス`;
            } else if (tactic.type === 'dribble') {
                const dirLabel = CONFIG.ACTION.DRIBBLE.directions.find(d => d.id === tactic.direction)?.label || tactic.direction;
                const distLabel = CONFIG.ACTION.DRIBBLE.distances.find(d => d.distance === tactic.distance)?.label || tactic.duration + '秒';
                const nextLabel = CONFIG.ACTION.DRIBBLE.nextActions.find(a => a.id === tactic.nextAction)?.label || tactic.nextAction;

                text += `${dirLabel}に${distLabel}ドリブル → ${nextLabel}`;

                if (tactic.nextAction === 'pass' && tactic.passTo) {
                    const passToPos = CONFIG.POSITIONS[tactic.passTo];
                    text += ` (${passToPos.name})`;
                }
            } else if (tactic.type === 'shoot') {
                const shooterPos = CONFIG.POSITIONS[ballHolder];
                const typeLabel = CONFIG.ACTION.SHOOT.types.find(t => t.id === tactic.shootType)?.label || tactic.shootType;
                text += `${shooterPos.shortName} が ${typeLabel}`;
            }

            item.textContent = text;

            // Highlight failed tactic in red (only if it's exactly the failed one, not new tactics)
            console.log(`Tactic ${i}: retryMode=${data.retryMode}, failedTacticIndex=${gameState.currentMatch?.failedTacticIndex}`);
            if (data.retryMode && gameState.currentMatch.failedTacticIndex !== null && gameState.currentMatch.failedTacticIndex === i) {
                console.log(`Highlighting tactic ${i} as failed (failedTacticIndex: ${gameState.currentMatch.failedTacticIndex})`);
                item.classList.add('tactic-failed');
            }

            // Make tactic clickable for editing
            item.addEventListener('click', () => {
                // Show custom dialog with "変更" and "削除" options
                const action = prompt(`作戦${i + 1}の操作を選択してください:\n1: 変更\n2: 削除\n\n数字を入力してください (1 または 2)`);

                if (action === '1') {
                    // Edit mode - replace the tactic
                    editTactic(i, listElement);
                } else if (action === '2') {
                    // Delete
                    if (confirm(`作戦${i + 1}を削除しますか？`)) {
                        currentTactics.splice(i, 1);

                        // Reset failed tactic index if we deleted the failed tactic or earlier
                        if (gameState.currentMatch && gameState.currentMatch.failedTacticIndex !== null) {
                            if (i <= gameState.currentMatch.failedTacticIndex) {
                                gameState.currentMatch.failedTacticIndex = null;
                            }
                        }

                        updateTacticList(listElement);
                    }
                }
            });

            listElement.appendChild(item);
        });
    }

    // Initialize empty list
    updateTacticList(tacticList);
}

// Show interception overlay
function showInterceptionOverlay(matchDiv, info, onContinue) {
    console.log('showInterceptionOverlay called:', info);

    // Remove existing overlay if any
    const existingOverlay = document.getElementById('interception-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const overlay = createElement('div', 'interception-overlay');
    overlay.id = 'interception-overlay';

    const messageBox = createElement('div', 'interception-message');

    // Build message based on interception type
    let message = '';
    if (info.type === 'pass') {
        const fromPos = CONFIG.POSITIONS[info.from];
        const toPos = CONFIG.POSITIONS[info.to];
        message = `パス失敗！\n${fromPos.name} → ${toPos.name}\n${info.interceptor.name}にカットされました`;
    } else if (info.type === 'shoot') {
        const shooterPos = CONFIG.POSITIONS[info.shooter];
        message = `シュート失敗！\n${shooterPos.name}のシュートが\n${info.interceptor.name}にブロックされました`;
    } else if (info.type === 'dribble') {
        const holderPos = CONFIG.POSITIONS[info.ballHolder];
        message = `ドリブル失敗！\n${holderPos.name}が\n${info.interceptor.name}に止められました`;
    }

    const messageText = createElement('div', 'interception-text', message);
    messageBox.appendChild(messageText);

    const continueBtn = createButton('続ける', () => {
        console.log('Continue button clicked');
        overlay.remove();
        onContinue();
    }, 'btn btn-primary btn-large');

    messageBox.appendChild(continueBtn);
    overlay.appendChild(messageBox);
    matchDiv.appendChild(overlay);
    console.log('Interception overlay added to DOM');
}

// Match Screen
function renderMatchScreen(container, data) {
    const matchDiv = createElement('div', 'match-screen');

    // Score display
    const scoreDiv = createElement('div', 'score-display');
    scoreDiv.innerHTML = `
        <div class="score-item">
            <span class="team-name">${gameState.team.name}</span>
            <span class="score" id="player-score">0</span>
        </div>
        <div class="score-divider">-</div>
        <div class="score-item">
            <span class="score" id="opponent-score">0</span>
            <span class="team-name">${data.opponent.name}</span>
        </div>
    `;
    matchDiv.appendChild(scoreDiv);

    // Stats comparison during match
    const statsComparison = createElement('div', 'stats-comparison match-stats');
    const playerStats = gameState.team.stats;
    const opponentStats = data.opponent.stats;
    statsComparison.innerHTML = `
        <div class="stat-comparison-row">
            <div class="stat-comparison-label">パス</div>
            <div class="stat-comparison-values">
                <span class="player-stat">${playerStats.pass.toFixed(1)}</span>
                <span class="vs">vs</span>
                <span class="opponent-stat">${opponentStats.pass.toFixed(1)}</span>
            </div>
        </div>
        <div class="stat-comparison-row">
            <div class="stat-comparison-label">ドリブル</div>
            <div class="stat-comparison-values">
                <span class="player-stat">${playerStats.dribble.toFixed(1)}</span>
                <span class="vs">vs</span>
                <span class="opponent-stat">${opponentStats.dribble.toFixed(1)}</span>
            </div>
        </div>
        <div class="stat-comparison-row">
            <div class="stat-comparison-label">シュート</div>
            <div class="stat-comparison-values">
                <span class="player-stat">${playerStats.shoot.toFixed(1)}</span>
                <span class="vs">vs</span>
                <span class="opponent-stat">${opponentStats.shoot.toFixed(1)}</span>
            </div>
        </div>
    `;
    matchDiv.appendChild(statsComparison);

    // Court
    const courtDiv = createElement('div', 'match-court');
    courtDiv.id = 'match-court';
    matchDiv.appendChild(courtDiv);

    container.appendChild(matchDiv);

    // Start match simulation
    matchSimulator = new MatchSimulator(data.opponent);
    matchSimulator.setTactics(data.tactics);

    matchSimulator.onScoreCallback = (score) => {
        document.getElementById('player-score').textContent = score.player;
        document.getElementById('opponent-score').textContent = score.opponent;
    };

    matchSimulator.onMatchEndCallback = (matchData) => {
        console.log('onMatchEndCallback received:', matchData);
        const { score, result, failedTacticIndex } = matchData;

        setTimeout(() => {
            try {
                console.log('Processing match end result:', result);
                if (result === 'win') {
                    // Player won!
                    console.log('Player won!');
                    const awakening = recordMatchResult(true, score.player, score.opponent);
                    saveGame();
                    processRoundResults();
                    advanceTournament();

                    // Show ace awakening screen first, then result screen
                    const resultData = { won: true, score, opponent: data.opponent };
                    switchScreen(SCREENS.ACE_AWAKENING, {
                        opponentName: data.opponent.name,
                        awakening: awakening,
                        resultData: resultData
                    });
                } else if (result === 'attempt_failed') {
                    console.log('Attempt failed. Current attempts:', gameState.currentMatch.attemptsRemaining);
                    // Decrement attempts and retry or fail
                    gameState.currentMatch.attemptsRemaining--;
                    gameState.currentMatch.savedTactics = data.tactics; // Save tactics
                    gameState.currentMatch.failedTacticIndex = failedTacticIndex; // Save failed tactic index
                    console.log('After decrement. Remaining attempts:', gameState.currentMatch.attemptsRemaining);

                    if (gameState.currentMatch.attemptsRemaining <= 0) {
                        // Out of attempts - lose
                        console.log('Out of attempts - showing loss screen');
                        recordMatchResult(false, score.player, score.opponent);
                        saveGame();
                        switchScreen(SCREENS.RESULT, { won: false, score, opponent: data.opponent });
                    } else {
                        // Retry with tactics
                        console.log('Showing retry screen');
                        alert(`失敗！残りチャレンジ: ${gameState.currentMatch.attemptsRemaining}回`);
                        switchScreen(SCREENS.MATCH_SETUP, { opponent: data.opponent, retryMode: true });
                    }
                }
            } catch (error) {
                console.error('Error in onMatchEndCallback:', error);
            }
        }, 1000);
    };

    // Interception callback - pause and show interception overlay
    matchSimulator.onInterceptionCallback = (info) => {
        console.log('onInterceptionCallback triggered');
        showInterceptionOverlay(matchDiv, info, () => {
            matchSimulator.resume();
        });
    };

    console.log('Starting match with tactics:', data.tactics);
    console.log('onInterceptionCallback is set:', !!matchSimulator.onInterceptionCallback);
    matchSimulator.start();

    // Render court and players
    renderCourt(courtDiv, matchSimulator);

    // Animation loop for rendering
    function animateCourt() {
        if (matchSimulator && matchSimulator.isRunning) {
            updateCourtDisplay(courtDiv, matchSimulator);
            requestAnimationFrame(animateCourt);
        }
    }
    animateCourt();
}

// Create SVG court lines based on COART.svg specifications
function createCourtLinesSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';

    // Goal line (x: 8500-11500 / 20000 = 42.5%-57.5%, y: 0)
    const goalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    goalLine.setAttribute('x1', '42.5');
    goalLine.setAttribute('y1', '0');
    goalLine.setAttribute('x2', '57.5');
    goalLine.setAttribute('y2', '0');
    goalLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.95)');
    goalLine.setAttribute('stroke-width', '0.5');
    svg.appendChild(goalLine);

    // 6m line - straight section (y: 6000/20000 = 30%)
    const sixMLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    sixMLine.setAttribute('x1', '42.5');
    sixMLine.setAttribute('y1', '30');
    sixMLine.setAttribute('x2', '57.5');
    sixMLine.setAttribute('y2', '30');
    sixMLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.7)');
    sixMLine.setAttribute('stroke-width', '0.3');
    svg.appendChild(sixMLine);

    // 6m line - left arc (center: 42.5%, 0%, radius: 30%)
    // Path: M 8500 6000 A 6000 6000 0 0 1 2500 0
    // Converted: M 42.5 30 A 30 30 0 0 1 12.5 0
    const sixMLeftArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sixMLeftArc.setAttribute('d', 'M 42.5 30 A 30 30 0 0 1 12.5 0');
    sixMLeftArc.setAttribute('fill', 'none');
    sixMLeftArc.setAttribute('stroke', 'rgba(255, 255, 255, 0.7)');
    sixMLeftArc.setAttribute('stroke-width', '0.3');
    svg.appendChild(sixMLeftArc);

    // 6m line - right arc (center: 57.5%, 0%, radius: 30%)
    // Path: M 17500 0 A 6000 6000 0 0 1 11500 6000
    // Converted: M 87.5 0 A 30 30 0 0 1 57.5 30
    const sixMRightArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sixMRightArc.setAttribute('d', 'M 87.5 0 A 30 30 0 0 1 57.5 30');
    sixMRightArc.setAttribute('fill', 'none');
    sixMRightArc.setAttribute('stroke', 'rgba(255, 255, 255, 0.7)');
    sixMRightArc.setAttribute('stroke-width', '0.3');
    svg.appendChild(sixMRightArc);

    // 9m line - left arc (dashed, center: 42.5%, 0%, radius: 45%)
    // Path: M 8500 9000 A 9000 9000 0 0 1 0 2958
    // Converted: M 42.5 45 A 45 45 0 0 1 0 14.79
    const nineMLeftArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    nineMLeftArc.setAttribute('d', 'M 42.5 45 A 45 45 0 0 1 0 14.79');
    nineMLeftArc.setAttribute('fill', 'none');
    nineMLeftArc.setAttribute('stroke', 'rgba(255, 255, 255, 0.5)');
    nineMLeftArc.setAttribute('stroke-width', '0.25');
    nineMLeftArc.setAttribute('stroke-dasharray', '1.5 1.5');
    svg.appendChild(nineMLeftArc);

    // 9m line - right arc (dashed, center: 57.5%, 0%, radius: 45%)
    // Path: M 20000 2958 A 9000 9000 0 0 1 11500 9000
    // Converted: M 100 14.79 A 45 45 0 0 1 57.5 45
    const nineMRightArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    nineMRightArc.setAttribute('d', 'M 100 14.79 A 45 45 0 0 1 57.5 45');
    nineMRightArc.setAttribute('fill', 'none');
    nineMRightArc.setAttribute('stroke', 'rgba(255, 255, 255, 0.5)');
    nineMRightArc.setAttribute('stroke-width', '0.25');
    nineMRightArc.setAttribute('stroke-dasharray', '1.5 1.5');
    svg.appendChild(nineMRightArc);

    // 7m penalty line (y: 7000/20000 = 35%, x: 9500-10500/20000 = 47.5%-52.5%)
    const sevenMLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    sevenMLine.setAttribute('x1', '47.5');
    sevenMLine.setAttribute('y1', '35');
    sevenMLine.setAttribute('x2', '52.5');
    sevenMLine.setAttribute('y2', '35');
    sevenMLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.7)');
    sevenMLine.setAttribute('stroke-width', '0.3');
    svg.appendChild(sevenMLine);

    // GK 4m restriction mark (y: 4000/20000 = 20%, x: 9925-10075/20000 = 49.625%-50.375%)
    const gkMark = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gkMark.setAttribute('x1', '49.625');
    gkMark.setAttribute('y1', '20');
    gkMark.setAttribute('x2', '50.375');
    gkMark.setAttribute('y2', '20');
    gkMark.setAttribute('stroke', 'rgba(255, 255, 255, 0.7)');
    gkMark.setAttribute('stroke-width', '0.3');
    svg.appendChild(gkMark);

    return svg;
}

function renderCourt(courtElement, simulator) {
    courtElement.innerHTML = '';

    // Add SVG court lines
    const courtLines = createCourtLinesSVG();
    courtElement.appendChild(courtLines);

    // Create player icons (position-based)
    Object.entries(simulator.players).forEach(([pos, player]) => {
        let className = 'player-icon';
        if (player.isGearSecond) {
            className += ' gear-second';
        } else if (player.isAce) {
            className += ' ace';
        }
        const icon = createElement('div', className);
        icon.id = `player-${pos}`;
        icon.style.left = `${player.x}%`;
        icon.style.top = `${player.y}%`;
        icon.textContent = pos;
        icon.title = player.name + (player.isGearSecond ? ' [GEAR 2nd]' : player.isAce ? ' [ACE]' : '');
        courtElement.appendChild(icon);
    });

    // Create opponent icons
    Object.entries(simulator.opponents).forEach(([pos, opp]) => {
        let className = 'player-icon opponent';
        if (opp.isGearSecond) {
            className += ' gear-second';
        } else if (opp.isAce) {
            className += ' ace';
        }
        const icon = createElement('div', className);
        icon.id = `opponent-${pos}`;
        icon.style.left = `${opp.x}%`;
        icon.style.top = `${opp.y}%`;
        icon.textContent = pos;
        icon.title = opp.name + (opp.isGearSecond ? ' [GEAR 2nd]' : opp.isAce ? ' [ACE]' : '');
        courtElement.appendChild(icon);
    });

    // Create ball
    const ballPos = simulator.getBallPosition();
    const ball = createElement('div', 'ball');
    ball.id = 'ball';
    ball.style.left = `${ballPos.x}%`;
    ball.style.top = `${ballPos.y}%`;
    courtElement.appendChild(ball);
}

function updateCourtDisplay(courtElement, simulator) {
    // Update player positions
    Object.entries(simulator.players).forEach(([pos, player]) => {
        const icon = document.getElementById(`player-${pos}`);
        if (icon) {
            icon.style.left = `${player.x}%`;
            icon.style.top = `${player.y}%`;
        }
    });

    // Update opponent positions
    Object.entries(simulator.opponents).forEach(([pos, opp]) => {
        const icon = document.getElementById(`opponent-${pos}`);
        if (icon) {
            icon.style.left = `${opp.x}%`;
            icon.style.top = `${opp.y}%`;
        }
    });

    // Update ball position
    const ball = document.getElementById('ball');
    if (ball) {
        const ballPos = simulator.getBallPosition();
        ball.style.left = `${ballPos.x}%`;
        ball.style.top = `${ballPos.y}%`;
    }
}

// Result Screen
// Ace Awakening Screen
function renderAceAwakeningScreen(container, data) {
    const awakeningDiv = createElement('div', 'ace-awakening-screen');

    // Victory message
    const victoryText = createElement('h2', 'victory-message',
        `${data.opponentName}に勝った。`);
    awakeningDiv.appendChild(victoryText);

    // Awakening message
    if (data.awakening) {
        const awakeningText = createElement('p', 'awakening-message',
            `その勝利をきっかけに、${data.awakening.positionName}が${data.awakening.type === 'gearSecond' ? 'ギアセカンド' : 'エース'}に覚醒！`);
        awakeningDiv.appendChild(awakeningText);
    }

    // Continue button
    const continueBtn = createButton('次へ', () => {
        switchScreen(SCREENS.RESULT, data.resultData);
    }, 'btn btn-primary btn-large');
    awakeningDiv.appendChild(continueBtn);

    container.appendChild(awakeningDiv);
}

function renderResultScreen(container, data) {
    const resultDiv = createElement('div', 'result-screen');

    const resultText = data.won ? CONFIG.MESSAGES.RESULT.win : CONFIG.MESSAGES.RESULT.lose;
    const resultClass = data.won ? 'result-win' : 'result-lose';

    const resultHeader = createElement('h2', `result-header ${resultClass}`, resultText);
    resultDiv.appendChild(resultHeader);

    const scoreDisplay = createElement('div', 'final-score');
    scoreDisplay.innerHTML = `
        <h3>${gameState.team.name} ${data.score.player} - ${data.score.opponent} ${data.opponent.name}</h3>
    `;
    resultDiv.appendChild(scoreDisplay);

    if (data.won) {
        if (gameState.championshipWon) {
            const championText = createElement('p', 'championship-text', CONFIG.MESSAGES.RESULT.championship);
            resultDiv.appendChild(championText);
        } else {
            const nextRoundText = createElement('p', 'next-round-text', '次の試合に進みます');
            resultDiv.appendChild(nextRoundText);
        }
    } else {
        const gameOverText = createElement('p', 'game-over-text', 'ゲームオーバー');
        resultDiv.appendChild(gameOverText);
    }

    const btnContainer = createElement('div', 'result-buttons');

    if (gameState.gameCompleted) {
        const titleBtn = createButton('タイトルに戻る', () => {
            currentTactics = [];
            switchScreen(SCREENS.TITLE);
        }, 'btn btn-primary btn-large');
        btnContainer.appendChild(titleBtn);
    } else {
        const continueBtn = createButton('次へ進む', () => {
            currentTactics = [];
            advanceDay();
            saveGame();
            switchScreen(SCREENS.MAIN);
        }, 'btn btn-primary btn-large');
        btnContainer.appendChild(continueBtn);
    }

    resultDiv.appendChild(btnContainer);
    container.appendChild(resultDiv);

    // Cleanup match simulator
    if (matchSimulator) {
        matchSimulator.destroy();
        matchSimulator = null;
    }
}

// Tournament Screen
function renderTournamentScreen(container) {
    const tournamentDiv = createElement('div', 'tournament-screen');

    const header = createElement('h2', 'tournament-header', 'トーナメント表');
    tournamentDiv.appendChild(header);

    const bracket = getSimplifiedBracket();

    const bracketContainer = createElement('div', 'bracket-container');

    bracket.forEach(round => {
        const roundDiv = createElement('div', 'bracket-round');

        const roundHeader = createElement('h3', 'round-header', round.roundName);
        roundDiv.appendChild(roundHeader);

        const matchInfo = createElement('div', 'match-info');
        matchInfo.innerHTML = `
            <p><strong>対戦相手:</strong> ${round.opponent}</p>
            <p><strong>結果:</strong> ${round.result}</p>
            <p><strong>スコア:</strong> ${round.score}</p>
        `;

        roundDiv.appendChild(matchInfo);
        bracketContainer.appendChild(roundDiv);
    });

    tournamentDiv.appendChild(bracketContainer);

    const backBtn = createButton('戻る', () => {
        switchScreen(SCREENS.MAIN);
    }, 'btn btn-primary');
    tournamentDiv.appendChild(backBtn);

    container.appendChild(tournamentDiv);
}

// Initialize screens module
export function initializeScreens() {
    switchScreen(SCREENS.TITLE);
}
