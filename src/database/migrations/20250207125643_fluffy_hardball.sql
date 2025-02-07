ALTER TABLE "folders" ADD COLUMN "upload_date" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "folders" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;