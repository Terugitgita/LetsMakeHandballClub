// pdca-analyzer.js - PDCA Analysis for Test Failures
// Analyzes test results and generates fix proposals

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test results from JSON
export function loadTestResults(jsonPath) {
    if (!existsSync(jsonPath)) {
        throw new Error(`Test results file not found: ${jsonPath}`);
    }

    const content = readFileSync(jsonPath, 'utf8');
    return JSON.parse(content);
}

// Analyze failures and categorize by root cause
export function analyzeFailures(testResults) {
    const analysis = {
        summary: {
            totalTests: testResults.summary.total,
            passed: testResults.summary.passed,
            failed: testResults.summary.failed,
            passRate: testResults.summary.passRate
        },
        failuresByCategory: {},
        failurePatterns: [],
        rootCauses: [],
        recommendations: []
    };

    // Group failures by category
    testResults.failedTests.forEach(test => {
        if (!analysis.failuresByCategory[test.category]) {
            analysis.failuresByCategory[test.category] = [];
        }
        analysis.failuresByCategory[test.category].push(test);
    });

    // Identify failure patterns
    analysis.failurePatterns = identifyPatterns(testResults.failedTests);

    // Determine root causes
    analysis.rootCauses = determineRootCauses(analysis.failurePatterns, testResults.failedTests);

    // Generate recommendations
    analysis.recommendations = generateRecommendations(analysis.rootCauses);

    return analysis;
}

// Identify common patterns in failures
function identifyPatterns(failedTests) {
    const patterns = [];

    // Pattern: Multiple failures in same category
    const categoryCounts = {};
    failedTests.forEach(test => {
        categoryCounts[test.category] = (categoryCounts[test.category] || 0) + 1;
    });

    Object.entries(categoryCounts).forEach(([category, count]) => {
        if (count > 3) {
            patterns.push({
                type: 'category_cluster',
                category,
                count,
                severity: count > 10 ? 'high' : 'medium',
                description: `${category}カテゴリで${count}件の失敗`
            });
        }
    });

    // Pattern: Similar error messages
    const errorGroups = {};
    failedTests.forEach(test => {
        if (!test.error) return;
        const errorKey = normalizeError(test.error);
        if (!errorGroups[errorKey]) {
            errorGroups[errorKey] = [];
        }
        errorGroups[errorKey].push(test);
    });

    Object.entries(errorGroups).forEach(([errorKey, tests]) => {
        if (tests.length > 2) {
            patterns.push({
                type: 'error_cluster',
                error: errorKey,
                count: tests.length,
                testIds: tests.map(t => t.id),
                severity: tests.length > 5 ? 'high' : 'medium',
                description: `同様のエラーが${tests.length}件`
            });
        }
    });

    // Pattern: BUG regression tests
    const bugFailures = failedTests.filter(t => t.id.startsWith('BUG-'));
    if (bugFailures.length > 0) {
        patterns.push({
            type: 'bug_regression',
            count: bugFailures.length,
            bugs: [...new Set(bugFailures.map(t => t.id.split('-').slice(0, 2).join('-')))],
            severity: 'critical',
            description: `既知バグの回帰テスト失敗: ${bugFailures.length}件`
        });
    }

    return patterns;
}

// Normalize error message for grouping
function normalizeError(error) {
    // Remove specific values to group similar errors
    return error
        .replace(/\d+(\.\d+)?/g, 'N')
        .replace(/Expected .+?, got/g, 'Expected X, got')
        .substring(0, 100);
}

// Determine root causes from patterns
function determineRootCauses(patterns, failedTests) {
    const rootCauses = [];

    patterns.forEach(pattern => {
        if (pattern.type === 'category_cluster') {
            const cause = analyzeCategory(pattern.category, failedTests);
            if (cause) rootCauses.push(cause);
        }

        if (pattern.type === 'bug_regression') {
            pattern.bugs.forEach(bugId => {
                rootCauses.push({
                    id: bugId,
                    type: 'bug_regression',
                    severity: 'critical',
                    description: `${bugId}の回帰テスト失敗`,
                    affectedFiles: getBugAffectedFiles(bugId),
                    suggestedFix: getBugSuggestedFix(bugId)
                });
            });
        }
    });

    return rootCauses;
}

