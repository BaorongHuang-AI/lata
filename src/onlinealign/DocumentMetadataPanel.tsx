import React, {useState} from "react";
import {Form, Input, DatePicker, Collapse, Select} from "antd";
import { FileText } from "lucide-react";
import {DOMAIN_OPTIONS, LANGUAGE_OPTIONS} from "../utils/Constants";

const { Panel } = Collapse;

interface DocumentMetadataPanelProps {
    /** form field prefix, e.g. "sourceMeta" | "targetMeta" */
    name: string;
    /** panel title shown to user */
    title: string;
    /** whether expanded by default */
    defaultOpen?: boolean;
}
const DOCUMENT_TYPE_OPTIONS = [
    { label: 'Article', value: 'article' },
    { label: 'Book', value: 'book' },
    { label: 'Report', value: 'report' },
    { label: 'White Paper', value: 'whitepaper' },
    { label: 'Technical Documentation', value: 'technical' },
    { label: 'Legal Document', value: 'legal' },
    { label: 'Academic Paper', value: 'academic' },
    { label: 'Web Content', value: 'web' },
    { label: 'Marketing Material', value: 'marketing' },
    { label: 'Other', value: 'other' },
];

const LICENSE_OPTIONS = [
    { label: 'All Rights Reserved', value: 'arr' },
    { label: 'CC BY (Attribution)', value: 'cc-by' },
    { label: 'CC BY-SA (ShareAlike)', value: 'cc-by-sa' },
    { label: 'CC BY-ND (No Derivatives)', value: 'cc-by-nd' },
    { label: 'CC BY-NC (Non-Commercial)', value: 'cc-by-nc' },
    { label: 'Public Domain', value: 'public' },
    { label: 'MIT License', value: 'mit' },
    { label: 'Apache 2.0', value: 'apache' },
];

const ACCESS_LEVEL_OPTIONS = [
    { label: '🌍 Public', value: 'public' },
    { label: '🏢 Internal', value: 'internal' },
    { label: '🔒 Confidential', value: 'confidential' },
    { label: '🔐 Restricted', value: 'restricted' },
];

// ==================== Component ====================

