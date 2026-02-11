import crypto from "crypto";
import os from "os";

const ALGO = "aes-256-gcm";

/**
 * Stable machine-bound secret fallback
 */
function getBaseSecret() {
    return (
        process.env.APP_SECRET ||
        crypto
            .createHash("sha256")
            .update(os.hostname() + os.userInfo().username)
            .digest("hex")
    );
}

const KEY = crypto
    .createHash("sha256")
    .update(getBaseSecret())
    .digest();

/* ----------------------------
   Encrypt
----------------------------- */
export function encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/* ----------------------------
   Decrypt
----------------------------- */
export function decrypt(payload: string): string {
    const buf = Buffer.from(payload, "base64");

    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);

    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);

    return (
        decipher.update(encrypted, undefined, "utf8") +
        decipher.final("utf8")
    );
}
