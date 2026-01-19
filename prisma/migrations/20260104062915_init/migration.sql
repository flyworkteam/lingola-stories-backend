-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `email` VARCHAR(191) NULL,
    `isPremium` BOOLEAN NOT NULL DEFAULT false,
    `deviceId` VARCHAR(191) NULL,
    `googleSub` VARCHAR(191) NULL,
    `appleSub` VARCHAR(191) NULL,
    `facebookSub` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_deviceId_key`(`deviceId`),
    UNIQUE INDEX `User_googleSub_key`(`googleSub`),
    UNIQUE INDEX `User_appleSub_key`(`appleSub`),
    UNIQUE INDEX `User_facebookSub_key`(`facebookSub`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProfileData` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `appLanguage` VARCHAR(191) NULL,
    `currentLearningLanguage` VARCHAR(191) NULL,
    `ageRange` VARCHAR(191) NULL,
    `currentLevel` VARCHAR(191) NULL,
    `listeningLevel` VARCHAR(191) NULL,
    `dailyGoalMin` INTEGER NULL,
    `notificationsOn` BOOLEAN NOT NULL DEFAULT false,
    `isComplete` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ProfileData_userId_key`(`userId`),
    INDEX `ProfileData_userId_idx`(`userId`),
    INDEX `ProfileData_isComplete_idx`(`isComplete`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserInterest` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,
    `interest` VARCHAR(191) NOT NULL,

    INDEX `UserInterest_interest_idx`(`interest`),
    INDEX `UserInterest_userId_idx`(`userId`),
    UNIQUE INDEX `UserInterest_userId_interest_key`(`userId`, `interest`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserTargetLanguage` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL,

    INDEX `UserTargetLanguage_language_idx`(`language`),
    INDEX `UserTargetLanguage_userId_idx`(`userId`),
    UNIQUE INDEX `UserTargetLanguage_userId_language_key`(`userId`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Author` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` VARCHAR(191) NOT NULL DEFAULT 'studio',
    `name` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,

    UNIQUE INDEX `Author_userId_key`(`userId`),
    INDEX `Author_type_idx`(`type`),
    INDEX `Author_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Story` (
    `id` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NULL,
    `level` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'draft',
    `totalWords` INTEGER NOT NULL DEFAULT 0,
    `averageRating` DOUBLE NOT NULL DEFAULT 0,
    `ratingCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Story_level_idx`(`level`),
    INDEX `Story_status_idx`(`status`),
    INDEX `Story_authorId_idx`(`authorId`),
    INDEX `Story_averageRating_idx`(`averageRating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoryLocalization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storyId` VARCHAR(191) NOT NULL,
    `lang` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `summary` TEXT NOT NULL,

    INDEX `StoryLocalization_lang_idx`(`lang`),
    INDEX `StoryLocalization_storyId_idx`(`storyId`),
    UNIQUE INDEX `StoryLocalization_storyId_lang_key`(`storyId`, `lang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Tag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoryTag` (
    `storyId` VARCHAR(191) NOT NULL,
    `tagId` INTEGER NOT NULL,

    INDEX `StoryTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`storyId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoryAsset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storyId` VARCHAR(191) NOT NULL,
    `assetType` VARCHAR(191) NOT NULL,
    `lang` VARCHAR(191) NULL,
    `url` VARCHAR(191) NOT NULL,
    `meta` JSON NULL,

    INDEX `StoryAsset_storyId_idx`(`storyId`),
    INDEX `StoryAsset_assetType_idx`(`assetType`),
    INDEX `StoryAsset_lang_idx`(`lang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StoryRating` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StoryRating_storyId_idx`(`storyId`),
    INDEX `StoryRating_userId_idx`(`userId`),
    UNIQUE INDEX `StoryRating_storyId_userId_key`(`storyId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserWord` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sourceLang` VARCHAR(191) NOT NULL DEFAULT 'en',
    `word` VARCHAR(191) NOT NULL,
    `targetLang` VARCHAR(191) NOT NULL,
    `translation` TEXT NULL,
    `level` VARCHAR(191) NULL,
    `isFav` BOOLEAN NOT NULL DEFAULT true,

    INDEX `UserWord_userId_isFav_idx`(`userId`, `isFav`),
    INDEX `UserWord_userId_targetLang_idx`(`userId`, `targetLang`),
    INDEX `UserWord_userId_updatedAt_idx`(`userId`, `updatedAt`),
    INDEX `UserWord_word_idx`(`word`),
    UNIQUE INDEX `UserWord_userId_sourceLang_word_targetLang_key`(`userId`, `sourceLang`, `word`, `targetLang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserBookProgress` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `storyId` VARCHAR(191) NOT NULL,
    `bookmarkWordIndex` INTEGER NOT NULL DEFAULT 0,
    `totalWords` INTEGER NOT NULL DEFAULT 0,
    `progressPercent` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'reading',
    `lastReadAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserBookProgress_userId_lastReadAt_idx`(`userId`, `lastReadAt`),
    INDEX `UserBookProgress_storyId_idx`(`storyId`),
    UNIQUE INDEX `UserBookProgress_userId_storyId_key`(`userId`, `storyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserBookCompletion` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NOT NULL,
    `storyId` VARCHAR(191) NOT NULL,
    `completedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserBookCompletion_userId_completedAt_idx`(`userId`, `completedAt`),
    INDEX `UserBookCompletion_storyId_idx`(`storyId`),
    UNIQUE INDEX `UserBookCompletion_userId_storyId_key`(`userId`, `storyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProfileData` ADD CONSTRAINT `ProfileData_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserInterest` ADD CONSTRAINT `UserInterest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserTargetLanguage` ADD CONSTRAINT `UserTargetLanguage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Author` ADD CONSTRAINT `Author_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Story` ADD CONSTRAINT `Story_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Author`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoryLocalization` ADD CONSTRAINT `StoryLocalization_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `Story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoryTag` ADD CONSTRAINT `StoryTag_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `Story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoryTag` ADD CONSTRAINT `StoryTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoryAsset` ADD CONSTRAINT `StoryAsset_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `Story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoryRating` ADD CONSTRAINT `StoryRating_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `Story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StoryRating` ADD CONSTRAINT `StoryRating_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserWord` ADD CONSTRAINT `UserWord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBookProgress` ADD CONSTRAINT `UserBookProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBookProgress` ADD CONSTRAINT `UserBookProgress_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `Story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBookCompletion` ADD CONSTRAINT `UserBookCompletion_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBookCompletion` ADD CONSTRAINT `UserBookCompletion_storyId_fkey` FOREIGN KEY (`storyId`) REFERENCES `Story`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
