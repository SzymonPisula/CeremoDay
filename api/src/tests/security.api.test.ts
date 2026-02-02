import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";

const app = createApp();

describe("Security basics", () => {
  it("private endpoint without token returns 401/403", async () => {
    const res = await request(app).get("/events");
    expect([401, 403]).toContain(res.status);
  });
});
