import * as LibSQLAdapter from '@prisma/adapter-libsql'
console.log('Keys:', Object.keys(LibSQLAdapter))
try {
    console.log('PrismaLibSQL:', LibSQLAdapter.PrismaLibSQL)
    // @ts-ignore
    new LibSQLAdapter.PrismaLibSQL({})
} catch (e) {
    console.error('Error instantiating:', e)
}
