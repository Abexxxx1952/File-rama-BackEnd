
CREATE TYPE "tokens_type" AS ENUM ('VERIFICATION', 'TWO_FACTOR', 'PASSWORD_RESET', 'REFRESH');

CREATE TYPE "users_permissions" AS ENUM ('CreateFile', 'DeleteFile');

CREATE TYPE "users_registration_sources" AS ENUM ('Local', 'Google', 'GitHub');


CREATE TABLE "file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"file_name" text NOT NULL,
	"file_extension" text NOT NULL,
	"file_size" integer NOT NULL,
	"upload_date" timestamp DEFAULT now() NOT NULL,
	"file_description" text,
	"is_public" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"file_count" integer DEFAULT 0 NOT NULL,
	"total_size" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "file_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_value" text NOT NULL,
	"token_type" "tokens_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expire_in" timestamp,
	CONSTRAINT "tokens_token_value_unique" UNIQUE("token_value")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" varchar(255) NOT NULL,
	"password" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"payload" jsonb[] DEFAULT '{}',
	"permissions" "users_permissions"[] DEFAULT '{"CreateFile","DeleteFile"}',
	"registration_sources" "users_registration_sources"[] NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_two_factor_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_stats" ADD CONSTRAINT "file_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_id_idx" ON "file" USING btree ("id");--> statement-breakpoint
CREATE INDEX "file_stats_id_idx" ON "file_stats" USING btree ("id");--> statement-breakpoint
CREATE INDEX "email_idx" ON "tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_id_idx" ON "users" USING btree ("id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");