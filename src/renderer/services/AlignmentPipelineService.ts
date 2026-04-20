import {Line} from "../../types/alignment";
import {SentenceSplitService} from "./SentenceSplitService";
import {RepairService} from "./RepairService";
import {SentenceAlignmentService} from "./SentenceAlignmentService";
import {SentenceMappingService} from "./SentenceMappingService";
import {AlignmentRepository} from "./AlignmentRepository";
import {splitIntoParagraphs} from "../../utils/AlignUtils";
import {saveParagraphs} from "../../db/paragraphs";
import {db} from "../../db/db";
import {PipelineLogger} from "../../ipc/PipelineLogger";
import {DPMonotonicAligner} from "./DPMonotonicAligner";

type Stage = "splitting" | "aligning" | "repairing" | "review";

class ProgressTracker {

    private event: any;

    private weights: Record<Stage, number>;

    private stageProgress: Record<Stage, number>;

    constructor(event: any) {
        this.event = event;

        this.weights = {
            splitting: 0.2,
            aligning: 0.7,
            repairing: 0.1,
            review: 0
        };
        this.stageProgress = {
            splitting: 0,
            aligning: 0,
            repairing: 0,
            review: 0
        };
    }

    update(stage: Stage, percent: number, current: number, total: number) {

        this.stageProgress[stage] = percent;

        const totalPercent =
            this.stageProgress.splitting * this.weights.splitting +
            this.stageProgress.aligning * this.weights.aligning +
            this.stageProgress.repairing * this.weights.repairing;
        setImmediate(() => {
            this.event?.sender?.send("alignment-progress", {
                stage,
                percent: Math.round(totalPercent),
                detail: {
                    stagePercent: percent,
                    current,
                    total
                }
            });
        });

    }
}

export class AlignmentPipelineService {

    /**
     * Parse "sp4-s0" → { paragraph: 4, sentence: 0 }
     * Works for both "sp" (source) and "tp" (target) prefixes.
     */
    static parseId(id) {
        const m = id.match(/^(sp|tp)(\d+)-s(\d+)$/);
        if (!m) return null;
        return { prefix: m[1], paragraph: parseInt(m[2]), sentence: parseInt(m[3]) };
    }

    /**
     * Build a fast lookup: sentenceId → positional index in the flat array.
     */
    static buildIndexMap(sentences) {
        const map = new Map();
        sentences.forEach((s, i) => map.set(s.id, i));
        return map;
    }

    /**
     * Get the positional index of a sentence id within its array.
     */
    static idx(id, indexMap) {
        return indexMap.get(id) ?? Infinity;
    }

    /**
     * Return the minimum source-positional-index for an alignment.
     */
    static minSrcIdx(a, srcMap) {
        return Math.min(...a.sourceIds.map(id => this.idx(id, srcMap)));
    }

    /**
     * Return the minimum target-positional-index for an alignment.
     */
    static minTgtIdx(a, tgtMap) {
        return Math.min(...a.targetIds.map(id => this.idx(id, tgtMap)));
    }

    /**
     * Return the maximum target-positional-index for an alignment.
     */
    static maxTgtIdx(a, tgtMap) {
        return Math.max(...a.targetIds.map(id => this.idx(id, tgtMap)));
    }


