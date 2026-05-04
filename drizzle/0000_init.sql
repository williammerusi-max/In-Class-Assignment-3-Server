CREATE TABLE `accounts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `username` varchar(45) NOT NULL,
  `password` varchar(255) NOT NULL,
  `isTeacher` boolean NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `accounts_id` PRIMARY KEY(`id`),
  CONSTRAINT `accounts_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
  `id` int AUTO_INCREMENT NOT NULL,
  `title` varchar(45) NOT NULL,
  `description` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `quizId` int NOT NULL,
  `questionText` varchar(255) NOT NULL,
  `questionType` varchar(20) NOT NULL,
  `correctOption` int,
  `correctAnswer` varchar(255),
  CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `options` (
  `id` int AUTO_INCREMENT NOT NULL,
  `questionId` int NOT NULL,
  `text` varchar(255) NOT NULL,
  `isCorrect` boolean NOT NULL DEFAULT false,
  CONSTRAINT `options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_assignments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `quizId` int NOT NULL,
  `studentId` int NOT NULL,
  CONSTRAINT `quiz_assignments_id` PRIMARY KEY(`id`),
  CONSTRAINT `quiz_assignments_quiz_student_unique` UNIQUE(`quizId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `quiz_history` (
  `id` int AUTO_INCREMENT NOT NULL,
  `quizId` int NOT NULL,
  `studentId` int NOT NULL,
  `score` int NOT NULL,
  `totalQuestions` int NOT NULL,
  `submittedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `quiz_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_answers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `attemptId` int NOT NULL,
  `questionId` int NOT NULL,
  `selectedOptionId` int,
  `answerText` varchar(255),
  `isCorrect` boolean NOT NULL,
  CONSTRAINT `student_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_quizId_quizzes_id_fk` FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `options` ADD CONSTRAINT `options_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `quiz_assignments` ADD CONSTRAINT `quiz_assignments_quizId_quizzes_id_fk` FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `quiz_assignments` ADD CONSTRAINT `quiz_assignments_studentId_accounts_id_fk` FOREIGN KEY (`studentId`) REFERENCES `accounts`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `quiz_history` ADD CONSTRAINT `quiz_history_quizId_quizzes_id_fk` FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `quiz_history` ADD CONSTRAINT `quiz_history_studentId_accounts_id_fk` FOREIGN KEY (`studentId`) REFERENCES `accounts`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_attemptId_quiz_history_id_fk` FOREIGN KEY (`attemptId`) REFERENCES `quiz_history`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `student_answers` ADD CONSTRAINT `student_answers_selectedOptionId_options_id_fk` FOREIGN KEY (`selectedOptionId`) REFERENCES `options`(`id`) ON DELETE set null ON UPDATE no action;
