
// import { MODEL_PRICING } from "../llm/pricing";
import {db} from "./db";

//
//
// export function logLLMUsage(params: {
//     userId: number;
//     feature: string;
//     model: string;
//     promptTokens: number;
//     completionTokens: number;
// }) {
//     const pricing = MODEL_PRICING[params.model];
//
//     const cost =
//         pricing
//             ? params.promptTokens * pricing.input +
//             params.completionTokens * pricing.output
//             : 0;
//
//     db.prepare(`
//         INSERT INTO llm_usage (
//             user_id,
//             feature,
//             model,
//             prompt_tokens,
//             completion_tokens,
//             total_tokens,
//             cost_usd
//         )
//         VALUES (?, ?, ?, ?, ?, ?, ?)
//     `).run(
//         params.userId,
//         params.feature,
//         params.model,
//         params.promptTokens,
//         params.completionTokens,
//         params.promptTokens + params.completionTokens,
//         cost
//     );
// }
