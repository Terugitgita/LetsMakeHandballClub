# ハンドボールゲーム技術仕様書
## Webブラウザ実装用

---

## 1. コート仕様

### 1.1 基本寸法
- **コート全体**: 40m × 20m（長方形、面積800㎡）
  - 一般・高校生: 40m × 20m
  - 小学生用: 36m × 20m（標準）
  - 特別な場合: 38〜44m × 18〜22m（変更可能範囲）
- **長辺**: サイドライン - 40m
- **短辺**: アウターゴールライン - 20m
- **参考**: フットサルコートと同じサイズ（ゴールも同サイズ）

### 1.2 安全地帯
- **サイドライン外側**: 1m以上の障害物のない区域
- **ゴールライン後方**: 2m以上の障害物のない区域
- オフィシャルテーブルや選手ベンチはこのエリア外に設置

### 1.3 主要ライン

#### ラインの幅規定
- **ゴールライン**: 8cm
- **その他すべてのライン**: 5cm
- **色**: 白線
- **測定方法**: 外寸測定（ラインの幅を含めて測定）
  - 例: サイドライン40mは、ライン外側の端から端まで40m

#### センターライン
- 位置: コート中央を横切る線（サイドラインの中点を結ぶ）
- 長さ: 20m（サイドライン間）
- 幅: 5cm
- 機能: コートを2つのハーフに分割、スローオフの開始位置

#### ゴールライン
- 位置: 各アウターゴールライン中央（ゴールポスト間）
- 長さ: 3m（ゴール幅と同じ）
- 幅: 8cm
- **得点判定**: ボールがこのラインを完全に越えた時点で得点

#### ゴールエリアライン（6mライン）
- 位置: ゴールラインから6m
- 形状: 半円状（中央3mは直線）
- 幅: 5cm（実線）
- **半円の描き方**: ゴールポストの内側で最もコート側の角を中心に、半径6mの円弧を描く
- **測定方法**: ゴールから6mはライン外側までの距離
- 用途: ゴールキーパー専用エリア（ゴールエリア）の境界
- **重要ルール**: 
  - GKのみがゴールエリア内に立ち入り可能
  - コートプレーヤーは地上では入れない（ジャンプシュート中の空中は例外）
  - ゴールエリア内ではGKは身体のどこを使ってもボール接触可能

#### フリースローライン（9mライン）
- 位置: ゴールラインから9m
- 形状: 半円状（中央3mは直線）
- 幅: 5cm（**破線**）
- **破線の仕様**: 白線15cm、空白15cmの交互パターン
- **半円の描き方**: ゴールポストの内側で最もコート側の角を中心に、半径9mの円弧を描く
- **重要**: フリースローラインはサイドラインまで伸びる（アウターゴールラインには届かない）
- 用途: フリースロー時の基準線、実際のフリースローはこのライン付近から実行

#### 7mライン
- 位置: ゴールラインから7m
- 長さ: 1m
- 幅: 5cm
- 配置: ゴール正面中央
- 用途: ペナルティスロー（7mスロー）の実行位置

#### ゴールキーパーライン
- 位置: ゴールラインから4m（センターライン方向へ）
- 長さ: 15cm
- 幅: 5cm
- 配置: ゴール正面中央
- 用途: ゴールキーパーの制限ライン

#### 交代ライン
- 位置: センターラインから両側へ4.5m
- 長さ: 30cm
- 幅: 5cm
- 特徴: サイドラインに対して15cmずつ内側と外側に出る形で描画
- 用途: 選手交代時の出入り口（この区間でのみ交代可能）
- **重要**: 交代ラインはオフィシャル席から必ず確認できる位置に設置

### 1.4 ゴール仕様
- **サイズ**: 高さ2m × 幅3m（内寸）
- **位置**: 各アウターゴールラインの中央
- **ゴールポスト**: 8cm角の正方形
- **クロスバー**: 8cm角の正方形
- **色分け**: ゴールポストとクロスバーのコート側3面は対照的な2色で帯状に塗装（通常は赤と白）
- **背景配慮**: シューター側から見てゴールと背景が識別できる色に設定
- **ゴールネット**: ボールがゴール内に留まるようにネットを張る必須
- **固定**: 床または壁面にしっかり固定

