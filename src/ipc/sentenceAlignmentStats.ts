import { ipcMain } from "electron";
import {db} from "../db/db";


ipcMain.handle(
    "sentence-alignments:get-stats",
    (_event, documentId?: number) => {
        const baseSql = `
      SELECT
        COUNT(*) AS totalAlignments,
        SUM(CASE WHEN source_count = 1 AND target_count = 1 THEN 1 ELSE 0 END) AS oneToOne,
        SUM(CASE WHEN source_count = 1 AND target_count > 1 THEN 1 ELSE 0 END) AS oneToMany,
        SUM(CASE WHEN source_count > 1 AND target_count > 1 THEN 1 ELSE 0 END) AS manyToMany
      FROM sentence_alignments
    `;

        const stmt = documentId
            ? db.prepare(`${baseSql} WHERE document_id = ?`)
            : db.prepare(baseSql);

        const row = documentId
            ? stmt.get(documentId)
            : stmt.get();

        return {
            totalAlignments: row.totalAlignments ?? 0,
            oneToOne: row.oneToOne ?? 0,
            oneToMany: row.oneToMany ?? 0,
            manyToMany: row.manyToMany ?? 0
        };
    }
);
