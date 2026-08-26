import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const log = (msg: string) => console.log(`[garage-init] ${msg}`);
const fail = (msg: string) => { console.error(`[garage-init] ${msg}`); process.exit(1); };

const CREDS_DIR = process.env.CREDS_DIR ?? "/run/garage-creds";
const ADMIN = process.env.GARAGE_ADMIN_URL ?? "http://garage:3903";
const TOKEN = process.env.GARAGE_ADMIN_TOKEN;
const BUCKET = process.env.S3_BUCKET ?? "video-compressor";
const ORIGIN = process.env.FRONTEND_URL ?? "http://localhost:5173";

if (!TOKEN) fail("GARAGE_ADMIN_TOKEN is required");

const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ADMIN}${path}`, { ...init, headers });
  if (!res.ok) fail(`API ${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

await Bun.write(`${CREDS_DIR}/.keep`, "");

const credsFile = `${CREDS_DIR}/s3_access_key`;
if (await Bun.file(credsFile).exists()) {
  log("already initialized");
  process.exit(0);
}

log("waiting for garage admin api...");
for (let i = 0; i < 60; i++) {
  try { await fetch(`${ADMIN}/v2/GetClusterHealth`, { headers }); break; }
  catch { if (i === 59) fail("timed out waiting for garage"); await Bun.sleep(2000); }
}
log("garage is up");

const layout = await api<{ version: number; nodes: { id: string }[] }>("/v2/GetClusterLayout");
const version = layout.version ?? 0;

const status = await api<{ id: string }>("/v2/GetClusterStatus");
const nodeId = status.id;
if (!nodeId) fail("could not determine node id");
log(`node ${nodeId} (layout version ${version})`);

const nodeInLayout = layout.nodes?.some((n) => n.id === nodeId) ?? false;
if (!nodeInLayout) {
  log("staging role for node");
  await api("/v2/UpdateClusterLayout", {
    method: "POST",
    body: JSON.stringify({ roles: [{ id: nodeId, zone: "dc1", capacity: 1073741824, tags: [] }] }),
  });
  let v = version;
  while (true) {
    v++;
    try {
      await api("/v2/ApplyClusterLayout", { method: "POST", body: JSON.stringify({ version: v }) });
      log(`layout applied (version ${v})`);
      break;
    } catch { if (v - version > 20) fail("could not apply layout"); }
  }
}

log(`creating bucket ${BUCKET} (noop if exists)`);
await api("/v2/CreateBucket", { method: "POST", body: JSON.stringify({ globalAlias: BUCKET }) }).catch(() => {});

const buckets = await api<{ id: string; globalAliases: string[] }[]>("/v2/ListBuckets");
const bucketId = buckets.find((b) => b.globalAliases?.includes(BUCKET))?.id;
if (!bucketId) fail(`bucket ${BUCKET} not found after create`);

const keyName = `app-key-${Date.now()}`;
log(`creating key ${keyName}`);
const keyJson = await api<{ accessKeyId: string; secretAccessKey: string }>("/v2/CreateKey", {
  method: "POST",
  body: JSON.stringify({ name: keyName }),
});

const { accessKeyId, secretAccessKey } = keyJson;
if (!accessKeyId || !secretAccessKey) fail("failed to parse key material");

await api("/v2/AllowBucketKey", {
  method: "POST",
  body: JSON.stringify({ bucketId, accessKeyId, permissions: { read: true, write: true, owner: true } }),
});

await Bun.write(`${CREDS_DIR}/s3_access_key`, accessKeyId);
await Bun.write(`${CREDS_DIR}/s3_secret_key`, secretAccessKey);

log("applying CORS rules for browser uploads");
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "garage",
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});
await s3.send(new PutBucketCorsCommand({
  Bucket: BUCKET,
  CORSConfiguration: {
    CORSRules: [{
      AllowedOrigins: [ORIGIN],
      AllowedMethods: ["GET", "HEAD", "PUT"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["etag"],
      MaxAgeSeconds: 3600,
    }],
  },
}));
log(`CORS rules set for bucket "${BUCKET}" (origin ${ORIGIN})`);

log(`done (key ${accessKeyId})`);
