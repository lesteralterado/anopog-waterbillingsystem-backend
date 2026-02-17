import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';

const router = Router();

// GET /api/settings - Get system settings
router.get('/', getSettings);

// PUT /api/settings - Update system settings
router.put('/', updateSettings);

export default router;
