// config.js - Game Configuration
// Generated from settings_config.md

// 1. Story Settings
export const PLAYER_TEAM = {
    name: "ズッキュン中学",
    prefecture: "奈良",
    city: "奈良市",
    description: "全国大会初出場の公立中学校",
    uniformColor: "#0066cc"
};

export const FINAL_BOSS = {
    name: "てぇでぇ's学園",
    prefecture: "K航拿",
    description: "偏差値の超高い進学校",
    uniformColor: "#ff0000",
    guaranteedFinal: true,
    // 決勝戦での特殊判定（絶対に勝てない）
    finalMatchRates: {
        passInterceptRate: 0.67,      // パスカット率 67%
        dribbleInterceptRate: 0.67,   // ドリブルカット率 67%
        shootBlockByFP: 0.67,         // フィールドプレーヤーによるシュートブロック率 67%
        shootBlockByGK: 1.0           // GKによるシュートブロック率 100%
    }
};

// P68: 64チームに対応するため、主要都市の第2代表を追加
export const PREFECTURES = [
    // 47都道府県
    "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
    "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
    "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜",
    "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫",
    "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口",
    "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎",
    "熊本", "大分", "宮崎", "鹿児島", "沖縄",
    // 第2代表（主要都市）- 16チーム追加で合計64チーム
    "東京B", "大阪B", "神奈川B", "愛知B", "埼玉B", "千葉B", "兵庫B", "北海道B",
    "福岡B", "静岡B", "茨城B", "広島B", "京都B", "宮城B", "新潟B", "長野B",
    // ラスボス
    "K航拿"
];

// 2. Game Parameters
export const GAME_CONFIG = {
    POINTS_TO_WIN: 1,
    MAX_ATTEMPTS: 10,
    PLAYERS_PER_TEAM: 7,
    FPS: 30,
    // P68: 64チームに変更（2^6 = 64 で6ラウンドのバイナリブラケットが正しく機能）
    // 旧: 48チームは2の累乗ではなく、ラウンド計算が不正確だった
    TOTAL_TEAMS: 64,
    SEEDED_TEAMS: 0,  // 全チーム1回戦から参加（シード廃止）
    TOTAL_WEEKS: 6,
    COURT_WIDTH: 100,  // 20m in game units (1 unit = 0.2m)
    COURT_HEIGHT: 100, // 20m half-court (1 unit = 0.2m)
    GOAL_WIDTH: 15,    // 3m goal width (15% of 100)
    GOAL_AREA_RADIUS: 30, // 6m radius (30% of 100)
    FREE_THROW_RADIUS: 45, // 9m radius (45% of 100)
    SEVEN_METER_LINE: 35,  // 7m from goal (35% of 100)
    CENTER_LINE: 50,
    STORAGE_KEY: "handballGame",
    AUTO_SAVE: true
};

export const INITIAL_STATS = {
    MIN: 1,
    MAX: 10,
    ALLOW_FLOAT: true
};

export const ACE_SYSTEM = {
    INITIAL_COUNT: 0,
    // ラウンドごとの覚醒数 (1回戦:1, 2回戦:1, 3回戦:2, 準々決勝:2, 準決勝:0=ギアセカンド)
    INCREMENT_BY_ROUND: {
        1: 1,  // 1回戦勝利後
        2: 1,  // 2回戦勝利後
        3: 2,  // 3回戦勝利後
        4: 2,  // 準々決勝勝利後
        5: 0,  // 準決勝勝利後はエースではなくギアセカンド
        6: 0   // 決勝後（ゲーム終了）
    },
    GEAR_SECOND_ON_SEMIFINAL: 2,  // 準決勝勝利後にギアセカンド覚醒する人数
    STAT_MULTIPLIER: 1.5,
    SIZE_MULTIPLIER: 1.5,
    RANDOM_POSITION: true,
    GEAR_SECOND_MULTIPLIER: 2.0
};

// 3. Captain System
export const CAPTAIN_PERSONALITY = {
    "パワハラ": {
        growthMultiplier: 1.5,
        boycottWeek: 3,
        boycottEffect: 0,
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
    },
    "アンポンタン": {
        growthMultiplier: 1.0,
        boycottWeek: null,
        boycottEffect: null,
        specialTraining: true,  // 特殊な練習効果
        description: "キャプテンすぅぅぅぅてぇ - 月〜木は効果0.1、金曜は21倍！"
    }
};

