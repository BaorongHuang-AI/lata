import type { Line, Link } from '../types/alignment';

export interface AlignmentRowLineItem {
    line: Line;
    globalIndex: number;
}

export interface AlignmentRowData {
    id: string;
    sourceItems: AlignmentRowLineItem[];
    targetItems: AlignmentRowLineItem[];
    link?: Link;
}

/**
 * Resolves a sourceId/targetId which may be either a line.id or a line.lineNumber
 * to its index in the given lines array.
 */
function findLineIndex(idOrLineNumber: string, lines: Line[]): number {
    let idx = lines.findIndex(l => l.id === idOrLineNumber);
    if (idx >= 0) return idx;
    idx = lines.findIndex(l => l.lineNumber === idOrLineNumber);
    return idx;
}

/**
 * Builds a sequence of alignment rows from source lines, target lines, and links.
 *
 * Linked source/target lines appear together in the same row.
 * Unlinked lines get their own rows with an empty opposite side.
 * Rows are ordered to preserve the natural document sequence.
 */
export function buildAlignmentRows(
    sourceLines: Line[],
    targetLines: Line[],
    links: Link[]
): AlignmentRowData[] {
    const rows: AlignmentRowData[] = [];

    // Track which source/target indices are consumed by a link
    const linkedSourceIndices = new Set<number>();
    const linkedTargetIndices = new Set<number>();

    interface ResolvedLink {
        link: Link;
        sourceIndices: number[];
        targetIndices: number[];
        minSourceIdx: number;
        minTargetIdx: number;
    }

    const resolvedLinks: ResolvedLink[] = [];

    for (const link of links) {
        const srcIndices: number[] = [];
        const tgtIndices: number[] = [];

        for (const id of link.sourceIds) {
            const idx = findLineIndex(id, sourceLines);
            if (idx >= 0) {
                srcIndices.push(idx);
                linkedSourceIndices.add(idx);
            }
        }

        for (const id of link.targetIds) {
            const idx = findLineIndex(id, targetLines);
            if (idx >= 0) {
                tgtIndices.push(idx);
                linkedTargetIndices.add(idx);
            }
        }

        srcIndices.sort((a, b) => a - b);
        tgtIndices.sort((a, b) => a - b);

        if (srcIndices.length > 0 || tgtIndices.length > 0) {
            resolvedLinks.push({
                link,
                sourceIndices: srcIndices,
                targetIndices: tgtIndices,
                minSourceIdx: srcIndices.length > 0 ? srcIndices[0] : Infinity,
                minTargetIdx: tgtIndices.length > 0 ? tgtIndices[0] : Infinity,
            });
        }
    }

    // Sort links by their first source line position
    resolvedLinks.sort((a, b) => a.minSourceIdx - b.minSourceIdx);

    let srcCursor = 0;
    let tgtCursor = 0;

    for (const resolved of resolvedLinks) {
        // Emit unlinked source lines before this link
        while (srcCursor < resolved.minSourceIdx && srcCursor < sourceLines.length) {
            if (!linkedSourceIndices.has(srcCursor)) {
                rows.push({
                    id: `us-${sourceLines[srcCursor].id}`,
                    sourceItems: [{ line: sourceLines[srcCursor], globalIndex: srcCursor }],
                    targetItems: [],
                });
            }
            srcCursor++;
        }

        // Emit unlinked target lines before this link
        const effectiveTargetStart =
            resolved.minTargetIdx === Infinity ? tgtCursor : resolved.minTargetIdx;
        while (tgtCursor < effectiveTargetStart && tgtCursor < targetLines.length) {
            if (!linkedTargetIndices.has(tgtCursor)) {
                rows.push({
                    id: `ut-${targetLines[tgtCursor].id}`,
                    sourceItems: [],
                    targetItems: [{ line: targetLines[tgtCursor], globalIndex: tgtCursor }],
                });
            }
            tgtCursor++;
        }

        // Emit the linked row
        const linkSourceItems: AlignmentRowLineItem[] = resolved.sourceIndices.map(i => ({
            line: sourceLines[i],
            globalIndex: i,
        }));
        const linkTargetItems: AlignmentRowLineItem[] = resolved.targetIndices.map(i => ({
            line: targetLines[i],
            globalIndex: i,
        }));

        rows.push({
            id: `link-${resolved.link.id}`,
            sourceItems: linkSourceItems,
            targetItems: linkTargetItems,
            link: resolved.link,
        });

        // Advance cursors past the linked lines
        if (resolved.sourceIndices.length > 0) {
            srcCursor = Math.max(srcCursor, Math.max(...resolved.sourceIndices) + 1);
        }
        if (resolved.targetIndices.length > 0) {
            tgtCursor = Math.max(tgtCursor, Math.max(...resolved.targetIndices) + 1);
        }
    }

    // Emit remaining unlinked source lines
    while (srcCursor < sourceLines.length) {
        if (!linkedSourceIndices.has(srcCursor)) {
            rows.push({
                id: `us-${sourceLines[srcCursor].id}`,
                sourceItems: [{ line: sourceLines[srcCursor], globalIndex: srcCursor }],
                targetItems: [],
            });
        }
        srcCursor++;
    }

    // Emit remaining unlinked target lines
    while (tgtCursor < targetLines.length) {
        if (!linkedTargetIndices.has(tgtCursor)) {
            rows.push({
                id: `ut-${targetLines[tgtCursor].id}`,
                sourceItems: [],
                targetItems: [{ line: targetLines[tgtCursor], globalIndex: tgtCursor }],
            });
        }
        tgtCursor++;
    }

    return rows;
}
