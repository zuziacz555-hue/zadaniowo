-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "imie_nazwisko" TEXT NOT NULL,
    "haslo" TEXT NOT NULL,
    "rola" TEXT NOT NULL DEFAULT 'UCZESTNICZKA',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zespoly" (
    "id" SERIAL NOT NULL,
    "nazwa" TEXT NOT NULL,
    "kolor" TEXT NOT NULL DEFAULT '#5400FF',
    "opis" TEXT,
    "allow_applications" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "zespoly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_zespoly" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "zespol_id" INTEGER NOT NULL,
    "rola" TEXT NOT NULL DEFAULT 'uczestniczka',

    CONSTRAINT "user_zespoly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ogloszenia" (
    "id" SERIAL NOT NULL,
    "zespol_id" INTEGER NOT NULL,
    "typ_przypisania" TEXT NOT NULL DEFAULT 'WSZYSCY',
    "tytul" TEXT NOT NULL,
    "tresc" TEXT NOT NULL,
    "utworzone_przez" TEXT NOT NULL,
    "data_utworzenia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_wygasniecia" TIMESTAMP(3),

    CONSTRAINT "ogloszenia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ogloszenia_przypisania" (
    "id" SERIAL NOT NULL,
    "ogloszenie_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "ogloszenia_przypisania_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spotkania" (
    "id" SERIAL NOT NULL,
    "zespol_id" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "godzina" TIMESTAMP(3) NOT NULL,
    "opis" TEXT NOT NULL,
    "opis_dodatkowy" TEXT,
    "termin_zapisow" TIMESTAMP(3),

    CONSTRAINT "spotkania_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raporty" (
    "id" SERIAL NOT NULL,
    "spotkanie_id" INTEGER NOT NULL,
    "tytul" TEXT,
    "tresc" TEXT NOT NULL,
    "utworzone_przez" TEXT NOT NULL,
    "data_utworzenia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raporty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obecnosci" (
    "id" SERIAL NOT NULL,
    "spotkanie_id" INTEGER NOT NULL,
    "imie_nazwisko" TEXT NOT NULL,
    "user_id" INTEGER,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "obecnosci_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wydarzenia" (
    "id" SERIAL NOT NULL,
    "nazwa" TEXT NOT NULL,
    "data" TIMESTAMP(3),
    "limit_osob" INTEGER,
    "termin_zapisow" TIMESTAMP(3),

    CONSTRAINT "wydarzenia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zapisy" (
    "id" SERIAL NOT NULL,
    "wydarzenie_id" INTEGER NOT NULL,
    "imie_nazwisko" TEXT NOT NULL,
    "user_id" INTEGER,

    CONSTRAINT "zapisy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zadania" (
    "id" SERIAL NOT NULL,
    "zespol_id" INTEGER,
    "typ_przypisania" TEXT NOT NULL DEFAULT 'CALY_ZESPOL',
    "tytul" TEXT NOT NULL,
    "opis" TEXT,
    "termin" TIMESTAMP(3),
    "priorytet" TEXT NOT NULL DEFAULT 'NORMALNY',
    "utworzone_przez_id" INTEGER,
    "utworzone_przez" TEXT NOT NULL,
    "data_utworzenia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'AKTYWNE',
    "uwagi_odrzucenia" TEXT,
    "poprawione" BOOLEAN NOT NULL DEFAULT false,
    "is_visible_to_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "zadania_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zadania_zalaczniki" (
    "id" SERIAL NOT NULL,
    "zadanie_id" INTEGER NOT NULL,
    "nazwa" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "zadania_zalaczniki_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zadania_opisy" (
    "id" SERIAL NOT NULL,
    "zadanie_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "imie_nazwisko" TEXT NOT NULL,
    "opis" TEXT NOT NULL,
    "data_dodania" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zadania_opisy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zadania_przypisania" (
    "id" SERIAL NOT NULL,
    "zadanie_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "zespol_id" INTEGER,
    "data_przypisania" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zadania_przypisania_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zadania_wykonania" (
    "id" SERIAL NOT NULL,
    "zadanie_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "imie_nazwisko" TEXT NOT NULL,
    "wykonane" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OCZEKUJACE',
    "uwagi_odrzucenia" TEXT,
    "poprawione" BOOLEAN NOT NULL DEFAULT false,
    "termin_poprawki" TIMESTAMP(3),
    "data_oznaczenia" TIMESTAMP(3) NOT NULL,
    "zarchiwizowane" BOOLEAN NOT NULL DEFAULT false,
    "archiwum_folder_id" INTEGER,

    CONSTRAINT "zadania_wykonania_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ustawienia_systemu" (
    "id" SERIAL NOT NULL,
    "alerts_terminy" BOOLEAN NOT NULL DEFAULT true,
    "alerts_poprawki" BOOLEAN NOT NULL DEFAULT true,
    "alerts_raporty" BOOLEAN NOT NULL DEFAULT true,
    "coordinator_tasks" BOOLEAN NOT NULL DEFAULT false,
    "coordinator_team_editing" BOOLEAN NOT NULL DEFAULT false,
    "coordinator_resignation_alerts" BOOLEAN NOT NULL DEFAULT true,
    "enable_director_role" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ustawienia_systemu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "powiadomienia" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "zespol_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "powiadomienia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archiwum_foldery" (
    "id" SERIAL NOT NULL,
    "nazwa" TEXT NOT NULL,
    "data_utworzenia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archiwum_foldery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_archiwum_foldery" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "folder_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',

    CONSTRAINT "user_archiwum_foldery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_wiadomosci" (
    "id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_wiadomosci_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_imie_nazwisko_key" ON "users"("imie_nazwisko");

-- CreateIndex
CREATE INDEX "user_zespoly_user_id_idx" ON "user_zespoly"("user_id");

-- CreateIndex
CREATE INDEX "user_zespoly_zespol_id_idx" ON "user_zespoly"("zespol_id");

-- CreateIndex
CREATE INDEX "ogloszenia_zespol_id_idx" ON "ogloszenia"("zespol_id");

-- CreateIndex
CREATE INDEX "ogloszenia_przypisania_ogloszenie_id_idx" ON "ogloszenia_przypisania"("ogloszenie_id");

-- CreateIndex
CREATE INDEX "ogloszenia_przypisania_user_id_idx" ON "ogloszenia_przypisania"("user_id");

-- CreateIndex
CREATE INDEX "spotkania_zespol_id_idx" ON "spotkania"("zespol_id");

-- CreateIndex
CREATE UNIQUE INDEX "raporty_spotkanie_id_key" ON "raporty"("spotkanie_id");

-- CreateIndex
CREATE INDEX "obecnosci_spotkanie_id_idx" ON "obecnosci"("spotkanie_id");

-- CreateIndex
CREATE INDEX "zapisy_wydarzenie_id_idx" ON "zapisy"("wydarzenie_id");

-- CreateIndex
CREATE INDEX "zadania_zespol_id_idx" ON "zadania"("zespol_id");

-- CreateIndex
CREATE INDEX "zadania_termin_idx" ON "zadania"("termin");

-- CreateIndex
CREATE INDEX "zadania_opisy_zadanie_id_idx" ON "zadania_opisy"("zadanie_id");

-- CreateIndex
CREATE INDEX "zadania_opisy_user_id_idx" ON "zadania_opisy"("user_id");

-- CreateIndex
CREATE INDEX "zadania_przypisania_zadanie_id_idx" ON "zadania_przypisania"("zadanie_id");

-- CreateIndex
CREATE INDEX "zadania_przypisania_user_id_idx" ON "zadania_przypisania"("user_id");

-- CreateIndex
CREATE INDEX "zadania_przypisania_zespol_id_idx" ON "zadania_przypisania"("zespol_id");

-- CreateIndex
CREATE INDEX "zadania_wykonania_zadanie_id_idx" ON "zadania_wykonania"("zadanie_id");

-- CreateIndex
CREATE INDEX "zadania_wykonania_user_id_idx" ON "zadania_wykonania"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "zadania_wykonania_zadanie_id_user_id_key" ON "zadania_wykonania"("zadanie_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_archiwum_foldery_user_id_folder_id_key" ON "user_archiwum_foldery"("user_id", "folder_id");

-- CreateIndex
CREATE INDEX "chat_wiadomosci_sender_id_idx" ON "chat_wiadomosci"("sender_id");

-- CreateIndex
CREATE INDEX "chat_wiadomosci_receiver_id_idx" ON "chat_wiadomosci"("receiver_id");

-- CreateIndex
CREATE INDEX "chat_wiadomosci_created_at_idx" ON "chat_wiadomosci"("created_at");

-- AddForeignKey
ALTER TABLE "user_zespoly" ADD CONSTRAINT "user_zespoly_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_zespoly" ADD CONSTRAINT "user_zespoly_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogloszenia" ADD CONSTRAINT "ogloszenia_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogloszenia_przypisania" ADD CONSTRAINT "ogloszenia_przypisania_ogloszenie_id_fkey" FOREIGN KEY ("ogloszenie_id") REFERENCES "ogloszenia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ogloszenia_przypisania" ADD CONSTRAINT "ogloszenia_przypisania_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spotkania" ADD CONSTRAINT "spotkania_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raporty" ADD CONSTRAINT "raporty_spotkanie_id_fkey" FOREIGN KEY ("spotkanie_id") REFERENCES "spotkania"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obecnosci" ADD CONSTRAINT "obecnosci_spotkanie_id_fkey" FOREIGN KEY ("spotkanie_id") REFERENCES "spotkania"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obecnosci" ADD CONSTRAINT "obecnosci_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zapisy" ADD CONSTRAINT "zapisy_wydarzenie_id_fkey" FOREIGN KEY ("wydarzenie_id") REFERENCES "wydarzenia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zapisy" ADD CONSTRAINT "zapisy_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania" ADD CONSTRAINT "zadania_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania" ADD CONSTRAINT "zadania_utworzone_przez_id_fkey" FOREIGN KEY ("utworzone_przez_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania_zalaczniki" ADD CONSTRAINT "zadania_zalaczniki_zadanie_id_fkey" FOREIGN KEY ("zadanie_id") REFERENCES "zadania"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania_opisy" ADD CONSTRAINT "zadania_opisy_zadanie_id_fkey" FOREIGN KEY ("zadanie_id") REFERENCES "zadania"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania_opisy" ADD CONSTRAINT "zadania_opisy_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania_przypisania" ADD CONSTRAINT "zadania_przypisania_zadanie_id_fkey" FOREIGN KEY ("zadanie_id") REFERENCES "zadania"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania_przypisania" ADD CONSTRAINT "zadania_przypisania_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania_przypisania" ADD CONSTRAINT "zadania_przypisania_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania_wykonania" ADD CONSTRAINT "zadania_wykonania_archiwum_folder_id_fkey" FOREIGN KEY ("archiwum_folder_id") REFERENCES "archiwum_foldery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania_wykonania" ADD CONSTRAINT "zadania_wykonania_zadanie_id_fkey" FOREIGN KEY ("zadanie_id") REFERENCES "zadania"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zadania_wykonania" ADD CONSTRAINT "zadania_wykonania_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "powiadomienia" ADD CONSTRAINT "powiadomienia_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "powiadomienia" ADD CONSTRAINT "powiadomienia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_archiwum_foldery" ADD CONSTRAINT "user_archiwum_foldery_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_archiwum_foldery" ADD CONSTRAINT "user_archiwum_foldery_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "archiwum_foldery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_wiadomosci" ADD CONSTRAINT "chat_wiadomosci_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_wiadomosci" ADD CONSTRAINT "chat_wiadomosci_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
