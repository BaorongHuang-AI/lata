import {RTL_LANGS} from "./Constants";

// const RTL_LANGS = new Set([
//     "ar", // Arabic
//     "he", // Hebrew
//     "fa", // Persian
//     "ur", // Urdu
// ]);

export function getDir(language?: string): "ltr" | "rtl" {
    if (!language) return "ltr";

    const lang = language.toLowerCase().split("-")[0];

    return RTL_LANGS.includes(lang) ? "rtl" : "ltr";
}