export const CAPTAIN_POLICY = {
    "アグレッシブ": {
        statModifier: { pass: 1.0, dribble: 1.0, shoot: 1.5 },
        focusLowest: false,
        description: "攻撃重視でシュート力を強化"
    },
    "慎重": {
        statModifier: { pass: 1.5, dribble: 1.0, shoot: 1.0 },
        focusLowest: false,
        description: "パス回しを重視"
    },
    "目立ちたがり": {
        statModifier: { pass: 1.0, dribble: 1.5, shoot: 1.0 },
        focusLowest: false,
        description: "個人技を磨く"
    },
    "論理的": {
        statModifier: null,
        focusLowest: true,
        multiplier: 1.5,
        description: "弱点を重点的に強化"
    },
    "トンチンカン": {
        statModifier: { pass: 1.0, dribble: 1.0, shoot: 1.0 },
        focusLowest: false,
        description: "キャプテンすぅぅぅぅてぇの方針"
    }
};

// 4. Training System
export const TRAINING_MENU = {
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
        effect: null, // Dynamically calculated based on weekly training max
        available: ["月", "火", "水", "木", "金"],
        allowFloat: true,
        description: "全能力をバランスよく強化（その週の最高強化点と同じ合計値）"
    },
    "休養": {
        effect: null,
        bonus: { all: 2, duration: "next_match" },
        penalty: { all: 2.1, applyAfterMatch: true },
        available: ["金"],
        description: "次の試合で全能力+2 ただし、次の日には2.1下がる"
    }
};

export const WEEK_SCHEDULE = {
    1: { day: "月", type: "training" },
    2: { day: "火", type: "training" },
    3: { day: "水", type: "training" },
    4: { day: "木", type: "training" },
    5: { day: "金", type: "training" },
    6: { day: "土", type: "match" },
    7: { day: "日", type: "rest", autoAdvance: true }
};

// 5. Handball Positions (accurate positioning based on 20m x 20m half-court)
// Player team attacks toward y=0 (opponent goal at top)
// x: 0-100 (0=left sideline, 50=center, 100=right sideline)
// y: 0-100 (0=opponent goal line, 30=6m line, 45=9m line, 100=half line)
// Coordinates from COART.svg (20000 units / 200 = 0-100 scale)
// Goal line: x=8500-11500 (center at 10000, width 3000 = 3m)
export const POSITIONS = {
    LW: { name: "左ウイング", shortName: "LW", x: 3.75, y: 10 },       // Left wing (750, 2000)
    LB: { name: "左バック", shortName: "LB", x: 8.75, y: 50 },         // Left back (1750, 10000)
    CB: { name: "センターバック", shortName: "CB", x: 49.5, y: 70 },    // Center back (9900, 14000)
    RB: { name: "右バック", shortName: "RB", x: 91.25, y: 50 },        // Right back (18250, 10000)
    RW: { name: "右ウイング", shortName: "RW", x: 96.25, y: 10 },      // Right wing (19250, 2000)
    P: { name: "ピボット", shortName: "P", x: 62.5, y: 32.5 },         // Pivot (12500, 6500)
    GK: { name: "ゴールキーパー", shortName: "GK", x: 50, y: 105 }     // Off-screen (not displayed)
};

// Opponent positions - 6-0 defense formation
// Coordinates from COART.svg (20000 units / 200 = 0-100 scale)
export const OPPONENT_POSITIONS = {
    GK: { name: "ゴールキーパー", shortName: "GK", x: 50, y: 5 },      // Goalkeeper (at goal line)
    LW: { name: "左ウイング", shortName: "LW", x: 13, y: 15 },         // Left wing DF (2600, 3000)
    LB: { name: "左バック", shortName: "LB", x: 25, y: 31.25 },        // Left half DF (5000, 6250)
    CB: { name: "センターバック", shortName: "CB", x: 49, y: 50 },      // Center DF (9800, 10000)
    RB: { name: "右バック", shortName: "RB", x: 52.5, y: 32.5 },       // Pivot counter DF (10500, 6500)
    P: { name: "ピボット", shortName: "P", x: 70, y: 30 },             // Right half DF (14000, 6000)
    RW: { name: "右ウイング", shortName: "RW", x: 87, y: 15 }          // Right wing DF (17400, 3000)
};

