// src/pages/AlignmentPage.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Input, Select, Modal, message, Form, Slider, Popover, Radio } from 'antd';
import {
  Link as LinkIcon,
  Unlink,
  MessageSquare,
  Star,
  StarOff,
  Trash2,
  Download,
  X,
  FileText,
  Upload,
  Undo,
  Redo,
  Type,
  Edit3,
  Save,
  ZoomIn,
  ZoomOut,
  Settings,
  MousePointer2,
  Hand
} from 'lucide-react';
import {useParams} from "react-router-dom";

const { TextArea } = Input;
const { Option } = Select;

// Types
interface Line {
  id: string;
  lineNumber: string;
  text: string;
  comment?: string;
  isFavorite?: boolean;
}

interface Link {
  id: string;
  sourceIds: string[];
  targetIds: string[];
  confidence: number;
  comment?: string;
  strategy?: string;
  isFavorite?: boolean;
}

interface AlignmentMetadata {
  sourceTitle: string;
  targetTitle: string;
  sourceLang: string;
  targetLang: string;
  sourceAuthor?: string;
  translator?: string;
  strategyProfile?: string;
  sourceDoc: string;
  targetDoc: string;
}

interface AppState {
  sourceLines: Line[];
  targetLines: Line[];
  links: Link[];
}

interface FontSettings {
  sourceFontFamily: string;
  targetFontFamily: string;
  fontSize: number;
}

type LinkingMode = 'manual' | 'click';

// Confidence colors
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return '#10b981';
  if (confidence >= 0.6) return '#3b82f6';
  if (confidence >= 0.4) return '#f59e0b';
  return '#ef4444';
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  if (confidence >= 0.4) return 'Low';
  return 'Very Low';
};

// Available fonts
const AVAILABLE_FONTS = [
  { label: 'System Default', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Palatino', value: 'Palatino, serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Bookman', value: 'Bookman, serif' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Noto Sans', value: '"Noto Sans", sans-serif' },
  { label: 'Noto Serif', value: '"Noto Serif", serif' },
];

