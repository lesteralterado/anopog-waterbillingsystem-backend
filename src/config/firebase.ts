import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.warn('Firebase service account key not found. FCM will not work until you add the key file.');
  // Initialize with default credentials or skip
  admin.initializeApp();
}

export default admin;