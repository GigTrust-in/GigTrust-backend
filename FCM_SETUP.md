# Firebase Cloud Messaging (FCM) Setup Guide

## Prerequisites
1. A Firebase project (create one at https://console.firebase.google.com)
2. Firebase Admin SDK service account JSON file

## Setup Steps

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 2. Generate Service Account Key
1. In Firebase Console, go to Project Settings (gear icon)
2. Navigate to "Service Accounts" tab
3. Click "Generate new private key"
4. Save the JSON file securely (e.g., `firebase-service-account.json`)

### 3. Configure Backend

#### Option A: For Local Development (File Path)
1. Place the service account JSON file in a secure location (e.g., `/home/mango/Repos/GigTrust-backend/api-main/config/`)
2. Add to `.env` file:
   ```
   FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/to/firebase-service-account.json
   ```
3. **Important**: Add the config directory to `.gitignore`:
   ```
   config/
   *.json
   ```

#### Option B: For Production Deployment (Environment Variable) - **RECOMMENDED**
1. Copy the entire content of your `firebase-service-account.json` file
2. In your deployment platform (Render, Railway, Heroku, etc.), add an environment variable:
   - **Name**: `FIREBASE_SERVICE_ACCOUNT_JSON`
   - **Value**: Paste the entire JSON content (as a single line or formatted)
   
   Example for Render/Railway:
   ```
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
   ```

3. **Do NOT commit the JSON file to your repository**

### 4. Install Dependencies
Run in the `api-main` directory:
```bash
npm install
```

### 5. Frontend Integration
Your mobile/web app needs to:
1. Initialize Firebase SDK
2. Request notification permissions
3. Get FCM registration token
4. Send token to backend via `PATCH /api/v1/users/fcm-token`

Example frontend code (React Native):
```javascript
import messaging from '@react-native-firebase/messaging';

async function registerFCMToken() {
  const token = await messaging().getToken();
  
  // Send to backend
  await fetch('https://your-api.com/api/v1/users/fcm-token', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fcmToken: token })
  });
}
```

## How It Works
1. When a new job is created, the backend finds all matching workers
2. For each worker, it creates a database notification
3. If the worker has an FCM token registered, a push notification is sent to their device
4. The notification appears even when the app is in the background

## Testing
1. Register a provider account
2. Update FCM token via the API endpoint
3. Create a job that matches the provider's criteria
4. Check if push notification is received on the device

## Troubleshooting
- If FCM is not initialized, check that `FIREBASE_SERVICE_ACCOUNT_PATH` is set correctly
- Verify the service account JSON file has the correct permissions
- Check server logs for FCM initialization messages
- Ensure frontend app has notification permissions enabled
