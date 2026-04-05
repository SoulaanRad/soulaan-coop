import { S3Client, PutObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";

// Parse endpoint URL to extract host and determine if SSL is used
const parseEndpoint = (endpoint: string) => {
  const url = new URL(endpoint);
  return {
    endpoint: `${url.protocol}//${url.host}`,
    forcePathStyle: true, // Required for MinIO
    region: "us-east-1", // MinIO doesn't enforce regions, but SDK requires it
  };
};

// Initialize S3 client configured for MinIO
const endpointConfig = parseEndpoint(env.MINIO_ENDPOINT);

export const minioClient = new S3Client({
  ...endpointConfig,
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
});

/**
 * Get bucket name for a specific coop
 * Format: soulaan-{coopId}
 */
export function getCoopBucketName(coopId: string): string {
  // Sanitize coopId to be bucket-name safe (lowercase, alphanumeric, hyphens)
  const sanitized = coopId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `soulaan-${sanitized}`;
}

/**
 * Check if a bucket exists
 */
async function bucketExists(bucketName: string): Promise<boolean> {
  try {
    await minioClient.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Create a bucket for a coop if it doesn't exist
 */
export async function ensureCoopBucket(coopId: string): Promise<string> {
  const bucketName = getCoopBucketName(coopId);
  
  try {
    const exists = await bucketExists(bucketName);
    
    if (!exists) {
      console.log(`📦 Creating bucket for coop ${coopId}: ${bucketName}`);
      await minioClient.send(new CreateBucketCommand({ Bucket: bucketName }));
      console.log(`✅ Bucket created: ${bucketName}`);
    }
    
    return bucketName;
  } catch (error) {
    console.error(`❌ Error ensuring bucket for coop ${coopId}:`, error);
    throw new Error(`Failed to ensure bucket for coop: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a presigned URL for uploading a file directly to MinIO
 * @param coopId - Coop ID to determine bucket
 * @param key - The S3 key (path) where the file will be stored
 * @param contentType - MIME type of the file (e.g., 'image/jpeg')
 * @param expiresIn - URL expiration time in seconds (default: 5 minutes)
 * @returns Presigned URL for PUT request
 */
export async function generatePresignedUploadUrl(
  coopId: string,
  key: string,
  contentType: string,
  expiresIn: number = 300
): Promise<string> {
  const bucketName = await ensureCoopBucket(coopId);
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  try {
    const presignedUrl = await getSignedUrl(minioClient, command, { expiresIn });
    console.log(`✅ Generated presigned upload URL for coop ${coopId}: ${key}`);
    return presignedUrl;
  } catch (error) {
    console.error("❌ Error generating presigned URL:", error);
    throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate multiple presigned URLs for batch uploads
 * @param coopId - Coop ID to determine bucket
 * @param count - Number of URLs to generate
 * @param prefix - Key prefix for the files (e.g., 'products/123/')
 * @param contentType - MIME type of the files
 * @returns Array of presigned URLs with their keys
 */
export async function generatePresignedUrls(
  coopId: string,
  count: number,
  prefix: string,
  contentType: string
): Promise<Array<{ presignedUrl: string; key: string; publicUrl: string }>> {
  const bucketName = await ensureCoopBucket(coopId);
  const urls: Array<{ presignedUrl: string; key: string; publicUrl: string }> = [];

  for (let i = 0; i < count; i++) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const key = `${prefix}${timestamp}-${randomId}.${getExtensionFromContentType(contentType)}`;
    
    const presignedUrl = await generatePresignedUploadUrl(coopId, key, contentType);
    const publicUrl = getPublicUrl(coopId, key);
    
    urls.push({ presignedUrl, key, publicUrl });
  }

  console.log(`✅ Generated ${count} presigned URLs for coop ${coopId} with prefix: ${prefix}`);
  return urls;
}

/**
 * Get the public URL for accessing a file in MinIO
 * @param coopId - Coop ID to determine bucket
 * @param key - The S3 key (path) of the file
 * @returns Public URL to access the file
 */
export function getPublicUrl(coopId: string, key: string): string {
  const bucketName = getCoopBucketName(coopId);
  const url = new URL(env.MINIO_ENDPOINT);
  return `${url.protocol}//${url.host}/${bucketName}/${key}`;
}

/**
 * Delete a file from MinIO (optional cleanup)
 * @param coopId - Coop ID to determine bucket
 * @param key - The S3 key (path) of the file to delete
 */
export async function deleteFile(coopId: string, key: string): Promise<void> {
  const bucketName = getCoopBucketName(coopId);
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    await minioClient.send(command);
    console.log(`🗑️ Deleted file from coop ${coopId}: ${key}`);
  } catch (error) {
    console.error("❌ Error deleting file:", error);
    // Don't throw - deletion is not critical
  }
}

/**
 * Helper to get file extension from content type
 */
function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return map[contentType] || "bin";
}

/**
 * Generate a unique key for a file upload
 * @param uploadType - Type of upload (profile, store, product)
 * @param resourceId - ID of the resource (userId, storeId, productId)
 * @param filename - Original filename
 * @returns S3 key
 */
export function generateFileKey(
  uploadType: "profile" | "store" | "product",
  resourceId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  
  switch (uploadType) {
    case "profile":
      return `profiles/${resourceId}/${timestamp}-${sanitizedFilename}`;
    case "store":
      return `stores/${resourceId}/${timestamp}-${sanitizedFilename}`;
    case "product":
      return `products/${resourceId}/${timestamp}-${sanitizedFilename}`;
    default:
      return `uploads/${timestamp}-${sanitizedFilename}`;
  }
}
