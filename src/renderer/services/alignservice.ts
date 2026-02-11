import {db} from "../../db/db";
import {
    Alignment,
    AlignmentPair,
    AlignmentRecord,
    AlignmentResult, Line,
    Sentence,
    SentenceRecord
} from "../../types/alignment";
import {
    buildAlignmentPrompt,
    buildAlignmentPromptFromDB,
    buildSplitPrompt,
    buildSplitPromptFromDB,
    llmCallWithRetry
} from "../../utils/AlignUtils";
import {sendChatCompletion} from "../../utils/sendChatCompletion";
import {listPrompts} from "../../db/promptService";

export class AlignmentService {
    static getAppState(documentId: number) {
        /* =========================
           1. Paragraphs
        ========================= */
        const sourceParas = db
            .prepare(
                `
        SELECT id, para_index, content
        FROM paragraphs
        WHERE document_id = ? AND role = 'source'
        ORDER BY para_index
        `
            )
            .all(documentId)
            .map((p: any) => ({
                id: `s${p.id}`,
                lineNumber: `s${p.para_index}`,
                text: p.content,
                isFavorite: false,
            }));

        const targetParas = db
            .prepare(
                `
        SELECT id, para_index, content
        FROM paragraphs
        WHERE document_id = ? AND role = 'target'
        ORDER BY para_index
        `
            )
            .all(documentId)
            .map((p: any) => ({
                id: `t${p.id}`,
                lineNumber: `t${p.para_index}`,
                text: p.content,
                isFavorite: false,
            }));

        /* =========================
           2. Paragraph Alignments
        ========================= */
        const links = db
            .prepare(
                `
        SELECT *
        FROM para_alignments
        WHERE document_id = ?
        `
            )
            .all(documentId)
            .map((row: any, index: number) => ({
                id: `l${index + 1}`,
                sourceIds: JSON.parse(row.source_para_ids).map(
                    (id: number) => `s${id}`
                ),
                targetIds: JSON.parse(row.target_para_ids).map(
                    (id: number) => `t${id}`
                ),
                confidence: row.confidence,
                strategy: row.strategy,
                isFavorite: false,
            }));

        return {
            sourceParas,
            targetParas,
            links,
        };
    }

    static alignParas(sourceParas, targetParas) {
      return this.gale_church_align(sourceParas, targetParas);
    }

