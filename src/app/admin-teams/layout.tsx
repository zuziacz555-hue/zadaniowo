import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Zespoły | Zadaniowo",
    description: "Zarządzaj zespołami i przypisaniami",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
