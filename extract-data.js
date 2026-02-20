const Database = require('better-sqlite3');
const db = new Database('c:/Users/Zuzanka/Desktop/unionki/unionki-next/prisma/dev.db');

try {
    const users = db.prepare("SELECT * FROM users").all();
    const teams = db.prepare("SELECT * FROM zespoly").all();
    const userTeams = db.prepare("SELECT * FROM user_zespoly").all();

    console.log('--- USERS ---');
    console.log(JSON.stringify(users, null, 2));
    console.log('--- TEAMS ---');
    console.log(JSON.stringify(teams, null, 2));
    console.log('--- USER_TEAMS ---');
    console.log(JSON.stringify(userTeams, null, 2));

} catch (error) {
    console.error('Error reading SQLite:', error);
} finally {
    db.close();
}
