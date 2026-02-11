import { ipcMain } from "electron";
import {tagService} from "../db/tagService";


ipcMain.handle("tags:list", () => tagService.listTags());
ipcMain.handle("tags:create", (_, data) => tagService.createTag(data));
ipcMain.handle("tags:update", (_, id, data) => tagService.updateTag(id, data));
ipcMain.handle("tags:delete", (_, id) => tagService.deleteTag(id));
