// match-pattern-test.js - 試合パターンテスト（実際のmatch.js使用版）
// シングルスレッド、動的生成＆即実行、MatchSimulator.runSync()使用

// ブラウザモックをインストール
import './browser-mock.js';

import { CONFIG } from '../js/config.js';
import { gameState, initializeNewGame, getEffectiveStats } from '../js/gameState.js';
import { generateOpponent } from '../js/teams.js';
import { MatchSimulator, validateTactics } from '../js/match.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュール用 __dirname 取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === 定数定義 ===
const POSITIONS = ['LW', 'LB', 'CB', 'RB', 'RW', 'P'];
const DIRECTIONS = ['toward_enemy', 'away_enemy', 'right', 'left'];
const DISTANCES = [
    { id: 'short', distance: 10, time: 1 },
    { id: 'medium', distance: 30, time: 3 },
    { id: 'long', distance: 50, time: 5 }
];
const SHOOT_TYPES = ['corner', 'center'];
const REGIONS = ['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州', 'K航拿'];
const ROUNDS = [1, 2, 3, 4, 5, 6];

// === 作戦を match.js 形式に変換 ===
function convertTacticsToMatchFormat(startPos, tactics) {
    const matchTactics = [];
    let currentHolder = startPos;

    for (const t of tactics) {
        if (t.action === 'pass') {
            matchTactics.push({
                type: 'pass',
                from: currentHolder,
                to: t.to
            });
            currentHolder = t.to;
        } else if (t.action === 'dribble') {
            const distConfig = DISTANCES.find(d => d.id === t.dist);
            const tactic = {
                type: 'dribble',
                direction: t.dir,
                distance: distConfig.distance,
                duration: distConfig.time,
                nextAction: t.next === 'shoot' ? `shoot_${t.shootType}` : t.next
            };
            if (t.next === 'pass' && t.passTo) {
                tactic.nextAction = 'pass';
                tactic.passTo = t.passTo;
                currentHolder = t.passTo;
            }
            matchTactics.push(tactic);
        } else if (t.action === 'shoot') {
            matchTactics.push({
                type: 'shoot',
                shootType: t.type
            });
        }
    }

    return matchTactics;
}

// === 期待されるballHolder遷移を計算 ===
function getExpectedBallHolderHistory(startPos, tactics) {
    const history = [startPos];
    let currentHolder = startPos;

    for (const t of tactics) {
        if (t.action === 'pass') {
            currentHolder = t.to;
            history.push(currentHolder);
        } else if (t.action === 'dribble' && t.next === 'pass' && t.passTo) {
            currentHolder = t.passTo;
            history.push(currentHolder);
        }
    }

    return history;
}

// === 期待されるアクションシーケンスを生成 ===
function getExpectedActions(startPos, tactics, matchTactics) {
    const expected = [];
    let currentHolder = startPos;

    for (let i = 0; i < tactics.length; i++) {
        const t = tactics[i];
        const mt = matchTactics[i];

        if (t.action === 'pass') {
            expected.push({
                type: 'pass',
                from: currentHolder,
                to: t.to
            });
            currentHolder = t.to;
        } else if (t.action === 'dribble') {
            const distConfig = DISTANCES.find(d => d.id === t.dist);
            expected.push({
                type: 'dribble',
                holder: currentHolder,
                direction: t.dir,
                distance: distConfig.distance,
                nextAction: t.next === 'shoot' ? `shoot_${t.shootType}` : t.next,
                passTo: t.passTo || null
            });
            if (t.next === 'pass' && t.passTo) {
                currentHolder = t.passTo;
            }
        } else if (t.action === 'shoot') {
            expected.push({
                type: 'shoot',
                shooter: currentHolder,
                shootType: t.type
            });
        }
    }

    return expected;
}

// === 期待されるドリブル終了座標を計算 ===
function getExpectedDribbleEndPosition(startX, startY, direction, distance) {
    let targetX = startX;
    let targetY = startY;

    switch (direction) {
        case 'toward_enemy':
            targetY = Math.min(95, startY + distance);
            break;
        case 'away_enemy':
            targetY = Math.max(5, startY - distance);
            break;
        case 'right':
            targetX = Math.min(95, startX + distance);
            break;
        case 'left':
            targetX = Math.max(5, startX - distance);
            break;
    }

    return { x: targetX, y: targetY };
}

// === 期待されるシュートターゲットを計算 ===
function getExpectedShootTarget(shootType, gkX) {
    const goalLeft = 42.5;
    const goalRight = 57.5;
    const goalCenter = 50;

    let goalX;
    if (shootType === 'corner') {
        // GKの反対側を狙う
        if (gkX < goalCenter) {
            goalX = goalRight - 1; // 56.5%
        } else {
            goalX = goalLeft + 1;  // 43.5%
        }
    } else {
        // center shot
        goalX = goalCenter;
    }

    return { x: goalX, y: 0 };
}

// === 期待される境界条件 ===
function getExpectedBoundaries() {
    // config.jsの実際の初期位置を考慮:
    // - LW: x=3.75 (左端ウイング)
    // - RW: x=96.25 (右端ウイング)
    // - GK: y=105 (画面外、表示されない)
    return {
        minX: 0,      // LW(3.75)を許容
        maxX: 100,    // RW(96.25)を許容
        minY: 0,
        maxY: 110,    // GK(105)を許容
        ballMinX: 0,
        ballMaxX: 100,
        ballMinY: 0,  // ゴールラインは0
        ballMaxY: 100,
        // ポジション別の例外（初期位置は範囲外でも正常）
        exceptions: {
            LW: { minX: 0, maxX: 10 },      // 左端付近
            RW: { minX: 90, maxX: 100 },    // 右端付近
            GK: { minY: 100, maxY: 110 }    // 画面下部外
        }
    };
}

// === 期待される状態フラグ（結果タイプ別）===
function getExpectedStateFlags(resultReason) {
    const expected = {
        awaitingShootResult: false,  // 常にfalseで終わるべき
        ballAnimating: false         // 常にfalseで終わるべき
    };

    if (resultReason === 'intercepted') {
        expected.isPaused = true;
    } else if (resultReason === 'goal' || resultReason === 'tactics_completed_no_goal') {
        expected.isPaused = false;
    }

    return expected;
}

