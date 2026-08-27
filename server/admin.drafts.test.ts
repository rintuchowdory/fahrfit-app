import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    listAdminQuestions: vi.fn().mockResolvedValue([{ id: 7, topicId: 2, prompt: "Importierte Testfrage?", explanation: "Erklärung", status: "draft", rightsStatus: "licensed", options: [{ label: "A", text: "Richtig", isCorrect: 1 }] }]),
    updateQuestionContent: vi.fn().mockResolvedValue(true),
    updateQuestionStatus: vi.fn().mockResolvedValue(true),
  };
});

type User = NonNullable<TrpcContext["user"]>;
const makeContext = (role: User["role"]): TrpcContext => ({ user: { id: role === "admin" ? 9 : 10, openId: `test-${role}`, email: `${role}@example.com`, name: role, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("admin draft review procedures", () => {
  it("returns draft-shaped data to an admin", async () => {
    const result = await appRouter.createCaller(makeContext("admin")).admin.drafts();
    expect(result[0]).toMatchObject({ id: 7, status: "draft", rightsStatus: "licensed" });
    expect(result[0]?.options[0]).toMatchObject({ label: "A", isCorrect: 1 });
  });

  it("rejects a regular user from draft review", async () => {
    await expect(appRouter.createCaller(makeContext("user")).admin.drafts()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates and accepts a complete content update for an admin", async () => {
    const input = { questionId: 7, topicId: 2, prompt: "Eine gültige Testfrage?", explanation: "Eine gültige Testerklärung.", rightsStatus: "licensed" as const, licenseSource: "vertrag-test", mediaType: "video" as const, mediaUrl: "https://cdn.example/test.webm", options: [{ label: "A", text: "Antwort A", isCorrect: true }, { label: "B", text: "Antwort B", isCorrect: false }] };
    await expect(appRouter.createCaller(makeContext("admin")).admin.updateQuestionContent(input)).resolves.toBe(true);
    await expect(appRouter.createCaller(makeContext("admin")).admin.updateQuestionContent({ ...input, prompt: "x" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps update and publish operations protected for regular users", async () => {
    const input = { questionId: 7, topicId: 2, prompt: "Eine gültige Testfrage?", explanation: "Eine gültige Testerklärung.", rightsStatus: "owned" as const, options: [{ label: "A", text: "Antwort A", isCorrect: true }, { label: "B", text: "Antwort B", isCorrect: false }] };
    await expect(appRouter.createCaller(makeContext("user")).admin.updateQuestionContent(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(makeContext("user")).admin.updateQuestionStatus({ questionId: 7, status: "published" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(makeContext("admin")).admin.updateQuestionStatus({ questionId: 7, status: "published" })).resolves.toBe(true);
  });
});
