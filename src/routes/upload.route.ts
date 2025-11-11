import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /upload route handler
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const results = await cloudinary.uploader.upload(req.file.path || `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`, {
      resource_type: 'auto'
    });

    // Generate URL with transformations
    const url = cloudinary.url(results.public_id, {
      transformation: [
        {
          quality: 'auto',
          fetch_format: 'auto'
        },
        {
          width: 1200,
          height: 1200,
          crop: 'fill',
          gravity: 'auto'
        }
      ]
    });

    // Return the transformed URL
    res.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;