import "dotenv/config";

import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";

const env = z
  .object({
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
  })
  .parse(process.env);

const origins = [...new Set([new URL(env.BETTER_AUTH_URL).origin, ...process.argv.slice(2)])];

const client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: env.S3_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          AllowedMethods: ["PUT"],
          AllowedHeaders: ["content-type"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

const current = await client.send(new GetBucketCorsCommand({ Bucket: env.S3_BUCKET }));
console.log(
  `Bucket ${env.S3_BUCKET} accepts browser uploads from: ${current.CORSRules?.flatMap((rule) => rule.AllowedOrigins ?? []).join(", ")}`,
);
client.destroy();
