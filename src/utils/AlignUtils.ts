import {RTL_LANGS} from "./Constants";
import {RawParagraph} from "../types/database";
import {AlignmentResult, Sentence} from "../types/alignment";
import {PromptEntity} from "../types/prompt";
// import {listPrompts} from "../db/promptService";

export interface DocumentMetadata {
    title?: string;
    source?: string;
    language: string;
    domain?: string;
    publishDate?: string;
    publisher?: string;
}

export function validateMetadata(meta: DocumentMetadata | undefined, name: string) {
    // console.log("validate", meta, name);
    const errors: string[] = [];

    if (!meta) {
        errors.push(`${name} metadata is missing`);
        return errors;
    }

    if (!meta.title || meta.title.trim() === "") {
        errors.push(`${name}: Title is required`);
    }

    if (!meta.source || meta.source.trim() === "") {
        errors.push(`${name}: Source is required`);
    }

    if (!meta.language || meta.language.trim() === "") {
        errors.push(`${name}: Language is required`);
    }

    if (!meta.domain || meta.domain.trim() === "") {
        errors.push(`${name}: Domain is required`);
    }

    return errors;
}

export const isRTL = (lang?: string) =>
    !!lang && RTL_LANGS.indexOf(lang) !== -1;

export function splitIntoParagraphs(text: string): RawParagraph[] {
    if (!text) return [];

    return text
        .replace(/\r\n/g, "\n")
        .split(/\n+/)
        .map(p => p.trim())
        .filter(Boolean)
        .map((text, i) => ({
            id: `p${i + 1}`,
            index: i + 1,
            text,
        }));
}

export function buildSplitPrompt(
    paragraph: string,
    language: string
) {
    return {
        system: `
You are a professional text segmentation engine.
Split a paragraph into sentences.
Do not translate. Do not normalize.
Return ONLY valid JSON.
If unsure, return {}.
        `.trim(),

        user: `
Language: ${language}

Paragraph:
"""
${paragraph}
"""

Output JSON:
{
  "sentences": [
    { "id": "s1", "text": "..." }
  ]
}
        `.trim(),
    };
}

export async  function buildSplitPromptFromDB(
    paragraph: string,
    language: string,
    prompts: any[],
) {
    // 1️⃣ Query the DB for the sentence_segmentation prompt
    // const prompts: any[]  =  listPrompts();
    let  template = prompts.find(p => p.task_type === "sentence_segmentation");
    if(prompts.length == 1 || (prompts.length > 1 && !template)){
        template = prompts[0];
    }
    // Find the task_type template


    if (!template) {
        throw new Error(
            "No sentence_segmentation template found. Please create one in Prompt Manager."
        );
    }

    const userPrompt = template.user_prompt
        ? template.user_prompt
            .replace(/\{\{language\}\}/g, language)
            .replace(/\{\{paragraph\}\}/g, paragraph)
        : `
            Language: ${language}
            
            Paragraph:
            """
            ${paragraph}
            """
            
            Output JSON:
            {
              "sentences": [
                { "id": "s1", "text": "..." }
              ]
            }
        `;

    return {
        system: template.system_prompt,
        user: userPrompt,
    };
}

export function buildAlignmentPrompt(
    srcLang: string,
    tgtLang: string,
    source: Sentence[],
    target: Sentence[]
) {
    return {
        system: `
You are a professional bilingual sentence alignment engine.
Align sentences by meaning.
One-to-many and many-to-one are allowed.
Return ONLY valid JSON.
If unsure, return {}.
        `.trim(),

        user: `
Source language: ${srcLang}
Target language: ${tgtLang}

Source sentences:
${JSON.stringify(source, null, 2)}

Target sentences:
${JSON.stringify(target, null, 2)}

Output JSON:
{
  "alignments": [
    {
      "sourceIds": ["s1"],
      "targetIds": ["t1"],
      "confidence": 0.0,
      "explanation": "..."
    }
  ]
}
        `.trim(),
    };
}


export async  function buildAlignmentPromptFromDB(
    srcLang: string,
    tgtLang: string,
    source: Sentence[],
    target: Sentence[],
    prompts: any[],
) {
    // 1️⃣ Query the DB for the parallel_alignment prompt template
    // const prompts: any[] = listPrompts();
    let template = prompts.find(p => p.task_type === "sentence_alignment");
    if(prompts.length == 1 || (prompts.length > 1 && !template)){
        template = prompts[0];
    }
    if (!template) {
        throw new Error(
            "No parallel_alignment template found. Please create one in Prompt Manager."
        );
    }

    // 2️⃣ Fill in the user prompt template
    let userPrompt = template.user_prompt;
    if (userPrompt) {
        userPrompt = userPrompt
            .replace(/\{\{sourceLanguage\}\}/g, srcLang)
            .replace(/\{\{targetLanguage\}\}/g, tgtLang)
            .replace(/\{\{sourceSentences\}\}/g, JSON.stringify(source, null, 2))
            .replace(/\{\{targetSentences\}\}/g, JSON.stringify(target, null, 2));
    } else {
        userPrompt = `
            Source language: ${srcLang}
            Target language: ${tgtLang}
            
            Source sentences:
            ${JSON.stringify(source, null, 2)}
            
            Target sentences:
            ${JSON.stringify(target, null, 2)}
            
            Output JSON:
            {
              "alignments": [
                {
                  "sourceIds": ["s1"],
                  "targetIds": ["t1"],
                  "confidence": 0.0,
                  "explanation": "..."
                }
              ]
            }
        `.trim();
            }

    return {
        system: template.system_prompt,
        user: userPrompt,
    };
}

export async function llmCallWithRetry<T>(
    fn: () => Promise<string>,
    maxRetries = 2
): Promise<T | null> {
    for (let i = 0; i <= maxRetries; i++) {
        try {
            const raw = await fn();
            const parsed = JSON.parse(raw);
            if (parsed && Object.keys(parsed).length > 0) {
                return parsed as T;
            }
        } catch {
            /* retry */
        }
    }
    return null;
}