const AlignmentManagerPage: React.FC = () => {
  // Metadata
  const { documentId } = useParams<{ documentId: string }>();

  const [isPanelHovered, setIsPanelHovered] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout>();
  const [metadata, setMetadata] = useState<AlignmentMetadata>({
    sourceTitle: 'Climate Change Report 2025',
    targetTitle: 'Rapport sur le changement climatique 2025',
    sourceLang: 'en',
    targetLang: 'fr',
    sourceAuthor: 'Global Environment Agency',
    translator: 'Marie Curie',
    strategyProfile: 'Specialized Technical Translation',
    sourceDoc: 'en_source.xml',
    targetDoc: 'fr_target.xml',
  });

  // Font settings
  const [fontSettings, setFontSettings] = useState<FontSettings>({
    sourceFontFamily: 'system-ui, -apple-system, sans-serif',
    targetFontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: 16,
  });

  // Linking mode
  const [linkingMode, setLinkingMode] = useState<LinkingMode>('click');
  const [clickLinkingStep, setClickLinkingStep] = useState<'idle' | 'source-selected' | 'target-selected'>('idle');
  const [pendingSourceIds, setPendingSourceIds] = useState<string[]>([]);
  const [pendingTargetIds, setPendingTargetIds] = useState<string[]>([]);

  // const [initialState, setInitialState] = useState<AppState | null>(null);

  useEffect(() => {
    if (!documentId) return;
    console.log("documentId", documentId);
    window.api.getParaAlignmentState(Number(documentId)).then(
        res =>{
          console.log("response", res);
        }
    );
  }, [documentId]);


//   // Initial state
// // First, check your initial links data - remove duplicates
   let initialState = {
    sourceLines: [
      { id: '12', lineNumber: 'sp1', text: 'Rising temperatures continue.', isFavorite: false },
      { id: '13', lineNumber: 'sp2', text: 'Global trends are concerning.', isFavorite: false },
      { id: '14', lineNumber: 'sp3', text: 'Ice caps are melting rapidly.', isFavorite: false },
      { id: '15', lineNumber: 'sp4', text: 'Sea levels are rising.', isFavorite: false },
      { id: '16', lineNumber: 'sp5', text: 'Urgent action is required.', isFavorite: false },
    ],
    targetLines: [
      { id: '18', lineNumber: 'tp1', text: 'La hausse de température est mondiale.', isFavorite: false },
      { id: '19', lineNumber: 'tp2', text: 'Les calottes glaciaires fondent rapidement.', isFavorite: false },
      { id: '20', lineNumber: 'tp3', text: 'Le niveau de la mer monte.', isFavorite: false },
      { id: '21', lineNumber: 'tp4', text: 'Une action urgente est nécessaire.', isFavorite: false },
    ],
    links: [
      // Separate 1:1 links instead of many-to-one
      {
        id: 'l1',
        sourceIds: ['s1', "s2"],
        targetIds: ['t1'],
        confidence: 0.95,
        strategy: 'Direct translation maintaining semantic equivalence.',
        isFavorite: false,
      },
      {
        id: 'l3',
        sourceIds: ['s3'],
        targetIds: ['t2'],
        confidence: 0.90,
        isFavorite: false,
      },
    ],
  };
  // State
  const [sourceLines, setSourceLines] = useState<Line[]>(initialState.sourceLines);
  const [targetLines, setTargetLines] = useState<Line[]>(initialState.targetLines);
  const [links, setLinks] = useState<Link[]>(initialState.links);

  // Undo/Redo state
  const [history, setHistory] = useState<AppState[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  // Editing states
  const [editingLine, setEditingLine] = useState<{
    type: 'source' | 'target';
    id: string;
    text: string;
  } | null>(null);

  // Modals
  const [isCreateLinkModalVisible, setIsCreateLinkModalVisible] = useState(false);
  const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
  const [isMetadataModalVisible, setIsMetadataModalVisible] = useState(false);
  const [isEditLineModalVisible, setIsEditLineModalVisible] = useState(false);
  const [isFontSettingsVisible, setIsFontSettingsVisible] = useState(false);
  const [isQuickLinkModalVisible, setIsQuickLinkModalVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Form states
  const [linkConfidence, setLinkConfidence] = useState(0.8);
  const [linkStrategy, setLinkStrategy] = useState('');
  const [linkComment, setLinkComment] = useState('');
  const [editingItem, setEditingItem] = useState<{
    type: 'line' | 'link';
    id: string;
    field: 'comment' | 'lineNumber';
  } | null>(null);
  const [editValue, setEditValue] = useState('');

  const sourceContainerRef = useRef<HTMLDivElement>(null);
  const targetContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Inside component
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mouseMoveTimeoutRef.current) {
      clearTimeout(mouseMoveTimeoutRef.current);
    }

    mouseMoveTimeoutRef.current = setTimeout(() => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }, 50); // Update every 50ms max
  }, []);

  const getOptimalPosition = (x: number, y: number, panelWidth = 384, panelHeight = 400) => {
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = x + padding;
    let top = y + padding;

    // Check if panel goes off right edge
    if (left + panelWidth > viewportWidth) {
      left = x - panelWidth - padding; // Position to left of cursor
    }

    // Check if panel goes off bottom edge
    if (top + panelHeight > viewportHeight) {
      top = Math.max(padding, viewportHeight - panelHeight - padding);
    }

    // Check if panel goes off left edge
    if (left < 0) {
      left = padding;
    }

    // Check if panel goes off top edge
    if (top < 0) {
      top = padding;
    }

    return { left, top };
  };


  // Save state to history
  const saveToHistory = useCallback((newState: AppState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setSourceLines(state.sourceLines);
      setTargetLines(state.targetLines);
      setLinks(state.links);
      setHistoryIndex(newIndex);
      message.success('Undo successful');
    } else {
      message.info('Nothing to undo');
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setSourceLines(state.sourceLines);
      setTargetLines(state.targetLines);
      setLinks(state.links);
      setHistoryIndex(newIndex);
      message.success('Redo successful');
    } else {
      message.info('Nothing to redo');
    }
  }, [history, historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') {
        // Cancel click linking
        if (clickLinkingStep !== 'idle') {
          cancelClickLinking();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, clickLinkingStep]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Add this state for forcing re-renders
  const [, forceUpdate] = useState({});

// Update the drawLinks function with better error handling and logging
  // Update the drawLinks function to handle all relationship types
  const drawLinks = () => {
    const allLinks = [...links];

    // Add pending link if in progress
    if (
        clickLinkingStep === 'target-selected' &&
        isQuickLinkModalVisible &&
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
    const uniqueLinks = allLinks.filter((link, index, self) => {
      return index === self.findIndex(l => l.id === link.id);
    });

    const drawnPaths: JSX.Element[] = [];

    uniqueLinks.forEach((link, linkIndex) => {
      const isPending = link.id === 'pending';
      const isHovered = hoveredLink === link.id;
      const isSourceSelected = link.sourceIds.some(id =>
          linkingMode === 'manual' ? selectedSourceIds.includes(id) : false
      );
      const isTargetSelected = link.targetIds.some(id =>
          linkingMode === 'manual' ? selectedTargetIds.includes(id) : false
      );
      const isHighlighted = isHovered || isSourceSelected || isTargetSelected || isPending;

      // Get all source and target positions
      const sourcePositions = link.sourceIds
          .map(id => getLinePosition('source', id))
          .filter(Boolean) as { x: number; y: number }[];

      const targetPositions = link.targetIds
          .map(id => getLinePosition('target', id))
          .filter(Boolean) as { x: number; y: number }[];

      if (sourcePositions.length === 0 || targetPositions.length === 0) {
        return;
      }

      const color = isPending ? '#9333ea' : getConfidenceColor(link.confidence);
      const strokeWidth = isHighlighted ? 3 : 2;
      const opacity = isPending ? 0.7 : (isHighlighted ? 0.9 : 0.5);
      const strokeDasharray = isPending ? '5,5' : 'none';

      // Determine link type and draw accordingly
      const linkType = getLinkType(link.sourceIds.length, link.targetIds.length);

      if (linkType === '1:1') {
        // Simple curve from one source to one target
        const sourcePos = sourcePositions[0];
        const targetPos = targetPositions[0];
        const midX = (sourcePos.x + targetPos.x) / 2;
        const path = `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${sourcePos.y}, ${midX} ${(sourcePos.y + targetPos.y) / 2} T ${targetPos.x} ${targetPos.y}`;
        console.log("1:1")
        drawnPaths.push(
            <g
                key={`${link.id}-${linkIndex}`}
                onMouseEnter={() => !isPending && setHoveredLink(link.id)}
                // onMouseLeave={() => setHoveredLink(null)}
                // onMouseLeave={(e) => {
                //   // Only close if not moving to the panel
                //   const relatedTarget = e.relatedTarget as HTMLElement;
                //   console.log("relatedTarget", relatedTarget);
                //   if (!relatedTarget || !relatedTarget.closest('.link-details-panel')) {
                //     // Add small delay to allow mouse to reach panel
                //     setTimeout(() => {
                //       if (hoveredLink === link.id) {
                //         setHoveredLink(null);
                //       }
                //     }, 2000);
                //   }
                // }}
                onMouseLeave={() => {
                  if (!isPending) {
                    // Delay closing to allow mouse to reach panel
                    closeTimeoutRef.current = setTimeout(() => {
                      if (!isPanelHovered) {
                        setHoveredLink(null);
                      }
                    }, 150); // 150ms delay
                  }
                }}
                onMouseMove={(e) => {
                  // Update position as mouse moves
                  if (hoveredLink === link.id) {
                    setMousePosition({ x: e.clientX, y: e.clientY });
                  }
                }}
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
      } else if (linkType === '1:many') {
        // One source to multiple targets - fan out
        const sourcePos = sourcePositions[0];
        const centerX = (sourcePos.x + targetPositions[0].x) / 2;

        targetPositions.forEach((targetPos, idx) => {
          const path = `M ${sourcePos.x} ${sourcePos.y} Q ${centerX} ${sourcePos.y}, ${centerX} ${(sourcePos.y + targetPos.y) / 2} T ${targetPos.x} ${targetPos.y}`;

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

        // Add interaction group
        drawnPaths.push(
            <g
                key={`${link.id}-interaction`}
                onMouseEnter={() => !isPending && setHoveredLink(link.id)}
                // onMouseLeave={() => setHoveredLink(null)}
                onMouseLeave={() => {
                  if (!isPending) {
                    // Delay closing to allow mouse to reach panel
                    closeTimeoutRef.current = setTimeout(() => {
                      if (!isPanelHovered) {
                        setHoveredLink(null);
                      }
                    }, 150); // 150ms delay
                  }
                }}
                onMouseMove={(e) => {
                  // Update position as mouse moves
                  if (hoveredLink === link.id) {
                    setMousePosition({ x: e.clientX, y: e.clientY });
                  }
                }}
                className={isPending ? '' : 'cursor-pointer'}
            >
              {link.isFavorite && !isPending && (
                  <circle
                      cx={centerX}
                      cy={sourcePos.y}
                      r={8}
                      fill="#fbbf24"
                      opacity={0.9}
                  />
              )}
              <circle
                  cx={centerX}
                  cy={sourcePos.y}
                  r={20}
                  fill="transparent"
                  style={{ pointerEvents: 'all' }}
              />
            </g>
        );
      } else if (linkType === 'many:1') {
        // Multiple sources to one target - fan in
        const targetPos = targetPositions[0];
        const centerX = (sourcePositions[0].x + targetPos.x) / 2;

        sourcePositions.forEach((sourcePos, idx) => {
          const path = `M ${sourcePos.x} ${sourcePos.y} Q ${centerX} ${sourcePos.y}, ${centerX} ${(sourcePos.y + targetPos.y) / 2} T ${targetPos.x} ${targetPos.y}`;

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

        // Add interaction group
        drawnPaths.push(
            <g
                key={`${link.id}-interaction`}
                onMouseEnter={() => !isPending && setHoveredLink(link.id)}
                onMouseLeave={() => {
                  if (!isPending) {
                    // Delay closing to allow mouse to reach panel
                    closeTimeoutRef.current = setTimeout(() => {
                      if (!isPanelHovered) {
                        setHoveredLink(null);
                      }
                    }, 150); // 150ms delay
                  }
                }}
                // onMouseLeave={() => setHoveredLink(null)}
                onMouseMove={(e) => {
                  // Update position as mouse moves
                  if (hoveredLink === link.id) {
                    setMousePosition({ x: e.clientX, y: e.clientY });
                  }
                }}
                className={isPending ? '' : 'cursor-pointer'}
            >
              {link.isFavorite && !isPending && (
                  <circle
                      cx={centerX}
                      cy={targetPos.y}
                      r={8}
                      fill="#fbbf24"
                      opacity={0.9}
                  />
              )}
              <circle
                  cx={centerX}
                  cy={targetPos.y}
                  r={20}
                  fill="transparent"
                  style={{ pointerEvents: 'all' }}
              />
            </g>
        );
      } else {
        // many:many - draw all combinations with a central hub
        const avgSourceY = sourcePositions.reduce((sum, pos) => sum + pos.y, 0) / sourcePositions.length;
        const avgTargetY = targetPositions.reduce((sum, pos) => sum + pos.y, 0) / targetPositions.length;
        const avgSourceX = sourcePositions[0].x;
        const avgTargetX = targetPositions[0].x;
        const centerX = (avgSourceX + avgTargetX) / 2;
        const centerY = (avgSourceY + avgTargetY) / 2;

        // Draw lines from sources to center
        sourcePositions.forEach((sourcePos, idx) => {
          const path = `M ${sourcePos.x} ${sourcePos.y} Q ${(sourcePos.x + centerX) / 2} ${sourcePos.y}, ${centerX} ${centerY}`;

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
          const path = `M ${centerX} ${centerY} Q ${(centerX + targetPos.x) / 2} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;

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
                onMouseEnter={() => !isPending && setHoveredLink(link.id)}
                // onMouseLeave={() => setHoveredLink(null)}
                onMouseLeave={() => {
                  if (!isPending) {
                    // Delay closing to allow mouse to reach panel
                    closeTimeoutRef.current = setTimeout(() => {
                      if (!isPanelHovered) {
                        setHoveredLink(null);
                      }
                    }, 150); // 150ms delay
                  }
                }}
                onMouseMove={(e) => {
                  // Update position as mouse moves
                  if (hoveredLink === link.id) {
                    setMousePosition({ x: e.clientX, y: e.clientY });
                  }
                }}
                className={isPending ? '' : 'cursor-pointer'}
            >
              <circle
                  cx={centerX}
                  cy={centerY}
                  r={link.isFavorite && !isPending ? 10 : 8}
                  fill={link.isFavorite && !isPending ? '#fbbf24' : color}
                  opacity={0.9}
              />
              <circle
                  cx={centerX}
                  cy={centerY}
                  r={25}
                  fill="transparent"
                  style={{ pointerEvents: 'all' }}
              />
            </g>
        );
      }
    });

    return drawnPaths;
  };

// Helper function to determine link type
  const getLinkType = (sourceCount: number, targetCount: number): '1:1' | '1:many' | 'many:1' | 'many:many' => {
    if (sourceCount === 1 && targetCount === 1) return '1:1';
    if (sourceCount === 1 && targetCount > 1) return '1:many';
    if (sourceCount > 1 && targetCount === 1) return 'many:1';
    return 'many:many';
  };
// Replace the entire useEffect for SVG updates
  useEffect(() => {
    const handleUpdate = () => {
      console.log('Update triggered'); // Debug log
      forceUpdate({}); // Force component re-render
    };

    // Initial delay to ensure DOM is ready
    const initialTimer = setTimeout(handleUpdate, 500);

    const sourceContainer = sourceContainerRef.current;
    const targetContainer = targetContainerRef.current;

    window.addEventListener('resize', handleUpdate);
    if (sourceContainer) {
      sourceContainer.addEventListener('scroll', handleUpdate);
    }
    if (targetContainer) {
      targetContainer.addEventListener('scroll', handleUpdate);
    }

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('resize', handleUpdate);
      if (sourceContainer) {
        sourceContainer.removeEventListener('scroll', handleUpdate);
      }
      if (targetContainer) {
        targetContainer.removeEventListener('scroll', handleUpdate);
      }
    };
  }, [links, pendingSourceIds, pendingTargetIds, clickLinkingStep]);

// Also add a dependency to re-render when lines change
  useEffect(() => {
    forceUpdate({});
  }, [sourceLines, targetLines, links]);
  // Click linking handlers
  const handleLineClick = (type: 'source' | 'target', id: string) => {
    if (editingLine) return; // Don't handle clicks while editing

    if (linkingMode === 'click') {
      handleClickLinking(type, id);
    } else {
      handleManualSelection(type, id);
    }
  };

  const handleClickLinking = (type: 'source' | 'target', id: string) => {
    if (clickLinkingStep === 'idle') {
      // First click - select source
      if (type === 'source') {
        setPendingSourceIds([id]);
        setClickLinkingStep('source-selected');
        message.info('Source selected. Now click a target line to create link.');
      } else {
        message.warning('Please click a source line first.');
      }
    } else if (clickLinkingStep === 'source-selected') {
      if (type === 'source') {
        // Toggle source selection
        setPendingSourceIds(prev => {
          if (prev.includes(id)) {
            const newIds = prev.filter(i => i !== id);
            if (newIds.length === 0) {
              setClickLinkingStep('idle');
              message.info('Source selection cleared.');
            }
            return newIds;
          } else {
            return [...prev, id];
          }
        });
      } else {
        // Target clicked - create link or continue
        setPendingTargetIds([id]);
        setClickLinkingStep('target-selected');
        // Show quick link modal
        setIsQuickLinkModalVisible(true);
      }
    } else if (clickLinkingStep === 'target-selected') {
      // Allow adding more targets
      if (type === 'target') {
        setPendingTargetIds(prev => {
          if (prev.includes(id)) {
            return prev.filter(i => i !== id);
          } else {
            return [...prev, id];
          }
        });
      }
    }
  };

  const handleManualSelection = (type: 'source' | 'target', id: string) => {
    if (type === 'source') {
      toggleSourceSelection(id);
    } else {
      toggleTargetSelection(id);
    }
  };


  const confirmQuickLink = () => {
    if (pendingSourceIds.length === 0 || pendingTargetIds.length === 0) {
      message.warning('Please select at least one source and one target line');
      return;
    }

    // Check if link already exists
    const existingLink = links.find(
        link =>
            link.sourceIds.length === pendingSourceIds.length &&
            link.targetIds.length === pendingTargetIds.length &&
            link.sourceIds.every(id => pendingSourceIds.includes(id)) &&
            link.targetIds.every(id => pendingTargetIds.includes(id))
    );

    if (existingLink) {
      message.warning('This link already exists');
      return;
    }

    const linkType = getLinkType(pendingSourceIds.length, pendingTargetIds.length);

    const newLink: Link = {
      id: `l${Date.now()}`,
      sourceIds: [...pendingSourceIds],
      targetIds: [...pendingTargetIds],
      confidence: linkConfidence,
      strategy: linkStrategy || undefined,
      comment: linkComment || undefined,
      isFavorite: false,
    };

    const updatedLinks = [...links, newLink];
    setLinks(updatedLinks);

    saveToHistory({
      sourceLines,
      targetLines,
      links: updatedLinks,
    });

    // Reset state
    setPendingSourceIds([]);
    setPendingTargetIds([]);
    setClickLinkingStep('idle');
    setIsQuickLinkModalVisible(false);
    setLinkConfidence(0.8);
    setLinkStrategy('');
    setLinkComment('');

    message.success(`${linkType} link created successfully`);
  };

  const createLink = () => {
    // Check if link already exists
    const existingLink = links.find(
        link =>
            link.sourceIds.length === selectedSourceIds.length &&
            link.targetIds.length === selectedTargetIds.length &&
            link.sourceIds.every(id => selectedSourceIds.includes(id)) &&
            link.targetIds.every(id => selectedTargetIds.includes(id))
    );

    if (existingLink) {
      message.warning('This link already exists');
      return;
    }

    const linkType = getLinkType(selectedSourceIds.length, selectedTargetIds.length);

    const newLink: Link = {
      id: `l${Date.now()}`,
      sourceIds: [...selectedSourceIds],
      targetIds: [...selectedTargetIds],
      confidence: linkConfidence,
      strategy: linkStrategy || undefined,
      comment: linkComment || undefined,
      isFavorite: false,
    };

    const updatedLinks = [...links, newLink];
    setLinks(updatedLinks);

    saveToHistory({
      sourceLines,
      targetLines,
      links: updatedLinks,
    });

    setSelectedSourceIds([]);
    setSelectedTargetIds([]);
    setIsCreateLinkModalVisible(false);
    setLinkConfidence(0.8);
    setLinkStrategy('');
    setLinkComment('');

    message.success(`${linkType} link created successfully`);
  };


  const cancelQuickLink = () => {
    setPendingSourceIds([]);
    setPendingTargetIds([]);
    setClickLinkingStep('idle');
    setIsQuickLinkModalVisible(false);
    setLinkConfidence(0.8);
    setLinkStrategy('');
    setLinkComment('');
    setHoveredLink(null); // Close link details panel
    message.info('Link creation cancelled');
  };

  const cancelClickLinking = () => {
    setPendingSourceIds([]);
    setPendingTargetIds([]);
    setClickLinkingStep('idle');
    setIsQuickLinkModalVisible(false);
    setLinkConfidence(0.8);
    setLinkStrategy('');
    setLinkComment('');
    setHoveredLink(null); // Close link details panel
    message.info('Link creation cancelled');
  };

  // Line selection (manual mode)
  const toggleSourceSelection = (id: string) => {
    setSelectedSourceIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleTargetSelection = (id: string) => {
    setSelectedTargetIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Edit line text
  const startEditingLine = (type: 'source' | 'target', id: string, currentText: string) => {
    setEditingLine({ type, id, text: currentText });
  };

  const saveLineEdit = () => {
    if (!editingLine) return;

    const newState: AppState = {
      sourceLines: editingLine.type === 'source'
          ? sourceLines.map(line =>
              line.id === editingLine.id ? { ...line, text: editingLine.text } : line
          )
          : sourceLines,
      targetLines: editingLine.type === 'target'
          ? targetLines.map(line =>
              line.id === editingLine.id ? { ...line, text: editingLine.text } : line
          )
          : targetLines,
      links,
    };

    if (editingLine.type === 'source') {
      setSourceLines(newState.sourceLines);
    } else {
      setTargetLines(newState.targetLines);
    }

    saveToHistory(newState);
    setEditingLine(null);
    message.success('Text updated');
  };

  const cancelLineEdit = () => {
    setEditingLine(null);
  };

  // Create link (manual mode)
  const openCreateLinkModal = () => {
    if (selectedSourceIds.length === 0 || selectedTargetIds.length === 0) {
      message.warning('Please select at least one source and one target line');
      return;
    }
    setIsCreateLinkModalVisible(true);
  };
  // Delete link
  const deleteLink = (linkId: string) => {
    const newLinks = links.filter(link => link.id !== linkId);
    setLinks(newLinks);

    saveToHistory({
      sourceLines,
      targetLines,
      links: newLinks,
    });

    message.success('Link deleted');
  };

  // Toggle favorite
  const toggleLineFavorite = (type: 'source' | 'target', id: string) => {
    const newState: AppState = {
      sourceLines: type === 'source'
          ? sourceLines.map(line =>
              line.id === id ? { ...line, isFavorite: !line.isFavorite } : line
          )
          : sourceLines,
      targetLines: type === 'target'
          ? targetLines.map(line =>
              line.id === id ? { ...line, isFavorite: !line.isFavorite } : line
          )
          : targetLines,
      links,
    };

    if (type === 'source') {
      setSourceLines(newState.sourceLines);
    } else {
      setTargetLines(newState.targetLines);
    }

    saveToHistory(newState);
  };

  const toggleLinkFavorite = (linkId: string) => {
    const newLinks = links.map(link =>
        link.id === linkId ? { ...link, isFavorite: !link.isFavorite } : link
    );
    setLinks(newLinks);

    saveToHistory({
      sourceLines,
      targetLines,
      links: newLinks,
    });
  };

  // Edit line number or comment
  const openEditModal = (
      type: 'line' | 'link',
      id: string,
      field: 'comment' | 'lineNumber',
      currentValue?: string
  ) => {
    setEditingItem({ type, id, field });
    setEditValue(currentValue || '');
    if (field === 'comment') {
      setIsCommentModalVisible(true);
    } else {
      setIsEditLineModalVisible(true);
    }
  };

  const saveEdit = () => {
    if (!editingItem) return;

    const newState: AppState = {
      sourceLines,
      targetLines,
      links,
    };

    if (editingItem.type === 'line') {
      const isSource = sourceLines.some(l => l.id === editingItem.id);
      if (isSource) {
        newState.sourceLines = sourceLines.map(line =>
            line.id === editingItem.id ? { ...line, [editingItem.field]: editValue } : line
        );
        setSourceLines(newState.sourceLines);
      } else {
        newState.targetLines = targetLines.map(line =>
            line.id === editingItem.id ? { ...line, [editingItem.field]: editValue } : line
        );
        setTargetLines(newState.targetLines);
      }
    } else {
      newState.links = links.map(link =>
          link.id === editingItem.id ? { ...link, [editingItem.field]: editValue } : link
      );
      setLinks(newState.links);
    }

    saveToHistory(newState);
    setEditingItem(null);
    setEditValue('');
    setIsCommentModalVisible(false);
    setIsEditLineModalVisible(false);
    message.success('Saved successfully');
  };

  // Font size controls
  const increaseFontSize = () => {
    setFontSettings(prev => ({
      ...prev,
      fontSize: Math.min(prev.fontSize + 2, 32),
    }));
  };

  const decreaseFontSize = () => {
    setFontSettings(prev => ({
      ...prev,
      fontSize: Math.max(prev.fontSize - 2, 10),
    }));
  };

  // XML Export
  const exportToXML = () => {
    const xmlContent = generateCESAlignXML();
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alignment.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('XML file downloaded');
  };

  const generateCESAlignXML = (): string => {
    const escapeXml = (str: string) => {
      return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<cesAlign version="1.0">\n';
    xml += '  <cesHeader>\n';
    xml += '    <fileDesc>\n';
    xml += '      <titleStmt>\n';
    xml += `        <h.title xml:lang="${escapeXml(metadata.sourceLang)}">${escapeXml(metadata.sourceTitle)}</h.title>\n`;
    xml += `        <h.title xml:lang="${escapeXml(metadata.targetLang)}">${escapeXml(metadata.targetTitle)}</h.title>\n`;
    xml += '      </titleStmt>\n';
    xml += '      <sourceDesc>\n';
    if (metadata.sourceAuthor) {
      xml += `        <p>Source Author: ${escapeXml(metadata.sourceAuthor)}</p>\n`;
    }
    if (metadata.translator) {
      xml += `        <p>Translator: ${escapeXml(metadata.translator)}</p>\n`;
    }
    if (metadata.strategyProfile) {
      xml += `        <p>Strategy Profile: ${escapeXml(metadata.strategyProfile)}</p>\n`;
    }
    xml += '      </sourceDesc>\n';
    xml += '    </fileDesc>\n';
    xml += '  </cesHeader>\n\n';

    xml += `  <linkGrp type="sent" fromDoc="${escapeXml(metadata.sourceDoc)}" toDoc="${escapeXml(metadata.targetDoc)}">\n`;

    links.forEach(link => {
      const sourceLineNumbers = link.sourceIds
          .map(id => {
            const line = sourceLines.find(l => l.id === id);
            return line?.lineNumber || id;
          })
          .join(' ');

      const targetLineNumbers = link.targetIds
          .map(id => {
            const line = targetLines.find(l => l.id === id);
            return line?.lineNumber || id;
          })
          .join(' ');

      xml += `    <link xtargets="${escapeXml(sourceLineNumbers)} ; ${escapeXml(targetLineNumbers)}">\n`;

      if (link.strategy) {
        xml += `      <desc type="strategy">${escapeXml(link.strategy)}</desc>\n`;
      }
      if (link.comment) {
        xml += `      <desc type="user_comment">${escapeXml(link.comment)}</desc>\n`;
      }

      xml += `      <desc type="confidence">${(link.confidence * 100).toFixed(0)}%</desc>\n`;

      if (link.isFavorite) {
        xml += `      <desc type="favorite">true</desc>\n`;
      }

      xml += '    </link>\n';
    });

    xml += '  </linkGrp>\n';
    xml += '</cesAlign>';

    return xml;
  };

  const getLinePosition = (
      containerId: string,
      lineId: string
  ): { x: number; y: number } | null => {
    const element = document.getElementById(`${containerId}-${lineId}`);

    if (!element) {
      console.log(`Element not found: ${containerId}-${lineId}`);
      return null;
    }

    const svg = svgRef.current;
    if (!svg) {
      console.log('SVG ref not found');
      return null;
    }

    const elementRect = element.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();

    const position = {
      x: containerId === 'source'
          ? elementRect.right - svgRect.left
          : elementRect.left - svgRect.left,
      y: elementRect.top - svgRect.top + elementRect.height / 2,
    };

    console.log(`Position for ${containerId}-${lineId}:`, position);
    return position;
  };

  useEffect(() => {
    const handleUpdate = () => {
      if (svgRef.current) {
        svgRef.current.setAttribute('width', String(window.innerWidth));
        svgRef.current.setAttribute('height', String(window.innerHeight));
      }
    };

    handleUpdate();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate);

    const sourceContainer = sourceContainerRef.current;
    const targetContainer = targetContainerRef.current;

    if (sourceContainer) sourceContainer.addEventListener('scroll', handleUpdate);
    if (targetContainer) targetContainer.addEventListener('scroll', handleUpdate);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
      if (sourceContainer) sourceContainer.removeEventListener('scroll', handleUpdate);
      if (targetContainer) targetContainer.removeEventListener('scroll', handleUpdate);
    };
  }, [links, pendingSourceIds, pendingTargetIds, clickLinkingStep]);

  // Font Settings Popover
  const fontSettingsContent = (
      <div className="w-80 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Size: {fontSettings.fontSize}px
          </label>
          <Slider
              min={10}
              max={32}
              value={fontSettings.fontSize}
              onChange={value => setFontSettings(prev => ({ ...prev, fontSize: value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source Font Family
          </label>
          <Select
              value={fontSettings.sourceFontFamily}
              onChange={value => setFontSettings(prev => ({ ...prev, sourceFontFamily: value }))}
              className="w-full"
          >
            {AVAILABLE_FONTS.map(font => (
                <Option key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                </Option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Font Family
          </label>
          <Select
              value={fontSettings.targetFontFamily}
              onChange={value => setFontSettings(prev => ({ ...prev, targetFontFamily: value }))}
              className="w-full"
          >
            {AVAILABLE_FONTS.map(font => (
                <Option key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                </Option>
            ))}
          </Select>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button
              size="small"
              icon={<ZoomIn size={14} />}
              onClick={increaseFontSize}
          >
            Larger
          </Button>
          <Button
              size="small"
              icon={<ZoomOut size={14} />}
              onClick={decreaseFontSize}
          >
            Smaller
          </Button>
        </div>
      </div>
  );


  if (!initialState) return <div>Loading alignment…</div>;

  return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Parallel Text Aligner</h1>
              <p className="text-sm text-gray-500 mt-1">
                {metadata.sourceTitle} ↔ {metadata.targetTitle}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              {/* Linking Mode Selector */}
              <div className="flex items-center gap-2 mr-4 px-3 py-1 bg-gray-100 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Mode:</span>
                <Radio.Group
                    value={linkingMode}
                    onChange={e => {
                      setLinkingMode(e.target.value);
                      // Reset states when switching modes
                      if (e.target.value === 'manual') {
                        cancelClickLinking();
                      } else {
                        setSelectedSourceIds([]);
                        setSelectedTargetIds([]);
                      }
                    }}
                    size="small"
                >
                  <Radio.Button value="click">
                    <MousePointer2 size={14} className="inline mr-1" />
                    Click
                  </Radio.Button>
                  <Radio.Button value="manual">
                    <Hand size={14} className="inline mr-1" />
                    Manual
                  </Radio.Button>
                </Radio.Group>
              </div>

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
                  disabled={historyIndex === history.length - 1}
                  title="Redo (Ctrl+Y)"
              >
                Redo
              </Button>
              <Popover
                  content={fontSettingsContent}
                  title="Font Settings"
                  trigger="click"
                  placement="bottomRight"
              >
                <Button icon={<Type size={16} />}>
                  Font
                </Button>
              </Popover>
              <Button
                  icon={<FileText size={16} />}
                  onClick={() => setIsMetadataModalVisible(true)}
              >
                Metadata
              </Button>
              <Button
                  type="default"
                  icon={<Download size={16} />}
                  onClick={exportToXML}
              >
                Export XML
              </Button>
              {linkingMode === 'manual' && (
                  <>
                    <Button
                        type="default"
                        icon={<LinkIcon size={16} />}
                        onClick={openCreateLinkModal}
                        disabled={selectedSourceIds.length === 0 || selectedTargetIds.length === 0}
                    >
                      Link ({selectedSourceIds.length} ↔ {selectedTargetIds.length})
                    </Button>
                    <Button
                        icon={<X size={16} />}
                        onClick={() => {
                          setSelectedSourceIds([]);
                          setSelectedTargetIds([]);
                        }}
                        disabled={selectedSourceIds.length === 0 && selectedTargetIds.length === 0}
                    >
                      Clear
                    </Button>
                  </>
              )}
              {linkingMode === 'click' && clickLinkingStep !== 'idle' && (
                  <Button
                      danger
                      icon={<X size={16} />}
                      onClick={cancelClickLinking}
                  >
                    Cancel Linking
                  </Button>
              )}
            </div>
          </div>

          {/* Click mode instruction */}
          {linkingMode === 'click' && (
              <div className="mt-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-900">
                  {clickLinkingStep === 'idle' && '💡 Click a source line to start creating a link'}
                  {clickLinkingStep === 'source-selected' && `✅ Source selected (${pendingSourceIds.length}). Click a target line to continue.`}
                  {clickLinkingStep === 'target-selected' && `✅ Target selected (${pendingTargetIds.length}). Configure link settings below.`}
                  {clickLinkingStep !== 'idle' && ' (Press ESC to cancel)'}
                </p>
              </div>
          )}
        </div>

        {/* Main Content */}
        {/* Main Content */}
        <svg
            ref={svgRef}
            className="absolute inset-0"
            style={{
              zIndex: 50,
              pointerEvents: 'none',
              width: '100%',
              height: '100%'
            }}
        >
          <g style={{ pointerEvents: 'auto' }}>
            {drawLinks()}
          </g>
        </svg>
        <div className="flex-1 flex overflow-hidden relative">
          {/* SVG Container - Fixed positioning */}
          {/*<div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>*/}
          {/*  <svg*/}
          {/*      ref={svgRef}*/}
          {/*      className="w-full h-full"*/}
          {/*      style={{*/}
          {/*        position: 'absolute',*/}
          {/*        top: 0,*/}
          {/*        left: 0,*/}
          {/*        width: '100%',*/}
          {/*        height: '100%',*/}
          {/*        pointerEvents: 'none'*/}
          {/*      }}*/}
          {/*  >*/}
          {/*    <g style={{ pointerEvents: 'auto' }}>{drawLinks()}</g>*/}
          {/*  </svg>*/}
          {/*</div>*/}

          {/* Source Lines */}
          <div
              ref={sourceContainerRef}
              className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-blue-50 to-white"
          >
            <div className="max-w-2xl ml-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Source ({metadata.sourceLang.toUpperCase()})
              </h2>
              <div className="space-y-3">
                {sourceLines.map((line, index) => {
                  const isSelected = linkingMode === 'manual'
                      ? selectedSourceIds.includes(line.id)
                      : pendingSourceIds.includes(line.id);
                  const linkedTo = links.filter(link => link.sourceIds.includes(line.id));
                  const isHighlighted = linkedTo.some(link => hoveredLink === link.id);
                  const isEditing = editingLine?.type === 'source' && editingLine?.id === line.id;

                  return (
                      <div
                          key={line.id}
                          id={`source-${line.id}`}
                          className={`relative bg-white rounded-lg shadow-sm border-2 transition-all ${
                              !isEditing && 'cursor-pointer'
                          } ${
                              isSelected
                                  ? linkingMode === 'click' ? 'border-purple-500 shadow-md ring-2 ring-purple-200' : 'border-blue-500 shadow-md'
                                  : isHighlighted
                                      ? 'border-blue-300'
                                      : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => !isEditing && handleLineClick('source', line.id)}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center min-w-[3rem]">
                              <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    openEditModal('line', line.id, 'lineNumber', line.lineNumber);
                                  }}
                                  className="text-xs font-mono font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200"
                                  title="Click to edit line number"
                              >
                                {line.lineNumber}
                              </button>
                              <span className="text-xs text-gray-400 mt-1">#{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              {isEditing ? (
                                  <div onClick={e => e.stopPropagation()}>
                                    <TextArea
                                        value={editingLine.text}
                                        onChange={e =>
                                            setEditingLine({ ...editingLine, text: e.target.value })
                                        }
                                        autoSize={{ minRows: 2, maxRows: 6 }}
                                        className="mb-2"
                                        style={{
                                          fontFamily: fontSettings.sourceFontFamily,
                                          fontSize: `${fontSettings.fontSize}px`,
                                        }}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                          size="small"
                                          type="default"
                                          icon={<Save size={14} />}
                                          onClick={saveLineEdit}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                          size="small"
                                          icon={<X size={14} />}
                                          onClick={cancelLineEdit}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                              ) : (
                                  <p
                                      className="text-gray-900 leading-relaxed"
                                      style={{
                                        fontFamily: fontSettings.sourceFontFamily,
                                        fontSize: `${fontSettings.fontSize}px`,
                                      }}
                                  >
                                    {line.text}
                                  </p>
                              )}
                              {line.comment && !isEditing && (
                                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
                                    <MessageSquare size={12} className="inline mr-1" />
                                    {line.comment}
                                  </div>
                              )}
                            </div>
                            {!isEditing && (
                                <div className="flex gap-1">
                                  <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        startEditingLine('source', line.id, line.text);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Edit text"
                                  >
                                    <Edit3 size={16} className="text-gray-400" />
                                  </button>
                                  <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        toggleLineFavorite('source', line.id);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Toggle favorite"
                                  >
                                    {line.isFavorite ? (
                                        <Star size={16} className="text-yellow-500 fill-current" />
                                    ) : (
                                        <StarOff size={16} className="text-gray-400" />
                                    )}
                                  </button>
                                  <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        openEditModal('line', line.id, 'comment', line.comment);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Add/edit comment"
                                  >
                                    <MessageSquare
                                        size={16}
                                        className={line.comment ? 'text-amber-500' : 'text-gray-400'}
                                    />
                                  </button>
                                </div>
                            )}
                          </div>
                        </div>
                        {linkedTo.length > 0 && !isEditing && (
                            <div className="px-4 pb-2 flex gap-1 flex-wrap">
                              {linkedTo.map(link => (
                                  <span
                                      key={link.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                                      style={{ backgroundColor: getConfidenceColor(link.confidence) }}
                                  >
                            {getConfidenceLabel(link.confidence)}
                          </span>
                              ))}
                            </div>
                        )}
                      </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Target Lines */}
          <div
              ref={targetContainerRef}
              className="flex-1 overflow-y-auto p-6 bg-gradient-to-bl from-green-50 to-white"
          >
            <div className="max-w-2xl mr-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Target ({metadata.targetLang.toUpperCase()})
              </h2>
              <div className="space-y-3">
                {targetLines.map((line, index) => {
                  const isSelected = linkingMode === 'manual'
                      ? selectedTargetIds.includes(line.id)
                      : pendingTargetIds.includes(line.id);
                  const linkedTo = links.filter(link => link.targetIds.includes(line.id));
                  const isHighlighted = linkedTo.some(link => hoveredLink === link.id);
                  const isEditing = editingLine?.type === 'target' && editingLine?.id === line.id;

                  return (
                      <div
                          key={line.id}
                          id={`target-${line.id}`}
                          className={`relative bg-white rounded-lg shadow-sm border-2 transition-all ${
                              !isEditing && 'cursor-pointer'
                          } ${
                              isSelected
                                  ? linkingMode === 'click' ? 'border-purple-500 shadow-md ring-2 ring-purple-200' : 'border-green-500 shadow-md'
                                  : isHighlighted
                                      ? 'border-green-300'
                                      : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => !isEditing && handleLineClick('target', line.id)}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col items-center min-w-[3rem]">
                              <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    openEditModal('line', line.id, 'lineNumber', line.lineNumber);
                                  }}
                                  className="text-xs font-mono font-semibold text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded border border-green-200"
                                  title="Click to edit line number"
                              >
                                {line.lineNumber}
                              </button>
                              <span className="text-xs text-gray-400 mt-1">#{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              {isEditing ? (
                                  <div onClick={e => e.stopPropagation()}>
                                    <TextArea
                                        value={editingLine.text}
                                        onChange={e =>
                                            setEditingLine({ ...editingLine, text: e.target.value })
                                        }
                                        autoSize={{ minRows: 2, maxRows: 6 }}
                                        className="mb-2"
                                        style={{
                                          fontFamily: fontSettings.targetFontFamily,
                                          fontSize: `${fontSettings.fontSize}px`,
                                        }}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                          size="small"
                                          type="default"
                                          icon={<Save size={14} />}
                                          onClick={saveLineEdit}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                          size="small"
                                          icon={<X size={14} />}
                                          onClick={cancelLineEdit}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                              ) : (
                                  <p
                                      className="text-gray-900 leading-relaxed"
                                      style={{
                                        fontFamily: fontSettings.targetFontFamily,
                                        fontSize: `${fontSettings.fontSize}px`,
                                      }}
                                  >
                                    {line.text}
                                  </p>
                              )}
                              {line.comment && !isEditing && (
                                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
                                    <MessageSquare size={12} className="inline mr-1" />
                                    {line.comment}
                                  </div>
                              )}
                            </div>
                            {!isEditing && (
                                <div className="flex gap-1">
                                  <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        startEditingLine('target', line.id, line.text);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Edit text"
                                  >
                                    <Edit3 size={16} className="text-gray-400" />
                                  </button>
                                  <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        toggleLineFavorite('target', line.id);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Toggle favorite"
                                  >
                                    {line.isFavorite ? (
                                        <Star size={16} className="text-yellow-500 fill-current" />
                                    ) : (
                                        <StarOff size={16} className="text-gray-400" />
                                    )}
                                  </button>
                                  <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        openEditModal('line', line.id, 'comment', line.comment);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      title="Add/edit comment"
                                  >
                                    <MessageSquare
                                        size={16}
                                        className={line.comment ? 'text-amber-500' : 'text-gray-400'}
                                    />
                                  </button>
                                </div>
                            )}
                          </div>
                        </div>
                        {linkedTo.length > 0 && !isEditing && (
                            <div className="px-4 pb-2 flex gap-1 flex-wrap">
                              {linkedTo.map(link => (
                                  <span
                                      key={link.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                                      style={{ backgroundColor: getConfidenceColor(link.confidence) }}
                                  >
                            {getConfidenceLabel(link.confidence)}
                          </span>
                              ))}
                            </div>
                        )}
                      </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Link Details Panel */}
        {hoveredLink && (() => {
          console.log("hoverlink", hoveredLink);
          const link = links.find(l => l.id === hoveredLink);
          if (!link) return null;

          const position = getOptimalPosition(mousePosition.x, mousePosition.y);

          return (
              <div
                  className="link-details-panel fixed bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-96"
                  style={{
                    zIndex: 10000,
                    left: `${position.left}px`,
                    top: `${position.top}px`,
                    pointerEvents: 'auto',
                  }}
                  onMouseEnter={() => {
                    // Clear any pending close timeout
                    if (closeTimeoutRef.current) {
                      clearTimeout(closeTimeoutRef.current);
                    }
                    setIsPanelHovered(true);
                  }}
                  onMouseLeave={() => {
                    setIsPanelHovered(false);
                    setHoveredLink(null);
                  }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <LinkIcon size={16} />
                    Link Details
                  </h3>
                  <button
                      onClick={() => setHoveredLink(null)}
                      className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Alignment</p>
                    <div className="font-mono text-xs bg-gray-50 p-2 rounded">
                      {link.sourceIds
                          .map(id => sourceLines.find(l => l.id === id)?.lineNumber)
                          .join(' ')}
                      {' ↔ '}
                      {link.targetIds
                          .map(id => targetLines.find(l => l.id === id)?.lineNumber)
                          .join(' ')}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {link.sourceIds.length} source ↔ {link.targetIds.length} target
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Confidence</p>
                    <span
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: getConfidenceColor(link.confidence) }}
                    >
            {getConfidenceLabel(link.confidence)} ({(link.confidence * 100).toFixed(0)}%)
          </span>
                  </div>

                  {link.strategy && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Strategy</p>
                        <p className="text-sm text-gray-700 bg-blue-50 p-2 rounded border border-blue-200">
                          {link.strategy}
                        </p>
                      </div>
                  )}

                  {link.comment && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Comment</p>
                        <p className="text-sm text-gray-700 bg-amber-50 p-2 rounded border border-amber-200">
                          {link.comment}
                        </p>
                      </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                        size="small"
                        icon={link.isFavorite ? <Star size={14} /> : <StarOff size={14} />}
                        onClick={() => toggleLinkFavorite(link.id)}
                        type={link.isFavorite ? 'primary' : 'default'}
                    >
                      {link.isFavorite ? 'Favorited' : 'Favorite'}
                    </Button>
                    <Button
                        size="small"
                        danger
                        icon={<Trash2 size={14} />}
                        onClick={() => {
                          deleteLink(link.id);
                          setHoveredLink(null);
                        }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
          );
        })()}

        {/* Quick Link Modal (Click Mode) */}
        <Modal
            title="Create Link (Quick Mode)"
            open={isQuickLinkModalVisible}
            onOk={confirmQuickLink}
            onCancel={cancelQuickLink}
            okText="Create Link"
            width={600}
            style={{ zIndex: 10001 }}
            maskStyle={{ zIndex: 10000 }}
            destroyOnClose={true}
        >
          <div className="space-y-4">
            <div className="bg-purple-50 p-3 rounded border border-purple-200">
              <p className="text-sm font-medium text-purple-900 mb-2">Selected Lines:</p>
              <div className="font-mono text-xs space-y-1">
                <div>
                  <span className="text-blue-600 font-semibold">Source: </span>
                  {pendingSourceIds
                      .map(id => sourceLines.find(l => l.id === id)?.lineNumber)
                      .join(', ')}
                </div>
                <div>
                  <span className="text-green-600 font-semibold">Target: </span>
                  {pendingTargetIds
                      .map(id => targetLines.find(l => l.id === id)?.lineNumber)
                      .join(', ')}
                </div>
              </div>
              <p className="text-xs text-purple-700 mt-2">
                Link Type: <strong>{getLinkType(pendingSourceIds.length, pendingTargetIds.length)}</strong>
                {' '}({pendingSourceIds.length} source{pendingSourceIds.length > 1 ? 's' : ''} ↔ {pendingTargetIds.length} target{pendingTargetIds.length > 1 ? 's' : ''})
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Level: {(linkConfidence * 100).toFixed(0)}%
              </label>
              <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={linkConfidence}
                  onChange={value => setLinkConfidence(value)}
              />
              <div className="flex justify-between mt-2">
        <span
            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
            style={{ backgroundColor: getConfidenceColor(linkConfidence) }}
        >
          {getConfidenceLabel(linkConfidence)}
        </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Translation Strategy (Optional)
              </label>
              <TextArea
                  rows={2}
                  value={linkStrategy}
                  onChange={e => setLinkStrategy(e.target.value)}
                  placeholder="e.g., Syntactic condensation for better flow..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (Optional)
              </label>
              <TextArea
                  rows={2}
                  value={linkComment}
                  onChange={e => setLinkComment(e.target.value)}
                  placeholder="Add any notes or observations..."
              />
            </div>
          </div>
        </Modal>
        {/* Create Link Modal (Manual Mode) */}
        <Modal
            title="Create Link"
            open={isCreateLinkModalVisible}
            onOk={createLink}
            onCancel={() => {
              setIsCreateLinkModalVisible(false);
              setLinkConfidence(0.8);
              setLinkStrategy('');
              setLinkComment('');
            }}
            okText="Create Link"
            width={600}
            style={{ zIndex: 10001 }}
            maskStyle={{ zIndex: 10000 }}
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Selected Lines:</p>
              <div className="font-mono text-xs space-y-1">
                <div>
                  <span className="text-blue-600 font-semibold">Source: </span>
                  {selectedSourceIds
                      .map(id => sourceLines.find(l => l.id === id)?.lineNumber)
                      .join(', ')}
                </div>
                <div>
                  <span className="text-green-600 font-semibold">Target: </span>
                  {selectedTargetIds
                      .map(id => targetLines.find(l => l.id === id)?.lineNumber)
                      .join(', ')}
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Link Type: <strong>{getLinkType(selectedSourceIds.length, selectedTargetIds.length)}</strong>
                {' '}({selectedSourceIds.length} source{selectedSourceIds.length > 1 ? 's' : ''} ↔ {selectedTargetIds.length} target{selectedTargetIds.length > 1 ? 's' : ''})
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Level: {(linkConfidence * 100).toFixed(0)}%
              </label>
              <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={linkConfidence}
                  onChange={value => setLinkConfidence(value)}
              />
              <div className="flex justify-between mt-2">
        <span
            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
            style={{ backgroundColor: getConfidenceColor(linkConfidence) }}
        >
          {getConfidenceLabel(linkConfidence)}
        </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Translation Strategy (Optional)
              </label>
              <TextArea
                  rows={2}
                  value={linkStrategy}
                  onChange={e => setLinkStrategy(e.target.value)}
                  placeholder="e.g., Syntactic condensation for better flow..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (Optional)
              </label>
              <TextArea
                  rows={2}
                  value={linkComment}
                  onChange={e => setLinkComment(e.target.value)}
                  placeholder="Add any notes or observations..."
              />
            </div>
          </div>
        </Modal>

        {/* Edit Comment Modal */}
        <Modal
            title="Edit Comment"
            open={isCommentModalVisible}
            onOk={saveEdit}
            onCancel={() => {
              setIsCommentModalVisible(false);
              setEditingItem(null);
              setEditValue('');
            }}
            okText="Save"
        >
          <TextArea
              rows={4}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              placeholder="Enter comment..."
          />
        </Modal>

        {/* Edit Line Number Modal */}
        <Modal
            title="Edit Line Number"
            open={isEditLineModalVisible}
            onOk={saveEdit}
            onCancel={() => {
              setIsEditLineModalVisible(false);
              setEditingItem(null);
              setEditValue('');
            }}
            okText="Save"
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Enter the line number ID (e.g., s1, s2, p1.s1). This will be used in the XML export.
            </p>
            <Input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                placeholder="e.g., s1"
                className="font-mono"
            />
          </div>
        </Modal>

        {/* Metadata Modal */}
        <Modal
            title="Document Metadata"
            open={isMetadataModalVisible}
            onOk={() => setIsMetadataModalVisible(false)}
            onCancel={() => setIsMetadataModalVisible(false)}
            width={700}
        >
          <Form layout="vertical">
            <div className="grid grid-cols-2 gap-4">
              <Form.Item label="Source Title">
                <Input
                    value={metadata.sourceTitle}
                    onChange={e => setMetadata({ ...metadata, sourceTitle: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="Target Title">
                <Input
                    value={metadata.targetTitle}
                    onChange={e => setMetadata({ ...metadata, targetTitle: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="Source Language">
                <Input
                    value={metadata.sourceLang}
                    onChange={e => setMetadata({ ...metadata, sourceLang: e.target.value })}
                    placeholder="e.g., en"
                />
              </Form.Item>
              <Form.Item label="Target Language">
                <Input
                    value={metadata.targetLang}
                    onChange={e => setMetadata({ ...metadata, targetLang: e.target.value })}
                    placeholder="e.g., fr"
                />
              </Form.Item>
              <Form.Item label="Source Document">
                <Input
                    value={metadata.sourceDoc}
                    onChange={e => setMetadata({ ...metadata, sourceDoc: e.target.value })}
                    placeholder="e.g., en_source.xml"
                />
              </Form.Item>
              <Form.Item label="Target Document">
                <Input
                    value={metadata.targetDoc}
                    onChange={e => setMetadata({ ...metadata, targetDoc: e.target.value })}
                    placeholder="e.g., fr_target.xml"
                />
              </Form.Item>
              <Form.Item label="Source Author">
                <Input
                    value={metadata.sourceAuthor}
                    onChange={e => setMetadata({ ...metadata, sourceAuthor: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="Translator">
                <Input
                    value={metadata.translator}
                    onChange={e => setMetadata({ ...metadata, translator: e.target.value })}
                />
              </Form.Item>
            </div>
            <Form.Item label="Strategy Profile">
              <TextArea
                  rows={2}
                  value={metadata.strategyProfile}
                  onChange={e => setMetadata({ ...metadata, strategyProfile: e.target.value })}
              />
            </Form.Item>
          </Form>
        </Modal>

      </div>
  );
};

export default AlignmentManagerPage;