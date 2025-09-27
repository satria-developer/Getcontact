const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data.db'));


// run migrations from migrations.sql if table missing
const init = () => {
const stmt = `
CREATE TABLE IF NOT EXISTS tags (
id INTEGER PRIMARY KEY AUTOINCREMENT,
phone TEXT NOT NULL,
tag TEXT NOT NULL,
created_at DATETIME DEFAULT (datetime('now','localtime')),
report_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_phone ON tags(phone);
`;
db.exec(stmt);
};


init();


module.exports = db;
