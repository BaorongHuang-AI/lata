import { ipcMain } from "electron";
import {getLLMSettings, saveLLMSettings, testCredential} from "../db/llmSettings";
import {sendChatCompletion} from "../utils/sendChatCompletion";
ipcMain.handle(
    "llm:test-credential",
    async (_event, modelId: string) => {
        await testCredential(modelId);
        return { ok: true };
    }
);

ipcMain.handle(
    "llm:chat",
    async (_event, request) => {
        return await sendChatCompletion(request);
    }
);