export type PromptTaskType =
    | "sentence_segmentation"
    | "parallel_alignment"
    | "sentence_alignment";

export interface PromptEntity {
    id?: number;
    task_type: PromptTaskType;
    name: string;
    userPrompt: string;
    systemPrompt: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    is_active?: number;
}
