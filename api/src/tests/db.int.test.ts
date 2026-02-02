import { describe, expect, it } from "vitest";
import { sequelize } from "../config/database";

// Ten test jest "integracyjny" – wymaga działającej bazy.
// Uruchamiaj go w Dockerze (docker compose up) lub lokalnie z poprawnymi ENV.

describe("DB connection", () => {
  it("connects to database", async () => {
    await expect(sequelize.authenticate()).resolves.toBeUndefined();
  });
});
