import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Raporty | Zadaniowo",
    description: "Przeglądaj raporty ze spotkań",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
