-- CreateTable
CREATE TABLE "raporty" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "spotkanie_id" INTEGER NOT NULL,
    "tytul" TEXT,
    "tresc" TEXT NOT NULL,
    "utworzone_przez" TEXT NOT NULL,
    "data_utworzenia" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "raporty_spotkanie_id_fkey" FOREIGN KEY ("spotkanie_id") REFERENCES "spotkania" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "raporty_spotkanie_id_key" ON "raporty"("spotkanie_id");
