const Database = require('better-sqlite3');

function verify() {
    console.log('--- Final Database Verification ---');
    try {
        const db = new Database('prisma/dev.db');
        const users = db.prepare("SELECT imie_nazwisko, rola FROM users").all();
        console.log('Users in database:', users);

        const teams = db.prepare("SELECT nazwa FROM zespoly").all();
        console.log('Teams in database:', teams);

        const userTeams = db.prepare("SELECT * FROM user_zespoly").all();
        console.log('User-Team associations:', userTeams.length);

        db.close();
    } catch (e) {
        console.error('Error during verification:', e.message);
    }
}

verify();
