import { ipcMain } from "electron";
import {AlignmentService} from "../renderer/services/alignservice";
import {splitIntoParagraphs} from "../utils/AlignUtils";
import {saveParaAlignments, saveParagraphs} from "../db/paragraphs";
import {v4 as uuidv4} from "uuid";
import {db} from "../db/db";
import {Link, LLMSettings} from "../types/alignment";
import {getLLMSettings, loadDefaultModel, saveLLMSettings} from "../db/llmSettings";


ipcMain.handle("align:paragraphs", async (_, payload) => {

    const { documentId, sourceText, targetText } = payload;
    const tx = db.transaction(() => {
        /* --------------------------------
           1. Update document status FIRST
        --------------------------------- */
        db.prepare(`
          UPDATE documents
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run("pending-para", documentId);

        /* --------------------------------
           2. Split paragraphs
        --------------------------------- */
        const sourceParas = splitIntoParagraphs(sourceText);
        const targetParas = splitIntoParagraphs(targetText);

        const sourceIndexToId = saveParagraphs(
            documentId, "source", sourceParas
        );
        const targetIndexToId = saveParagraphs(
            documentId, "target", targetParas
        );

        // 4️⃣ Align (INDEX-BASED)
        const paraLinks = AlignmentService.alignParas(
            sourceParas,
            targetParas
        );

        // 5️⃣ Save alignments (INDEX + DB IDs)
        saveParaAlignments(
            documentId,
            paraLinks,
            sourceIndexToId,
            targetIndexToId
        );

        return paraLinks.length;
    });

    const alignmentCount = tx();

    return {
        status: "pending-para",
        alignmentCount,
    };
});


ipcMain.handle("alignment:getState", (_e, documentId: number) => {
    return AlignmentService.getAppState(documentId);
});


// Save a new align task
ipcMain.handle("aligner:saveTask", async (_event, payload) => {
    try {
        const projectId = uuidv4();

        const stmt = db.prepare(`
            INSERT INTO align_tasks 
            (uuid, title, source_language, target_language, domain, source_text, target_text)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            projectId,
            payload.sourceMeta.title,
            payload.sourceMeta.language,
            payload.targetMeta.language,
            payload.sourceMeta.domain || "",
            payload.sourceText,
            payload.targetText
        );

        // Return saved project ID
        return { success: true, projectId };
    } catch (err) {
        console.error("Failed to save align task:", err);
        return { success: false, error: (err as Error).message };
    }
});

// Fetch all align tasks
ipcMain.handle("aligner:getTasks", async () => {
    try {
        const rows = db.prepare(`SELECT * FROM align_tasks ORDER BY created_at DESC`).all();
        return { success: true, tasks: rows };
    } catch (err) {
        console.error(err);
        return { success: false, error: (err as Error).message };
    }
});


ipcMain.handle(
    "alignment:getParaState",
    (_event, documentId: number) => {

        /* -----------------------------
           1. Load paragraphs
        ------------------------------ */
        const paras = db.prepare(`
      SELECT id, side, para_index, text, isFavorite, comment 
      FROM document_paragraphs
      WHERE document_id = ?
      ORDER BY side, para_index
    `).all(documentId);

        const sourceLines = [];
        const targetLines = [];

        for (const p of paras) {
            const line = {
                id: `${p.side[0]}${p.id}`,         // s12 / t9
                lineNumber: `${p.side[0]}p${p.para_index}`,
                text: p.text,
                isFavorite: p.isFavorite,
                comment: p.comment,
            };

            if (p.side === "source") sourceLines.push(line);
            else targetLines.push(line);
        }

        /* -----------------------------
           2. Load alignments
        ------------------------------ */
        const alignments = db.prepare(`
      SELECT *
      FROM paragraph_alignments
      WHERE document_id = ?
      ORDER BY id
    `).all(documentId);

        const links = alignments.map((a) => ({
            id: `${a.id}`,
            sourceIds: JSON.parse(a.source_para_ids).map(
                (pid: string) => `${pid}`
            ),
            targetIds: JSON.parse(a.target_para_ids).map(
                (pid: string) => `${pid}`
            ),
            confidence: a.confidence,
            strategy: a.strategy ?? "",
            isFavorite: a.isFavorite,
            comment: a.comment,
        }));




        /* -----------------------------
      3. Load metadata
   ------------------------------ */
        const rawMetas = db.prepare(`
      SELECT *
      FROM document_metadata
      WHERE document_id = ?
    `).all(documentId);

        const parseMeta = (row: any) => {
            if (!row) return null;

            return {
                id: row.id,
                title: row.title,
                source: row.source,
                publisher: row.publisher,
                documentType: row.documentType,
                publishDate: row.publish_date,

                language: row.language,
                originalLanguage: row.original_language,
                domain: row.domain,

                authors: row.authors ? JSON.parse(row.authors) : [],
                translators: row.translators ? JSON.parse(row.translators) : [],
                editors: row.editors ? JSON.parse(row.editors) : [],
                contributors: row.contributors ? JSON.parse(row.contributors) : [],

                doi: row.doi,
                isbn: row.isbn,
                volume: row.volume,
                issue: row.issue,
                pageRange: row.page_range,
                edition: row.edition,

                url: row.url,
                country: row.country,

                copyrightHolder: row.copyright_holder,
                license: row.license,
                accessLevel: row.access_level,

                keywords: row.keywords ? JSON.parse(row.keywords) : [],
                notes: row.notes,

                createdAt: row.created_at,
                updatedAt: row.updated_at,
            };
        };

        const sourceMeta = parseMeta(
            rawMetas.find((m: any) => m.metadata_type === "source")
        );

        const targetMeta = parseMeta(
            rawMetas.find((m: any) => m.metadata_type === "target")
        );

        // console.log("align state", sourceLines, targetLines, links);
        /* -----------------------------
           3. Final state
        ------------------------------ */
        return {
            sourceLines,
            targetLines,
            links,
            sourceMeta,
            targetMeta,
        };
    }
);


function compareSentenceKey(a: string, b: string) {
    const parse = (key: string) => {
        // sp1-s0 → side=s, para=1, sent=0
        const match = key.match(/^([st])p(\d+)-s(\d+)$/);
        if (!match) return { para: 0, sent: 0 };

        return {
            para: Number(match[2]),
            sent: Number(match[3]),
        };
    };

    const A = parse(a);
    const B = parse(b);

    if (A.para !== B.para) return A.para - B.para;
    return A.sent - B.sent;
}



ipcMain.handle(
    "alignment:getAlignState",
    (_event, documentId: number, alignmentType: string) => {
        if (alignmentType == "para") {

            /* -----------------------------
               1. Load paragraphs
            ------------------------------ */
            const paras = db.prepare(`
      SELECT id, side, para_index, text, isFavorite, comment 
      FROM document_paragraphs
      WHERE document_id = ?
      ORDER BY side, para_index
    `).all(documentId);

            const sourceLines = [];
            const targetLines = [];

            for (const p of paras) {
                const line = {
                    id: `${p.side[0]}${p.id}`,         // s12 / t9
                    lineNumber: `${p.side[0]}p${p.para_index}`,
                    text: p.text,
                    isFavorite: p.isFavorite,
                    comment: p.comment,
                };

                if (p.side === "source") sourceLines.push(line);
                else targetLines.push(line);
            }

            /* -----------------------------
               2. Load alignments
            ------------------------------ */
            const alignments = db.prepare(`
      SELECT *
      FROM paragraph_alignments
      WHERE document_id = ?
      ORDER BY id
    `).all(documentId);

            const links = alignments.map((a) => ({
                id: `${a.id}`,
                sourceIds: JSON.parse(a.source_para_ids).map(
                    (pid: string) => `${pid}`
                ),
                targetIds: JSON.parse(a.target_para_ids).map(
                    (pid: string) => `${pid}`
                ),
                confidence: a.confidence,
                strategy: a.strategy ?? "",
                isFavorite: a.isFavorite,
                comment: a.comment,
            }));


            /* -----------------------------
          3. Load metadata
       ------------------------------ */
            const rawMetas = db.prepare(`
      SELECT *
      FROM document_metadata
      WHERE document_id = ?
    `).all(documentId);

            const parseMeta = (row: any) => {
                if (!row) return null;

                return {
                    id: row.id,
                    title: row.title,
                    source: row.source,
                    publisher: row.publisher,
                    documentType: row.documentType,
                    publishDate: row.publish_date,

                    language: row.language,
                    originalLanguage: row.original_language,
                    domain: row.domain,

                    authors: row.authors ? JSON.parse(row.authors) : [],
                    translators: row.translators ? JSON.parse(row.translators) : [],
                    editors: row.editors ? JSON.parse(row.editors) : [],
                    contributors: row.contributors ? JSON.parse(row.contributors) : [],

                    doi: row.doi,
                    isbn: row.isbn,
                    volume: row.volume,
                    issue: row.issue,
                    pageRange: row.page_range,
                    edition: row.edition,

                    url: row.url,
                    country: row.country,

                    copyrightHolder: row.copyright_holder,
                    license: row.license,
                    accessLevel: row.access_level,

                    keywords: row.keywords ? JSON.parse(row.keywords) : [],
                    notes: row.notes,

                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                };
            };

            const sourceMeta = parseMeta(
                rawMetas.find((m: any) => m.metadata_type === "source")
            );

            const targetMeta = parseMeta(
                rawMetas.find((m: any) => m.metadata_type === "target")
            );

            // console.log("align state", sourceLines, targetLines, links);
            /* -----------------------------
               3. Final state
            ------------------------------ */
            sourceLines.sort((a, b) =>
                compareSentenceKey(a.lineNumber, b.lineNumber)
            );

            targetLines.sort((a, b) =>
                compareSentenceKey(a.lineNumber, b.lineNumber)
            );
            return {
                sourceLines,
                targetLines,
                links,
                sourceMeta,
                targetMeta,
            };
        }
        else{
            /* -----------------------------
             1. Load paragraphs
          ------------------------------ */
            const sents = db.prepare(`
      SELECT id, side, sentence_index, sentence_key, text, isFavorite, comment 
      FROM document_sentences
      WHERE document_id = ?
      ORDER BY side, sentence_index
    `).all(documentId);

            let sourceLines = [];
            let targetLines = [];

            for (const p of sents) {
                const line = {
                    id: p.sentence_key,         // s12 / t9
                    lineNumber: p.sentence_key,
                    text: p.text,
                    isFavorite: p.isFavorite,
                    comment: p.comment,
                };

                if (p.side === "source") sourceLines.push(line);
                else targetLines.push(line);
            }

            /* -----------------------------
               2. Load alignments
            ------------------------------ */
            const alignments = db.prepare(`
                  SELECT *
                  FROM sentence_alignments
                  WHERE document_id = ?
                  ORDER BY id
                `).all(documentId);

            const links = alignments.map((a) => ({
                id: `${a.id}`,
                sourceIds: JSON.parse(a.source_sentence_keys).map(
                    (pid: string) => `${pid}`
                ),
                targetIds: JSON.parse(a.target_sentence_keys).map(
                    (pid: string) => `${pid}`
                ),
                confidence: a.confidence,
                strategy: a.strategy ?? "",
                isFavorite: a.isFavorite,
                comment: a.comment,
            }));


            /* -----------------------------
          3. Load metadata
       ------------------------------ */
            const rawMetas = db.prepare(`
      SELECT *
      FROM document_metadata
      WHERE document_id = ?
    `).all(documentId);

            const parseMeta = (row: any) => {
                if (!row) return null;

                return {
                    id: row.id,
                    title: row.title,
                    source: row.source,
                    publisher: row.publisher,
                    documentType: row.documentType,
                    publishDate: row.publish_date,

                    language: row.language,
                    originalLanguage: row.original_language,
                    domain: row.domain,

                    authors: row.authors ? JSON.parse(row.authors) : [],
                    translators: row.translators ? JSON.parse(row.translators) : [],
                    editors: row.editors ? JSON.parse(row.editors) : [],
                    contributors: row.contributors ? JSON.parse(row.contributors) : [],

                    doi: row.doi,
                    isbn: row.isbn,
                    volume: row.volume,
                    issue: row.issue,
                    pageRange: row.page_range,
                    edition: row.edition,

                    url: row.url,
                    country: row.country,

                    copyrightHolder: row.copyright_holder,
                    license: row.license,
                    accessLevel: row.access_level,

                    keywords: row.keywords ? JSON.parse(row.keywords) : [],
                    notes: row.notes,

                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                };
            };

            const sourceMeta = parseMeta(
                rawMetas.find((m: any) => m.metadata_type === "source")
            );

            const targetMeta = parseMeta(
                rawMetas.find((m: any) => m.metadata_type === "target")
            );


            /* -----------------------------
               3. Final state
            ------------------------------ */
            sourceLines = sourceLines.sort((a, b) =>
                compareSentenceKey(a.lineNumber, b.lineNumber)
            );

            targetLines = targetLines.sort((a, b) =>
                compareSentenceKey(a.lineNumber, b.lineNumber)
            );
            console.log("align state", sourceLines, targetLines, links);
            return {
                sourceLines,
                targetLines,
                links,
                sourceMeta,
                targetMeta,
            };
        }
    }
);


ipcMain.handle(
    "alignment:saveHistoryState",
    (_event, documentId: number, state: any, action = "edit", alignmentType) => {
        if(alignmentType == "para") {
            const tx = db.transaction(() => {

                /* -----------------------------
                   1. Determine next version
                ------------------------------ */
                const {maxVersion} = db.prepare(`
        SELECT MAX(version) AS maxVersion
        FROM document_sentalign_history
        WHERE document_id = ?
      `).get(documentId) ?? {maxVersion: -1};

                const version = (maxVersion ?? -1) + 1;

                /* -----------------------------
                   2. Insert history snapshot
                ------------------------------ */
                db.prepare(`
        INSERT INTO document_sentalign_history
          (document_id, version, snapshot, action)
        VALUES (?, ?, ?, ?)
      `).run(
                    documentId,
                    version,
                    JSON.stringify(state),
                    action
                );

                if (action === 'init') {

                } else {
                    persistParagraphs(documentId, state.sourceLines, "source");
                    persistParagraphs(documentId, state.targetLines, "target");

                    /* -----------------------------
                       5. Persist CURRENT alignments
                    ------------------------------ */
                    persistAlignments(documentId, state.links, alignmentType);
                }
            });

            tx();
            return {ok: true};
        }else{
            const tx = db.transaction(() => {

                /* -----------------------------
                   1. Determine next version
                ------------------------------ */
                const {maxVersion} = db.prepare(`
        SELECT MAX(version) AS maxVersion
        FROM document_sentalign_history
        WHERE document_id = ?
      `).get(documentId) ?? {maxVersion: -1};

                const version = (maxVersion ?? -1) + 1;

                /* -----------------------------
                   2. Insert history snapshot
                ------------------------------ */
                db.prepare(`
        INSERT INTO document_sentalign_history
          (document_id, version, snapshot, action)
        VALUES (?, ?, ?, ?)
      `).run(
                    documentId,
                    version,
                    JSON.stringify(state),
                    action
                );

                if (action === 'init') {

                } else {
                    console.log("start persist sent", state)
                    persistSentences(documentId, state.sourceLines, "source");
                    persistSentences(documentId, state.targetLines, "target");
                    console.log("start persist links")
                    /* -----------------------------
                       5. Persist CURRENT alignments
                    ------------------------------ */
                    persistAlignments(documentId, state.links, "sent");
                }
            });

            tx();
            return {ok: true};
        }
    }
);

function upsertMetadata(
    documentId: number,
    type: "source" | "target",
    meta: any
) {
    if (!meta) return;

    db.prepare(`
    INSERT INTO document_metadata (
      document_id, metadata_type,
      title, source, publisher, documentType, publish_date,
      language, original_language, domain,
      authors, translators, editors, contributors,
      doi, isbn, volume, issue, page_range, edition,
      url, country,
      copyright_holder, license, access_level,
      keywords, notes,
      updated_at
    )
    VALUES (
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(document_id, metadata_type)
    DO UPDATE SET
      title=excluded.title,
      source=excluded.source,
      publisher=excluded.publisher,
      documentType=excluded.documentType,
      publish_date=excluded.publish_date,
      language=excluded.language,
      original_language=excluded.original_language,
      domain=excluded.domain,
      authors=excluded.authors,
      translators=excluded.translators,
      editors=excluded.editors,
      contributors=excluded.contributors,
      doi=excluded.doi,
      isbn=excluded.isbn,
      volume=excluded.volume,
      issue=excluded.issue,
      page_range=excluded.page_range,
      edition=excluded.edition,
      url=excluded.url,
      country=excluded.country,
      copyright_holder=excluded.copyright_holder,
      license=excluded.license,
      access_level=excluded.access_level,
      keywords=excluded.keywords,
      notes=excluded.notes,
      updated_at=CURRENT_TIMESTAMP
  `).run(
        documentId,
        type,
        meta.title,
        meta.source,
        meta.publisher,
        meta.documentType,
        meta.publishDate,
        meta.language,
        meta.originalLanguage,
        meta.domain,
        JSON.stringify(meta.authors ?? []),
        JSON.stringify(meta.translators ?? []),
        JSON.stringify(meta.editors ?? []),
        JSON.stringify(meta.contributors ?? []),
        meta.doi,
        meta.isbn,
        meta.volume,
        meta.issue,
        meta.pageRange,
        meta.edition,
        meta.url,
        meta.country,
        meta.copyrightHolder,
        meta.license,
        meta.accessLevel,
        JSON.stringify(meta.keywords ?? []),
        meta.notes
    );
}

function persistParagraphs(
    documentId: number,
    lines: any[],
    side: "source" | "target"
) {
    db.prepare(`
    DELETE FROM document_paragraphs
    WHERE document_id = ? AND side = ?
  `).run(documentId, side);

    const stmt = db.prepare(`
    INSERT INTO document_paragraphs
      (document_id, side, para_index, text, comment, isFavorite)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        stmt.run(
            documentId,
            side,
            i,
            l.text,
            l.comment ?? null,
            l.isFavorite ? 1 : 0
        );
    }
}




function persistSentences(
    documentId: number,
    lines: any[],
    side: "source" | "target"
) {
    db.prepare(`
    DELETE FROM document_sentences
    WHERE document_id = ? AND side = ?
  `).run(documentId, side);

    const stmt = db.prepare(`
    INSERT INTO document_sentences
      (document_id, paragraph_id, side, sentence_index, sentence_key, text, comment, isFavorite)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        stmt.run(
            documentId,
            l.paragraph_id,
            side,
            i,
            l.lineNumber,
            l.text,
            l.comment ?? null,
            l.isFavorite ? 1 : 0
        );
    }
}

function persistAlignments(documentId: number, links: any[], documentType) {
    console.log("persist alignment", documentId, links, documentType)

  //   db.prepare(`
  //   DELETE FROM paragraph_alignments
  //   WHERE document_id = ?
  // `).run(documentId);

    if(documentType == "para") {
        db.prepare(`
    DELETE FROM paragraph_alignments
    WHERE document_id = ? 
  `).run(documentId);

        const stmt = db.prepare(`
    INSERT INTO paragraph_alignments (
      document_id,
      source_indices,
      target_indices,
      source_para_ids,
      target_para_ids,
      source_count,
      target_count,
      confidence,
      strategy,
      status,
      comment,
      isFavorite
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

        for (const l of links) {
            stmt.run(
                documentId,
                JSON.stringify(l.sourceIndices ?? []),
                JSON.stringify(l.targetIndices ?? []),
                JSON.stringify(l.sourceIds),
                JSON.stringify(l.targetIds),
                l.sourceIds.length,
                l.targetIds.length,
                l.confidence,
                l.strategy,
                l.status ?? "pending",
                l.comment ?? null,
                l.isFavorite ? 1 : 0
            );
        }
    }else{
        db.prepare(`
    DELETE FROM sentence_alignments
    WHERE document_id = ? 
  `).run(documentId);

        const stmt = db.prepare(`
  INSERT INTO sentence_alignments (
    document_id,
    paragraph_alignment_id,
    source_paragraph_id,
    target_paragraph_id,
    source_sentence_keys,
    target_sentence_keys,
    source_count,
    target_count,
    confidence,
    strategy,
    status,
    comment,
    explanation,
    isFavorite
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
        const safe = (v) => (v === undefined ? null : v);
        for (const alignment of links) {
            console.log("sent alignment", alignment);
            if(alignment.source_sentence_keys == null || alignment.source_sentence_keys.length == 0){
                alignment.source_sentence_keys = alignment.sourceIds;
                alignment.target_sentence_keys = alignment.targetIds;
            }
            stmt.run(
                documentId,
                safe(alignment.paragraphAlignmentId),
                JSON.stringify(alignment.sourceIds ?? []),
                JSON.stringify(alignment.targetIds ?? []),
                JSON.stringify(alignment.source_sentence_keys ?? []),
                JSON.stringify(alignment.target_sentence_keys ?? []),
                (alignment.source_sentence_keys ?? []).length,
                (alignment.target_sentence_keys ?? []).length,
                safe(alignment.confidence),
                safe(alignment.strategy),
                safe(alignment.status ?? "pending"),
                safe(alignment.comment),
                safe(alignment.explanation),
                alignment.isFavorite ? 1 : 0
            );
        }
    }
}
ipcMain.handle(
    "update-document-metadata",
    async (_event, { documentId, sourceMeta, targetMeta }) => {
        if (!documentId) throw new Error("documentId required");

        const upsert = (metadataType: "source" | "target", meta: any) => {
            // Convert arrays to JSON strings if needed
            const convertJson = (value: any) =>
                Array.isArray(value) ? JSON.stringify(value) : value;

            db.prepare(`
        INSERT INTO document_metadata (
          document_id,
          metadata_type,
          title,
          source,
          publisher,
          documentType,
          publish_date,
          language,
          original_language,
          domain,
          authors,
          translators,
          editors,
          contributors,
          doi,
          isbn,
          volume,
          issue,
          page_range,
          edition,
          url,
          country,
          copyright_holder,
          license,
          access_level,
          keywords,
          notes,
          created_at,
          updated_at
        ) VALUES (
          @document_id, @metadata_type, @title, @source, @publisher, @documentType, @publish_date,
          @language, @original_language, @domain, @authors, @translators, @editors,
          @contributors, @doi, @isbn, @volume, @issue, @page_range, @edition,
          @url, @country, @copyright_holder, @license, @access_level,
          @keywords, @notes,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT(document_id, metadata_type)
        DO UPDATE SET
          title = excluded.title,
          source = excluded.source,
          publisher = excluded.publisher,
          documentType = excluded.documentType,
          publish_date = excluded.publish_date,
          language = excluded.language,
          original_language = excluded.original_language,
          domain = excluded.domain,
          authors = excluded.authors,
          translators = excluded.translators,
          editors = excluded.editors,
          contributors = excluded.contributors,
          doi = excluded.doi,
          isbn = excluded.isbn,
          volume = excluded.volume,
          issue = excluded.issue,
          page_range = excluded.page_range,
          edition = excluded.edition,
          url = excluded.url,
          country = excluded.country,
          copyright_holder = excluded.copyright_holder,
          license = excluded.license,
          access_level = excluded.access_level,
          keywords = excluded.keywords,
          notes = excluded.notes,
          updated_at = CURRENT_TIMESTAMP
      `).run({
                document_id: documentId,
                metadata_type: metadataType,
                title: meta.title || null,
                source: meta.source || null,
                publisher: meta.publisher || null,
                documentType: meta.documentType || null,
                publish_date: meta.publish_date || null,
                language: meta.language || null,
                original_language: meta.original_language || null,
                domain: meta.domain || null,
                authors: convertJson(meta.authors),
                translators: convertJson(meta.translators),
                editors: convertJson(meta.editors),
                contributors: convertJson(meta.contributors),
                doi: meta.doi || null,
                isbn: meta.isbn || null,
                volume: meta.volume || null,
                issue: meta.issue || null,
                page_range: meta.page_range || null,
                edition: meta.edition || null,
                url: meta.url || null,
                country: meta.country || null,
                copyright_holder: meta.copyright_holder || null,
                license: meta.license || null,
                access_level: meta.access_level || null,
                keywords: convertJson(meta.keywords),
                notes: meta.notes || null,
            });
        };

        if (sourceMeta) upsert("source", sourceMeta);
        if (targetMeta) upsert("target", targetMeta);

        return { ok: true };
    }
);

ipcMain.handle(
    "alignment:saveParagraphLinks",
    async (_event, documentId: any, state: any, action = "align") => {
        const { maxVersion } = db.prepare(`
        SELECT MAX(version) AS maxVersion
        FROM document_paraalign_history
        WHERE document_id = ?
      `).get(documentId) ?? { maxVersion: -1 };

        const version = (maxVersion ?? -1) + 1;

        /* -----------------------------
           2. Insert history snapshot
        ------------------------------ */
        db.prepare(`
        INSERT INTO document_paraalign_history
          (document_id, version, snapshot, action)
        VALUES (?, ?, ?, ?)
      `).run(
            documentId,
            version,
            JSON.stringify(state),
            action
        );

        const tx = db.transaction(() => {
            persistAlignments(documentId, state.links, "para");
        });
        tx();
        return { ok: true };
    }
);


ipcMain.handle(
    "alignment:saveLinks",
    async (_event, documentId: any, state: any, action = "align", documentType) => {
        console.log("save links state", state, documentType);

        if (documentType == 'para') {
            const {maxVersion} = db.prepare(`
        SELECT MAX(version) AS maxVersion
        FROM document_sentalign_history
        WHERE document_id = ?
      `).get(documentId) ?? {maxVersion: -1};

            const version = (maxVersion ?? -1) + 1;

            /* -----------------------------
               2. Insert history snapshot
            ------------------------------ */
            db.prepare(`
        INSERT INTO document_sentalign_history
          (document_id, version, snapshot, action)
        VALUES (?, ?, ?, ?)
      `).run(
                documentId,
                version,
                JSON.stringify(state),
                action
            );

            const tx = db.transaction(() => {
                persistAlignments(documentId, state.links, documentType);
            });
            tx();
            return {ok: true};
        }else{
            const {maxVersion} = db.prepare(`
        SELECT MAX(version) AS maxVersion
        FROM document_sentalign_history
        WHERE document_id = ?
      `).get(documentId) ?? {maxVersion: -1};

            const version = (maxVersion ?? -1) + 1;

            /* -----------------------------
               2. Insert history snapshot
            ------------------------------ */
            db.prepare(`
        INSERT INTO document_sentalign_history
          (document_id, version, snapshot, action)
        VALUES (?, ?, ?, ?)
      `).run(
                documentId,
                version,
                JSON.stringify(state),
                action
            );

            const tx = db.transaction(() => {
                persistAlignments(documentId, state.links, documentType);
            });
            tx();
            return {ok: true};
        }
    }
);


ipcMain.handle("llm:getSettings", () => {
    return getLLMSettings();
});

ipcMain.handle(
    "llm:saveSettings",
    (_, settings: LLMSettings) => {
        saveLLMSettings(settings);
    }
);


ipcMain.handle(
    "align:paragraph-batch",
    async (
        _event,
        payload: any
    ) => {
        const { pairs, srcLang, tgtLang, documentId } = payload;
        console.log("aligned payload", payload);

        // ✅ Load default model ONLY here
        // const defaultModel = loadDefaultModel();
        // const modelId =
        //     payload.modelOverride ??
        //     settings.defaultModel;

        const results = await AlignmentService.alignParagraphBatch(
            pairs,
            srcLang,
            tgtLang,
            documentId
        );
        markDocumentWithStatus(documentId, "pending-sent");
        return results;

    }
);


export function markDocumentWithStatus(documentId: number, status: string): boolean {
    const stmt = db.prepare(`
    UPDATE documents
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

    const result = stmt.run(status, documentId);

    // returns true if a row was updated
    return result.changes > 0;
}
