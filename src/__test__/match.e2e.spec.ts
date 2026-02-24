import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createApp } from "../app";

describe("Match E2E", () => {
  let server: ReturnType<typeof createApp>;
  const port = 4001;

  beforeEach(async () => {
    server = createApp();
    server.listen(port);
  });

  it("should create a match", async () => {
    const response = await fetch(`http://localhost:${port}/`, {
      method: "POST",
    });

    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toHaveProperty("id");
  });
});
