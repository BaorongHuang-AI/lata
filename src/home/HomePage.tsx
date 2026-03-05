import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "antd";

interface AlignmentStats {
    totalDocs: number;
    totalAlignments: number;
    oneToOne: number;
    oneToMany: number;
    manyToOne: number;
    manyToMany: number;
}

interface AlignedDocument {
    id: number;
    title: string;
    sourceLang: string;
    targetLang: string;
    status: "processing" | "completed" | "review";
    one_to_one: number;
    one_to_many: number;
    many_to_one: number;
    many_to_many: number;
    updated_at: string;
}

const HomePage = () => {
    const [stats, setStats] = useState<AlignmentStats | null>(null);
    const [docs, setDocs] = useState<AlignedDocument[]>([]);

    const loadData = () => {
        window.api.getHomeOverview().then((res) => {
            console.log("home res", res);
            setStats(res.stats);
            setDocs(res.documents);
        });
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = (doc: AlignedDocument) => {
        Modal.confirm({
            title: "Delete Align Task",
            content: `Are you sure you want to delete "${doc.title}"? This action cannot be undone.`,
            okText: "Delete",
            okType: "danger",
            cancelText: "Cancel",
            onOk: async () => {
                await window.api.deleteDocument(doc.id);
                loadData();
            },
        });
    };

    if (!stats) return <div className="p-6">Loading…</div>;

    const alignPathByStatus = {
        "pending-doc": (id) => `/docalign/${id}`,
        "pending-para": (id) => `/alignpara/${id}`,
        "pending-sent": (id) => `/alignsent/${id}`,
        "completed": (id) => `/docalign/${id}`,
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Alignment Workspace</h1>
                <p className="text-gray-500">Document alignment overview</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <Stat title="Documents" value={stats.totalDocs} />
                <Stat title="Alignments" value={stats.totalAlignments} />
                <Stat title="1 → 1" value={stats.oneToOne} />
                <Stat title="1 → N" value={stats.oneToMany} />
                <Stat title="N → 1" value={stats.manyToOne} />
                <Stat title="N → N" value={stats.manyToMany} />
            </div>
            {/* Actions */}
            <div className="flex justify-end gap-3">
                <Link to="/docalign" className="px-4 py-2 bg-blue-600 text-white rounded">
                    New Align Task
                </Link>

                <Link to="/settings" className="px-4 py-2 bg-blue-600 text-white rounded">
                    Configure LLM API
                </Link>
            </div>
            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full table-auto">
                    <thead className="bg-gray-50">
                    <tr>
                        <Th>Document</Th>
                        <Th>Languages</Th>
                        <Th>Status</Th>
                        <Th center>1 → 1</Th>
                        <Th center>1 → N</Th>
                        <Th center>N → 1</Th>
                        <Th center>N → N</Th>
                        <Th>Updated</Th>
                        <Th center>Actions</Th>
                    </tr>
                    </thead>

                    <tbody>
                    {docs.map((doc) => (
                        <tr key={doc.id} className="border-t">
                            <Td className="font-medium">{doc.title}</Td>
                            <Td>{doc.sourceLang} → {doc.targetLang}</Td>
                            <Td>
                  <span className={`px-2 py-1 rounded text-xs ${
                      doc.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : doc.status === "review"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                  }`}>
                    {doc.status}
                  </span>
                            </Td>
                            <Td center>{doc.one_to_one}</Td>
                            <Td center>{doc.one_to_many}</Td>
                            <Td center>{doc.many_to_one}</Td>
                            <Td center>{doc.many_to_many}</Td>
                            <Td className="text-sm text-gray-500">
                                {doc.updated_at}
                            </Td>
                            <Td center>
                                <div className="flex items-center justify-center gap-2">
                                    <Link
                                        to={(alignPathByStatus[doc.status] ?? alignPathByStatus["pending-doc"])(doc.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        {doc.status === "completed" ? "Review" : "Align"}
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(doc)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </Td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>


        </div>
    );
};

export default HomePage;

/* ------------------ helpers ------------------ */

const Stat = ({ title, value }: { title: string; value: number }) => (
    <div className="bg-white rounded-lg shadow p-4">
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-2xl font-semibold">{value}</div>
    </div>
);

const Th = ({ children, center }: any) => (
    <th className={`px-4 py-2 text-sm font-medium ${center ? "text-center" : "text-left"}`}>
        {children}
    </th>
);

const Td = ({ children, center, className = "" }: any) => (
    <td className={`px-4 py-2 ${center ? "text-center" : ""} ${className}`}>
        {children}
    </td>
);