const DocumentMetadataPanel: React.FC<DocumentMetadataPanelProps> = ({
                                                                         name,
                                                                         title,
                                                                         defaultOpen = true,
                                                                     }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

    return (
        <div className="rounded-md border border-gray-200 p-4">
            <h3 className="mb-4 text-base font-semibold text-gray-700">
                {title}
            </h3>

            {/* ==================== Basic Fields ==================== */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Form.Item name={[name, "title"]} label="Title"
                           rules={[{ required: true, message: "Title is required" }]}>
                    <Input placeholder="Document title" />
                </Form.Item>


                <Form.Item name={[name, "source"]} label="Source"
                           rules={[{ required: true, message: "Source is required" }]}>
                    <Input placeholder="e.g. Journal, Website, Organization" />
                </Form.Item>
                <Form.Item name={[name, "language"]} label="Language"
                           rules={[{ required: true, message: "Language is required" }]}>
                    <Select
                        options={LANGUAGE_OPTIONS}
                        placeholder="Select language"
                        showSearch
                        optionFilterProp="label"
                    />
                </Form.Item>

                <Form.Item name={[name, "domain"]} label="Domain"
                           rules={[{ required: true, message: "Domain is required" }]}>
                    <Select
                        options={DOMAIN_OPTIONS}
                        placeholder="Select domain"
                        showSearch
                        optionFilterProp="label"
                    />
                </Form.Item>
                {/* ✅ Document Type */}
                <Form.Item name={[name, "documentType"]} label="Document Type">
                    <Select
                        options={DOCUMENT_TYPE_OPTIONS}
                        placeholder="Select type"
                        showSearch
                        optionFilterProp="label"
                    />
                </Form.Item>
                <Form.Item name={[name, "publisher"]} label="Publisher">
                    <Input placeholder="Publisher / Institution" />
                </Form.Item>

            </div>

            {/* ==================== Advanced Fields (Collapsible) ==================== */}
            <div className="mt-4">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                    {showAdvanced ? '▼' : '▶'} Advanced Fields
                </button>

                {showAdvanced && (
                    <div className="mt-4 grid grid-cols-1 gap-4 rounded-md bg-gray-50 p-4 md:grid-cols-2">


                        <Form.Item name={[name, "publishDate"]} label="Publish Date">
                            <DatePicker className="w-full" />
                        </Form.Item>

                        {/* ✅ Version */}
                        <Form.Item name={[name, "version"]} label="Version">
                            <Input placeholder="e.g. 1.0, v2.3, Draft" />
                        </Form.Item>




                        {/* ✅ Author (supports multiple) */}
                        <Form.Item
                            name={[name, "authors"]}
                            label="Author(s)"
                            tooltip="Separate multiple authors with commas"
                        >
                            <Select
                                mode="tags"
                                placeholder="Enter author names"
                                style={{ width: '100%' }}
                                tokenSeparators={[',']}
                            />
                        </Form.Item>

                        {/* ✅ Translator (supports multiple) */}
                        <Form.Item
                            name={[name, "translators"]}
                            label="Translator(s)"
                            tooltip="Separate multiple translators with commas"
                        >
                            <Select
                                mode="tags"
                                placeholder="Enter translator names"
                                style={{ width: '100%' }}
                                tokenSeparators={[',']}
                            />
                        </Form.Item>

                        {/* ✅ Keywords/Tags */}
                        <Form.Item
                            name={[name, "keywords"]}
                            label="Keywords / Tags"
                            className="md:col-span-2"
                            tooltip="Add tags for better searchability"
                        >
                            <Select
                                mode="tags"
                                placeholder="Add keywords (press Enter to add)"
                                style={{ width: '100%' }}
                            />
                        </Form.Item>

                        {/* Academic/Publication Fields */}
                        <Form.Item name={[name, "doi"]} label="DOI">
                            <Input placeholder="10.1000/xyz123" />
                        </Form.Item>

                        <Form.Item name={[name, "isbn"]} label="ISBN / ISSN">
                            <Input placeholder="ISBN or ISSN number" />
                        </Form.Item>

                        <Form.Item name={[name, "volume"]} label="Volume">
                            <Input placeholder="e.g. 42" />
                        </Form.Item>

                        <Form.Item name={[name, "issue"]} label="Issue">
                            <Input placeholder="e.g. 3" />
                        </Form.Item>

                        <Form.Item name={[name, "pageRange"]} label="Page Range">
                            <Input placeholder="e.g. 123-145" />
                        </Form.Item>

                        <Form.Item name={[name, "edition"]} label="Edition">
                            <Input placeholder="e.g. 2nd Edition" />
                        </Form.Item>

                        {/* Source & Origin */}
                        <Form.Item name={[name, "originalLanguage"]} label="Original Language">
                            <Select
                                options={LANGUAGE_OPTIONS}
                                placeholder="If translated"
                                showSearch
                                allowClear
                            />
                        </Form.Item>

                        <Form.Item name={[name, "country"]} label="Country of Origin">
                            <Input placeholder="e.g. United States" />
                        </Form.Item>

                        <Form.Item
                            name={[name, "url"]}
                            label="Source URL"
                            className="md:col-span-2"
                        >
                            <Input placeholder="https://..." />
                        </Form.Item>

                        {/* Rights & Legal */}
                        <Form.Item name={[name, "copyrightHolder"]} label="Copyright Holder">
                            <Input placeholder="Copyright owner" />
                        </Form.Item>

                        <Form.Item name={[name, "license"]} label="License">
                            <Select
                                options={LICENSE_OPTIONS}
                                placeholder="Select license"
                                showSearch
                                allowClear
                            />
                        </Form.Item>

                        <Form.Item name={[name, "accessLevel"]} label="Access Level">
                            <Select
                                options={ACCESS_LEVEL_OPTIONS}
                                placeholder="Select access level"
                            />
                        </Form.Item>

                        {/* Additional Contributors */}
                        <Form.Item
                            name={[name, "editors"]}
                            label="Editor(s)"
                        >
                            <Select
                                mode="tags"
                                placeholder="Enter editor names"
                                tokenSeparators={[',']}
                            />
                        </Form.Item>

                        <Form.Item
                            name={[name, "contributors"]}
                            label="Contributors"
                            className="md:col-span-2"
                        >
                            <Select
                                mode="tags"
                                placeholder="Other contributors"
                                tokenSeparators={[',']}
                            />
                        </Form.Item>
                    </div>
                )}
            </div>

            {/* ==================== Notes ==================== */}
            <div className="mt-4">
                <Form.Item
                    name={[name, "notes"]}
                    label="Notes / Other Info"
                >
                    <Input.TextArea
                        rows={3}
                        placeholder="Optional metadata notes"
                    />
                </Form.Item>
            </div>
        </div>
    );
};

export default DocumentMetadataPanel;