const Database = require('better-sqlite3');

function checkDb(path) {
    console.log(`\n--- Checking ${path} ---`);
    try {
        const db = new Database(path);
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        console.log('Tables:', tables.map(t => t.name));

        for (const table of tables) {
            const count = db.prepare(`SELECT count(*) as total FROM ${table.name}`).get().total;
            console.log(`Table ${table.name}: ${count} rows`);
            if (count > 0 && (table.name.toLowerCase().includes('user') || table.name.toLowerCase().includes('zespol'))) {
                const rows = db.prepare(`SELECT * FROM ${table.name} LIMIT 5`).all();
                console.log(`Preview of ${table.name}:`, JSON.stringify(rows, null, 2));
            }
        }
        db.close();
    } catch (e) {
        console.error(`Error with ${path}:`, e.message);
    }
}

checkDb('prisma/dev.db');
checkDb('dev.db');
checkDb('prisma/build.db');
