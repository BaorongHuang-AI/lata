// src/components/alignment/modals/LineNumberModal.tsx
import React from 'react';
import { Modal, Input } from 'antd';

interface LineNumberModalProps {
    visible: boolean;
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

export const LineNumberModal: React.FC<LineNumberModalProps> = ({
                                                                    visible,
                                                                    value,
                                                                    onChange,
                                                                    onSave,
                                                                    onCancel,
                                                                }) => {
    return (
        <Modal title="Edit Line Number" open={visible} onOk={onSave} onCancel={onCancel}
               okButtonProps={{
                   type: 'primary',
                   className: '!bg-blue-500 !border-blue-500 !text-white',
               }}
               okText="Save">
            <div className="space-y-3">
                <p className="text-sm text-gray-600">
                    Enter the line number ID (e.g., s1, s2, p1.s1). This will be used in the XML export.
                </p>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="e.g., s1"
                    className="font-mono"
                />
            </div>
        </Modal>
    );
};