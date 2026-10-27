-- AlterTable chats
ALTER TABLE `chats` ADD COLUMN `isLegalHold` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `legalHoldSetAt` DATETIME(3) NULL,
    ADD COLUMN `legalHoldSetById` VARCHAR(191) NULL;

-- AlterTable messages
ALTER TABLE `messages` ADD COLUMN `deletedAt` DATETIME(3) NULL;
