import { useEffect, useState } from "react";

type Sentence = {
    sentence_key: string;
    text: string;
    side: "source" | "target";
};

type Cluster = {
    id: string;
    sourceSentences: Sentence[];
    targetSentences: Sentence[];
    alignments: any[];
};

export default function DocumentViewer({ docId }: { docId: number }) {
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [selected, setSelected] = useState<{
        key: string;
        clusterId: string;
    } | null>(null);

    useEffect(() => {
        load();
    }, [docId]);

    async function load() {
        const data = await window.api.getDocumentAlignments(docId);

        // ✅ IMPORTANT: NO REBUILDING
        setClusters(data);
    }

    // ================= TRANSLATION LOGIC =================
    const getLinked = (cluster: Cluster, key: string) => {
        const result: string[] = [];

        cluster.alignments.forEach((a) => {
            const src = a.sourceKeys || [];
            const tgt = a.targetKeys || [];

            if (src.includes(key)) result.push(...tgt);
            if (tgt.includes(key)) result.push(...src);
        });

        return result;
    };

    const renderPopup = (cluster: Cluster) => {
        if (!selected || selected.clusterId !== cluster.id) return null;

        const linkedKeys = getLinked(cluster, selected.key);

        const all = [...cluster.sourceSentences, ...cluster.targetSentences];

        const texts = all
            .filter((s) => linkedKeys.includes(s.sentence_key))
            .map((s) => s.text);

        if (!texts.length) return null;

        return (
            <div className="absolute z-10 bg-white border shadow-lg rounded p-3 mt-2 max-w-md">
                <div className="text-xs text-gray-400 mb-1">
                    Translation
                </div>
                {texts.map((t, i) => (
                    <div key={i} className="text-sm text-gray-800">
                        {t}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <h1 className="text-xl font-bold mb-4 text-slate-800">
                📄 Alignment-Based Document View
            </h1>

            <div className="overflow-auto bg-white rounded shadow">
                <table className="w-full border-collapse">
                    <thead>
                    <tr className="bg-gray-100">
                        <th className="p-3 border w-1/2">
                            Source
                        </th>
                        <th className="p-3 border w-1/2">
                            Target
                        </th>
                    </tr>
                    </thead>
                    <tbody>
                    {clusters.map((c) => (
                        <tr key={c.id} className="relative border-t">

                            {/* SOURCE */}
                            <td className="p-3 border w-1/2 align-top">
                                {c.sourceSentences.map((s) => (
                                    <div
                                        key={s.sentence_key}
                                        onClick={() =>
                                            setSelected({
                                                key: s.sentence_key,
                                                clusterId: c.id,
                                            })
                                        }
                                        className="p-1 rounded cursor-pointer hover:bg-blue-50"
                                    >
                                        {s.text}
                                    </div>
                                ))}
                            </td>

                            {/* TARGET */}
                            <td className="p-3 border w-1/2 align-top">
                                {c.targetSentences.map((s) => (
                                    <div
                                        key={s.sentence_key}
                                        onClick={() =>
                                            setSelected({
                                                key: s.sentence_key,
                                                clusterId: c.id,
                                            })
                                        }
                                        className="p-1 rounded cursor-pointer hover:bg-green-50"
                                    >
                                        {s.text}
                                    </div>
                                ))}
                            </td>

                            {selected?.clusterId === c.id && (
                                <div
                                    className="fixed inset-0 z-50 flex items-center justify-center"
                                    onClick={() => setSelected(null)}
                                >
                                    {/* backdrop */}
                                    <div className="absolute inset-0 bg-black/30" />

                                    {/* popup */}
                                    <div
                                        className="relative bg-white border shadow-xl rounded-lg p-4 max-w-md w-full"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {renderPopup(c)}
                                    </div>
                                </div>
                            )}
                        </tr>
                    ))}
                    </tbody>
                </table>

            </div>
        </div>
    );
}