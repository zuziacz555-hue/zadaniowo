-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "imie_nazwisko" TEXT NOT NULL,
    "haslo" TEXT NOT NULL,
    "rola" TEXT NOT NULL DEFAULT 'UCZESTNICZKA'
);

-- CreateTable
CREATE TABLE "zespoly" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nazwa" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "user_zespoly" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "zespol_id" INTEGER NOT NULL,
    "rola" TEXT NOT NULL DEFAULT 'uczestniczka',
    CONSTRAINT "user_zespoly_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_zespoly_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ogloszenia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zespol_id" INTEGER NOT NULL,
    "tytul" TEXT NOT NULL,
    "tresc" TEXT NOT NULL,
    "utworzone_przez" TEXT NOT NULL,
    "data_utworzenia" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ogloszenia_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "spotkania" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zespol_id" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "godzina" DATETIME NOT NULL,
    "opis" TEXT NOT NULL,
    "opis_dodatkowy" TEXT,
    CONSTRAINT "spotkania_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "obecnosci" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "spotkanie_id" INTEGER NOT NULL,
    "imie_nazwisko" TEXT NOT NULL,
    CONSTRAINT "obecnosci_spotkanie_id_fkey" FOREIGN KEY ("spotkanie_id") REFERENCES "spotkania" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wydarzenia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nazwa" TEXT NOT NULL,
    "data" DATETIME,
    "limit_osob" INTEGER
);

-- CreateTable
CREATE TABLE "zapisy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "wydarzenie_id" INTEGER NOT NULL,
    "imie_nazwisko" TEXT NOT NULL,
    "user_id" INTEGER,
    CONSTRAINT "zapisy_wydarzenie_id_fkey" FOREIGN KEY ("wydarzenie_id") REFERENCES "wydarzenia" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "zapisy_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "zadania" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zespol_id" INTEGER,
    "typ_przypisania" TEXT NOT NULL DEFAULT 'CALY_ZESPOL',
    "tytul" TEXT NOT NULL,
    "opis" TEXT,
    "termin" DATETIME,
    "priorytet" TEXT NOT NULL DEFAULT 'NORMALNY',
    "utworzone_przez_id" INTEGER,
    "utworzone_przez" TEXT NOT NULL,
    "data_utworzenia" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'AKTYWNE',
    "uwagi_odrzucenia" TEXT,
    "poprawione" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "zadania_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "zadania_utworzone_przez_id_fkey" FOREIGN KEY ("utworzone_przez_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "zadania_opisy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zadanie_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "imie_nazwisko" TEXT NOT NULL,
    "opis" TEXT NOT NULL,
    "data_dodania" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zadania_opisy_zadanie_id_fkey" FOREIGN KEY ("zadanie_id") REFERENCES "zadania" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "zadania_opisy_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "zadania_przypisania" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zadanie_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "zespol_id" INTEGER,
    "data_przypisania" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zadania_przypisania_zadanie_id_fkey" FOREIGN KEY ("zadanie_id") REFERENCES "zadania" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "zadania_przypisania_zespol_id_fkey" FOREIGN KEY ("zespol_id") REFERENCES "zespoly" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "zadania_wykonania" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zadanie_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "imie_nazwisko" TEXT NOT NULL,
    "wykonane" BOOLEAN NOT NULL DEFAULT false,
    "data_oznaczenia" DATETIME NOT NULL,
    CONSTRAINT "zadania_wykonania_zadanie_id_fkey" FOREIGN KEY ("zadanie_id") REFERENCES "zadania" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "zadania_wykonania_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "user_zespoly_user_id_idx" ON "user_zespoly"("user_id");

-- CreateIndex
CREATE INDEX "user_zespoly_zespol_id_idx" ON "user_zespoly"("zespol_id");

-- CreateIndex
CREATE INDEX "ogloszenia_zespol_id_idx" ON "ogloszenia"("zespol_id");

-- CreateIndex
CREATE INDEX "spotkania_zespol_id_idx" ON "spotkania"("zespol_id");

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