    static gale_church_align(sourceParas, targetParas){
        const S = sourceParas.length;
        const T = targetParas.length;

        const len = (p) => p.text.length;

        // --- Model parameters (tunable) ---
        const VAR_PER_CHAR = 6.8;   // classic Gale–Church constant
        const PRIOR_PENALTY = {
            "1-1": 0,
            "1-2": 1.2,
            "2-1": 1.2,
            "2-2": 2.0,
        };

        // --- Normal distribution negative log likelihood ---
        function gcCost(srcLen, tgtLen) {
            const mean = srcLen;
            const variance = VAR_PER_CHAR * Math.max(srcLen, 1);
            const diff = tgtLen - mean;

            return (diff * diff) / (2 * variance);
        }

        // --- DP tables ---
        const dp = Array.from({ length: S + 1 }, () =>
            Array(T + 1).fill(Infinity)
        );
        const back = Array.from({ length: S + 1 }, () =>
            Array(T + 1).fill(null)
        );

        dp[0][0] = 0;

        // --- DP ---
        for (let i = 0; i <= S; i++) {
            for (let j = 0; j <= T; j++) {
                if (dp[i][j] === Infinity) continue;

                // 1–1
                if (i < S && j < T) {
                    const cost =
                        dp[i][j] +
                        gcCost(len(sourceParas[i]), len(targetParas[j])) +
                        PRIOR_PENALTY["1-1"];
                    if (cost < dp[i + 1][j + 1]) {
                        dp[i + 1][j + 1] = cost;
                        back[i + 1][j + 1] = { type: "1-1" };
                    }
                }

                // 1–2
                if (i < S && j + 1 < T) {
                    const cost =
                        dp[i][j] +
                        gcCost(
                            len(sourceParas[i]),
                            len(targetParas[j]) + len(targetParas[j + 1])
                        ) +
                        PRIOR_PENALTY["1-2"];
                    if (cost < dp[i + 1][j + 2]) {
                        dp[i + 1][j + 2] = cost;
                        back[i + 1][j + 2] = { type: "1-2" };
                    }
                }

                // 2–1
                if (i + 1 < S && j < T) {
                    const cost =
                        dp[i][j] +
                        gcCost(
                            len(sourceParas[i]) + len(sourceParas[i + 1]),
                            len(targetParas[j])
                        ) +
                        PRIOR_PENALTY["2-1"];
                    if (cost < dp[i + 2][j + 1]) {
                        dp[i + 2][j + 1] = cost;
                        back[i + 2][j + 1] = { type: "2-1" };
                    }
                }

                // 2–2
                if (i + 1 < S && j + 1 < T) {
                    const cost =
                        dp[i][j] +
                        gcCost(
                            len(sourceParas[i]) + len(sourceParas[i + 1]),
                            len(targetParas[j]) + len(targetParas[j + 1])
                        ) +
                        PRIOR_PENALTY["2-2"];
                    if (cost < dp[i + 2][j + 2]) {
                        dp[i + 2][j + 2] = cost;
                        back[i + 2][j + 2] = { type: "2-2" };
                    }
                }
            }
        }

        // --- Backtrace ---
        let i = S;
        let j = T;
        const rawAlignments = [];

        while (i > 0 || j > 0) {
            const step = back[i][j];
            if (!step) break;

            rawAlignments.push({ i, j, type: step.type });

            if (step.type === "1-1") {
                i -= 1; j -= 1;
            } else if (step.type === "1-2") {
                i -= 1; j -= 2;
            } else if (step.type === "2-1") {
                i -= 2; j -= 1;
            } else if (step.type === "2-2") {
                i -= 2; j -= 2;
            }
        }

        rawAlignments.reverse();

        // --- Confidence calibration ---
        function calibrate(cost) {
            // Logistic transform of cost
            return 1 / (1 + Math.exp(cost - 1.5));
        }

        // --- Build final output ---
        const results = [];
        let si = 0;
        let ti = 0;

        for (const a of rawAlignments) {
            let sIds = [];
            let tIds = [];

            if (a.type.startsWith("1")) {
                sIds.push(sourceParas[si].id);
            } else {
                sIds.push(sourceParas[si].id, sourceParas[si + 1].id);
            }

            if (a.type.endsWith("1")) {
                tIds.push(targetParas[ti].id);
            } else {
                tIds.push(targetParas[ti].id, targetParas[ti + 1].id);
            }

            const srcLen = sIds.reduce((n, id) => {
                return n + len(sourceParas.find(p => p.id === id));
            }, 0);

            const tgtLen = tIds.reduce((n, id) => {
                return n + len(targetParas.find(p => p.id === id));
            }, 0);

            const cost = gcCost(srcLen, tgtLen);

            results.push({
                sourceParaIds: sIds,
                targetParaIds: tIds,
                confidence: calibrate(cost),
                strategy: `Gale–Church ${a.type}`,
                status: "pending",
            });

            si += sIds.length;
            ti += tIds.length;
        }

        return results;
    }


    // static async alignSentences(sourcePara,
    //                             targetPara,
    //                             srcLang: string,
    //                             tgtLang: string,
    //                             modelId: string,
    //                             documentId,
    //                             sourceParagraphId,
    //                             targetParagraphId
    //                             ) {
    //     return this.alignParagraph(
    //         sourcePara,
    //         targetPara,
    //         srcLang,
    //         tgtLang,
    //         modelId,
    //         documentId,
    //         sourceParagraphId,
    //         targetParagraphId,
    //     );
    // }





