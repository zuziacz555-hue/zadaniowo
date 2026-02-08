import UsersClient from "@/components/users/UsersClient";
import { getUsers } from "@/lib/actions/users";
import { getTeams } from "@/lib/actions/teams";
import { getSystemSettings } from "@/lib/actions/settings";

export default async function AdminUsersPage() {
    const usersResult = await getUsers();
    const teamsResult = await getTeams();
    const settingsResult = await getSystemSettings();

    const users = (usersResult.success && usersResult.data) ? usersResult.data : [];
    const teams = (teamsResult.success && teamsResult.data) ? teamsResult.data : [];
    const settings = (settingsResult.success && settingsResult.data) ? settingsResult.data : null;

    return <UsersClient initialUsers={users} initialTeams={teams} settings={settings} />;
}
