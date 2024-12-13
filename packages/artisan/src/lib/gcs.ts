import { Storage } from "@google-cloud/storage";
import { createReadStream, promises as fs } from "fs";
import mime from "mime";
import path from "path";
import { env } from "../env";

const storage = new Storage({
  projectId: env.GCS_PROJECT_ID,
  keyFilename: env.GCS_KEY_FILE,
});

const bucket = storage.bucket(env.GCS_BUCKET!);

// Synchronize files from GCS to local
export async function syncFromGCS(remotePath: string, localPath: string) {
  const [files] = await bucket.getFiles({ prefix: remotePath });
  for (const file of files) {
    const localFilePath = path.join(localPath, file.name.replace(remotePath, ""));
    await fs.mkdir(path.dirname(localFilePath), { recursive: true });
    await file.download({ destination: localFilePath });
  }
}

// Synchronize files from local to GCS
export async function syncToGCS(
  localPath: string,
  remotePath: string,
  options?: {
    del?: boolean;
    public?: boolean;
  },
) {
  const files = await fs.readdir(localPath, { withFileTypes: true });

  for (const file of files) {
    const localFilePath = path.join(localPath, file.name);
    const remoteFilePath = path.join(remotePath, file.name);

    if (file.isDirectory()) {
      await syncToGCS(localFilePath, remoteFilePath, options);
    } else {
      const contentType = mime.getType(localFilePath) || "binary/octet-stream";
      const remoteFile = bucket.file(remoteFilePath);

      await remoteFile.save(await fs.readFile(localFilePath), {
        metadata: { contentType },
        public: options?.public,
      });
    }
  }

  if (options?.del) {
    const [existingFiles] = await bucket.getFiles({ prefix: remotePath });
    const existingFileNames = new Set(existingFiles.map((f) => f.name));

    for (const file of files) {
      existingFileNames.delete(path.join(remotePath, file.name));
    }

    for (const fileName of existingFileNames) {
      await bucket.file(fileName).delete();
    }
  }
}

// Upload a file to GCS
type UploadToGCSFile =
  | { type: "json"; data: object }
  | { type: "local"; path: string };

export async function uploadToGCS(
  remoteFilePath: string,
  file: UploadToGCSFile,
  onProgress?: (value: number) => void,
) {
  const remoteFile = bucket.file(remoteFilePath);

  switch (file.type) {
    case "json": {
      const stream = remoteFile.createWriteStream({
        contentType: "application/json",
      });
      stream.write(JSON.stringify(file.data, null, 2));
      stream.end();
      break;
    }
    case "local": {
      const contentType = mime.getType(file.path) || "binary/octet-stream";
      const localFileStream = createReadStream(file.path);

      await new Promise<void>((resolve, reject) => {
        const stream = remoteFile.createWriteStream({ contentType });

        localFileStream.on("data", (chunk) => {
          const loaded = localFileStream.bytesRead;
          const total = fs.statSync(file.path).size;
          const progress = Math.round((loaded / total) * 100);
          onProgress?.(progress);
        });

        localFileStream.pipe(stream).on("finish", resolve).on("error", reject);
      });

      break;
    }
    default:
      throw new Error("Invalid file type for upload.");
  }
}

// Generate a signed URL for GCS
export async function getGCSSignedUrl(
  remoteFilePath: string,
  expiresInSeconds: number,
) {
  const remoteFile = bucket.file(remoteFilePath);

  const [url] = await remoteFile.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInSeconds * 1000,
  });

  return url;
}
