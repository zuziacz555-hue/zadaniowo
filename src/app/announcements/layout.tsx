import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Ogłoszenia | Zadaniowo",
    description: "Przeglądaj i twórz ogłoszenia dla zespołów",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
