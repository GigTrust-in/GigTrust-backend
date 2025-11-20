# GigTrust Backend Documentation

## Overview
This API powers the GigTrust application, handling user management, job posting and assignment, reviews, and transactions.

## Base URL
`/api/v1`

## Authentication
All endpoints except `/auth/*` require a Bearer Token in the Authorization header.

### Auth Endpoints
- **POST /auth/signup**: Register a new user.
  - Body: `name`, `email`, `password`, `role` ('requester' or 'provider'), `location`.
- **POST /auth/login**: Log in an existing user.
  - Body: `email`, `password`.
  - Returns: `token` (JWT).

## Resources

### Users
- **GET /users/me**: Get current user profile.
- **PATCH /users/updateMe**: Update profile.
  - Body: `name`, `location`, `skills` (array), `hourlyRate`, `bio`, `phoneNumber`, `available` (boolean).
- **PATCH /users/fcm-token**: Register/update FCM token for push notifications.
  - Body: `fcmToken` (string)
- **GET /users/:id**: Get public profile of a user.
- **GET /users/:userId/reviews**: Get reviews for a user.

### Jobs
- **POST /jobs**: Create a job (Requester only).
- **GET /jobs/available**: Get available jobs (Provider only).
- **GET /jobs/my-jobs**: Get jobs for current user.
- **PATCH /jobs/:id/assign**: Assign a worker (Requester only).
  - Body: `workerId`
- **PATCH /jobs/:id/accept**: Accept a job (Provider only).
- **PATCH /jobs/:id/reject**: Reject a job (Provider only).
- **PATCH /jobs/:id/complete**: Mark job as complete (Provider only).
- **PATCH /jobs/:id/approve**: Approve job and release payment (Requester only).
- **PATCH /jobs/:id/request-revision**: Request revision (Requester only).
  - Body: `feedback`
- **PATCH /jobs/:id/cancel**: Cancel job (Requester only).
- **PATCH /jobs/:id/unassign**: Unassign self (Provider only).
- **PATCH /jobs/:id/fund-escrow**: Fund job (Requester only).

### Reviews
- **POST /reviews**: Submit a review.
  - Body: `rating` (1-5), `review` (text), `job` (jobId), `targetUser` (userId).
- **GET /reviews**: Get all reviews (can filter by `?targetUser=ID`).

### Transactions
- **GET /transactions/my-transactions**: Get transaction history.
- **POST /transactions/withdraw**: Withdraw funds.
  - Body: `amount`

### Notifications
- **GET /notifications**: Get notifications.
- **PATCH /notifications/:id/read**: Mark notification as read.
