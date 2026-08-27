import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  answerOptions,
  favorites,
  InsertUser,
  learningSessions,
  questions,
  sessionQuestions,
  topics,
  userAnswers,
  userQuestionStatus,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { nextMastery } from "../shared/learning";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listTopics() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(topics).orderBy(asc(topics.sortOrder), asc(topics.id));
}

export async function listPublishedQuestions(topicId?: number) {
  const db = await getDb();
  if (!db) return [];
  const where = topicId
    ? and(eq(questions.status, "published"), eq(questions.topicId, topicId))
    : eq(questions.status, "published");
  const rows = await db.select().from(questions).where(where).orderBy(asc(questions.id));
  if (rows.length === 0) return [];
  const options = await db.select().from(answerOptions).where(inArray(answerOptions.questionId, rows.map(row => row.id))).orderBy(asc(answerOptions.sortOrder));
  return rows.map(question => ({
    ...question,
    options: options.filter(option => option.questionId === question.id),
  }));
}

export async function listAdminQuestions(status?: "draft" | "published") {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(questions).where(status ? eq(questions.status, status) : undefined).orderBy(desc(questions.updatedAt));
  if (!rows.length) return [];
  const options = await db.select().from(answerOptions).where(inArray(answerOptions.questionId, rows.map(row => row.id))).orderBy(asc(answerOptions.sortOrder));
  return rows.map(question => ({ ...question, options: options.filter(option => option.questionId === question.id) }));
}

export async function updateQuestionContent(input: { questionId: number; topicId: number; prompt: string; explanation: string; options: Array<{ label: string; text: string; isCorrect: boolean }>; mediaUrl?: string; storageKey?: string; mediaType?: "image" | "video"; thumbnailUrl?: string; duration?: number; mediaAlt?: string; rightsStatus: "owned" | "licensed" | "pending"; licenseSource?: string }) {
  const db = await getDb();
  if (!db) return false;
  await db.update(questions).set({ topicId: input.topicId, prompt: input.prompt, explanation: input.explanation, mediaUrl: input.mediaUrl, storageKey: input.storageKey, mediaType: input.mediaType, thumbnailUrl: input.thumbnailUrl, duration: input.duration, mediaAlt: input.mediaAlt, rightsStatus: input.rightsStatus, licenseSource: input.licenseSource }).where(eq(questions.id, input.questionId));
  await db.delete(answerOptions).where(eq(answerOptions.questionId, input.questionId));
  await db.insert(answerOptions).values(input.options.map((option, index) => ({ questionId: input.questionId, label: option.label, text: option.text, isCorrect: option.isCorrect ? 1 : 0, sortOrder: index })));
  return true;
}

export async function listErrorQuestionIds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ questionId: userQuestionStatus.questionId })
    .from(userQuestionStatus)
    .where(and(eq(userQuestionStatus.userId, userId), inArray(userQuestionStatus.mastery, ["needs_review", "in_training"])));
  return rows.map(row => row.questionId);
}

export async function createLearningSession(userId: number, mode: "topic" | "mixed" | "errors" | "exam", questionIds: number[], topicId?: number) {
  const db = await getDb();
  if (!db) return null;
  const inserted = await db.insert(learningSessions).values({ userId, mode, topicId, totalQuestions: questionIds.length }).$returningId();
  const sessionId = inserted[0]?.id;
  if (!sessionId) return null;
  if (questionIds.length > 0) {
    await db.insert(sessionQuestions).values(questionIds.map((questionId, index) => ({ sessionId, questionId, position: index })));
  }
  return sessionId;
}

