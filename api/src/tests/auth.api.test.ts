import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";

const app = createApp();

describe("API /auth", () => {
  it("register rejects invalid name", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "badname@test.pl",
      password: "Password123!",
      name: "Szymon1",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("code");
  });

  it("register accepts valid name", async () => {
    const res = await request(app).post("/auth/register").send({
      email: `user_${Date.now()}@test.pl`,
      password: "Password123!",
      name: "Szymon Test",
    });

    expect([200, 201]).toContain(res.status);
  });
});
