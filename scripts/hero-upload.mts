import "dotenv/config";

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

const load = createRequire(import.meta.url);
const schema = load("../lib/db/schema") as typeof import("../lib/db/schema");
const films = load("../lib/validation/hero-films") as typeof import("../lib/validation/hero-films");

const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
  })
  .parse(process.env);

const tierSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  count: z.number().int().min(2),
  pattern: z.string().includes("{index:04d}"),
});

const posterSchema = z.object({
  file: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const localManifestSchema = z.object({
  name: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  version: z.number().int().positive(),
  format: z.enum(films.heroFilmFormats),
  tiers: z.object({ desktop: tierSchema, mobile: tierSchema.optional() }),
  posters: z.object({ desktop: posterSchema, mobile: posterSchema.optional() }),
});

const contentTypes: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  json: "application/json",
};

const immutable = "public, max-age=31536000, immutable";

const args = process.argv.slice(2);
const folder = args.find((arg) => !arg.startsWith("--"));
const useFilm = args.includes("--use");
if (!folder) {
  console.error("Usage: pnpm hero:upload <folder> [--use]");
  process.exit(1);
}

const manifest = localManifestSchema.parse(
  JSON.parse(await readFile(path.join(folder, "manifest.json"), "utf8")),
);
const prefix = `film/${manifest.name}/v${manifest.version}`;

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
});

async function existingKeys(): Promise<Set<string>> {
  const keys = new Set<string>();
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.S3_BUCKET,
        Prefix: `${prefix}/`,
        ContinuationToken: token,
      }),
    );
    for (const item of page.Contents ?? []) if (item.Key) keys.add(item.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

function extension(file: string): string {
  return path.extname(file).slice(1).toLowerCase();
}

async function put(key: string, body: Buffer, type: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: type,
      CacheControl: immutable,
    }),
  );
}

type Upload = { key: string; file: string };

const uploads: Upload[] = [];
for (const tier of films.heroFilmTiers) {
  const frames = manifest.tiers[tier];
  if (!frames) continue;
  for (let index = 0; index < frames.count; index += 1) {
    uploads.push({
      key: films.heroFilmFrameKey(prefix, index, manifest.format, tier),
      file: path.join(
        folder,
        frames.pattern.replace("{index:04d}", films.heroFilmFrameName(index)),
      ),
    });
  }
}
const posterKeys = {
  desktop: `${prefix}/poster-desktop.${extension(manifest.posters.desktop.file)}`,
  mobile: manifest.posters.mobile
    ? `${prefix}/poster-mobile.${extension(manifest.posters.mobile.file)}`
    : null,
};
uploads.push({ key: posterKeys.desktop, file: path.join(folder, manifest.posters.desktop.file) });
if (manifest.posters.mobile && posterKeys.mobile) {
  uploads.push({ key: posterKeys.mobile, file: path.join(folder, manifest.posters.mobile.file) });
}

const present = await existingKeys();
const pending = uploads.filter((upload) => !present.has(upload.key));
let bytes = 0;
let done = 0;
const started = Date.now();
async function worker(): Promise<void> {
  for (let next = pending.shift(); next; next = pending.shift()) {
    const body = await readFile(next.file);
    await put(next.key, body, contentTypes[extension(next.file)] ?? "application/octet-stream");
    bytes += body.byteLength;
    done += 1;
    if (done % 50 === 0) console.log(`uploaded ${done} files`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

const bucketManifest = films.heroFilmManifestSchema.parse({
  version: manifest.version,
  format: manifest.format,
  tiers: {
    desktop: {
      width: manifest.tiers.desktop.width,
      height: manifest.tiers.desktop.height,
      count: manifest.tiers.desktop.count,
    },
    mobile: manifest.tiers.mobile
      ? {
          width: manifest.tiers.mobile.width,
          height: manifest.tiers.mobile.height,
          count: manifest.tiers.mobile.count,
        }
      : undefined,
  },
  posters: {
    desktop: {
      key: posterKeys.desktop,
      width: manifest.posters.desktop.width,
      height: manifest.posters.desktop.height,
    },
    mobile:
      manifest.posters.mobile && posterKeys.mobile
        ? {
            key: posterKeys.mobile,
            width: manifest.posters.mobile.width,
            height: manifest.posters.mobile.height,
          }
        : undefined,
  },
});
await s3.send(
  new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: films.heroFilmManifestKey(prefix),
    Body: JSON.stringify(bucketManifest),
    ContentType: "application/json",
    CacheControl: immutable,
  }),
);
s3.destroy();

const client = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema });
try {
  const posterFile = path.join(folder, manifest.posters.desktop.file);
  const posterBody = await readFile(posterFile);
  const [posterRow] = await db
    .insert(schema.media)
    .values({
      key: posterKeys.desktop,
      mimeType: contentTypes[extension(posterFile)] ?? "image/jpeg",
      width: manifest.posters.desktop.width,
      height: manifest.posters.desktop.height,
      size: (await stat(posterFile)).size,
      sha256: createHash("sha256").update(posterBody).digest("hex"),
    })
    .onConflictDoUpdate({
      target: schema.media.key,
      set: { width: manifest.posters.desktop.width, height: manifest.posters.desktop.height },
    })
    .returning({ id: schema.media.id });

  const values = {
    name: `${manifest.name} v${manifest.version}`,
    keyPrefix: prefix,
    frameCount: manifest.tiers.desktop.count,
    frameWidth: manifest.tiers.desktop.width,
    frameHeight: manifest.tiers.desktop.height,
    format: manifest.format,
    posterId: posterRow?.id ?? null,
  };
  const [film] = await db
    .insert(schema.heroFilms)
    .values(values)
    .onConflictDoUpdate({ target: schema.heroFilms.keyPrefix, set: values })
    .returning({ id: schema.heroFilms.id });

  if (useFilm && film) {
    const [row] = await db
      .select({ hero: schema.settings.hero })
      .from(schema.settings)
      .where(eq(schema.settings.id, 1));
    if (row?.hero) {
      await db
        .update(schema.settings)
        .set({ hero: { ...row.hero, filmId: film.id } })
        .where(eq(schema.settings.id, 1));
    } else {
      console.warn("The home hero has no headline yet; select the film in the admin.");
    }
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    [
      `Film ${prefix}: ${done} files uploaded (${(bytes / 1024 / 1024).toFixed(2)} MB) in ${seconds} s, ${uploads.length - done} already present`,
      `Registered hero film ${film?.id}${useFilm ? " and selected it for the home hero" : ""}`,
      "Saving the home page in the admin (or a restart) refreshes the cached hero on the site.",
    ].join("\n"),
  );
} finally {
  await client.end();
}
