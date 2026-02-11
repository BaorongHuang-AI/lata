// src/utils/confidence.ts
export const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#3b82f6';
    if (confidence >= 0.4) return '#f59e0b';
    return '#ef4444';
};

export const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
};