    static async run(event, payload: {
        documentId: number;
        sourceText: string;
        targetText: string;
        srcLang: string;
        tgtLang: string;
    }) {

        const {
            documentId,
            sourceText,
            targetText,
            srcLang,
            tgtLang
        } = payload;

        const tracker = new ProgressTracker(event);

        const logger = new PipelineLogger(documentId);

        logger.step("init", "Pipeline started", {
            srcLang,
            tgtLang
        });
        /* --------------------------------
           1. Update status
        --------------------------------- */
        this.updateStatus(Number(documentId), "splitting");

        /* --------------------------------
           2. Split paragraphs
        --------------------------------- */
        logger.step("splitting", "Paragraph splitting started");

        const sourceParas = splitIntoParagraphs(sourceText);
        const targetParas = splitIntoParagraphs(targetText);

        // persist paragraphs (keep your existing logic)
        saveParagraphs(documentId, "source", sourceParas);
        saveParagraphs(documentId, "target", targetParas);

        /* --------------------------------
           3. Split → structured sentences
        --------------------------------- */
        const totalSplit = sourceParas.length + targetParas.length;
        let completedSplit = 0;

        const splitProgress = () => {
            completedSplit++;
            tracker.update(
                "splitting",
                (completedSplit / totalSplit) * 100,
                completedSplit,
                totalSplit
            );
        };

        const sourceStructured =
            await SentenceSplitService.splitParasToSentences(
                sourceParas,
                srcLang,
                "sp",
                splitProgress
            );

        const targetStructured =
            await SentenceSplitService.splitParasToSentences(
                targetParas,
                tgtLang,
                "tp",
                splitProgress
            );

        /* --------------------------------
           4. Save structured sentences
        --------------------------------- */
        const sourceKeys =
            AlignmentRepository.saveStructuredSentences(
                String(documentId),
                "source",
                sourceStructured
            );

        const targetKeys =
            AlignmentRepository.saveStructuredSentences(
                String(documentId),
                "target",
                targetStructured
            );

        /* --------------------------------
           5. Flatten sentences
        --------------------------------- */
        const sourceSentences =
            sourceStructured.flatMap(p => p.sentences);

        const targetSentences =
            targetStructured.flatMap(p => p.sentences);

        /* --------------------------------
           6. Sentence alignment (GLOBAL)
        --------------------------------- */
        this.updateStatus(Number(documentId), "aligning");
        // const progressTracker = new ProgressTracker(event);
        // tracker.update(
        //     "aligning",
        //     0,
        //     completedSplit,
        //     totalSplit
        // );
        // progressTracker.update(
        //     "splitting",
        //     (completedSplit / totalSplit) * 100,
        //     completedSplit,
        //     totalSplit
        // );
        logger.step("aligning", "Sentence alignment started");
        const rawAlignments =
            await SentenceAlignmentService.align(
                sourceSentences,
                targetSentences,
                srcLang,
                tgtLang,
                tracker
            );

        logger.raw("raw_alignments", rawAlignments);
        console.log("raw alignments", rawAlignments);
        // const finalAlignments = rawAlignments;

        const totalRepair = rawAlignments.length;
        let completedRepair = 0;

        // const repairProgress = () => {
        //     completedRepair++;
        //     tracker.update(
        //         "repairing",
        //         (completedRepair / totalRepair) * 100,
        //         completedRepair,
        //         totalRepair
        //     );
        // };

        /* --------------------------------
           7. Repair
        --------------------------------- */
        logger.step("repairing", "Repair phase started");
        const repairedAlignments =
            RepairService.repair(
                rawAlignments,
                sourceSentences,
                targetSentences
            );

        tracker.update(
            "aligning",
            100,
            totalRepair,
            totalRepair
        );
        logger.raw("repairedAlignments", repairedAlignments);
        logger.step("gap_filling", "Filling alignment gaps");
        const addGapAlignments = await this.fillAlignmentGaps(
            repairedAlignments,
            sourceSentences,
            targetSentences,
            srcLang,
            tgtLang,
            {
                minGapSize: 2,
                maxIterations: 5,
                maxWindowSize: 60,
                progressCallback: ({ iteration, gaps, newAlignments, coverage }) => {
                    console.log(`Progress: iter=${iteration}, gaps=${gaps}, new=${newAlignments}`, coverage);
                }
            }  // minGapSize: ignore trivial 1-sentence gaps
        );
        logger.raw("addGapAlignments", addGapAlignments);
        console.log("addGapAlignments", addGapAlignments);
        const monoAlignments = this.enforceMonotonicity(
            addGapAlignments, sourceSentences, targetSentences
        );
        logger.raw("monoAlignments", monoAlignments);
        let finalAlignments = SentenceAlignmentService.resolveConflicts(
            monoAlignments,
            sourceSentences,
            targetSentences
        );
        finalAlignments = SentenceAlignmentService.removeNullAlignments(finalAlignments);
        console.log("monoAlignments alignments (after conflicts)", finalAlignments);


        // ✅ STEP 2: fix missing sentences (coverage repair)
        finalAlignments = SentenceAlignmentService.attachUncoveredSentences(
            finalAlignments,
            sourceSentences,
            targetSentences
        );


        // ✅ STEP 3: hybrid gap repair (your previous logic)
        finalAlignments = await SentenceAlignmentService.repairWithHybrid(
            finalAlignments,
            sourceSentences,
            targetSentences,
            srcLang,
            tgtLang
        );
//
// // ✅ STEP 4: final cleanup
//         finalAlignments = SentenceAlignmentService.deduplicate(finalAlignments);
//         finalAlignments = SentenceAlignmentService.mergeOverlaps(
//             finalAlignments,
//             sourceSentences,
//             targetSentences
//         );
//         // 🔥 NEW STEP: repair gaps using DP
//         const gaps = SentenceAlignmentService.findUnalignedWindows(
//             finalAlignments,
//             sourceSentences,
//             targetSentences
//         );
//
//         const repaired = [];
//
//         for (const w of gaps) {
//             const sourceSlice = sourceSentences.slice(w.sStart, w.sEnd + 1);
//             const targetSlice = targetSentences.slice(w.tStart, w.tEnd + 1);
//
//             const sLen = sourceSlice.length;
//             const tLen = targetSlice.length;
//
//             // ⚠️ guard (VERY IMPORTANT)
//             const ratio = tLen / Math.max(1, sLen);
//             if (ratio > 5 || ratio < 0.2) continue;
//
//             // =========================
//             // ✅ Rule 1: simple merge
//             // =========================
//             if (sLen === 1 && tLen > 1) {
//                 repaired.push({
//                     sourceIds: [sourceSlice[0].id],
//                     targetIds: targetSlice.map(t => t.id),
//                     confidence: 0.9,
//                     explanation: "1-to-many merge (gap repair)"
//                 });
//                 continue;
//             }
//
//             if (tLen === 1 && sLen > 1) {
//                 repaired.push({
//                     sourceIds: sourceSlice.map(s => s.id),
//                     targetIds: [targetSlice[0].id],
//                     confidence: 0.9,
//                     explanation: "many-to-1 merge (gap repair)"
//                 });
//                 continue;
//             }
//
//             // =========================
//             // ✅ Rule 2: huge gap → LLM
//             // =========================
//             if (sLen + tLen >= 20) {
//                 const aligned = await SentenceAlignmentService.monotonicAlignBlock(
//                     sourceSlice,
//                     targetSlice,
//                     srcLang,   // or srcLang
//                     tgtLang,    // or tgtLang
//                 );
//
//                 repaired.push(...aligned);
//                 continue;
//             }
//
//             // =========================
//             // ✅ Rule 3: DP fallback
//             // =========================
//             const aligned = DPMonotonicAligner.align(
//                 sourceSlice,
//                 targetSlice
//             );
//
//             repaired.push(...aligned);
//         }
//
// // 🔥 merge back
//         finalAlignments = [
//             ...finalAlignments,
//             ...repaired
//         ];

// 🔥 clean again
//         finalAlignments = SentenceAlignmentService.deduplicate(finalAlignments);
//         finalAlignments = SentenceAlignmentService.mergeOverlaps(
//             finalAlignments
//         );

        logger.raw("final alignments (after hybrid repair)", finalAlignments);
        console.log("final alignments (after hybrid repair)", finalAlignments);

        /* --------------------------------
           8. Save alignments
        --------------------------------- */
        await AlignmentRepository.saveAlignments(
            String(documentId),
            "GLOBAL",   // ✅ no longer paragraph-bound
            "GLOBAL",
            finalAlignments,
            sourceKeys,
            targetKeys,
            "sentence-global"
        );

        logger.step("saved", "alignments saved");
        this.updateStatus(documentId, "review");
        logger.step("docstatus", "doc status updated");
        await new Promise((resolve) => setTimeout(resolve, 0));
        tracker.update(
            "review",
            100,
            totalRepair,
            totalRepair
        );
        logger.step("align status", "align status updated");
        /* --------------------------------
           9. Final status
        --------------------------------- */
        event.sender.send("alignment-finished", {
            documentId,
            status: "review"
        });
        console.log("finish all", finalAlignments);
        return {
            status: "review",
            sentenceAlignments: finalAlignments.length,
            sourceSentences: sourceSentences.length,
            targetSentences: targetSentences.length
        };
    }




