import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Użytkownicy | Zadaniowo",
    description: "Zarządzaj użytkownikami systemu",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
