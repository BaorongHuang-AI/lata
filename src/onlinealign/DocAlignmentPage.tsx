import React, {useEffect, useState} from "react";
import {Form, Input, Button, Divider, Collapse, message} from "antd";
import { FileText, Languages, AlignLeft } from "lucide-react";
import DocumentMetadataPanel from "./DocumentMetadataPanel";
import {isRTL, validateMetadata} from "../utils/AlignUtils";
import { useParams } from "react-router-dom";
import {DocumentMeta} from "../types/database";
import { useNavigate } from "react-router-dom";

// import {useDocument} from "../renderer/hooks/useDocument";


const { TextArea } = Input;
const { Panel } = Collapse;
const DocAlignmentPage: React.FC = () => {
    const { documentId } = useParams<{ documentId: string }>();
    const [document, setDocument] = useState<Document | null>(null);
    const [form] = Form.useForm();
    const [errors, setErrors] = useState<string[]>([]);
    const [locked, setLocked] = useState(false);
    // const { document, loading, saving, saveDocument, updateDocument } = useDocument(documentId);
    const sourceMeta = Form.useWatch<DocumentMeta>("sourceMeta", form);
    const targetMeta = Form.useWatch<DocumentMeta>("targetMeta", form);
    const isExistingDoc = !!documentId;
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [alignLoading, setAlignLoading] = useState(false);


    useEffect(() => {
        if (!isExistingDoc) {
            localStorage.removeItem("aligner-meta-draft");
            form.resetFields();
        }

        setLoading(true);

        window.api
            .getDocumentWithMetadata(Number(documentId))
            .then((res) => {
                console.log("doc", res);
                setLoading(false);
                if (!res) return;
                setDocument(res.document);
                form.setFieldsValue({
                    sourceMeta: res.sourceMeta,
                    targetMeta: res.targetMeta,
                    sourceContent: res.document.source_content,
                    targetContent: res.document.target_content,
                });

                setLocked(res.document.status !== "draft");
            })
            .catch(console.error);
    }, [documentId, form]);
    /* =====================
       Auto-save metadata
    ===================== */
    useEffect(() => {
        if (isExistingDoc) return;

        const draft = localStorage.getItem("aligner-meta-draft");
        if (draft) {
            form.setFieldsValue(JSON.parse(draft));
        }
    }, [form, isExistingDoc]);

    useEffect(() => {
        if (isExistingDoc) return;

        const values = form.getFieldsValue();

        localStorage.setItem(
            "aligner-meta-draft",
            JSON.stringify(values)
        );
    }, [sourceMeta, targetMeta]);

    /* =====================
       Validation helpers
    ===================== */
    const isValid =
        !validateMetadata(sourceMeta, "Source").length &&
        !validateMetadata(targetMeta, "Target").length;

    const saveDocument = async () => {
        await form.validateFields();

        const values = form.getFieldsValue();

        const payload = {
            document: {
                title:
                    values.sourceMeta?.title + "_" +
                    values.targetMeta?.title,
                status: "draft",
                source_content: values.sourceContent,
                target_content: values.targetContent,
            },
            sourceMetadata: values.sourceMeta,
            targetMetadata: values.targetMeta,
        };

        if (documentId) {
            await window.api.updateDocumentWithMetadata(Number(documentId), payload);
            return documentId;
        } else {
            const newId = await window.api.saveDocumentWithMetadata(payload);
            return newId;
        }
    };


    const handleAlign = async () => {
        // if (!documentId) return;

        setAlignLoading(true);

        try {
            await form.validateFields();

            const sourceErrors = validateMetadata(sourceMeta, "Source document");
            const targetErrors = validateMetadata(targetMeta, "Target document");

            // const rtlWarnings: string[] = [];
            // if (isRTL(sourceMeta?.language) !== isRTL(targetMeta?.language)) {
            //     rtlWarnings.push("Source and Target language direction mismatch (RTL/LTR).");
            // }
            console.log(" errors", sourceErrors ,  targetErrors);
            const allErrors = [...sourceErrors, ...targetErrors];
            console.log("all errors", allErrors);

            if (allErrors.length > 0) {
                setErrors(allErrors);
                return;
            }

            setErrors([]);
            setLocked(true);

            // ✅ SAVE without navigation
            const savedId = await saveDocument();

            const values = form.getFieldsValue();

            await window.api.alignParas({
                documentId: Number(savedId),
                sourceText: values.sourceContent,
                targetText: values.targetContent,
            });

            message.success("Paragraph alignment started");
            navigate(`/alignpara/${savedId}`);
        } catch (e) {
            console.error(e);
            message.error("Failed to start alignment");
        } finally {
            setAlignLoading(false);
        }
    };

    // const handleAlign = async () => {
    //     if (!documentId) return;
    //     try {
    //         await form.validateFields(); // 🔴 highlight missing fields
    //     } catch {
    //         return;
    //     }
    //
    //     // console.log("Aligner input:", form.getFieldsValue());
    //     const sourceErrors = validateMetadata(sourceMeta, "Source document");
    //     const targetErrors = validateMetadata(targetMeta, "Target document");
    //
    //     const rtlWarnings: string[] = [];
    //     if (isRTL(sourceMeta?.language) !== isRTL(targetMeta?.language)) {
    //         rtlWarnings.push("Source and Target language direction mismatch (RTL/LTR).");
    //     }
    //
    //     const allErrors = [...sourceErrors, ...targetErrors, ...rtlWarnings];
    //
    //     if (allErrors.length > 0) {
    //         setErrors(allErrors);
    //         return;
    //     }
    //
    //     setErrors([]);
    //     setLocked(true); // 🔒 lock metadata
    //     await handleSave();
    //     const values = form.getFieldsValue();
    //     console.log("values", values);
    //     const sourceText = values.sourceContent;
    //     const targetText = values.targetContent;
    //
    //
    //     await window.api.alignParas({
    //         documentId,
    //         sourceText,
    //         targetText,
    //     });
    //
    //     message.success("Paragraph alignment started");
    //     navigate("/alignpara/" + documentId)
    //
    // };

    const handleSave = async () => {
        try {
            const id = await saveDocument();
            message.success("Document saved");
            navigate(`/aligner/${id}`);
        } catch (e) {
            console.error(e);
            message.error("Failed to save document");
        }
    };

    // const handleSave = async () => {
    //     try {
    //         await form.validateFields();
    //     } catch {
    //         return;
    //     }
    //
    //     const values = form.getFieldsValue();
    //
    //     const payload = {
    //         document: {
    //             title:
    //                 values.sourceMeta?.title + "_" +
    //                 values.targetMeta?.title,
    //             // status: locked ? "locked" : "draft",
    //             status:  "draft",
    //             source_content: values.sourceContent,
    //             target_content: values.targetContent
    //         },
    //         sourceMetadata: values.sourceMeta,
    //         targetMetadata: values.targetMeta,
    //     };
    //
    //     try {
    //         if (documentId) {
    //             await window.api.updateDocumentWithMetadata(Number(documentId), payload);
    //             message.success("Document updated");
    //             navigate(`/aligner/${documentId}`);
    //         } else {
    //             const newId = await window.api.saveDocumentWithMetadata(payload);
    //             message.success("Document saved");
    //              navigate(`/aligner/${newId}`);
    //         }
    //     } catch (e) {
    //         console.error(e);
    //         message.error("Failed to save document");
    //     }
    // };


    return (
        <div className="h-full bg-gray-100 p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <AlignLeft className="h-6 w-6 text-blue-600" />
                    <h1 className="text-xl font-semibold">Document Aligner</h1>
                    <p className="text-gray-500">
                        Document:  {document?.title}
                    </p>
                </div>

                {errors.length > 0 && (
                    <div className="alert alert-error">
                        <ul className="list-disc pl-5 text-sm">
                            {errors.map((e, i) => (
                                <li key={i}>{e}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <Form
                    form={form}
                    layout="vertical"
                    className="space-y-2"
                >
                    {/* ========== Metadata ========== */}
                    <Collapse defaultActiveKey={["allmeta"]} ghost className="rounded-md border">
                        <Panel
                            key="allmeta"
                            header={
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-lg">
                                        Document Metadata
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        (Source & Target)
                                    </span>
                                </div>
                            }
                        >
                            <div className="rounded-lg bg-white p-6 shadow-sm">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <DocumentMetadataPanel
                                        name="sourceMeta"
                                        title="Source Document Metadata"
                                        // disabled={locked}
                                    />

                                    <DocumentMetadataPanel
                                        name="targetMeta"
                                        title="Target Document Metadata"
                                        // disabled={locked}
                                    />
                                </div>
                            </div>
                        </Panel>
                    </Collapse>

                    {/* ========== Text Input ========== */}
                    <div className="rounded-lg bg-white p-6 m-3 shadow-sm">
                        <h2 className="mb-4 text-lg font-medium">Document Content</h2>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <Form.Item name="sourceContent" label="Source Document Text">
                                <TextArea
                                    rows={16}
                                    placeholder="Paste source document text here…"
                                    className="font-mono"
                                    dir={isRTL(sourceMeta?.language) ? "rtl" : "ltr"}
                                />
                            </Form.Item>

                            <Form.Item name="targetContent" label="Target Document Text">
                                <TextArea
                                    rows={16}
                                    placeholder="Paste target document text here…"
                                    className="font-mono"
                                    dir={isRTL(targetMeta?.language) ? "rtl" : "ltr"}
                                />
                            </Form.Item>
                        </div>
                    </div>

                    <Divider />

                    {/* ========== Actions ========== */}
                    <div className="flex justify-end gap-3">
                        <Button onClick={() => form.resetFields()}
                                loading={alignLoading}
                                className="btn btn-default"
                        >
                            Clear
                        </Button>
                        <Button
                            loading={alignLoading}
                            onClick={handleSave}
                            className="btn btn-secondary"
                            disabled={!isValid}
                        >
                            {documentId ? "Update" : "Save Draft"}
                        </Button>

                        <Button
                            loading={alignLoading}

                            className="
                            btn btn-primary
                          bg-blue-600 hover:bg-blue-700
                          text-white
                           rounded-md
                          disabled:bg-blue-400
                        "
                            disabled={!isValid}
                            onClick={handleAlign}
                        >
                            Run Alignment
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default DocAlignmentPage;
