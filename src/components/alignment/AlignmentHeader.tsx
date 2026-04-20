// src/components/alignment/AlignmentHeader.tsx
import React from 'react';
import { Button, Radio, Popover } from 'antd';
import {
    Undo,
    Redo,
    Type,
    FileText,
    Download,
    LinkIcon,
    X,
    MousePointer2,
    Hand,
} from 'lucide-react';
import { FontSettingsPopover } from './FontSettingsPopover';
import type { AlignmentMetadata, FontSettings, LinkingMode } from '../../types/alignment';
import {DocumentMetadata} from "../../utils/AlignUtils";
interface AlignmentHeaderProps {
    alignmentType: string,
    sourceMetadata: DocumentMetadata;
    targetMetadata: DocumentMetadata;
    linkingMode: LinkingMode;
    setLinkingMode: (mode: LinkingMode) => void;
    clickLinkingStep: 'idle' | 'source-selected' | 'target-selected';
    pendingSourceIds: string[];
    pendingTargetIds: string[];
    selectedSourceIds: string[];
    selectedTargetIds: string[];
    historyIndex: number;
    historyLength: number;
    undo: () => void;
    redo: () => void;
    cancelClickLinking: () => void;
    setSelectedSourceIds: (ids: string[]) => void;
    setSelectedTargetIds: (ids: string[]) => void;
    onMetadataClick: () => void;
    // onFontSettingsClick: () => void;
    onExport: () => void;
    onAlignSentence: () => void;
    fontSettings: FontSettings;
    setFontSettings: (settings: FontSettings | ((prev: FontSettings) => FontSettings)) => void;
    onCreateLink: () => void; // ADD THIS
    onMarkCompleted: () => void;
}

export const AlignmentHeader: React.FC<AlignmentHeaderProps> = ({
                                                                    alignmentType,
                                                                    sourceMetadata,
                                                                    targetMetadata,
                                                                    linkingMode,
                                                                    setLinkingMode,
                                                                    clickLinkingStep,
                                                                    pendingSourceIds,
                                                                    pendingTargetIds,
                                                                    selectedSourceIds,
                                                                    selectedTargetIds,
                                                                    historyIndex,
                                                                    historyLength,
                                                                    undo,
                                                                    redo,
                                                                    cancelClickLinking,
                                                                    setSelectedSourceIds,
                                                                    setSelectedTargetIds,
                                                                    onMetadataClick,
                                                                    onExport,
                                                                    onAlignSentence,
                                                                    fontSettings,
                                                                    setFontSettings,
                                                                    onCreateLink, // ADD THIS
                                                                    onMarkCompleted
                                                                }) => {
    return (
        <>
            <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Parallel Text Aligner</h1>
                        <p className="text-sm text-gray-500 mt-1">
    <span className="truncate inline-block max-w-xs align-bottom">
      {sourceMetadata.title}
    </span>
                            {' '}↔{' '}
                            <span className="truncate inline-block max-w-xs align-bottom">
      {targetMetadata.title}
    </span>
                        </p>
                    </div>

                    <div className="flex gap-2 items-center">
                        <LinkingModeSelector
                            mode={linkingMode}
                            onChange={(mode) => {
                                setLinkingMode(mode);
                                if (mode === 'manual') {
                                    cancelClickLinking();
                                } else {
                                    setSelectedSourceIds([]);
                                    setSelectedTargetIds([]);
                                }
                            }}
                        />

                        <Button
                            icon={<Undo size={16} />}
                            onClick={undo}
                            disabled={historyIndex === 0}
                            title="Undo (Ctrl+Z)"
                        >
                            Undo
                        </Button>

                        <Button
                            icon={<Redo size={16} />}
                            onClick={redo}
                            disabled={historyIndex === historyLength - 1}
                            title="Redo (Ctrl+Y)"
                        >
                            Redo
                        </Button>

                        <FontSettingsPopover
                            fontSettings={fontSettings}
                            setFontSettings={setFontSettings}
                        />

                        <Button icon={<FileText size={16} />} onClick={onMetadataClick}>
                            Metadata
                        </Button>
                        {alignmentType == 'para' && < Button type="default" icon={<Download size={16} />} onClick={onAlignSentence}>
                            Align Sentences
                            </Button>
                        }
                        <Button
                            type="default"
                            onClick={onMarkCompleted}
                        >
                            Mark Completed
                        </Button>
                        <Button type="default" icon={<Download size={16} />} onClick={onExport}>
                            Export
                        </Button>

                        {linkingMode === 'manual' && (
                            <ManualModeControls
                                selectedSourceIds={selectedSourceIds}
                                selectedTargetIds={selectedTargetIds}
                                onCreateLink={onCreateLink} // ADD THIS
                                onClearSelection={() => {
                                    setSelectedSourceIds([]);
                                    setSelectedTargetIds([]);
                                }}
                            />
                        )}

                        {linkingMode === 'click' && clickLinkingStep !== 'idle' && (
                            <Button danger icon={<X size={16} />} onClick={cancelClickLinking}>
                                Cancel Linking
                            </Button>
                        )}
                    </div>
                </div>

                {linkingMode === 'click' && (
                    <ClickModeInstructions
                        step={clickLinkingStep}
                        sourceCount={pendingSourceIds.length}
                        targetCount={pendingTargetIds.length}
                    />
                )}
            </div>
        </>
    );
};