// === アクションログを期待値と比較 ===
function verifyActionLog(actionLog, expectedActions, pattern) {
    const issues = [];

    // アクションログから重要なイベントを抽出
    const tacticStarts = actionLog.filter(a => a.action === 'tactic_start');
    const passStarts = actionLog.filter(a => a.action === 'pass_start');
    const passSuccesses = actionLog.filter(a => a.action === 'pass_success');
    const dribbleStarts = actionLog.filter(a => a.action === 'dribble_start');
    const shootStarts = actionLog.filter(a => a.action === 'shoot_start');
    const intercepted = actionLog.filter(a =>
        a.action === 'pass_intercepted' ||
        a.action === 'dribble_intercepted' ||
        a.action === 'shoot_blocked' ||
        a.action === 'intercepted'
    );

    // インターセプトがあった場合は途中終了なので完全検証はスキップ
    if (intercepted.length > 0) {
        return { verified: true, intercepted: true, issues: [] };
    }

    // 使用済みインデックスを追跡（同じログエントリを複数回マッチさせない）
    const usedPassIndices = new Set();
    const usedDribbleIndices = new Set();
    const usedShootIndices = new Set();

    // 各期待アクションを検証
    for (let i = 0; i < expectedActions.length; i++) {
        const exp = expectedActions[i];

        if (exp.type === 'pass') {
            // パスの検証（未使用のものから検索）
            const passIdx = passStarts.findIndex((p, idx) =>
                !usedPassIndices.has(idx) && p.from === exp.from && p.to === exp.to
            );
            if (passIdx === -1) {
                issues.push({
                    type: 'missing_pass',
                    expected: `${exp.from}→${exp.to}`,
                    detail: `期待したパス(${exp.from}→${exp.to})がログにありません`
                });
                continue;
            }
            usedPassIndices.add(passIdx);

            // パス成功の検証
            const passSuccess = passSuccesses.find(p => p.from === exp.from && p.to === exp.to);
            if (!passSuccess) {
                issues.push({
                    type: 'pass_not_completed',
                    expected: `${exp.from}→${exp.to}`,
                    detail: `パス(${exp.from}→${exp.to})が完了していません`
                });
            }
        } else if (exp.type === 'dribble') {
            // ドリブルの検証（未使用のものから、全属性でマッチング）
            const dribbleIdx = dribbleStarts.findIndex((d, idx) =>
                !usedDribbleIndices.has(idx) &&
                d.ballHolder === exp.holder &&
                d.direction === exp.direction &&
                d.distance === exp.distance &&
                d.nextAction === exp.nextAction
            );

            if (dribbleIdx === -1) {
                // 完全一致が見つからない場合、holder+directionのみでマッチを試みてエラー詳細を出力
                const partialIdx = dribbleStarts.findIndex((d, idx) =>
                    !usedDribbleIndices.has(idx) &&
                    d.ballHolder === exp.holder &&
                    d.direction === exp.direction
                );

                if (partialIdx === -1) {
                    issues.push({
                        type: 'missing_dribble',
                        expected: `${exp.holder}:${exp.direction}/${exp.distance}`,
                        detail: `期待したドリブル(holder=${exp.holder}, dir=${exp.direction})がログにありません`
                    });
                } else {
                    const dribbleStart = dribbleStarts[partialIdx];
                    usedDribbleIndices.add(partialIdx);

                    // 距離の検証
                    if (dribbleStart.distance !== exp.distance) {
                        issues.push({
                            type: 'dribble_distance_mismatch',
                            expected: exp.distance,
                            actual: dribbleStart.distance,
                            detail: `ドリブル距離が不一致: 期待=${exp.distance}, 実際=${dribbleStart.distance}`
                        });
                    }

                    // 次アクションの検証
                    if (dribbleStart.nextAction !== exp.nextAction) {
                        issues.push({
                            type: 'dribble_next_action_mismatch',
                            expected: exp.nextAction,
                            actual: dribbleStart.nextAction,
                            detail: `ドリブル後アクションが不一致: 期待=${exp.nextAction}, 実際=${dribbleStart.nextAction}`
                        });
                    }

                    // パス先の検証
                    if (exp.passTo && dribbleStart.passTo !== exp.passTo) {
                        issues.push({
                            type: 'dribble_pass_to_mismatch',
                            expected: exp.passTo,
                            actual: dribbleStart.passTo,
                            detail: `ドリブル後パス先が不一致: 期待=${exp.passTo}, 実際=${dribbleStart.passTo}`
                        });
                    }
                }
                continue;
            }
            usedDribbleIndices.add(dribbleIdx);
            // 完全一致 - 問題なし
        } else if (exp.type === 'shoot') {
            // シュートの検証（未使用のものから検索）
            const shootIdx = shootStarts.findIndex((s, idx) =>
                !usedShootIndices.has(idx) &&
                s.shooter === exp.shooter &&
                s.shootType === exp.shootType
            );
            if (shootIdx === -1) {
                issues.push({
                    type: 'missing_shoot',
                    expected: `${exp.shooter}:${exp.shootType}`,
                    detail: `期待したシュート(shooter=${exp.shooter}, type=${exp.shootType})がログにありません`
                });
                continue;
            }
            usedShootIndices.add(shootIdx);
            // 完全一致 - 問題なし
        }
    }

    return {
        verified: issues.length === 0,
        intercepted: false,
        issues: issues
    };
}

// === インターセプト検証 ===
function verifyInterceptions(actionLog, result) {
    const issues = [];

    // インターセプトチェックログを取得
    const lineChecks = actionLog.filter(a => a.action === 'line_interception_check');
    const dribbleChecks = actionLog.filter(a => a.action === 'dribble_interception_check');

    // 1. GKがパス/シュートをインターセプトしていないか
    for (const check of lineChecks) {
        if (check.result === 'interceptor_found' && check.interceptor === 'GK') {
            issues.push({
                type: 'gk_intercepted_pass',
                detail: 'GKがパス/シュートをインターセプトしました（GKは対象外のはず）'
            });
        }
        // チェック対象にGKが含まれていないか確認
        if (check.checkedOpponents) {
            const gkChecked = check.checkedOpponents.find(o => o.position === 'GK');
            if (gkChecked) {
                issues.push({
                    type: 'gk_in_check_list',
                    detail: 'GKがインターセプトチェック対象に含まれています'
                });
            }
        }
    }

    // 2. ドリブルインターセプトでGKが対象になっていないか
    for (const check of dribbleChecks) {
        if (check.result === 'interceptor_found' && check.interceptor === 'GK') {
            issues.push({
                type: 'gk_intercepted_dribble',
                detail: 'GKがドリブルをインターセプトしました（GKは対象外のはず）'
            });
        }
    }

    // 3. インターセプト距離閾値の確認
    for (const check of lineChecks) {
        if (check.result === 'interceptor_found') {
            if (check.distance >= check.threshold) {
                issues.push({
                    type: 'interception_distance_error',
                    detail: `距離${check.distance}が閾値${check.threshold}以上なのにインターセプト判定`,
                    interceptor: check.interceptor
                });
            }
        }
    }

    for (const check of dribbleChecks) {
        if (check.result === 'interceptor_found') {
            if (check.distance >= check.threshold) {
                issues.push({
                    type: 'dribble_interception_distance_error',
                    detail: `距離${check.distance}が閾値${check.threshold}以上なのにインターセプト判定`,
                    interceptor: check.interceptor
                });
            }
        }
    }

    return {
        verified: issues.length === 0,
        issues: issues
    };
}

