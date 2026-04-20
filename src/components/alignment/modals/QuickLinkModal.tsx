import React from 'react';
import { Modal } from 'antd';
import { LinkFormFields } from './LinkFormFields';
import { SelectedLinesDisplay } from './SelectedLinesDisplay';
import { getLinkType } from '../../../utils/linkHelpers';
import type { Line } from '../../../types/alignment';

interface QuickLinkModalProps {
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    pendingSourceIds: string[];
    pendingTargetIds: string[];
    sourceLines: Line[];
    targetLines: Line[];
    linkFormState: {
        confidence: number;
        strategy: string;
        comment: string;
    };
    setLinkFormState?: (state: { confidence: number; strategy: string; comment: string }) => void; // ADD THIS
}

export const QuickLinkModal: React.FC<QuickLinkModalProps> = ({
                                                                  visible,
                                                                  onConfirm,
                                                                  onCancel,
                                                                  pendingSourceIds,
                                                                  pendingTargetIds,
                                                                  sourceLines,
                                                                  targetLines,
                                                                  linkFormState,
                                                                  setLinkFormState, // ADD THIS
                                                              }) => {
    const linkType = getLinkType(pendingSourceIds.length, pendingTargetIds.length);

    return (
        <Modal
            title="Create Link (Quick Mode)"
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
            destroyOnClose
        >
            <div className="space-y-4">
                <SelectedLinesDisplay
                    sourceIds={pendingSourceIds}
                    targetIds={pendingTargetIds}
                    sourceLines={sourceLines}
                    targetLines={targetLines}
                    linkType={linkType}
                    variant="purple"
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