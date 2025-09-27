PRAGMA foreign_keys = ON;


CREATE TABLE IF NOT EXISTS tags (
id INTEGER PRIMARY KEY AUTOINCREMENT,
phone TEXT NOT NULL,
tag TEXT NOT NULL,
created_at DATETIME DEFAULT (datetime('now','localtime')),
report_count INTEGER DEFAULT 0
);


CREATE INDEX IF NOT EXISTS idx_phone ON tags(phone);
