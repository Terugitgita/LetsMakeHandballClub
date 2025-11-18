// assets.js - Image and Asset Loading System

export class AssetManager {
    constructor() {
        this.images = {};
        this.loadingPromise = null;
        this.loaded = false;
    }

    // 画像を遅延ロード（バックグラウンドで）
    async loadImages() {
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            const imageList = {
                // キャプテン性格アイコン
                captain_amayakashi: 'images/amayakashi_1OIG1.jpg',
                captain_nekketsu: 'images/nekketsu_14OIG1.jpg',
                captain_pawahara: 'images/powerharra_12OIG1.eTU_lVQjvIO5p.jpg',

                // 試合中アクションアイコン
                action_dribble: 'images/powerharra_12OIG1.eTU_lVQjvIO5p.jpg',
                action_pass: 'images/pass_14OIG4.jpg',
                action_shoot: 'images/shoot_1OIG1.3WoSa9pPZV7Y.jpg',

                // 結果画像
                result_victory: 'images/victory_2OIG4.jpg',
                result_lost: 'images/lost_23OIG4.jpg',

                // オープニング
                opening: 'images/opening_1OIG1.jpg'
            };

            const promises = Object.entries(imageList).map(([key, src]) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        this.images[key] = img;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Failed to load image: ${src}`);
                        resolve();
                    };
                    img.src = src;
                });
            });

            await Promise.all(promises);
            this.loaded = true;
        })();

        return this.loadingPromise;
    }

    // 画像を取得（まだロードされていなければnull）
    getImage(key) {
        return this.images[key] || null;
    }

    // 画像が読み込まれているかチェック
    isLoaded() {
        return this.loaded;
    }

    // キャプテン性格に応じた画像を取得
    getCaptainImage(personality) {
        const imageMap = {
            '甘やかし': 'captain_amayakashi',
            '熱血': 'captain_nekketsu',
            'パワハラ': 'captain_pawahara'
        };
        const key = imageMap[personality];
        return key ? this.getImage(key) : null;
    }

    // アクション画像を取得
    getActionImage(action) {
        const imageMap = {
            'dribble': 'action_dribble',
            'pass': 'action_pass',
            'shoot': 'action_shoot'
        };
        const key = imageMap[action];
        return key ? this.getImage(key) : null;
    }
}

// グローバルインスタンス
export const assetManager = new AssetManager();
