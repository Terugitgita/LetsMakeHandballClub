// match-pattern-generator.js - 試合パターンテスト生成（ストリーミング版）
// P24: メモリ節約のため、生成しながらファイルに書き込み

import fs from 'fs';
import path from 'path';

// === 定数定義 ===
const POSITIONS = ['LW', 'LB', 'CB', 'RB', 'RW', 'P'];
const DIRECTIONS = ['toward_enemy', 'away_enemy', 'right', 'left'];
const DISTANCES = ['short', 'medium', 'long'];
const SHOOT_TYPES = ['corner', 'center'];
const REGIONS = ['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州', 'K航拿'];
const ROUNDS = [1, 2, 3, 4, 5, 6];

// === ストリーミング生成 ===
function* generatePatternsStream(startPos, maxSteps) {
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
                    yield [{ action: 'dribble', dir, dist, next: 'shoot', shootType }];
                }
            }
        }
        return;
    }

    // 3手以上: パス→続き
    for (const to of POSITIONS) {
        if (to !== startPos) {
            for (const sub of generatePatternsStream(to, maxSteps - 1)) {
                yield [{ action: 'pass', to }, ...sub];
            }
        }
    }

    // ドリブル→パス→続き
    for (const dir of DIRECTIONS) {
        for (const dist of DISTANCES) {
            for (const passTo of POSITIONS) {
                for (const sub of generatePatternsStream(passTo, maxSteps - 2)) {
                    yield [{ action: 'dribble', dir, dist, next: 'pass', passTo }, ...sub];
                }
            }
        }
    }
}

// 戦術を文字列で説明
function describeTactic(startPos, tactics) {
    let desc = startPos;
    for (const t of tactics) {
        if (t.action === 'pass') desc += `→${t.to}`;
        else if (t.action === 'dribble') desc += `:${t.dir.slice(0,2)}${t.dist.slice(0,1)}→${t.next === 'pass' ? t.passTo : 'shoot'}`;
        else if (t.action === 'shoot') desc += `→${t.type}シュート`;
    }
    return desc;
}

// === メイン ===
async function main() {
    console.log('試合パターン生成中（ストリーミング版）...\n');

    const docsDir = path.join(process.cwd(), 'docs');
    const jsonPath = path.join(docsDir, 'match-patterns.json');
    const mdPath = path.join(docsDir, 'Match_Pattern_Tests.md');

    // JSONストリーミング書き込み
    const jsonStream = fs.createWriteStream(jsonPath);
    jsonStream.write('{\n  "enemyPatterns": {\n');
    jsonStream.write(`    "regions": ${JSON.stringify(REGIONS)},\n`);
    jsonStream.write(`    "rounds": ${JSON.stringify(ROUNDS)}\n`);
    jsonStream.write('  },\n  "patterns": [\n');

    // MDストリーミング書き込み
    const mdStream = fs.createWriteStream(mdPath);
    mdStream.write('# 試合パターンテスト一覧\n\n');
    mdStream.write(`生成日時: ${new Date().toISOString()}\n\n`);
    mdStream.write(`## 敵パターン（実行時に組み合わせ）\n`);
    mdStream.write(`| 地域 | ラウンド |\n|------|----------|\n`);
    for (const r of REGIONS) {
        mdStream.write(`| ${r} | 1-6 |\n`);
    }
    mdStream.write('\n---\n\n');

    let totalCount = 0;
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let isFirst = true;
    let currentSteps = 0;

    for (const startPos of POSITIONS) {
        console.log(`処理中: ${startPos}...`);

        for (let steps = 1; steps <= 5; steps++) {
            // 手数が変わったらMDにヘッダー追加
            if (steps !== currentSteps) {
                if (currentSteps > 0) {
                    mdStream.write('\n');
                }
                currentSteps = steps;
            }

            for (const tactic of generatePatternsStream(startPos, steps)) {
                const id = `PT-${String(totalCount + 1).padStart(5, '0')}`;
                const desc = describeTactic(startPos, tactic);

                // JSON出力
                const pattern = { id, startPos, steps, tactics: tactic, desc };
                if (!isFirst) jsonStream.write(',\n');
                jsonStream.write('    ' + JSON.stringify(pattern));
                isFirst = false;

                // サンプルのみMD出力（全件は多すぎる）
                if (stats[steps] < 10 || (stats[steps] < 50 && totalCount % 100 === 0)) {
                    mdStream.write(`- [${id}] ${desc}\n`);
                }

                stats[steps]++;
                totalCount++;

                // 進捗表示（10万件ごと）
                if (totalCount % 100000 === 0) {
                    console.log(`  ${totalCount}件生成完了...`);
                }
            }
        }
    }

    // ストリーム終了
    jsonStream.write('\n  ]\n}\n');
    jsonStream.end();

    // MD統計追加
    mdStream.write('\n---\n\n## 統計\n\n');
    mdStream.write(`| 手数 | パターン数 |\n|------|------------|\n`);
    for (const [k, v] of Object.entries(stats).sort()) {
        mdStream.write(`| ${k}手 | ${v.toLocaleString()}件 |\n`);
    }
    mdStream.write(`| **合計** | **${totalCount.toLocaleString()}件** |\n\n`);

    const totalWithEnemy = totalCount * REGIONS.length * ROUNDS.length;
    mdStream.write(`敵パターン適用後: **${totalWithEnemy.toLocaleString()}件**\n`);
    mdStream.end();

    console.log('\n=== 生成完了 ===');
    console.log(`味方パターン: ${totalCount.toLocaleString()}件`);
    console.log(`敵パターン適用後: ${totalWithEnemy.toLocaleString()}件`);
    console.log('\n手数別:');
    for (const [k, v] of Object.entries(stats).sort()) {
        console.log(`  ${k}手: ${v.toLocaleString()}件`);
    }
    console.log(`\nJSON: ${jsonPath}`);
    console.log(`MD: ${mdPath}`);
}

main().catch(console.error);
