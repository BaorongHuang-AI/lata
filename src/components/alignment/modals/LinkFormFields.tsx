import React, { useEffect, useState } from 'react';
import { Slider, Input, Select } from 'antd';
import { getConfidenceColor, getConfidenceLabel } from '../../../utils/confidence';

const { TextArea } = Input;

const STRATEGY_SEPARATOR = ' | ';

function parseStrategy(value?: string): string[] {
    if (!value) return [];
    return Array.from(
        new Set(
            value
                .split(STRATEGY_SEPARATOR)
                .map(s => s.trim())
                .filter(Boolean)
        )
    );
}

function getCanonicalOrder(tags: any[]): Map<string, number> {
    return new Map(tags.map((t, i) => [t.name, i]));
}

function stringifyStrategy(values: string[], tags: any[]): string {
    const orderMap = getCanonicalOrder(tags);
    return Array.from(new Set(values))
        .sort((a, b) => {
            const ia = orderMap.get(a);
            const ib = orderMap.get(b);
            if (ia == null && ib == null) return a.localeCompare(b);
            if (ia == null) return 1;
            if (ib == null) return -1;
            return ia - ib;
        })
        .join(STRATEGY_SEPARATOR);
}

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
    const [tags, setTags] = useState<any[]>([]);

    useEffect(() => {
        window.api.listTags().then(setTags);
    }, []);

    const selectedValues = parseStrategy(linkFormState.strategy);

    const handleSelectChange = (values: string[]) => {
        onStrategyChange?.(stringifyStrategy(values, tags));
    };

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
                    disabled={!onConfidenceChange}
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
                    Translation Technique (Optional)
                </label>
                <Select<string[]>
                    mode="multiple"
                    allowClear
                    placeholder="Select translation techniques"
                    value={selectedValues}
                    onChange={handleSelectChange}
                    options={tags}
                    fieldNames={{ label: 'name', value: 'name' }}
                    style={{ width: '100%' }}
                    disabled={!onStrategyChange}
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
                    disabled={!onCommentChange}
                />
            </div>
        </>
    );
};
