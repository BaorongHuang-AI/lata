import {llmCallWithRetry} from "../../utils/AlignUtils";
import {sendChatCompletion} from "../../utils/sendChatCompletion";

export class AnchorService {

    static async buildHybrid(source, target, srcLang, tgtLang) {
        const coarse = this.buildCoarse(source, target);

        const refined = await this.refine(coarse, source, target, srcLang, tgtLang);

        return this.merge(coarse, refined);
    }

    static buildCoarse(source, target, step = 20) {
        const anchors = [];

        const ratio = target.length / source.length;

        for (let i = 0; i < source.length; i += step) {
            anchors.push({
                sIndex: i,
                tIndex: Math.floor(i * ratio)
            });
        }

        anchors.push({
            sIndex: source.length - 1,
            tIndex: target.length - 1
        });

        return anchors;
    }

    static async refine(coarse, source, target, srcLang, tgtLang) {
        const refined = [];

        for (let i = 0; i < coarse.length - 1; i++) {
            const a1 = coarse[i];
            const a2 = coarse[i + 1];

            const sSlice = source.slice(a1.sIndex, a2.sIndex + 1);
            const tSlice = target.slice(a1.tIndex, a2.tIndex + 1);

            const local = await this.extractAnchors(sSlice, tSlice);

            refined.push(...local);
        }

        return refined;
    }

    static async extractAnchors(sourceSlice, targetSlice) {
        const { system, user } = this.buildPrompt(sourceSlice, targetSlice);

        const result = await llmCallWithRetry(async () => {
            const res = await sendChatCompletion({
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ],
                temperature: 0
            });
            return res.content;
        });

        return result?.anchors ?? [];
    }

    static merge(coarse, refined) {
        const map = new Map();

        [...coarse, ...refined].forEach(a => {
            map.set(`${a.sIndex}-${a.tIndex}`, a);
        });

        return Array.from(map.values())
            .sort((a, b) => a.sIndex - b.sIndex);
    }

    static buildPrompt(source, target) {
        return {
            system: `Find anchor alignments only.`,
            user: `Source:\n${source.map(s => s.text).join("\n")}\n\nTarget:\n${target.map(t => t.text).join("\n")}`
        };
    }
}
