import { useEffect, useState } from "react";
import { Tag, TagInput } from "../types/tag";
import {Button} from "antd";

export default function TagManager() {
    const [tags, setTags] = useState<any[]>([]);
    const [form, setForm] = useState<any>({ name: "", description: "", color: "#38bdf8" });
    const [editingId, setEditingId] = useState<number | null>(null);

    async function loadTags() {
        const data = await window.api.listTags();
        setTags(data);
    }

    useEffect(() => {
        loadTags();
    }, []);

    const save = async () => {
        if (!form.name.trim()) return alert("Technique name is required");

        if (editingId) {
            await window.api.updateTag(editingId, form);
        } else {
            await window.api.createTag(form);
        }

        setEditingId(null);
        setForm({ name: "", description: "", sample: "", color: "#38bdf8" });
        await loadTags();
    };

    const edit = (tag: Tag) => {
        setEditingId(tag.id);
        setForm({ name: tag.name, description: tag.description ?? "", sample: tag.sample, color: tag.color ?? "#38bdf8" });
    };

    const remove = async (id: number) => {
        if (confirm("Delete this technique?")) {
            await window.api.deleteTag(id);
            await loadTags();
        }
    };

    const cancel = () => {
        setEditingId(null);
        setForm({ name: "", description: "",  sample: "", color: "#38bdf8" });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Translation Techniques</h2>
                    {/*<p className="text-slate-600">Manage your translation workflow tags</p>*/}
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 mb-8 border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">
                        {editingId ? "✏️ Edit Technique" : "➕ Create New Technique"}
                    </h3>

                    <div className="space-y-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Technique Name *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Addition"
                                className="w-full border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all outline-none"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Description
                            </label>
                            <textarea
                                placeholder="Brief description of the technique and when to use it..."
                                className="w-full border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all outline-none resize-y min-h-[100px]"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Sample
                            </label>
                            <textarea
                                placeholder="Brief description of the technique and when to use it..."
                                className="w-full border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg transition-all outline-none resize-y min-h-[100px]"
                                value={form.sample}
                                onChange={(e) => setForm({ ...form, sample: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button className="
                                bg-blue-600
                                hover:bg-blue-700
                                text-white
                                font-semibold
                                py-2
                                px-4
                                rounded
                                shadow
                                transition
                                duration-200
                                ease-in-out"
                            onClick={save}>
                            {editingId ? "Update Technique" : "Add Technique"}
                        </Button>

                        {editingId && (
                            <button
                                onClick={cancel}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2.5 px-6 rounded-lg transition-all duration-200"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                {/* Tags Display */}
                <div className="mb-4">
                    <h3 className="text-xl font-semibold text-slate-800 mb-4">
                        Your Techniques ({tags.length})
                    </h3>
                </div>

                {tags.length === 0 ? (
                    <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
                        <div className="text-6xl mb-4">🏷️</div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">No techniques yet</h3>
                        <p className="text-slate-500">Create your first technique to get started!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tags.map((tag) => (
                            <div
                                key={tag.id}
                                className="group bg-white rounded-xl shadow-md hover:shadow-xl border-2 border-slate-200 hover:border-blue-400 p-5 transition-all duration-300 transform hover:-translate-y-1"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl">🏷️</span>
                                            <h4 className="font-bold text-slate-800 text-lg">
                                                {tag.name}
                                            </h4>
                                        </div>
                                        {tag.description && (
                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                {tag.description}
                                            </p>
                                        )}
                                        {tag.sample && (
                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                {tag.sample}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-3 border-t border-slate-100">
                                    <Button
                                        onClick={() => edit(tag)}
                                    >
                                         Edit
                                    </Button>
                                    <Button danger
                                        onClick={() => remove(tag.id)}
                                    >
                                       Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
