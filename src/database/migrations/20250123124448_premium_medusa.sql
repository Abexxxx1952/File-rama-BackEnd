ALTER TABLE "file_stats" RENAME TO "stats";--> statement-breakpoint
ALTER TABLE "stats" DROP CONSTRAINT "file_stats_user_id_unique";--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "folders" DROP CONSTRAINT "folders_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "stats" DROP CONSTRAINT "file_stats_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "file_stats_id_idx";--> statement-breakpoint
ALTER TABLE "stats" ADD COLUMN "used_size" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stats" ADD CONSTRAINT "stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stats_id_idx" ON "stats" USING btree ("id");--> statement-breakpoint
ALTER TABLE "stats" ADD CONSTRAINT "stats_user_id_unique" UNIQUE("user_id");