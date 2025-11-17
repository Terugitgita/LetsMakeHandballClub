# 設定一覧 - ハンドボールシミュレーションゲーム「ズッキュン中学物語」

## 1. ストーリー設定

### 1.1 主人公チーム
```javascript
const PLAYER_TEAM = {
    name: "ズッキュン中学",
    prefecture: "奈良",
    city: "奈良市",
    description: "全国大会初出場の公立中学校",
    uniformColor: "#0066cc"
};
```

### 1.2 最終ボス
```javascript
const FINAL_BOSS = {
    name: "てぇでぇ's学園",
    prefecture: "K航拿",  // 架空の48番目の都道府県
    description: "偏差値の超高い進学校",
    uniformColor: "#ff0000",
    guaranteedFinal: true  // 必ず決勝で対戦
};
```

### 1.3 都道府県リスト
```javascript
const PREFECTURES = [
    // 実在の47都道府県
    "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
    "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
    "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜",
    "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫",
    "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口",
    "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎",
    "熊本", "大分", "宮崎", "鹿児島", "沖縄",
    // 架空の48番目
    "K航拿"
];
```

## 2. ゲームパラメータ

### 2.1 基本設定
```javascript
const GAME_CONFIG = {
    // 試合設定
    POINTS_TO_WIN: 5,           // 勝利に必要な得点
    PLAYERS_PER_TEAM: 7,         // チーム人数
    FPS: 30,                     // アニメーションFPS
    
    // トーナメント設定
    TOTAL_TEAMS: 48,             // 総チーム数（47都道府県+K航拿）
    SEEDED_TEAMS: 16,            // シードチーム数（48チームで32強を作る）
    TOTAL_WEEKS: 6,              // 優勝までの週数
    
    // コート設定
    COURT_WIDTH: 100,            // コート幅（マス）
    COURT_HEIGHT: 100,           // コート高さ（マス）
    GOAL_WIDTH: 7,               // ゴール幅（マス）
    CENTER_LINE: 50,             // センターライン位置
    
    // 保存設定
    STORAGE_KEY: "handballGame", // LocalStorageキー
    AUTO_SAVE: true              // 自動保存の有効/無効
};
```

### 2.2 初期能力値範囲
```javascript
const INITIAL_STATS = {
    MIN: 1,                      // 最小初期値
    MAX: 10,                     // 最大初期値
    ALLOW_FLOAT: true            // 小数値を許可
};
```

### 2.3 エースシステム
```javascript
const ACE_SYSTEM = {
    INITIAL_COUNT: 0,            // 初期エース数
    INCREMENT_PER_ROUND: 1,      // 1試合ごとの増加数
    STAT_MULTIPLIER: 1.5,        // 能力値倍率
    SIZE_MULTIPLIER: 1.5,        // 表示サイズ倍率
    RANDOM_POSITION: true        // ランダム配置
};
```

## 3. キャプテンシステム

### 3.1 性格設定
```javascript
const CAPTAIN_PERSONALITY = {
    "パワハラ": {
        growthMultiplier: 1.5,
        boycottWeek: 3,          // ボイコット開始週
        boycottEffect: 0,        // ボイコット時の成長率
        description: "厳しい指導で成長は早いが、3週目以降反発される"
    },
    "甘やかし": {
        growthMultiplier: 0.8,
        boycottWeek: null,
        boycottEffect: null,
        description: "優しい指導だが成長は遅め"
    },
    "熱血": {
        growthMultiplier: 1.0,
        boycottWeek: null,
        boycottEffect: null,
        description: "バランスの取れた指導"
    }
};
```

### 3.2 方針設定
```javascript
const CAPTAIN_POLICY = {
    "アグレッシブ": {
        statModifier: { pass: 1.0, dribble: 1.0, shoot: 1.5 },
        description: "攻撃重視でシュート力を強化"
    },
    "慎重": {
        statModifier: { pass: 1.5, dribble: 1.0, shoot: 1.0 },
        description: "パス回しを重視"
    },
    "目立ちたがり": {
        statModifier: { pass: 1.0, dribble: 1.5, shoot: 1.0 },
        description: "個人技を磨く"
    },
    "論理的": {
        statModifier: null,  // 最低能力値を1.5倍（動的計算）
        focusLowest: true,
        multiplier: 1.5,
        description: "弱点を重点的に強化"
    }
};
```

## 4. 練習システム

