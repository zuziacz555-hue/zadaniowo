import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Do Sprawdzenia | Zadaniowo",
    description: "Weryfikuj zgłoszenia zadań od uczestników",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