### 1.5 座標系（実装用）
Webブラウザのキャンバスに描画する場合の推奨座標系：

```
原点(0,0)を左上とする場合：
- X軸: 0 〜 880px（コート40m + 安全地帯含む）
- Y軸: 0 〜 440px（コート20m + 安全地帯含む）
- スケール: 1m = 20px

コート本体（安全地帯を除く）：
- X軸: 40px 〜 840px（40m = 800px）
- Y軸: 20px 〜 420px（20m = 400px）

主要座標（コート内）：
- センターライン: x = 440px（中央）
- 左ゴール中心: x = 40px
- 右ゴール中心: x = 840px
- 左6mライン中心: x = 160px（40 + 6*20）
- 右6mライン中心: x = 720px（840 - 6*20）
- 左9mライン中心: x = 220px（40 + 9*20）
- 右9mライン中心: x = 660px（840 - 9*20）

ゴール座標：
- ゴール幅: 60px（3m）
- ゴール高さ: 40px（2m）
- 左ゴール: { x: 40, y: 190, width: 60, height: 40 }（y中心220px）
- 右ゴール: { x: 840, y: 190, width: 60, height: 40 }
```

#### 重要な実装ノート
- **外寸測定**: 実際のコートではライン幅を含めて測定するため、描画時はラインの太さを考慮
- **半円描画**: arc()関数使用時、ゴールポストの内側角を中心に描画
- **破線**: 9mラインは破線（setLineDash([15, 15])など）で描画

---

## 2. ゲームルール

### 2.1 チーム構成
- **1チーム**: 7人（コート上）
  - ゴールキーパー（GK）: 1人
  - コートプレーヤー（CP）: 6人
- **登録可能人数**: 最大16人（日本リーグ規定）
- **交代**: 無制限、申告不要、交代ラインからのみ

### 2.2 試合時間
- **一般・高校生**: 前半30分 + 後半30分
- **中学生**: 前半25分 + 後半25分
- **小学生**: 前半15分 + 後半15分
- **ハーフタイム**: 10分（最大15分）
- **タイムアウト**: 各チーム前後半各2回、1試合最大3回（各1分）

### 2.3 得点方法
- ボールがゴールラインを完全に越えたら得点
- 6mライン外からのシュートのみ有効
- ジャンプシュートの場合、踏み切りが6mライン外であればOK

### 2.4 ボール保持ルール
- **3歩ルール**: ボール保持後3歩まで移動可能
- **3秒ルール**: ボール保持は3秒まで（静止時）
- **ドリブル**: 回数制限なし、ただし一度止めた後は再ドリブル不可

### 2.5 ゴールキーパーの特権
- ゴールエリア内で無制限にボール保持可能
- ゴールエリア内でボールを触れる唯一の選手
- ゴールエリアから出たボールを最後に触った場合は相手ボール

### 2.6 ファウルとスロー
- **フリースロー**: 軽度の反則後、9mライン付近から実行
- **7mスロー**: 明らかな得点機会の妨害時、7mラインから実行
- **スローイン**: サイドラインから出た場合
- **ゴールキーパースロー**: アウターゴールラインから出た場合（GKが最後に触った時）
- **コーナースロー**: 守備側CPが最後に触ってアウターゴールラインから出た場合

### 2.7 スローオフ
- 試合開始時、得点後、後半開始時に実行
- センターライン中央から開始
- 相手チームは3m以上離れる必要あり

---

## 3. 初期ポジション配置

### 3.1 ポジション一覧
```
攻撃側の視点（相手ゴールを見る方向）：

        [相手ゴール]
    LW────P────RW
       ／    ＼
      ／      ＼
    LB────CB────RB
         │
        GK
      [自陣ゴール]
```

### 3.2 各ポジションの初期配置座標（実装用）

#### 推奨配置（20px = 1mスケール）
左側チーム（X座標 < 400）の初期配置：
```javascript
const leftTeamPositions = {
  GK: { x: 50, y: 200 },   // ゴール前
  CB: { x: 180, y: 200 },  // センター後方
  LB: { x: 180, y: 120 },  // レフトバック
  RB: { x: 180, y: 280 },  // ライトバック
  P:  { x: 360, y: 200 },  // ポスト（相手ゴール前）
  LW: { x: 340, y: 100 },  // 左サイド
  RW: { x: 340, y: 300 }   // 右サイド
};
```

