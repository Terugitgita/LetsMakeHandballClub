// audio.js - Audio System with Lazy Loading

import { CONFIG } from './config.js';

export class AudioManager {
    constructor() {
        this.sounds = {};
        this.bgm = null;
        this.currentBGMKey = null;  // 現在再生中のBGMキー
        this.bgmVolume = 0.3;
        this.seVolume = 0.5;
        this.muted = false;
        this.initialized = false;
        this.suteePlayed = false;
        this.loadingPromise = null;
        this.audioUnlocked = false;  // iOS用：音声許可フラグ

        // iOS対応: ユーザーインタラクションで音声を有効化
        this.setupIOSAudioUnlock();
    }

    // iOS対応: 最初のタップで音声を有効化
    setupIOSAudioUnlock() {
        const unlockAudio = () => {
            if (this.audioUnlocked) return;

            // 無音のAudioContextを作成して再生許可を取得
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const buffer = audioContext.createBuffer(1, 1, 22050);
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);

            // 既存の音声も一度再生を試みる
            Object.values(this.sounds).forEach(audio => {
                audio.play().then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                }).catch(() => {});
            });

            this.audioUnlocked = true;
            console.log('iOS audio unlocked');

            // イベントリスナーを削除
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('touchend', unlockAudio);
            document.removeEventListener('click', unlockAudio);
        };

        // タッチとクリックの両方に対応
        document.addEventListener('touchstart', unlockAudio, { once: false });
        document.addEventListener('touchend', unlockAudio, { once: false });
        document.addEventListener('click', unlockAudio, { once: false });
    }

    // 音声ファイルを遅延ロード（バックグラウンドで）
    async loadSounds() {
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            const soundList = {
                // BGM
                match: 'sounds/game_maou_bgm_neorock81.mp3',
                awakening: 'sounds/level_upレベルアップ (1).mp3',
                lost: 'sounds/lost_呪いの旋律.mp3',
                practice: 'sounds/practice_maou_bgm_fantasy13.mp3',
                victory: 'sounds/victory_ラッパのファンファーレ.mp3',

                // 効果音
                training_select: 'sounds/practice_和太鼓でドン (1).mp3',
                sutee: 'sounds/souta_間抜け7.mp3'
            };

            const promises = Object.entries(soundList).map(([key, src]) => {
                return new Promise((resolve) => {
                    const audio = new Audio();
                    audio.preload = 'auto';
                    audio.addEventListener('canplaythrough', () => {
                        this.sounds[key] = audio;
                        resolve();
                    }, { once: true });
                    audio.addEventListener('error', () => {
                        console.warn(`Failed to load sound: ${src}`);
                        resolve();
                    });
                    audio.src = src;
                });
            });

            await Promise.all(promises);
            this.initialized = true;
        })();

        return this.loadingPromise;
    }

    // 効果音を再生（ロード待たない）
    playSE(soundKey) {
        if (this.muted) return;

        const sound = this.sounds[soundKey];
        if (sound) {
            const clone = sound.cloneNode();
            clone.volume = this.seVolume;
            clone.play().catch(() => {});
        }
    }

    // BGMを再生（ロード待たない）
    playBGM(soundKey, loop = true) {
        if (this.muted) return;

        // 同じBGMが既に再生中ならスキップ（画面遷移でリセットしない）
        if (this.currentBGMKey === soundKey && this.bgm && !this.bgm.paused) {
            return;
        }

        // 現在のBGMを停止
        this.stopBGM();

        const sound = this.sounds[soundKey];
        if (sound) {
            this.bgm = sound;
            this.currentBGMKey = soundKey;
            this.bgm.loop = loop;
            this.bgm.volume = this.bgmVolume;
            this.bgm.play().catch(() => {});
        }
    }

    // BGMを停止
    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
            this.bgm = null;
            this.currentBGMKey = null;
        }
    }

    // ミュート切り替え
    toggleMute() {
        this.muted = !this.muted;
        if (this.muted && this.bgm) {
            this.bgm.pause();
        } else if (!this.muted && this.bgm) {
            this.bgm.play().catch(() => {});
        }
        return this.muted;
    }

    // 音量調整
    setVolume(bgmVol, seVol) {
        this.bgmVolume = Math.max(0, Math.min(1, bgmVol));
        this.seVolume = Math.max(0, Math.min(1, seVol));
        if (this.bgm) {
            this.bgm.volume = this.bgmVolume;
        }
    }

    // すぅぅぅぅてぇ音声を再生（一度だけ）
    playSuteeOnce() {
        if (!this.suteePlayed) {
            this.playSE('sutee');
            this.suteePlayed = true;
        }
    }

    // すぅぅぅぅてぇフラグをリセット
    resetSuteeFlag() {
        this.suteePlayed = false;
    }
}

// グローバルインスタンス
export const audioManager = new AudioManager();

// デバッグ用
if (CONFIG.DEBUG.ENABLED) {
    window.audioManager = audioManager;
}