// 6. Match System - New Tactic System
export const ACTION_CONFIG = {
    PASS: {
        type: "pass",
        checkLine: true,
        speedStat: "pass"
    },
    DRIBBLE: {
        type: "dribble",
        directions: [
            { id: "toward_enemy", label: "敵に向かって" },
            { id: "away_enemy", label: "敵から逃げる様に反対方向へ" },
            { id: "right", label: "ゴールに対して右へ真っ直ぐ" },
            { id: "left", label: "ゴールに対して左へ真っ直ぐ" }
        ],
        distances: [
            // P52: ドリブル速度を2倍に（時間を半分に）
            { id: "short", time: 0.5, distance: 10, label: "短距離" },
            { id: "medium", time: 1.5, distance: 30, label: "中距離" },
            { id: "long", time: 2.5, distance: 50, label: "長距離" }
        ],
        nextActions: [
            { id: "dribble_back", label: "反対方向に中距離ドリブル" },
            { id: "pass", label: "誰にパス" },
            { id: "shoot_corner", label: "コーナーめがけて丁寧にシュート" },
            { id: "shoot_center", label: "とにかくど真ん中に最強シュート" }
        ],
        speedStat: "dribble"
    },
    SHOOT: {
        type: "shoot",
        checkLine: true,
        speedStat: "shoot",
        types: [
            { id: "corner", label: "コーナーめがけて丁寧にシュート", power: 1.0 },
            { id: "center", label: "とにかくど真ん中に最強シュート", power: 2.5 }
        ]
    }
};

export const SUCCESS_FORMULA = {
    calculate: function(attackStat, defenseStat, restBonus = false) {
        if (restBonus) attackStat += 2;
        const rate = (attackStat / (attackStat + defenseStat)) * 100;
        return Math.max(5, Math.min(95, rate));
    },
    MIN_RATE: 5,
    MAX_RATE: 95
};

