ALTER TABLE `questions` ADD `storageKey` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `thumbnailUrl` text;--> statement-breakpoint
ALTER TABLE `questions` ADD `duration` int;--> statement-breakpoint
ALTER TABLE `questions` ADD `rightsStatus` enum('owned','licensed','pending') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `questions` ADD `licenseSource` varchar(255);