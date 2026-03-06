import { useEffect, useState } from "react";
import { message } from "antd";
import { LLMRow } from "../types/llminterfaces";
import { Save, Zap, PlusCircle, Settings2, Eye, EyeOff, Loader2, Star } from "lucide-react";

const inputClass =
    "w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

const LLMSettingsPage = () => {
    const [models, setModels] = useState<LLMRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [showKey, setShowKey] = useState<Record<string, boolean>>({});
    const [showNewKey, setShowNewKey] = useState(false);
    const [newModel, setNewModel] = useState({ model_name: "", base_url: "", api_key: "" });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        window.api.getLLMModels().then((rows) => {
            setModels(rows);
            setLoading(false);
        });
    }, []);

    const updateField = (id: string, field: keyof LLMRow, value: string) => {
        setModels((prev) =>
            prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
        );
    };

    const saveModel = async (record: LLMRow) => {
        if (!record.base_url || !record.model_name || !record.api_key) {
            message.warning("Fill all fields before saving");
            return;
        }
        setSavingId(record.id);
        try {
            await window.api.testLLMModel({
                base_url: record.base_url,
                api_key: record.api_key,
                model_name: record.model_name,
            });
            await window.api.saveLLMModel({
                id: record.id,
                model_name: record.model_name,
                base_url: record.base_url,
                api_key: record.api_key,
            });
            message.success("Saved & tested successfully");
        } catch (err: any) {
            message.error(err.message || "Save/Test failed");
        } finally {
            setSavingId(null);
        }
    };

    const addNewModel = async () => {
        if (!newModel.model_name || !newModel.base_url || !newModel.api_key) {
            message.warning("Fill all fields to add a new model");
            return;
        }
        setAdding(true);
        try {
            await window.api.testLLMModel({
                base_url: newModel.base_url,
                api_key: newModel.api_key,
                model_name: newModel.model_name,
            });
            await window.api.encryptApiKey(newModel.api_key);
            await window.api.createLLMModel({
                model_name: newModel.model_name,
                base_url: newModel.base_url,
                api_key: newModel.api_key,
            });
            const rows = await window.api.getLLMModels();
            setModels(rows);
            setNewModel({ model_name: "", base_url: "", api_key: "" });
            message.success("Model added & tested successfully");
        } catch (err: any) {
            message.error(err.message || "Failed to add model");
        } finally {
            setAdding(false);
        }
    };

    const setDefault = async (id: string) => {
        await window.api.setDefaultLLMModel(id);
        setModels((prev) =>
            prev.map((m) => ({ ...m, is_default: m.id === id ? 1 : 0 }))
        );
        message.success("Default model updated");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading models…
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Settings2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">LLM Settings</h1>
                    <p className="text-sm text-gray-500">Configure AI models for alignment tasks</p>
                </div>
            </div>

            {/* Models table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-700">Configured Models</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {models.length} model{models.length !== 1 ? "s" : ""} configured
                    </p>
                </div>

                {models.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">
                        <Settings2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No models configured yet. Add one below.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">Model Name</th>
                                    <th className="px-4 py-3 text-left font-medium">Base URL</th>
                                    <th className="px-4 py-3 text-left font-medium">API Key</th>
                                    <th className="px-4 py-3 text-center font-medium">Default</th>
                                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {models.map((model) => (
                                    <tr
                                        key={model.id}
                                        className={`transition-colors ${
                                            model.is_default
                                                ? "bg-blue-50/40"
                                                : "hover:bg-gray-50/60"
                                        }`}
                                    >
                                        <td className="px-4 py-3 min-w-[160px]">
                                            <input
                                                className={inputClass}
                                                value={model.model_name}
                                                onChange={(e) =>
                                                    updateField(model.id, "model_name", e.target.value)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-3 min-w-[220px]">
                                            <input
                                                className={inputClass}
                                                value={model.base_url}
                                                onChange={(e) =>
                                                    updateField(model.id, "base_url", e.target.value)
                                                }
                                            />
                                        </td>
                                        <td className="px-4 py-3 min-w-[200px]">
                                            <div className="relative">
                                                <input
                                                    className={`${inputClass} pr-8`}
                                                    type={showKey[model.id] ? "text" : "password"}
                                                    value={model.api_key}
                                                    onChange={(e) =>
                                                        updateField(model.id, "api_key", e.target.value)
                                                    }
                                                />
                                                <button
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    onClick={() =>
                                                        setShowKey((prev) => ({
                                                            ...prev,
                                                            [model.id]: !prev[model.id],
                                                        }))
                                                    }
                                                >
                                                    {showKey[model.id] ? (
                                                        <EyeOff className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Eye className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => setDefault(model.id)}
                                                title={
                                                    model.is_default ? "Default model" : "Set as default"
                                                }
                                                className={`transition-colors ${
                                                    model.is_default
                                                        ? "text-yellow-500"
                                                        : "text-gray-300 hover:text-yellow-400"
                                                }`}
                                            >
                                                <Star
                                                    className="w-5 h-5"
                                                    fill={model.is_default ? "currentColor" : "none"}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-60 transition-colors"
                                                    disabled={savingId === model.id}
                                                    onClick={() => saveModel(model)}
                                                >
                                                    {savingId === model.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                    {savingId === model.id ? "Saving…" : "Save & Test"}
                                                </button>
                                                <button
                                                    className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 transition-colors"
                                                    onClick={() =>
                                                        window.api.testLLMModel({
                                                            base_url: model.base_url,
                                                            api_key: model.api_key,
                                                            model_name: model.model_name,
                                                        })
                                                    }
                                                >
                                                    <Zap className="w-3.5 h-3.5 text-yellow-500" />
                                                    Test
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add new model */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                    <PlusCircle className="w-5 h-5 text-green-500" />
                    <h2 className="font-semibold text-gray-700">Add New Model</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Model Name
                        </label>
                        <input
                            className={inputClass}
                            placeholder="e.g. gpt-4o-mini"
                            value={newModel.model_name}
                            onChange={(e) =>
                                setNewModel({ ...newModel, model_name: e.target.value })
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Base URL
                        </label>
                        <input
                            className={inputClass}
                            placeholder="e.g. https://api.openai.com/v1"
                            value={newModel.base_url}
                            onChange={(e) =>
                                setNewModel({ ...newModel, base_url: e.target.value })
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            API Key
                        </label>
                        <div className="relative">
                            <input
                                className={`${inputClass} pr-8`}
                                type={showNewKey ? "text" : "password"}
                                placeholder="sk-…"
                                value={newModel.api_key}
                                onChange={(e) =>
                                    setNewModel({ ...newModel, api_key: e.target.value })
                                }
                            />
                            <button
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowNewKey((v) => !v)}
                            >
                                {showNewKey ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-md text-sm font-medium disabled:opacity-60 transition-colors"
                        onClick={addNewModel}
                        disabled={adding}
                    >
                        {adding ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <PlusCircle className="w-4 h-4" />
                        )}
                        {adding ? "Adding…" : "Add & Test"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LLMSettingsPage;
