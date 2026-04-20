// src/components/alignment/FontSettingsPopover.tsx
import React from 'react';
import { Button, Select, Slider, Popover } from 'antd';
import { Type, ZoomIn, ZoomOut } from 'lucide-react';
import type { FontSettings } from '../../types/alignment';
import { AVAILABLE_FONTS } from '../../constants/fonts';

const { Option } = Select;

interface FontSettingsPopoverProps {
    fontSettings: FontSettings;
    setFontSettings: (settings: FontSettings | ((prev: FontSettings) => FontSettings)) => void;
}

export const FontSettingsPopover: React.FC<FontSettingsPopoverProps> = ({
                                                                            fontSettings,
                                                                            setFontSettings,
                                                                        }) => {
    const content = (
        <div className="w-80 space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Size: {fontSettings.fontSize}px
    </label>
    <Slider
    min={10}
    max={32}
    value={fontSettings.fontSize}
    onChange={(value) => setFontSettings((prev) => ({ ...prev, fontSize: value }))}
    />
    </div>

    <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
        Source Font Family
    </label>
    <Select
    value={fontSettings.sourceFontFamily}
    onChange={(value) => setFontSettings((prev) => ({ ...prev, sourceFontFamily: value }))}
    className="w-full"
        >
        {AVAILABLE_FONTS.map((font) => (
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
    onChange={(value) => setFontSettings((prev) => ({ ...prev, targetFontFamily: value }))}
    className="w-full"
        >
        {AVAILABLE_FONTS.map((font) => (
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
    onClick={() =>
    setFontSettings((prev) => ({
        ...prev,
        fontSize: Math.min(prev.fontSize + 2, 32),
    }))
}
>
    Larger
    </Button>
    <Button
    size="small"
    icon={<ZoomOut size={14} />}
    onClick={() =>
    setFontSettings((prev) => ({
        ...prev,
        fontSize: Math.max(prev.fontSize - 2, 10),
    }))
}
>
    Smaller
    </Button>
    </div>
    </div>
);

    return (
        <Popover content={content} title="Font Settings" trigger="click" placement="bottomRight">
    <Button icon={<Type size={16} />}>Font</Button>
    </Popover>
);
};