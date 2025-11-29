import express from 'express';
import { createIssue, getIssues, updateIssue, registerDeviceToken } from '../controllers/issueController';

const router = express.Router();

// Create a new issue
router.post('/issues', createIssue);

// Get all issues
router.get('/issues', getIssues);

// Update an issue
router.put('/issues/:id', updateIssue);

// Register device token
router.post('/register-device-token', registerDeviceToken);

export default router;