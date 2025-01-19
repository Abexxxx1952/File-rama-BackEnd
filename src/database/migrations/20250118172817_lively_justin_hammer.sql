ALTER TABLE "files" RENAME COLUMN "file_id" TO "file_google_drive_id";--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "file_google_drive_parent_folder_id" text NOT NULL;