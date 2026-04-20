// src/utils/linkDrawing.tsx
import React from 'react';
import { getConfidenceColor } from './confidence';
import { getLinkType } from './linkHelpers';
import type { Line, Link, LinkingMode } from '../types/alignment';
const drawnPaths: JSX.Element[] = [];
const mapLineNumberToId = (lineNumber: string, lines: Line[]): string | null => {
    const line = lines.find(l => l.lineNumber === lineNumber);
    return line?.id || null;
};
interface DrawLinksParams {
    links: Link[];
    sourceLines: Line[];
    targetLines: Line[];
    hoveredLink: string | null;
    onLinkClick: (linkId: string) => void; // ADD THIS
    pendingSourceIds: string[];
    pendingTargetIds: string[];
    clickLinkingStep: 'idle' | 'source-selected' | 'target-selected';
    linkingMode: LinkingMode;
    selectedSourceIds: string[];
    selectedTargetIds: string[];
    linkConfidence: number;
    svgRef: React.RefObject<SVGSVGElement>;
}

export const drawLinks = ({
                              links,
                              sourceLines,
                              targetLines,
                              hoveredLink,
                              onLinkClick, // ADD THIS
                              pendingSourceIds,
                              pendingTargetIds,
                              clickLinkingStep,
                              linkingMode,
                              selectedSourceIds,
                              selectedTargetIds,
                              linkConfidence,
                              svgRef,
                          }: DrawLinksParams): JSX.Element[] => {
    const allLinks = [...links];

    // Add pending link if in progress
    if (
        clickLinkingStep === 'target-selected' &&
        pendingSourceIds.length > 0 &&
        pendingTargetIds.length > 0
    ) {
        allLinks.push({
            id: 'pending',
            sourceIds: pendingSourceIds,
            targetIds: pendingTargetIds,
            confidence: linkConfidence,
            isFavorite: false,
        });
    }

    // Remove duplicate links
    const uniqueLinks = allLinks.filter(
        (link, index, self) => index === self.findIndex((l) => l.id === link.id)
    );

    const drawnPaths: JSX.Element[] = [];

    uniqueLinks.forEach((link, linkIndex) => {
        const isPending = link.id === 'pending';
        const isHovered = hoveredLink === link.id;
        const isSourceSelected = link.sourceIds.some((id) =>
            linkingMode === 'manual' ? selectedSourceIds.includes(id) : false
        );
        const isTargetSelected = link.targetIds.some((id) =>
            linkingMode === 'manual' ? selectedTargetIds.includes(id) : false
        );
        const isHighlighted = isHovered || isSourceSelected || isTargetSelected || isPending;

        // Get all source and target positions

        const sourcePositions = link.sourceIds
            .map((idOrLineNumber) => {
                // Try as ID first, then as line number
                const id = sourceLines.find(l => l.id === idOrLineNumber)
                    ? idOrLineNumber
                    : mapLineNumberToId(idOrLineNumber, sourceLines);
                return id ? getLinePosition('source', id, svgRef) : null;
            })
            .filter(Boolean) as { x: number; y: number }[];

        const targetPositions = link.targetIds
            .map((idOrLineNumber) => {
                // Try as ID first, then as line number
                const id = targetLines.find(l => l.id === idOrLineNumber)
                    ? idOrLineNumber
                    : mapLineNumberToId(idOrLineNumber, targetLines);
                return id ? getLinePosition('target', id, svgRef) : null;
            })
            .filter(Boolean) as { x: number; y: number }[];
        // const sourcePositions = link.sourceIds
        //     .map((id) => getLinePosition('source', id, svgRef))
        //     .filter(Boolean) as { x: number; y: number }[];
        //
        // const targetPositions = link.targetIds
        //     .map((id) => getLinePosition('target', id, svgRef))
        //     .filter(Boolean) as { x: number; y: number }[];

        if (sourcePositions.length === 0 || targetPositions.length === 0) {
            return;
        }

        const color = isPending ? '#9333ea' : getConfidenceColor(link.confidence);
        const strokeWidth = isHighlighted ? 10 : 10;
        const opacity = isPending ? 0.7 : isHighlighted ? 0.9 : 0.5;
        const strokeDasharray = isPending ? '5,5' : 'none';

        // Determine link type and draw accordingly
        const linkType = getLinkType(link.sourceIds.length, link.targetIds.length);

        switch (linkType) {
            case '1:1':
                draw1to1Link(
                    link,
                    linkIndex,
                    sourcePositions[0],
                    targetPositions[0],
                    color,
                    strokeWidth,
                    opacity,
                    strokeDasharray,
                    isPending,
                    onLinkClick, // CHANGE THIS
                    drawnPaths
                );
                break;
            case '1:many':
                draw1toManyLink(
                    link,
                    linkIndex,
                    sourcePositions[0],
                    targetPositions,
                    color,
                    strokeWidth,
                    opacity,
                    strokeDasharray,
                    isPending,
                    onLinkClick, // CHANGE THIS
                    drawnPaths
                );
                break;
            case 'many:1':
                drawManyTo1Link(
                    link,
                    linkIndex,
                    sourcePositions,
                    targetPositions[0],
                    color,
                    strokeWidth,
                    opacity,
                    strokeDasharray,
                    isPending,
                    onLinkClick, // CHANGE THIS
                    drawnPaths
                );
                break;
            case 'many:many':
                drawManyToManyLink(
                    link,
                    linkIndex,
                    sourcePositions,
                    targetPositions,
                    color,
                    strokeWidth,
                    opacity,
                    strokeDasharray,
                    isPending,
                    onLinkClick, // CHANGE THIS
                    drawnPaths
                );
                break;
        }
    });

    return drawnPaths;
};