### 4.1 練習メニュー
```javascript
const TRAINING_MENU = {
    "パス練習": {
        effect: { pass: 1, dribble: 0, shoot: 0 },
        available: ["月", "火", "水", "木", "金"],
        description: "パス能力を強化"
    },
    "ドリブル練習": {
        effect: { pass: 0, dribble: 1, shoot: 0 },
        available: ["月", "火", "水", "木", "金"],
        description: "ドリブル能力を強化"
    },
    "シュート練習": {
        effect: { pass: 0, dribble: 0, shoot: 1 },
        available: ["月", "火", "水", "木", "金"],
        description: "シュート能力を強化"
    },
    "総合練習": {
        effect: { pass: 0.5, dribble: 0.5, shoot: 0.5 },
        available: ["月", "火", "水", "木", "金"],
        allowFloat: true,  // 端数を切り捨てない
        description: "全能力をバランスよく強化"
    },
    "休養": {
        effect: null,
        bonus: { all: 2, duration: "next_match" },
        available: ["金"],  // 金曜日のみ
        description: "次の試合で全能力+2"
    }
};
```

### 4.2 曜日設定
```javascript
const WEEK_SCHEDULE = {
    1: { day: "月", type: "training" },
    2: { day: "火", type: "training" },
    3: { day: "水", type: "training" },
    4: { day: "木", type: "training" },
    5: { day: "金", type: "training" },
    6: { day: "土", type: "match" },
    7: { day: "日", type: "rest", autoAdvance: true }
};
```

## 5. 試合システム

### 5.1 行動パラメータ
```javascript
const ACTION_CONFIG = {
    PASS: {
        type: "pass",
        checkLine: true,         // 直線判定
        speedStat: "pass"
    },
    DRIBBLE: {
        type: "dribble",
        directions: ["上", "下", "左", "右"],
        durations: {
            short: { time: 1, distance: 10, label: "短距離" },
            medium: { time: 3, distance: 30, label: "中距離" },
            long: { time: 5, distance: 50, label: "長距離" }
        },
        speedStat: "dribble"
    },
    SHOOT: {
        type: "shoot",
        checkLine: true,         // 直線判定
        speedStat: "shoot"
    }
};
```

### 5.2 成功率計算
```javascript
const SUCCESS_FORMULA = {
    // 基本計算式: 攻撃側能力 / (攻撃側能力 + 守備側能力) * 100
    calculate: function(attackStat, defenseStat, restBonus = false) {
        if (restBonus) attackStat += 2;
        const rate = (attackStat / (attackStat + defenseStat)) * 100;
        return Math.max(5, Math.min(95, rate));  // 5%〜95%にクランプ
    },
    MIN_RATE: 5,                // 最小成功率
    MAX_RATE: 95                 // 最大成功率
};
```

### 5.3 初期配置
```javascript
const INITIAL_POSITIONS = {
    PLAYER: {
        formation: "line",
        y: 25,                   // センターライン付近
        spread: 10,              // 選手間の間隔
        positions: [
            {x: 20, y: 25}, {x: 30, y: 25}, {x: 40, y: 25},
            {x: 50, y: 25}, {x: 60, y: 25}, {x: 70, y: 25},
            {x: 80, y: 25}
        ]
    },
    OPPONENT: {
        formation: "arc",
        baseY: 90,               // ゴール前
        positions: [
            {x: 35, y: 85}, {x: 45, y: 87}, {x: 50, y: 90},
            {x: 55, y: 87}, {x: 65, y: 85}, {x: 50, y: 93},
            {x: 50, y: 95}
        ]
    }
};
```

## 6. 地方別守備作戦

### 6.1 作戦詳細
```javascript
const REGIONAL_TACTICS = {
    "北海道": {
        name: "全員プレス",
        behavior: "all_to_ball",
        aggressiveness: 10,      // 攻撃性（1-10）
        description: "全員がボールホルダーに向かってくる"
    },
    "東北": {
        name: "マンツーマン",
        behavior: "man_to_man",
        aggressiveness: 7,
        description: "各選手に1人ずつマークする"
    },
    "関東": {
        name: "ゾーンディフェンス",
        behavior: "zone",
        aggressiveness: 5,
        description: "決められたエリアを守る"
    },
    "中部": {
        name: "プレスディフェンス",
        behavior: "press",
        aggressiveness: 9,
        description: "前線から強い圧力をかける"
    },
    "近畿": {
        name: "バランス型",
        behavior: "balanced",
        aggressiveness: 6,
        description: "状況に応じて守備形態を変える"
    },
    "中国": {
        name: "サイド守備重視",
        behavior: "side_focus",
        aggressiveness: 4,
        description: "サイドからの攻撃を重点的に守る"
    },
    "四国": {
        name: "センター守備重視",
        behavior: "center_focus",
        aggressiveness: 4,
        description: "中央からの攻撃を重点的に守る"
    },
    "九州": {
        name: "個人技重視",
        behavior: "individual",
        aggressiveness: 8,
        description: "1対1の守備を多用する"
    },
    "K航拿": {
        name: "完全守備",
        behavior: "perfect_defense",
        aggressiveness: 10,
        description: "隙のない完璧な守備陣形"
    }
};
```

