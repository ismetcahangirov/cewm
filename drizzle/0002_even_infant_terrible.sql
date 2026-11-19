ALTER TABLE "brands" ADD COLUMN "image_id" uuid;--> statement-breakpoint
ALTER TABLE "contact_persons" ADD COLUMN "legacy_key" text;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_persons" ADD CONSTRAINT "contact_persons_legacy_key_unique" UNIQUE("legacy_key");