右側チーム（X座標 > 400）の初期配置：
```javascript
const rightTeamPositions = {
  GK: { x: 750, y: 200 },  // ゴール前
  CB: { x: 620, y: 200 },  // センター後方
  LB: { x: 620, y: 280 },  // レフトバック（右側から見て）
  RB: { x: 620, y: 120 },  // ライトバック（右側から見て）
  P:  { x: 440, y: 200 },  // ポスト（相手ゴール前）
  LW: { x: 460, y: 300 },  // 左サイド（右側から見て）
  RW: { x: 460, y: 100 }   // 右サイド（右側から見て）
};
```

### 3.3 各ポジションの役割

#### ゴールキーパー（GK）
- **役割**: ゴールを守る、攻撃の起点
- **位置**: 自陣ゴール前
- **特性**: 反射神経、瞬発力、判断力、リーダーシップ

#### センターバック（CB）
- **役割**: 攻撃の司令塔、ゲームコントロール
- **位置**: GKのすぐ前、コート中央後方
- **特性**: 冷静な判断力、パス精度、守備への切り替え能力
- **利き手**: どちらでも可

#### レフトバック（LB）
- **役割**: チームのエース、得点を狙う花形ポジション
- **位置**: CBの左側
- **特性**: シュート力、ジャンプ力、多彩なフェイント技術
- **利き手**: **右利きが有利**（左側から右方向へシュートするため）

#### ライトバック（RB）
- **役割**: 得点を狙う、相手エースのマーク
- **位置**: CBの右側
- **特性**: シュート力、高いディフェンス能力
- **利き手**: **左利きが有利**（右側から左方向へシュートするため）

#### ポスト（P）
- **役割**: 相手ディフェンス内での妨害、アシスト
- **位置**: 相手ゴール正面（6mライン外側）
- **特性**: フィジカル、戦術理解度、スペース創出能力
- **特徴**: ゴールに背を向けてプレー、「影の立役者」

#### 左サイド（LW）
- **役割**: 速攻時の得点、チャンスメイク
- **位置**: ポストの左前
- **特性**: スピード、持久力、浅い角度からのシュート力
- **利き手**: どちらでも可（右利きがやや有利）

#### 右サイド（RW）
- **役割**: 速攻時の得点、チャンスメイク
- **位置**: ポストの右前
- **特性**: スピード、持久力、ジャンプ力
- **利き手**: **左利きが有利**（右側から内側へ飛び込みやすい）

---

## 4. 実装時の注意点

### 4.1 ライン描画の重要ポイント

#### 外寸測定ルール
- すべてのライン寸法は**外寸**で測定
- 例: サイドライン40mは、ライン外側の端から端まで
- ゴールから6m、9mも、ラインの外側までの距離

#### 半円の正確な描画方法
```javascript
// 6mライン（ゴールエリアライン）の半円
const goalPostInnerX = 40; // ゴールポスト内側のX座標
const goalPostInnerY = 220; // ゴールポスト内側のY座標（コート側の角）
const radius6m = 120; // 6m = 120px

// 左側の6mライン半円
ctx.arc(goalPostInnerX, goalPostInnerY, radius6m, 
        -Math.PI/2, Math.PI/2);

// 9mラインは破線で描画
ctx.setLineDash([15, 15]); // 15px実線、15px空白
const radius9m = 180; // 9m = 180px
ctx.arc(goalPostInnerX, goalPostInnerY, radius9m, 
        -Math.PI/2, Math.PI/2);
ctx.setLineDash([]); // 破線解除
```

#### フリースローライン（9mライン）の特徴
- 必ず破線で描画（実線15cm、空白15cm）
- サイドラインまで伸びる
- アウターゴールラインには接続しない
- コート隅では半円がサイドラインと交わる

### 4.2 当たり判定
- **ボールと6mライン**: プレーヤーがジャンプ中の空中にいる場合のみ6mライン内でシュート可
- **プレーヤーの移動範囲**: GK以外は6mライン内に立ち入り不可（地上）
- **コート境界**: ボールがラインを完全に越えた場合アウト
- **得点判定**: ボールがゴールラインを完全に越えた時点で得点（ライン上は未得点）