    //  static async  alignParagraph(
    //     sourcePara: string,
    //     targetPara: string,
    //     srcLang: string,
    //     tgtLang: string,
    //     modelId: string
    // ): Promise<AlignmentResult> {
    //
    //     const sourceSentences = await this.llmSplitSentences(
    //         sourcePara,
    //         srcLang,
    //         modelId
    //     );
    //
    //     const targetSentences = await this.llmSplitSentences(
    //         targetPara,
    //         tgtLang,
    //         modelId
    //     );
    //
    //     //save to database, with documentID
    //
    //
    //     console.log("source sentences after LLM splitting", sourceSentences);
    //      console.log("target sentences  after LLM splitting", targetSentences);
    //
    //     const alignments = await this.llmAlignSentences(
    //         sourceSentences,
    //         targetSentences,
    //         srcLang,
    //         tgtLang,
    //         modelId
    //     );
    //
    //     if (alignments) {
    //         return {
    //             sourceSentences,
    //             targetSentences,
    //             alignments,
    //             strategy: "llm",
    //         };
    //     }
    //
    //     return {
    //         sourceSentences,
    //         targetSentences,
    //         alignments: this.galeChurchAlign(
    //             sourceSentences,
    //             targetSentences
    //         ),
    //         strategy: "gale-church",
    //     };
    // }

    // static async alignParagraph(
    //     sourcePara: string,
    //     targetPara: string,
    //     srcLang: string,
    //     tgtLang: string,
    //     modelId: string,
    //     documentId: string,
    //     sourceParagraphId: string,
    //     targetParagraphId: string,
    //     sourceLines: Line[],
    //     targetLines: Line[],
    // ): Promise<AlignmentResult> {
    //     // Split sentences using LLM
    //     const sourceSentences = await this.llmSplitSentences(
    //         sourcePara,
    //         srcLang,
    //         modelId
    //     );
    //
    //     const targetSentences = await this.llmSplitSentences(
    //         targetPara,
    //         tgtLang,
    //         modelId
    //     );
    //
    //     console.log('Source sentences after LLM splitting:', sourceSentences);
    //     console.log('Target sentences after LLM splitting:', targetSentences);
    //
    //     // Map sentences back to original line IDs
    //     const sourceSentencesWithLineIds = this.mapSentencesToLines(
    //         sourceSentences,
    //         sourceLines
    //     );
    //     const targetSentencesWithLineIds = this.mapSentencesToLines(
    //         targetSentences,
    //         targetLines
    //     );
    //
    //     // Save sentences to database
    //     const { sourceKeys, targetKeys } = await this.saveSentences(
    //         documentId,
    //         sourceParagraphId,
    //         targetParagraphId,
    //         sourceSentencesWithLineIds,
    //         targetSentencesWithLineIds,
    //     );
    //
    //     console.log('Saved sentences with keys:', { sourceKeys, targetKeys });
    //
    //     // Perform alignment
    //     let alignments: Alignment[];
    //     let strategy: 'llm' | 'gale-church';
    //
    //     const llmAlignments = await this.llmAlignSentences(
    //         sourceSentences,
    //         targetSentences,
    //         srcLang,
    //         tgtLang,
    //         modelId
    //     );
    //
    //     if (llmAlignments && llmAlignments.length > 0) {
    //         alignments = llmAlignments;
    //         strategy = 'llm';
    //     } else {
    //         alignments = this.galeChurchAlign(sourceSentences, targetSentences);
    //         strategy = 'gale-church';
    //     }
    //
    //     // Save alignments to database
    //     await this.saveAlignments(
    //         documentId,
    //         sourceParagraphId,
    //         targetParagraphId,
    //         alignments,
    //         sourceKeys,
    //         targetKeys,
    //         strategy
    //     );
    //
    //     console.log(`Saved ${alignments.length} alignments using ${strategy} strategy`);
    //
    //     return {
    //         sourceSentences: sourceSentencesWithLineIds,
    //         targetSentences: targetSentencesWithLineIds,
    //         alignments,
    //         strategy,
    //     };
    // }


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
    ): Promise<any> {
        // Split sentences using LLM - returns Sentence[] with just text
        const sourceSentencesRaw = await this.llmSplitSentences(
            sourcePara,
            srcLang,
        );

        const targetSentencesRaw = await this.llmSplitSentences(
            targetPara,
            tgtLang,
        );

        console.log('Source sentences after LLM splitting:', sourceSentencesRaw);
        console.log('Target sentences after LLM splitting:', targetSentencesRaw);

        // Map sentences back to original line IDs and assign proper IDs
        const sourceSentences = this.mapSentencesToLines(
            sourceSentencesRaw,
            sourceLines
        );
        const targetSentences = this.mapSentencesToLines(
            targetSentencesRaw,
            targetLines
        );

        console.log("source after mapping", sourceSentences);
        console.log("target after mapping", targetSentences);

        // Save sentences to database
        const { sourceKeys, targetKeys } = await this.saveSentences(
            documentId,
            sourceParagraphId,
            targetParagraphId,
            sourceSentences,
            targetSentences,
        );

        console.log('Saved sentences with keys:', { sourceKeys, targetKeys });

        // Perform alignment (extract just text for alignment algorithms)
        let alignments: Alignment[];
        let strategy: 'llm' | 'gale-church';

        const llmAlignments = await this.llmAlignSentences(
            sourceSentences,
            targetSentences,
            srcLang,
            tgtLang,
        );

        if (llmAlignments && llmAlignments.length > 0) {
            alignments = llmAlignments;
            strategy = 'llm';
        } else {
            alignments = this.galeChurchAlign(
                sourceSentences,
                targetSentences
            );
            strategy = 'gale-church';
        }

        console.log("alignments results", alignments);

        // Save alignments to database
        await this.saveAlignments(
            documentId,
            sourceParagraphId,
            targetParagraphId,
            alignments,
            sourceKeys,
            targetKeys,
            strategy
        );

        console.log(`Saved ${alignments.length} alignments using ${strategy} strategy`);

        return {
            sourceSentences,
            targetSentences,
            alignments,
            strategy,
        };
    }

