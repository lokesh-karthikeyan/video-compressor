import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { getEnvOrThrowError } from "./env";

const clients = new Map<string, S3Client>();

function getS3(endpoint: string): S3Client {
  let client = clients.get(endpoint);

  if (!client) {
    client = new S3Client({
      endpoint,
      region: getEnvOrThrowError("S3_REGION"),
      credentials: {
        accessKeyId: getEnvOrThrowError("S3_ACCESS_KEY"),
        secretAccessKey: getEnvOrThrowError("S3_SECRET_KEY"),
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    clients.set(endpoint, client);
  }

  return client;
}

function bucket(): string {
  return getEnvOrThrowError("S3_BUCKET");
}

function internalEndpoint(): string {
  return getEnvOrThrowError("S3_ENDPOINT");
}

function publicEndpoint(): string {
  return process.env.S3_PUBLIC_ENDPOINT || internalEndpoint();
}

export function generatePresignedUploadUrl(key: string, contentType: string, expiresIn = 3600) {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getS3(publicEndpoint()), command, { expiresIn });
}

export function generatePresignedDownloadUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  });

  return getSignedUrl(getS3(publicEndpoint()), command, { expiresIn });
}

async function presignInternalDownload(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  });

  return getSignedUrl(getS3(internalEndpoint()), command, { expiresIn: 3600 });
}

export async function downloadToFile(key: string, localPath: string): Promise<void> {
  const url = await presignInternalDownload(key);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`S3 download failed with status ${response.status} for key: ${key}`);
  }

  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(localPath));
}

export async function uploadFile(localPath: string, key: string): Promise<number> {
  const bytes = new Uint8Array(await Bun.file(localPath).arrayBuffer());

  await getS3(internalEndpoint()).send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: bytes,
    }),
  );

  return bytes.byteLength;
}

export async function deleteObject(key: string): Promise<void> {
  await getS3(internalEndpoint()).send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}
