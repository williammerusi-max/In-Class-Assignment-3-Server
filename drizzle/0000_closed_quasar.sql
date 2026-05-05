CREATE TABLE `options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`text` varchar(255) NOT NULL,
	CONSTRAINT `options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizId` int NOT NULL,
	`questionText` varchar(255) NOT NULL,
	`correctOption` int NOT NULL,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizId` int NOT NULL,
	`studentId` int NOT NULL,
	CONSTRAINT `quiz_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quizId` int NOT NULL,
	`studentId` int NOT NULL,
	`score` int NOT NULL,
	`attempts` int NOT NULL,
	CONSTRAINT `quiz_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(45) NOT NULL,
	`description` varchar(255) NOT NULL,
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(45) NOT NULL,
	`password` varchar(255) NOT NULL,
	`role` enum('student','teacher') NOT NULL,
	CONSTRAINT `user_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `options` ADD CONSTRAINT `options_questionId_questions_id_fk` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `questions` ADD CONSTRAINT `questions_quizId_quizzes_id_fk` FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_assignments` ADD CONSTRAINT `quiz_assignments_quizId_quizzes_id_fk` FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_assignments` ADD CONSTRAINT `quiz_assignments_studentId_user_id_fk` FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_history` ADD CONSTRAINT `quiz_history_quizId_quizzes_id_fk` FOREIGN KEY (`quizId`) REFERENCES `quizzes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quiz_history` ADD CONSTRAINT `quiz_history_studentId_user_id_fk` FOREIGN KEY (`studentId`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;