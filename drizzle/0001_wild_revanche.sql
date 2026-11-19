ALTER TABLE "users" ADD COLUMN "admin_locale" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "caption" jsonb;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "text_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "search_indexing" boolean DEFAULT true NOT NULL;