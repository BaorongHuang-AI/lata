import { useEffect, useState } from "react";
import { Table, Input, Select } from "antd";
import { Save, Edit, Trash2 } from "lucide-react";

type PromptForm = {
    id?: number;
    task_type: string;
    name: string;
    systemPrompt: string;
    userPrompt: string;
    model: string;
    temperature: number;
    max_tokens: number;
};

const taskOptions = [
    { label: "Sentence Segmentation", value: "sentence_segmentation" },
    // { label: "Parallel Alignment", value: "parallel_alignment" },
    { label: "Sentence Alignment", value: "sentence_alignment" },
];

export default function PromptManager() {
    const [prompts, setPrompts] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<any>({
        task_type: "sentence_segmentation",
        name: "",
        systemPrompt: "",
        userPrompt: "",
        model: "gpt-4.1-mini",
        temperature: 0.2,
        max_tokens: 2048,
    });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        const data = await window.api.listPrompts();
        setPrompts(data);
    }

    const save = async () => {
        if (!form.name) return alert("Name is required");
        if (editingId) {
            await window.api.updatePrompt(editingId, form);
        } else {
            await window.api.savePrompt(form);
        }
        setEditingId(null);
        setForm({
            task_type: "sentence_segmentation",
            name: "",
            systemPrompt: "",
            userPrompt: "",
            model: "gpt-4.1-mini",
            temperature: 0.2,
            max_tokens: 2048,
        });
        await load();
    };

    const remove = async (id: number) => {
        if (!confirm("Are you sure to delete this prompt?")) return;
        await window.api.deletePrompt(id);
        await load();
    };

    const edit = (p: any) => {
        setEditingId(p.id!);
        setForm({
            ...p,
            systemPrompt: p.system_prompt,
            userPrompt: p.user_prompt,
        });
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                Prompt Manager {editingId && <span className="text-orange-500">(Editing)</span>}
            </h1>

            {/* ================== Form Card ================== */}
            <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        value={form.task_type}
                        onChange={v => setForm({ ...form, task_type: v })}
                        options={taskOptions}
                        className="w-full"
                    />
                    <Input
                        placeholder="Prompt name (default_v1)"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full"
                    />
                </div>

                <Input.TextArea
                    rows={6}
                    placeholder="System prompt content..."
                    value={form.systemPrompt}
                    onChange={e => setForm({ ...form, systemPrompt: e.target.value })}
                    className="w-full"
                />

                <Input.TextArea
                    rows={6}
                    placeholder="User prompt content..."
                    value={form.userPrompt}
                    onChange={e => setForm({ ...form, userPrompt: e.target.value })}
                    className="w-full"
                />

                <button
                    onClick={save}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition duration-200"
                >
                    <Save className="w-4 h-4" /> Save Prompt
                </button>
            </div>

            {/* ================== Table ================== */}
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-gray-600">Task</th>
                        <th className="px-4 py-2 text-left text-gray-600">Name</th>
                        <th className="px-4 py-2 text-left text-gray-600">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {prompts.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{p.task_type}</td>
                            <td className="px-4 py-2">{p.name}</td>
                            <td className="px-4 py-2 flex gap-2">
                                <button
                                    onClick={() => edit(p)}
                                    className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded transition duration-200"
                                >
                                    <Edit className="w-4 h-4" /> Edit
                                </button>
                                <button
                                    onClick={() => remove(p.id!)}
                                    className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition duration-200"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