// Helper function to get line position
const getLinePosition = (
    containerId: string,
    lineId: string,
    svgRef: React.RefObject<SVGSVGElement>
): { x: number; y: number } | null => {
    const element = document.getElementById(`${containerId}-${lineId}`);

    if (!element) {
        return null;
    }

    const svg = svgRef.current;
    if (!svg) {
        return null;
    }

    const elementRect = element.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();

    return {
        x:
            containerId === 'source'
                ? elementRect.right - svgRect.left
                : elementRect.left - svgRect.left,
        y: elementRect.top - svgRect.top + elementRect.height / 2,
    };
};

// Drawing functions for different link types
function draw1to1Link(
    link: Link,
    linkIndex: number,
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    color: string,
    strokeWidth: number,
    opacity: number,
    strokeDasharray: string,
    isPending: boolean,
    onLinkClick: (id: string) => void, // CHANGE THIS
    drawnPaths: JSX.Element[]
) {
    const midX = (sourcePos.x + targetPos.x) / 2;
    const path = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${sourcePos.y}, ${midX} ${
        (sourcePos.y + targetPos.y) / 2
    } T ${targetPos.x} ${targetPos.y}`;

    drawnPaths.push(
        <g
            key={`${link.id}-${linkIndex}`}
            onClick={() => !isPending && onLinkClick(link.id)} // CHANGE THIS
    className={isPending ? '' : 'cursor-pointer'}
    >
    <path
        d={path}
    stroke={color}
    strokeWidth={strokeWidth}
    fill="none"
    opacity={opacity}
    strokeLinecap="round"
    strokeDasharray={strokeDasharray}
    />
    {link.isFavorite && !isPending && (
        <circle
            cx={(sourcePos.x + targetPos.x) / 2}
        cy={(sourcePos.y + targetPos.y) / 2}
        r={6}
        fill="#fbbf24"
            />
    )}
    </g>
);
}

function draw1toManyLink(
    link: Link,
    linkIndex: number,
    sourcePos: { x: number; y: number },
    targetPositions: { x: number; y: number }[],
    color: string,
    strokeWidth: number,
    opacity: number,
    strokeDasharray: string,
    isPending: boolean,
    onLinkClick: (id: string) => void, // CHANGE THIS
    drawnPaths: JSX.Element[]
) {
    const centerX = (sourcePos.x + targetPositions[0].x) / 2;

    targetPositions.forEach((targetPos, idx) => {
        const path = `M ${sourcePos.x} ${sourcePos.y} Q ${centerX} ${sourcePos.y}, ${centerX} ${
            (sourcePos.y + targetPos.y) / 2
        } T ${targetPos.x} ${targetPos.y}`;

        drawnPaths.push(
            <path
                key={`${link.id}-${linkIndex}-${idx}`}
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        />
    );
    });

    // Add interaction hub
    drawnPaths.push(
        <g
            key={`${link.id}-interaction`}
            onClick={() => !isPending && onLinkClick(link.id)} // CHANGE THIS
    className={isPending ? '' : 'cursor-pointer'}
        >
        {link.isFavorite && !isPending && (
                <circle cx={centerX} cy={sourcePos.y} r={8} fill="#fbbf24" opacity={0.9} />
)}
    <circle cx={centerX} cy={sourcePos.y} r={20} fill="transparent" style={{ pointerEvents: 'all' }} />
    </g>
);
}

function drawManyTo1Link(
    link: Link,
    linkIndex: number,
    sourcePositions: { x: number; y: number }[],
    targetPos: { x: number; y: number },
    color: string,
    strokeWidth: number,
    opacity: number,
    strokeDasharray: string,
    isPending: boolean,
    onLinkClick: (id: string) => void, // CHANGE THIS
    drawnPaths: JSX.Element[]
) {
    const centerX = (sourcePositions[0].x + targetPos.x) / 2;

    sourcePositions.forEach((sourcePos, idx) => {
        const path = `M ${sourcePos.x} ${sourcePos.y} Q ${centerX} ${sourcePos.y}, ${centerX} ${
            (sourcePos.y + targetPos.y) / 2
        } T ${targetPos.x} ${targetPos.y}`;

        drawnPaths.push(
            <path
                key={`${link.id}-${linkIndex}-${idx}`}
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        />
    );
    });

    // Add interaction hub
    drawnPaths.push(
        <g
            key={`${link.id}-interaction`}
            onClick={() => !isPending && onLinkClick(link.id)} // CHANGE THIS
    className={isPending ? '' : 'cursor-pointer'}
        >
        {link.isFavorite && !isPending && (
                <circle cx={centerX} cy={targetPos.y} r={8} fill="#fbbf24" opacity={0.9} />
)}
    <circle cx={centerX} cy={targetPos.y} r={20} fill="transparent" style={{ pointerEvents: 'all' }} />
    </g>
);
}

function drawManyToManyLink(
    link: Link,
    linkIndex: number,
    sourcePositions: { x: number; y: number }[],
    targetPositions: { x: number; y: number }[],
    color: string,
    strokeWidth: number,
    opacity: number,
    strokeDasharray: string,
    isPending: boolean,
    onLinkClick: (id: string) => void, // CHANGE THIS
    drawnPaths: JSX.Element[]
) {
    const avgSourceY = sourcePositions.reduce((sum, pos) => sum + pos.y, 0) / sourcePositions.length;
    const avgTargetY = targetPositions.reduce((sum, pos) => sum + pos.y, 0) / targetPositions.length;
    const avgSourceX = sourcePositions[0].x;
    const avgTargetX = targetPositions[0].x;
    const centerX = (avgSourceX + avgTargetX) / 2;
    const centerY = (avgSourceY + avgTargetY) / 2;

    // Draw lines from sources to center
    sourcePositions.forEach((sourcePos, idx) => {
        const path = `M ${sourcePos.x} ${sourcePos.y} Q ${(sourcePos.x + centerX) / 2} ${
            sourcePos.y
        }, ${centerX} ${centerY}`;

        drawnPaths.push(
            <path
                key={`${link.id}-src-${idx}`}
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        />
    );
    });

    // Draw lines from center to targets
    targetPositions.forEach((targetPos, idx) => {
        const path = `M ${centerX} ${centerY} Q ${(centerX + targetPos.x) / 2} ${
            targetPos.y
        }, ${targetPos.x} ${targetPos.y}`;

        drawnPaths.push(
            <path
                key={`${link.id}-tgt-${idx}`}
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        opacity={opacity}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        />
    );
    });

    // Add central hub
    drawnPaths.push(
        <g
            key={`${link.id}-hub`}
            onClick={() => !isPending && onLinkClick(link.id)} // CHANGE THIS
    className={isPending ? '' : 'cursor-pointer'}
    >
    <circle
        cx={centerX}
    cy={centerY}
    r={link.isFavorite && !isPending ? 10 : 8}
    fill={link.isFavorite && !isPending ? '#fbbf24' : color}
    opacity={0.9}
    />
    <circle cx={centerX} cy={centerY} r={25} fill="transparent" style={{ pointerEvents: 'all' }} />
    </g>
);
}