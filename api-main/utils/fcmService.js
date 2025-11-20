const admin = require("firebase-admin");

let fcmInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * This should be called once when the server starts
 */
exports.initializeFCM = () => {
    try {
        let serviceAccount;

        // Option 1: Use JSON string from environment variable (recommended for deployment)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
                console.log("📱 Using Firebase credentials from FIREBASE_SERVICE_ACCOUNT_JSON environment variable");
            } catch (parseError) {
                console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", parseError.message);
                return;
            }
        }
        // Option 2: Use file path (for local development)
        else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            try {
                serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
                console.log("📱 Using Firebase credentials from file path");
            } catch (fileError) {
                console.error("❌ Failed to load Firebase service account file:", fileError.message);
                return;
            }
        }
        // No credentials provided
        else {
            console.warn("⚠️  Neither FIREBASE_SERVICE_ACCOUNT_JSON nor FIREBASE_SERVICE_ACCOUNT_PATH is set.");
            console.warn("⚠️  FCM push notifications will be disabled.");
            return;
        }

        // Initialize Firebase Admin
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        fcmInitialized = true;
        console.log("✅ Firebase Cloud Messaging initialized successfully!");
    } catch (error) {
        console.error("❌ Failed to initialize FCM:", error.message);
        console.warn("⚠️  FCM push notifications will be disabled.");
    }
};

/**
 * Send a push notification to a specific device
 * @param {string} fcmToken - The FCM registration token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 */
exports.sendPushNotification = async (fcmToken, title, body, data = {}) => {
    if (!fcmInitialized) {
        console.log("FCM not initialized. Skipping push notification.");
        return { success: false, reason: "FCM not initialized" };
    }

    if (!fcmToken) {
        console.log("No FCM token provided. Skipping push notification.");
        return { success: false, reason: "No FCM token" };
    }

    try {
        const message = {
            notification: {
                title,
                body,
            },
            data: {
                ...data,
                timestamp: new Date().toISOString(),
            },
            token: fcmToken,
        };

        const response = await admin.messaging().send(message);
        console.log(`✅ Push notification sent successfully: ${response}`);
        return { success: true, messageId: response };
    } catch (error) {
        console.error("❌ Failed to send push notification:", error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send push notifications to multiple devices
 * @param {Array<string>} fcmTokens - Array of FCM registration tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 */
exports.sendMulticastPushNotification = async (fcmTokens, title, body, data = {}) => {
    if (!fcmInitialized) {
        console.log("FCM not initialized. Skipping push notifications.");
        return { success: false, reason: "FCM not initialized" };
    }

    // Filter out null/undefined tokens
    const validTokens = fcmTokens.filter(token => token);

    if (validTokens.length === 0) {
        console.log("No valid FCM tokens provided. Skipping push notifications.");
        return { success: false, reason: "No valid FCM tokens" };
    }

    try {
        const message = {
            notification: {
                title,
                body,
            },
            data: {
                ...data,
                timestamp: new Date().toISOString(),
            },
            tokens: validTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`✅ Sent ${response.successCount} push notifications out of ${validTokens.length}`);

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Failed to send to token ${idx}:`, resp.error.message);
                }
            });
        }

        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount
        };
    } catch (error) {
        console.error("❌ Failed to send multicast push notifications:", error.message);
        return { success: false, error: error.message };
    }
};