    // ─────────────────────────────────────────────
    //  MONOTONICITY ENFORCEMENT
    // ─────────────────────────────────────────────

    /**
     * Enforce roughly monotonic target ordering.
     *
     * Uses Longest Increasing Subsequence (LIS) on the target-start
     * indices (after sorting by source-start).  Alignments not in the
     * LIS are dropped — they are the "backward jumps".
     */
    static enforceMonotonicity(alignments, sourceSentences, targetSentences) {
        const srcMap = this.buildIndexMap(sourceSentences);
        const tgtMap = this.buildIndexMap(targetSentences);

        // Sort by source position
        const sorted = [...alignments].sort((a, b) => {
            const sa = this.minSrcIdx(a, srcMap);
            const sb = this.minSrcIdx(b, srcMap);
            if (sa !== sb) return sa - sb;
            return this.minTgtIdx(a, tgtMap) - this.minTgtIdx(b, tgtMap);
        });

        if (sorted.length === 0) return [];

        // Extract target-start indices for LIS
        const tgtStarts = sorted.map(a => this.minTgtIdx(a, tgtMap));

        // Compute LIS indices (patience sorting)
        const lisIndices = this.longestIncreasingSubsequenceIndices(tgtStarts);

        const lisSet = new Set(lisIndices);
        const kept = sorted.filter((_, i) => lisSet.has(i));

        const dropped = sorted.length - kept.length;
        if (dropped > 0) {
            console.log(`Monotonicity: dropped ${dropped} backward-jumping alignment(s).`);
        }

        return kept;
    }

