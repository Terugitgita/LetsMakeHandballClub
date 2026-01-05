// screens.js - UI Screen Management

import { CONFIG } from './config.js';
import { gameState, initializeNewGame, saveGame, loadGame, hasSaveData, advanceDay, recordMatchResult, setCurrentMatch, clearCurrentMatch, isBoycottActive, changeCaptainPersonality, applyBoycottRestPenalty, saveLastTactics, getLastTactics, saveTacticsPreset, getTacticsPresets, getTacticsPreset, deleteTacticsPreset, simulateAllDaysTraining, getAbilityStatus, getAbilitiesByCategory, recordAction, getActionHistoryText, getMatchStateText } from './gameState.js';
import { initializeTournament, getNextOpponent, getCurrentRoundName, getSimplifiedBracket, processRoundResults, advanceTournament } from './tournament.js';
import { getAvailableMenus, previewTrainingGrowth, executeTraining, getCaptainInfo } from './training.js';
import { MatchSimulator, createTactic, validateTactics } from './match.js';
import { createElement, createButton, deepClone } from './utils.js';
import { audioManager } from './audio.js';
import { assetManager } from './assets.js';

// 音声・画像を初回ロード開始（バックグラウンドで）
let assetsLoadStarted = false;
function startLoadingAssets() {
    if (!assetsLoadStarted) {
        assetsLoadStarted = true;
        audioManager.loadSounds().catch(err => console.warn('Audio loading failed:', err));
        assetManager.loadImages().catch(err => console.warn('Image loading failed:', err));
    }
}

// Senryu data cache
let senryuCache = null;

// Load senryu data from external files
async function loadSenryuData() {
    if (senryuCache) return senryuCache;

    const files = [
        'docs/Random Senryu/Random_Senryu_01.txt',  // 上の句
        'docs/Random Senryu/Random_Senryu_02.txt',  // 中の句
        'docs/Random Senryu/Random_Senryu_03.txt'   // 下の句
    ];

    try {
        const [kamiRes, nakaRes, shimoRes] = await Promise.all(
            files.map(f => fetch(f).then(r => r.ok ? r.text() : Promise.reject()))
        );

        senryuCache = {
            kami: kamiRes.split('\n').filter(l => l.trim()),
            naka: nakaRes.split('\n').filter(l => l.trim()),
            shimo: shimoRes.split('\n').filter(l => l.trim())
        };
        return senryuCache;
    } catch (error) {
        console.warn('川柳ファイル読み込み失敗、デフォルト使用:', error);
        // フォールバック
        return {
            kami: ["ずっきゅんと", "おっさんが", "たまにはさ"],
            naka: ["ずきゅずきゅずっきゅん", "イチゴを食べて", "外で遊んで"],
            shimo: ["たまんない", "んなアホな", "がけっぷち"]
        };
    }
}

// Generate random senryu
function generateRandomSenryu(data) {
    const randomKami = data.kami[Math.floor(Math.random() * data.kami.length)];
    const randomNaka = data.naka[Math.floor(Math.random() * data.naka.length)];
    const randomShimo = data.shimo[Math.floor(Math.random() * data.shimo.length)];

    return `${randomKami}　${randomNaka}　${randomShimo}`;
}

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

    // P70: 画面遷移をアクション履歴に記録
    recordAction('screenChange', { screen: screenName });

    const container = document.getElementById('game-container');
    container.innerHTML = '';
    container.className = `screen-${screenName}`;

    // MATCH画面以外に遷移する場合はmatchSimulatorをクリーンアップ
    if (screenName !== SCREENS.MATCH && matchSimulator) {
        matchSimulator.destroy();
        matchSimulator = null;
    }

    // 設定ボタンを追加（全画面共通）
    addSettingsButton(container);

    // P70: 「作者に一言」ボタンを追加（全画面共通）
    addFeedbackButton(container);

    // 初回のみアセットロード開始（バックグラウンド）
    startLoadingAssets();

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

    // BGMを再生
    playScreenBGM(screenName);
}

// 設定ボタンを画面左上に追加
function addSettingsButton(container) {
    const settingsBtn = createElement('button', 'settings-button');
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.title = '設定';

    settingsBtn.addEventListener('click', () => {
        showSettingsModal();
    });

    container.appendChild(settingsBtn);
}

// 設定モーダルを表示
function showSettingsModal() {
    const modal = createElement('div', 'settings-modal');
    const modalContent = createElement('div', 'settings-modal-content');

    const title = createElement('h2', '', '設定');
    modalContent.appendChild(title);

    // 音量設定
    const soundLabel = createElement('label', '', '音声: ');
    const muteBtn = createButton(
        audioManager.muted ? '🔇 OFF' : '🔊 ON',
        () => {
            const muted = audioManager.toggleMute();
            muteBtn.textContent = muted ? '🔇 OFF' : '🔊 ON';
        },
        'btn btn-secondary'
    );
    soundLabel.appendChild(muteBtn);
    modalContent.appendChild(soundLabel);

    // 試合中または作戦設定中の場合は「試合前に戻る」ボタンを追加
    console.log('showSettingsModal: currentScreen=', currentScreen, 'SCREENS.MATCH=', SCREENS.MATCH, 'gameState.currentMatch=', gameState.currentMatch);

    if (currentScreen === SCREENS.MATCH && gameState.currentMatch) {
        // 試合中 → 作戦設定画面に戻る
        const backToSetupBtn = createButton('作戦設定に戻る', () => {
            modal.remove();
            if (matchSimulator) {
                matchSimulator.destroy();
                matchSimulator = null;
            }
            switchScreen(SCREENS.MATCH_SETUP, {
                opponent: gameState.currentMatch.opponent,
                retryMode: true
            });
        }, 'btn btn-warning');
        modalContent.appendChild(backToSetupBtn);
    }

    if (currentScreen === SCREENS.MATCH_SETUP && gameState.currentMatch) {
        // 作戦設定画面 → 平日画面に戻る
        const backToMainBtn = createButton('平日画面に戻る', () => {
            modal.remove();
            clearCurrentMatch();
            switchScreen(SCREENS.MAIN);
        }, 'btn btn-warning');
        modalContent.appendChild(backToMainBtn);
    }

    // 閉じるボタン
    const closeBtn = createButton('閉じる', () => {
        modal.remove();
    }, 'btn btn-primary');
    modalContent.appendChild(closeBtn);

    modal.appendChild(modalContent);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}

