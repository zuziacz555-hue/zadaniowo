const Database = require('better-sqlite3');
const db = new Database('c:/Users/Zuzanka/Desktop/unionki/unionki-next/prisma/dev.db');

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables in SQLite:', tables.map(t => t.name));

    for (const table of tables) {
        if (table.name.toLowerCase().includes('user') || table.name.toLowerCase().includes('users')) {
            console.log(`--- Data from ${table.name} ---`);
            const rows = db.prepare(`SELECT * FROM ${table.name}`).all();
            console.log(JSON.stringify(rows, null, 2));
        }
    }
} catch (error) {
    console.error('Error reading SQLite:', error);
} finally {
    db.close();
}
