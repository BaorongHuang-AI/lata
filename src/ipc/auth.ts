import { ipcMain } from "electron";
const Store = require("electron-store").default;

const PASSWORD_123456_HASH =
    "$2b$12$2PKgQFgW.y5ucT4ynldl6.92eSKVfyfOYgUOFqBo8wGD5Ha1qOqYG";

import { registerUser } from "../auth/register";
import {autoLogin, loginUser} from "../auth/logindb";
import {clearSession, saveSession} from "../auth/session";
import {db} from "../db/db";
const store = new Store();

ipcMain.handle("auth:register", async (_, form) => {
    registerUser(form);
    return { success: true };
});



ipcMain.handle(
    "auth:reset-password-by-email",
    (_event, email: string) => {
        if (!email) {
            throw new Error("Email is required");
        }

        const user = db.prepare(`
      SELECT id, user_name
      FROM sys_user
      WHERE email = ?
    `).get(email);

        if (!user) {
            return {
                success: false,
                message: "User not found"
            };
        }

        db.prepare(`
      UPDATE sys_user
      SET
        password = ?,
        enabled = 1,
        status = 1,
        is_first_login = 0
      WHERE id = ?
    `).run(PASSWORD_123456_HASH, user.id);

        return {
            success: true,
            userId: user.id,
            userName: user.user_name
        };
    }
);

ipcMain.handle("auth:login", async (_event, { usernameOrEmail, password }) => {
    const { user, token } = loginUser(usernameOrEmail, password);
    // Store token for auto-login
    store.set("session", { token, user });
    return { user, token };
});

ipcMain.handle("auth:getSession", async () => {
    const session = store.get("session");
    return session || null;
});

ipcMain.handle("auth:logout", async () => {
    store.delete("session");
    return true;
});
// ipcMain.handle("auth:login", async (_, { identifier, password }) => {
//     const { user, token } = loginUser(identifier, password);
//     saveSession(token);
//     return { user, token };
// });

ipcMain.handle("auth:restore", async () => {
    const payload = autoLogin();
    if (!payload) return null;
    return payload;
});
//
// ipcMain.handle("auth:logout", async () => {
//     clearSession();
//     return true;
// });
