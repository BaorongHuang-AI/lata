import {db} from "./db";


export class TagService {
    listTags() {
        return db.prepare("SELECT * FROM translation_tags ORDER BY id DESC").all();
    }

    createTag(data: { name: string; description?: string; sample?:string; color?: string }) {
        const stmt = db.prepare(`
      INSERT INTO translation_tags (name, description, sample, color)
      VALUES (?, ?, ?, ?)
    `);
        return stmt.run(data.name, data.description ?? "", data.sample ?? "", data.color ?? "#38bdf8");
    }

    updateTag(id: number, data: { name: string; description?: string; sample?:string; color?: string }) {
        const stmt = db.prepare(`
      UPDATE translation_tags SET
        name = ?,
        description = ?,
        color = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
        return stmt.run(data.name, data.description ?? "",  data.sample ?? "", data.color ?? "#38bdf8", id);
    }

    deleteTag(id: number) {
        return db.prepare("DELETE FROM translation_tags WHERE id = ?").run(id);
    }
}

export const tagService = new TagService();
