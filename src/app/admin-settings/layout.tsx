import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Ustawienia | Zadaniowo",
    description: "Konfiguracja systemu",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
