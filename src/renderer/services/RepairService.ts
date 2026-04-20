export class RepairService {

    static repair(alignments, source, target) {
        let result = this.deduplicate(alignments);
        result = this.fillMissing(result, source, target);
        return result;
    }

    static deduplicate(alignments) {
        const map = new Map();

        for (const a of alignments) {
            const key = JSON.stringify({
                s: [...a.sourceIds].sort(),
                t: [...a.targetIds].sort()
            });

            map.set(key, a);
        }

        return Array.from(map.values());
    }

    static fillMissing(alignments, source, target) {
        const used = new Set();

        alignments.forEach(a => {
            a.sourceIds.forEach(id => used.add(id));
        });

        const missing = source.filter(s => !used.has(s.id));

        for (const s of missing) {
            alignments.push({
                sourceIds: [s.id],
                targetIds: [target[0].id],
                confidence: 0.5,
                strategy: "repair"
            });
        }

        return alignments;
    }
}
