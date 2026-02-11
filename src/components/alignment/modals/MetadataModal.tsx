// src/components/alignment/modals/MetadataModal.tsx
import React from 'react';
import { Modal, Form, Input } from 'antd';
import type { AlignmentMetadata } from '../../../types/alignment';

const { TextArea } = Input;

interface MetadataModalProps {
    visible: boolean;
    metadata: AlignmentMetadata;
    onChange: (metadata: AlignmentMetadata) => void;
    onClose: () => void;
}

export const MetadataModal: React.FC<MetadataModalProps> = ({
                                                                visible,
                                                                metadata,
                                                                onChange,
                                                                onClose,
                                                            }) => {
    const handleChange = (field: keyof AlignmentMetadata, value: string) => {
        onChange({ ...metadata, [field]: value });
    };

    return (
        <Modal
            title="Document Metadata"
    open={visible}
    onOk={onClose}
    onCancel={onClose}
    width={700}
            okButtonProps={{
                type: 'primary',
                className: '!bg-blue-500 !border-blue-500 !text-white',
            }}
    >
    <Form layout="vertical">
    <div className="grid grid-cols-2 gap-4">
    <Form.Item label="Source Title">
    <Input
        value={metadata.sourceTitle}
    onChange={(e) => handleChange('sourceTitle', e.target.value)}
    />
    </Form.Item>

    <Form.Item label="Target Title">
    <Input
        value={metadata.targetTitle}
    onChange={(e) => handleChange('targetTitle', e.target.value)}
    />
    </Form.Item>

    <Form.Item label="Source Language">
    <Input
        value={metadata.sourceLang}
    onChange={(e) => handleChange('sourceLang', e.target.value)}
    placeholder="e.g., en"
        />
        </Form.Item>

        <Form.Item label="Target Language">
    <Input
        value={metadata.targetLang}
    onChange={(e) => handleChange('targetLang', e.target.value)}
    placeholder="e.g., fr"
        />
        </Form.Item>

        <Form.Item label="Source Document">
    <Input
        value={metadata.sourceDoc}
    onChange={(e) => handleChange('sourceDoc', e.target.value)}
    placeholder="e.g., en_source.xml"
        />
        </Form.Item>

        <Form.Item label="Target Document">
    <Input
        value={metadata.targetDoc}
    onChange={(e) => handleChange('targetDoc', e.target.value)}
    placeholder="e.g., fr_target.xml"
        />
        </Form.Item>

        <Form.Item label="Source Author">
    <Input
        value={metadata.sourceAuthor}
    onChange={(e) => handleChange('sourceAuthor', e.target.value)}
    />
    </Form.Item>

    <Form.Item label="Translator">
    <Input
        value={metadata.translator}
    onChange={(e) => handleChange('translator', e.target.value)}
    />
    </Form.Item>
    </div>

    <Form.Item label="Strategy Profile">
    <TextArea
        rows={2}
    value={metadata.strategyProfile}
    onChange={(e) => handleChange('strategyProfile', e.target.value)}
    />
    </Form.Item>
    </Form>
    </Modal>
);
};