import { Sentence, Line } from "../../types/alignment";

export class SentenceMappingService {

    /**
     * Map raw LLM sentences back to line structure
     * and assign stable IDs.
     */
    static map(sentences: Sentence[], lines: Line[]): Sentence[] {

        const fullText = lines.map(l => l.text).join("\n");

        let cursor = 0;

        return sentences.map((s, idx) => {

            const start = fullText.indexOf(s.text, cursor);
            const end = start + s.text.length;

            cursor = end;

            // find overlapping lines
            let charPos = 0;
            const matchedLineIds: string[] = [];

            for (const line of lines) {
                const lineStart = charPos;
                const lineEnd = charPos + line.text.length + 1;

                const overlaps =
                    start < lineEnd &&
                    end > lineStart;

                if (overlaps) {
                    matchedLineIds.push(line.lineNumber);
                }

                charPos = lineEnd;
                if (charPos > end) break;
            }

            const primaryLine = matchedLineIds[0] ?? lines[0]?.lineNumber ?? "unknown";

            return {
                id: `${primaryLine}-s${idx}`,
                text: s.text.trim(),
                paraIds: matchedLineIds
            };
        });
    }

    /**
     * Utility: rebuild paragraph text from lines
     */
    static joinLines(lines: Line[]): string {
        return lines.map(l => l.text).join("\n");
    }

    /**
     * Utility: extract sentence text only
     */
    static extractText(sentences: Sentence[]): string[] {
        return sentences.map(s => s.text);
    }
}
