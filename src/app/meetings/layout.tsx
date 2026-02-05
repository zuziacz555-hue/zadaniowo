import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Spotkania | Zadaniowo",
    description: "Zarządzaj spotkaniami zespołu",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
