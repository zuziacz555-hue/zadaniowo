
import { createArchiveFolder, getArchiveFolders } from './src/lib/actions/archive';
import { prisma } from './src/lib/prisma';
import { PrismaClient } from './src/lib/generated/client';

async function main() {
    console.log("TEST: Starting Archive Folder Creation Test");

    // 1. Create a folder
    const testName = `Test Folder ${Date.now()}`;
    // Assuming a valid userId exists, or we test without it first to check basic creation
    // We'll use userId 1 (usually Admin) or just 0/undefined if allowed (but my logic requires userId for sharing)
    // Let's check users first
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error("TEST ERROR: No users found in DB to test with.");
        return;
    }
    console.log(`TEST: Using user ${user.id} (${user.imieNazwisko})`);

    console.log(`TEST: Creating folder '${testName}'...`);
    const createRes = await createArchiveFolder(testName, user.id);

    if (!createRes.success) {
        console.error("TEST FAILED: Create returned error:", createRes.error);
        return;
    }
    console.log("TEST: Create successful:", createRes.data);

    // 2. Verify it exists in DB directly
    const dbFolder = await prisma.archiveFolder.findUnique({
        where: { id: createRes.data.id },
        include: { sharedWithUsers: true }
    });

    if (!dbFolder) {
        console.error("TEST FAILED: Folder not found in Prisma query after creation!");
    } else {
        console.log("TEST: Folder found in DB:", dbFolder);
        // Check sharing
        const isShared = dbFolder.sharedWithUsers.some(u => u.userId === user.id);
        console.log(`TEST: Shared with creator (${user.id})?`, isShared);
    }

    // 3. Verify getArchiveFolders returns it
    console.log("TEST: Fetching folders via getArchiveFolders...");
    const fetchRes = await getArchiveFolders(user.id, user.rola);

    if (fetchRes.success) {
        const found = fetchRes.data.find((f: any) => f.id === createRes.data.id);
        console.log("TEST: Folder found in getArchiveFolders?", !!found);
    } else {
        console.error("TEST FAILED: getArchiveFolders error:", fetchRes.error);
    }
}

main()
    .catch(e => console.error("TEST EXCEPTION:", e))
    .finally(async () => {
        await prisma.$disconnect();
    });