// Analyze failures by category
function analyzeCategory(category, failedTests) {
    const categoryTests = failedTests.filter(t => t.category === category);

    const categoryAnalysis = {
        TR: {
            type: 'training_system',
            description: '練習システムのロジックエラー',
            affectedFiles: ['js/gameState.js'],
            focusAreas: [
                'applyTraining()関数',
                'calculateTrainingGrowth()関数',
                'getPersonalityModifier()関数'
            ]
        },
        MT: {
            type: 'match_simulation',
            description: '試合シミュレーションのロジックエラー',
            affectedFiles: ['js/match.js', 'js/utils.js'],
            focusAreas: [
                'calculateSuccessRate()関数',
                'checkLineInterception()関数',
                'Player.setTarget()メソッド'
            ]
        },
        TN: {
            type: 'tournament_system',
            description: 'トーナメント進行のロジックエラー',
            affectedFiles: ['js/tournament.js', 'js/teams.js'],
            focusAreas: [
                'createInitialBracket()関数',
                'generateTeamStats()関数',
                'ラウンド進行ロジック'
            ]
        },
        AC: {
            type: 'ace_system',
            description: 'エース/ギアセカンドシステムのエラー',
            affectedFiles: ['js/gameState.js'],
            focusAreas: [
                'addAce()関数',
                'エース覚醒条件',
                'GK除外ロジック'
            ]
        },
        SP: {
            type: 'special_captain',
            description: '特殊キャプテンのロジックエラー',
            affectedFiles: ['js/gameState.js', 'js/config.js'],
            focusAreas: [
                'アンポンタン特殊効果',
                'ボイコット判定'
            ]
        },
        RS: {
            type: 'rest_system',
            description: '休養システムのエラー',
            affectedFiles: ['js/gameState.js'],
            focusAreas: [
                '休養ボーナス計算',
                'ペナルティ適用ロジック'
            ]
        },
        SL: {
            type: 'save_load',
            description: 'セーブ/ロード機能のエラー',
            affectedFiles: ['js/gameState.js', 'js/utils.js'],
            focusAreas: [
                'saveGame()関数',
                'loadGame()関数',
                'localStorage操作'
            ]
        }
    };

    if (!categoryAnalysis[category]) return null;

    return {
        id: `ROOT-${category}`,
        category,
        ...categoryAnalysis[category],
        failedCount: categoryTests.length,
        severity: categoryTests.length > 10 ? 'high' : categoryTests.length > 5 ? 'medium' : 'low'
    };
}

// Get affected files for a bug
function getBugAffectedFiles(bugId) {
    const bugFiles = {
        'BUG-001': ['js/gameState.js'],
        'BUG-002': ['js/match.js', 'js/config.js'],
        'BUG-003': ['js/match.js']
    };
    return bugFiles[bugId] || [];
}

// Get suggested fix for a bug
function getBugSuggestedFix(bugId) {
    const bugFixes = {
        'BUG-001': {
            description: '練習中フリーズの修正',
            steps: [
                '1. applyTraining()内の無限ループの可能性を確認',
                '2. 全キャプテン×練習の組み合わせでタイムアウトを追加',
                '3. 練習効果計算でのゼロ除算チェック'
            ],
            codeLocations: [
                'gameState.js:249 - applyTraining()',
                'gameState.js:317 - calculateTrainingGrowth()'
            ]
        },
        'BUG-002': {
            description: 'ピボットへのパス不発の修正',
            steps: [
                '1. P(ピボット)座標が正しく設定されているか確認',
                '2. executePass()でtoPosition="P"の処理を確認',
                '3. checkLineInterception()でPへのパスが正常に判定されるか確認'
            ],
            codeLocations: [
                'config.js:179 - POSITIONS.P',
                'match.js:509 - executePass()',
                'match.js:733 - checkLineInterception()'
            ]
        },
        'BUG-003': {
            description: '6mライン侵入の修正',
            steps: [
                '1. Player.setTarget()でy座標のクランプを確認',
                '2. y < 30(6mライン)への移動をブロック',
                '3. knockback()でも同様の境界チェックを追加'
            ],
            codeLocations: [
                'match.js:110 - setTarget()',
                'match.js:116 - knockback()',
                'config.js:44 - GOAL_AREA_RADIUS'
            ]
        }
    };
    return bugFixes[bugId] || { description: '詳細な調査が必要', steps: [], codeLocations: [] };
}

