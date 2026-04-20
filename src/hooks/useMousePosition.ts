// src/hooks/useMousePosition.ts
import { useState, useCallback, useRef } from 'react';

export const useMousePosition = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const mouseMoveTimeoutRef = useRef<NodeJS.Timeout>();

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (mouseMoveTimeoutRef.current) {
            clearTimeout(mouseMoveTimeoutRef.current);
        }

        mouseMoveTimeoutRef.current = setTimeout(() => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        }, 50);
    }, []);

    return { mousePosition, handleMouseMove };
};