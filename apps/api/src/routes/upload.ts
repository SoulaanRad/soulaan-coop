import { Router, Request, Response } from 'express';
import { generatePresignedUploadUrl, generatePresignedUrls, generateFileKey, getPublicUrl } from '../services/minio.js';

const router = Router();

/**
 * POST /api/upload/presigned
 * Generate a presigned URL for direct upload to MinIO
 */
router.post('/presigned', async (req: Request, res: Response) => {
  try {
    const { filename, contentType, uploadType, resourceId } = req.body;
    
    // Get coopId from header
    const coopId = req.headers['x-coop-id'] as string;
    
    if (!coopId) {
      return res.status(400).json({
        success: false,
        error: 'Missing X-Coop-Id header',
      });
    }

    if (!filename || !contentType || !uploadType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: filename, contentType, uploadType',
      });
    }

    // Validate upload type
    const validUploadTypes = ['profile', 'store', 'product'];
    if (!validUploadTypes.includes(uploadType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid uploadType. Must be one of: ${validUploadTypes.join(', ')}`,
      });
    }

    // Validate content type
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ];

    if (!allowedMimes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid content type. Allowed: ${allowedMimes.join(', ')}`,
      });
    }

    // Generate unique key for the file
    const key = generateFileKey(uploadType as 'profile' | 'store' | 'product', resourceId || 'temp', filename);

    // Generate presigned URL (5 minutes expiration)
    const presignedUrl = await generatePresignedUploadUrl(coopId, key, contentType, 300);

    // Get public URL for accessing the file after upload
    const publicUrl = getPublicUrl(coopId, key);

    console.log(`✅ Generated presigned URL for coop ${coopId}, ${uploadType}: ${key}`);

    return res.json({
      success: true,
      presignedUrl,
      key,
      publicUrl,
      expiresIn: 300, // seconds
    });
  } catch (error) {
    console.error('❌ Presigned URL generation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate presigned URL',
    });
  }
});

/**
 * POST /api/upload/presigned-batch
 * Generate multiple presigned URLs for batch uploads (e.g., product gallery)
 */
router.post('/presigned-batch', async (req: Request, res: Response) => {
  try {
    const { count, contentType, uploadType, resourceId } = req.body;
    
    // Get coopId from header
    const coopId = req.headers['x-coop-id'] as string;
    
    if (!coopId) {
      return res.status(400).json({
        success: false,
        error: 'Missing X-Coop-Id header',
      });
    }

    if (!count || !contentType || !uploadType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: count, contentType, uploadType',
      });
    }

    // Validate count
    if (typeof count !== 'number' || count < 1 || count > 10) {
      return res.status(400).json({
        success: false,
        error: 'Count must be a number between 1 and 10',
      });
    }

    // Validate upload type
    const validUploadTypes = ['profile', 'store', 'product'];
    if (!validUploadTypes.includes(uploadType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid uploadType. Must be one of: ${validUploadTypes.join(', ')}`,
      });
    }

    // Validate content type
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (!allowedMimes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid content type for batch upload. Allowed: ${allowedMimes.join(', ')}`,
      });
    }

    // Generate prefix for batch uploads
    const prefix = `${uploadType}s/${resourceId || 'temp'}/`;

    // Generate multiple presigned URLs
    const uploads = await generatePresignedUrls(coopId, count, prefix, contentType);

    console.log(`✅ Generated ${count} presigned URLs for coop ${coopId}, ${uploadType} batch upload`);

    return res.json({
      success: true,
      uploads,
      expiresIn: 300, // seconds
    });
  } catch (error) {
    console.error('❌ Batch presigned URL generation error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate presigned URLs',
    });
  }
});

export default router;
