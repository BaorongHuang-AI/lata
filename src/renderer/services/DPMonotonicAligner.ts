export class DPMonotonicAligner {




    // =========================
    // Public API
    // =========================
    static align(source, target) {
        const n = source.length;
        const m = target.length;

        const dp = Array.from({ length: n + 1 }, () =>
            new Array(m + 1).fill(-Infinity)
        );

        const back = Array.from({ length: n + 1 }, () =>
            new Array(m + 1).fill(null)
        );

        dp[0][0] = 0;

        // gap penalties
        const GAP = -1;

        for (let i = 0; i <= n; i++) {
            for (let j = 0; j <= m; j++) {

                if (i < n && j < m) {
                    const score = this.similarity(source[i], target[j]);

                    if (dp[i][j] + score > dp[i + 1][j + 1]) {
                        dp[i + 1][j + 1] = dp[i][j] + score;
                        back[i + 1][j + 1] = { type: "match", i, j };
                    }
                }

                // skip source (gap in target)
                if (i < n) {
                    if (dp[i][j] + GAP > dp[i + 1][j]) {
                        dp[i + 1][j] = dp[i][j] + GAP;
                        back[i + 1][j] = { type: "skipSource", i, j };
                    }
                }

                // skip target (gap in source)
                if (j < m) {
                    if (dp[i][j] + GAP > dp[i][j + 1]) {
                        dp[i][j + 1] = dp[i][j] + GAP;
                        back[i][j + 1] = { type: "skipTarget", i, j };
                    }
                }
            }
        }

        return this.backtrack(back, source, target);
    }

    // =========================
    // Similarity function
    // =========================
    static similarity(s, t) {
        const a = s.text.toLowerCase();
        const b = t.text.toLowerCase();

        if (a === b) return 2;

        // simple token overlap (fast fallback)
        const tokensA = new Set(a.split(/\s+/));
        const tokensB = new Set(b.split(/\s+/));

        let overlap = 0;
        for (const tok of tokensA) {
            if (tokensB.has(tok)) overlap++;
        }

        return overlap / Math.max(tokensA.size, tokensB.size) - 0.5;
    }

    // =========================
    // Backtracking → alignments
    // =========================
    static backtrack(back, source, target) {
        let i = source.length;
        let j = target.length;

        const pairs = [];

        while (i > 0 || j > 0) {
            const step = back[i][j];

            if (!step) break;

            if (step.type === "match") {
                pairs.push([step.i, step.j]);
                i = step.i;
                j = step.j;
            } else if (step.type === "skipSource") {
                i = step.i;
                j = step.j;
            } else {
                i = step.i;
                j = step.j;
            }
        }

        pairs.reverse();

        return this.groupPairs(pairs, source, target);
    }

    // =========================
    // Convert pairs → schema
    // =========================
    static groupPairs(pairs, source, target) {

        if (pairs.length === 0) return [];

        const results = [];

        let curr = {
            sourceIds: [],
            targetIds: []
        };

        let prevI = -1;
        let prevJ = -1;

        for (const [i, j] of pairs) {

            const contiguous =
                (i === prevI + 1) &&
                (j === prevJ + 1);

            if (!contiguous && curr.sourceIds.length > 0) {
                results.push(this.buildAlignment(curr));
                curr = { sourceIds: [], targetIds: [] };
            }

            curr.sourceIds.push(source[i].id);
            curr.targetIds.push(target[j].id);

            prevI = i;
            prevJ = j;
        }

        if (curr.sourceIds.length > 0) {
            results.push(this.buildAlignment(curr));
        }

        return results;
    }

    // =========================
    // Final formatting
    // =========================
    static buildAlignment(block) {
        return {
            sourceIds: block.sourceIds,
            targetIds: block.targetIds,
            confidence: this.estimateConfidence(block),
            explanation: "DP monotonic alignment"
        };
    }

    static estimateConfidence(block) {
        const len = Math.max(block.sourceIds.length, block.targetIds.length);
        return Math.min(1, 1 / len + 0.5);
    }
}