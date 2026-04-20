import {listPrompts} from "../../db/promptService";
import {buildSplitPromptFromDB, llmCallWithRetry} from "../../utils/AlignUtils";
import {sendChatCompletion} from "../../utils/sendChatCompletion";
import {Sentence} from "../../types/alignment";

export class SentenceSplitService {


    static sendProgress(event, payload) {
        event.sender.send("alignment-progress", payload);
    }

    // static async splitParasToSentences(
    //     paras,
    //     lang,
    //     prefix: "sp" | "tp",
    //     concurrency = 8
    // ) {
    //     const results = new Array(paras.length);
    //
    //     let current = 0;
    //
    //     async function worker() {
    //         while (current < paras.length) {
    //             const pIndex = current++;
    //             const para = paras[pIndex];
    //
    //             try {
    //                 const rawSentences = await SentenceSplitService.llmSplitSentences(
    //                     para.text,
    //                     lang
    //                 );
    //
    //                 results[pIndex] = {
    //                     paraId: pIndex,
    //                     sentences: rawSentences.map((s, sIndex) => ({
    //                         id: `${prefix}${pIndex}-s${sIndex}`,
    //                         text: s.text,
    //                         paraId: pIndex,
    //                         sentIndex: sIndex,
    //                         order: 0 // assign later
    //                     }))
    //                 };
    //             } catch (err) {
    //                 console.error(`Split failed at para ${pIndex}`, err);
    //
    //                 results[pIndex] = {
    //                     paraId: pIndex,
    //                     sentences: [
    //                         {
    //                             id: `${prefix}${pIndex}-s0`,
    //                             text: para.text,
    //                             paraId: pIndex,
    //                             sentIndex: 0,
    //                             order: 0
    //                         }
    //                     ]
    //                 };
    //             }
    //
    //         }
    //     }
    //
    //     await Promise.all(
    //         Array.from({length: concurrency}, () => worker())
    //     );
    //
    //     /* --------------------------------
    //        ✅ Assign global order (SAFE)
    //     --------------------------------- */
    //     let order = 0;
    //     for (let i = 0; i < results.length; i++) {
    //         for (const s of results[i].sentences) {
    //             s.order = order++;
    //         }
    //     }
    //
    //     return results;
    // }

    static async splitParasToSentences(
        paras,
        lang,
        prefix,
        progressCallback,
        concurrency = 8
    ) {
        const results = new Array(paras.length);

        let current = 0;

        function getNextIndex() {
            const idx = current;
            current++;
            return idx;
        }

        async function worker() {
            while (true) {

                const pIndex = getNextIndex();
                if (pIndex >= paras.length) break;

                const para = paras[pIndex];

                try {
                    const rawSentences =
                        await SentenceSplitService.llmSplitSentences(
                            para.text,
                            lang
                        );

                    results[pIndex] = {
                        paraId: pIndex,
                        sentences: rawSentences.map((s, sIndex) => ({
                            id: `${prefix}${pIndex}-s${sIndex}`,
                            text: s.text,
                            paraId: pIndex,
                            sentIndex: sIndex,
                            order: 0
                        }))
                    };

                } catch (err) {
                    results[pIndex] = {
                        paraId: pIndex,
                        sentences: [{
                            id: `${prefix}${pIndex}-s0`,
                            text: para.text,
                            paraId: pIndex,
                            sentIndex: 0,
                            order: 0
                        }]
                    };
                }

                progressCallback(); // 🔥 unified progress
            }
        }

        const workers = Array.from({ length: concurrency }, worker);

        await Promise.all(workers);

        return results;
    }

    static async llmSplitSentences(
        paragraph: string,
        language: string,
    ): Promise<Sentence[]> {
        const prompts = listPrompts();
        const {system, user} = await buildSplitPromptFromDB(paragraph, language, prompts);
        console.log("split sentences", system, user);

        let result;

        try {
            result = await llmCallWithRetry<{ sentences: Sentence[] }>(
                async () => {
                    const res = await sendChatCompletion({
                        messages: [
                            {role: "system", content: system},
                            {role: "user", content: user},
                        ],
                    });

                    console.log("res", res);

                    const content = res?.content;

                    if (!content) {
                        throw new Error("Empty LLM response");
                    }

                    return content;
                }
            );
        } catch (err) {
            console.error("Sentence splitting error:", err);
            throw err; // or fallback
        }
        /* --------------------------------
              ✅ Fallback 1: Empty or invalid result
           --------------------------------- */
        if (!result || !result.sentences || result.sentences.length === 0) {
            console.warn("⚠️ Using fallback sentence split (single sentence)");

            return [
                {
                    id: "s1",
                    text: paragraph
                }
            ];
        }

        /* --------------------------------
           ✅ Fallback 2: Clean malformed sentences
        --------------------------------- */
        const cleaned = result.sentences
            .map((s, idx) => ({
                id: s.id || `s${idx + 1}`,
                text: (s.text || "").trim()
            }))
            .filter(s => s.text.length > 0);

        if (cleaned.length === 0) {
            return [
                {
                    id: "s1",
                    text: paragraph
                }
            ];
        }

        return cleaned;
        // console.log("sentence align results", result);
        // return result.sentences;
    }

}
