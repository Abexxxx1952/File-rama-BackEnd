/* ALTER TABLE "files" ALTER COLUMN "file_size" SET DATA TYPE bigint; */

ALTER TABLE "files"
ALTER COLUMN "file_size"
TYPE bigint
USING file_size::bigint;