// Helper method to map sentences back to their original line IDs
// and assign IDs in format: lineId-sentenceIndex
    static mapSentencesToLines(sentences: Sentence[], lines: Line[]): Sentence[] {
        const fullText = lines.map(line => line.text).join("\n");
        let currentPosition = 0;

        return sentences.map((sentence, sentenceIndex) => {
            const sentenceStart = fullText.indexOf(sentence.text, currentPosition);
            const sentenceEnd = sentenceStart + sentence.text.length;
            currentPosition = sentenceEnd;

            // Find which lines this sentence spans
            let charCount = 0;
            const lineIds = [];

            for (const line of lines) {
                const lineStart = charCount;
                const lineEnd = charCount + line.text.length + 1; // +1 for newline

                // Check if sentence overlaps with this line
                if (sentenceStart < lineEnd && sentenceEnd > lineStart) {
                    lineIds.push(line.lineNumber);
                }

                charCount = lineEnd;
                if (charCount > sentenceEnd) break;
            }

            // Use the first line ID as the primary line for this sentence
            // Format: lineId-sentenceIndex
            const primaryLineId = lineIds[0] || lines[0]?.lineNumber || 'unknown';

            return {
                id: `${primaryLineId}-s${sentenceIndex}`,
                text: sentence.text,
            };
        });
    }
    static  galeChurchAlign(
        source: Sentence[],
        target: Sentence[]
    ): Alignment[] {
        const alignments: Alignment[] = [];

        let i = 0;
        let j = 0;

        while (i < source.length && j < target.length) {
            alignments.push({
                sourceIds: [source[i].id],
                targetIds: [target[j].id],
                confidence: 0.6,
                explanation: "Length-based fallback alignment",
            });
            i++;
            j++;
        }

        return alignments;
    }

   static  async  llmSplitSentences(
        paragraph: string,
        language: string,
    ): Promise<Sentence[]> {
       const prompts = listPrompts();
        const { system, user } = await buildSplitPromptFromDB(paragraph, language, prompts);
        console.log(system, user);

        const result = await llmCallWithRetry<{ sentences: Sentence[] }>(
            async () => {
                const res = await sendChatCompletion({
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: user },
                    ],
                });
                return res.content;
            }
        );

        if (!result) {
            throw new Error("Sentence splitting failed");
        }

        return result.sentences;
    }

    static  async llmAlignSentences(
        source: Sentence[],
        target: Sentence[],
        srcLang: string,
        tgtLang: string,
    ): Promise<Alignment[] | null> {
        const prompts = listPrompts();
        const { system, user } = await buildAlignmentPromptFromDB(
            srcLang,
            tgtLang,
            source,
            target,
            prompts
        );

        const result = await llmCallWithRetry<{ alignments: Alignment[] }>(
            async () => {
                const res = await sendChatCompletion({
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: user },
                    ],
                    temperature: 0.1,
                });
                return res.content;
            }
        );

        return result?.alignments ?? null;
    }


    static async alignParagraphBatch(
        pairs: {
            sourceId: string;
            targetId: string;
            sourceLines: Line[];
            targetLines: Line[];
        }[],
        srcLang: string,
        tgtLang: string,
        documentId: string,
    ) {
        console.log("align doc with id", documentId);
        const results: AlignmentResult[] = [];

        for (const pair of pairs) {
            // Join lines to create paragraph text
            const sourceText = pair.sourceLines.map(line => line.text).join("\n");
            const targetText = pair.targetLines.map(line => line.text).join("\n");

            results.push(
                await this.alignParagraph(
                    sourceText,
                    targetText,
                    srcLang,
                    tgtLang,
                    documentId,
                    pair.sourceId,
                    pair.targetId,
                    pair.sourceLines,
                    pair.targetLines,
                )
            );
        }



        return results;
    }

    static generateSentenceKey(paragraphId: string, sentenceIndex: number): string {
        return `${paragraphId}-s${sentenceIndex}`;
    }

    /**
     * Save sentences to database
     */
    static  async saveSentences(
        documentId: string,
        sourceParagraphIds: string,
        targetParagraphIds: string,
        sourceSentences: Sentence[],
        targetSentences: Sentence[]
    ): Promise<{
        sourceKeys: string[];
        targetKeys: string[];
    }> {
        const insertStmt = db.prepare(`
      INSERT INTO document_sentences 
        (document_id, paragraph_id, side, sentence_index, sentence_key, text)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        const sourceKeys: string[] = [];
        const targetKeys: string[] = [];

        // Use transaction for better performance
        const saveAll = db.transaction(() => {
            // Save source sentences
            sourceSentences.forEach((sent, index) => {
                const sentenceKey = this.generateSentenceKey(sourceParagraphIds, index);
                insertStmt.run(
                    documentId,
                    sourceParagraphIds,
                    'source',
                    index,
                    sentenceKey,
                    sent.text
                );
                sourceKeys.push(sentenceKey);
            });

            // Save target sentences
            targetSentences.forEach((sent, index) => {
                const sentenceKey = this.generateSentenceKey(targetParagraphIds, index);
                insertStmt.run(
                    documentId,
                    targetParagraphIds,
                    'target',
                    index,
                    sentenceKey,
                    sent.text
                );
                targetKeys.push(sentenceKey);
            });
        });

        saveAll();

        return { sourceKeys, targetKeys };
    }

    /**
     * Save alignment links to database
     */
    static async saveAlignments(
        documentId: string,
        sourceParagraphId: string,
        targetParagraphId: string,
        alignments: Alignment[],
        sourceKeys: string[],
        targetKeys: string[],
        strategy: string
    ): Promise<void> {
        const insertStmt = db.prepare(`
      INSERT INTO sentence_alignments 
        (document_id, source_paragraph_id, target_paragraph_id, 
         source_sentence_keys, target_sentence_keys, confidence, explanation, strategy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        strategy = "";

        const saveAll = db.transaction(() => {
            alignments.forEach((alignment) => {
                // Map indices to sentence keys
                // const sourceSentenceKeys = alignment.sourceIds.map(idx => sourceKeys[idx]);
                // const targetSentenceKeys = alignment.targetIds.map(idx => targetKeys[idx]);

                insertStmt.run(
                    documentId,
                    sourceParagraphId,
                    targetParagraphId,
                    JSON.stringify(alignment.sourceIds),
                    JSON.stringify(alignment.targetIds),
                    alignment.confidence || null,
                    alignment.explanation || null,
                    strategy
                );
            });
        });

        saveAll();
    }

    /**
     * Retrieve sentences for a specific paragraph
     */
    static getSentencesByParagraph(paragraphId: number, side: 'source' | 'target'): SentenceRecord[] {
        const stmt = db.prepare(`
      SELECT * FROM document_sentences
      WHERE paragraph_id = ? AND side = ?
      ORDER BY sentence_index ASC
    `);

        return stmt.all(paragraphId, side) as SentenceRecord[];
    }

    /**
     * Retrieve sentences for both paragraphs
     */
    static getSentencesForAlignment(
        sourceParagraphId: number,
        targetParagraphId: number
    ): {
        source: SentenceRecord[];
        target: SentenceRecord[];
    } {
        return {
            source: this.getSentencesByParagraph(sourceParagraphId, 'source'),
            target: this.getSentencesByParagraph(targetParagraphId, 'target')
        };
    }

    /**
     * Retrieve alignments for a paragraph pair
     */
    static getAlignments(
        sourceParagraphId: number,
        targetParagraphId: number
    ): AlignmentRecord[] {
        const stmt = db.prepare(`
      SELECT * FROM sentence_alignments
      WHERE source_paragraph_id = ? AND target_paragraph_id = ?
      ORDER BY id ASC
    `);

        return stmt.all(sourceParagraphId, targetParagraphId) as AlignmentRecord[];
    }

    /**
     * Get all alignments for a document
     */
    static getDocumentAlignments(documentId: number): AlignmentRecord[] {
        const stmt = db.prepare(`
      SELECT * FROM sentence_alignments
      WHERE document_id = ?
      ORDER BY id ASC
    `);

        return stmt.all(documentId) as AlignmentRecord[];
    }

    /**
     * Delete sentences for a specific paragraph
     */
    static   deleteParagraphSentences(paragraphId: number, side: 'source' | 'target'): void {
        db.prepare(`
      DELETE FROM document_sentences
      WHERE paragraph_id = ? AND side = ?
    `).run(paragraphId, side);
    }

    /**
     * Delete alignments for a paragraph pair
     */
    static deleteAlignments(sourceParagraphId: number, targetParagraphId: number): void {
        db.prepare(`
      DELETE FROM sentence_alignments
      WHERE source_paragraph_id = ? AND target_paragraph_id = ?
    `).run(sourceParagraphId, targetParagraphId);
    }

    /**
     * Delete all data for a paragraph pair
     */
    static deleteParagraphPairData(
        sourceParagraphId: number,
        targetParagraphId: number
    ): void {
        const deleteTransaction = db.transaction(() => {
            // Delete alignments first
            this.deleteAlignments(sourceParagraphId, targetParagraphId);

            // Delete sentences
            this.deleteParagraphSentences(sourceParagraphId, 'source');
            this.deleteParagraphSentences(targetParagraphId, 'target');
        });

        deleteTransaction();
    }

    /**
     * Get sentence by key
     */
    static getSentenceByKey(sentenceKey: string): SentenceRecord | undefined {
        const stmt = db.prepare(`
      SELECT * FROM document_sentences
      WHERE sentence_key = ?
    `);

        return stmt.get(sentenceKey) as SentenceRecord | undefined;
    }

    /**
     * Get multiple sentences by keys
     */
    static getSentencesByKeys(sentenceKeys: string[]): SentenceRecord[] {
        if (sentenceKeys.length === 0) return [];

        const placeholders = sentenceKeys.map(() => '?').join(',');
        const stmt = db.prepare(`
      SELECT * FROM document_sentences
      WHERE sentence_key IN (${placeholders})
      ORDER BY sentence_index ASC
    `);

        return stmt.all(...sentenceKeys) as SentenceRecord[];
    }


}