export async function recordAnswer(userId: number, sessionId: number, questionId: number, selectedOptionIds: number[], isCorrect: boolean, mistakePoints = 0) {
  const db = await getDb();
  if (!db) return null;
  const session = await db.select().from(learningSessions).where(and(eq(learningSessions.id, sessionId), eq(learningSessions.userId, userId))).limit(1);
  if (!session[0]) return null;
  const question = await db.select({ weight: questions.weight }).from(questions).where(eq(questions.id, questionId)).limit(1);
  const effectiveMistakePoints = !isCorrect && session[0].mode === "exam" ? (question[0]?.weight ?? 3) : mistakePoints;
  await db.insert(userAnswers).values({ sessionId, questionId, selectedOptionIds: JSON.stringify(selectedOptionIds), isCorrect: isCorrect ? 1 : 0, mistakePoints: effectiveMistakePoints });
  const current = await db.select().from(userQuestionStatus).where(and(eq(userQuestionStatus.userId, userId), eq(userQuestionStatus.questionId, questionId))).limit(1);
  const previous = current[0];
  const correctCount = (previous?.correctCount ?? 0) + (isCorrect ? 1 : 0);
  const wrongCount = (previous?.wrongCount ?? 0) + (isCorrect ? 0 : 1);
  const mastery = nextMastery(isCorrect, correctCount, previous?.mastery);
  if (previous) {
    await db.update(userQuestionStatus).set({ correctCount, wrongCount, mastery, lastAnsweredAt: new Date() }).where(eq(userQuestionStatus.id, previous.id));
  } else {
    await db.insert(userQuestionStatus).values({ userId, questionId, correctCount, wrongCount, mastery, lastAnsweredAt: new Date() });
  }
  await db.update(learningSessions).set({
    completedQuestions: session[0].completedQuestions + 1,
    correctAnswers: session[0].correctAnswers + (isCorrect ? 1 : 0),
    mistakePoints: session[0].mistakePoints + effectiveMistakePoints,
  }).where(eq(learningSessions.id, sessionId));
  return { isCorrect, mastery };
}

export async function getProgress(userId: number) {
  const db = await getDb();
  if (!db) return { answered: 0, correct: 0, errors: 0, byTopic: [] };
  const statuses = await db.select().from(userQuestionStatus).where(eq(userQuestionStatus.userId, userId));
  const errors = statuses.filter(status => status.mastery !== "secure").length;
  const answered = statuses.reduce((sum, status) => sum + status.correctCount + status.wrongCount, 0);
  const correct = statuses.reduce((sum, status) => sum + status.correctCount, 0);
  const topicRows = await db.select().from(topics).orderBy(asc(topics.sortOrder));
  const questionRows = await db.select().from(questions).where(eq(questions.status, "published"));
  const byTopic = topicRows.map(topic => {
    const ids = questionRows.filter(question => question.topicId === topic.id).map(question => question.id);
    const topicStatuses = statuses.filter(status => ids.includes(status.questionId));
    const total = ids.length;
    const score = topicStatuses.reduce((sum, status) => sum + status.correctCount, 0);
    const attempts = topicStatuses.reduce((sum, status) => sum + status.correctCount + status.wrongCount, 0);
    return { id: topic.id, name: topic.name, percent: attempts ? Math.round((score / attempts) * 100) : 0, total };
  });
  return { answered, correct, errors, byTopic };
}

export async function listRecentSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(learningSessions).where(eq(learningSessions.userId, userId)).orderBy(desc(learningSessions.createdAt)).limit(10);
}

export async function createTopic(name: string, description?: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(topics).values({ name, description, sortOrder: 0 }).$returningId();
  return result[0]?.id ?? null;
}

export async function createQuestion(input: { topicId: number; prompt: string; explanation: string; options: Array<{ label: string; text: string; isCorrect: boolean }>; mediaUrl?: string; storageKey?: string; mediaType?: "image" | "video"; thumbnailUrl?: string; duration?: number; mediaAlt?: string; rightsStatus: "owned" | "licensed" | "pending"; licenseSource?: string; difficulty?: "easy" | "medium" | "hard" }) {
  const db = await getDb();
  if (!db) return null;
  const inserted = await db.insert(questions).values({ topicId: input.topicId, prompt: input.prompt, explanation: input.explanation, mediaUrl: input.mediaUrl, storageKey: input.storageKey, mediaType: input.mediaType ?? "image", thumbnailUrl: input.thumbnailUrl, duration: input.duration, mediaAlt: input.mediaAlt, rightsStatus: input.rightsStatus, licenseSource: input.licenseSource, difficulty: input.difficulty ?? "medium", status: "draft" }).$returningId();
  const questionId = inserted[0]?.id;
  if (!questionId) return null;
  await db.insert(answerOptions).values(input.options.map((option, index) => ({ questionId, label: option.label, text: option.text, isCorrect: option.isCorrect ? 1 : 0, sortOrder: index })));
  return questionId;
}

export async function updateQuestionStatus(questionId: number, status: "draft" | "published") {
  const db = await getDb();
  if (!db) return false;
  await db.update(questions).set({ status }).where(eq(questions.id, questionId));
  return true;
}

export async function toggleFavorite(userId: number, questionId: number) {
  const db = await getDb();
  if (!db) return false;
  const existing = await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.questionId, questionId))).limit(1);
  if (existing[0]) {
    await db.delete(favorites).where(eq(favorites.id, existing[0].id));
    return false;
  }
  await db.insert(favorites).values({ userId, questionId });
  return true;
}
