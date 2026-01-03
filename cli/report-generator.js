// report-generator.js - Test Report Generation
// Generates Markdown and JSON reports from test results

import { TestStatus } from './test-runner.js';

// Generate JSON report
export function generateJsonReport(runner) {
    const stats = runner.getOverallStats();

    return {
        metadata: {
            version: '1.0',
            generatedAt: new Date().toISOString(),
            executionTime: stats.duration,
            startTime: stats.startTime?.toISOString(),
            endTime: stats.endTime?.toISOString()
        },
        summary: {
            total: stats.total,
            passed: stats.passed,
            failed: stats.failed,
            skipped: stats.skipped,
            passRate: stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0
        },
        suites: runner.results.map(r => ({
            name: r.suite,
            category: r.category,
            stats: r.stats,
            tests: r.results.map(t => ({
                id: t.id,
                description: t.description,
                status: t.status,
                error: t.error,
                expected: t.expected,
                actual: t.actual,
                duration: t.duration,
                timestamp: t.timestamp
            }))
        })),
        failedTests: runner.getFailedTests()
    };
}

// Generate Markdown report
export function generateMarkdownReport(runner, version = '01') {
    const stats = runner.getOverallStats();
    const now = new Date().toISOString().split('T')[0];

    let md = `# 全パターンテスト定義 v${version}

**生成日:** ${now}
**テスト実行日:** ${stats.startTime?.toISOString().split('T')[0] || now}
**総テスト数:** ${stats.total}件
**バージョン:** ${version}

---

## 実行方法

\`\`\`bash
node cli/run-tests.js --version=${version}
\`\`\`

---

## 結果凡例

| 記号 | 意味 |
|------|------|
| [ ] | 未実行 |
| [x] | 成功 |
| [!] | 失敗 |
| [-] | スキップ |

---

`;

    // Category mapping
    const categoryNames = {
        'TR': '練習システムテスト',
        'MT': '試合シミュレーションテスト',
        'TN': 'トーナメント進行テスト',
        'AC': 'エース/ギアセカンドテスト',
        'SP': '特殊キャプテンテスト',
        'RS': '休養システムテスト',
        'RT': '地域戦術テスト',
        'SR': '成功率計算テスト',
        'SL': 'セーブ/ロードテスト',
        'BUG': 'バグ回帰テスト'
    };

    // Generate section for each suite
    let sectionNum = 1;
    runner.results.forEach(suiteResult => {
        const categoryName = categoryNames[suiteResult.category] || suiteResult.suite;

        md += `# ${sectionNum}. ${categoryName} (${suiteResult.category})

`;

        // Group tests by subcategory (based on ID prefix)
        const testGroups = {};
        suiteResult.results.forEach(test => {
            // Extract subcategory from test description or ID
            const groupKey = getTestGroupKey(test.id, test.description);
            if (!testGroups[groupKey]) {
                testGroups[groupKey] = [];
            }
            testGroups[groupKey].push(test);
        });

        // Output each group
        Object.entries(testGroups).forEach(([groupName, tests]) => {
            md += `## ${groupName}

| ID | テスト内容 | 結果 | エラー |
|----|-----------|------|--------|
`;
            tests.forEach(test => {
                const status = test.status;
                const error = test.error ? truncateError(test.error) : '';
                md += `| ${test.id} | ${escapeMarkdown(test.description)} | ${status} | ${escapeMarkdown(error)} |
`;
            });

            md += '\n';
        });

        sectionNum++;
    });

    // Add summary section
    md += `---

# テスト統計

| カテゴリ | テスト数 | 成功 | 失敗 | スキップ |
|----------|---------|------|------|----------|
`;

    runner.results.forEach(r => {
        md += `| ${categoryNames[r.category] || r.suite} (${r.category}) | ${r.stats.total} | ${r.stats.passed} | ${r.stats.failed} | ${r.stats.skipped} |
`;
    });

    md += `| **合計** | **${stats.total}** | **${stats.passed}** | **${stats.failed}** | **${stats.skipped}** |

---

`;

    // Failed tests summary
    if (stats.failed > 0) {
        md += `# 失敗テスト詳細

`;
        const failedTests = runner.getFailedTests();
        failedTests.forEach(test => {
            md += `## ${test.id}

- **説明:** ${test.description}
- **カテゴリ:** ${test.category}
- **エラー:** ${test.error}
`;
            if (test.expected !== null) {
                md += `- **期待値:** \`${JSON.stringify(test.expected)}\`
- **実際値:** \`${JSON.stringify(test.actual)}\`
`;
            }
            md += '\n';
        });

        md += '---\n\n';
    }

    // Footer
    md += `**最終更新:** ${now}
**テスト実行:** ${stats.startTime?.toISOString() || '未実行'}
`;

    return md;
}

