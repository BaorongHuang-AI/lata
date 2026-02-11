
import { ipcMain } from "electron";
import * as service from "../db/promptService";
import {PromptEntity} from "../types/prompt";


ipcMain.handle("prompts:list", (): PromptEntity[] => service.listPrompts());
ipcMain.handle("prompts:save", (_, p: PromptEntity) => service.savePrompt(p));
ipcMain.handle("prompts:delete", (_, id: number) => service.deletePrompt(id));
ipcMain.handle("prompts:update", (_, id: number, data) =>
    service.updatePrompt(id, data)
);