// P70: 「作者に一言」ボタンを追加（右上固定）
function addFeedbackButton(container) {
    const feedbackBtn = createElement('button', 'feedback-button');
    feedbackBtn.innerHTML = '💬';
    feedbackBtn.title = '作者に一言';

    // オフライン時はグレーアウト
    const updateOnlineStatus = () => {
        if (navigator.onLine) {
            feedbackBtn.disabled = false;
            feedbackBtn.classList.remove('offline');
            feedbackBtn.title = '作者に一言';
        } else {
            feedbackBtn.disabled = true;
            feedbackBtn.classList.add('offline');
            feedbackBtn.title = '作者に一言（オフライン）';
        }
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    feedbackBtn.addEventListener('click', () => {
        if (navigator.onLine) {
            showFeedbackModal();
        }
    });

    container.appendChild(feedbackBtn);
}

// P70: フィードバックモーダルを表示
function showFeedbackModal() {
    const modal = createElement('div', 'feedback-modal');
    const modalContent = createElement('div', 'feedback-modal-content');

    const title = createElement('h2', '', '💬 作者に一言');
    modalContent.appendChild(title);

    // タブ切り替え
    const tabContainer = createElement('div', 'feedback-tabs');
    const bugReportTab = createButton('🐛 バグ報告', () => switchTab('bug'), 'feedback-tab active');
    const feedbackTab = createButton('💡 要望・意見', () => switchTab('feedback'), 'feedback-tab');
    const viewPostsTab = createButton('📋 投稿一覧', () => switchTab('posts'), 'feedback-tab');
    tabContainer.appendChild(bugReportTab);
    tabContainer.appendChild(feedbackTab);
    tabContainer.appendChild(viewPostsTab);
    modalContent.appendChild(tabContainer);

    // コンテンツエリア
    const contentArea = createElement('div', 'feedback-content-area');
    modalContent.appendChild(contentArea);

    function switchTab(tab) {
        bugReportTab.classList.toggle('active', tab === 'bug');
        feedbackTab.classList.toggle('active', tab === 'feedback');
        viewPostsTab.classList.toggle('active', tab === 'posts');
        renderTabContent(tab, contentArea);
    }

    // 初期表示
    renderTabContent('bug', contentArea);

    // 閉じるボタン
    const closeBtn = createButton('閉じる', () => {
        modal.remove();
    }, 'btn btn-secondary');
    modalContent.appendChild(closeBtn);

    modal.appendChild(modalContent);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
}

// P70: タブコンテンツをレンダリング
function renderTabContent(tab, container) {
    container.innerHTML = '';

    if (tab === 'bug') {
        renderBugReportForm(container);
    } else if (tab === 'feedback') {
        renderFeedbackForm(container);
    } else if (tab === 'posts') {
        renderPostsList(container);
    }
}

// P70: バグ報告フォーム
function renderBugReportForm(container) {
    // 「今！」ボタン
    const nowBtn = createButton('🕐 今！（直近の状況を自動記載）', () => {
        const historyText = getActionHistoryText();
        const matchText = gameState.currentMatch ? getMatchStateText() : '';
        bugTextarea.value = `【直近の操作履歴】\n${historyText}\n\n${matchText}\n\n【バグの詳細】\nここに詳細を記入してください`;
    }, 'btn btn-info feedback-now-btn');
    container.appendChild(nowBtn);

    // テキストエリア
    const bugTextarea = createElement('textarea', 'feedback-textarea');
    bugTextarea.placeholder = 'バグの内容を記入してください...\n「今！」ボタンを押すと直近の操作履歴が自動で入力されます。';
    bugTextarea.rows = 10;
    container.appendChild(bugTextarea);

    // ニックネーム入力
    const nicknameLabel = createElement('label', '', 'ニックネーム（任意）: ');
    const nicknameInput = createElement('input', 'feedback-nickname');
    nicknameInput.type = 'text';
    nicknameInput.placeholder = '匿名';
    nicknameInput.value = localStorage.getItem('feedbackNickname') || '';
    nicknameLabel.appendChild(nicknameInput);
    container.appendChild(nicknameLabel);

    // 投稿ボタン
    const submitBtn = createButton('📤 投稿する', () => {
        submitFeedback('バグ報告', bugTextarea.value, nicknameInput.value);
    }, 'btn btn-primary feedback-submit-btn');
    container.appendChild(submitBtn);
}

// P70: 要望・意見フォーム
function renderFeedbackForm(container) {
    // カテゴリ選択
    const categoryLabel = createElement('label', '', 'カテゴリ: ');
    const categorySelect = createElement('select', 'feedback-category');
    const categories = [
        { value: 'feature', label: '機能要望' },
        { value: 'spec', label: '仕様修正' },
        { value: 'newgame', label: '新ゲーム案' },
        { value: 'other', label: '自由投稿' }
    ];
    categories.forEach(cat => {
        const option = createElement('option');
        option.value = cat.value;
        option.textContent = cat.label;
        categorySelect.appendChild(option);
    });
    categoryLabel.appendChild(categorySelect);
    container.appendChild(categoryLabel);

    // テキストエリア
    const feedbackTextarea = createElement('textarea', 'feedback-textarea');
    feedbackTextarea.placeholder = '要望・意見を記入してください...';
    feedbackTextarea.rows = 8;
    container.appendChild(feedbackTextarea);

    // ニックネーム入力
    const nicknameLabel = createElement('label', '', 'ニックネーム（任意）: ');
    const nicknameInput = createElement('input', 'feedback-nickname');
    nicknameInput.type = 'text';
    nicknameInput.placeholder = '匿名';
    nicknameInput.value = localStorage.getItem('feedbackNickname') || '';
    nicknameLabel.appendChild(nicknameInput);
    container.appendChild(nicknameLabel);

    // 投稿ボタン
    const submitBtn = createButton('📤 投稿する', () => {
        const categoryText = categories.find(c => c.value === categorySelect.value)?.label || 'その他';
        submitFeedback(categoryText, feedbackTextarea.value, nicknameInput.value);
    }, 'btn btn-primary feedback-submit-btn');
    container.appendChild(submitBtn);
}

// P70: 投稿一覧表示
function renderPostsList(container) {
    const loadingText = createElement('p', '', '投稿を読み込み中...');
    container.appendChild(loadingText);

    // GitHub Gistから投稿を取得
    fetchPublicPosts().then(posts => {
        container.innerHTML = '';

        if (posts.length === 0) {
            const noPostsText = createElement('p', 'feedback-no-posts', 'まだ投稿はありません。');
            container.appendChild(noPostsText);
            return;
        }

        posts.forEach(post => {
            const card = createElement('div', 'feedback-card');

            const cardHeader = createElement('div', 'feedback-card-header');
            const categoryBadge = createElement('span', `feedback-badge ${post.category}`, post.categoryLabel);
            const authorSpan = createElement('span', 'feedback-author', `👤 ${post.nickname || '匿名'}`);
            const dateSpan = createElement('span', 'feedback-date', post.date);
            cardHeader.appendChild(categoryBadge);
            cardHeader.appendChild(authorSpan);
            cardHeader.appendChild(dateSpan);
            card.appendChild(cardHeader);

            const cardBody = createElement('div', 'feedback-card-body');
            cardBody.textContent = post.content;
            card.appendChild(cardBody);

            if (post.reply) {
                const replyDiv = createElement('div', 'feedback-reply');
                replyDiv.innerHTML = `<strong>💬 作者返信:</strong> ${post.reply}`;
                card.appendChild(replyDiv);
            }

            container.appendChild(card);
        });
    }).catch(err => {
        container.innerHTML = '';
        const errorText = createElement('p', 'feedback-error', '投稿の読み込みに失敗しました。');
        container.appendChild(errorText);
        console.error('Failed to fetch posts:', err);
    });
}

// P70: 投稿を送信（Google Formsへ）
function submitFeedback(category, content, nickname) {
    if (!content.trim()) {
        showToast('内容を入力してください', 'error');
        return;
    }

    // ニックネームを保存
    if (nickname) {
        localStorage.setItem('feedbackNickname', nickname);
    }

    // Google Forms URL（ユーザーが設定する必要あり）
    const GOOGLE_FORM_URL = CONFIG.FEEDBACK?.GOOGLE_FORM_URL;

    if (!GOOGLE_FORM_URL) {
        // Google Formsが設定されていない場合、投稿内容をコピー可能にする
        const postData = `【カテゴリ】${category}\n【ニックネーム】${nickname || '匿名'}\n【内容】\n${content}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(postData).then(() => {
                showToast('投稿内容をクリップボードにコピーしました。\n作者への連絡方法は別途ご確認ください。', 'info');
            });
        } else {
            console.log('投稿内容:', postData);
            showToast('投稿機能は現在準備中です', 'info');
        }
        return;
    }

    // Google Formsに送信
    const formData = new FormData();
    formData.append('entry.category', category);
    formData.append('entry.nickname', nickname || '匿名');
    formData.append('entry.content', content);
    formData.append('entry.timestamp', new Date().toISOString());

    fetch(GOOGLE_FORM_URL, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
    }).then(() => {
        showToast('投稿しました！ありがとうございます。', 'success');
    }).catch(err => {
        showToast('投稿に失敗しました', 'error');
        console.error('Submit error:', err);
    });
}

// P70: 公開投稿を取得（GitHub Gistから）
async function fetchPublicPosts() {
    const GIST_URL = CONFIG.FEEDBACK?.GIST_URL;

    if (!GIST_URL) {
        // Gistが設定されていない場合、サンプルデータを返す
        return [
            {
                id: 'sample1',
                category: 'feature',
                categoryLabel: '機能要望',
                nickname: 'サンプル',
                date: '2026-01-05',
                content: 'これはサンプル投稿です。実際の投稿はGitHub Gistから読み込まれます。',
                reply: null
            }
        ];
    }

    try {
        const response = await fetch(GIST_URL);
        const data = await response.json();
        return data.posts || [];
    } catch (err) {
        console.error('Failed to fetch posts:', err);
        return [];
    }
}

// P70: トースト通知を表示
function showToast(message, type = 'info') {
    const toast = createElement('div', `toast toast-${type}`);
    toast.textContent = message;
    document.body.appendChild(toast);

    // フェードイン
    setTimeout(() => toast.classList.add('show'), 10);

    // 3秒後に消える
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 画面に応じたBGMを再生
function playScreenBGM(screenName) {
    switch (screenName) {
        case SCREENS.TITLE:
            // オープニングは音楽なし（静寂）
            audioManager.stopBGM();
            break;
        case SCREENS.MAIN:
        case SCREENS.TRAINING:
        case SCREENS.TOURNAMENT:
            audioManager.playBGM('practice');
            break;
        case SCREENS.MATCH:
            audioManager.playBGM('match');
            break;
        case SCREENS.ACE_AWAKENING:
            audioManager.playBGM('awakening', false);
            break;
        case SCREENS.RESULT:
            // 結果画面のBGMは renderResultScreen 内で勝敗により切り替え
            break;
    }
}

// Title Screen
function renderTitleScreen(container) {
    const titleDiv = createElement('div', 'title-screen');

    // オープニング画像を背景として設定する関数
    const applyBackgroundImage = () => {
        const openingImg = assetManager.getImage('opening');
        if (openingImg) {
            titleDiv.style.backgroundImage = `url(${openingImg.src})`;
            titleDiv.style.backgroundSize = 'cover';
            titleDiv.style.backgroundPosition = 'center';
        }
    };

    // 既にロード済みなら即座に適用
    applyBackgroundImage();

    // まだロード中なら、ロード完了時に再適用
    if (!assetManager.isLoaded()) {
        assetManager.loadImages().then(() => {
            applyBackgroundImage();
        });
    }

    const title = createElement('h1', 'game-title', CONFIG.MESSAGES.TITLE.gameTitle);

    // サブタイトルで「死に戻り」を強調表示
    const subtitle = createElement('p', 'game-subtitle');
    const subtitleText = CONFIG.MESSAGES.TITLE.subtitle;
    const highlight = CONFIG.MESSAGES.TITLE.subtitleHighlight;
    if (highlight && subtitleText.includes(highlight)) {
        const parts = subtitleText.split(highlight);
        subtitle.innerHTML = parts[0] + '<span class="subtitle-highlight">' + highlight + '</span>' + parts[1];
    } else {
        subtitle.textContent = subtitleText;
    }

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

    // すぅぅぅぅてぇの効果音を一度だけ再生
    if (gameState.captain.name === 'すぅぅぅぅてぇ') {
        audioManager.playSuteeOnce();
    }

    // キャプテン性格アイコンを表示
    const captainImg = assetManager.getCaptainImage(gameState.captain.personality);
    if (captainImg) {
        const imgElement = createElement('img', 'captain-personality-icon');
        imgElement.src = captainImg.src;
        imgElement.alt = gameState.captain.personality;
        captainDiv.appendChild(imgElement);
    }

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

    // Tactics presets management button
    const tacticsBtn = createButton('作戦セット管理', () => {
        showTacticsPresetsManagementModal();
    }, 'btn btn-secondary');
    actionDiv.appendChild(tacticsBtn);

    // Player abilities button (PowerPro style)
    const abilitiesBtn = createButton('📊 選手能力', () => {
        showPlayerAbilitiesModal();
    }, 'btn btn-secondary');
    actionDiv.appendChild(abilitiesBtn);

    // Reset button (add to action buttons for visibility)
    let resetClickCount = 0;
    let resetTimeout = null;
    const resetBtn = createButton('🔄 リセット', () => {
        resetClickCount++;

        if (resetClickCount === 1) {
            // First click - show warning
            resetBtn.textContent = '⚠️ 本当にリセット？もう一度押してください';
            resetBtn.style.backgroundColor = '#ff6600';

            // Reset after 5 seconds if not clicked again
            resetTimeout = setTimeout(() => {
                resetClickCount = 0;
                resetBtn.textContent = '🔄 リセット';
                resetBtn.style.backgroundColor = '';
            }, 5000);
        } else if (resetClickCount === 2) {
            // Second click - final confirmation
            clearTimeout(resetTimeout);
            resetBtn.textContent = '🚨 最終確認！もう一度押すと削除されます';
            resetBtn.style.backgroundColor = '#cc0000';

            resetTimeout = setTimeout(() => {
                resetClickCount = 0;
                resetBtn.textContent = '🔄 リセット';
                resetBtn.style.backgroundColor = '';
            }, 5000);
        } else if (resetClickCount >= 3) {
            // Third click - execute reset
            clearTimeout(resetTimeout);
            localStorage.removeItem(CONFIG.GAME.STORAGE_KEY);
            location.reload();
        }
    }, 'btn btn-danger');
    actionDiv.appendChild(resetBtn);

    // Save/Load buttons
    const saveLoadDiv = createElement('div', 'save-load-buttons');

    let saveClickCount = 0;
    let saveTimeout = null;
    const saveBtn = createButton('手動セーブ', () => {
        saveClickCount++;

        if (saveClickCount === 1) {
            // First click - show confirmation
            saveBtn.textContent = '💾 上書き保存します。もう一度押してください';
            saveBtn.style.backgroundColor = '#ff9900';

            // Reset after 3 seconds
            saveTimeout = setTimeout(() => {
                saveClickCount = 0;
                saveBtn.textContent = '手動セーブ';
                saveBtn.style.backgroundColor = '';
            }, 3000);
        } else if (saveClickCount >= 2) {
            // Second click - execute save
            clearTimeout(saveTimeout);
            const success = saveGame();

            if (success) {
                saveBtn.textContent = '✅ セーブしました';
                saveBtn.style.backgroundColor = '#00cc66';
            } else {
                saveBtn.textContent = '❌ セーブに失敗しました';
                saveBtn.style.backgroundColor = '#cc0000';
            }

            // Reset after 2 seconds
            setTimeout(() => {
                saveClickCount = 0;
                saveBtn.textContent = '手動セーブ';
                saveBtn.style.backgroundColor = '';
            }, 2000);
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

        // Current stats (横並び表示)
        const statsDiv = createElement('div', 'current-stats');
        statsDiv.innerHTML = `
            <h3>現在の能力値</h3>
            <div class="stats-row">
                <span class="stat-item">🏐 パス: ${gameState.team.stats.pass.toFixed(1)}</span>
                <span class="stat-item">⚽ ドリブル: ${gameState.team.stats.dribble.toFixed(1)}</span>
                <span class="stat-item">🎯 シュート: ${gameState.team.stats.shoot.toFixed(1)}</span>
            </div>
        `;
        trainingDiv.appendChild(statsDiv);

        // Boycott options
        const optionsDiv = createElement('div', 'boycott-options');

        // Option 1: 仕方ないので今日は練習休み
        let restClickCount = 0;
        let restTimeout = null;
        const restOptionBtn = createButton('仕方ないので今日は練習休み', () => {
            restClickCount++;

            if (restClickCount === 1) {
                restOptionBtn.textContent = '⚠️ 全ステータス-0.3になります。もう一度押してください';
                restOptionBtn.style.backgroundColor = '#ff6600';

                restTimeout = setTimeout(() => {
                    restClickCount = 0;
                    restOptionBtn.textContent = '仕方ないので今日は練習休み';
                    restOptionBtn.style.backgroundColor = '';
                }, 3000);
            } else if (restClickCount >= 2) {
                clearTimeout(restTimeout);
                applyBoycottRestPenalty();
                advanceDay();
                saveGame();
                switchScreen(SCREENS.MAIN);
            }
        }, 'btn btn-warning');

        // Option 2: キャプテンと話し合い
        let talkClickCount = 0;
        let talkTimeout = null;
        const talkOptionBtn = createButton('キャプテンと話し合い', () => {
            talkClickCount++;

            if (talkClickCount === 1) {
                talkOptionBtn.textContent = '💬 性格がランダム変更されます。もう一度押してください';
                talkOptionBtn.style.backgroundColor = '#0066cc';

                talkTimeout = setTimeout(() => {
                    talkClickCount = 0;
                    talkOptionBtn.textContent = 'キャプテンと話し合い';
                    talkOptionBtn.style.backgroundColor = '';
                }, 3000);
            } else if (talkClickCount >= 2) {
                clearTimeout(talkTimeout);
                const newPersonality = changeCaptainPersonality();
                advanceDay();
                saveGame();
                talkOptionBtn.textContent = `✅ 性格が「${newPersonality}」に変わりました！`;
                talkOptionBtn.style.backgroundColor = '#00cc66';
                setTimeout(() => {
                    switchScreen(SCREENS.MAIN);
                }, 2000);
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

    // Current stats (横並び表示)
    const statsDiv = createElement('div', 'current-stats');
    statsDiv.innerHTML = `
        <h3>現在の能力値</h3>
        <div class="stats-row">
            <span class="stat-item">🏐 パス: ${gameState.team.stats.pass.toFixed(1)}</span>
            <span class="stat-item">⚽ ドリブル: ${gameState.team.stats.dribble.toFixed(1)}</span>
            <span class="stat-item">🎯 シュート: ${gameState.team.stats.shoot.toFixed(1)}</span>
        </div>
    `;
    trainingDiv.appendChild(statsDiv);

    // Training menus - Table format
    const menus = getAvailableMenus();
    const menuTable = createElement('table', 'training-menu-table');

    // Menu icons
    const menuIcons = {
        'パス練習': '🏐',
        'ドリブル練習': '⚽',
        'シュート練習': '🎯',
        '総合練習': '📊',
        '休養': '😴'
    };

    // Table header
    const thead = createElement('thead');
    thead.innerHTML = `
        <tr>
            <th class="menu-col">メニュー</th>
            <th class="stat-col">パス</th>
            <th class="stat-col">ドリブル</th>
            <th class="stat-col">シュート</th>
            <th class="action-col">選択</th>
        </tr>
    `;
    menuTable.appendChild(thead);

    const tbody = createElement('tbody');

    menus.forEach(menu => {
        const row = createElement('tr', 'training-menu-row');
        const preview = previewTrainingGrowth(menu.name);
        const icon = menuIcons[menu.name] || '📋';

        // Menu name cell with icon
        const menuCell = createElement('td', 'menu-cell');
        menuCell.innerHTML = `<span class="menu-icon">${icon}</span><span class="menu-name">${menu.name}</span>`;
        row.appendChild(menuCell);

        // Stat cells
        const passCell = createElement('td', 'stat-cell');
        passCell.textContent = preview?.pass || '-';
        if (preview?.pass && preview.pass !== '-') passCell.classList.add('stat-up');
        row.appendChild(passCell);

        const dribbleCell = createElement('td', 'stat-cell');
        dribbleCell.textContent = preview?.dribble || '-';
        if (preview?.dribble && preview.dribble !== '-') dribbleCell.classList.add('stat-up');
        row.appendChild(dribbleCell);

        const shootCell = createElement('td', 'stat-cell');
        shootCell.textContent = preview?.shoot || '-';
        if (preview?.shoot && preview.shoot !== '-') shootCell.classList.add('stat-up');
        row.appendChild(shootCell);

        // Action cell
        const actionCell = createElement('td', 'action-cell');
        const selectBtn = createButton('選択', () => {
            audioManager.playSE('training_select');
            const result = executeTraining(menu.name);
            if (result.success) {
                // P51: alertを削除
                advanceDay();
                saveGame();

                // Check for ability changes and show notification
                if (result.abilityChange && (result.abilityChange.overcameWeakness || result.abilityChange.acquiredStrength)) {
                    showAbilityChangeNotification(result.abilityChange, () => {
                        switchScreen(SCREENS.MAIN);
                    });
                } else {
                    switchScreen(SCREENS.MAIN);
                }
            }
            // P51: 失敗時のalertも削除
        }, 'btn btn-primary btn-small');
        actionCell.appendChild(selectBtn);

        // Add "fill all" button on weekdays
        if (gameState.currentDay >= 1 && gameState.currentDay <= 5) {
            let fillClickCount = 0;
            let fillTimeout = null;
            const fillAllBtn = createButton('全日', () => {
                const daysUntilMatch = 6 - gameState.currentDay;
                fillClickCount++;

                if (fillClickCount === 1) {
                    // Calculate expected growth for all days
                    const growth = simulateAllDaysTraining(menu.name, daysUntilMatch);
                    const growthText = `P+${growth.pass} D+${growth.dribble} S+${growth.shoot}`;
                    fillAllBtn.textContent = `${daysUntilMatch}日`;
                    fillAllBtn.style.backgroundColor = '#ff9900';
                    fillAllBtn.title = `残り${daysUntilMatch}日間「${menu.name}」を実行\n${growthText}\nもう一度押してください`;

                    // Show growth info in a tooltip-style element
                    let growthInfo = actionCell.querySelector('.fill-all-growth');
                    if (!growthInfo) {
                        growthInfo = createElement('div', 'fill-all-growth');
                        actionCell.appendChild(growthInfo);
                    }
                    growthInfo.innerHTML = `<small>${growthText}</small>`;
                    growthInfo.style.display = 'block';

                    fillTimeout = setTimeout(() => {
                        fillClickCount = 0;
                        fillAllBtn.textContent = '全日';
                        fillAllBtn.style.backgroundColor = '';
                        if (growthInfo) growthInfo.style.display = 'none';
                    }, 4000);
                } else if (fillClickCount >= 2) {
                    clearTimeout(fillTimeout);
                    let successCount = 0;
                    for (let i = 0; i < daysUntilMatch; i++) {
                        const result = executeTraining(menu.name);
                        if (result.success) {
                            successCount++;
                            advanceDay();
                        } else {
                            fillAllBtn.textContent = '❌';
                            fillAllBtn.style.backgroundColor = '#cc0000';
                            setTimeout(() => {
                                fillClickCount = 0;
                                fillAllBtn.textContent = '全日';
                                fillAllBtn.style.backgroundColor = '';
                            }, 3000);
                            return;
                        }
                    }

                    if (successCount > 0) {
                        fillAllBtn.textContent = '✅';
                        fillAllBtn.style.backgroundColor = '#00cc66';
                        saveGame();
                        setTimeout(() => {
                            switchScreen(SCREENS.MAIN);
                        }, 2000);
                    }
                }
            }, 'btn btn-secondary btn-small');
            fillAllBtn.title = '次の試合まで全てこの練習';
            actionCell.appendChild(fillAllBtn);
        }

        row.appendChild(actionCell);
        tbody.appendChild(row);
    });

    menuTable.appendChild(tbody);
    trainingDiv.appendChild(menuTable);

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

    // コンパクトなヘッダー情報（1行で地方と守備戦術）
    const opponentInfo = createElement('div', 'opponent-info-compact');
    const playerStats = gameState.team.stats;
    const opponentStats = data.opponent.stats;
    opponentInfo.innerHTML = `
        <div class="opponent-name-row">
            <strong>対戦相手:</strong> ${data.opponent.name}
            <span class="region-tactic">(${data.opponent.region} / ${data.opponent.tactic.name})</span>
        </div>
        <div class="attempts-row">
            <span class="attempts-remaining">残り死に戻り回数: <strong>${gameState.currentMatch.attemptsRemaining}</strong> / ${CONFIG.GAME.MAX_ATTEMPTS}</span>
        </div>
    `;

    // 能力値を表形式で表示
    const statsTable = createElement('table', 'stats-comparison-table');
    statsTable.innerHTML = `
        <thead>
            <tr>
                <th></th>
                <th>パス</th>
                <th>ドリブル</th>
                <th>シュート</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="team-label">ズッキュン中学</td>
                <td class="player-stat">${playerStats.pass.toFixed(1)}</td>
                <td class="player-stat">${playerStats.dribble.toFixed(1)}</td>
                <td class="player-stat">${playerStats.shoot.toFixed(1)}</td>
            </tr>
            <tr>
                <td class="team-label">${data.opponent.name}</td>
                <td class="opponent-stat">${opponentStats.pass.toFixed(1)}</td>
                <td class="opponent-stat">${opponentStats.dribble.toFixed(1)}</td>
                <td class="opponent-stat">${opponentStats.shoot.toFixed(1)}</td>
            </tr>
        </tbody>
    `;

    setupDiv.appendChild(header);
    setupDiv.appendChild(opponentInfo);
    setupDiv.appendChild(statsTable);

    // Load saved tactics if in retry mode, or load last tactics for new match
    if (data.retryMode && gameState.currentMatch.savedTactics.length > 0) {
        currentTactics = deepClone(gameState.currentMatch.savedTactics);
        // Keep the failedTacticIndex for red highlighting
    } else {
        // Try to load last used tactics as default
        const lastTactics = getLastTactics();
        currentTactics = lastTactics.length > 0 ? lastTactics : [];
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
                // P51: alertを削除
                return;
            }

            if (from === to) {
                // P51: alertを削除
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
                // P51: alertを削除
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
                // P51: alertを削除
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
                    // P51: alertを削除
                    return;
                }
                tacticData.passTo = passTo;
            }

            if (isEditingTactic && editingTacticIndex >= 0) {
                // Replace existing tactic
                currentTactics[editingTacticIndex] = tacticData;
                isEditingTactic = false;
                editingTacticIndex = -1;
                // P51: alertを削除
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
                // P51: alertを削除
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
                // P51: alertを削除
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
        const select = createElement('select', '');
        select.id = id;
        const positions = ['LW', 'RW', 'CB', 'LB', 'RB', 'P'];
        const positionKeys = ['LW', 'RW', 'CB', 'LB', 'RB', 'P'];

        const defaultOption = createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '選択...';
        select.appendChild(defaultOption);

        positions.forEach((pos, index) => {
            const option = createElement('option');
            option.value = pos;

            // Check if this position is an ace or gear second
            const isAce = gameState.team.aces.includes(index);
            const isGearSecond = gameState.team.gearSecond.includes(index);

            let displayName = CONFIG.POSITIONS[pos].name;
            if (isGearSecond) {
                displayName = `『${displayName}』★★`;  // Gear Second: double star
            } else if (isAce) {
                displayName = `『${displayName}』`;     // Ace: brackets
            }

            option.textContent = `${displayName} (${pos})`;
            if (isAce || isGearSecond) {
                option.style.fontWeight = 'bold';
                option.style.color = isGearSecond ? '#ff6600' : '#cc0000';
            }
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

    // Tactics preset controls
    const presetControls = createElement('div', 'preset-controls');

    // Save preset button
    const savePresetBtn = createButton('作戦保存', () => {
        if (currentTactics.length === 0) {
            // P51: alertを削除
            return;
        }
        const name = prompt('作戦名を入力してください:');
        if (name && name.trim()) {
            saveTacticsPreset(name.trim(), currentTactics);
            // P51: alertを削除
        }
    }, 'btn btn-primary');
    presetControls.appendChild(savePresetBtn);

    // Load preset button
    const loadPresetBtn = createButton('作戦読込', () => {
        showTacticsPresetModal(tacticList);
    }, 'btn btn-primary');
    presetControls.appendChild(loadPresetBtn);

    tacticBuilder.appendChild(presetControls);

    setupDiv.appendChild(tacticBuilder);

    // Start match button
    const startMatchBtn = createButton('試合開始', () => {
        const validation = validateTactics(currentTactics);
        if (!validation.valid) {
            // P51: alertを削除
            return;
        }

        // Save tactics for next match default
        saveLastTactics(currentTactics);

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
                const dirSelect = createElement('select', '');
                dirSelect.id = 'dir-select';
                CONFIG.ACTION.DRIBBLE.directions.forEach(dir => {
                    const opt = createElement('option');
                    opt.value = dir.id;
                    opt.textContent = dir.label;
                    dirSelect.appendChild(opt);
                });
                dirSelect.value = tactic.direction;

                const distLabel = createElement('label', '', '距離：');
                const distSelect = createElement('select', '');
                distSelect.id = 'dist-select';
                CONFIG.ACTION.DRIBBLE.distances.forEach(dist => {
                    const opt = createElement('option');
                    opt.value = dist.id;
                    opt.textContent = dist.label;
                    distSelect.appendChild(opt);
                });
                const distConfig = CONFIG.ACTION.DRIBBLE.distances.find(d => d.distance === tactic.distance);
                if (distConfig) distSelect.value = distConfig.id;

                const nextLabel = createElement('label', '', '次の行動：');
                const nextSelect = createElement('select', '');
                nextSelect.id = 'next-select';
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
                const typeSelect = createElement('select', '');
                typeSelect.id = 'shoot-type-select';
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
                            // P51: alertを削除
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
                            if (!passToSelect || !passToSelect.value) {
                                // P51: alertを削除
                                return;
                            }
                            // Validate that pass is not to the same person
                            if (ballHolder === passToSelect.value) {
                                // P51: alertを削除
                                return;
                            }
                            newTactic.passTo = passToSelect.value;
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
                    // P51: alertを削除
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
                const dribblePos = CONFIG.POSITIONS[ballHolder];
                const dirLabel = CONFIG.ACTION.DRIBBLE.directions.find(d => d.id === tactic.direction)?.label || tactic.direction;
                const distLabel = CONFIG.ACTION.DRIBBLE.distances.find(d => d.distance === tactic.distance)?.label || tactic.duration + '秒';
                const nextLabel = CONFIG.ACTION.DRIBBLE.nextActions.find(a => a.id === tactic.nextAction)?.label || tactic.nextAction;

                text += `${dribblePos.name}: ${dirLabel}に${distLabel}ドリブル → ${nextLabel}`;

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
            let deleteClickCount = 0;
            let deleteTimeout = null;

            // Create action buttons container
            const actionBtnsDiv = createElement('div', 'tactic-action-buttons');
            actionBtnsDiv.style.display = 'none';
            actionBtnsDiv.style.marginTop = '5px';

            const editBtn = createButton('✏️ 変更', () => {
                editTactic(i, listElement);
            }, 'btn btn-primary btn-small');

            const deleteBtn = createButton('🗑️ 削除', () => {
                deleteClickCount++;

                if (deleteClickCount === 1) {
                    deleteBtn.textContent = '⚠️ もう一度押すと削除';
                    deleteBtn.style.backgroundColor = '#ff0000';

                    deleteTimeout = setTimeout(() => {
                        deleteClickCount = 0;
                        deleteBtn.textContent = '🗑️ 削除';
                        deleteBtn.style.backgroundColor = '';
                    }, 3000);
                } else if (deleteClickCount >= 2) {
                    clearTimeout(deleteTimeout);
                    currentTactics.splice(i, 1);

                    // Reset failed tactic index if we deleted the failed tactic or earlier
                    if (gameState.currentMatch && gameState.currentMatch.failedTacticIndex !== null) {
                        if (i <= gameState.currentMatch.failedTacticIndex) {
                            gameState.currentMatch.failedTacticIndex = null;
                        }
                    }

                    updateTacticList(listElement);
                }
            }, 'btn btn-danger btn-small');

            actionBtnsDiv.appendChild(editBtn);
            actionBtnsDiv.appendChild(deleteBtn);

            item.addEventListener('click', (e) => {
                // Toggle action buttons
                if (e.target === item || e.target.classList.contains('tactic-text')) {
                    if (actionBtnsDiv.style.display === 'none') {
                        actionBtnsDiv.style.display = 'block';
                    } else {
                        actionBtnsDiv.style.display = 'none';
                        deleteClickCount = 0;
                        deleteBtn.textContent = '🗑️ 削除';
                        deleteBtn.style.backgroundColor = '';
                    }
                }
            });

            item.appendChild(actionBtnsDiv);

            listElement.appendChild(item);
        });
    }

    // Initialize empty list
    updateTacticList(tacticList);
}

// Show interception overlay
// P48: 「xxのyyを相手zzが止めた！」形式で表示
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

    // P48: 「xxのyyを相手zzが止めた！」形式でメッセージを構築
    let holderName = '';
    let actionName = '';
    let interceptorName = info.interceptor ? info.interceptor.name : 'GK';

    if (info.type === 'pass') {
        const fromPos = CONFIG.POSITIONS[info.from];
        holderName = fromPos ? fromPos.name : info.from;
        actionName = 'パス';
    } else if (info.type === 'shoot') {
        const shooterPos = CONFIG.POSITIONS[info.shooter];
        holderName = shooterPos ? shooterPos.name : info.shooter;
        actionName = 'シュート';
    } else if (info.type === 'dribble') {
        const holderPos = CONFIG.POSITIONS[info.ballHolder];
        holderName = holderPos ? holderPos.name : info.ballHolder;
        actionName = 'ドリブル';
    }

    // メインメッセージ
    const mainMessage = createElement('div', 'intercept-main-message',
        `${holderName}の${actionName}を相手${interceptorName}が止めた！`);
    messageBox.appendChild(mainMessage);

    // 「死に戻り発動！」のヘッダー表示
    const reviveHeader = createElement('div', 'revive-header', '死に戻り発動！');
    messageBox.appendChild(reviveHeader);

    // 残り回数表示
    const remainingText = createElement('div', 'remaining-attempts',
        `残り回数: ${gameState.currentMatch.attemptsRemaining}回`);
    messageBox.appendChild(remainingText);

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
                    // P68: AI試合を先にシミュレート（ラウンドインクリメント前）
                    processRoundResults();
                    const awakening = recordMatchResult(true, score.player, score.opponent);
                    saveGame();
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
                        // P51: alertを削除（死に戻り発動はインターセプト画面で表示済み）
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

    // Awakening message(s)
    if (data.awakening && Array.isArray(data.awakening) && data.awakening.length > 0) {
        data.awakening.forEach(awk => {
            const awakeningText = createElement('p', 'awakening-message',
                `その勝利をきっかけに、${awk.positionName}が${awk.type === 'gearSecond' ? 'ギアセカンド' : 'エース'}に覚醒！`);
            awakeningDiv.appendChild(awakeningText);
        });
    } else if (data.awakening && !Array.isArray(data.awakening)) {
        // Fallback for single awakening object (backwards compatibility)
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

    // 勝敗に応じたBGMを再生
    if (data.won) {
        audioManager.playBGM('victory', false);
    } else {
        audioManager.playBGM('lost');
    }

    // 勝敗に応じた画像を背景として設定
    const resultImage = assetManager.getImage(data.won ? 'result_victory' : 'result_lost');
    if (resultImage) {
        resultDiv.style.backgroundImage = `url(${resultImage.src})`;
        resultDiv.style.backgroundSize = 'cover';
        resultDiv.style.backgroundPosition = 'center';
    }

    const resultText = data.won ? CONFIG.MESSAGES.RESULT.win : CONFIG.MESSAGES.RESULT.lose;
    const resultClass = data.won ? 'result-win' : 'result-lose';

    const resultHeader = createElement('h2', `result-header ${resultClass}`, resultText);
    resultDiv.appendChild(resultHeader);

    const scoreClass = data.won ? 'score-win' : 'score-lose';
    const scoreDisplay = createElement('div', `final-score ${scoreClass}`);
    scoreDisplay.innerHTML = `
        <h3>${gameState.team.name} ${data.score.player} - ${data.score.opponent} ${data.opponent.name}</h3>
    `;
    resultDiv.appendChild(scoreDisplay);

    // Display random senryu
    const senryuContainer = createElement('div', 'senryu-container');
    senryuContainer.innerHTML = '<p class="senryu-loading">今日の一句：読み込み中...</p>';
    resultDiv.appendChild(senryuContainer);

    // Load and display senryu asynchronously
    loadSenryuData().then(data => {
        const senryu = generateRandomSenryu(data);
        senryuContainer.innerHTML = `
            <div class="senryu-display">
                <h4 class="senryu-title">今日の一句：</h4>
                <p class="senryu-text">${senryu}</p>
            </div>
        `;
    }).catch(error => {
        console.error('Senryu display error:', error);
        senryuContainer.innerHTML = '<p class="senryu-error">今日の一句：ずっきゅんと　ずきゅずきゅずっきゅん　たまんない</p>';
    });

    if (data.won) {
        if (gameState.championshipWon) {
            const championText = createElement('p', 'championship-text', CONFIG.MESSAGES.RESULT.championship);
            resultDiv.appendChild(championText);
        }
        // Removed: 次の試合に進みます (redundant with "次へ進む" button)
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

// Show tactics presets management modal (from main screen)
function showTacticsPresetsManagementModal() {
    const presets = getTacticsPresets();

    // Create modal overlay
    const overlay = createElement('div', 'modal-overlay');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';

    const modal = createElement('div', 'modal-content');
    modal.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%; max-height: 80%; overflow-y: auto;';

    const title = createElement('h3', '', '作戦セット管理');
    modal.appendChild(title);

    const info = createElement('p', '', '試合開始前画面で作戦を保存できます。');
    info.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 10px;';
    modal.appendChild(info);

    if (presets.length === 0) {
        const noPresets = createElement('p', '', '保存された作戦がありません');
        modal.appendChild(noPresets);
    } else {
        const presetList = createElement('div', 'preset-list');
        presetList.style.cssText = 'margin: 10px 0;';

        presets.forEach(preset => {
            const presetItem = createElement('div', 'preset-item');
            presetItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #ccc; margin-bottom: 5px; border-radius: 4px;';

            const nameSpan = createElement('span', '', `${preset.name} (${preset.tactics.length}手)`);
            nameSpan.style.cssText = 'flex: 1;';

            const deleteBtn = createButton('削除', (e) => {
                e.stopPropagation();
                if (confirm(`作戦「${preset.name}」を削除しますか？`)) {
                    deleteTacticsPreset(preset.name);
                    presetItem.remove();
                    if (presetList.children.length === 0) {
                        presetList.innerHTML = '<p>保存された作戦がありません</p>';
                    }
                }
            }, 'btn btn-danger btn-small');
            deleteBtn.style.cssText = 'margin-left: 10px; padding: 4px 8px; font-size: 12px;';

            presetItem.appendChild(nameSpan);
            presetItem.appendChild(deleteBtn);
            presetList.appendChild(presetItem);
        });

        modal.appendChild(presetList);
    }

    const closeBtn = createButton('閉じる', () => {
        document.body.removeChild(overlay);
    }, 'btn btn-secondary');
    closeBtn.style.cssText = 'margin-top: 10px;';
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

// Show ability change notification (after training)
function showAbilityChangeNotification(abilityChange, onClose) {
    // Create notification overlay
    const overlay = createElement('div', 'ability-notification-overlay');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center;';

    const notification = createElement('div', 'ability-notification');
    notification.style.cssText = 'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #eee; padding: 25px; border-radius: 16px; max-width: 400px; width: 90%; text-align: center; border: 2px solid #ffd700; box-shadow: 0 0 30px rgba(255,215,0,0.3);';

    if (abilityChange.overcameWeakness) {
        const weakness = abilityChange.overcameWeakness;
        notification.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">🎊</div>
            <h2 style="margin: 0 0 10px 0; color: #4ecdc4;">弱点克服！</h2>
            <div style="background: #333; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <div style="color: #ff6b6b; text-decoration: line-through; font-size: 14px; margin-bottom: 8px;">
                    ❌ ${weakness.name}
                </div>
                ${weakness.misconception ? `
                    <div style="border-top: 1px solid #555; padding-top: 10px; margin-top: 10px;">
                        <div style="color: #888; font-size: 11px; margin-bottom: 5px;">思考が変わった！</div>
                        <div style="color: #ff8888; font-size: 12px; text-decoration: line-through;">「${weakness.misconception.wrong}」</div>
                        <div style="color: #88ff88; font-size: 14px; margin-top: 5px;">↓</div>
                        <div style="color: #4ecdc4; font-size: 13px; font-weight: bold;">「${weakness.misconception.correct}」</div>
                    </div>
                ` : ''}
            </div>
            <div style="color: #888; font-size: 12px;">${weakness.categoryName}の弱点を克服</div>
        `;
    } else if (abilityChange.acquiredStrength) {
        const strength = abilityChange.acquiredStrength;
        notification.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">⭐</div>
            <h2 style="margin: 0 0 10px 0; color: #ffd700;">強み獲得！</h2>
            <div style="background: #333; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <div style="color: #4ecdc4; font-size: 18px; font-weight: bold;">
                    ✨ ${strength.name}
                </div>
            </div>
            <div style="color: #888; font-size: 12px;">${strength.categoryName}の強みを獲得</div>
        `;
    } else if (abilityChange.correctedMisconceptions) {
        // P64: Show notification when all misconceptions in a category are corrected
        const corrected = abilityChange.correctedMisconceptions;
        notification.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 15px;">💡</div>
            <h2 style="margin: 0 0 10px 0; color: #88ff88;">理解完了！</h2>
            <div style="background: #333; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <div style="color: #ffd700; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                    ${corrected.categoryName}の全弱点を克服！
                </div>
                <div style="color: #aaa; font-size: 11px; text-align: left;">
                    ${corrected.misconceptions.map(m =>
                        `<div style="padding: 4px 0; border-bottom: 1px dashed #555;">
                            <span style="color: #666; text-decoration: line-through;">${m.wrong}</span>
                            → <span style="color: #88ff88;">${m.correct}</span>
                        </div>`
                    ).join('')}
                </div>
            </div>
            <div style="color: #888; font-size: 12px;">全ての勘違いが正しい理解に！</div>
        `;
    }

    // Auto-close after delay
    const closeBtn = createButton('OK', () => {
        document.body.removeChild(overlay);
        if (onClose) onClose();
    }, 'btn btn-primary');
    closeBtn.style.cssText = 'margin-top: 15px; padding: 12px 40px; font-size: 16px;';
    notification.appendChild(closeBtn);

    overlay.appendChild(notification);
    document.body.appendChild(overlay);

    // Auto-close after 5 seconds
    setTimeout(() => {
        if (overlay.parentNode) {
            document.body.removeChild(overlay);
            if (onClose) onClose();
        }
    }, 5000);
}

// Show player abilities modal (PowerPro style)
function showPlayerAbilitiesModal() {
    const abilities = getAbilitiesByCategory();
    const status = getAbilityStatus();

    // Create modal overlay
    const overlay = createElement('div', 'modal-overlay');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center;';

    const modal = createElement('div', 'abilities-modal');
    modal.style.cssText = 'background: #1a1a2e; color: #eee; padding: 20px; border-radius: 12px; max-width: 600px; width: 95%; max-height: 85%; overflow-y: auto; font-family: monospace;';

    // Title with progress
    const titleDiv = createElement('div', 'abilities-title');
    titleDiv.style.cssText = 'text-align: center; margin-bottom: 15px; border-bottom: 2px solid #4a4a8a; padding-bottom: 10px;';
    titleDiv.innerHTML = `
        <h2 style="margin: 0; color: #ffd700;">📊 選手能力</h2>
        <p style="margin: 5px 0; font-size: 14px; color: #aaa;">
            弱点克服: ${status.overcomeWeaknesses}/${status.totalWeaknesses} |
            強み獲得: ${status.acquiredStrengths}/${status.totalStrengths}
        </p>
    `;
    modal.appendChild(titleDiv);

    // Render each category
    Object.entries(abilities).forEach(([categoryKey, category]) => {
        const categoryDiv = createElement('div', 'ability-category');
        categoryDiv.style.cssText = 'background: #252545; border-radius: 8px; padding: 12px; margin-bottom: 15px; border: 1px solid #4a4a8a;';

        // Category header with icon and role (P61)
        const categoryIcons = { wing: '🏃‍♂️', back: '💥', cb: '🧠', pv: '🧱' };
        const headerDiv = createElement('div', 'category-header');
        headerDiv.style.cssText = 'margin-bottom: 10px; border-bottom: 1px solid #4a4a8a; padding-bottom: 8px;';
        headerDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 18px; font-weight: bold; color: #ffd700;">${categoryIcons[categoryKey] || '⚡'} ${category.name}</span>
                <span style="font-size: 12px; color: #888;">${category.positions.join(', ')}</span>
            </div>
            <div style="font-size: 11px; color: #aaa; margin-top: 4px;">役割: ${category.role}</div>
        `;
        categoryDiv.appendChild(headerDiv);

        // Weaknesses section (P62: removed "赤特" label)
        const weaknessDiv = createElement('div', 'weaknesses-section');
        weaknessDiv.style.cssText = 'margin-bottom: 10px;';
        weaknessDiv.innerHTML = '<div style="color: #ff6b6b; font-size: 12px; margin-bottom: 5px;">▼ 弱点</div>';

        const weaknessList = createElement('div', 'weakness-list');
        weaknessList.style.cssText = 'display: flex; flex-wrap: wrap; gap: 5px;';

        category.weaknesses.forEach(weakness => {
            const badge = createElement('span', 'weakness-badge');
            if (weakness.overcome) {
                // Overcome weakness - strikethrough
                badge.style.cssText = 'background: #333; color: #666; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-decoration: line-through;';
                badge.textContent = weakness.name;
            } else {
                // Active weakness
                badge.style.cssText = 'background: #8b0000; color: #ffaaaa; padding: 4px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #ff6b6b;';
                badge.textContent = `❌ ${weakness.name}`;
            }
            weaknessList.appendChild(badge);
        });
        weaknessDiv.appendChild(weaknessList);

        // P63/P64: Misconceptions section (勘違い) - corrected status added in P64
        if (category.misconceptions && category.misconceptions.length > 0) {
            const misconceptionDiv = createElement('div', 'misconceptions-section');
            misconceptionDiv.style.cssText = 'margin-top: 8px;';

            // P64: Show different header based on correction status
            const allCorrected = category.allWeaknessesOvercome;
            if (allCorrected) {
                misconceptionDiv.innerHTML = '<div style="color: #88ff88; font-size: 11px; margin-bottom: 5px;">✓ 理解完了</div>';
            } else {
                misconceptionDiv.innerHTML = '<div style="color: #ff9966; font-size: 11px; margin-bottom: 5px;">▼ 勘違い → 正しい思考</div>';
            }

            const misconceptionList = createElement('div', 'misconception-list');
            misconceptionList.style.cssText = 'font-size: 11px;';

            category.misconceptions.forEach(m => {
                const item = createElement('div', 'misconception-item');
                // P64: Different style for corrected vs uncorrected misconceptions
                if (m.corrected) {
                    // 改善済み: 勘違いをグレーアウト＆取り消し線、正しい思考を強調
                    item.style.cssText = 'padding: 6px 8px; border-bottom: 1px dashed #3a5a3a; background: rgba(0,100,0,0.1); border-radius: 4px; margin-bottom: 4px;';
                    item.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="color: #555; text-decoration: line-through; font-size: 10px; opacity: 0.5;">${m.wrong}</span>
                            <span style="color: #555; font-size: 10px;">→</span>
                            <span style="color: #88ff88; font-weight: bold; font-size: 12px; background: rgba(0,255,0,0.1); padding: 2px 6px; border-radius: 3px;">✓ ${m.correct}</span>
                        </div>
                        <div style="font-size: 9px; color: #4a4; margin-top: 2px;">【現在の思考】</div>
                    `;
                } else {
                    // 未改善: 勘違い（現在の状態）を強調、正しい思考をグレーアウト
                    item.style.cssText = 'padding: 6px 8px; border-bottom: 1px dashed #5a3a3a; background: rgba(100,0,0,0.1); border-radius: 4px; margin-bottom: 4px;';
                    item.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="color: #ff6666; font-weight: bold; font-size: 12px; background: rgba(255,0,0,0.15); padding: 2px 6px; border-radius: 3px;">✗ ${m.wrong}</span>
                            <span style="color: #555; font-size: 10px;">→</span>
                            <span style="color: #555; font-size: 10px; opacity: 0.5;">${m.correct}</span>
                        </div>
                        <div style="font-size: 9px; color: #a44; margin-top: 2px;">【現在の思考】← 改善が必要</div>
                    `;
                }
                misconceptionList.appendChild(item);
            });

            misconceptionDiv.appendChild(misconceptionList);
            weaknessDiv.appendChild(misconceptionDiv);
        }

        categoryDiv.appendChild(weaknessDiv);

        // Strengths section (P62: removed "青特" label, P65: requires Ace awakening)
        const strengthDiv = createElement('div', 'strengths-section');
        // P65: Show ace requirement hint
        const aceHint = category.hasAce ? (category.hasGearSecond ? ' 🔥' : ' ⭐') : '';
        strengthDiv.innerHTML = `<div style="color: #4ecdc4; font-size: 12px; margin-bottom: 5px;">▼ 強み${aceHint}${!category.hasAce ? ' <span style="font-size: 10px; color: #888;">(エース覚醒で有効化)</span>' : ''}</div>`;

        const strengthList = createElement('div', 'strength-list');
        strengthList.style.cssText = 'display: flex; flex-wrap: wrap; gap: 5px;';

        category.strengths.forEach(strength => {
            const badge = createElement('span', 'strength-badge');
            // P65: Symbol based on gear second status
            const symbol = strength.gearSecond ? '◎' : '○';

            if (strength.active) {
                // P65: Active strength (acquired + ace)
                if (strength.gearSecond) {
                    // Gear Second: golden glow
                    badge.style.cssText = 'background: linear-gradient(135deg, #664400 0%, #886600 100%); color: #ffdd00; padding: 4px 8px; border-radius: 4px; font-size: 12px; border: 2px solid #ffaa00; box-shadow: 0 0 8px rgba(255,170,0,0.5);';
                    badge.textContent = `🔥 ◎${strength.name}`;
                } else {
                    // Normal Ace
                    badge.style.cssText = 'background: #006666; color: #aaffff; padding: 4px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #4ecdc4;';
                    badge.textContent = `✨ ○${strength.name}`;
                }
            } else if (strength.acquired) {
                // P65: Acquired but not active (no ace yet)
                badge.style.cssText = 'background: #333; color: #668888; padding: 4px 8px; border-radius: 4px; font-size: 12px; border: 1px solid #446666;';
                badge.textContent = `💤 ${symbol}${strength.name}`;
                badge.title = 'エース覚醒で有効化';
            } else {
                // Not yet acquired
                badge.style.cssText = 'background: #333; color: #666; padding: 4px 8px; border-radius: 4px; font-size: 12px; border: 1px dashed #555;';
                badge.textContent = `${symbol} ${strength.name}`;
            }
            strengthList.appendChild(badge);
        });
        strengthDiv.appendChild(strengthList);
        categoryDiv.appendChild(strengthDiv);

        modal.appendChild(categoryDiv);
    });

    // Training progress info
    const progressDiv = createElement('div', 'training-progress');
    progressDiv.style.cssText = 'background: #1a1a2e; border: 1px solid #4a4a8a; border-radius: 8px; padding: 10px; margin-bottom: 15px;';
    progressDiv.innerHTML = `
        <div style="font-size: 12px; color: #888; margin-bottom: 8px;">練習進捗カウンター（2回で1変化）</div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; font-size: 11px;">
            <span style="color: #aaa;">判断系: ${status.progress.judgment}/2</span>
            <span style="color: #aaa;">動作系: ${status.progress.movement}/2</span>
            <span style="color: #aaa;">シュート系: ${status.progress.shooting}/2</span>
            <span style="color: #aaa;">汎用: ${status.progress.general}/2</span>
        </div>
    `;
    modal.appendChild(progressDiv);

    // Close button
    const closeBtn = createButton('閉じる', () => {
        document.body.removeChild(overlay);
    }, 'btn btn-primary');
    closeBtn.style.cssText = 'width: 100%; padding: 12px; font-size: 16px;';
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

// Show tactics preset modal for loading/deleting presets
function showTacticsPresetModal(tacticList) {
    const presets = getTacticsPresets();

    // Create modal overlay
    const overlay = createElement('div', 'modal-overlay');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';

    const modal = createElement('div', 'modal-content');
    modal.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%; max-height: 80%; overflow-y: auto;';

    const title = createElement('h3', '', '作戦セット一覧');
    modal.appendChild(title);

    if (presets.length === 0) {
        const noPresets = createElement('p', '', '保存された作戦がありません');
        modal.appendChild(noPresets);
    } else {
        const presetList = createElement('div', 'preset-list');
        presetList.style.cssText = 'margin: 10px 0;';

        presets.forEach(preset => {
            const presetItem = createElement('div', 'preset-item');
            presetItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #ccc; margin-bottom: 5px; border-radius: 4px;';

            const nameSpan = createElement('span', '', preset.name);
            nameSpan.style.cssText = 'flex: 1; cursor: pointer;';
            nameSpan.onclick = () => {
                const tactics = getTacticsPreset(preset.name);
                if (tactics) {
                    currentTactics = tactics;
                    updateTacticList(tacticList);
                    document.body.removeChild(overlay);
                }
            };

            const deleteBtn = createButton('削除', (e) => {
                e.stopPropagation();
                if (confirm(`作戦「${preset.name}」を削除しますか？`)) {
                    deleteTacticsPreset(preset.name);
                    presetItem.remove();
                    if (presetList.children.length === 0) {
                        presetList.innerHTML = '<p>保存された作戦がありません</p>';
                    }
                }
            }, 'btn btn-danger btn-small');
            deleteBtn.style.cssText = 'margin-left: 10px; padding: 4px 8px; font-size: 12px;';

            presetItem.appendChild(nameSpan);
            presetItem.appendChild(deleteBtn);
            presetList.appendChild(presetItem);
        });

        modal.appendChild(presetList);
    }

    const closeBtn = createButton('閉じる', () => {
        document.body.removeChild(overlay);
    }, 'btn btn-secondary');
    closeBtn.style.cssText = 'margin-top: 10px;';
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

// Initialize screens module
export function initializeScreens() {
    switchScreen(SCREENS.TITLE);
}
