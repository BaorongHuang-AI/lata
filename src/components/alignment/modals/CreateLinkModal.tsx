// src/components/alignment/modals/CreateLinkModal.tsx
import React from 'react';
import { Modal } from 'antd';
import { LinkFormFields } from './LinkFormFields';
import { SelectedLinesDisplay } from './SelectedLinesDisplay';
import { getLinkType } from '../../../utils/linkHelpers';
import type { Line } from '../../../types/alignment';

interface CreateLinkModalProps {
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    selectedSourceIds: string[];
    selectedTargetIds: string[];
    sourceLines: Line[];
    targetLines: Line[];
    linkFormState: {
        confidence: number;
        strategy: string;
        comment: string;
    };
    setLinkFormState: any,
}

export const CreateLinkModal: React.FC<CreateLinkModalProps> = ({
                                                                    visible,
                                                                    onConfirm,
                                                                    onCancel,
                                                                    selectedSourceIds,
                                                                    selectedTargetIds,
                                                                    sourceLines,
                                                                    targetLines,
                                                                    linkFormState,
                                                                    setLinkFormState, // ADD THIS
                                                                }) => {
    const linkType = getLinkType(selectedSourceIds.length, selectedTargetIds.length);

    return (
        <Modal
            title="Create Link"
            open={visible}
            onOk={onConfirm}
            onCancel={onCancel}
            okText="Create Link"
            width={600}
            okButtonProps={{
                type: 'primary',
                className: '!bg-blue-500 !border-blue-500 !text-white',
            }}
            // style={{ zIndex: 10001 }}
            // maskStyle={{ zIndex: 10000 }}
        >
            <div className="space-y-4">
                <SelectedLinesDisplay
                    sourceIds={selectedSourceIds}
                    targetIds={selectedTargetIds}
                    sourceLines={sourceLines}
                    targetLines={targetLines}
                    linkType={linkType}
                    variant="gray"
                />

                <LinkFormFields
                    linkFormState={linkFormState}
                    onConfidenceChange={(value) =>
                        setLinkFormState?.({ ...linkFormState, confidence: value })
                    }
                    onStrategyChange={(value) =>
                        setLinkFormState?.({ ...linkFormState, strategy: value })
                    }
                    onCommentChange={(value) =>
                        setLinkFormState?.({ ...linkFormState, comment: value })
                    }
                />
            </div>
        </Modal>
    );
};