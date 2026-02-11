import { useEffect, useState } from "react";
import { Table, Input, Button, message, Checkbox } from "antd";
import {LLMRow} from "../types/llminterfaces";
import { Save, Zap, PlusCircle, Check } from "lucide-react";

const LLMSettingsPage = () => {
    const [models, setModels] = useState<LLMRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);

    const [newModel, setNewModel] = useState({ id: "", model_name: "", base_url: "", api_key: "" });

    useEffect(() => {
        async function load() {
            const rows = await window.api.getLLMModels();
            console.log(rows);
            setModels(rows);
            setLoading(false);
        }
        load();
    }, []);

    const saveModel = async (record: LLMRow) => {
        if (!record.id || !record.base_url || !record.model_name || !record.api_key) {
            alert("Fill all fields before saving");
            return;
        }
        setSavingId(record.id);
        try {
            await window.api.testLLMModel({
                base_url: record.base_url,
                api_key: record.api_key,
                model_name: record.model_name,
            });

            // const api_key_enc = await window.api.encryptApiKey(record.api_key);

            await window.api.saveLLMModel({
                id: record.id,
                model_name: record.model_name,
                base_url: record.base_url,
                api_key: record.api_key,
            });

            alert("Saved & tested successfully");
        } catch (err: any) {
            alert(err.message || "Save/Test failed");
        } finally {
            setSavingId(null);
        }
    };

    const addNewModel = async () => {
        if ( !newModel.model_name || !newModel.base_url || !newModel.api_key) {
            alert("Fill all fields to add new model");
            return;
        }
        try {
            await window.api.testLLMModel({
                base_url: newModel.base_url,
                api_key: newModel.api_key,
                model_name: newModel.model_name,
            });

            const api_key_enc = await window.api.encryptApiKey(newModel.api_key);

            await window.api.createLLMModel({
                model_name: newModel.model_name,
                base_url: newModel.base_url,
                api_key: newModel.api_key,
            });

            setModels(prev => [...prev, { ...newModel, is_default: 0 }]);
            setNewModel({ id: "", model_name: "", base_url: "", api_key: "" });
            alert("New model added & tested");
        } catch (err: any) {
            alert(err.message || "Failed to add model");
        }
    };

    const setDefault = async (id: string) => {
        await window.api.setDefaultLLMModel(id);
        setModels(prev => prev.map(m => ({ ...m, is_default: m.id === id ? 1 : 0 })));
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">LLM Models</h1>

            <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg shadow-sm">
                    <thead className="bg-gray-50">
                    <tr className="text-left">
                        <th className="px-4 py-2 text-sm font-medium text-gray-600">ID</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-600">Model Name</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-600">Base URL</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-600">API Key</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-600">Default</th>
                        <th className="px-4 py-2 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {models.map(model => (
                        <tr key={model.id}>
                            <td className="px-4 py-2 font-mono">{model.id}</td>
                            <td className="px-4 py-2">
                                <input
                                    className="input input-bordered w-full"
                                    value={model.model_name}
                                    onChange={e =>
                                        setModels(prev =>
                                            prev.map(m => (m.id === model.id ? { ...m, model_name: e.target.value } : m))
                                        )
                                    }
                                />
                            </td>
                            <td className="px-4 py-2">
                                <input
                                    className="input input-bordered w-full"
                                    value={model.base_url}
                                    onChange={e =>
                                        setModels(prev =>
                                            prev.map(m => (m.id === model.id ? { ...m, base_url: e.target.value } : m))
                                        )
                                    }
                                />
                            </td>
                            <td className="px-4 py-2">
                                <input
                                    className="input input-bordered w-full"
                                    value={model.api_key}
                                    onChange={e =>
                                        setModels(prev =>
                                            prev.map(m => (m.id === model.id ? { ...m, api_key: e.target.value } : m))
                                        )
                                    }
                                />
                            </td>
                            <td className="px-4 py-2">
                                <input
                                    type="checkbox"
                                    checked={model.is_default === 1}
                                    className="h-4 w-4 text-green-500"
                                    onChange={() => setDefault(model.id)}
                                />
                            </td>
                            <td className="px-4 py-2 flex gap-2">
                                <button
                                    className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                                    disabled={savingId === model.id}
                                    onClick={() => saveModel(model)}
                                >
                                    <Save className="w-4 h-4" /> {savingId === model.id ? "Saving…" : "Save & Test"}
                                </button>
                                <button
                                    className="flex items-center gap-1 bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm"
                                    onClick={() =>
                                        window.api.testLLMModel({
                                            base_url: model.base_url,
                                            api_key: model.api_key,
                                            model_name: model.model_name,
                                        })
                                    }
                                >
                                    <Zap className="w-4 h-4 text-yellow-500" /> Test Only
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 border-t pt-4">
                <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-green-500" /> Add New Model
                </h2>
                <div className="grid grid-cols-4 gap-4 mt-2">
                    {/*<input*/}
                    {/*    className="input input-bordered w-full"*/}
                    {/*    placeholder="ID"*/}
                    {/*    value={newModel.id}*/}
                    {/*    onChange={e => setNewModel({ ...newModel, id: e.target.value })}*/}
                    {/*/>*/}
                    <input
                        className="input input-bordered w-full"
                        placeholder="Model Name"
                        value={newModel.model_name}
                        onChange={e => setNewModel({ ...newModel, model_name: e.target.value })}
                    />
                    <input
                        className="input input-bordered w-full"
                        placeholder="Base URL"
                        value={newModel.base_url}
                        onChange={e => setNewModel({ ...newModel, base_url: e.target.value })}
                    />
                    <input
                        className="input input-bordered w-full"
                        placeholder="API Key"
                        value={newModel.api_key}
                        onChange={e => setNewModel({ ...newModel, api_key: e.target.value })}
                    />
                </div>
                <button
                    className="mt-3 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                    onClick={addNewModel}
                >
                    <Check className="w-4 h-4" /> Add & Test
                </button>
            </div>
        </div>
    );
}

export default LLMSettingsPage;