// === スコア検証 ===
function verifyScore(actionLog, result) {
    const issues = [];

    const scoreChanges = actionLog.filter(a => a.action === 'score_change');
    const shootResults = actionLog.filter(a => a.action === 'shoot_result');
    const goals = actionLog.filter(a => a.action === 'goal');

    // スコア変更の整合性チェック
    let expectedPlayerScore = 0;
    let expectedOpponentScore = 0;

    for (const change of scoreChanges) {
        if (change.team === 'player') {
            expectedPlayerScore++;
        } else if (change.team === 'opponent') {
            expectedOpponentScore++;
        }

        // oldScore + 1 = newScore の確認
        const expected = change.oldScore[change.team] + 1;
        const actual = change.newScore[change.team];
        if (expected !== actual) {
            issues.push({
                type: 'score_increment_error',
                detail: `${change.team}のスコア: 期待=${expected}, 実際=${actual}`,
                oldScore: change.oldScore,
                newScore: change.newScore
            });
        }
    }

    // 最終スコアの検証
    if (result.finalState && result.finalState.score) {
        const finalScore = result.finalState.score;
        if (finalScore.player !== expectedPlayerScore) {
            issues.push({
                type: 'final_player_score_mismatch',
                detail: `プレイヤー最終スコア: 期待=${expectedPlayerScore}, 実際=${finalScore.player}`
            });
        }
        if (finalScore.opponent !== expectedOpponentScore) {
            issues.push({
                type: 'final_opponent_score_mismatch',
                detail: `相手最終スコア: 期待=${expectedOpponentScore}, 実際=${finalScore.opponent}`
            });
        }
    }

    // ゴール時のスコア増加確認（score_changeはgoalの前に発生する）
    for (const goal of goals) {
        const goalIndex = actionLog.indexOf(goal);
        // goal直前にscore_changeがあるか確認
        const prevActions = actionLog.slice(0, goalIndex);
        const prevScoreChange = prevActions.reverse().find(a => a.action === 'score_change');
        if (!prevScoreChange || prevScoreChange.team !== 'player') {
            issues.push({
                type: 'goal_without_score_change',
                detail: 'ゴール前にプレイヤーのスコア変更がありません'
            });
        }
    }

    return {
        verified: issues.length === 0,
        issues: issues
    };
}

// === 境界検証（期待値 vs 実際値）===
function verifyBoundaries(result) {
    const issues = [];
    const expected = getExpectedBoundaries();

    // 選手の境界チェック
    if (result.finalState && result.finalState.playerPositions) {
        for (const [pos, coords] of Object.entries(result.finalState.playerPositions)) {
            if (coords.x < expected.minX || coords.x > expected.maxX ||
                coords.y < expected.minY || coords.y > expected.maxY) {
                issues.push({
                    type: 'player_boundary_violation',
                    detail: `選手${pos}が境界外`,
                    expected: { minX: expected.minX, maxX: expected.maxX, minY: expected.minY, maxY: expected.maxY },
                    actual: { x: coords.x, y: coords.y }
                });
            }
        }
    }

    // 相手選手の境界チェック
    if (result.finalState && result.finalState.opponentPositions) {
        for (const [pos, coords] of Object.entries(result.finalState.opponentPositions)) {
            if (coords.x < expected.minX || coords.x > expected.maxX ||
                coords.y < expected.minY || coords.y > expected.maxY) {
                issues.push({
                    type: 'opponent_boundary_violation',
                    detail: `相手${pos}が境界外`,
                    expected: { minX: expected.minX, maxX: expected.maxX, minY: expected.minY, maxY: expected.maxY },
                    actual: { x: coords.x, y: coords.y }
                });
            }
        }
    }

    // ボール位置の境界チェック
    if (result.finalState && result.finalState.ballPos) {
        const ball = result.finalState.ballPos;
        if (ball.x < expected.ballMinX || ball.x > expected.ballMaxX ||
            ball.y < expected.ballMinY || ball.y > expected.ballMaxY) {
            issues.push({
                type: 'ball_out_of_bounds',
                detail: 'ボールが境界外',
                expected: { minX: expected.ballMinX, maxX: expected.ballMaxX, minY: expected.ballMinY, maxY: expected.ballMaxY },
                actual: { x: ball.x, y: ball.y }
            });
        }
    }

    return {
        verified: issues.length === 0,
        issues: issues
    };
}

// === 状態遷移検証（期待値 vs 実際値）===
function verifyStateTransitions(result) {
    const issues = [];

    if (!result.finalState || !result.finalState.stateFlags) {
        return { verified: true, issues: [] };
    }

    const actual = result.finalState.stateFlags;
    const expected = getExpectedStateFlags(result.reason);

    // awaitingShootResult の検証
    if (expected.awaitingShootResult !== undefined && actual.awaitingShootResult !== expected.awaitingShootResult) {
        issues.push({
            type: 'awaitingShootResult_mismatch',
            detail: 'awaitingShootResultが期待と不一致',
            expected: expected.awaitingShootResult,
            actual: actual.awaitingShootResult
        });
    }

    // ballAnimating の検証
    if (expected.ballAnimating !== undefined && actual.ballAnimating !== expected.ballAnimating) {
        issues.push({
            type: 'ballAnimating_mismatch',
            detail: 'ballAnimatingが期待と不一致',
            expected: expected.ballAnimating,
            actual: actual.ballAnimating
        });
    }

    // isPaused の検証（インターセプト時のみ）
    if (expected.isPaused !== undefined && actual.isPaused !== expected.isPaused) {
        issues.push({
            type: 'isPaused_mismatch',
            detail: 'isPausedが期待と不一致',
            expected: expected.isPaused,
            actual: actual.isPaused
        });
    }

    // 作戦実行数のチェック
    if (result.finalState.tacticsExecuted > result.finalState.totalTactics) {
        issues.push({
            type: 'tactics_overrun',
            detail: '実行された作戦数が総作戦数を超過',
            expected: { max: result.finalState.totalTactics },
            actual: result.finalState.tacticsExecuted
        });
    }

    return {
        verified: issues.length === 0,
        issues: issues
    };
}

