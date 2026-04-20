import {db} from "../db/db";

export function saveSession(token: string) {
    db.prepare("DELETE FROM user_session").run();
    db.prepare("INSERT INTO user_session (token) VALUES (?)").run(token);
}

export function getSession(): string | null {
    const row = db.prepare("SELECT token FROM user_session LIMIT 1").get();
    return row?.token || null;
}

export function clearSession() {
    db.prepare("DELETE FROM user_session").run();
}