// Helper: Get test group key from ID/description
function getTestGroupKey(id, description) {
    // Extract category prefix (e.g., "TR-0001" -> "TR")
    const match = id.match(/^([A-Z]+)-/);
    if (!match) return 'その他';

    const category = match[1];

    // Create subcategories based on description patterns
    if (category === 'TR') {
        if (description.includes('パス練習') && description.includes('熱血') && description.includes('論理的')) {
            return '熱血キャプテン × 論理的方針 × パス練習';
        }
        if (description.includes('パス練習') && description.includes('熱血') && description.includes('アグレッシブ')) {
            return '熱血キャプテン × アグレッシブ方針 × パス練習';
        }
        if (description.includes('パワハラ')) {
            return 'パワハラキャプテン（ボイコット含む）';
        }
        if (description.includes('甘やかし')) {
            return '甘やかしキャプテン × パス練習';
        }
        return '練習システム';
    }

    if (category === 'MT') {
        if (description.includes('パス成功率')) {
            return 'パス成功率テスト';
        }
        if (description.includes('ピボット')) {
            return 'ピボットへのパス（BUG-002関連）';
        }
        if (description.includes('シュート')) {
            return 'シュート成功率テスト';
        }
        if (description.includes('ドリブル')) {
            return 'ドリブルテスト';
        }
        if (description.includes('座標') || description.includes('6m')) {
            return '座標境界テスト（BUG-003関連）';
        }
        return '試合シミュレーション';
    }

    if (category === 'TN') {
        if (description.includes('チーム生成') || description.includes('シード') || description.includes('都道府県')) {
            return 'ブラケット生成テスト';
        }
        if (description.includes('ラウンド') && description.includes('勝利後')) {
            return 'ラウンド進行テスト';
        }
        if (description.includes('敗北後')) {
            return '敗北後状態テスト';
        }
        if (description.includes('能力値')) {
            return '対戦相手能力値テスト';
        }
        if (description.includes('決勝')) {
            return '決勝相手テスト';
        }
        return 'トーナメント進行';
    }

    if (category === 'AC') {
        if (description.includes('勝利') && description.includes('エース数')) {
            return 'エース覚醒テスト';
        }
        if (description.includes('ギアセカンド')) {
            return 'ギアセカンド覚醒テスト';
        }
        if (description.includes('倍率')) {
            return '能力倍率テスト';
        }
        if (description.includes('GK')) {
            return 'GK除外テスト';
        }
        return 'エース/ギアセカンド';
    }

    if (category === 'SP') {
        if (description.includes('アンポンタン') || description.includes('すぅぅぅぅてぇ')) {
            return 'アンポンタン（すぅぅぅぅてぇ）テスト';
        }
        if (description.includes('ボイコット') || description.includes('パワハラ')) {
            return 'ボイコットテスト';
        }
        return '特殊キャプテン';
    }

    if (category === 'BUG') {
        if (description.includes('BUG-001')) {
            return 'BUG-001: 練習中フリーズ';
        }
        if (description.includes('BUG-002')) {
            return 'BUG-002: ピボットへのパス不発';
        }
        if (description.includes('BUG-003')) {
            return 'BUG-003: 6mライン侵入';
        }
        return 'バグ回帰テスト';
    }

    // Default group by category
    const categoryNames = {
        'RS': '休養システムテスト',
        'RT': '地域戦術テスト',
        'SR': '成功率計算テスト',
        'SL': 'セーブ/ロードテスト'
    };

    return categoryNames[category] || category;
}

