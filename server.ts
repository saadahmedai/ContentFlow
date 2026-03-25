import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from 'firebase-admin';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  // In this environment, we assume the default service account has permissions
  // or we use the project ID and hope for the best with ambient credentials.
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });

  const db = admin.firestore();
  const messaging = admin.messaging();

  console.log('Starting notification listener...');
  
  // Listen for new notifications
  db.collection('notifications').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        const data = change.doc.data();
        const { targetUserKey, title, body } = data;
        
        console.log(`Processing notification for ${targetUserKey}: ${title}`);
        
        try {
          // Get user's token
          const userDoc = await db.collection('users').doc(targetUserKey).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            const fcmToken = userData?.fcmToken;
            
            if (fcmToken) {
              await messaging.send({
                token: fcmToken,
                notification: { title, body },
                webpush: {
                  notification: {
                    icon: 'https://ais-dev-ox6ym4bkpli4s27pyhkqej-186553228772.asia-southeast1.run.app/favicon.ico',
                    badge: 'https://ais-dev-ox6ym4bkpli4s27pyhkqej-186553228772.asia-southeast1.run.app/favicon.ico',
                  },
                  fcmOptions: {
                    link: 'https://ais-dev-ox6ym4bkpli4s27pyhkqej-186553228772.asia-southeast1.run.app'
                  }
                }
              });
              console.log(`Notification sent successfully to ${targetUserKey}`);
            } else {
              console.log(`No FCM token found for user ${targetUserKey}`);
            }
          } else {
            console.log(`User document not found for ${targetUserKey}`);
          }
        } catch (err) {
          console.error(`Error sending notification to ${targetUserKey}:`, err);
        } finally {
          // Always delete the notification document after processing to keep the collection clean
          try {
            await change.doc.ref.delete();
          } catch (deleteErr) {
            console.error('Error deleting processed notification:', deleteErr);
          }
        }
      }
    });
  }, err => {
    console.error('Notification listener error:', err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