### 6.2 地方割り当て
```javascript
const PREFECTURE_TO_REGION = {
    "北海道": "北海道",
    "青森": "東北", "岩手": "東北", "宮城": "東北",
    "秋田": "東北", "山形": "東北", "福島": "東北",
    "茨城": "関東", "栃木": "関東", "群馬": "関東",
    "埼玉": "関東", "千葉": "関東", "東京": "関東", "神奈川": "関東",
    "新潟": "中部", "富山": "中部", "石川": "中部", "福井": "中部",
    "山梨": "中部", "長野": "中部", "岐阜": "中部",
    "静岡": "中部", "愛知": "中部", "三重": "中部",
    "滋賀": "近畿", "京都": "近畿", "大阪": "近畿",
    "兵庫": "近畿", "奈良": "近畿", "和歌山": "近畿",
    "鳥取": "中国", "島根": "中国", "岡山": "中国",
    "広島": "中国", "山口": "中国",
    "徳島": "四国", "香川": "四国", "愛媛": "四国", "高知": "四国",
    "福岡": "九州", "佐賀": "九州", "長崎": "九州",
    "熊本": "九州", "大分": "九州", "宮崎": "九州",
    "鹿児島": "九州", "沖縄": "九州",
    "K航拿": "K航拿"  // 独自地方
};
```

## 7. 相手チーム能力値

### 7.1 ラウンド別能力値
```javascript
const OPPONENT_STATS = {
    ROUND_1: { min: 5, max: 10 },
    ROUND_2: { min: 7, max: 12 },
    ROUND_3: { min: 9, max: 14 },
    QUARTER_FINAL: { min: 11, max: 16 },
    SEMI_FINAL: { min: 13, max: 18 },
    FINAL: { min: 15, max: 20 }  // てぇでぇ's学園
};

// ラウンド番号から能力値範囲を取得
const ROUND_MAPPING = {
    1: "ROUND_1",
    2: "ROUND_2", 
    3: "ROUND_3",
    4: "QUARTER_FINAL",
    5: "SEMI_FINAL",
    6: "FINAL"
};
```

### 7.2 移動速度設定
```javascript
const MOVEMENT_SPEED = {
    // 現実の中学生男子の速度を基準（メートル/秒 → マス/秒）
    BASE_SPEED: 5,               // 基本速度（マス/秒）
    SPRINT_MULTIPLIER: 1.5,      // ダッシュ時の倍率
    WITH_BALL_PENALTY: 0.8,      // ボール保持時のペナルティ
    
    // 能力値による補正（能力値1につき）
    STAT_MODIFIER: 0.2,
    
    // 計算式
    calculate: function(baseStat, isAce = false, hasBall = false) {
        let speed = this.BASE_SPEED + (baseStat * this.STAT_MODIFIER);
        if (isAce) speed *= ACE_SYSTEM.STAT_MULTIPLIER;
        if (hasBall) speed *= this.WITH_BALL_PENALTY;
        return speed;
    }
};
```

## 8. UI設定

### 8.1 画面サイズ
```javascript
const SCREEN_CONFIG = {
    MOBILE: {
        maxWidth: 768,
        orientation: "portrait",
        touchEnabled: true
    },
    TABLET: {
        maxWidth: 1024,
        orientation: "any",
        touchEnabled: true
    },
    DESKTOP: {
        maxWidth: null,
        orientation: "any",
        touchEnabled: false
    }
};
```