// Helper: Escape markdown special characters
function escapeMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\|/g, '\\|')
        .replace(/\n/g, ' ')
        .replace(/`/g, "'");
}

// Helper: Truncate error message
function truncateError(error, maxLength = 50) {
    if (!error) return '';
    if (error.length <= maxLength) return error;
    return error.substring(0, maxLength - 3) + '...';
}

// Generate PDCA analysis report
export function generatePDCAReport(runner) {
    const failedTests = runner.getFailedTests();

    if (failedTests.length === 0) {
        return {
            status: 'success',
            message: '全テストが成功しました',
            recommendations: []
        };
    }

    const analysis = {
        status: 'needs_improvement',
        failedCount: failedTests.length,
        categories: {},
        recommendations: []
    };

    // Group failures by category
    failedTests.forEach(test => {
        if (!analysis.categories[test.category]) {
            analysis.categories[test.category] = [];
        }
        analysis.categories[test.category].push({
            id: test.id,
            description: test.description,
            error: test.error,
            expected: test.expected,
            actual: test.actual
        });
    });

    // Generate recommendations based on failure patterns
    Object.entries(analysis.categories).forEach(([category, tests]) => {
        const recommendation = {
            category,
            failedTests: tests.length,
            issues: [],
            suggestedFixes: []
        };

        // Analyze failure patterns
        if (category === 'TR') {
            recommendation.issues.push('練習システムのロジックに問題がある可能性');
            recommendation.suggestedFixes.push('gameState.js の applyTraining() 関数を確認');
            recommendation.suggestedFixes.push('キャプテン倍率計算のロジックを確認');
        }

        if (category === 'MT') {
            recommendation.issues.push('試合シミュレーションのロジックに問題がある可能性');
            recommendation.suggestedFixes.push('match.js の成功率計算を確認');
            recommendation.suggestedFixes.push('インターセプト判定のロジックを確認');
        }

        if (category === 'BUG') {
            tests.forEach(test => {
                if (test.id.includes('BUG-001')) {
                    recommendation.issues.push('練習中フリーズの問題');
                    recommendation.suggestedFixes.push('無限ループの可能性を調査');
                }
                if (test.id.includes('BUG-002')) {
                    recommendation.issues.push('ピボットへのパス問題');
                    recommendation.suggestedFixes.push('P座標の計算を確認');
                    recommendation.suggestedFixes.push('インターセプト判定でPが含まれているか確認');
                }
                if (test.id.includes('BUG-003')) {
                    recommendation.issues.push('6mライン侵入問題');
                    recommendation.suggestedFixes.push('Player.setTarget() のクランプ処理を確認');
                    recommendation.suggestedFixes.push('y >= 30 の境界チェックを追加');
                }
            });
        }

        analysis.recommendations.push(recommendation);
    });

    return analysis;
}

// Generate fix suggestions based on PDCA analysis
export function generateFixSuggestions(analysis) {
    const suggestions = [];

    analysis.recommendations.forEach(rec => {
        rec.suggestedFixes.forEach(fix => {
            suggestions.push({
                category: rec.category,
                priority: rec.failedTests > 5 ? 'high' : rec.failedTests > 2 ? 'medium' : 'low',
                suggestion: fix,
                estimatedEffort: '調査が必要'
            });
        });
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return suggestions;
}

export default {
    generateJsonReport,
    generateMarkdownReport,
    generatePDCAReport,
    generateFixSuggestions
};