// 7. Regional Tactics
export const REGIONAL_TACTICS = {
    "北海道": {
        name: "全員プレス",
        behavior: "all_to_ball",
        aggressiveness: 10,
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

export const PREFECTURE_TO_REGION = {
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
    // P68: 第2代表チームの地域マッピング
    "東京B": "関東", "大阪B": "近畿", "神奈川B": "関東", "愛知B": "中部",
    "埼玉B": "関東", "千葉B": "関東", "兵庫B": "近畿", "北海道B": "北海道",
    "福岡B": "九州", "静岡B": "中部", "茨城B": "関東", "広島B": "中国",
    "京都B": "近畿", "宮城B": "東北", "新潟B": "中部", "長野B": "中部",
    "K航拿": "K航拿"
};

// 7. Opponent Stats
export const OPPONENT_STATS = {
    ROUND_1: { min: 5, max: 10 },
    ROUND_2: { min: 7, max: 12 },
    ROUND_3: { min: 9, max: 14 },
    QUARTER_FINAL: { min: 11, max: 16 },
    SEMI_FINAL: { min: 13, max: 18 },
    FINAL: { min: 15, max: 20 }
};

export const ROUND_MAPPING = {
    1: "ROUND_1",
    2: "ROUND_2",
    3: "ROUND_3",
    4: "QUARTER_FINAL",
    5: "SEMI_FINAL",
    6: "FINAL"
};

export const MOVEMENT_SPEED = {
    BASE_SPEED: 5,
    SPRINT_MULTIPLIER: 1.5,
    WITH_BALL_PENALTY: 0.8,
    STAT_MODIFIER: 0.2,
    calculate: function(baseStat, isAce = false, hasBall = false) {
        let speed = this.BASE_SPEED + (baseStat * this.STAT_MODIFIER);
        if (isAce) speed *= ACE_SYSTEM.STAT_MULTIPLIER;
        if (hasBall) speed *= this.WITH_BALL_PENALTY;
        return speed;
    }
};

// 8. UI Settings
export const SCREEN_CONFIG = {
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

export const COLOR_SCHEME = {
    BACKGROUND: "#f0f0f0",
    COURT: {
        gradient: ["#4a7c4e", "#5a8c5e"],
        lines: "#ffffff"
    },
    PLAYER_TEAM: "#0066cc",
    OPPONENT_TEAM: "#cc0000",
    ACE_GLOW: "rgba(255, 102, 0, 0.5)",
    BUTTON: {
        primary: "#0066cc",
        secondary: "#666666",
        danger: "#cc0000",
        success: "#00cc66"
    },
    TEXT: {
        primary: "#333333",
        secondary: "#666666",
        light: "#999999"
    }
};

export const ANIMATION_CONFIG = {
    SCREEN_TRANSITION: 300,
    BUTTON_PRESS: 100,
    PASS_SPEED: 500,
    PLAYER_MOVE_SMOOTH: 100,
    GOAL_CELEBRATION: 1000,
    MATCH_START: 500,
    REDUCED_MOTION: false
};

// 9. Messages
export const MESSAGES = {
    TITLE: {
        gameTitle: "ズッキュン中学物語",
        subtitle: "死に戻りチートで絶対優勝！？",
        subtitleHighlight: "死に戻り"
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

export const TEAM_NAME_FORMAT = {
    default: "{prefecture}代表",
    special: {
        "奈良": "ズッキュン中学",
        "K航拿": "てぇでぇ's学園"
    }
};

// 10. Position Ability System (PowerPro Style)
export const POSITION_ABILITIES = {
    // 4つのカテゴリ（ウイング、バック、CB、PV）
    categories: {
        wing: {
            name: "ウイング",
            positions: ["LW", "RW"],
            role: "サイドで幅を作る・速攻のフィニッシャー",
            weaknesses: [
                { id: "unstable_posture", name: "体勢不安定", type: "movement" },
                { id: "weak_1on1_defense", name: "守備1on1不足", type: "general" },
                { id: "inconsistent_scoring", name: "決定率の波", type: "shooting" }
            ],
            strengths: [
                { id: "fast_break", name: "速攻○" },
                { id: "narrow_angle_scoring", name: "狭角からの得点力" }
            ],
            misconceptions: [
                { wrong: "点を取れれば仕事は終わり", correct: "点＋幅＋速攻参加が役割" },
                { wrong: "ボールを待つポジション", correct: "スペースを作るのが仕事" },
                { wrong: "角度がなければ無理", correct: "体勢とコースは自分で作る" },
                { wrong: "守備はバックの仕事", correct: "最初のプレッシャーは自分" }
            ]
        },
        back: {
            name: "バック",
            positions: ["LB", "RB"],
            role: "得点圧で守備を下げる",
            weaknesses: [
                { id: "accuracy_variance", name: "精度ムラ", type: "shooting" },
                { id: "slow_release", name: "リリース遅れ", type: "shooting" },
                { id: "slow_return", name: "戻り遅い", type: "general" }
            ],
            strengths: [
                { id: "lower_defense_from_middle", name: "ミドルから守備を下げられる" }
            ],
            misconceptions: [
                { wrong: "強く投げれば入る", correct: "「速さ」より「早さと精度」" },
                { wrong: "打てるなら全部打つ", correct: "打つことで味方を楽にする" },
                { wrong: "当たられるのは仕方ない", correct: "当たられない位置取りがある" },
                { wrong: "攻撃だけが評価", correct: "戻りと守備で信頼を得る" }
            ]
        },
        cb: {
            name: "センターバック",
            positions: ["CB"],
            role: "攻撃の設計・判断の中心",
            weaknesses: [
                { id: "slow_decision", name: "判断遅れ", type: "judgment" },
                { id: "passive", name: "消極性", type: "judgment" },
                { id: "poor_center_control", name: "中央管理不足", type: "judgment" }
            ],
            strengths: [
                { id: "support_teammates_control_flow", name: "味方を活かし流れを支配" }
            ],
            misconceptions: [
                { wrong: "自分が一番判断できる", correct: "最善は「チームの選択」" },
                { wrong: "指示＝声を出すこと", correct: "動きで伝えるのも指示" },
                { wrong: "自分が点を取らないと", correct: "点を取らせる方が価値が高い" },
                { wrong: "ミスは仕方ない", correct: "ミスの種類を選ぶ" }
            ]
        },
        pv: {
            name: "ピヴォット",
            positions: ["PV", "P"],
            role: "中央で守備を崩す起点",
            weaknesses: [
                { id: "limited_range", name: "可動域狭い", type: "movement" },
                { id: "one_side_dependent", name: "片側依存", type: "movement" }
            ],
            strengths: [
                { id: "attract_defense", name: "守備を引き付ける存在" }
            ],
            misconceptions: [
                { wrong: "点を取れば評価される", correct: "引き付けるだけで仕事成立" },
                { wrong: "動かない方が楽", correct: "動くほど味方が楽になる" },
                { wrong: "パスは来るもの", correct: "来る位置に入り直す" },
                { wrong: "押されるのは仕方ない", correct: "体の向きで勝負は変わる" }
            ]
        }
    },
    // 練習と弱点タイプの対応（Q9回答）
    trainingMapping: {
        "パス練習": ["judgment"],      // 判断系（判断遅れ、消極性、中央管理不足）
        "ドリブル練習": ["movement"],  // 動作系（体勢不安定、可動域狭い、片側依存）
        "シュート練習": ["shooting"],  // シュート系（決定率の波、精度ムラ、リリース遅れ）
        "総合練習": ["judgment", "movement", "shooting", "general"]  // 全カテゴリ
    },
    // 弱点克服・強み獲得のペース
    // P69: 決勝前に全て克服できるよう調整（25練習で16変化 = 1.56練習/変化）
    progressConfig: {
        practicePerChange: 1.5,  // 1.5練習で1つ変化（3練習で2変化）
        totalWeaknesses: 11,     // 弱点の合計数
        totalStrengths: 5        // 強みの合計数
    },
    // P69: エース覚醒システム
    aceAwakeningConfig: {
        // 準決勝前（ラウンド1-4）に覚醒可能なポジション（GK除く）
        positions: ["LW", "LB", "CB", "RB", "RW", "P"],
        // 練習ごとの覚醒確率（準決勝前に全員覚醒するよう調整）
        // 20練習で6人覚醒 = 30%確率
        awakeningChance: 0.30,
        // 準決勝勝利後にギアセカンドになる人数
        gearSecondCount: 2
    }
};

// 11. Debug Settings
export const DEBUG_CONFIG = {
    ENABLED: true,  // デバッグモード有効化
    SHOW_FPS: false,
    SHOW_HITBOX: false,
    FAST_FORWARD: false,
    UNLIMITED_STATS: false,
    COMMANDS: {
        skipWeek: true,
        setStats: true,
        instantWin: true,
        showState: true,
        unlockAll: true
    }
};

export const BACKGROUND_CONFIG = {
    TITLE_SCREEN: null,
    MAIN_SCREEN: null,
    TRAINING_SCREEN: null,
    MATCH_SCREEN: null,
    RESULT_SCREEN: null,
    CSS_VARIABLE: "--bg-image",
    FALLBACK: "#f0f0f0"
};

// P70: Feedback System Configuration
export const FEEDBACK_CONFIG = {
    // Google FormsのURL（実際のフォームURLに置き換えてください）
    GOOGLE_FORM_URL: null,
    // GitHub GistのURL（公開投稿を読み込むためのURL）
    GIST_URL: null,
    // Google Formsのエントリーフィールド名
    FORM_FIELDS: {
        CATEGORY: 'entry.category',
        NICKNAME: 'entry.nickname',
        CONTENT: 'entry.content',
        TIMESTAMP: 'entry.timestamp',
        ACTION_HISTORY: 'entry.actionHistory'
    }
};

// Unified CONFIG export
export const CONFIG = {
    PLAYER_TEAM,
    FINAL_BOSS,
    PREFECTURES,
    GAME: GAME_CONFIG,
    INITIAL: INITIAL_STATS,
    ACE: ACE_SYSTEM,
    CAPTAIN: {
        PERSONALITY: CAPTAIN_PERSONALITY,
        POLICY: CAPTAIN_POLICY
    },
    TRAINING: TRAINING_MENU,
    WEEK_SCHEDULE,
    ACTION: ACTION_CONFIG,
    SUCCESS: SUCCESS_FORMULA,
    POSITIONS: POSITIONS,
    OPPONENT_POSITIONS: OPPONENT_POSITIONS,
    REGIONAL: REGIONAL_TACTICS,
    PREFECTURE_TO_REGION,
    OPPONENT: OPPONENT_STATS,
    ROUND_MAPPING,
    MOVEMENT: MOVEMENT_SPEED,
    SCREEN: SCREEN_CONFIG,
    COLOR: COLOR_SCHEME,
    ANIMATION: ANIMATION_CONFIG,
    MESSAGES,
    TEAM_NAME_FORMAT,
    DEBUG: DEBUG_CONFIG,
    BACKGROUND: BACKGROUND_CONFIG,
    ABILITIES: POSITION_ABILITIES,
    FEEDBACK: FEEDBACK_CONFIG
};