// === 座標検証（期待値 vs 実際値）===
function verifyCoordinates(actionLog, expectedActions) {
    const issues = [];

    const dribbleStarts = actionLog.filter(a => a.action === 'dribble_start');
    const shootStarts = actionLog.filter(a => a.action === 'shoot_start');

    // ドリブル座標検証
    for (const dribble of dribbleStarts) {
        if (dribble.from && dribble.to && dribble.direction && dribble.distance) {
            const expectedEnd = getExpectedDribbleEndPosition(
                dribble.from.x, dribble.from.y,
                dribble.direction, dribble.distance
            );

            const tolerance = 0.1; // 許容誤差
            if (Math.abs(dribble.to.x - expectedEnd.x) > tolerance ||
                Math.abs(dribble.to.y - expectedEnd.y) > tolerance) {
                issues.push({
                    type: 'dribble_end_position_mismatch',
                    detail: 'ドリブル終了位置が期待と不一致',
                    expected: expectedEnd,
                    actual: dribble.to,
                    direction: dribble.direction,
                    distance: dribble.distance
                });
            }
        }
    }

    // シュートターゲット検証
    for (const shoot of shootStarts) {
        if (shoot.target && shoot.gkPos && shoot.shootType) {
            const expectedTarget = getExpectedShootTarget(shoot.shootType, shoot.gkPos.x);

            const tolerance = 0.1;
            if (Math.abs(shoot.target.x - expectedTarget.x) > tolerance ||
                Math.abs(shoot.target.y - expectedTarget.y) > tolerance) {
                issues.push({
                    type: 'shoot_target_mismatch',
                    detail: 'シュートターゲットが期待と不一致',
                    expected: expectedTarget,
                    actual: shoot.target,
                    shootType: shoot.shootType,
                    gkX: shoot.gkPos.x
                });
            }
        }
    }

    return {
        verified: issues.length === 0,
        issues: issues
    };
}

// === 全検証を統合 ===
function verifyAll(result, expectedActions, pattern) {
    const allIssues = [];

    // アクションログ検証
    const actionVerify = verifyActionLog(result.actionLog || [], expectedActions, pattern);
    if (!actionVerify.verified && !actionVerify.intercepted) {
        allIssues.push(...actionVerify.issues);
    }

    // 座標検証（ドリブル終了位置、シュートターゲット）
    const coordVerify = verifyCoordinates(result.actionLog || [], expectedActions);
    allIssues.push(...coordVerify.issues);

    // インターセプト検証
    const interceptVerify = verifyInterceptions(result.actionLog || [], result);
    allIssues.push(...interceptVerify.issues);

    // スコア検証
    const scoreVerify = verifyScore(result.actionLog || [], result);
    allIssues.push(...scoreVerify.issues);

    // 境界検証
    const boundaryVerify = verifyBoundaries(result);
    allIssues.push(...boundaryVerify.issues);

    // 状態遷移検証
    const stateVerify = verifyStateTransitions(result);
    allIssues.push(...stateVerify.issues);

    return {
        verified: allIssues.length === 0,
        intercepted: actionVerify.intercepted,
        issues: allIssues,
        details: {
            action: actionVerify,
            coordinates: coordVerify,
            interception: interceptVerify,
            score: scoreVerify,
            boundary: boundaryVerify,
            state: stateVerify
        }
    };
}

// === パターン数を数式で高速計算 ===
// T(n): 1つのstartPosから生成される n手パターン数
// T(1) = 2 (シュート種別)
// T(2) = 34 (パス→シュート:5×2=10 + ドリブル→シュート:4×3×2=24)
// T(n) = 5×T(n-1) + 60×T(n-2) for n≥3
// 総数 = 9(地域) × 6(ラウンド) × 6(ポジション) × T(n) = 324 × T(n)
const patternCountCache = {};
function calculatePatternCount(steps) {
    if (patternCountCache[steps]) return patternCountCache[steps];

    // T(n): 1ポジションあたりのパターン数
    function T(n) {
        if (n === 1) return 2;
        if (n === 2) return 34;
        // メモ化で高速化
        const memo = { 1: 2, 2: 34 };
        for (let i = 3; i <= n; i++) {
            memo[i] = 5 * memo[i-1] + 60 * memo[i-2];
        }
        return memo[n];
    }

    // 324 = 9 regions × 6 rounds × 6 positions
    const count = 324 * T(steps);
    patternCountCache[steps] = count;
    return count;
}

// === ジェネレーター: パターンを1つずつ生成 ===
function* generateTactics(startPos, maxSteps) {
    if (maxSteps === 1) {
        for (const type of SHOOT_TYPES) {
            yield [{ action: 'shoot', type }];
        }
        return;
    }

    if (maxSteps === 2) {
        // パス→シュート
        for (const to of POSITIONS) {
            if (to !== startPos) {
                for (const shootType of SHOOT_TYPES) {
                    yield [
                        { action: 'pass', to },
                        { action: 'shoot', type: shootType }
                    ];
                }
            }
        }
        // ドリブル→シュート
        for (const dir of DIRECTIONS) {
            for (const dist of DISTANCES) {
                for (const shootType of SHOOT_TYPES) {
                    yield [{ action: 'dribble', dir, dist: dist.id, next: 'shoot', shootType }];
                }
            }
        }
        return;
    }

    // 3手以上: パス→続き
    for (const to of POSITIONS) {
        if (to !== startPos) {
            for (const sub of generateTactics(to, maxSteps - 1)) {
                yield [{ action: 'pass', to }, ...sub];
            }
        }
    }

    // ドリブル→パス→続き（自己パスは除外）
    for (const dir of DIRECTIONS) {
        for (const dist of DISTANCES) {
            for (const passTo of POSITIONS) {
                if (passTo === startPos) continue;  // 自己パスは不可
                for (const sub of generateTactics(passTo, maxSteps - 2)) {
                    yield [{ action: 'dribble', dir, dist: dist.id, next: 'pass', passTo }, ...sub];
                }
            }
        }
    }
}

