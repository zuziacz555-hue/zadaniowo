import DashboardLayout from "@/components/layout/DashboardLayout";
import ChatClient from "@/components/chat/ChatClient";

export const metadata = {
    title: "Czat - Zadaniowo",
    description: "Bezpieczny komunikator zespołu",
};

export default function ChatPage() {
    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-140px)]">
                <ChatClient />
            </div>
        </DashboardLayout>
    );
}
