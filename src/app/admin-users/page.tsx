import UsersClient from "@/components/users/UsersClient";
import { getUsers } from "@/lib/actions/users";
import { getTeams } from "@/lib/actions/teams";

export default async function AdminUsersPage() {
    const usersResult = await getUsers();
    const teamsResult = await getTeams();

    const users = (usersResult.success && usersResult.data) ? usersResult.data : [];
    const teams = (teamsResult.success && teamsResult.data) ? teamsResult.data : [];

    return <UsersClient initialUsers={users} initialTeams={teams} />;
}