### 8.2 色設定
```javascript
const COLOR_SCHEME = {
    // 背景色
    BACKGROUND: "#f0f0f0",
    COURT: {
        gradient: ["#4a7c4e", "#5a8c5e"],
        lines: "#ffffff"
    },
    
    // チーム色
    PLAYER_TEAM: "#0066cc",
    OPPONENT_TEAM: "#cc0000",
    ACE_GLOW: "rgba(255, 102, 0, 0.5)",
    
    // UI要素
    BUTTON: {
        primary: "#0066cc",
        secondary: "#666666",
        danger: "#cc0000",
        success: "#00cc66"
    },
    
    // テキスト
    TEXT: {
        primary: "#333333",
        secondary: "#666666",
        light: "#999999"
    }
};
```

### 8.3 アニメーション設定
```javascript
const ANIMATION_CONFIG = {
    // トランジション
    SCREEN_TRANSITION: 300,      // 画面遷移（ミリ秒）
    BUTTON_PRESS: 100,           // ボタン押下
    
    // 試合中のアニメーション
    PASS_SPEED: 500,             // パス（ミリ秒）
    PLAYER_MOVE_SMOOTH: 100,     // 選手移動の補間（ミリ秒）
    
    // エフェクト
    GOAL_CELEBRATION: 1000,      // ゴール演出
    MATCH_START: 500,            // 試合開始演出
    
    // 省電力モード
    REDUCED_MOTION: false        // アニメーション削減
};
```

## 9. テキスト・メッセージ

### 9.1 システムメッセージ
```javascript
const MESSAGES = {
    TITLE: {
        gameTitle: "ズッキュン中学物語",
        subtitle: "全国制覇への道"
    },
    
    MENU: {
        newGame: "ゲーム開始",
        continue: "続きから",
        tournament: "トーナメント表",
        training: "練習する",
        match: "試合"
    },
    
    RESULT: {
        win: "勝利！",
        lose: "敗北...",
        championship: "全国優勝！！",
        scoreFormat: "{player} - {opponent}"
    },
    
    TRAINING: {
        selectMenu: "練習メニューを選択",
        growth: "能力が上昇しました！",
        boycott: "選手たちが練習をボイコットしています...",
        restBonus: "休養ボーナス獲得！次の試合で全能力+2"
    }
};
```

### 9.2 チーム名生成
```javascript
const TEAM_NAME_FORMAT = {
    default: "{prefecture}代表",
    special: {
        "奈良": "ズッキュン中学",
        "K航拿": "てぇでぇ's学園"
    }
};
```

## 10. デバッグ設定

```javascript
const DEBUG_CONFIG = {
    ENABLED: false,               // デバッグモード有効化
    SHOW_FPS: false,             // FPS表示
    SHOW_HITBOX: false,          // 当たり判定表示
    FAST_FORWARD: false,         // 高速モード
    UNLIMITED_STATS: false,      // 能力値上限解除
    
    // デバッグコマンド
    COMMANDS: {
        skipWeek: true,
        setStats: true,
        instantWin: true,
        showState: true,
        unlockAll: true
    }
};
```

## 11. 背景画像設定

```javascript
const BACKGROUND_CONFIG = {
    // 画像パスは後から追加
    TITLE_SCREEN: null,          // "assets/bg_title.png"
    MAIN_SCREEN: null,           // "assets/bg_main.png"
    TRAINING_SCREEN: null,       // "assets/bg_training.png"
    MATCH_SCREEN: null,          // "assets/bg_match.png"
    RESULT_SCREEN: null,         // "assets/bg_result.png"
    
    // CSS変数として適用
    CSS_VARIABLE: "--bg-image",
    
    // フォールバック色
    FALLBACK: "#f0f0f0"
};
```

## 使用方法

このファイルを実装時に`config.js`として読み込み、各モジュールから参照します：

```javascript
// config.js として保存
export const CONFIG = {
    GAME: GAME_CONFIG,
    INITIAL: INITIAL_STATS,
    ACE: ACE_SYSTEM,
    CAPTAIN: {
        PERSONALITY: CAPTAIN_PERSONALITY,
        POLICY: CAPTAIN_POLICY
    },
    TRAINING: TRAINING_MENU,
    REGIONAL: REGIONAL_TACTICS,
    // ... その他の設定
};

// 他のモジュールから使用
import { CONFIG } from './config.js';

const pointsToWin = CONFIG.GAME.POINTS_TO_WIN;
const captainBonus = CONFIG.CAPTAIN.PERSONALITY[personality].growthMultiplier;
```

---

**注意**: この設定ファイルは、ゲームバランス調整時に値を変更するだけで動作を変更できるように設計されています。実装時はこのファイルから値を参照し、ハードコーディングは避けてください。