import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { storagePut } from "./storage";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createLearningSession,
  getProgress,
  listErrorQuestionIds,
  listPublishedQuestions,
  listRecentSessions,
  listTopics,
  recordAnswer,
  toggleFavorite,
  createTopic,
  createQuestion,
  updateQuestionStatus,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  content: router({
    topics: publicProcedure.query(() => listTopics()),
    questions: publicProcedure.input(z.object({ topicId: z.number().optional() }).optional()).query(({ input }) => listPublishedQuestions(input?.topicId)),
  }),
  learning: router({
    progress: protectedProcedure.query(({ ctx }) => getProgress(ctx.user.id)),
    recentSessions: protectedProcedure.query(({ ctx }) => listRecentSessions(ctx.user.id)),
    errorQuestionIds: protectedProcedure.query(({ ctx }) => listErrorQuestionIds(ctx.user.id)),
    startSession: protectedProcedure.input(z.object({ mode: z.enum(["topic", "mixed", "errors", "exam"]), questionIds: z.array(z.number()).min(1), topicId: z.number().optional() })).mutation(({ ctx, input }) => createLearningSession(ctx.user.id, input.mode, input.questionIds, input.topicId)),
    submitAnswer: protectedProcedure.input(z.object({ sessionId: z.number(), questionId: z.number(), selectedOptionIds: z.array(z.number()), isCorrect: z.boolean(), mistakePoints: z.number().int().min(0).default(0) })).mutation(({ ctx, input }) => recordAnswer(ctx.user.id, input.sessionId, input.questionId, input.selectedOptionIds, input.isCorrect, input.mistakePoints)),
    toggleFavorite: protectedProcedure.input(z.object({ questionId: z.number() })).mutation(({ ctx, input }) => toggleFavorite(ctx.user.id, input.questionId)),
  }),
  admin: router({
    createTopic: adminProcedure.input(z.object({ name: z.string().min(2), description: z.string().optional() })).mutation(({ input }) => createTopic(input.name, input.description)),
    uploadMedia: adminProcedure.input(z.object({ fileName: z.string().min(1).max(160), contentType: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]), base64: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const isVideo = input.contentType.startsWith("video/");
      const maxBytes = isVideo ? 20 * 1024 * 1024 : 2 * 1024 * 1024;
      const content = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
      if (content.byteLength > maxBytes) throw new Error(`Datei zu groß. Maximum: ${isVideo ? "20 MB" : "2 MB"}.`);
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const { key, url } = await storagePut(`fahrfit/questions/${ctx.user.id}/${safeName}`, content, input.contentType);
      return { key, url, mediaType: isVideo ? "video" as const : "image" as const };
    }),
    createQuestion: adminProcedure.input(z.object({ topicId: z.number(), prompt: z.string().min(5), explanation: z.string().min(5), mediaUrl: z.string().optional(), storageKey: z.string().optional(), mediaType: z.enum(["image", "video"]).optional(), thumbnailUrl: z.string().optional(), duration: z.number().int().min(0).optional(), mediaAlt: z.string().optional(), rightsStatus: z.enum(["owned", "licensed", "pending"]), licenseSource: z.string().max(255).optional(), difficulty: z.enum(["easy", "medium", "hard"]).optional(), options: z.array(z.object({ label: z.string(), text: z.string().min(1), isCorrect: z.boolean() })).min(2) })).mutation(({ input }) => createQuestion(input)),
    updateQuestionStatus: adminProcedure.input(z.object({ questionId: z.number(), status: z.enum(["draft", "published"]) })).mutation(({ input }) => updateQuestionStatus(input.questionId, input.status)),
  }),
});

export type AppRouter = typeof appRouter;
