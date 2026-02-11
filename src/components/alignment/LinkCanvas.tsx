// src/components/alignment/LinkCanvas.tsx
import React, { forwardRef, useEffect, useState } from 'react';
import { drawLinks } from '../../utils/linkDrawing';
import type { Line, Link, LinkingMode } from '../../types/alignment';

interface LinkCanvasProps {
    links: Link[];
    sourceLines: Line[];
    targetLines: Line[];
    hoveredLink?,
    setHoveredLink?,
    pendingSourceIds: string[];
    pendingTargetIds: string[];
    clickLinkingStep: 'idle' | 'source-selected' | 'target-selected';
    linkingMode: LinkingMode;
    selectedSourceIds: string[];
    selectedTargetIds: string[];
    linkConfidence: number;
    sourceContainerRef: React.RefObject<HTMLDivElement>;
    targetContainerRef: React.RefObject<HTMLDivElement>;
    onLinkClick: (linkId: string) => void; // Make sure this is here
}

export const LinkCanvas = forwardRef<SVGSVGElement, LinkCanvasProps>(
    (
        {
            links,
            sourceLines,
            targetLines,
            hoveredLink,
            setHoveredLink,
            pendingSourceIds,
            pendingTargetIds,
            clickLinkingStep,
            linkingMode,
            selectedSourceIds,
            selectedTargetIds,
            linkConfidence,
            sourceContainerRef,
            targetContainerRef,
            onLinkClick, // ADD THIS
        },
        ref
    ) => {
        const [, forceUpdate] = useState({});

        useEffect(() => {
            const handleUpdate = () => forceUpdate({});
            const initialTimer = setTimeout(handleUpdate, 500);

            const sourceContainer = sourceContainerRef.current;
            const targetContainer = targetContainerRef.current;

            window.addEventListener('resize', handleUpdate);
            sourceContainer?.addEventListener('scroll', handleUpdate);
            targetContainer?.addEventListener('scroll', handleUpdate);

            return () => {
                clearTimeout(initialTimer);
                window.removeEventListener('resize', handleUpdate);
                sourceContainer?.removeEventListener('scroll', handleUpdate);
                targetContainer?.removeEventListener('scroll', handleUpdate);
            };
        }, [links, pendingSourceIds, pendingTargetIds, clickLinkingStep, sourceContainerRef, targetContainerRef]);

        useEffect(() => {
            forceUpdate({});
        }, [sourceLines, targetLines, links]);

        const paths = drawLinks({
            links,
            sourceLines,
            targetLines,
            hoveredLink,
            onLinkClick,
            pendingSourceIds,
            pendingTargetIds,
            clickLinkingStep,
            linkingMode,
            selectedSourceIds,
            selectedTargetIds,
            linkConfidence,
            svgRef: ref as React.RefObject<SVGSVGElement>,
        });

        return (
            <svg
                ref={ref}
                className="absolute inset-0"
                style={{
                    zIndex: 50,
                    pointerEvents: 'none',
                    width: '100%',
                    height: '100%',
                }}
            >
                <g style={{ pointerEvents: 'auto' }}>{paths}</g>
            </svg>
        );
    }
);

LinkCanvas.displayName = 'LinkCanvas';