### 4.3 ゴールの描画と配置
```javascript
// ゴール仕様
const goal = {
  width: 60,  // 3m = 60px
  height: 40, // 2m = 40px
  postWidth: 1.6, // 8cm = 1.6px（スケール調整可）
  colors: ['#FF0000', '#FFFFFF'] // 赤と白の帯
};

// 背景とゴールの色を対照的に設定
// シューターから見て識別しやすいように
```

### 4.4 交代ラインの実装
```javascript
// 交代ライン（センターラインから4.5m、長さ30cm）
const substitutionLine = {
  distanceFromCenter: 90, // 4.5m = 90px
  length: 6, // 30cm = 6px
  extendInside: 3, // サイドライン内側15cm = 3px
  extendOutside: 3 // サイドライン外側15cm = 3px
};

// 左側交代ライン
ctx.moveTo(440 - 90, 20 - 3); // センターから左へ4.5m、サイドライン外3px
ctx.lineTo(440 - 90, 20 + 3); // サイドライン内3px

// 右側交代ライン
ctx.moveTo(440 + 90, 20 - 3);
ctx.lineTo(440 + 90, 20 + 3);
```

### 4.5 ゲームフロー
1. **スローオフ**: センターライン中央から開始
2. **攻撃**: ボールを運び、6mライン外からシュートを狙う
3. **得点判定**: ゴールライン完全通過で得点
4. **再開**: 得点後は相手チームのスローオフ
5. **ファウル処理**: 
   - 軽度 → フリースロー（9mライン付近）
   - 重度 → 7mスロー

### 4.6 AIの動き（参考）
- **CB**: ボール保持、パス回し、ゲームメイク、守備への切り替え
- **LB/RB**: ミドルシュート、ロングシュート、6mライン外からの攻撃
- **P**: ゴールエリア外でスペース創出、後方へのアシストパス
- **LW/RW**: 速攻時の走り込み、サイドからの浅い角度シュート
- **GK**: ゴールエリア内守備、素早い球出し、味方への指示

#### GKの実装（ゲーム用）
**ズッキュン中学物語での敵GK実装**:
- **移動方向**: x方向（横方向）のみ、y方向は固定（ゴールライン上に留まる）
- **追跡対象**: ボール保持者のx座標
- **移動範囲**: ゴール枠内（42.5%-57.5%）に制限、マージン1%（43.5%-56.5%）
- **目的**: シュートに対して横移動でブロック、コーナーシュートの難易度向上
- **実装場所**: match.js:859-878（updateOpponentAI関数内）

```javascript
// GK movement - moves only in x direction to follow ball
const gk = this.opponents['GK'];
if (gk) {
    const basePos = CONFIG.OPPONENT_POSITIONS['GK'];
    let targetX = ballHolderPlayer.x;
    targetX = Math.max(goalLeft + 1, Math.min(goalRight - 1, targetX));
    gk.setTarget(targetX, basePos.y); // y is fixed at goal line
}
```

### 4.7 カメラアングル推奨
- **トップビュー**: コート全体を真上から見る（戦略性重視、ライン確認しやすい）
- **サイドビュー**: 横から見る（シュートの迫力、高さが分かる）
- **斜め上方**: 両方の利点を取る（最も推奨）
- **ダイナミックカメラ**: ボールを追従する（臨場感）

### 4.8 物理演算のヒント
- **コート摩擦**: 屋内木製床を想定（低摩擦）
- **ボール反発**: バスケットボールより大きいが軽い
- **ジャンプ高さ**: 平均1m程度のジャンプシュートを想定
- **移動速度**: 最高速度は約7-8m/s（世界トップレベル）

---

## 5. データ構造例（JSON）

