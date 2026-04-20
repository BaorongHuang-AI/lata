import { db } from "../../db/db";
import { Alignment, Sentence } from "../../types/alignment";

export class AlignmentRepository {

    /* =========================
       SENTENCES
    ========================= */

    static saveStructuredSentences(
        documentId: string,
        side: "source" | "target",
        structured: {
            paraId: number;
            sentences: Sentence[];
        }[]
    ): string[] {

        const insertStmt = db.prepare(`
    INSERT INTO document_sentences 
      (document_id, paragraph_id, side, sentence_index, sentence_key, text)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

        const allKeys: string[] = [];

        const tx = db.transaction(() => {

            for (const block of structured) {
                const paraId = block.paraId;

                block.sentences.forEach((s, index) => {
                    let key = `sp${paraId}-s${index}`;
                    if(side === "target"){
                        key = `tp${paraId}-s${index}`;
                    }

                    insertStmt.run(
                        documentId,
                        paraId,          // ✅ FIX: correct paragraph mapping
                        side,
                        index,
                        key,
                        s.text
                    );

                    allKeys.push(key);
                });
            }

        });

        tx();

        return allKeys;
    }

    static saveSentences(
        documentId: string,
        sourceParagraphId: string,
        targetParagraphId: string,
        sourceSentences: Sentence[],
        targetSentences: Sentence[]
    ): { sourceKeys: string[]; targetKeys: string[] } {

        const insertStmt = db.prepare(`
      INSERT INTO document_sentences 
        (document_id, paragraph_id, side, sentence_index, sentence_key, text)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        const sourceKeys: string[] = [];
        const targetKeys: string[] = [];

        const tx = db.transaction(() => {

            sourceSentences.forEach((s, i) => {
                const key = this.generateKey(sourceParagraphId, i);

                insertStmt.run(
                    documentId,
                    sourceParagraphId,
                    "source",
                    i,
                    key,
                    s.text
                );

                sourceKeys.push(key);
            });

            targetSentences.forEach((s, i) => {
                const key = this.generateKey(targetParagraphId, i);

                insertStmt.run(
                    documentId,
                    targetParagraphId,
                    "target",
                    i,
                    key,
                    s.text
                );

                targetKeys.push(key);
            });
        });

        tx();

        return { sourceKeys, targetKeys };
    }

    static getSentencesByParagraph(paragraphId: number, side: "source" | "target") {
        return db.prepare(`
      SELECT * FROM document_sentences
      WHERE paragraph_id = ? AND side = ?
      ORDER BY sentence_index ASC
    `).all(paragraphId, side);
    }

    static deleteSentences(paragraphId: number, side: "source" | "target") {
        db.prepare(`
      DELETE FROM document_sentences
      WHERE paragraph_id = ? AND side = ?
    `).run(paragraphId, side);
    }

    /* =========================
       ALIGNMENTS
    ========================= */

    static saveAlignments(
        documentId: string,
        sourceParagraphId: string,
        targetParagraphId: string,
        alignments: Alignment[],
        sourceKeys: string[],
        targetKeys: string[],
        strategy: string
    ): void {

        const insertStmt = db.prepare(`
      INSERT INTO sentence_alignments 
        (document_id, source_paragraph_id, target_paragraph_id,
         source_sentence_keys, target_sentence_keys,
         confidence, explanation, strategy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const tx = db.transaction(() => {
            for (const a of alignments) {
                insertStmt.run(
                    documentId,
                    sourceParagraphId,
                    targetParagraphId,
                    JSON.stringify(a.sourceIds),
                    JSON.stringify(a.targetIds),
                    a.confidence ?? null,
                    a.explanation ?? null,
                    strategy
                );
            }
        });

        tx();
    }

    static getAlignments(sourceParagraphId: number, targetParagraphId: number) {
        return db.prepare(`
      SELECT * FROM sentence_alignments
      WHERE source_paragraph_id = ? AND target_paragraph_id = ?
      ORDER BY id ASC
    `).all(sourceParagraphId, targetParagraphId);
    }

    static getDocumentAlignments(documentId: number) {
        return db.prepare(`
      SELECT * FROM sentence_alignments
      WHERE document_id = ?
      ORDER BY id ASC
    `).all(documentId);
    }

    static deleteAlignments(sourceParagraphId: number, targetParagraphId: number) {
        db.prepare(`
      DELETE FROM sentence_alignments
      WHERE source_paragraph_id = ? AND target_paragraph_id = ?
    `).run(sourceParagraphId, targetParagraphId);
    }

    /* =========================
       HELPERS
    ========================= */

    static generateKey(paragraphId: string, index: number): string {
        return `${paragraphId}-s${index}`;
    }
}
