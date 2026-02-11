import path from "path";
import {decrypt, encrypt} from "../security/crypto";
import {db} from "./db";
import {LLMSettings, ModelCredential, ModelCredentialRow} from "../types/alignment";
import {AVAILABLE_MODELS} from "../constants/models";
import OpenAI from "openai";



/* ---------------------------
   Read
---------------------------- */
export function getLLMSettings() {
    const row = db
        .prepare(`SELECT * FROM llm_settings WHERE id = 1`)
        .get();

    let apiKey = "";

    if (row?.openrouter_api_key_enc) {
        try {
            apiKey = decrypt(row.openrouter_api_key_enc);
        } catch {
            apiKey = "";
        }
    } else {
        apiKey = process.env.OPENROUTER_API_KEY || "";
    }

    return {
        apiKey,
        defaultModel: row?.default_model || "openai/gpt-4o",
    };
}


export async function testCredential(modelId: string): Promise<void> {
    const cred = loadCredential(modelId);

    const client = new OpenAI({
        apiKey: cred.apiKey,
        baseURL: cred.baseUrl,
    });

    try {
        // 1️⃣ Fastest possible test (no token cost)
        await client.models.list();
        return;
    } catch (err: any) {
        // 2️⃣ Fallback: minimal completion (some providers restrict /models)
        try {
            await client.chat.completions.create({
                model: modelId,
                messages: [
                    { role: "user", content: "ping" }
                ],
                max_tokens: 1,
            });
            return;
        } catch (innerErr: any) {
            throw new Error(
                normalizeLLMTestError(innerErr)
            );
        }
    }
}

export function loadCredential(modelId: string): ModelCredential {
    const row = db
        .prepare(`
            SELECT model_id, api_key_enc, base_url
            FROM llm_model_credentials
            WHERE model_id = ?
        `)
        .get(modelId);

    if (!row) {
        throw new Error(
            `No API credential configured for model: ${modelId}`
        );
    }

    return {
        modelId: row.model_id,
        apiKey: decrypt(row.api_key_enc),
        baseUrl: row.base_url,
    };
}


export function loadDefaultModel() {
    // 1️⃣ If modelId is not passed, query DB for default

        const models = db.prepare(`
        SELECT
          id,
          model_name,
          base_url,
           api_key,
          is_default
        FROM llm_settings
        ORDER BY updated_at DESC
      `).all();

        const defaultModel = models.find(m => m.is_default === 1);
        if (!defaultModel) throw new Error("No default LLM model found.");
        return {
            apiKey: defaultModel.api_key, // decrypted if needed
            baseUrl: defaultModel.base_url,
            modelName: defaultModel.model_name,
        };

}

/* ---------------------------
   Write
---------------------------- */
// export function saveLLMSettings(apiKey: string, defaultModel: string) {
//     const encryptedKey = apiKey ? encrypt(apiKey) : null;
//
//     db.prepare(`
//         UPDATE llm_settings
//         SET
//             openrouter_api_key_enc = ?,
//             default_model = ?,
//             updated_at = CURRENT_TIMESTAMP
//         WHERE id = 1
//     `).run(encryptedKey, defaultModel);
// }


export function saveLLMSettings(settings: LLMSettings) {
    const tx = db.transaction(() => {
        db.prepare(`
            UPDATE llm_settings
            SET default_model = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run(settings.defaultModel);

        const upsert = db.prepare(`
            INSERT INTO llm_settings (model_name, api_key, base_url)
            VALUES (?, ?, ?)
            ON CONFLICT(model_name) DO UPDATE SET
                api_key = excluded.api_key,
                base_url = excluded.base_url,
                updated_at = CURRENT_TIMESTAMP
        `);

        for (const [modelId, cred] of Object.entries(settings.credentials)) {
            const model = AVAILABLE_MODELS.find(m => m.id === modelId);
            if (!model || !cred.apiKey) continue;

            upsert.run(
                modelId,
                encrypt(cred.apiKey),
                model.routeURL
            );
        }
    });

    tx();
}

export function loadDefaultCredential(): ModelCredential {
    const settings = db
        .prepare(`
            SELECT default_model
            FROM llm_settings
            WHERE id = 1
        `)
        .get();

    if (!settings) {
        throw new Error("LLM settings not initialized");
    }

    return loadCredential(settings.default_model);
}


export function loadAllCredentials(): Record<string, ModelCredential> {
    const rows = db
        .prepare(`
            SELECT model_id, api_key_enc, base_url
            FROM llm_model_credentials
        `)
        .all();

    const result: Record<string, ModelCredential> = {};

    for (const row of rows) {
        result[row.model_id] = {
            modelId: row.model_id,
            apiKey: decrypt(row.api_key_enc),
            baseUrl: row.base_url,
        };
    }

    return result;
}

function normalizeLLMTestError(err: any): string {
    const msg =
        err?.error?.message ||
        err?.message ||
        "Unknown error";

    if (msg.includes("401") || msg.includes("Unauthorized")) {
        return "Invalid API key";
    }

    if (msg.includes("model") && msg.includes("not found")) {
        return "Model not available for this API key";
    }

    if (msg.includes("quota") || msg.includes("billing")) {
        return "API key has no remaining quota";
    }

    return `Connection failed: ${msg}`;
}
