import { Storage } from '@google-cloud/storage';
import type { StorageFolder, StorageFolderItem } from "../types";

import { env } from "../env";

const storage = new Storage({
  projectId: env.GCS_PROJECT_ID,
  keyFilename: env.GCS_KEY_FILE,
});

const bucket = storage.bucket(env.GCS_BUCKET_NAME);

export async function getStorageFolder(
  path: string,
  take = 10,
  cursor?: string
): Promise<StorageFolder> {
  path = path.startsWith('/') ? path.substring(1) : path;

  const [files] = await bucket.getFiles({
    prefix: path,
    delimiter: '/',
    maxResults: take,
    pageToken: cursor,
  });

  const items: StorageFolderItem[] = [];

  // Separate folders and files
  const folderSet = new Set<string>();
  
  files.forEach((file) => {
    const relativePath = file.name.replace(path, '').split('/').filter(Boolean);
    
    // Handle folders
    if (relativePath.length > 1) {
      const folderPath = `${path}${relativePath[0]}/`;
      if (!folderSet.has(folderPath)) {
        folderSet.add(folderPath);
        items.push({
          type: 'folder',
          path: `/${folderPath}`,
        });
      }
    }

    // Handle files
    if (relativePath.length === 1 && !file.name.endsWith('/')) {
      items.push({
        type: 'file',
        path: `/${file.name}`,
        size: parseInt(file.metadata.size || '0'),
      });
    }
  });

  return {
    cursor: files.nextPageToken || undefined,
    items,
  };
}

export async function getStorageFileUrl(path: string): Promise<string> {
  path = path.startsWith('/') ? path.substring(1) : path;
  const file = bucket.file(path);

  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  });

  return url;
}

export async function getStorageFilePayload(path: string): Promise<string> {
  path = path.startsWith('/') ? path.substring(1) : path;
  const file = bucket.file(path);

  const [contents] = await file.download();
  return contents.toString('utf-8');
}