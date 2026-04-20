import { useEffect, useState } from "react";
import { Button, Input } from "antd";

export default function TagManager() {
    const [tags, setTags] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [form, setForm] = useState<any | null>(null);

    useEffect(() => {
        loadTags();
    }, []);

    async function loadTags() {
        const data = await window.api.listTags();
        setTags(data);
    }

    const startCreate = () => {
        setSelected(null);
        setForm({
            name: "",
            description: "",
            sample: "",
            color: "#38bdf8",
        });
    };

    const startEdit = (tag: any) => {
        setSelected(tag);
        setForm({
            name: tag.name,
            description: tag.description ?? "",
            sample: tag.sample ?? "",
            color: tag.color ?? "#38bdf8",
        });
    };

    const save = async () => {
        if (!form.name.trim()) return alert("Technique name is required");

        if (selected) {
            await window.api.updateTag(selected.id, form);
        } else {
            await window.api.createTag(form);
        }

        setForm(null);
        setSelected(null);
        await loadTags();
    };

    const remove = async (id: number) => {
        if (!confirm("Delete this technique?")) return;
        await window.api.deleteTag(id);
        await loadTags();
    };

    return (
        <div className="flex h-[85vh] gap-4 p-6 bg-slate-50">

            {/* ================= LEFT: LIST ================= */}
            <div className="w-1/3 bg-white rounded-xl shadow overflow-y-auto">
                <div className="p-4 flex justify-between items-center border-b">
                    <h2 className="font-bold text-slate-800">Techniques</h2>
                    <Button
                            className="bg-blue-600 text-white px-3 py-1 rounded"
                            onClick={startCreate}>
                        + New
                    </Button>
                </div>

                {tags.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                        No techniques yet
                    </div>
                ) : (
                    tags.map(tag => (
                        <div
                            key={tag.id}
                            onClick={() => startEdit(tag)}
                            className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition ${
                                selected?.id === tag.id ? "bg-blue-50" : ""
                            }`}
                        >
                            <div className="font-medium text-slate-800">
                                {tag.name}
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-2">
                                {tag.description}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ================= RIGHT: EDITOR ================= */}
            <div className="flex-1 bg-white rounded-xl shadow p-6 overflow-y-auto">
                {!form ? (
                    <div className="text-center text-slate-400 mt-20">
                        Select or create a technique
                    </div>
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-800">
                            {selected ? "Edit Technique" : "New Technique"}
                        </h2>

                        <Input
                            placeholder="Technique Name"
                            value={form.name}
                            onChange={e =>
                                setForm({ ...form, name: e.target.value })
                            }
                        />

                        <Input.TextArea
                            rows={4}
                            placeholder="Description"
                            value={form.description}
                            onChange={e =>
                                setForm({ ...form, description: e.target.value })
                            }
                        />

                        <Input.TextArea
                            rows={4}
                            placeholder="Example / Sample"
                            value={form.sample}
                            onChange={e =>
                                setForm({ ...form, sample: e.target.value })
                            }
                        />

                        <div className="flex gap-2">
                            <Button
                                    className="bg-blue-600 text-white px-3 py-1 rounded"
                                    onClick={save}>
                                Save
                            </Button>

                            <Button
                                className="btn-sm bg-gray-300 px-4 py-2 rounded"
                                onClick={() => {
                                    setForm(null);
                                    setSelected(null);
                                }}
                            >
                                Cancel
                            </Button>

                            {selected && (
                                <Button
                                    danger
                                    className="ml-auto"
                                    onClick={() => remove(selected.id)}
                                >
                                    Delete
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}