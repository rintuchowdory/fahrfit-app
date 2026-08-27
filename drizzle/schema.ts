import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const topics = mysqlTable("topics", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  topicId: int("topicId").notNull(),
  prompt: text("prompt").notNull(),
  explanation: text("explanation").notNull(),
  mediaUrl: text("mediaUrl"),
  storageKey: text("storageKey"),
  mediaType: mysqlEnum("mediaType", ["image", "video"]).default("image"),
  thumbnailUrl: text("thumbnailUrl"),
  duration: int("duration"),
  mediaAlt: varchar("mediaAlt", { length: 255 }),
  rightsStatus: mysqlEnum("rightsStatus", ["owned", "licensed", "pending"]).default("pending").notNull(),
  licenseSource: varchar("licenseSource", { length: 255 }),
  sourceId: varchar("sourceId", { length: 128 }),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("medium").notNull(),
  /** Official theory-exam value: 2-5 penalty points when answered incorrectly. */
  weight: int("weight").default(3).notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("published").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const answerOptions = mysqlTable("answer_options", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  label: varchar("label", { length: 8 }).notNull(),
  text: text("text").notNull(),
  isCorrect: int("isCorrect").default(0).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});

export const learningSessions = mysqlTable("learning_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mode: mysqlEnum("mode", ["topic", "mixed", "errors", "exam"]).notNull(),
  topicId: int("topicId"),
  totalQuestions: int("totalQuestions").notNull(),
  completedQuestions: int("completedQuestions").default(0).notNull(),
  correctAnswers: int("correctAnswers").default(0).notNull(),
  mistakePoints: int("mistakePoints").default(0).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sessionQuestions = mysqlTable("session_questions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  questionId: int("questionId").notNull(),
  position: int("position").notNull(),
});

export const userAnswers = mysqlTable("user_answers", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  questionId: int("questionId").notNull(),
  selectedOptionIds: text("selectedOptionIds").notNull(),
  isCorrect: int("isCorrect").notNull(),
  mistakePoints: int("mistakePoints").default(0).notNull(),
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
});

export const userQuestionStatus = mysqlTable("user_question_status", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(),
  correctCount: int("correctCount").default(0).notNull(),
  wrongCount: int("wrongCount").default(0).notNull(),
  mastery: mysqlEnum("mastery", ["new", "needs_review", "in_training", "secure"]).default("new").notNull(),
  lastAnsweredAt: timestamp("lastAnsweredAt").defaultNow().notNull(),
});

export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type AnswerOption = typeof answerOptions.$inferSelect;
