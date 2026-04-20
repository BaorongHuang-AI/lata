// src/utils/linkHelpers.ts
export const getLinkType = (
    sourceCount: number,
    targetCount: number
): '1:1' | '1:many' | 'many:1' | 'many:many' => {
    if (sourceCount === 1 && targetCount === 1) return '1:1';
    if (sourceCount === 1 && targetCount > 1) return '1:many';
    if (sourceCount > 1 && targetCount === 1) return 'many:1';
    return 'many:many';
};

export const getOptimalPosition = (
    x: number,
    y: number,
    panelWidth = 384,
    panelHeight = 400
) => {
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = x + padding;
    let top = y + padding;

    if (left + panelWidth > viewportWidth) {
        left = x - panelWidth - padding;
    }
    if (top + panelHeight > viewportHeight) {
        top = Math.max(padding, viewportHeight - panelHeight - padding);
    }
    if (left < 0) {
        left = padding;
    }
    if (top < 0) {
        top = padding;
    }

    return { left, top };
};