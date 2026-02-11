import jwt from "jsonwebtoken";

const JWT_SECRET = "CHANGE_THIS_SECRET_IN_PROD";
const EXPIRES_IN = "7d";

export interface JwtPayload {
    userId: number;
    username: string;
    role: string;
}

export function signToken(payload: JwtPayload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: EXPIRES_IN,
    });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
