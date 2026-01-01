// match.js - Match Simulation System (Position-Based)

import { CONFIG } from './config.js';
import { gameState, getEffectiveStats } from './gameState.js';
import { assetManager } from './assets.js';
import {
    distance,
    pointToLineDistance,
    normalize,
    calculateSuccessRate,
    rollSuccess,
    deepClone
} from './utils.js';

// Player class with position
class Player {
    constructor(positionKey, team, isAce = false, isGearSecond = false) {
        this.positionKey = positionKey;
        this.team = team; // 'player' or 'opponent'
        this.isAce = isAce;
        this.isGearSecond = isGearSecond;

        const posConfig = team === 'player' ?
            CONFIG.POSITIONS[positionKey] :
            CONFIG.OPPONENT_POSITIONS[positionKey];

        this.x = posConfig.x;
        this.y = posConfig.y;
        this.name = posConfig.name;
        this.shortName = posConfig.shortName;
        this.vx = 0;
        this.vy = 0;
        this.targetX = this.x;
        this.targetY = this.y;

        // Knockback state
        this.isKnockedBack = false;
        this.knockbackStartTime = 0;
        this.knockbackDuration = 2000; // 2 seconds in milliseconds
        this.originalX = this.x;
        this.originalY = this.y;
    }

    getSpeed() {
        const stats = this.team === 'player' ? getEffectiveStats() : gameState.currentMatch.opponent.stats;
        let baseSpeed = CONFIG.MOVEMENT.BASE_SPEED + (stats.dribble * CONFIG.MOVEMENT.STAT_MODIFIER);

        // Apply defensive speed boost (1.3x for opponent team)
        if (this.team === 'opponent') {
            baseSpeed *= 1.3;

            // ファイナルボス戦では敵の速度を大幅に上げる（3倍）
            const isFinalBossMatch = gameState.currentMatch?.opponent?.prefecture === CONFIG.FINAL_BOSS.prefecture &&
                                     gameState.tournament.currentRound === 6;
            if (isFinalBossMatch) {
                baseSpeed *= 3.0;
            }
        }

        // GK gets extra speed boost for lateral movement (1.5x additional)
        if (this.positionKey === 'GK') {
            baseSpeed *= 1.5;
        }

        if (this.isGearSecond) {
            return baseSpeed * CONFIG.ACE.GEAR_SECOND_MULTIPLIER;
        } else if (this.isAce) {
            return baseSpeed * CONFIG.ACE.STAT_MULTIPLIER;
        } else {
            return baseSpeed;
        }
    }

