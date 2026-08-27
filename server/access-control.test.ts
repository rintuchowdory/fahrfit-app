import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const baseContext = (user?: TrpcContext["user"]) => ({
  user,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: () => undefined } as TrpcContext["res"],
});

describe("access control", () => {
  it("rejects learning progress without a signed-in user", async () => {
    const caller = appRouter.createCaller(baseContext(undefined));
    await expect(caller.learning.progress()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects admin mutations for regular users", async () => {
    const caller = appRouter.createCaller(appRouterContext("user"));
    await expect(caller.admin.createTopic({ name: "Vorfahrt" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

function appRouterContext(role: "user" | "admin") {
  return baseContext({ id: 7, openId: "test-user", name: "Test User", email: "test@example.com", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() });
}
