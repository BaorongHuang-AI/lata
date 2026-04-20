-- =========================
-- Experiment session
-- =========================
CREATE TABLE IF NOT EXISTS session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    condition TEXT,              -- AI_ON / AI_OFF
    started_at INTEGER NOT NULL,
    ended_at INTEGER
);

-- =========================
-- Translation question
-- =========================
CREATE TABLE IF NOT EXISTS translation_question (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_text TEXT NOT NULL,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL
);

-- =========================
-- Translation versions
-- =========================
CREATE TABLE IF NOT EXISTS translation_version (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    version_index INTEGER NOT NULL,
    translated_text TEXT NOT NULL,
    is_final INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- =========================
-- Keystroke log
-- =========================
CREATE TABLE IF NOT EXISTS keystroke_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,     -- insert | delete | undo | redo | paste
    key_value TEXT,
    cursor_position INTEGER,
    timestamp INTEGER NOT NULL
);

-- =========================
-- AI suggestions
-- =========================
CREATE TABLE IF NOT EXISTS ai_suggestion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    suggestion_text TEXT NOT NULL,
    accepted_text TEXT,
    action TEXT,                  -- accepted | modified | rejected
    shown_at INTEGER NOT NULL,
    resolved_at INTEGER
);
