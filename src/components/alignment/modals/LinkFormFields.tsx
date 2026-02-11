import React from 'react';
import { Slider, Input } from 'antd';
import { getConfidenceColor, getConfidenceLabel } from '../../../utils/confidence';

const { TextArea } = Input;

interface LinkFormFieldsProps {
    linkFormState: {
        confidence: number;
        strategy: string;
        comment: string;
    };
    onConfidenceChange?: (value: number) => void;
    onStrategyChange?: (value: string) => void;
    onCommentChange?: (value: string) => void;
}

export const LinkFormFields: React.FC<LinkFormFieldsProps> = ({
                                                                  linkFormState,
                                                                  onConfidenceChange,
                                                                  onStrategyChange,
                                                                  onCommentChange,
                                                              }) => {
    return (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confidence Level: {(linkFormState.confidence * 100).toFixed(0)}%
                </label>
                <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={linkFormState.confidence}
                    onChange={onConfidenceChange}
                    disabled={!onConfidenceChange} // Disable if no handler
                />
                <div className="flex justify-between mt-2">
          <span
              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: getConfidenceColor(linkFormState.confidence) }}
          >
            {getConfidenceLabel(linkFormState.confidence)}
          </span>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Translation Strategy (Optional)
                </label>
                <TextArea
                    rows={2}
                    value={linkFormState.strategy}
                    onChange={(e) => onStrategyChange?.(e.target.value)}
                    placeholder="e.g., Syntactic condensation for better flow..."
                    disabled={!onStrategyChange} // Disable if no handler
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment (Optional)
                </label>
                <TextArea
                    rows={2}
                    value={linkFormState.comment}
                    onChange={(e) => onCommentChange?.(e.target.value)}
                    placeholder="Add any notes or observations..."
                    disabled={!onCommentChange} // Disable if no handler
                />
            </div>
        </>
    );
};