```json
{
  "court": {
    "dimensions": {
      "width": 20,
      "length": 40,
      "unit": "meters",
      "area": 800,
      "areaUnit": "squareMeters"
    },
    "variations": {
      "elementary": { "length": 36, "width": 20 },
      "specialCases": {
        "lengthRange": [38, 44],
        "widthRange": [18, 22]
      }
    },
    "safetyZones": {
      "sideline": { "distance": 1, "unit": "meters" },
      "goalline": { "distance": 2, "unit": "meters" }
    },
    "lines": {
      "goalLine": { 
        "length": 3, 
        "width": 0.08,
        "color": "white",
        "measurementMethod": "outer dimension"
      },
      "otherLines": {
        "width": 0.05,
        "color": "white",
        "measurementMethod": "outer dimension"
      },
      "centerLine": {
        "length": 20,
        "position": "middle of court",
        "purpose": "throw-off position"
      },
      "goalArea": { 
        "distance": 6, 
        "shape": "semi-circle with 3m straight center",
        "lineType": "solid",
        "centerPoint": "inner corner of goal post",
        "purpose": "goalkeeper exclusive area"
      },
      "freeThrowLine": { 
        "distance": 9, 
        "shape": "semi-circle with 3m straight center",
        "lineType": "dashed",
        "dashPattern": { "line": 0.15, "gap": 0.15, "unit": "meters" },
        "centerPoint": "inner corner of goal post",
        "extendsTo": "sideline (not outer goal line)"
      },
      "sevenMeterLine": { 
        "distance": 7, 
        "length": 1,
        "purpose": "penalty throw position"
      },
      "goalkeeperLine": {
        "distance": 4,
        "length": 0.15,
        "purpose": "goalkeeper restriction line"
      },
      "substitutionLine": { 
        "distance": 4.5,
        "distanceFrom": "center line",
        "length": 0.3,
        "extension": {
          "inside": 0.15,
          "outside": 0.15,
          "unit": "meters"
        },
        "purpose": "player substitution area"
      }
    },
    "goal": {
      "width": 3,
      "height": 2,
      "unit": "meters",
      "postDimensions": {
        "width": 0.08,
        "height": 0.08,
        "shape": "square"
      },
      "colors": ["red", "white"],
      "colorPattern": "striped on three court-facing sides",
      "netRequired": true,
      "fixation": "firmly attached to floor or wall",
      "visibility": "must contrast with background"
    }
  },
  "team": {
    "playersOnCourt": 7,
    "maxRegistered": 16,
    "composition": {
      "goalkeeper": 1,
      "courtPlayers": 6
    },
    "positions": [
      {
        "code": "GK",
        "name": "ゴールキーパー",
        "nameLatin": "Goalkeeper",
        "initialPosition": { "x": 0.05, "y": 0.5 },
        "role": "ゴール守備、攻撃の起点、チーム指示",
        "specialRules": [
          "ゴールエリア内で無制限にボール保持可能",
          "ゴールエリア内で身体のどこでもボール接触可",
          "ゴールエリア外に出ると通常プレーヤー扱い"
        ],
        "attributes": ["反射神経", "瞬発力", "判断力", "リーダーシップ"]
      },
      {
        "code": "CB",
        "name": "センターバック",
        "nameLatin": "Center Back",
        "initialPosition": { "x": 0.3, "y": 0.5 },
        "role": "攻撃の司令塔、ゲームコントロール、守備切り替え",
        "attributes": ["冷静な判断力", "パス精度", "戦術理解"],
        "preferredHand": "both"
      },
      {
        "code": "LB",
        "name": "レフトバック",
        "nameLatin": "Left Back",
        "initialPosition": { "x": 0.3, "y": 0.3 },
        "role": "チームエース、得点を狙う花形ポジション",
        "attributes": ["シュート力", "ジャンプ力", "多彩なフェイント"],
        "preferredHand": "right",
        "reason": "左側から右方向へシュートするため"
      },
      {
        "code": "RB",
        "name": "ライトバック",
        "nameLatin": "Right Back",
        "initialPosition": { "x": 0.3, "y": 0.7 },
        "role": "得点を狙う、相手エースのマーク",
        "attributes": ["シュート力", "高いディフェンス能力"],
        "preferredHand": "left",
        "reason": "右側から左方向へシュートするため、相手LBマーク"
      },
      {
        "code": "P",
        "name": "ポスト",
        "nameLatin": "Post",
        "initialPosition": { "x": 0.85, "y": 0.5 },
        "role": "相手ディフェンス妨害、アシスト、影の立役者",
        "specialBehavior": "ゴールに背を向けてプレー、自分ではシュートせず味方にパス",
        "attributes": ["フィジカル", "戦術理解度", "スペース創出"],
        "preferredHand": "both"
      },
      {
        "code": "LW",
        "name": "左サイド",
        "nameLatin": "Left Wing",
        "initialPosition": { "x": 0.75, "y": 0.2 },
        "role": "速攻時の得点、チャンスメイク",
        "attributes": ["スピード", "持久力", "浅い角度からのシュート力"],
        "preferredHand": "right",
        "reason": "右利きがやや有利"
      },
      {
        "code": "RW",
        "name": "右サイド",
        "nameLatin": "Right Wing",
        "initialPosition": { "x": 0.75, "y": 0.8 },
        "role": "速攻時の得点、チャンスメイク",
        "attributes": ["スピード", "持久力", "ジャンプ力"],
        "preferredHand": "left",
        "reason": "右側から内側へ飛び込みやすい"
      }
    ]
  },
  "rules": {
    "matchDuration": {
      "adult": { 
        "halfTime": 30, 
        "halftimeBreak": 10,
        "unit": "minutes" 
      },
      "juniorHigh": { 
        "halfTime": 25, 
        "halftimeBreak": 10,
        "unit": "minutes" 
      },
      "elementary": { 
        "halfTime": 15, 
        "halftimeBreak": 10,
        "unit": "minutes" 
      }
    },
    "timeouts": {
      "perHalf": 2,
      "maxPerMatch": 3,
      "duration": 1,
      "unit": "minutes"
    },
    "ballPossession": {
      "maxSteps": 3,
      "maxHoldTime": 3,
      "unit": "seconds",
      "dribbleRules": "unlimited dribbles, but no re-dribble after holding"
    },
    "scoring": {
      "goalScored": 1,
      "shootingZone": "outside 6m line (or in air after jumping from outside)",
      "scoringCondition": "ball completely crosses goal line"
    },
    "substitution": {
      "unlimited": true,
      "requiresNotification": false,
      "substitutionArea": "between center line and substitution line",
      "penalty": "2-minute suspension for illegal substitution"
    },
    "fouls": {
      "freeThrow": {
        "description": "minor fouls",
        "executionArea": "near 9m line"
      },
      "sevenMeterThrow": {
        "description": "clear goal-scoring opportunity obstruction",
        "executionPosition": "7m line"
      },
      "throwIn": {
        "description": "ball out from sideline",
        "executionPosition": "sideline where ball went out"
      },
      "goalkeeperThrow": {
        "description": "ball out from outer goal line (touched by GK or attacking player)",
        "executionPosition": "goal area"
      },
      "cornerThrow": {
        "description": "ball out from outer goal line (touched by defending court player)",
        "executionPosition": "corner"
      }
    },
    "throwOff": {
      "occasions": ["match start", "after goal", "second half start"],
      "position": "center line center",
      "opponentDistance": 3,
      "unit": "meters"
    }
  },
  "implementation": {
    "priority": {
      "highest": ["court drawing", "7 position placement", "goal visualization"],
      "high": ["ball movement", "simple scoring system", "6m line restriction"],
      "medium": ["3-step rule", "3-second rule", "basic foul detection"],
      "low": ["detailed foul system", "substitution system", "advanced AI"]
    },
    "rendering": {
      "recommendedScale": "1m = 20px",
      "canvasSize": { "width": 880, "height": 440, "unit": "pixels" },
      "courtArea": { 
        "x": [40, 840], 
        "y": [20, 420], 
        "unit": "pixels" 
      }
    }
  }
}
```