// === ランダムパターン生成（高手数用）===
// イテレーション不要で直接ランダムなパターンを生成
function generateRandomTactic(startPos, steps) {
    const tactics = [];
    let currentPos = startPos;
    let remainingSteps = steps;

    while (remainingSteps > 0) {
        if (remainingSteps === 1) {
            // 最後の1手: シュート
            const shootType = SHOOT_TYPES[Math.floor(Math.random() * SHOOT_TYPES.length)];
            tactics.push({ action: 'shoot', type: shootType });
            remainingSteps = 0;
        } else if (remainingSteps === 2) {
            // 残り2手: パス→シュート or ドリブル→シュート
            if (Math.random() < 0.5) {
                // パス→シュート
                const others = POSITIONS.filter(p => p !== currentPos);
                const to = others[Math.floor(Math.random() * others.length)];
                const shootType = SHOOT_TYPES[Math.floor(Math.random() * SHOOT_TYPES.length)];
                tactics.push({ action: 'pass', to });
                tactics.push({ action: 'shoot', type: shootType });
                currentPos = to;
            } else {
                // ドリブル→シュート
                const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
                const dist = DISTANCES[Math.floor(Math.random() * DISTANCES.length)];
                const shootType = SHOOT_TYPES[Math.floor(Math.random() * SHOOT_TYPES.length)];
                tactics.push({ action: 'dribble', dir, dist: dist.id, next: 'shoot', shootType });
            }
            remainingSteps = 0;
        } else {
            // 残り3手以上: パス or ドリブル→パス
            if (Math.random() < 0.5) {
                // パス（1手消費）
                const others = POSITIONS.filter(p => p !== currentPos);
                const to = others[Math.floor(Math.random() * others.length)];
                tactics.push({ action: 'pass', to });
                currentPos = to;
                remainingSteps -= 1;
            } else {
                // ドリブル→パス（2手消費）
                const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
                const dist = DISTANCES[Math.floor(Math.random() * DISTANCES.length)];
                const others = POSITIONS.filter(p => p !== currentPos);
                const passTo = others[Math.floor(Math.random() * others.length)];
                tactics.push({ action: 'dribble', dir, dist: dist.id, next: 'pass', passTo });
                currentPos = passTo;
                remainingSteps -= 2;
            }
        }
    }

    return tactics;
}

// === ランダムサンプルを指定数生成 ===
function* generateRandomSamples(steps, count) {
    for (let i = 0; i < count; i++) {
        const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
        const round = ROUNDS[Math.floor(Math.random() * ROUNDS.length)];
        const startPos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
        const tactics = generateRandomTactic(startPos, steps);
        yield { region, round, startPos, tactics };
    }
}

// === 単一テスト実行（共通処理）===
function runSingleTest(pattern, opponent) {
    try {
        // match.js形式に変換
        const matchTactics = convertTacticsToMatchFormat(pattern.startPos, pattern.tactics);

        // 作戦検証
        const validation = validateTactics(matchTactics);
        if (!validation.valid) {
            return {
                passed: false,
                reason: 'validation_error',
                error: formatError(pattern, {
                    reason: 'validation_error',
                    error: validation.error
                })
            };
        }

        // MatchSimulator作成・実行
        const sim = new MatchSimulator(opponent);
        sim.ballHolder = pattern.startPos;
        sim.setTactics(matchTactics);

        // 同期実行
        const result = sim.runSync(10000);

        // 期待されるballHolder遷移
        const expectedHistory = getExpectedBallHolderHistory(pattern.startPos, pattern.tactics);

        // 期待されるアクションシーケンス
        const expectedActions = getExpectedActions(pattern.startPos, pattern.tactics, matchTactics);

        // 全検証を実行
        const verification = verifyAll(result, expectedActions, pattern);

        // ballHolder遷移の検証（インターセプト時を除く）
        let holderMismatch = false;
        if (result.reason !== 'intercepted' &&
            result.reason !== 'attempt_failed' &&
            !verification.intercepted) {
            const actualHistory = result.ballHolderHistory;

            // ゴール時はresetPositions()でballHolder='CB'にリセットされるため、
            // 履歴末尾にCBが追加されるのは正常動作 → 比較から除外
            let compareActual = actualHistory;
            if (result.reason === 'goal' && actualHistory.length > expectedHistory.length) {
                compareActual = actualHistory.slice(0, expectedHistory.length);
            }

            if (compareActual.length < expectedHistory.length) {
                holderMismatch = true;
            } else {
                for (let i = 0; i < expectedHistory.length; i++) {
                    if (compareActual[i] !== expectedHistory[i]) {
                        holderMismatch = true;
                        break;
                    }
                }
            }
        }

        // クリーンアップ
        sim.destroy();

        // 結果判定
        if (result.reason === 'error' || result.reason === 'timeout') {
            return {
                passed: false,
                reason: result.reason,
                error: formatError(pattern, result, expectedHistory)
            };
        } else if (holderMismatch) {
            return {
                passed: false,
                reason: 'ballholder_mismatch',
                error: formatError(pattern, {
                    ...result,
                    reason: 'ballholder_mismatch',
                    error: `期待: ${expectedHistory.join('→')}, 実際: ${result.ballHolderHistory.join('→')}`
                }, expectedHistory)
            };
        } else if (!verification.verified) {
            const issueDetails = verification.issues.map(i =>
                `[${i.type}] ${i.detail}` +
                (i.expected ? ` 期待:${JSON.stringify(i.expected)}` : '') +
                (i.actual ? ` 実際:${JSON.stringify(i.actual)}` : '')
            ).join('; ');

            return {
                passed: false,
                reason: 'verification_failed',
                error: formatError(pattern, {
                    ...result,
                    reason: 'verification_failed',
                    error: issueDetails,
                    verificationIssues: verification.issues,
                    verificationDetails: verification.details
                }, expectedHistory),
                issues: verification.issues
            };
        } else {
            return {
                passed: true,
                reason: result.reason
            };
        }
    } catch (e) {
        return {
            passed: false,
            reason: 'exception',
            error: formatError(pattern, {
                reason: 'exception',
                error: e.message,
                stack: e.stack
            })
        };
    }
}

// === 作戦を文字列で説明 ===
function describeTactic(startPos, tactics) {
    let desc = startPos;
    for (const t of tactics) {
        if (t.action === 'pass') desc += `→${t.to}`;
        else if (t.action === 'dribble') {
            desc += `:${t.dir.slice(0,2)}${t.dist.slice(0,1)}`;
            if (t.next === 'pass') desc += `→${t.passTo}`;
            else if (t.next === 'shoot') desc += `→${t.shootType}shoot`;
        }
        else if (t.action === 'shoot') desc += `→${t.type}shoot`;
    }
    return desc;
}

