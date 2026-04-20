type Anchor = {
    sIndex: number;
    tIndex: number;
};

export class WindowService {
    static buildWindows(
        anchors: Anchor[],
        source: any[],
        target: any[],
        windowSize = 20
    ) {
        const windows: any[] = [];

        if (!source?.length || !target?.length) return windows;

        // ✅ sanitize + sort
        anchors = (anchors || [])
            .filter(
                (a) =>
                    a &&
                    Number.isFinite(a.sIndex) &&
                    Number.isFinite(a.tIndex)
            )
            .sort((a, b) => a.sIndex - b.sIndex);

        // =========================
        // ✅ CASE 0: NO ANCHORS
        // =========================
        if (anchors.length === 0) {
            return [
                {
                    sStart: 0,
                    sEnd: source.length,
                    tStart: 0,
                    tEnd: target.length,
                    sourceSlice: source,
                    targetSlice: target,
                    meta: { type: "no-anchor-full" },
                },
            ];
        }

        // =========================
        // ✅ CASE 1: SINGLE ANCHOR
        // =========================
        if (anchors.length === 1) {
            const a = anchors[0];
            const expand = windowSize * 2;

            const windows = [];

            // =========================
            // ✅ HEAD WINDOW (0 → anchor)
            // =========================
            windows.push({
                sStart: 0,
                sEnd: Math.min(source.length, a.sIndex + expand),
                tStart: 0,
                tEnd: Math.min(target.length, a.tIndex + expand),
                sourceSlice: source.slice(0, a.sIndex + expand),
                targetSlice: target.slice(0, a.tIndex + expand),
                meta: { type: "single-anchor-head", anchor: a }
            });

            // =========================
            // ✅ TAIL WINDOW (anchor → end)
            // =========================
            windows.push({
                sStart: Math.max(0, a.sIndex - expand),
                sEnd: source.length,
                tStart: Math.max(0, a.tIndex - expand),
                tEnd: target.length,
                sourceSlice: source.slice(Math.max(0, a.sIndex - expand)),
                targetSlice: target.slice(Math.max(0, a.tIndex - expand)),
                meta: { type: "single-anchor-tail", anchor: a }
            });

            return windows;
        }

        // =========================
        // ✅ HEAD WINDOW (before first anchor)
        // =========================
        const first = anchors[0];

        if (first.sIndex > 0 || first.tIndex > 0) {
            windows.push({
                sStart: 0,
                sEnd: Math.min(source.length, first.sIndex + windowSize),
                tStart: 0,
                tEnd: Math.min(target.length, first.tIndex + windowSize),
                sourceSlice: source.slice(0, first.sIndex + windowSize),
                targetSlice: target.slice(0, first.tIndex + windowSize),
                meta: { type: "head" },
            });
        }

        // =========================
        // ✅ MIDDLE WINDOWS (anchor pairs)
        // =========================
        for (let i = 0; i < anchors.length - 1; i++) {
            const a1 = anchors[i];
            const a2 = anchors[i + 1];

            if (
                a2.sIndex <= a1.sIndex ||
                a2.tIndex <= a1.tIndex
            ) {
                continue;
            }

            const sSpan = a2.sIndex - a1.sIndex;
            const tSpan = a2.tIndex - a1.tIndex;

            let ratio = tSpan / sSpan;

            if (!isFinite(ratio) || ratio <= 0) ratio = 1;
            ratio = Math.max(0.2, Math.min(5, ratio));

            const sStart = Math.max(0, a1.sIndex - windowSize);
            const sEnd = Math.min(source.length, a2.sIndex + windowSize);

            const scaledWindow = Math.max(1, Math.floor(windowSize * ratio));

            const tStart = Math.max(0, a1.tIndex - scaledWindow);
            const tEnd = Math.min(target.length, a2.tIndex + scaledWindow);

            if (sEnd <= sStart || tEnd <= tStart) continue;

            windows.push({
                sStart,
                sEnd,
                tStart,
                tEnd,
                sourceSlice: source.slice(sStart, sEnd),
                targetSlice: target.slice(tStart, tEnd),
                meta: {
                    type: "anchor-pair",
                    anchorStart: a1,
                    anchorEnd: a2,
                    ratio,
                },
            });
        }

        // =========================
        // ✅ TAIL WINDOW (after last anchor)
        // =========================
        const last = anchors[anchors.length - 1];

        if (
            last.sIndex < source.length - 1 ||
            last.tIndex < target.length - 1
        ) {
            windows.push({
                sStart: Math.max(0, last.sIndex - windowSize),
                sEnd: source.length,
                tStart: Math.max(0, last.tIndex - windowSize),
                tEnd: target.length,
                sourceSlice: source.slice(last.sIndex - windowSize),
                targetSlice: target.slice(last.tIndex - windowSize),
                meta: { type: "tail" },
            });
        }

        // =========================
        // ✅ FINAL SAFETY
        // =========================
        if (windows.length === 0) {
            return [
                {
                    sStart: 0,
                    sEnd: source.length,
                    tStart: 0,
                    tEnd: target.length,
                    sourceSlice: source,
                    targetSlice: target,
                    meta: { type: "fallback" },
                },
            ];
        }

        return windows;
    }

    static buildHeuristicWindows(
        source: any[],
        target: any[],
        maxWindowSize = 200,
        overlap = 50
    ) {
        const windows: any[] = [];

        if (!source?.length || !target?.length) return windows;

        let sIndex = 0;
        let tIndex = 0;

        const sLen = source.length;
        const tLen = target.length;

        const ratio = tLen / Math.max(1, sLen);

        let step = 0;

        while (sIndex < sLen && tIndex < tLen) {

            const sEnd = Math.min(sLen, sIndex + maxWindowSize);
            const sSize = sEnd - sIndex;

            const tEnd = Math.min(
                tLen,
                tIndex + Math.max(1, Math.round(sSize * ratio))
            );

            if (sEnd <= sIndex || tEnd <= tIndex) break;

            windows.push({
                sStart: sIndex,
                sEnd,
                tStart: tIndex,
                tEnd,

                sourceSlice: source.slice(sIndex, sEnd),
                targetSlice: target.slice(tIndex, tEnd),

                meta: {
                    type: "heuristic",
                    step: step++,
                    ratio
                }
            });

            if (sEnd === sLen && tEnd === tLen) break;

            // =========================
            // 🔥 adaptive overlap (same logic but stabilized)
            // =========================
            const nextS = sEnd - overlap;
            const nextT = tEnd - overlap;

            // ensure progress (avoid infinite loop)
            sIndex = Math.max(nextS, sIndex + 1);
            tIndex = Math.max(nextT, tIndex + 1);
        }

        // FINAL SAFETY (same as buildWindows)
        if (windows.length === 0) {
            return [
                {
                    sStart: 0,
                    sEnd: sLen,
                    tStart: 0,
                    tEnd: tLen,
                    sourceSlice: source,
                    targetSlice: target,
                    meta: { type: "fallback" }
                }
            ];
        }

        return windows;
    }


}