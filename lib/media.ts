import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { serverEnv } from "./env.server";

let client: S3Client | undefined;

function s3(): S3Client {
  if (client) return client;
  const env = serverEnv();
  client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  });
  return client;
}

export type MediaObject =
  | {
      status: "found";
      body: ReadableStream;
      type: string;
      length?: number;
      etag?: string;
      range?: string;
    }
  | { status: "not-modified"; etag?: string }
  | { status: "unsatisfiable" }
  | { status: "missing" };

export async function readMediaObject(
  key: string,
  ifNoneMatch: string | null,
  range: string | null = null,
): Promise<MediaObject> {
  try {
    const object = await s3().send(
      new GetObjectCommand({
        Bucket: serverEnv().S3_BUCKET,
        Key: key,
        IfNoneMatch: ifNoneMatch ?? undefined,
        Range: range ?? undefined,
      }),
    );
    if (!object.Body) return { status: "missing" };
    return {
      status: "found",
      body: object.Body.transformToWebStream(),
      type: object.ContentType ?? "application/octet-stream",
      length: object.ContentLength,
      etag: object.ETag,
      range: object.ContentRange,
    };
  } catch (error) {
    if (error instanceof S3ServiceException) {
      const status = error.$metadata.httpStatusCode;
      if (status === 304) return { status: "not-modified", etag: ifNoneMatch ?? undefined };
      if (status === 416) return { status: "unsatisfiable" };
      if (status === 404 || error.name === "NoSuchKey") return { status: "missing" };
    }
    throw error;
  }
}

export async function presignUpload(
  key: string,
  contentType: string,
  size: number,
): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: serverEnv().S3_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: 600, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}

export async function readMediaBytes(key: string): Promise<Buffer | null> {
  try {
    const object = await s3().send(
      new GetObjectCommand({ Bucket: serverEnv().S3_BUCKET, Key: key }),
    );
    const bytes = await object.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch (error) {
    if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) return null;
    if (error instanceof S3ServiceException && error.name === "NoSuchKey") return null;
    throw error;
  }
}

export async function deleteMediaObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: serverEnv().S3_BUCKET, Key: key }));
}
