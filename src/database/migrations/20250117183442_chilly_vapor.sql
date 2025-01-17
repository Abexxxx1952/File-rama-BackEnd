ALTER TABLE "file" RENAME TO "files";--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "file_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "file_size" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "file_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "file_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;