const LinkingModeSelector: React.FC<{
    mode: LinkingMode;
    onChange: (mode: LinkingMode) => void;
}> = ({ mode, onChange }) => (
    <div className="flex items-center gap-2 mr-4 px-3 py-1 bg-gray-100 rounded-lg">
        {/*<span className="text-sm font-medium text-gray-700">Mode:</span>*/}
        <Radio.Group
            value={mode}
            onChange={(e) => onChange(e.target.value)}
            size="small"
            style={{ display: 'flex', flexWrap: 'nowrap' }}
        >
            <Radio.Button value="click" className="text-xs py-0">
                <MousePointer2 size={10} className="inline mr-1" />
                Click
            </Radio.Button>
            <Radio.Button value="manual" className="text-xs py-0">
                <Hand size={10} className="inline mr-1" />
                Manual
            </Radio.Button>
        </Radio.Group>
    </div>
);

const ManualModeControls: React.FC<{
    selectedSourceIds: string[];
    selectedTargetIds: string[];
    onCreateLink: () => void; // ADD THIS
    onClearSelection: () => void;
}> = ({ selectedSourceIds, selectedTargetIds, onCreateLink, onClearSelection }) => (
    <>
        <Button
            type="default"
            icon={<LinkIcon size={16} />}
            disabled={selectedSourceIds.length === 0 || selectedTargetIds.length === 0}
            onClick={onCreateLink} // ADD THIS
        >
            Link ({selectedSourceIds.length} ↔ {selectedTargetIds.length})
        </Button>
        <Button
            icon={<X size={16} />}
            onClick={onClearSelection}
            disabled={selectedSourceIds.length === 0 && selectedTargetIds.length === 0}
        >
            Clear
        </Button>
    </>
);

const ClickModeInstructions: React.FC<{
    step: 'idle' | 'source-selected' | 'target-selected';
    sourceCount: number;
    targetCount: number;
}> = ({ step, sourceCount, targetCount }) => {
    const getMessage = () => {
        switch (step) {
            case 'idle':
                return '💡 Click a source line to start creating a link';
            case 'source-selected':
                return `✅ Source selected (${sourceCount}). Click a target line to continue.`;
            case 'target-selected':
                return `✅ Target selected (${targetCount}). Configure link settings below.`;
        }
    };

    return (
        <div className="mt-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-900">
                {getMessage()}
                {step !== 'idle' && ' (Press ESC to cancel)'}
            </p>
        </div>
    );
};