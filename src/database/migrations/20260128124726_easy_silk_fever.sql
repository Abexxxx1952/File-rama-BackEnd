CREATE TYPE public_access_role AS ENUM ('reader', 'writer');
ALTER TABLE "files" ADD COLUMN "public_access_role" "public_access_role";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "is_public";



