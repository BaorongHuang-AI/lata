import {db} from "./db";
import {PromptEntity} from "../types/prompt";

export function listPrompts(): PromptEntity[] {
  return db.prepare("SELECT * FROM llm_prompts ORDER BY task_type, name").all();
}

export function savePrompt(p: PromptEntity) {
  console.log("p", p);
  return db.prepare(`
    INSERT INTO llm_prompts (task_type, name, system_prompt, user_prompt, model, temperature, max_tokens)
    VALUES (@task_type, @name, @systemPrompt, @userPrompt, @model, @temperature, @max_tokens)
    ON CONFLICT(task_type, name) DO UPDATE SET
      system_prompt=excluded.system_prompt,
      user_prompt=excluded.user_prompt,
      model=excluded.model,
      temperature=excluded.temperature,
      max_tokens=excluded.max_tokens,
      updated_at=CURRENT_TIMESTAMP
  `).run(p);
}

export function deletePrompt(id: number) {
  return db.prepare("DELETE FROM llm_prompts WHERE id=?").run(id);
}


export function  updatePrompt(id: number, data: any) {
  const stmt = db.prepare(`
      UPDATE llm_prompts SET
        task_type = ?,
        name = ?,
        system_prompt = ?,
        user_prompt = ?,
        model = ?,
        temperature = ?,
        max_tokens = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

  return stmt.run(
      data.task_type,
      data.name,
      data.systemPrompt,
      data.userPrompt,
      data.model,
      data.temperature,
      data.max_tokens,
      id
  );
}
