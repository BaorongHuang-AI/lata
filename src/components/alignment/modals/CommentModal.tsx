// src/components/alignment/modals/CommentModal.tsx
import React from 'react';
import { Modal, Input } from 'antd';

const { TextArea } = Input;

interface CommentModalProps {
    visible: boolean;
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({
                                                              visible,
                                                              value,
                                                              onChange,
                                                              onSave,
                                                              onCancel,
                                                          }) => {
    return (
        <Modal title="Edit Comment" open={visible} onOk={onSave}
               onCancel={onCancel} okText="Save"
               okButtonProps={{
                   type: 'primary',
                   className: '!bg-blue-500 !border-blue-500 !text-white',
               }}
        >
            <TextArea
                rows={4}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter comment..."
            />
        </Modal>
    );
};