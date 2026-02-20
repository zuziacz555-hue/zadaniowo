const { Client } = require('pg');

async function check(dbname) {
    const url = `postgresql://neondb_owner:npg_LeN2knvQHlq6@ep-weathered-cell-aiv25bye-pooler.c-4.us-east-1.aws.neon.tech/${dbname}?sslmode=require`;
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        console.log(`\n--- DB: ${dbname} ---`);
        const res = await client.query('SELECT "imie_nazwisko" FROM "users"');
        console.log('Users:', res.rows.map(r => r.imie_nazwisko));
    } catch (e) {
        console.log(`DB ${dbname} Error:`, e.message);
    } finally {
        await client.end();
    }
}

async function run() {
    await check('neondb');
    await check('unionki');
}

run();