---

## 6. 参考資料

### 公式ルール
- 日本ハンドボール協会: https://www.handball.or.jp/
- 国際ハンドボール連盟（IHF）規則準拠
- 日本リーグ公式: https://leagueh.jp/

### 参考にした情報源
- ハンドボールコートのサイズと規格: https://handball-kit.shop/handball-coat-size/
- コートラインの引き方: https://chouseisan.com/l/post-24040/
- コートラインプロ: https://ko-toline.com/
- スポスルマガジン（ポジション解説）: https://sposuru.com/

### 実装の優先順位
1. **最優先（Phase 1）**: 
   - 正確なコート描画（40m×20m、すべてのライン）
   - 基本的な7ポジション配置
   - ゴールの描画と配置
   - 6mライン（実線）と9mライン（破線）の正確な描画

2. **高優先（Phase 2）**: 
   - ボール物理演算と移動
   - 簡易得点システム（ゴールライン通過判定）
   - GKのゴールエリア内特権
   - 基本的なプレーヤー移動

3. **中優先（Phase 3）**: 
   - 6mライン制限（GK以外立ち入り禁止）
   - 3歩ルール
   - 3秒ルール
   - ジャンプシュート判定（空中での6mライン侵入許可）

4. **低優先（Phase 4）**: 
   - 詳細なファウル判定（フリースロー、7mスロー）
   - 交代システム（交代ラインからの出入り）
   - スローイン、コーナースロー
   - タイムアウト機能

