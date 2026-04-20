import pLimit from "p-limit";

/**
 * Embedding config
 */
export type EmbeddingConfig = {
    provider: "openai" | "alibaba";
    apiKey?: string;
    model?: string;

    concurrency?: number;
    maxTokensPerRequest?: number;
    maxRetries?: number;
};

/**
 * Dummy universal client wrapper
 * Replace this with your actual implementation
 */
class UniversalEmbeddingClient {
    client: any;

    constructor(config: EmbeddingConfig) {
        // config.apiKey = "sk-20a245ab94b744818b5182958c2a10ed";
        // config.provider = "alibaba";
        if (config.provider === "openai") {
            const OpenAI = require("openai");
            this.client = new OpenAI({
                apiKey: config.apiKey || process.env.OPENAI_API_KEY,
            });
        } else if (config.provider === "alibaba") {
            // Replace with your Alibaba SDK initialization
            const OpenAI = require("openai"); // often compatible wrapper
            this.client = new OpenAI({
                apiKey: config.apiKey || process.env.ALIBABA_API_KEY,
                baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
            });
        }
    }
}

/**
 * Rough token estimator
 * (safe approximation: 1 token ≈ 4 chars)
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Retry with exponential backoff
 */
async function retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
): Promise<T> {
    let attempt = 0;

    while (true) {
        try {
            return await fn();
        } catch (err: any) {
            const status = err?.status || err?.response?.status;

            const isRetryable =
                status === 429 || // rate limit
                status >= 500;    // server error

            if (!isRetryable || attempt >= maxRetries) {
                throw err;
            }

            const delay = Math.pow(2, attempt) * 500;
            await new Promise((r) => setTimeout(r, delay));

            attempt++;
        }
    }
}

/**
 * Centralized config factory
 * (reads from env or defaults)
 */
function EmbeddingConfig() {
    const provider = (process.env.EMBEDDING_PROVIDER || "openai") as
        | "alibaba" | "openai";

    return {
        provider,
        apiKey:
            provider === "alibaba"
                ? process.env.ALIBABA_API_KEY
                : process.env.OPENAI_API_KEY,

        model:
            process.env.EMBEDDING_MODEL ||
            (provider === "alibaba"
                ? "text-embedding-v2"
                : "text-embedding-3-small"),

        concurrency: Number(process.env.EMBEDDING_CONCURRENCY || 5),
        maxTokensPerRequest: Number(process.env.MAX_TOKENS_PER_REQ || 8000),
        maxRetries: Number(process.env.EMBEDDING_MAX_RETRIES || 3),
    };
}

/**
 * Main embedding service
 */
export class EmbeddingService {
    static async embedBatch(
        sentences: { text: string }[],
    ): Promise<number[][]> {
        const config = EmbeddingConfig();
        config.provider = "alibaba";
        config.model = "text-embedding-v2";
        const universalClient = new UniversalEmbeddingClient(config);

        const model =
            config.model ||
            (config.provider === "alibaba"
                ? "text-embedding-v2"
                : "text-embedding-3-small");

        const MAX_BATCH_SIZE: Record<string, number> = {
            alibaba: 10,
            openai: 1000,
        };

        const batchSize = MAX_BATCH_SIZE[config.provider];
        const maxTokens = config.maxTokensPerRequest || 8000;
        const concurrency = config.concurrency || 5;
        const maxRetries = config.maxRetries || 3;

        /**
         * Step 1: Token-aware batching
         */
        const batches: { text: string }[][] = [];
        let currentBatch: { text: string }[] = [];
        let currentTokens = 0;

        for (const s of sentences) {
            const tokens = estimateTokens(s.text);

            const exceedsBatchSize = currentBatch.length >= batchSize;
            const exceedsTokens = currentTokens + tokens > maxTokens;

            if (exceedsBatchSize || exceedsTokens) {
                if (currentBatch.length > 0) {
                    batches.push(currentBatch);
                }
                currentBatch = [];
                currentTokens = 0;
            }

            currentBatch.push(s);
            currentTokens += tokens;
        }

        if (currentBatch.length > 0) {
            batches.push(currentBatch);
        }

        /**
         * Step 2: Concurrency control
         */
        const limit = pLimit(concurrency);

        const tasks = batches.map((batch) =>
            limit(() =>
                retry(
                    async () => {
                        const res = await universalClient.client.embeddings.create({
                            model,
                            input: batch.map((s) => s.text),
                        });

                        return res.data.map((d: any) => d.embedding);
                    },
                    maxRetries
                )
            )
        );

        /**
         * Step 3: Execute
         */
        const results = await Promise.all(tasks);

        return results.flat();
    }
}