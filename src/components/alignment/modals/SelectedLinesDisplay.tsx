// src/components/alignment/modals/SelectedLinesDisplay.tsx
import React from 'react';
import type { Line } from '../../../types/alignment';

interface SelectedLinesDisplayProps {
    sourceIds: string[];
    targetIds: string[];
    sourceLines: Line[];
    targetLines: Line[];
    linkType: string;
    variant: 'purple' | 'gray';
}

export const SelectedLinesDisplay: React.FC<SelectedLinesDisplayProps> = ({
                                                                              sourceIds,
                                                                              targetIds,
                                                                              sourceLines,
                                                                              targetLines,
                                                                              linkType,
                                                                              variant,
                                                                          }) => {
    const bgColor = variant === 'purple' ? 'bg-purple-50' : 'bg-gray-50';
    const borderColor = variant === 'purple' ? 'border-purple-200' : 'border-gray-200';
    const textColor = variant === 'purple' ? 'text-purple-700' : 'text-gray-600';

    return (
        <div className={`${bgColor} p-3 rounded border ${borderColor}`}>
            <p className="text-sm font-medium text-gray-700 mb-2">Selected Lines:</p>
            <div className="font-mono text-xs space-y-1">
                <div>
                    <span className="text-blue-600 font-semibold">Source: </span>
                    {sourceIds.map((id) => sourceLines.find((l) => l.id === id)?.lineNumber).join(', ')}
                </div>
                <div>
                    <span className="text-green-600 font-semibold">Target: </span>
                    {targetIds.map((id) => targetLines.find((l) => l.id === id)?.lineNumber).join(', ')}
                </div>
            </div>
            <p className={`text-xs ${textColor} mt-2`}>
                Link Type: <strong>{linkType}</strong> ({sourceIds.length} source
                {sourceIds.length > 1 ? 's' : ''} ↔ {targetIds.length} target
                {targetIds.length > 1 ? 's' : ''})
            </p>
        </div>
    );
};