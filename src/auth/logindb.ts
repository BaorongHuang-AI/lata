
import { verifyPassword } from "./password";
import {signToken, verifyToken} from "./jwt";
import {getSession} from "./session";
import {db} from "../db/db";



export function loginUser(usernameOrEmail: string, password: string) {
    console.log("[loginUser] called with:", usernameOrEmail);
    const user = db.prepare(`
    SELECT *
    FROM sys_user
    WHERE user_name = ?
       OR email = ?
       OR cellphone = ?
  `).get(usernameOrEmail, usernameOrEmail, usernameOrEmail);

    if (!user) throw new Error("User not found");
    if (!user.enabled || user.locked || user.expired)
        throw new Error("Account disabled");

    if (!verifyPassword(password, user.password))
        throw new Error("Invalid password");
    console.log("[loginUser] user from DB:", user);

    const token = signToken({
        userId: user.user_id,
        username: user.user_name,
        role: user.role,
    });

    delete user.password;

    return {
        user,
        token,
    };
}


export function autoLogin() {
    const token = getSession();
    if (!token) return null;

    try {
        return verifyToken(token);
    } catch {
        return null;
    }
}