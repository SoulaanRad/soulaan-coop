import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadToPinata, getIPFSUrl } from '../services/pinata.js';

const router = Router();

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime', // .mov files
      'video/webm',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: images (JPEG, PNG, WebP) and videos (MP4, MOV, WebM)`));
    }
  },
});

/**
 * POST /api/upload
 * Upload a file (photo or video) to IPFS
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    console.log(`📁 Received file: ${file.originalname} (${file.size} bytes)`);

    // Upload to IPFS via Pinata
    const cid = await uploadToPinata(file.buffer, file.originalname);

    // Get public URL
    const url = getIPFSUrl(cid);

    console.log(`✅ Upload successful: ${url}`);

    return res.json({
      success: true,
      cid,
      url,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
});

/**
 * POST /api/upload/video
 * Upload introduction video (5-10 seconds)
 * More strict validation for video duration
 */
router.post('/video', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    // Validate it's a video
    if (!file.mimetype.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        error: 'File must be a video',
      });
    }

    console.log(`🎥 Received video: ${file.originalname} (${file.size} bytes)`);

    // Upload to IPFS
    const cid = await uploadToPinata(file.buffer, file.originalname);
    const url = getIPFSUrl(cid);

    console.log(`✅ Video upload successful: ${url}`);

    return res.json({
      success: true,
      cid,
      url,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });
  } catch (error) {
    console.error('❌ Video upload error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Video upload failed',
    });
  }
});

export default router;