    /**
     * Returns the *indices* of elements forming the longest
     * non-decreasing subsequence.  (We allow equal values so that
     * many-to-one on the target side is fine.)
     */
    static longestIncreasingSubsequenceIndices(arr) {
        const n = arr.length;
        if (n === 0) return [];

        // tails[i] = smallest tail value for increasing subsequence of length i+1
        const tails = [];
        const tailIndices = [];   // actual index in arr for each tail
        const prev = new Array(n).fill(-1);

        for (let i = 0; i < n; i++) {
            const val = arr[i];

            // Binary search: find first tail > val  (we allow equal, so strictly greater)
            let lo = 0, hi = tails.length;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (tails[mid] <= val) lo = mid + 1;
                else hi = mid;
            }

            tails[lo] = val;
            tailIndices[lo] = i;

            if (lo > 0) {
                prev[i] = tailIndices[lo - 1];
            }
        }

        // Reconstruct
        const result = [];
        let idx = tailIndices[tails.length - 1];
        while (idx !== -1) {
            result.push(idx);
            idx = prev[idx];
        }
        result.reverse();
        return result;
    }



    /**
     * Iteratively detects gaps in alignments, re-aligns them,
     * and merges results until no actionable gaps remain.
     */
    static async fillAlignmentGaps(
        repairedAlignments,
        sourceSentences,
        targetSentences,
        srcLang,
        tgtLang,
        {
            minGapSize = 2,
            maxIterations = 5,
            maxWindowSize = 60,     // chunk large gaps to avoid context overflow
            progressCallback = null
        } = {}
    ) {
        const srcMap = new Map(sourceSentences.map((s, i) => [s.id, i]));
        const tgtMap = new Map(targetSentences.map((t, i) => [t.id, i]));

        let current = [...repairedAlignments];
        let iteration = 0;
        let totalFilled = 0;

        while (iteration < maxIterations) {
            iteration++;

            // ── Step 1: Find gaps ──
            const gaps = this.findGapWindows(
                current,
                sourceSentences,
                targetSentences,
                minGapSize
            );

            if (!gaps.length) {
                console.log(`Iteration ${iteration}: No gaps found. Done.`);
                break;
            }

            console.log(
                `Iteration ${iteration}: Found ${gaps.length} gap(s):`,
                gaps.map(g =>
                    `  src[${g.sStart}..${g.sEnd - 1}] (${g.sourceSlice.length}) ↔ ` +
                    `tgt[${g.tStart}..${g.tEnd - 1}] (${g.targetSlice.length})`
                )
            );

            // ── Step 2: Chunk large gaps ──
            const windows = [];
            for (const gap of gaps) {
                const chunked = this.chunkGapWindow(
                    gap, sourceSentences, targetSentences, maxWindowSize
                );
                windows.push(...chunked);
            }

            console.log(
                `Iteration ${iteration}: ${gaps.length} gap(s) → ${windows.length} window(s) after chunking`
            );

            // ── Step 3: Re-align gap windows ──
            const gapAlignments = await SentenceAlignmentService.alignWindowsWithNoProgress(
                windows.map(w => ({
                    ...w,
                    meta: {
                        type: "gap-fill",
                        iteration,
                        forceOneToOne: false,
                        discourageGrouping: false
                    }
                })),
                srcLang,
                tgtLang
            );

            if (!gapAlignments.length) {
                console.warn(`Iteration ${iteration}: Gap fill returned 0 alignments. Stopping.`);
                break;
            }

            console.log(
                `Iteration ${iteration}: Gap fill produced ${gapAlignments.length} alignment(s).`
            );

            totalFilled += gapAlignments.length;

            // ── Step 4: Merge + resolve conflicts ──
            const merged = [...current, ...gapAlignments];

            const resolved = SentenceAlignmentService.resolveConflicts(
                merged, sourceSentences, targetSentences
            );

            // Step 6: Enforce monotonicity
            const monotonic = this.enforceMonotonicity(
                resolved, sourceSentences, targetSentences
            );

            // Check if we made progress
            if (monotonic.length <= current.length) {
                console.log("No progress made. Stopping.");
                // Still use the resolved set if it's at least as good
                current = monotonic.length >= current.length ? monotonic : current;
                break;
            }



            // ── Step 5: Check if we made progress ──
            const prevCoverage = this.computeCoverage(current, srcMap, tgtMap);
            const newCoverage  = this.computeCoverage(resolved, srcMap, tgtMap);

            console.log(
                `Iteration ${iteration}: Coverage ` +
                `src ${prevCoverage.srcCovered}→${newCoverage.srcCovered}/${sourceSentences.length}, ` +
                `tgt ${prevCoverage.tgtCovered}→${newCoverage.tgtCovered}/${targetSentences.length}`
            );

            if (progressCallback) {
                progressCallback({
                    iteration,
                    gaps: gaps.length,
                    newAlignments: gapAlignments.length,
                    coverage: newCoverage
                });
            }

            // No progress? Stop — avoid infinite loop
            const noProgress =
                newCoverage.srcCovered <= prevCoverage.srcCovered &&
                newCoverage.tgtCovered <= prevCoverage.tgtCovered;

            if (noProgress) {
                console.warn(`Iteration ${iteration}: No coverage improvement. Stopping.`);
                current = monotonic.length >= current.length ? monotonic : current;
                break;
            }

            current = monotonic;

            // Fully covered? Stop early
            if (
                newCoverage.srcCovered >= sourceSentences.length &&
                newCoverage.tgtCovered >= targetSentences.length
            ) {
                console.log(`Iteration ${iteration}: Full coverage achieved.`);
                break;
            }
        }

        if (iteration >= maxIterations) {
            console.warn(`Reached max iterations (${maxIterations}). Residual gaps may remain.`);
        }

        console.log(
            `fillAlignmentGaps complete: ${iteration} iteration(s), ${totalFilled} total new alignment(s).`
        );

        // ── Final sort ──
        current.sort((a, b) => {
            const aIdx = Math.min(...(a.sourceIds ?? []).map(id => srcMap.get(id) ?? Infinity));
            const bIdx = Math.min(...(b.sourceIds ?? []).map(id => srcMap.get(id) ?? Infinity));
            return aIdx - bIdx;
        });
        console.log("current after sort", current);

        return current;
    }

    /**
     * Compute how many source/target segments are covered by alignments.
     */
    static computeCoverage(alignments, srcMap, tgtMap) {
        const coveredSrc = new Set();
        const coveredTgt = new Set();

        for (const a of alignments) {
            for (const s of a.sourceIds ?? []) {
                if (srcMap.has(s)) coveredSrc.add(s);
            }
            for (const t of a.targetIds ?? []) {
                if (tgtMap.has(t)) coveredTgt.add(t);
            }
        }

        return {
            srcCovered: coveredSrc.size,
            tgtCovered: coveredTgt.size
        };
    }

    /**
     * Split a large gap window into overlapping chunks
     * so each chunk fits within the LLM context window.
     *
     * Overlap ensures boundary sentences get proper context.
     */
    static chunkGapWindow(gap, sourceSentences, targetSentences, maxWindowSize) {
        const srcLen = gap.sEnd - gap.sStart;
        const tgtLen = gap.tEnd - gap.tStart;
        const totalLen = srcLen + tgtLen;

        // Small enough — return as-is
        if (totalLen <= maxWindowSize) {
            return [gap];
        }

        // Determine how many chunks we need
        const overlap = Math.min(4, Math.floor(maxWindowSize * 0.1));
        const effectiveSize = maxWindowSize - overlap * 2; // usable portion per chunk

        // Calculate proportional split between source and target per chunk
        const ratio = srcLen / (srcLen + tgtLen);
        const srcChunkSize = Math.max(2, Math.floor(maxWindowSize * ratio * 0.5));
        const tgtChunkSize = Math.max(2, Math.floor(maxWindowSize * (1 - ratio) * 0.5));

        const chunks = [];
        let sPos = gap.sStart;
        let tPos = gap.tStart;

        while (sPos < gap.sEnd && tPos < gap.tEnd) {
            const sChunkEnd = Math.min(sPos + srcChunkSize, gap.sEnd);
            const tChunkEnd = Math.min(tPos + tgtChunkSize, gap.tEnd);

            chunks.push({
                sStart: sPos,
                sEnd: sChunkEnd,
                tStart: tPos,
                tEnd: tChunkEnd,
                sourceSlice: sourceSentences.slice(sPos, sChunkEnd),
                targetSlice: targetSentences.slice(tPos, tChunkEnd)
            });

            // Advance with overlap
            const sAdvance = Math.max(1, sChunkEnd - sPos - overlap);
            const tAdvance = Math.max(1, tChunkEnd - tPos - overlap);
            sPos += sAdvance;
            tPos += tAdvance;

            // Safety: if we've covered one side, flush the rest
            if (sPos >= gap.sEnd && tPos < gap.tEnd) {
                chunks.push({
                    sStart: Math.max(gap.sStart, gap.sEnd - 2),
                    sEnd: gap.sEnd,
                    tStart: tPos,
                    tEnd: gap.tEnd,
                    sourceSlice: sourceSentences.slice(Math.max(gap.sStart, gap.sEnd - 2), gap.sEnd),
                    targetSlice: targetSentences.slice(tPos, gap.tEnd)
                });
                break;
            }
            if (tPos >= gap.tEnd && sPos < gap.sEnd) {
                chunks.push({
                    sStart: sPos,
                    sEnd: gap.sEnd,
                    tStart: Math.max(gap.tStart, gap.tEnd - 2),
                    tEnd: gap.tEnd,
                    sourceSlice: sourceSentences.slice(sPos, gap.sEnd),
                    targetSlice: targetSentences.slice(Math.max(gap.tStart, gap.tEnd - 2), gap.tEnd)
                });
                break;
            }
        }

        return chunks;
    }
    /**
     * Finds continuous bilateral gaps between repaired alignments.
     * Returns window objects ready for alignWindowsWithNoProgress.
     */
    static findGapWindows(alignments, sourceSentences, targetSentences, minGapSize = 2) {
        const S = sourceSentences.length;
        const T = targetSentences.length;

        // ── Edge: nothing aligned at all → one giant window ──
        if (!alignments.length) {
            if (S > 0 && T > 0) {
                return [{
                    sStart: 0, sEnd: S,
                    tStart: 0, tEnd: T,
                    sourceSlice: sourceSentences.slice(),
                    targetSlice: targetSentences.slice()
                }];
            }
            return [];
        }

        // ── Build ID → flat-index maps ──
        const srcMap = new Map(sourceSentences.map((s, i) => [s.id, i]));
        const tgtMap = new Map(targetSentences.map((t, i) => [t.id, i]));

        // ── Convert alignments to index ranges ──
        const blocks = alignments
            .map(a => {
                const si = a.sourceIds
                    .map(id => srcMap.get(id))
                    .filter(i => i !== undefined);
                const ti = a.targetIds
                    .map(id => tgtMap.get(id))
                    .filter(i => i !== undefined);
                if (!si.length || !ti.length) return null;
                return {
                    sMin: Math.min(...si), sMax: Math.max(...si),
                    tMin: Math.min(...ti), tMax: Math.max(...ti)
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.sMin - b.sMin || a.tMin - b.tMin);

        if (!blocks.length) return [];

        // ── Merge overlapping / adjacent blocks ──
        // (adjacent = within 1 index on the SOURCE side)
        const merged = [{ ...blocks[0] }];
        for (let i = 1; i < blocks.length; i++) {
            const last = merged[merged.length - 1];
            const curr = blocks[i];
            // Merge if source ranges touch or overlap
            if (curr.sMin <= last.sMax + 1) {
                last.sMax = Math.max(last.sMax, curr.sMax);
                last.tMin = Math.min(last.tMin, curr.tMin);
                last.tMax = Math.max(last.tMax, curr.tMax);
            } else {
                merged.push({ ...curr });
            }
        }

        // ── Collect gap windows between merged blocks ──
        const windows = [];

        function addWindow(sStart, sEnd, tStart, tEnd) {
            sStart = Math.max(0, sStart);
            sEnd   = Math.min(S, sEnd);
            tStart = Math.max(0, tStart);
            tEnd   = Math.min(T, tEnd);

            const srcGap = sEnd - sStart;
            const tgtGap = tEnd - tStart;

            // Need segments on BOTH sides, and at least one side ≥ minGapSize
            if (srcGap > 0 && tgtGap > 0 && (srcGap >= minGapSize || tgtGap >= minGapSize)) {
                windows.push({
                    sStart, sEnd,
                    tStart, tEnd,
                    sourceSlice: sourceSentences.slice(sStart, sEnd),
                    targetSlice: targetSentences.slice(tStart, tEnd)
                });
            }
        }

        // Gap BEFORE first block
        addWindow(0, merged[0].sMin, 0, merged[0].tMin);

        // Gaps BETWEEN consecutive blocks
        for (let i = 0; i < merged.length - 1; i++) {
            const curr = merged[i];
            const next = merged[i + 1];
            addWindow(
                curr.sMax + 1,   // first uncovered source
                next.sMin,        // up to next covered source
                curr.tMax + 1,   // first uncovered target
                next.tMin         // up to next covered target
            );
        }

        // Gap AFTER last block
        const last = merged[merged.length - 1];
        addWindow(last.sMax + 1, S, last.tMax + 1, T);

        return windows;
    }

    static async alignParagraph(
        sourcePara: string,
        targetPara: string,
        srcLang: string,
        tgtLang: string,
        documentId: string,
        sourceParagraphId: string,
        targetParagraphId: string,
        sourceLines: Line[],
        targetLines: Line[],
    ) {
        this.updateStatus(Number(documentId), "splitting");
        // 1. Split
        const sourceStructured = await SentenceSplitService.splitParasToSentences(sourcePara, srcLang, "s", null, null);
        const targetStructured = await SentenceSplitService.splitParasToSentences(targetPara, tgtLang, "t", null, null);

        console.log("Structured source", sourceStructured);
        console.log("Structured target", targetStructured);

        /* --------------------------------
           2️⃣ Flatten sentences
        --------------------------------- */
        const sourceSentences = sourceStructured.flatMap(p => p.sentences);
        const targetSentences = targetStructured.flatMap(p => p.sentences);


        // // 2. Map to line structure
        // const sourceSentences = SentenceMappingService.map(sourceRaw, sourceLines);
        // const targetSentences = SentenceMappingService.map(targetRaw, targetLines);

        // 3. Persist sentences
        const sourceKeys = AlignmentRepository.saveStructuredSentences(
            documentId,
            "source",
            sourceStructured
        );

        const targetKeys = AlignmentRepository.saveStructuredSentences(
            documentId,
            "target",
            targetStructured
        );

        this.updateStatus(Number(documentId), "aligning");
        // 4. Align (LLM or fallback)
        const alignments =
            await SentenceAlignmentService.align(
                sourceSentences,
                targetSentences,
                srcLang,
                tgtLang,
                null
            );

        // 5. Repair + cleanup
        const finalAlignments =
            RepairService.repair(
                alignments,
                sourceSentences,
                targetSentences
            );

        // 6. Save alignment
        await AlignmentRepository.saveAlignments(
            documentId,
            sourceParagraphId,
            targetParagraphId,
            finalAlignments,
            sourceKeys,
            targetKeys,
            "sentence"
        );

        return {
            sourceSentences,
            targetSentences,
            alignments: finalAlignments
        };
    }

    /* =========================
   HELPERS
========================= */

    static sendProgress(event, payload) {
        event.sender.send("alignment-progress", payload);
    }


    static updateStatus(documentId: number, status: string) {
        db.prepare(`
      UPDATE documents
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, documentId);
    }

    static buildPairs(paraLinks, sourceParas, targetParas) {
        return paraLinks.map(link => {

            const sourceLines = link.sourceParaIds
                .map(id => sourceParas.find(p => p.id === id))
                .filter(Boolean);

            const targetLines = link.targetParaIds
                .map(id => targetParas.find(p => p.id === id))
                .filter(Boolean);

            return {
                sourceId: link.sourceParaIds.join(","),
                targetId: link.targetParaIds.join(","),
                sourceLines,
                targetLines
            };
        });
    }
}
