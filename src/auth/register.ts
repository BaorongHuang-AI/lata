import {db} from "../db/db";
import { hashPassword } from "./password";

export function registerUser(data: {
    username: string;
    password: string;
    cellphone?: string;
    email?: string;
    age?: number;
    gender?: number;
    university?: string;
    major?: string;
    grade?: string;
}) {
    const hashed = hashPassword(data.password);

    const stmt = db.prepare(`
    INSERT INTO sys_user (
      user_name,
      password,
      cellphone,
      email,
      age,
      gender,
      university,
      major,
      grade
    ) VALUES (
      @username,
      @password,
      @cellphone,
      @email,
      @age,
      @gender,
      @university,
      @major,
      @grade
    )
  `);

    stmt.run({
        ...data,
        password: hashed,
    });

    return true;
}
