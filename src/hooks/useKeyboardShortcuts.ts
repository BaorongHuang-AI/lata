// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
    undo: () => void;
    redo: () => void;
    cancelClickLinking: () => void;
    clickLinkingStep: 'idle' | 'source-selected' | 'target-selected';
}

export const useKeyboardShortcuts = ({
                                         undo,
                                         redo,
                                         cancelClickLinking,
                                         clickLinkingStep,
                                     }: UseKeyboardShortcutsProps) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Undo: Ctrl+Z or Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Redo: Ctrl+Y, Cmd+Y, or Ctrl+Shift+Z, Cmd+Shift+Z
            else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
            }
            // Cancel linking: Escape
            else if (e.key === 'Escape') {
                if (clickLinkingStep !== 'idle') {
                    cancelClickLinking();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, cancelClickLinking, clickLinkingStep]);
};