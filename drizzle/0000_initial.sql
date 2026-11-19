CREATE TYPE "public"."user_role" AS ENUM('owner', 'editor');--> statement-breakpoint
CREATE TYPE "public"."content_locale" AS ENUM('az', 'ru', 'en', 'de');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."consultation_request_status" AS ENUM('new', 'in-progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."hero_film_format" AS ENUM('webp', 'avif', 'jpg');--> statement-breakpoint
CREATE TYPE "public"."page_kind" AS ENUM('about', 'contact', 'consultation', 'brands', 'clients');--> statement-breakpoint
CREATE TYPE "public"."menu_item_target" AS ENUM('none', 'category', 'page', 'url');--> statement-breakpoint
CREATE TABLE "site_visits" (
	"visitor_hash" text NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "site_visits_day_visitor_hash_pk" PRIMARY KEY("day","visitor_hash")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"last_sign_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_id" uuid,
	"description" jsonb,
	"website_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug"),
	CONSTRAINT "brands_legacy_key_unique" UNIQUE("legacy_key")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" jsonb NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"image_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"seo_title" jsonb,
	"seo_description" jsonb,
	"legacy_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_legacy_key_unique" UNIQUE("legacy_key")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_documents" (
	"product_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"title" jsonb NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "product_documents_product_id_media_id_pk" PRIMARY KEY("product_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"product_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "product_images_product_id_media_id_pk" PRIMARY KEY("product_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "product_relations" (
	"product_id" uuid NOT NULL,
	"related_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "product_relations_product_id_related_id_pk" PRIMARY KEY("product_id","related_id"),
	CONSTRAINT "product_relations_not_self" CHECK ("product_relations"."product_id" <> "product_relations"."related_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" jsonb NOT NULL,
	"name" jsonb NOT NULL,
	"short_description" jsonb,
	"description" jsonb,
	"sku" text,
	"brand_id" uuid,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_id" uuid,
	"video_url" text,
	"video_poster_id" uuid,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"featured_position" integer,
	"seo_title" jsonb,
	"seo_description" jsonb,
	"legacy_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_legacy_key_unique" UNIQUE("legacy_key"),
	CONSTRAINT "products_single_video" CHECK (not ("products"."video_id" is not null and "products"."video_url" is not null))
);
--> statement-breakpoint
CREATE TABLE "consultation_request_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consultation_request_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"company" text,
	"message" text,
	"status" "consultation_request_status" DEFAULT 'new' NOT NULL,
	"locale" "content_locale" DEFAULT 'az' NOT NULL,
	"internal_note" text,
	"ip_hash" text,
	"legacy_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consultation_requests_legacy_key_unique" UNIQUE("legacy_key")
);
--> statement-breakpoint
CREATE TABLE "client_logos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"image_id" uuid NOT NULL,
	"url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"legacy_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_logos_legacy_key_unique" UNIQUE("legacy_key")
);
--> statement-breakpoint
CREATE TABLE "contact_persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" jsonb NOT NULL,
	"role" jsonb NOT NULL,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"email" text,
	"whatsapp" text,
	"photo_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_films" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"frame_count" integer NOT NULL,
	"frame_width" integer NOT NULL,
	"frame_height" integer NOT NULL,
	"format" "hero_film_format" DEFAULT 'webp' NOT NULL,
	"poster_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hero_films_key_prefix_unique" UNIQUE("key_prefix")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "page_kind",
	"slug" jsonb NOT NULL,
	"title" jsonb NOT NULL,
	"content" jsonb,
	"cover_id" uuid,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"seo_title" jsonb,
	"seo_description" jsonb,
	"legacy_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_kind_unique" UNIQUE("kind"),
	CONSTRAINT "pages_legacy_key_unique" UNIQUE("legacy_key")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" jsonb NOT NULL,
	"title" jsonb NOT NULL,
	"excerpt" jsonb,
	"content" jsonb,
	"cover_id" uuid,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"seo_title" jsonb,
	"seo_description" jsonb,
	"legacy_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_legacy_key_unique" UNIQUE("legacy_key")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"alt" jsonb,
	"lqip" text,
	"source_url" text,
	"legacy_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_unique" UNIQUE("key"),
	CONSTRAINT "media_source_url_unique" UNIQUE("source_url"),
	CONSTRAINT "media_legacy_key_unique" UNIQUE("legacy_key")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_id" uuid NOT NULL,
	"parent_id" uuid,
	"label" jsonb NOT NULL,
	"target" "menu_item_target" DEFAULT 'none' NOT NULL,
	"category_id" uuid,
	"page_id" uuid,
	"url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"legacy_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_legacy_key_unique" UNIQUE("legacy_key"),
	CONSTRAINT "menu_items_target_ref" CHECK (("menu_items"."target" <> 'category' or "menu_items"."category_id" is not null)
        and ("menu_items"."target" <> 'page' or "menu_items"."page_id" is not null)
        and ("menu_items"."target" <> 'url' or "menu_items"."url" is not null))
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"title" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"legacy_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menus_key_unique" UNIQUE("key"),
	CONSTRAINT "menus_legacy_key_unique" UNIQUE("legacy_key")
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status_code" smallint DEFAULT 301 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_from_path_unique" UNIQUE("from_path"),
	CONSTRAINT "redirects_status_code" CHECK ("redirects"."status_code" in (301, 302, 307, 308))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"logo_light_id" uuid,
	"logo_dark_id" uuid,
	"favicon_id" uuid,
	"phones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"address" jsonb,
	"map_url" text,
	"working_hours" jsonb,
	"socials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hero" jsonb,
	"home_sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"whatsapp_number" text,
	"legal_name" text,
	"consultation_notify_email" text,
	"seo_title" jsonb,
	"seo_description" jsonb,
	"og_image_id" uuid,
	"catalogue_file_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_documents" ADD CONSTRAINT "product_documents_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_related_id_products_id_fk" FOREIGN KEY ("related_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_video_poster_id_media_id_fk" FOREIGN KEY ("video_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_request_products" ADD CONSTRAINT "consultation_request_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_request_products" ADD CONSTRAINT "consultation_request_products_request_fk" FOREIGN KEY ("consultation_request_id") REFERENCES "public"."consultation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_logos" ADD CONSTRAINT "client_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_persons" ADD CONSTRAINT "contact_persons_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_films" ADD CONSTRAINT "hero_films_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parent_id_menu_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_logo_light_id_media_id_fk" FOREIGN KEY ("logo_light_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_logo_dark_id_media_id_fk" FOREIGN KEY ("logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_catalogue_file_id_media_id_fk" FOREIGN KEY ("catalogue_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "brands_order_idx" ON "brands" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_az_key" ON "categories" USING btree (("slug" ->> 'az'));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_ru_key" ON "categories" USING btree (("slug" ->> 'ru'));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_en_key" ON "categories" USING btree (("slug" ->> 'en'));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_de_key" ON "categories" USING btree (("slug" ->> 'de'));--> statement-breakpoint
CREATE INDEX "product_categories_category_id_idx" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_documents_media_id_idx" ON "product_documents" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "product_images_media_id_idx" ON "product_images" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_deleted_at_idx" ON "products" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_brand_id_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_az_key" ON "products" USING btree (("slug" ->> 'az'));--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_ru_key" ON "products" USING btree (("slug" ->> 'ru'));--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_en_key" ON "products" USING btree (("slug" ->> 'en'));--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_de_key" ON "products" USING btree (("slug" ->> 'de'));--> statement-breakpoint
CREATE INDEX "consultation_request_products_request_idx" ON "consultation_request_products" USING btree ("consultation_request_id");--> statement-breakpoint
CREATE INDEX "consultation_requests_status_idx" ON "consultation_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "consultation_requests_ip_hash_idx" ON "consultation_requests" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "client_logos_order_idx" ON "client_logos" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "contact_persons_order_idx" ON "contact_persons" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_az_key" ON "pages" USING btree (("slug" ->> 'az'));--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_ru_key" ON "pages" USING btree (("slug" ->> 'ru'));--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_en_key" ON "pages" USING btree (("slug" ->> 'en'));--> statement-breakpoint
CREATE UNIQUE INDEX "pages_slug_de_key" ON "pages" USING btree (("slug" ->> 'de'));--> statement-breakpoint
CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_az_key" ON "posts" USING btree (("slug" ->> 'az'));--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_ru_key" ON "posts" USING btree (("slug" ->> 'ru'));--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_en_key" ON "posts" USING btree (("slug" ->> 'en'));--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_de_key" ON "posts" USING btree (("slug" ->> 'de'));--> statement-breakpoint
CREATE INDEX "menu_items_menu_id_idx" ON "menu_items" USING btree ("menu_id","parent_id","sort_order");