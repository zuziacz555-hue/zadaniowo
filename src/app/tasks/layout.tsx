import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Zadania | Zadaniowo",
    description: "Przeglądaj i zarządzaj swoimi zadaniami",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
