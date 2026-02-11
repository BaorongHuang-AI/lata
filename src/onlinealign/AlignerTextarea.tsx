import {getDir} from "../utils/LayoutUtils";

interface AlignerTextareaProps {
    value: string;
    onChange: (v: string) => void;
    language?: string;
    placeholder: string;
}

const AlignerTextarea: React.FC<AlignerTextareaProps> = ({
                                                             value,
                                                             onChange,
                                                             language,
                                                             placeholder,
                                                         }) => {
    const dir = getDir(language);

    return (
        <textarea
            dir={dir}
            className={`
        textarea textarea-bordered w-full h-64
        ${dir === "rtl" ? "text-right font-arabic" : "text-left"}
      `}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    );
};