    update(dt) {
        // Handle knockback return animation
        if (this.isKnockedBack) {
            const elapsed = Date.now() - this.knockbackStartTime;
            if (elapsed >= this.knockbackDuration) {
                // Knockback complete, return to original position
                this.x = this.originalX;
                this.y = this.originalY;
                this.targetX = this.originalX;
                this.targetY = this.originalY;
                this.isKnockedBack = false;
            } else {
                // Gradually return to original position
                const progress = elapsed / this.knockbackDuration;
                // Use ease-out interpolation for smooth return
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                // Interpolate from current knocked back position to original
                const startX = this.targetX; // Knocked back position
                const startY = this.targetY;
                this.x = startX + (this.originalX - startX) * easeProgress;
                this.y = startY + (this.originalY - startY) * easeProgress;
            }
            return; // Don't do normal movement during knockback
        }

        const speed = this.getSpeed();
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.5) {
            const moveSpeed = speed * dt;
            if (dist < moveSpeed) {
                this.x = this.targetX;
                this.y = this.targetY;
            } else {
                this.x += (dx / dist) * moveSpeed;
                this.y += (dy / dist) * moveSpeed;
            }
        }
    }

    setTarget(x, y) {
        this.targetX = Math.max(5, Math.min(95, x));
        this.targetY = Math.max(5, Math.min(95, y));
    }

    // Knock back the player in a specific direction
    knockback(directionAngleDegrees, distance = 5) {
        // Store original position for return animation
        this.originalX = this.x;
        this.originalY = this.y;

        // Calculate knockback position
        const angleRad = (directionAngleDegrees * Math.PI) / 180;
        const knockbackX = this.x + Math.cos(angleRad) * distance;
        const knockbackY = this.y + Math.sin(angleRad) * distance;

        // Set knocked back position (clamped to court bounds)
        this.x = Math.max(5, Math.min(95, knockbackX));
        this.y = Math.max(5, Math.min(95, knockbackY));
        this.targetX = this.x;
        this.targetY = this.y;

        // Start knockback animation timer
        this.isKnockedBack = true;
        this.knockbackStartTime = Date.now();

        console.log(`${this.name} knocked back from (${this.originalX.toFixed(1)}, ${this.originalY.toFixed(1)}) to (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
    }

    resetPosition() {
        const posConfig = this.team === 'player' ?
            CONFIG.POSITIONS[this.positionKey] :
            CONFIG.OPPONENT_POSITIONS[this.positionKey];
        this.x = posConfig.x;
        this.y = posConfig.y;
        this.targetX = this.x;
        this.targetY = this.y;

        // Reset knockback state
        this.isKnockedBack = false;
        this.originalX = this.x;
        this.originalY = this.y;
    }
}

// Match simulator class
export class MatchSimulator {
    constructor(opponent) {
        this.opponent = opponent;
        this.players = {};
        this.opponents = {};
        this.ballHolder = 'CB'; // Start with center back
        this.score = { player: 0, opponent: 0 };
        this.tactics = [];
        this.currentTacticIndex = 0;
        this.isRunning = false;
        this.animationId = null;
        this.lastTime = 0;
        this.actionInProgress = null;
        this.onScoreCallback = null;
        this.onMatchEndCallback = null;

        // Final boss detection (てぇでぇ's学園 in finals - unbeatable)
        console.log('=== FINAL BOSS CHECK ===');
        console.log('opponent.prefecture:', opponent.prefecture);
        console.log('opponent.name:', opponent.name);
        console.log('CONFIG.FINAL_BOSS.prefecture:', CONFIG.FINAL_BOSS.prefecture);
        console.log('currentRound:', gameState.tournament.currentRound);

        this.isFinalBoss = opponent.prefecture === CONFIG.FINAL_BOSS.prefecture &&
                          gameState.tournament.currentRound === 6;
        console.log('isFinalBoss:', this.isFinalBoss);

        if (this.isFinalBoss) {
            console.log('⚠️ FINAL BOSS MATCH: てぇでぇ\'s学園 - Unbeatable mode activated');
        }

        // Ball animation properties
        this.ballX = 50;
        this.ballY = 67.5;
        this.ballTargetX = 50;
        this.ballTargetY = 67.5;
        this.ballAnimating = false;
        this.ballSpeed = 80; // units per second

        // Pause/interception properties
        this.isPaused = false;
        this.interceptionInfo = null;
        this.onInterceptionCallback = null;
        this.pendingTakeover = false;
        this.failedTacticIndex = null;

        // Shoot result waiting flag (prevents next action until shoot resolves)
        this.awaitingShootResult = false;

        // Action icon display
        this.actionIconElement = null;
        this.currentAction = null;

        this.initializePlayers();
        this.initializeActionIcon();

        // Initialize ball position at CB
        const cbPlayer = this.players['CB'];
        if (cbPlayer) {
            this.ballX = cbPlayer.x;
            this.ballY = cbPlayer.y;
            this.ballTargetX = cbPlayer.x;
            this.ballTargetY = cbPlayer.y;
        }
    }

    initializePlayers() {
        // Initialize player team with positions
        const playerAces = gameState.team.aces;
        const playerGearSecond = gameState.team.gearSecond || [];
        const positions = ['LW', 'RW', 'CB', 'LB', 'RB', 'P', 'GK'];

        positions.forEach((pos, i) => {
            const isAce = playerAces.includes(i);
            const isGearSecond = playerGearSecond.includes(i);
            this.players[pos] = new Player(pos, 'player', isAce, isGearSecond);
        });

        // Initialize opponent team
        const opponentAces = this.opponent.aces || [];
        const opponentGearSecond = this.opponent.gearSecond || [];
        positions.forEach((pos, i) => {
            const isAce = opponentAces.includes(i);
            const isGearSecond = opponentGearSecond.includes(i);
            this.opponents[pos] = new Player(pos, 'opponent', isAce, isGearSecond);
        });

        // Ball starts with CB
        this.ballHolder = 'CB';
    }

    initializeActionIcon() {
        // Create action icon element
        this.actionIconElement = document.createElement('img');
        this.actionIconElement.className = 'match-action-icon';
        this.actionIconElement.style.display = 'none';
        document.body.appendChild(this.actionIconElement);
    }

    showActionIcon(action) {
        if (!this.actionIconElement) return;

        this.currentAction = action;
        const actionImg = assetManager.getActionImage(action);

        if (actionImg) {
            this.actionIconElement.src = actionImg.src;
            this.actionIconElement.style.display = 'block';
        }
    }

    hideActionIcon() {
        if (this.actionIconElement) {
            this.actionIconElement.style.display = 'none';
        }
        this.currentAction = null;
    }

    setTactics(tactics) {
        this.tactics = tactics;
        this.currentTacticIndex = 0;
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        console.log('resume called');
        this.isPaused = false;
        this.interceptionInfo = null;
        // Continue with opponent takeover after resume
        if (this.pendingTakeover) {
            console.log('Executing pending takeover');
            this.handleOpponentTakeover();
            this.pendingTakeover = false;
        }
    }

    // ファイナルボス戦での突破判定（通常の成功率計算を上書き）
    rollFinalBossBreakthrough(actionType, isGK = false) {
        if (!this.isFinalBoss) {
            return null; // 通常の判定を使用
        }

        const rates = CONFIG.FINAL_BOSS.finalMatchRates;
        let interceptRate;

        if (actionType === 'pass') {
            interceptRate = rates.passInterceptRate;
        } else if (actionType === 'dribble') {
            interceptRate = rates.dribbleInterceptRate;
        } else if (actionType === 'shoot') {
            if (isGK) {
                interceptRate = rates.shootBlockByGK; // GKは100%ブロック
            } else {
                interceptRate = rates.shootBlockByFP; // FPは67%ブロック
            }
        } else {
            return null;
        }

        // インターセプト率の逆（突破率）で判定
        const breakthroughRate = 1 - interceptRate;
        const roll = Math.random();
        const success = roll < breakthroughRate;

        console.log(`[FINAL BOSS] ${actionType} breakthrough check: rate=${(breakthroughRate * 100).toFixed(0)}%, roll=${(roll * 100).toFixed(0)}%, success=${success}`);

        return success;
    }

    animate() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;

        if (deltaTime >= 1 / CONFIG.GAME.FPS) {
            this.update(deltaTime);
            this.lastTime = currentTime;
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    update(dt) {
        // Don't update if paused
        if (this.isPaused) {
            return;
        }

        // Update player positions
        Object.values(this.players).forEach(p => p.update(dt));
        Object.values(this.opponents).forEach(p => p.update(dt));

        // Update ball animation
        if (this.ballAnimating) {
            const dx = this.ballTargetX - this.ballX;
            const dy = this.ballTargetY - this.ballY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 1) {
                // Animation complete
                this.ballX = this.ballTargetX;
                this.ballY = this.ballTargetY;
                this.ballAnimating = false;
                this.hideActionIcon();
            } else {
                // Move ball toward target
                const moveSpeed = this.ballSpeed * dt;
                if (dist < moveSpeed) {
                    this.ballX = this.ballTargetX;
                    this.ballY = this.ballTargetY;
                    this.ballAnimating = false;
                    this.hideActionIcon();
                } else {
                    this.ballX += (dx / dist) * moveSpeed;
                    this.ballY += (dy / dist) * moveSpeed;
                }
            }
        } else {
            // Ball follows holder when not animating
            const holder = this.players[this.ballHolder];
            if (holder) {
                this.ballX = holder.x;
                this.ballY = holder.y;
            }
        }

        // Update opponent AI
        this.updateOpponentAI(dt);

        // Execute current tactic
        if (this.actionInProgress) {
            this.updateAction(dt);
        } else if (this.currentTacticIndex < this.tactics.length) {
            this.startNextAction();
        }

        // Check win condition (player scores 1 point = win)
        if (this.score.player >= CONFIG.GAME.POINTS_TO_WIN) {
            console.log('Win condition met, ending match');
            this.endMatch('win');
        }
        // Check loss condition (opponent scores = fail, decrement attempts)
        else if (this.score.opponent > 0) {
            console.log('Opponent scored, ending match with attempt_failed. Score:', this.score);
            this.endMatch('attempt_failed');
        }
    }

    startNextAction() {
        const tactic = this.tactics[this.currentTacticIndex];
        this.actionInProgress = {
            type: tactic.type,
            data: tactic,
            elapsed: 0
        };

        if (tactic.type === 'dribble') {
            this.startDribble(tactic);
        }
    }

    updateAction(dt) {
        const action = this.actionInProgress;
        action.elapsed += dt;

        if (action.type === 'dribble') {
            if (action.elapsed >= action.data.duration) {
                // Dribble completed, execute next action
                console.log('Dribble completed. nextAction:', action.data.nextAction, 'passTo:', action.data.passTo);
                if (action.data.nextAction === 'dribble_back') {
                    this.executeDribbleBack();
                } else if (action.data.nextAction === 'pass') {
                    if (action.data.passTo) {
                        console.log('Executing pass to:', action.data.passTo);
                        this.executePass(action.data.passTo);
                    } else {
                        console.error('Dribble->Pass: passTo is undefined, treating as turnover');
                        this.handleOpponentTakeover();
                    }
                } else if (action.data.nextAction === 'shoot_corner') {
                    this.executeShoot('corner');
                } else if (action.data.nextAction === 'shoot_center') {
                    this.executeShoot('center');
                } else {
                    console.warn('Unknown nextAction:', action.data.nextAction);
                }
                this.finishAction();
            }
        } else if (action.type === 'pass') {
            // Wait for ball animation to complete
            if (!this.ballAnimating && action.started) {
                this.finishAction();
            } else if (!action.started) {
                action.started = true;
                this.executePass(action.data.to);
            }
        } else if (action.type === 'shoot') {
            // Wait for ball animation to complete AND shoot result to be determined
            if (!this.ballAnimating && action.started && !this.awaitingShootResult) {
                this.finishAction();
            } else if (!action.started) {
                action.started = true;
                this.executeShoot(action.data.shootType);
            }
        }
    }

    finishAction() {
        this.actionInProgress = null;
        this.currentTacticIndex++;
    }

    startDribble(tactic) {
        const player = this.players[this.ballHolder];
        const direction = tactic.direction;
        const distance = tactic.distance;

        let targetX = player.x;
        let targetY = player.y;
        const startX = player.x;
        const startY = player.y;

        // Calculate direction
        switch (direction) {
            case 'toward_enemy':
                targetY = Math.min(95, player.y + distance);
                break;
            case 'away_enemy':
                targetY = Math.max(5, player.y - distance);
                break;
            case 'right':
                targetX = Math.min(95, player.x + distance);
                break;
            case 'left':
                targetX = Math.max(5, player.x - distance);
                break;
        }

        // ログ記録
        this.logAction({
            action: 'dribble_start',
            ballHolder: this.ballHolder,
            direction: direction,
            distance: distance,
            from: { x: startX, y: startY },
            to: { x: targetX, y: targetY },
            nextAction: tactic.nextAction,
            passTo: tactic.passTo || null
        });

        player.setTarget(targetX, targetY);

        // Check for interception during dribble
        const interceptor = this.checkDribbleInterception(player);
        if (interceptor) {
            console.log('Dribble intercepted by:', interceptor.name);

            // ファイナルボス戦では特殊判定を使用
            const finalBossResult = this.rollFinalBossBreakthrough('dribble');
            let breaksThrough;
            let interceptionSuccessRate;

            if (finalBossResult !== null) {
                breaksThrough = finalBossResult;
                interceptionSuccessRate = (1 - CONFIG.FINAL_BOSS.finalMatchRates.dribbleInterceptRate) * 100;
            } else {
                // 通常の判定
                const playerStats = getEffectiveStats();
                const opponentStats = this.opponent.stats;
                interceptionSuccessRate = calculateSuccessRate(playerStats.dribble, opponentStats.dribble);
                breaksThrough = rollSuccess(interceptionSuccessRate);
            }
            console.log('Dribble interception resistance success rate:', interceptionSuccessRate);

            if (breaksThrough) {
                console.log('Dribble breaks through interception!');
                // ログ記録：ドリブル突破成功
                this.logAction({
                    action: 'dribble_breakthrough',
                    interceptor: interceptor.positionKey,
                    successRate: interceptionSuccessRate
                });

                // Knockback direction: away from dribbler (direction enemy came from)
                const dirX = interceptor.x - player.x;
                const dirY = interceptor.y - player.y;
                const knockbackAngle = Math.atan2(dirY, dirX) * 180 / Math.PI;
                interceptor.knockback(knockbackAngle, 5);

                // Continue with dribble - player keeps moving
                // No need to change anything, dribble continues normally
            } else {
                console.log('Interception successful - dribble blocked');
                // ログ記録：ドリブルインターセプト成功
                this.logAction({
                    action: 'dribble_intercepted',
                    interceptor: interceptor.positionKey,
                    successRate: interceptionSuccessRate
                });

                // Failure - interception successful, show overlay
                this.ballTargetX = interceptor.x;
                this.ballTargetY = interceptor.y;
                this.ballAnimating = true;
                this.ballSpeed = 80;

                // Pause and show interception
                this.interceptionInfo = {
                    type: 'dribble',
                    interceptor: interceptor,
                    ballHolder: this.ballHolder
                };
                this.pendingTakeover = true;

                // 同期モードでは即座に処理
                if (this.syncMode) {
                    this.pause();
                    if (this.onInterceptionCallback) {
                        this.onInterceptionCallback(this.interceptionInfo);
                    }
                } else {
                    // Wait for ball to reach interceptor, then pause
                    setTimeout(() => {
                        this.pause();
                        if (this.onInterceptionCallback) {
                            this.onInterceptionCallback(this.interceptionInfo);
                        }
                    }, 500);
                }
                this.finishAction();
            }
        }
    }

    executeDribbleBack() {
        this.showActionIcon('dribble');
        const player = this.players[this.ballHolder];
        const backDistance = 30; // Medium distance
        player.setTarget(player.x, Math.max(5, player.y - backDistance));
    }

    executePass(toPosition) {
        this.showActionIcon('pass');
        console.log('executePass called:', { ballHolder: this.ballHolder, toPosition });
        const fromPlayer = this.players[this.ballHolder];
        const toPlayer = this.players[toPosition];

        // ログ記録
        this.logAction({
            action: 'pass_start',
            from: this.ballHolder,
            to: toPosition,
            fromPos: fromPlayer ? { x: fromPlayer.x, y: fromPlayer.y } : null,
            toPos: toPlayer ? { x: toPlayer.x, y: toPlayer.y } : null
        });

        if (!fromPlayer) {
            console.error('fromPlayer not found:', this.ballHolder);
            this.logAction({ action: 'pass_error', error: 'fromPlayer not found', ballHolder: this.ballHolder });
            this.handleOpponentTakeover();
            return;
        }

        if (!toPlayer) {
            console.error('toPlayer not found:', toPosition);
            this.logAction({ action: 'pass_error', error: 'toPlayer not found', toPosition: toPosition });
            this.handleOpponentTakeover();
            return;
        }

        // Check line interception
        console.log('Checking line interception...');
        const interceptor = this.checkLineInterception(
            fromPlayer.x, fromPlayer.y,
            toPlayer.x, toPlayer.y
        );
        console.log('Line interception check complete:', !!interceptor);

        if (interceptor) {
            console.log('Pass intercepted by:', interceptor.name);

            // ファイナルボス戦では特殊判定を使用
            const finalBossResult = this.rollFinalBossBreakthrough('pass');
            let breaksThrough;
            let interceptionSuccessRate;

            if (finalBossResult !== null) {
                breaksThrough = finalBossResult;
                interceptionSuccessRate = (1 - CONFIG.FINAL_BOSS.finalMatchRates.passInterceptRate) * 100;
            } else {
                // 通常の判定
                const playerStats = getEffectiveStats();
                const opponentStats = this.opponent.stats;
                interceptionSuccessRate = calculateSuccessRate(playerStats.pass, opponentStats.pass);
                breaksThrough = rollSuccess(interceptionSuccessRate);
            }
            console.log('Interception resistance success rate:', interceptionSuccessRate);

            if (breaksThrough) {
                console.log('Pass breaks through interception!');
                // ログ記録：パス突破成功
                this.logAction({
                    action: 'pass_breakthrough',
                    interceptor: interceptor.positionKey,
                    successRate: interceptionSuccessRate
                });

                // Calculate ball direction angle
                const ballDirX = toPlayer.x - fromPlayer.x;
                const ballDirY = toPlayer.y - fromPlayer.y;
                const ballAngle = Math.atan2(ballDirY, ballDirX) * 180 / Math.PI;

                // Knockback at 315° relative to ball direction (= ball angle + 315° = ball angle - 45°)
                const knockbackAngle = ballAngle + 315;
                interceptor.knockback(knockbackAngle, 5);

                // Continue with pass
                this.ballTargetX = toPlayer.x;
                this.ballTargetY = toPlayer.y;
                this.ballAnimating = true;
                this.ballSpeed = 80;
                this.ballHolder = toPosition;

                // ログ記録：パス成功
                this.logAction({
                    action: 'pass_success',
                    from: fromPlayer.positionKey,
                    to: toPosition
                });
            } else {
                console.log('Interception successful - pass blocked');
                // ログ記録：パスインターセプト成功
                this.logAction({
                    action: 'pass_intercepted',
                    interceptor: interceptor.positionKey,
                    successRate: interceptionSuccessRate
                });

                // Failure - interception successful, show overlay
                this.ballTargetX = interceptor.x;
                this.ballTargetY = interceptor.y;
                this.ballAnimating = true;
                this.ballSpeed = 80;

                // Pause and show interception
                this.interceptionInfo = {
                    type: 'pass',
                    interceptor: interceptor,
                    from: this.ballHolder,
                    to: toPosition
                };
                this.pendingTakeover = true;

                // 同期モードでは即座に処理
                if (this.syncMode) {
                    this.pause();
                    if (this.onInterceptionCallback) {
                        this.onInterceptionCallback(this.interceptionInfo);
                    }
                } else {
                    // Wait for ball to reach interceptor, then pause
                    setTimeout(() => {
                        console.log('Pausing for interception overlay');
                        this.pause();
                        if (this.onInterceptionCallback) {
                            console.log('Calling interception callback');
                            this.onInterceptionCallback(this.interceptionInfo);
                        } else {
                            console.error('onInterceptionCallback is not set!');
                        }
                    }, 500);
                }
            }
            return;
        }

        // No interception - pass always succeeds
        console.log('No interception - pass succeeds automatically');
        // ログ記録：パス成功（インターセプトなし）
        this.logAction({
            action: 'pass_success',
            from: fromPlayer.positionKey,
            to: toPosition,
            noInterception: true
        });

        this.ballTargetX = toPlayer.x;
        this.ballTargetY = toPlayer.y;
        this.ballAnimating = true;
        this.ballSpeed = 80;
        this.ballHolder = toPosition;
    }

    executeShoot(shootType) {
        this.showActionIcon('shoot');
        this.awaitingShootResult = true; // Prevent next action until shoot resolves
        const shooter = this.players[this.ballHolder];

        // Calculate target based on accurate goal dimensions from COART.svg
        // Goal line: x1=8500, x2=11500 in 20000 units = 42.5% to 57.5%
        // Goal is at y=0 (top edge)
        const goalLeft = 42.5;
        const goalRight = 57.5;
        const goalCenter = 50;

        let goalX = goalCenter;
        let goalY = 0; // Goal line at y=0
        const gk = this.opponents['GK'];

        if (shootType === 'corner') {
            // Aim for the corner opposite to GK position (GKがいない方の端)
            if (gk) {
                // If GK is on left side (x < 50%), shoot to right corner
                // If GK is on right side (x > 50%), shoot to left corner
                if (gk.x < goalCenter) {
                    goalX = goalRight - 1; // Right corner (56.5%)
                } else {
                    goalX = goalLeft + 1; // Left corner (43.5%)
                }
            } else {
                // Fallback: random corner
                goalX = Math.random() > 0.5 ? (goalLeft + 1) : (goalRight - 1);
            }
        } else if (shootType === 'center') {
            // Aim for goal center (GK direction) - most powerful shot
            goalX = goalCenter;
        }

        // ログ記録
        this.logAction({
            action: 'shoot_start',
            shooter: this.ballHolder,
            shootType: shootType,
            from: { x: shooter.x, y: shooter.y },
            target: { x: goalX, y: goalY },
            gkPos: gk ? { x: gk.x, y: gk.y } : null
        });

        // Animate ball to goal
        this.ballTargetX = goalX;
        this.ballTargetY = goalY;
        this.ballAnimating = true;
        this.ballSpeed = 120; // Faster for shots

        // ファイナルボス戦ではGKがシュートの目標位置に向かって移動開始
        // シュート時のGK追跡用の目標位置を保存
        if (this.isFinalBoss && gk) {
            console.log('[FINAL BOSS] GK tracking shot target at x:', goalX);
            this.finalBossShootTargetX = goalX;
        }

        // Check line to goal
        const interceptor = this.checkLineInterception(
            shooter.x, shooter.y,
            goalX, goalY
        );

        if (interceptor) {
            console.log('Shot intercepted by:', interceptor.name);

            // ファイナルボス戦では特殊判定を使用（フィールドプレーヤーによるブロック）
            const finalBossResult = this.rollFinalBossBreakthrough('shoot', false);
            let breaksThrough;
            let interceptionSuccessRate;

            if (finalBossResult !== null) {
                breaksThrough = finalBossResult;
                interceptionSuccessRate = (1 - CONFIG.FINAL_BOSS.finalMatchRates.shootBlockByFP) * 100;
            } else {
                // 通常の判定
                const playerStats = getEffectiveStats();
                const opponentStats = this.opponent.stats;
                const shootConfig = CONFIG.ACTION.SHOOT.types.find(t => t.id === shootType);
                const adjustedPlayerStat = playerStats.shoot * shootConfig.power;
                interceptionSuccessRate = calculateSuccessRate(adjustedPlayerStat, opponentStats.shoot);
                breaksThrough = rollSuccess(interceptionSuccessRate);
            }
            console.log('Shot interception resistance success rate:', interceptionSuccessRate);

            if (breaksThrough) {
                console.log('Shot breaks through interception!');
                // Success - shot breaks through, enemy gets knocked back

                // Calculate ball direction angle
                const ballDirX = goalX - shooter.x;
                const ballDirY = goalY - shooter.y;
                const ballAngle = Math.atan2(ballDirY, ballDirX) * 180 / Math.PI;

                // Knockback at 315° relative to ball direction (= ball angle + 315° = ball angle - 45°)
                const knockbackAngle = ballAngle + 315;
                interceptor.knockback(knockbackAngle, 5);

                // Continue with shot - check if on target
                const isOnTarget = goalX >= goalLeft && goalX <= goalRight && goalY <= 1;

                // ファイナルボス戦でオンターゲットの場合、GKが100%セーブ
                if (this.isFinalBoss && isOnTarget) {
                    console.log('[FINAL BOSS] Shot on target - GK save check');
                    const gkSaveResult = this.rollFinalBossBreakthrough('shoot', true);
                    if (!gkSaveResult) {
                        console.log('[FINAL BOSS] GK saves the shot!');
                        // GKがセーブ - ボールをGKの位置に移動
                        const gkPlayer = this.opponents['GK'];
                        if (gkPlayer) {
                            this.ballTargetX = gkPlayer.x;
                            this.ballTargetY = gkPlayer.y;
                            this.ballAnimating = true;
                        }
                        this.logAction({
                            action: 'shoot_saved_by_gk',
                            interceptor: interceptor.positionKey,
                            gkSave: true
                        });
                        if (this.syncMode) {
                            this.awaitingShootResult = false;
                            this.handleOpponentTakeover();
                            this.ballSpeed = 80;
                        } else {
                            setTimeout(() => {
                                this.awaitingShootResult = false;
                                this.handleOpponentTakeover();
                                this.ballSpeed = 80;
                            }, 500);
                        }
                        return;
                    }
                }

                // 同期モードでは即座に処理
                if (this.syncMode) {
                    this.awaitingShootResult = false;
                    this.logAction({
                        action: 'shoot_through_block',
                        interceptor: interceptor.positionKey,
                        isOnTarget: isOnTarget
                    });
                    if (isOnTarget) {
                        this.addScore('player');
                    } else {
                        this.logAction({ action: 'shoot_miss' });
                        this.handleOpponentTakeover();
                    }
                    this.ballSpeed = 80;
                } else {
                    // Delay success/failure until ball reaches goal
                    setTimeout(() => {
                        this.awaitingShootResult = false;
                        if (isOnTarget) {
                            this.addScore('player');
                        } else {
                            this.handleOpponentTakeover();
                        }
                        this.ballSpeed = 80;
                    }, 500);
                }
            } else {
                console.log('Interception successful - shot blocked');
                // Failure - interception successful, show overlay
                this.ballTargetX = interceptor.x;
                this.ballTargetY = interceptor.y;
                this.ballAnimating = true;
                this.ballSpeed = 80;

                // Pause and show interception
                this.interceptionInfo = {
                    type: 'shoot',
                    interceptor: interceptor,
                    shooter: this.ballHolder,
                    shootType: shootType
                };
                this.pendingTakeover = true;

                // 同期モードでは即座に処理
                if (this.syncMode) {
                    this.awaitingShootResult = false;
                    this.logAction({
                        action: 'shoot_blocked',
                        interceptor: interceptor.positionKey
                    });
                    this.pause();
                    if (this.onInterceptionCallback) {
                        this.onInterceptionCallback(this.interceptionInfo);
                    }
                } else {
                    setTimeout(() => {
                        this.awaitingShootResult = false;
                        this.pause();
                        if (this.onInterceptionCallback) {
                            this.onInterceptionCallback(this.interceptionInfo);
                        }
                    }, 500);
                }
            }
            return;
        }

        // No interception - check if shot is on target
        // Goal frame: x between 42.5% and 57.5%, y at 0%
        const isOnTarget = goalX >= goalLeft && goalX <= goalRight && goalY <= 1;

        // ファイナルボス戦でオンターゲットの場合、GKが100%セーブ
        if (this.isFinalBoss && isOnTarget) {
            console.log('[FINAL BOSS] Shot on target (no FP intercept) - GK save check');
            const gkSaveResult = this.rollFinalBossBreakthrough('shoot', true);
            if (!gkSaveResult) {
                console.log('[FINAL BOSS] GK saves the shot!');
                // GKがセーブ - ボールをGKの位置に移動
                const gkPlayer = this.opponents['GK'];
                if (gkPlayer) {
                    this.ballTargetX = gkPlayer.x;
                    this.ballTargetY = gkPlayer.y;
                    this.ballAnimating = true;
                }
                this.logAction({
                    action: 'shoot_saved_by_gk',
                    noFPIntercept: true,
                    gkSave: true
                });
                if (this.syncMode) {
                    this.awaitingShootResult = false;
                    this.handleOpponentTakeover();
                    this.ballSpeed = 80;
                } else {
                    setTimeout(() => {
                        this.awaitingShootResult = false;
                        this.handleOpponentTakeover();
                        this.ballSpeed = 80;
                    }, 500);
                }
                return;
            }
        }

        // 同期モードでは即座に処理
        if (this.syncMode) {
            this.awaitingShootResult = false;
            this.logAction({
                action: 'shoot_result',
                isOnTarget: isOnTarget,
                result: isOnTarget ? 'goal' : 'miss'
            });
            if (isOnTarget) {
                this.addScore('player');
            } else {
                this.handleOpponentTakeover();
            }
            this.ballSpeed = 80;
        } else {
            setTimeout(() => {
                this.awaitingShootResult = false;
                if (isOnTarget) {
                    this.addScore('player');
                } else {
                    this.handleOpponentTakeover();
                }
                this.ballSpeed = 80;
            }, 500);
        }
    }

    checkLineInterception(x1, y1, x2, y2) {
        console.log('checkLineInterception called with:', {x1, y1, x2, y2});
        const INTERCEPTION_THRESHOLD = 2;
        const checkedOpponents = [];

        try {
            for (let opp of Object.values(this.opponents)) {
                if (opp.positionKey === 'GK') continue; // GK doesn't intercept passes
                console.log('Checking opponent:', opp.positionKey, 'at', opp.x, opp.y);
                const dist = pointToLineDistance(opp.x, opp.y, x1, y1, x2, y2);
                console.log('Distance to line:', dist);

                checkedOpponents.push({
                    position: opp.positionKey,
                    x: opp.x,
                    y: opp.y,
                    distanceToLine: dist,
                    withinThreshold: dist < INTERCEPTION_THRESHOLD
                });

                if (dist < INTERCEPTION_THRESHOLD) {
                    console.log('Interception detected!');
                    // ログ記録：インターセプト判定詳細
                    this.logAction({
                        action: 'line_interception_check',
                        line: { from: { x: x1, y: y1 }, to: { x: x2, y: y2 } },
                        threshold: INTERCEPTION_THRESHOLD,
                        checkedOpponents: checkedOpponents,
                        result: 'interceptor_found',
                        interceptor: opp.positionKey,
                        interceptorPos: { x: opp.x, y: opp.y },
                        distance: dist
                    });
                    return opp;
                }
            }
            console.log('No interception');
            // ログ記録：インターセプトなし
            this.logAction({
                action: 'line_interception_check',
                line: { from: { x: x1, y: y1 }, to: { x: x2, y: y2 } },
                threshold: INTERCEPTION_THRESHOLD,
                checkedOpponents: checkedOpponents,
                result: 'no_interceptor'
            });
            return null;
        } catch (error) {
            console.error('Error in checkLineInterception:', error);
            return null;
        }
    }

    checkDribbleInterception(player) {
        const INTERCEPTION_THRESHOLD = 3;
        const checkedOpponents = [];

        for (let opp of Object.values(this.opponents)) {
            if (opp.positionKey === 'GK') continue;
            const dist = distance(player.x, player.y, opp.x, opp.y);

            checkedOpponents.push({
                position: opp.positionKey,
                x: opp.x,
                y: opp.y,
                distanceToPlayer: dist,
                withinThreshold: dist < INTERCEPTION_THRESHOLD
            });

            if (dist < INTERCEPTION_THRESHOLD) {
                // ログ記録：ドリブルインターセプト判定詳細
                this.logAction({
                    action: 'dribble_interception_check',
                    playerPos: { x: player.x, y: player.y },
                    threshold: INTERCEPTION_THRESHOLD,
                    checkedOpponents: checkedOpponents,
                    result: 'interceptor_found',
                    interceptor: opp.positionKey,
                    interceptorPos: { x: opp.x, y: opp.y },
                    distance: dist
                });
                return opp;
            }
        }

        // ログ記録：インターセプトなし
        this.logAction({
            action: 'dribble_interception_check',
            playerPos: { x: player.x, y: player.y },
            threshold: INTERCEPTION_THRESHOLD,
            checkedOpponents: checkedOpponents,
            result: 'no_interceptor'
        });
        return null;
    }

    // ファイナルボス専用AI - パス線上に立ちはだかる
    updateFinalBossAI(ballHolderPlayer) {
        const goalX = 50;
        const goalY = 0;

        // 各味方プレイヤーへのパスラインを計算
        const passTargets = Object.entries(this.players)
            .filter(([key]) => key !== this.ballHolder)
            .map(([key, player]) => ({
                key,
                x: player.x,
                y: player.y,
                // ボールホルダーからの中間点（パスをカットする位置）
                midX: (ballHolderPlayer.x + player.x) / 2,
                midY: (ballHolderPlayer.y + player.y) / 2
            }));

        // ゴールへのシュートライン（中央）
        const shootLine = {
            key: 'GOAL',
            midX: (ballHolderPlayer.x + goalX) / 2,
            midY: (ballHolderPlayer.y + goalY) / 2
        };

        // 敵フィールドプレーヤーを優先度順に配置
        const fieldPlayers = Object.entries(this.opponents)
            .filter(([key]) => key !== 'GK')
            .map(([key, opp]) => ({ key, opp }));

        // 最も重要なターゲット（ゴール方向）に最も近い敵を配置
        const sortedTargets = [...passTargets, shootLine].sort((a, b) => {
            // ゴール方向（y座標が小さい）を優先
            return a.midY - b.midY;
        });

        // 各敵を最も近いパスライン上に配置
        fieldPlayers.forEach((fp, idx) => {
            if (idx < sortedTargets.length) {
                const target = sortedTargets[idx];
                // パスライン上の中間点に向かって移動
                fp.opp.setTarget(target.midX, target.midY);
            } else {
                // 余った敵はボールホルダーに向かう
                fp.opp.setTarget(ballHolderPlayer.x, ballHolderPlayer.y);
            }
        });

        // GKの移動処理
        const gk = this.opponents['GK'];
        if (gk) {
            const goalLeft = 42.5;
            const goalRight = 57.5;
            const margin = 1;

            // シュート中の場合、ボールの進行に合わせてGKも滑らかに移動
            if (this.finalBossShootTargetX !== undefined && this.ballAnimating && this.ballTargetY <= 1) {
                // シュート開始時のGK位置を保存
                if (this.finalBossGKStartX === undefined) {
                    this.finalBossGKStartX = gk.x;
                    this.finalBossShootStartY = this.ballY; // シュート開始時のボールY位置
                }

                // ボールの進行度合いを計算（0〜1）
                const totalDistance = this.finalBossShootStartY - this.ballTargetY;
                const traveled = this.finalBossShootStartY - this.ballY;
                const progress = Math.min(1, Math.max(0, traveled / totalDistance));

                // GKの位置をボールの進行に合わせて補間
                const startX = this.finalBossGKStartX;
                const endX = Math.max(goalLeft + margin, Math.min(goalRight - margin, this.finalBossShootTargetX));
                const currentX = startX + (endX - startX) * progress;

                // 直接位置を設定（滑らかに見える）
                gk.x = currentX;
                gk.targetX = currentX;
            } else if (this.ballAnimating) {
                // パス中はボールを追跡
                const targetX = Math.max(goalLeft + margin, Math.min(goalRight - margin, this.ballX));
                gk.setTarget(targetX, gk.y);
            } else {
                // 通常時はボールホルダーのX座標を追跡
                const targetX = Math.max(goalLeft + margin, Math.min(goalRight - margin, ballHolderPlayer.x));
                gk.setTarget(targetX, gk.y);
                // シュート完了後はフラグをクリア
                if (this.finalBossShootTargetX !== undefined) {
                    this.finalBossShootTargetX = undefined;
                    this.finalBossGKStartX = undefined;
                    this.finalBossShootStartY = undefined;
                }
            }
        }
    }

    handleOpponentTakeover() {
        console.log('handleOpponentTakeover called:', {
            currentTacticIndex: this.currentTacticIndex,
            failedTacticIndex: this.failedTacticIndex,
            isPaused: this.isPaused,
            currentScore: {...this.score}
        });

        // Record which tactic failed (before it gets incremented)
        if (this.failedTacticIndex === null || this.failedTacticIndex === undefined) {
            this.failedTacticIndex = this.currentTacticIndex;
            console.log('Set failedTacticIndex to:', this.failedTacticIndex);
        }

        // Opponent takes over - they score
        console.log('About to add opponent score');
        this.addScore('opponent');
        // Note: resetPositions is already called inside addScore, no need to call again
        console.log('handleOpponentTakeover complete. New score:', this.score);
    }

    updateOpponentAI(dt) {
        const tactic = this.opponent.tactic;
        const ballHolderPlayer = this.players[this.ballHolder];

        // ファイナルボス戦では特別なAI - パス/シュート線上に立ちはだかる
        if (this.isFinalBoss) {
            this.updateFinalBossAI(ballHolderPlayer);
            return;
        }

        switch (tactic.behavior) {
            case 'all_to_ball':
                // Zone defense with ball pressure - each defender acts independently
                Object.entries(this.opponents).forEach(([key, opp]) => {
                    if (key === 'GK') return;

                    const basePos = CONFIG.OPPONENT_POSITIONS[key];
                    const distToBall = distance(opp.x, opp.y, ballHolderPlayer.x, ballHolderPlayer.y);

                    // Only the nearest 2 defenders pressure the ball
                    const allDists = Object.entries(this.opponents)
                        .filter(([k]) => k !== 'GK')
                        .map(([k, o]) => ({
                            key: k,
                            dist: distance(o.x, o.y, ballHolderPlayer.x, ballHolderPlayer.y)
                        }))
                        .sort((a, b) => a.dist - b.dist);

                    const isNearestTwo = allDists.slice(0, 2).some(d => d.key === key);

                    if (isNearestTwo && distToBall > 5) {
                        // Pressure ball holder
                        const dx = ballHolderPlayer.x - opp.x;
                        const dy = ballHolderPlayer.y - opp.y;
                        opp.setTarget(
                            opp.x + dx * 0.6,
                            opp.y + dy * 0.6
                        );
                    } else {
                        // Maintain zone with slight shift toward ball
                        const shiftX = (ballHolderPlayer.x - 50) * 0.15;
                        const shiftY = Math.max(0, (ballHolderPlayer.y - basePos.y) * 0.2);
                        opp.setTarget(
                            basePos.x + shiftX,
                            basePos.y + shiftY
                        );
                    }
                });
                break;

            case 'man_to_man':
                // Each defender marks their assigned attacker independently
                const positionMap = {
                    'LW': 'RW', 'RW': 'LW', 'CB': 'CB',
                    'LB': 'RB', 'RB': 'LB', 'P': 'P'
                };
                Object.entries(this.opponents).forEach(([key, opp]) => {
                    if (key === 'GK') return;
                    const targetPos = positionMap[key];
                    const target = this.players[targetPos];
                    if (target) {
                        const isMarkingBallHolder = targetPos === this.ballHolder;
                        const dist = distance(opp.x, opp.y, target.x, target.y);

                        if (isMarkingBallHolder) {
                            // Apply tight pressure on ball holder
                            if (dist > 2) {
                                opp.setTarget(target.x, target.y);
                            }
                        } else {
                            // Mark other attackers at distance
                            const dx = target.x - opp.x;
                            const dy = target.y - opp.y;
                            const markingDist = 3;
                            if (dist > markingDist) {
                                opp.setTarget(
                                    target.x - dx / dist * (markingDist - 1),
                                    target.y - dy / dist * (markingDist - 1)
                                );
                            }
                        }
                    }
                });
                break;

            case 'zone':
                // Pure zone defense - defenders shift zones based on ball position
                Object.entries(this.opponents).forEach(([key, opp]) => {
                    if (key === 'GK') return;
                    const basePos = CONFIG.OPPONENT_POSITIONS[key];

                    // Shift zone horizontally based on ball position
                    const horizontalShift = (ballHolderPlayer.x - 50) * 0.2;

                    // Shift zone forward if ball is deep
                    const verticalShift = Math.max(0, (ballHolderPlayer.y - basePos.y) * 0.15);

                    opp.setTarget(
                        Math.max(5, Math.min(95, basePos.x + horizontalShift)),
                        Math.max(5, Math.min(95, basePos.y + verticalShift))
                    );
                });
                break;

            default:
                // Balanced - each defender balances between zone and ball pressure
                Object.entries(this.opponents).forEach(([key, opp]) => {
                    if (key === 'GK') return;
                    const basePos = CONFIG.OPPONENT_POSITIONS[key];
                    const distToBall = distance(opp.x, opp.y, ballHolderPlayer.x, ballHolderPlayer.y);

                    // Closer defenders apply more pressure
                    const pressureFactor = Math.max(0.1, Math.min(0.5, 20 / distToBall));

                    const toBall = {
                        x: ballHolderPlayer.x - opp.x,
                        y: ballHolderPlayer.y - opp.y
                    };
                    opp.setTarget(
                        basePos.x + toBall.x * pressureFactor,
                        basePos.y + toBall.y * pressureFactor
                    );
                });
        }

        // GK movement - follows ball position and reacts to shots
        const gk = this.opponents['GK'];
        if (gk) {
            const basePos = CONFIG.OPPONENT_POSITIONS['GK'];

            // Goal frame is 42.5% to 57.5%
            const goalLeft = 42.5;
            const goalRight = 57.5;
            const goalCenter = 50;

            let targetX;

            // ファイナルボス戦でシュート中の場合、最終目標位置に直接向かう
            if (this.isFinalBoss && this.finalBossShootTargetX !== undefined && this.ballAnimating && this.ballTargetY <= 1) {
                // シュートの最終目標位置に向かって移動（ボールの現在位置ではなく）
                targetX = this.finalBossShootTargetX;
            } else if (this.ballAnimating) {
                // Follow the ball's actual position during animation
                targetX = this.ballX;

                // If ball is moving toward goal (y decreasing toward 0), react faster
                if (this.ballY < 30 && this.ballTargetY < this.ballY) {
                    // Ball is approaching goal - GK moves more aggressively to ball's x position
                    targetX = this.ballX;
                }
            } else {
                // When ball is not animating, follow ball holder's position
                targetX = ballHolderPlayer.x;
                // シュート完了後はフラグをクリア
                if (this.finalBossShootTargetX !== undefined) {
                    this.finalBossShootTargetX = undefined;
                }
            }

            // Clamp to goal area with some margin
            targetX = Math.max(goalLeft + 1, Math.min(goalRight - 1, targetX));

            // Move GK only in x direction, y stays at goal line
            gk.setTarget(targetX, basePos.y);
        }
    }

    addScore(team) {
        const oldScore = { ...this.score };
        console.log('addScore called:', {team, newScore: this.score[team] + 1});
        this.score[team]++;

        // ログ記録：スコア変更
        this.logAction({
            action: 'score_change',
            team: team,
            oldScore: oldScore,
            newScore: { ...this.score },
            change: team === 'player' ? '+1 player' : '+1 opponent'
        });

        if (this.onScoreCallback) {
            console.log('Calling onScoreCallback');
            this.onScoreCallback(this.score);
        }
        console.log('Calling resetPositions from addScore');
        this.resetPositions();
        console.log('addScore complete');
    }

    resetPositions() {
        console.log('resetPositions called');
        // Reset all players to initial positions
        Object.values(this.players).forEach(p => p.resetPosition());
        Object.values(this.opponents).forEach(p => p.resetPosition());

        // Reset ball to CB
        this.ballHolder = 'CB';
        const cbPlayer = this.players['CB'];
        if (cbPlayer) {
            this.ballX = cbPlayer.x;
            this.ballY = cbPlayer.y;
            this.ballTargetX = cbPlayer.x;
            this.ballTargetY = cbPlayer.y;
        }
        this.ballAnimating = false;
        this.ballSpeed = 80;

        // Reset tactics
        this.currentTacticIndex = 0;
        this.actionInProgress = null;
        this.awaitingShootResult = false;
        console.log('resetPositions complete:', {
            ballHolder: this.ballHolder,
            currentTacticIndex: this.currentTacticIndex,
            actionInProgress: this.actionInProgress
        });
    }

    endMatch(result) {
        console.log('endMatch called:', {
            result,
            score: this.score,
            failedTacticIndex: this.failedTacticIndex,
            hasCallback: !!this.onMatchEndCallback
        });
        this.stop();
        if (this.onMatchEndCallback) {
            console.log('Calling onMatchEndCallback with:', {
                score: this.score,
                result: result,
                failedTacticIndex: result === 'attempt_failed' ? this.failedTacticIndex : null
            });
            this.onMatchEndCallback({
                score: this.score,
                result: result,
                failedTacticIndex: result === 'attempt_failed' ? this.failedTacticIndex : null
            });
            console.log('onMatchEndCallback completed');
        } else {
            console.error('No onMatchEndCallback registered!');
        }
    }

    getBallPosition() {
        return { x: this.ballX, y: this.ballY };
    }

    destroy() {
        this.stop();
        this.players = {};
        this.opponents = {};
        this.tactics = [];

        // Clean up action icon
        if (this.actionIconElement) {
            this.actionIconElement.remove();
            this.actionIconElement = null;
        }
    }

    // === 同期実行モード（テスト用） ===
    runSync(maxFrames = 10000) {
        const result = {
            success: false,
            reason: null,
            ballHolderHistory: [this.ballHolder],
            actionLog: [],  // 詳細アクションログ
            score: { player: 0, opponent: 0 },
            interceptedAt: null,
            error: null
        };

        // 同期モードフラグ
        this.syncMode = true;
        this.syncResult = null;
        this.syncActionLog = result.actionLog;

        // コールバックを同期用にオーバーライド
        const originalInterceptionCallback = this.onInterceptionCallback;
        const originalMatchEndCallback = this.onMatchEndCallback;

        this.onInterceptionCallback = (info) => {
            result.reason = 'intercepted';
            result.interceptedAt = {
                type: info.type,
                interceptor: info.interceptor.positionKey,
                from: info.from,
                to: info.to
            };
            result.actionLog.push({
                action: 'intercepted',
                type: info.type,
                interceptor: info.interceptor.positionKey,
                from: info.from,
                to: info.to
            });
            this.syncResult = 'intercepted';
        };

        this.onMatchEndCallback = (endResult) => {
            if (endResult.result === 'win') {
                result.success = true;
                result.reason = 'goal';
                result.actionLog.push({
                    action: 'goal',
                    score: { ...endResult.score }
                });
            } else if (endResult.result === 'attempt_failed') {
                result.reason = 'attempt_failed';
                result.failedTacticIndex = endResult.failedTacticIndex;
            } else {
                result.reason = endResult.result;
            }
            result.score = endResult.score;
            this.syncResult = endResult.result;
        };

        // シミュレーション開始
        this.isRunning = true;
        this.lastTime = 0;

        let frameCount = 0;
        const dt = 1 / CONFIG.GAME.FPS; // 固定タイムステップ
        let lastTacticIndex = -1;

        try {
            while (frameCount < maxFrames && !this.syncResult) {
                // ボールアニメーションを即座に完了
                if (this.ballAnimating) {
                    this.ballX = this.ballTargetX;
                    this.ballY = this.ballTargetY;
                    this.ballAnimating = false;
                }

                // ポーズ中なら終了（インターセプト発生）
                if (this.isPaused) {
                    break;
                }

                // 新しい作戦開始時にログ記録
                if (this.currentTacticIndex !== lastTacticIndex &&
                    this.currentTacticIndex < this.tactics.length) {
                    const tactic = this.tactics[this.currentTacticIndex];
                    const holder = this.players[this.ballHolder];

                    result.actionLog.push({
                        action: 'tactic_start',
                        tacticIndex: this.currentTacticIndex,
                        type: tactic.type,
                        tactic: { ...tactic },
                        ballHolder: this.ballHolder,
                        ballHolderPos: holder ? { x: holder.x, y: holder.y } : null
                    });
                    lastTacticIndex = this.currentTacticIndex;
                }

                // 1フレーム更新
                this.update(dt);

                // ballHolderの変更を記録
                const lastHolder = result.ballHolderHistory[result.ballHolderHistory.length - 1];
                if (this.ballHolder !== lastHolder) {
                    result.ballHolderHistory.push(this.ballHolder);
                    result.actionLog.push({
                        action: 'ballholder_changed',
                        from: lastHolder,
                        to: this.ballHolder
                    });
                }

                frameCount++;

                // 全作戦完了チェック
                if (!this.actionInProgress && this.currentTacticIndex >= this.tactics.length) {
                    if (!this.syncResult) {
                        result.reason = 'tactics_completed_no_goal';
                        break;
                    }
                }
            }

            // タイムアウト
            if (frameCount >= maxFrames && !this.syncResult) {
                result.reason = 'timeout';
                result.error = `Max frames (${maxFrames}) exceeded`;
            }

        } catch (e) {
            result.reason = 'error';
            result.error = e.message;
            result.stack = e.stack;
        }

        // 全選手の座標を収集
        const playerPositions = {};
        const opponentPositions = {};
        const boundaryViolations = [];

        for (const [key, player] of Object.entries(this.players)) {
            playerPositions[key] = { x: player.x, y: player.y };
            // 境界チェック（config.jsの初期位置を考慮）
            // LW: x=3.75, RW: x=96.25, GK: y=105 は意図的な設計
            let minX = 0, maxX = 100, minY = 0, maxY = 100;
            if (key === 'GK') {
                maxY = 110; // GKは画面外(y=105)に配置される
            }
            if (player.x < minX || player.x > maxX || player.y < minY || player.y > maxY) {
                boundaryViolations.push({
                    type: 'player',
                    position: key,
                    x: player.x,
                    y: player.y,
                    violation: player.x < minX ? `x<${minX}` : player.x > maxX ? `x>${maxX}` : player.y < minY ? `y<${minY}` : `y>${maxY}`
                });
            }
        }

        for (const [key, opp] of Object.entries(this.opponents)) {
            opponentPositions[key] = { x: opp.x, y: opp.y };
            // 相手選手も0-100範囲でチェック（GKは0-5付近）
            let minX = 0, maxX = 100, minY = 0, maxY = 100;
            if (opp.x < minX || opp.x > maxX || opp.y < minY || opp.y > maxY) {
                boundaryViolations.push({
                    type: 'opponent',
                    position: key,
                    x: opp.x,
                    y: opp.y,
                    violation: opp.x < minX ? `x<${minX}` : opp.x > maxX ? `x>${maxX}` : opp.y < minY ? `y<${minY}` : `y>${maxY}`
                });
            }
        }

        // シミュレーション終了時のステートクリーンアップ（finalState記録前に実行）
        // ボールアニメーション中に終了した場合、アニメーションを完了させる
        if (this.ballAnimating) {
            this.ballX = this.ballTargetX;
            this.ballY = this.ballTargetY;
            this.ballAnimating = false;
        }

        // 最終状態を記録
        result.finalState = {
            ballHolder: this.ballHolder,
            ballPos: { x: this.ballX, y: this.ballY },
            score: { ...this.score },
            tacticsExecuted: this.currentTacticIndex,
            totalTactics: this.tactics.length,
            playerPositions: playerPositions,
            opponentPositions: opponentPositions,
            boundaryViolations: boundaryViolations,
            stateFlags: {
                isPaused: this.isPaused,
                isRunning: this.isRunning,
                awaitingShootResult: this.awaitingShootResult,
                ballAnimating: this.ballAnimating,
                pendingTakeover: this.pendingTakeover
            }
        };

        // クリーンアップ
        this.syncMode = false;
        this.syncActionLog = null;
        this.isRunning = false;
        this.isPaused = false;
        this.onInterceptionCallback = originalInterceptionCallback;
        this.onMatchEndCallback = originalMatchEndCallback;

        return result;
    }

    // アクションログ記録（同期モード時のみ）
    logAction(actionData) {
        if (this.syncMode && this.syncActionLog) {
            this.syncActionLog.push(actionData);
        }
    }
}

// Create tactic object
export function createTactic(type, data) {
    return {
        type: type,
        ...data
    };
}

// Validate tactics
export function validateTactics(tactics) {
    if (!tactics || tactics.length === 0) {
        return { valid: false, error: "作戦が設定されていません" };
    }

    // Check each tactic
    for (let i = 0; i < tactics.length; i++) {
        const tactic = tactics[i];

        if (!tactic.type) {
            return { valid: false, error: `作戦${i + 1}: タイプが未設定` };
        }

        if (tactic.type === 'pass') {
            if (!tactic.from || !tactic.to) {
                return { valid: false, error: `作戦${i + 1}: パス元またはパス先が未設定` };
            }
        }

        if (tactic.type === 'dribble') {
            if (!tactic.direction || !tactic.distance || !tactic.nextAction) {
                return { valid: false, error: `作戦${i + 1}: ドリブル設定が不完全` };
            }
            // Check passTo is set when nextAction is pass
            if (tactic.nextAction === 'pass' && !tactic.passTo) {
                return { valid: false, error: `作戦${i + 1}: ドリブル後のパス先が未設定` };
            }
        }

        if (tactic.type === 'shoot') {
            if (!tactic.shootType) {
                return { valid: false, error: `作戦${i + 1}: シュートタイプが未設定` };
            }
        }
    }

    return { valid: true };
}
