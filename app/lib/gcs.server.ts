import { Storage } from "@google-cloud/storage";
import { env } from "./env.server";

// Initialize the Google Cloud Storage client
const storage = new Storage({
  projectId: env.GCS_PROJECT_ID,
  credentials: JSON.parse(env.GCS_KEY_JSON),
});

const bucket = storage.bucket(env.GCS_BUCKET_NAME);

/**
 * Uploads a file stream/buffer to GCS
 * @param fileName The destination path in the bucket
 * @param fileBuffer The file content buffer
 * @param mimeType The file mime type
 * @returns The public URL (though not publicly accessible) and the GCS path
 */
export async function uploadEbook(fileName: string, fileBuffer: Buffer, mimeType: string) {
  // Using dummy configuration handling for MVP
  if (env.GCS_PROJECT_ID === "dummy-project-id") {
    console.warn("⚠️ Using dummy GCS setup. File will not actually be uploaded.");
    return {
      gcsPath: fileName,
      url: `https://storage.googleapis.com/${env.GCS_BUCKET_NAME}/${fileName}`
    };
  }

  const file = bucket.file(fileName);
  
  await file.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
    },
    resumable: fileBuffer.length > 5 * 1024 * 1024, // use resumable for >5MB
  });

  return {
    gcsPath: fileName,
    url: `https://storage.googleapis.com/${bucket.name}/${fileName}`
  };
}

/**
 * Generates a signed URL for secure download
 * @param fileName The path of the file in GCS
 * @param expiresInMinutes Number of minutes until the URL expires
 */
export async function getSignedDownloadUrl(fileName: string, expiresInMinutes = 60) {
  if (env.GCS_PROJECT_ID === "dummy-project-id") {
    return `https://dummy-gcs-signed-url.com/download/${fileName}`;
  }

  const expires = Date.now() + expiresInMinutes * 60 * 1000;
  const file = bucket.file(fileName);
  
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires,
  });

  return url;
}

/**
 * Deletes a file from GCS
 * @param fileName The path of the file in GCS
 */
export async function deleteEbook(fileName: string) {
  if (env.GCS_PROJECT_ID === "dummy-project-id") {
    console.warn(`⚠️ Dummy delete for ${fileName}`);
    return true;
  }

  const file = bucket.file(fileName);
  await file.delete({ ignoreNotFound: true });
  return true;
}