// Generate recommendations based on root causes
function generateRecommendations(rootCauses) {
    const recommendations = [];

    // Sort by severity
    const sortedCauses = [...rootCauses].sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
    });

    sortedCauses.forEach((cause, index) => {
        recommendations.push({
            priority: index + 1,
            severity: cause.severity,
            category: cause.category || cause.id,
            title: cause.description,
            affectedFiles: cause.affectedFiles,
            actions: cause.suggestedFix?.steps || cause.focusAreas || [],
            estimatedEffort: estimateEffort(cause)
        });
    });

    return recommendations;
}

// Estimate effort for fixing
function estimateEffort(cause) {
    if (cause.severity === 'critical') return '即時対応が必要';
    if (cause.severity === 'high') return '重要: 早急な対応推奨';
    if (cause.severity === 'medium') return '中程度: 計画的に対応';
    return '低: 時間があれば対応';
}

// Generate PDCA report as Markdown
export function generatePDCAMarkdown(analysis) {
    const now = new Date().toISOString().split('T')[0];

    let md = `# PDCA分析レポート

**生成日:** ${now}
**テスト結果:** ${analysis.summary.passed}/${analysis.summary.totalTests} 成功 (${analysis.summary.passRate}%)

---

## 概要

| 項目 | 値 |
|------|-----|
| 総テスト数 | ${analysis.summary.totalTests} |
| 成功 | ${analysis.summary.passed} |
| 失敗 | ${analysis.summary.failed} |
| 成功率 | ${analysis.summary.passRate}% |

---

## 失敗パターン分析

`;

    analysis.failurePatterns.forEach(pattern => {
        md += `### ${pattern.description}

- **タイプ:** ${pattern.type}
- **深刻度:** ${pattern.severity}
- **件数:** ${pattern.count}

`;
    });

    md += `---

## 根本原因分析

`;

    analysis.rootCauses.forEach(cause => {
        md += `### ${cause.id}: ${cause.description}

- **深刻度:** ${cause.severity}
- **影響ファイル:** ${cause.affectedFiles?.join(', ') || 'N/A'}

`;
        if (cause.suggestedFix) {
            md += `**修正手順:**
`;
            cause.suggestedFix.steps.forEach(step => {
                md += `${step}
`;
            });
            md += '\n';
        }
        if (cause.focusAreas) {
            md += `**確認箇所:**
`;
            cause.focusAreas.forEach(area => {
                md += `- ${area}
`;
            });
            md += '\n';
        }
    });

    md += `---

## 推奨アクション

| 優先度 | カテゴリ | タイトル | 深刻度 | 工数見積 |
|--------|---------|---------|--------|----------|
`;

    analysis.recommendations.forEach(rec => {
        md += `| ${rec.priority} | ${rec.category} | ${rec.title} | ${rec.severity} | ${rec.estimatedEffort} |
`;
    });

    md += `
---

## 次のステップ

1. 上記推奨アクションを優先度順に対応
2. 修正後、再度テストを実行
3. 結果を \`All_Pattern_Test_02.md\` に出力
4. 全テスト成功するまでPDCAを繰り返す

---

**最終更新:** ${now}
`;

    return md;
}

// Main PDCA analysis function
export async function runPDCAAnalysis(testResultsPath, outputPath) {
    console.log('\n========================================');
    console.log('  PDCA Analysis');
    console.log('========================================\n');

    // Load test results
    console.log('Loading test results...');
    const testResults = loadTestResults(testResultsPath);

    // Analyze failures
    console.log('Analyzing failures...');
    const analysis = analyzeFailures(testResults);

    // Generate report
    console.log('Generating PDCA report...');
    const report = generatePDCAMarkdown(analysis);

    // Save report
    if (outputPath) {
        writeFileSync(outputPath, report, 'utf8');
        console.log(`Report saved to: ${outputPath}`);
    }

    // Print summary
    console.log('\n--- Analysis Summary ---');
    console.log(`Total failures: ${analysis.summary.failed}`);
    console.log(`Failure patterns identified: ${analysis.failurePatterns.length}`);
    console.log(`Root causes identified: ${analysis.rootCauses.length}`);
    console.log(`Recommendations: ${analysis.recommendations.length}`);

    if (analysis.recommendations.length > 0) {
        console.log('\nTop priority recommendations:');
        analysis.recommendations.slice(0, 3).forEach(rec => {
            console.log(`  ${rec.priority}. [${rec.severity}] ${rec.title}`);
        });
    }

    return analysis;
}

export default {
    loadTestResults,
    analyzeFailures,
    generatePDCAMarkdown,
    runPDCAAnalysis
};
