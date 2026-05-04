import {
  boolean,
  timestamp,
  int,
  mysqlTable,
  varchar,
  uniqueIndex
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

export const accounts = mysqlTable("accounts", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 45 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  isTeacher: boolean("isTeacher").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow()
});

export const quizzes = mysqlTable("quizzes", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 45 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow()
});

export const questions = mysqlTable("questions", {
  id: int("id").primaryKey().autoincrement(),
  quizId: int("quizId").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  questionText: varchar("questionText", { length: 255 }).notNull(),
  questionType: varchar("questionType", { length: 20 }).notNull(),
  correctOption: int("correctOption"),
  correctAnswer: varchar("correctAnswer", { length: 255 })
});

export const options = mysqlTable("options", {
  id: int("id").primaryKey().autoincrement(),
  questionId: int("questionId").notNull().references(() => questions.id, { onDelete: "cascade" }),
  text: varchar("text", { length: 255 }).notNull(),
  isCorrect: boolean("isCorrect").notNull().default(false)
});

export const quizAssignments = mysqlTable("quiz_assignments", {
  id: int("id").primaryKey().autoincrement(),
  quizId: int("quizId").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  studentId: int("studentId").notNull().references(() => accounts.id, { onDelete: "cascade" })
}, (table) => ({
  uniqueQuizStudent: uniqueIndex("quiz_assignments_quiz_student_unique").on(table.quizId, table.studentId)
}));

export const quizHistory = mysqlTable("quiz_history", {
  id: int("id").primaryKey().autoincrement(),
  quizId: int("quizId").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  studentId: int("studentId").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  score: int("score").notNull(),
  totalQuestions: int("totalQuestions").notNull(),
  submittedAt: timestamp("submittedAt").notNull().defaultNow()
});

export const studentAnswers = mysqlTable("student_answers", {
  id: int("id").primaryKey().autoincrement(),
  attemptId: int("attemptId").notNull().references(() => quizHistory.id, { onDelete: "cascade" }),
  questionId: int("questionId").notNull().references(() => questions.id, { onDelete: "cascade" }),
  selectedOptionId: int("selectedOptionId").references(() => options.id, { onDelete: "set null" }),
  answerText: varchar("answerText", { length: 255 }),
  isCorrect: boolean("isCorrect").notNull()
});

export const accountsRelations = relations(accounts, ({ many }) => ({
  assignments: many(quizAssignments),
  history: many(quizHistory)
}));

export const quizzesRelations = relations(quizzes, ({ many }) => ({
  questions: many(questions),
  assignments: many(quizAssignments),
  history: many(quizHistory)
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [questions.quizId], references: [quizzes.id] }),
  options: many(options),
  answers: many(studentAnswers)
}));

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, { fields: [options.questionId], references: [questions.id] })
}));

export const quizAssignmentsRelations = relations(quizAssignments, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizAssignments.quizId], references: [quizzes.id] }),
  student: one(accounts, { fields: [quizAssignments.studentId], references: [accounts.id] })
}));

export const quizHistoryRelations = relations(quizHistory, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [quizHistory.quizId], references: [quizzes.id] }),
  student: one(accounts, { fields: [quizHistory.studentId], references: [accounts.id] }),
  answers: many(studentAnswers)
}));

export const studentAnswersRelations = relations(studentAnswers, ({ one }) => ({
  attempt: one(quizHistory, { fields: [studentAnswers.attemptId], references: [quizHistory.id] }),
  question: one(questions, { fields: [studentAnswers.questionId], references: [questions.id] }),
  selectedOption: one(options, { fields: [studentAnswers.selectedOptionId], references: [options.id] })
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type AnswerOption = typeof options.$inferSelect;

export type UserRole = "STUDENT" | "TEACHER";
export type QuestionType = "MULTIPLE_CHOICE" | "SHORT_ANSWER";
