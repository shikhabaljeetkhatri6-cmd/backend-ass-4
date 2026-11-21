# Lab 4 – Secure Connect and Communication Platform

A complete Node.js + Express backend for the Web Dev III Lab 4 assignment.

## Features
- Signup with bcrypt password hashing
- Login with JWT token generation
- JWT-protected `/api/auth/me` and Notes API
- Notes CRUD; users can access only their own notes
- Role-based access control: `/api/admin/users` is admin-only
- Authenticated Socket.IO real-time chat, organized into rooms
- Node.js EventEmitter events for registration, note creation, and chat messages
- Environment variables managed with dotenv
- MongoDB persistence

## 1. Requirements
- Node.js 18 or newer
- MongoDB running locally, or a MongoDB connection string

## 2. Install and run
Open a terminal in this project folder:

```bash
npm install
```

Copy `.env.example` to `.env` and set a strong `JWT_SECRET`.
On macOS/Linux:

```bash
cp .env.example .env
```

On Windows Command Prompt:

```cmd
copy .env.example .env
```

Make sure MongoDB is running, then start:

```bash
npm start
```

Server: `http://localhost:5000`

Health check: `GET http://localhost:5000/api/health`

## 3. Test with Postman

Set request body type to **raw → JSON**.

### A. Signup
`POST http://localhost:5000/api/auth/signup`

```json
{
  "username": "Victor",
  "email": "victor@example.com",
  "password": "123456"
}
```

Expected: `201 Created`

```json
{
  "message": "User registered",
  "id": "MongoDB-generated-id",
  "username": "Victor",
  "email": "victor@example.com"
}
```

The password is stored as a bcrypt hash and is never returned.

### B. Login
`POST http://localhost:5000/api/auth/login`

```json
{
  "email": "victor@example.com",
  "password": "123456"
}
```

Expected: `200 OK`, with a JWT token in the response. Copy the token.

### C. Check protected route without token
`GET http://localhost:5000/api/notes`

Expected: `401 Unauthorized`

```json
{ "message": "No token provided" }
```

### D. Add token and create a note
For protected requests, open **Authorization → Bearer Token** in Postman and paste the login token.

`POST http://localhost:5000/api/notes`

```json
{
  "title": "My First Note",
  "content": "This is my first note of Web Dev III."
}
```

Expected: `201 Created`, with the saved note.

### E. Get all your notes
`GET http://localhost:5000/api/notes`

Expected: `200 OK`. Only the logged-in user's notes are returned.

### F. Update a note
`PUT http://localhost:5000/api/notes/NOTE_ID`

```json
{
  "title": "Updated Note",
  "content": "Updated note content."
}
```

Replace `NOTE_ID` with the `_id` returned when the note was created.

### G. Delete a note
`DELETE http://localhost:5000/api/notes/NOTE_ID`

Expected: `200 OK`

```json
{ "message": "Note deleted successfully" }
```

### H. Current user
`GET http://localhost:5000/api/auth/me`

Use the Bearer token. Expected: `200 OK` with the logged-in user's profile (no password).

### I. Admin-only route (RBAC)
`GET http://localhost:5000/api/admin/users`

A normal signup creates a `user` role, so this route returns `403` for that account. To test the admin route, change that user's `role` field to `admin` in the MongoDB `users` collection, then log in again to obtain a JWT containing the updated role. Use that new token. Expected: `200 OK`.

## 4. Real-time chat test
1. Sign up and log in to obtain a JWT.
2. Open `http://localhost:5000` in two browser tabs.
3. Paste a valid JWT into each tab and click **Connect**.
4. Keep both tabs in the `general` room.
5. Send a message in either tab. It appears in both tabs and is logged in the terminal.

Socket.IO authenticates the connection using the JWT. A client without a valid token cannot connect.

## 5. Event-driven output
The server terminal logs events similar to:

```text
[EVENT] New user registered: victor@example.com
[EVENT] Note 674... created by user 674...
[EVENT] [general] victor: Hello team
```

## API summary

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Valid JWT |
| GET | `/api/notes` | Valid JWT |
| POST | `/api/notes` | Valid JWT |
| PUT | `/api/notes/:id` | Valid JWT; owner only |
| DELETE | `/api/notes/:id` | Valid JWT; owner only |
| GET | `/api/admin/users` | Admin JWT only |

## Security notes
- Never commit `.env` or share your JWT secret.
- Passwords are hashed with bcrypt.
- JWTs have an expiry.
- Notes are filtered by the authenticated user's ID.
- Socket.IO connections require a valid JWT.
- This is a lab implementation; production systems should also add rate limiting, stricter input validation, HTTPS, and token revocation/refresh strategy.
