import {db} from "./db";
import {ParaLinkInput, RawParagraph} from "../types/database";

interface SaveParagraphsResult {
    paraIdMap: Record<string, number>; // p1 -> db_id
}

export function saveParagraphs(
    documentId: number,
    side: "source" | "target",
    paras: RawParagraph[]
): Record<string, number> {

    // Clear old paragraphs for this side
    db.prepare(`
    DELETE FROM document_paragraphs
    WHERE document_id = ? AND side = ?
  `).run(documentId, side);

    const insertStmt = db.prepare(`
    INSERT INTO document_paragraphs
      (document_id, side, para_index, text)
    VALUES (?, ?, ?, ?)
  `);

    const keyToDbId: Record<string, number> = {};

    for (const p of paras) {
        const result = insertStmt.run(
            documentId,
            side,
            p.index,
            p.text
        );
        keyToDbId[p.id] = Number(result.lastInsertRowid);
    }

    return keyToDbId; // { "p1": 12, "p2": 13 }
}
//
// export function saveParagraphs(
//     documentId: number,
//     side: "source" | "target",
//     paragraphs: { id: string; index: number; text: string }[]
// ): SaveParagraphsResult {
//     const deleteStmt = db.prepare(`
//     DELETE FROM document_paragraphs
//     WHERE document_id = ? AND side = ?
//   `);
//
//     const insertStmt = db.prepare(`
//     INSERT INTO document_paragraphs
//       (document_id, side, para_index, text)
//     VALUES (?, ?, ?, ?)
//   `);
//
//     const tx = db.transaction(() => {
//         deleteStmt.run(documentId, side);
//
//         const idMap: Record<string, number> = {};
//
//         for (const p of paragraphs) {
//             const info = insertStmt.run(
//                 documentId,
//                 side,
//                 p.index,
//                 p.text
//             );
//             idMap[p.id] = Number(info.lastInsertRowid);
//         }
//
//         return idMap;
//     });
//
//     return { paraIdMap: tx() };
// }

// export function saveParaAlignments(
//     documentId: number,
//     paraLinks: any,
//     sourceParaIdMap: any,
//     targetParaIdMap: any
// ) {
//     const insertAlignment = db.prepare(`
//     INSERT INTO paragraph_alignments
//       (document_id, confidence, strategy, status)
//     VALUES (?, ?, ?, ?)
//   `);
//
//     const insertMap = db.prepare(`
//     INSERT INTO paragraph_alignment_map
//       (alignment_id, para_id, side)
//     VALUES (?, ?, ?)
//   `);
//
//     const tx = db.transaction(() => {
//         for (const link of paraLinks) {
//             const result = insertAlignment.run(
//                 documentId,
//                 link.confidence,
//                 link.strategy ?? null,
//                 link.status ?? "pending"
//             );
//
//             const alignmentId = Number(result.lastInsertRowid);
//
//             for (const pid of link.sourceParaIds) {
//                 insertMap.run(
//                     alignmentId,
//                     sourceParaIdMap[pid],
//                     "source"
//                 );
//             }
//
//             for (const pid of link.targetParaIds) {
//                 insertMap.run(
//                     alignmentId,
//                     targetParaIdMap[pid],
//                     "target"
//                 );
//             }
//         }
//     });
//
//     tx();
// }
export function saveParaAlignments(
    documentId: number,
    paraLinks: Array<{
        sourceParaIds: string[]; // ["p1","p2"]
        targetParaIds: string[]; // ["p1"]
        confidence: number;
        strategy?: string;
        status?: string;
    }>,
    sourceKeyToId: Record<string, number>,
    targetKeyToId: Record<string, number>
) {
    const clearStmt = db.prepare(`
    DELETE FROM paragraph_alignments
    WHERE document_id = ?
  `);

    const insertStmt = db.prepare(`
    INSERT INTO paragraph_alignments (
      document_id,
      source_para_ids,
      target_para_ids,
      source_indices,
      target_indices,
      source_count,
      target_count,
      confidence,
      strategy,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    clearStmt.run(documentId);

    for (const link of paraLinks) {
        const sourceDbIds = link.sourceParaIds.map(
            key => sourceKeyToId[key]
        );
        const targetDbIds = link.targetParaIds.map(
            key => targetKeyToId[key]
        );

        insertStmt.run(
            documentId,
            JSON.stringify(link.sourceParaIds.map(id => `s${id}`)),
            JSON.stringify(link.targetParaIds.map(id => `t${id}`)),
            JSON.stringify(sourceDbIds),
            JSON.stringify(targetDbIds),
            sourceDbIds.length,
            targetDbIds.length,
            link.confidence,
            link.strategy ?? null,
            link.status ?? "pending"
        );
    }
}