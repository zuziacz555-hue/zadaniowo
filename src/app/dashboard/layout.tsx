import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pulpit | Zadaniowo",
    description: "Twój główny panel z przeglądem zadań i zespołów",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
