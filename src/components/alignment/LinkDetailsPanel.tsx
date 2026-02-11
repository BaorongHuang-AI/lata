// src/components/alignment/LinkDetailsPanel.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Button } from 'antd';
import { LinkIcon, X, Star, StarOff, Trash2 } from 'lucide-react';
import { getConfidenceColor, getConfidenceLabel } from '../../utils/confidence';
import { getOptimalPosition } from '../../utils/linkHelpers';
import type { Link, Line } from '../../types/alignment';

interface LinkDetailsPanelProps {
    link: Link;
    sourceLines: Line[];
    targetLines: Line[];
    mousePosition: { x: number; y: number };
    onClose: () => void;
    onToggleFavorite: (linkId: string) => void;
    onDelete: (linkId: string) => void;
}

export const LinkDetailsPanel: React.FC<LinkDetailsPanelProps> = ({
                                                                      link,
                                                                      sourceLines,
                                                                      targetLines,
                                                                      mousePosition,
                                                                      onClose,
                                                                      onToggleFavorite,
                                                                      onDelete,
                                                                  }) => {
    const [isPanelHovered, setIsPanelHovered] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    const position = getOptimalPosition(mousePosition.x, mousePosition.y);

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current);
        }
        setIsPanelHovered(true);
    };

    const handleMouseLeave = () => {
        setIsPanelHovered(false);
        onClose();
    };

    const handleDelete = () => {
        onDelete(link.id);
        onClose();
    };

    return (
        <div
            className="link-details-panel fixed bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-96"
            style={{
                zIndex: 10000,
                left: `${position.left}px`,
                top: `${position.top}px`,
                pointerEvents: 'auto',
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <LinkDetailsHeader onClose={onClose} />
            <LinkDetailsContent
                link={link}
                sourceLines={sourceLines}
                targetLines={targetLines}
            />
            <LinkDetailsActions
                link={link}
                onToggleFavorite={() => onToggleFavorite(link.id)}
                onDelete={handleDelete}
            />
        </div>
    );
};

const LinkDetailsHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <LinkIcon size={16} />
            Link Details
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={16} />
        </button>
    </div>
);

const LinkDetailsContent: React.FC<{
    link: Link;
    sourceLines: Line[];
    targetLines: Line[];
}> = ({ link, sourceLines, targetLines }) => (
    <div className="space-y-3 text-sm">
        <AlignmentInfo link={link} sourceLines={sourceLines} targetLines={targetLines} />
        <ConfidenceInfo confidence={link.confidence} />
        {link.strategy && <StrategyInfo strategy={link.strategy} />}
        {link.comment && <CommentInfo comment={link.comment} />}
    </div>
);

const AlignmentInfo: React.FC<{
    link: Link;
    sourceLines: Line[];
    targetLines: Line[];
}> = ({ link, sourceLines, targetLines }) => (
    <div>
        <p className="text-xs text-gray-500 mb-1">Alignment</p>
        <div className="font-mono text-xs bg-gray-50 p-2 rounded">
            {link.sourceIds.map((id) => sourceLines.find((l) => l.id === id)?.lineNumber).join(' ')}
            {' ↔ '}
            {link.targetIds.map((id) => targetLines.find((l) => l.id === id)?.lineNumber).join(' ')}
        </div>
        <p className="text-xs text-gray-600 mt-1">
            {link.sourceIds.length} source ↔ {link.targetIds.length} target
        </p>
    </div>
);

const ConfidenceInfo: React.FC<{ confidence: number }> = ({ confidence }) => (
    <div>
        <p className="text-xs text-gray-500 mb-1">Confidence</p>
        <span
            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
            style={{ backgroundColor: getConfidenceColor(confidence) }}
        >
      {getConfidenceLabel(confidence)} ({(confidence * 100).toFixed(0)}%)
    </span>
    </div>
);

const StrategyInfo: React.FC<{ strategy: string }> = ({ strategy }) => (
    <div>
        <p className="text-xs text-gray-500 mb-1">Strategy</p>
        <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded border border-blue-200">
            {strategy}
        </p>
    </div>
);

const CommentInfo: React.FC<{ comment: string }> = ({ comment }) => (
    <div>
        <p className="text-xs text-gray-500 mb-1">Comment</p>
        <p className="text-sm text-gray-700 bg-amber-50 p-2 rounded border border-amber-200">
            {comment}
        </p>
    </div>
);

const LinkDetailsActions: React.FC<{
    link: Link;
    onToggleFavorite: () => void;
    onDelete: () => void;
}> = ({ link, onToggleFavorite, onDelete }) => (
    <div className="flex gap-2 pt-2 border-t mt-3">
        <Button
            size="small"
            icon={link.isFavorite ? <Star size={14} /> : <StarOff size={14} />}
            onClick={onToggleFavorite}
            type={link.isFavorite ? 'primary' : 'default'}
        >
            {link.isFavorite ? 'Favorited' : 'Favorite'}
        </Button>
        <Button size="small" danger icon={<Trash2 size={14} />} onClick={onDelete}>
            Delete
        </Button>
    </div>
);