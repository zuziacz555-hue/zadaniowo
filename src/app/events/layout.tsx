import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Wydarzenia | Zadaniowo",
    description: "Kalendarz wydarzeń i spotkań",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