// === エラー出力フォーマット ===
function formatError(pattern, result, expectedHistory = null) {
    const err = {
        id: pattern.id,
        region: pattern.region,
        round: pattern.round,
        startPos: pattern.startPos,
        steps: pattern.steps,
        tactics: describeTactic(pattern.startPos, pattern.tactics),
        error: {
            reason: result.reason,
            message: result.error || null,
            stack: result.stack ? result.stack.split('\n').slice(0, 3).join('\n') : null
        }
    };

    if (result.ballHolderHistory) {
        err.ballHolderHistory = result.ballHolderHistory;
    }
    if (expectedHistory) {
        err.expectedHistory = expectedHistory;
    }
    if (result.interceptedAt) {
        err.interceptedAt = result.interceptedAt;
    }
    if (result.actionIssues) {
        err.actionIssues = result.actionIssues;
    }
    if (result.verificationIssues) {
        err.verificationIssues = result.verificationIssues;
    }
    if (result.verificationDetails) {
        err.verificationDetails = result.verificationDetails;
    }
    if (result.actionLog) {
        // アクションログの要約（最初の10件のみ）
        err.actionLogSummary = result.actionLog.slice(0, 10).map(a => a.action);
    }

    return err;
}

// === メイン ===
async function main() {
    const args = process.argv.slice(2);
    const stepsArg = args[0] || '3';
    const onlyMaxStep = stepsArg.endsWith('!');  // "3!" → 3手目のみ
    const maxSteps = parseInt(stepsArg.replace('!', '')) || 3;
    const minSteps = onlyMaxStep ? maxSteps : 1;  // 開始手数
    const outputFile = args[2] || null;

    // サンプリング設定をパース（カンマ区切りで各手数指定可能）
    // 数値: 確率（%）  例: "100,50,10,0.1"
    // n付き: 最大サンプル数  例: "100,100,n50,n10,n5"
    // 混在可能: "100,100,50,n100,n50,n10"
    const sampleConfig = {};  // { rate: number, maxCount: number | null }
    const sampleCounters = {};  // 各手数のサンプル済み数をカウント

    if (args[1]) {
        const parts = args[1].split(',').map(s => s.trim());
        for (let i = 0; i < maxSteps; i++) {
            const part = parts[i] || parts[parts.length - 1] || '100';
            if (part.startsWith('n') || part.startsWith('N')) {
                // 最大サンプル数指定
                const count = parseInt(part.slice(1), 10);
                sampleConfig[i + 1] = { rate: 100, maxCount: isNaN(count) ? null : count };
            } else {
                // 確率指定
                const rate = parseFloat(part);
                sampleConfig[i + 1] = { rate: isNaN(rate) ? 100 : rate, maxCount: null };
            }
            sampleCounters[i + 1] = 0;
        }
    } else {
        for (let i = 1; i <= maxSteps; i++) {
            sampleConfig[i] = { rate: 100, maxCount: null };
            sampleCounters[i] = 0;
        }
    }

    console.log('=== 試合パターンテスト（MatchSimulator.runSync版）===');
    if (onlyMaxStep) {
        console.log(`対象手数: ${maxSteps}手のみ`);
    } else {
        console.log(`対象手数: 1〜${maxSteps}手`);
    }
    console.log(`サンプリング設定:`);
    for (let i = minSteps; i <= maxSteps; i++) {
        const cfg = sampleConfig[i];
        if (cfg.maxCount !== null) {
            console.log(`  ${i}手: 最大${cfg.maxCount}件`);
        } else {
            console.log(`  ${i}手: ${cfg.rate}%`);
        }
    }
    console.log('');

    // ゲーム状態初期化
    initializeNewGame();

    // === パターン数を数式で瞬時計算（イテレーション不要）===
    const patternCounts = {};
    for (let steps = minSteps; steps <= maxSteps; steps++) {
        patternCounts[steps] = calculatePatternCount(steps);
    }

    // 最大件数モードの場合、実効サンプリング率を計算
    const effectiveRates = {};
    console.log('実効サンプリング率:');
    for (let steps = minSteps; steps <= maxSteps; steps++) {
        const cfg = sampleConfig[steps];
        const Nmax = patternCounts[steps];
        if (cfg.maxCount !== null) {
            if (Nmax <= cfg.maxCount) {
                effectiveRates[steps] = 100;  // 全数検査
                console.log(`  ${steps}手: 100%（全数検査, ${Nmax}件）`);
            } else {
                effectiveRates[steps] = (cfg.maxCount / Nmax) * 100;
                console.log(`  ${steps}手: ${effectiveRates[steps].toFixed(4)}%（${cfg.maxCount}/${Nmax}件）`);
            }
        } else {
            effectiveRates[steps] = cfg.rate;
            console.log(`  ${steps}手: ${cfg.rate}%（${Nmax}件中）`);
        }
    }
    console.log('');

    // === 第2パス: テスト実行 ===
    let totalCount = 0;
    let testedCount = 0;
    let passCount = 0;
    let failCount = 0;
    const errors = [];
    const stats = {};
    const reasonStats = {};

    const startTime = Date.now();

    // 高手数（サンプリング率が低い）かどうかを判定する閾値
    const RANDOM_SAMPLING_THRESHOLD = 0.1;  // 0.1%未満ならランダムサンプリング

    for (let steps = minSteps; steps <= maxSteps; steps++) {
        const rate = effectiveRates[steps];
        const cfg = sampleConfig[steps];
        const key = `${steps}手`;

        // 総パターン数を記録
        stats[key] = patternCounts[steps];
        totalCount += patternCounts[steps];

        if (rate < RANDOM_SAMPLING_THRESHOLD && cfg.maxCount !== null) {
            // === 高手数モード: ランダムパターン生成 ===
            console.log(`  ${steps}手: ランダムサンプリング（${cfg.maxCount}件）...`);

            for (const sample of generateRandomSamples(steps, cfg.maxCount)) {
                sampleCounters[steps]++;

                const prefecture = CONFIG.PREFECTURES.find(p =>
                    CONFIG.PREFECTURE_TO_REGION[p] === sample.region
                ) || sample.region;
                const opponent = generateOpponent(prefecture, sample.round);

                gameState.currentMatch = {
                    opponent: opponent,
                    round: sample.round,
                    attemptsRemaining: CONFIG.GAME.MAX_ATTEMPTS
                };

                const pattern = {
                    id: `PT-R${steps}-${String(sampleCounters[steps]).padStart(4, '0')}`,
                    region: sample.region,
                    round: sample.round,
                    startPos: sample.startPos,
                    steps,
                    tactics: sample.tactics
                };

                // テスト実行（共通処理を呼び出し）
                const testResult = runSingleTest(pattern, opponent);
                testedCount++;
                if (testResult.passed) {
                    passCount++;
                    reasonStats[testResult.reason] = (reasonStats[testResult.reason] || 0) + 1;
                } else {
                    failCount++;
                    if (errors.length < 1000) {
                        errors.push(testResult.error);
                    }
                    reasonStats[testResult.reason] = (reasonStats[testResult.reason] || 0) + 1;
                }
            }
        } else {
            // === 通常モード: 全パターンイテレーション ===
            for (const region of REGIONS) {
                for (const round of ROUNDS) {
                    const prefecture = CONFIG.PREFECTURES.find(p =>
                        CONFIG.PREFECTURE_TO_REGION[p] === region
                    ) || region;
                    const opponent = generateOpponent(prefecture, round);

                    gameState.currentMatch = {
                        opponent: opponent,
                        round: round,
                        attemptsRemaining: CONFIG.GAME.MAX_ATTEMPTS
                    };

                    for (const startPos of POSITIONS) {
                        for (const tactics of generateTactics(startPos, steps)) {
                            // サンプリング（実効サンプリング率で判定）
                            if (rate < 100 && Math.random() * 100 >= rate) {
                                continue;
                            }
                            sampleCounters[steps]++;

                            const pattern = {
                                id: `PT-${steps}-${String(sampleCounters[steps]).padStart(6, '0')}`,
                                region,
                                round,
                                startPos,
                                steps,
                                tactics
                            };

                            // テスト実行（共通処理を呼び出し）
                            const testResult = runSingleTest(pattern, opponent);
                            testedCount++;

                            if (testResult.passed) {
                                passCount++;
                                reasonStats[testResult.reason] = (reasonStats[testResult.reason] || 0) + 1;
                            } else {
                                failCount++;
                                if (errors.length < 1000) {
                                    errors.push(testResult.error);
                                }
                                if (testResult.issues) {
                                    for (const issue of testResult.issues) {
                                        reasonStats[issue.type] = (reasonStats[issue.type] || 0) + 1;
                                    }
                                } else {
                                    reasonStats[testResult.reason] = (reasonStats[testResult.reason] || 0) + 1;
                                }
                            }

                            // 進捗表示
                            if (testedCount > 0 && testedCount % 10000 === 0) {
                                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                                console.log(`  ${testedCount.toLocaleString()}件テスト完了 (${elapsed}秒経過)`);
                            }
                        }
                    }
                }
            }
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // 結果表示
    console.log('\n=== 結果 ===');
    console.log(`総パターン数: ${totalCount.toLocaleString()}件`);
    console.log(`テスト実行数: ${testedCount.toLocaleString()}件`);
    console.log(`成功（正常終了）: ${passCount.toLocaleString()}件`);
    console.log(`失敗（エラー）: ${failCount.toLocaleString()}件`);
    console.log(`実行時間: ${elapsed}秒`);

    console.log('\n手数別パターン数:');
    for (const [key, count] of Object.entries(stats).sort()) {
        console.log(`  ${key}: ${count.toLocaleString()}件`);
    }

    console.log('\n結果種別:');
    for (const [reason, count] of Object.entries(reasonStats).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${reason}: ${count.toLocaleString()}件`);
    }

    // バグ情報のグループ化（ログ出力でも使用するためif外で定義）
    const bugGroups = {};
    const suspectedFiles = {
        'player_boundary_violation': 'js/config.js (POSITIONS)',
        'opponent_boundary_violation': 'js/config.js (OPPONENT_POSITIONS)',
        'ball_out_of_bounds': 'js/match.js (ballX/ballY計算)',
        'ballAnimating_mismatch': 'js/match.js:runSync() (ボールアニメ完了処理)',
        'awaitingShootResult_mismatch': 'js/match.js:executeShoot() (syncMode処理)',
        'isPaused_mismatch': 'js/match.js:pause()',
        'goal_without_score_change': 'js/match.js:addScore() または cli/match-pattern-test.js:verifyScore()',
        'score_increment_error': 'js/match.js:addScore()',
        'gk_intercepted_pass': 'js/match.js:checkLineInterception()',
        'gk_in_check_list': 'js/match.js:checkLineInterception()',
        'interception_distance_error': 'js/match.js:checkLineInterception()',
        'dribble_end_position_mismatch': 'js/match.js:startDribble()',
        'shoot_target_mismatch': 'js/match.js:executeShoot()',
        'missing_pass': 'js/match.js:executePass()',
        'missing_dribble': 'js/match.js:startDribble()',
        'missing_shoot': 'js/match.js:executeShoot()',
        'tactics_overrun': 'js/match.js:update()'
    };

    // 各エラーの問題タイプを収集
    for (const err of errors) {
        if (err.verificationIssues) {
            for (const issue of err.verificationIssues) {
                if (!bugGroups[issue.type]) {
                    bugGroups[issue.type] = {
                        count: 0,
                        example: null,
                        expectedSamples: new Set(),
                        actualSamples: new Set()
                    };
                }
                bugGroups[issue.type].count++;
                if (!bugGroups[issue.type].example) {
                    bugGroups[issue.type].example = {
                        pattern: err.pattern,
                        issue: issue
                    };
                }
                if (issue.expected) {
                    bugGroups[issue.type].expectedSamples.add(JSON.stringify(issue.expected));
                }
                if (issue.actual) {
                    bugGroups[issue.type].actualSamples.add(JSON.stringify(issue.actual));
                }
            }
        }
    }

    // バグレポート出力（Claude Code解析用）
    if (Object.keys(bugGroups).length > 0) {
        console.log('\n' + '='.repeat(60));
        console.log('バグレポート（Claude Code解析用）');
        console.log('='.repeat(60));

        // バグIDを振って出力
        let bugId = 1;
        for (const [type, data] of Object.entries(bugGroups).sort((a, b) => b[1].count - a[1].count)) {
            console.log(`\n[BUG-${String(bugId).padStart(3, '0')}] ${type}`);
            console.log(`  発生数: ${data.count.toLocaleString()}件`);
            console.log(`  原因候補: ${suspectedFiles[type] || '不明'}`);

            if (data.example) {
                console.log(`  再現パターン: ${data.example.pattern}`);
                if (data.example.expected !== undefined) {
                    console.log(`  期待値: ${JSON.stringify(data.example.expected)}`);
                }
                if (data.example.actual !== undefined) {
                    console.log(`  実際値: ${JSON.stringify(data.example.actual)}`);
                }
            }

            // ユニークな実際値をリスト（境界違反など、複数の異なる値がある場合）
            if (data.actualSamples.size > 1 && data.actualSamples.size <= 10) {
                console.log(`  全実際値: ${[...data.actualSamples].join(', ')}`);
            }

            bugId++;
        }

        // 修正優先度サマリー
        console.log('\n' + '-'.repeat(60));
        console.log('修正優先度（発生数順）:');
        for (const [type, data] of Object.entries(bugGroups).sort((a, b) => b[1].count - a[1].count)) {
            const file = suspectedFiles[type] || '不明';
            console.log(`  ${data.count.toLocaleString().padStart(6)}件 | ${type} | ${file}`);
        }
    }

    // テキスト形式でログ出力（Test_Logディレクトリへ自動出力）
    const logDir = path.join(path.dirname(__dirname), 'docs', 'Test_Log');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    // 連番でファイル名を決定（実行する度に+1）
    const existingFiles = fs.readdirSync(logDir);
    let maxNum = 0;
    for (const f of existingFiles) {
        const m = f.match(/^実行結果(\d+)\.txt$/);
        if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }
    const nextNum = maxNum + 1;
    const logFileName = `実行結果${String(nextNum).padStart(2, '0')}.txt`;
    const logFilePath = path.join(logDir, logFileName);

    // テキスト形式のレポート作成
    let textReport = '';
    textReport += `=== 結果 ===\n`;
    textReport += `総パターン数: ${totalCount.toLocaleString()}件\n`;
    textReport += `テスト実行数: ${testedCount.toLocaleString()}件\n`;
    textReport += `成功（正常終了）: ${passCount.toLocaleString()}件\n`;
    textReport += `失敗（エラー）: ${failCount.toLocaleString()}件\n`;
    textReport += `実行時間: ${elapsed}秒\n\n`;

    textReport += `手数別パターン数:\n`;
    for (const [steps, count] of Object.entries(stats)) {
        textReport += `  ${steps}: ${count.toLocaleString()}件\n`;
    }
    textReport += '\n';

    textReport += `結果種別:\n`;
    for (const [reason, count] of Object.entries(reasonStats).sort((a, b) => b[1] - a[1])) {
        textReport += `  ${reason}: ${count.toLocaleString()}件\n`;
    }
    textReport += '\n';

    // エラー詳細出力（タイプ別：初回は詳細、以降は省略）
    if (errors.length > 0) {
        textReport += `============================================================\n`;
        textReport += `エラー詳細\n`;
        textReport += `============================================================\n\n`;

        // エラーをreason（タイプ）でグループ化
        const errorsByType = {};
        for (const err of errors) {
            const type = err.error?.reason || 'unknown';
            if (!errorsByType[type]) {
                errorsByType[type] = [];
            }
            errorsByType[type].push(err);
        }

        for (const [type, typeErrors] of Object.entries(errorsByType).sort((a, b) => b[1].length - a[1].length)) {
            textReport += `--- ${type} (${typeErrors.length}件) ---\n\n`;

            // 初回：詳細表示
            const first = typeErrors[0];
            textReport += `【詳細】${first.tactics}\n`;
            textReport += `  ID: ${first.id}\n`;
            textReport += `  地域/ラウンド: ${first.region}/R${first.round}\n`;
            if (first.expectedHistory) {
                textReport += `  期待遷移: ${first.expectedHistory.join('→')}\n`;
            }
            if (first.ballHolderHistory) {
                textReport += `  実際遷移: ${first.ballHolderHistory.join('→')}\n`;
            }
            if (first.error?.message) {
                textReport += `  エラー: ${first.error.message}\n`;
            }
            if (first.actionLogSummary) {
                textReport += `  アクション: ${first.actionLogSummary.join(', ')}\n`;
            }
            if (first.verificationIssues && first.verificationIssues.length > 0) {
                textReport += `  検証問題:\n`;
                for (const issue of first.verificationIssues.slice(0, 5)) {
                    textReport += `    - [${issue.type}] ${issue.detail}`;
                    if (issue.expected) textReport += ` 期待:${JSON.stringify(issue.expected)}`;
                    if (issue.actual) textReport += ` 実際:${JSON.stringify(issue.actual)}`;
                    textReport += '\n';
                }
            }
            textReport += '\n';

            // 2件目以降：省略表示
            if (typeErrors.length > 1) {
                textReport += `【他${typeErrors.length - 1}件】\n`;
                for (let i = 1; i < Math.min(typeErrors.length, 11); i++) {
                    const err = typeErrors[i];
                    const exp = err.expectedHistory ? err.expectedHistory.join('→') : '?';
                    const act = err.ballHolderHistory ? err.ballHolderHistory.join('→') : '?';
                    textReport += `  ${err.tactics} | 期待:${exp} | 実際:${act}\n`;
                }
                if (typeErrors.length > 11) {
                    textReport += `  ... 他${typeErrors.length - 11}件省略\n`;
                }
                textReport += '\n';
            }
        }
    }

    // バグレポート（修正優先度）
    if (Object.keys(bugGroups).length > 0) {
        textReport += `============================================================\n`;
        textReport += `修正優先度（発生数順）\n`;
        textReport += `============================================================\n`;
        for (const [type, data] of Object.entries(bugGroups).sort((a, b) => b[1].count - a[1].count)) {
            const file = suspectedFiles[type] || '不明';
            textReport += `  ${data.count.toLocaleString().padStart(6)}件 | ${type} | ${file}\n`;
        }
    }

    fs.writeFileSync(logFilePath, textReport);
    console.log(`\nログ出力: ${logFilePath}`);

    // JSONレポート（オプション）
    if (outputFile) {
        const report = {
            summary: {
                totalPatterns: totalCount,
                testedCount,
                passCount,
                failCount,
                elapsedSeconds: parseFloat(elapsed),
                maxSteps,
                sampleConfig,
                actualSamples: sampleCounters
            },
            stats,
            reasonStats,
            errors: errors.slice(0, 100)
        };

        fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
        console.log(`JSONレポート出力: ${outputFile}`);
    }

    process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
