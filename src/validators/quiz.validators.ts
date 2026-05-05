import { z } from "zod";

export const quizSchema = z.object({
  title: z.string().min(1).max(45),
  description: z.string().min(1).max(255)
});

/*const multipleChoiceQuestionSchema = z.object({
  questionText: z.string().min(1).max(255),
  questionType: z.literal("MULTIPLE_CHOICE"),
  answerOptions: z.array(z.object({
    text: z.string().min(1).max(255),
    isCorrect: z.boolean()
  })).length(4),
  correctAnswer: z.undefined().optional()
}).refine((data) => data.answerOptions.filter((option) => option.isCorrect).length === 1, {
  message: "Multiple-choice questions must have exactly 4 options and exactly 1 correct answer"
});

const shortAnswerQuestionSchema = z.object({
  questionText: z.string().min(1).max(255),
  questionType: z.literal("SHORT_ANSWER"),
  correctAnswer: z.string().min(1).max(255),
  answerOptions: z.undefined().optional()
});*/

export const createQuestionSchema = z.object({
  questionText: z.string().min(1).max(255),
  Options: z.array(z.object({
    text: z.string().min(1).max(255),
  })).length(4),
  correctOption: z.number()
})

export const assignmentSchema = z.object({
  quizId: z.number().int().positive(),
  studentId: z.number().int().positive()
});

export const submitAttemptSchema = z.object({
  answers: z.array(z.object({
    questionId: z.number().int().positive(),
    selectedOptionId: z.number().int().positive().optional(),
    answerText: z.string().max(255).optional()
  })).min(1)
});
