CREATE TABLE `answer_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questionId` int NOT NULL,
	`label` varchar(8) NOT NULL,
	`text` text NOT NULL,
	`isCorrect` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `answer_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `learning_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mode` enum('topic','mixed','errors','exam') NOT NULL,
	`topicId` int,
	`totalQuestions` int NOT NULL,
	`completedQuestions` int NOT NULL DEFAULT 0,
	`correctAnswers` int NOT NULL DEFAULT 0,
	`mistakePoints` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `learning_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topicId` int NOT NULL,
	`prompt` text NOT NULL,
	`explanation` text NOT NULL,
	`mediaUrl` text,
	`mediaAlt` varchar(255),
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'medium',
	`status` enum('draft','published') NOT NULL DEFAULT 'published',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`questionId` int NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `session_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`questionId` int NOT NULL,
	`selectedOptionIds` text NOT NULL,
	`isCorrect` int NOT NULL,
	`mistakePoints` int NOT NULL DEFAULT 0,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_question_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`correctCount` int NOT NULL DEFAULT 0,
	`wrongCount` int NOT NULL DEFAULT 0,
	`mastery` enum('new','needs_review','in_training','secure') NOT NULL DEFAULT 'new',
	`lastAnsweredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_question_status_id` PRIMARY KEY(`id`)
);