### 技術的な補足

#### フットサルコートとの関係
- ハンドボールコートとフットサルコートは同じサイズ（40m×20m、800㎡）
- ゴールサイズも同じ（3m×2m）
- フットサルコートをそのままハンドボールで使用可能
- 体育館では両競技兼用が多い

#### バスケットボールコートとの比較
- バスケットコート（28m×15m）より大きい
- 体育館でハンドボールコートを作る場合、バスケのセンターライン・サイドラインを活用可能
- ただしハンドボールの方が広いため、白線追加が必要

#### Canvas描画の実装例
```javascript
// ハンドボールコート全体の描画
function drawHandballCourt(ctx, scale = 20) {
  const courtWidth = 40 * scale;  // 800px
  const courtHeight = 20 * scale; // 400px
  
  // サイドライン
  ctx.strokeRect(0, 0, courtWidth, courtHeight);
  
  // センターライン
  ctx.beginPath();
  ctx.moveTo(courtWidth / 2, 0);
  ctx.lineTo(courtWidth / 2, courtHeight);
  ctx.stroke();
  
  // 左右のゴールエリア（6mライン）
  drawGoalArea(ctx, 0, courtHeight / 2, 6 * scale, scale);
  drawGoalArea(ctx, courtWidth, courtHeight / 2, 6 * scale, scale);
  
  // 9mライン（破線）
  ctx.setLineDash([15, 15]);
  drawGoalArea(ctx, 0, courtHeight / 2, 9 * scale, scale);
  drawGoalArea(ctx, courtWidth, courtHeight / 2, 9 * scale, scale);
  ctx.setLineDash([]);
}

function drawGoalArea(ctx, x, centerY, radius, scale) {
  const goalWidth = 3 * scale; // 60px
  
  // 半円部分
  ctx.beginPath();
  if (x === 0) {
    // 左ゴール
    ctx.arc(x, centerY, radius, -Math.PI/2, Math.PI/2);
  } else {
    // 右ゴール
    ctx.arc(x, centerY, radius, Math.PI/2, -Math.PI/2);
  }
  
  // 中央3mの直線部分
  ctx.moveTo(x, centerY - goalWidth/2);
  ctx.lineTo(x, centerY + goalWidth/2);
  ctx.stroke();
}
```

### よくある実装上の質問

#### Q1: 9mラインはサイドラインとどう接続する？
A: 9mラインの半円はサイドラインと交わる形で終わる。アウターゴールラインには届かない。

#### Q2: ゴールポストの内側角とは？
A: ゴールポストのコート側で、かつゴールラインに最も近い角。この点を中心に6m/9mラインの円弧を描く。

#### Q3: 交代ラインはなぜサイドラインから出る？
A: オフィシャル席から交代を確認しやすくするため。サイドライン内外に15cmずつ、計30cm。

#### Q4: GKは6mラインから出られる？
A: 出られる。ただし出たら通常のコートプレーヤーと同じ扱いになる。

#### Q5: ジャンプシュートで6mライン内に着地してもOK？
A: OK。重要なのは踏み切り位置とボールを離すタイミング。6mライン外で踏み切り、空中でボールを離せば、着地が6mライン内でも有効。

---

**作成日**: 2025年11月
**更新日**: 2025年11月（Web検索情報統合版）
**対象**: Webブラウザベースのハンドボールゲーム/シミュレーション
**形式**: 技術仕様書（完全版）
