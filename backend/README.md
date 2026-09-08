# Sterling & Co — Backend

Express + MongoDB (Mongoose) API for the Sterling & Co platform. This connects
to the front-end prototype you already have (`index.html`, `browse.html`, etc.)
by replacing its hardcoded `script.js` data with real API calls.

## 1. Prerequisites
- Node.js 18+ installed
- A free MongoDB Atlas account: https://www.mongodb.com/cloud/atlas/register

## 2. Set up MongoDB Atlas
1. Create a free cluster (M0 tier).
2. Under **Database Access**, create a database user with a password.
3. Under **Network Access**, add your IP (or `0.0.0.0/0` for development).
4. Click **Connect > Drivers**, copy the connection string.

## 3. Install and configure
```bash
cd backend
npm install
cp .env.example .env
```
Open `.env` and paste your MongoDB connection string into `MONGO_URI`,
replacing `<username>`, `<password>`, and `<cluster-url>`. Set `JWT_SECRET`
to any long random string.

## 4. Seed sample data (optional but recommended)
```bash
npm run seed
```
This creates three sample professional accounts (password: `Password123!`)
matching the names used in the front-end prototype.

## 5. Run the server
```bash
npm run dev
```
The API will be available at `http://localhost:5000/api`. Visit
`http://localhost:5000/api/health` to confirm it's running.

## API overview

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create a client or professional account |
| POST | `/api/auth/login` | Log in, returns a JWT |
| POST | `/api/auth/forgot-password` | Request a password reset |
| POST | `/api/auth/reset-password/:token` | Set a new password |
| GET | `/api/professionals` | Search/filter professionals |
| GET | `/api/professionals/:id` | Single professional's public profile |
| PATCH | `/api/professionals/me` | Edit your own profile (professional only) |
| POST | `/api/professionals/me/portfolio` | Add a portfolio item |
| POST | `/api/projects` | Client submits a project request |
| GET | `/api/projects/mine` | Your projects (client or professional) |
| PATCH | `/api/projects/:id/status` | Update status / send a quote |
| POST | `/api/reviews` | Leave a review (completed projects only) |
| GET | `/api/reviews/professional/:id` | Reviews for a professional |
| GET | `/api/messages/threads` | Your conversations |
| POST | `/api/messages/threads/:id` | Send a message |
| GET | `/api/notifications` | Your notifications |

Every protected route expects `Authorization: Bearer <token>` from the
login/signup response.

## 6. Connect the front-end
In `script.js`, replace the hardcoded arrays (`PROFESSIONALS`, `PROJECTS`, etc.)
with `fetch()` calls to these endpoints. Start with the browse page:

```js
fetch('http://localhost:5000/api/professionals')
  .then(res => res.json())
  .then(list => renderCards('proGrid', list));
```

Do this one page at a time — browse first, then profile, then dashboard —
so you always have a working version to fall back on.

## 7. Deploying
- **API**: Render or Railway (free tiers) — set the same environment
  variables from `.env` in their dashboard.
- **Database**: already hosted on Atlas.
- **Front-end**: Netlify or Vercel, or GitHub Pages if you keep it static.

## Notes for your portfolio write-up
- Passwords are hashed with bcrypt — never stored in plain text.
- Contact info (`contactPhone`, `contactEmail`) is excluded from queries by
  default (`select: false`) until you add logic to reveal it after a project
  is accepted — this matches the "hidden until connected" requirement.
- Email verification and password reset currently log tokens to the console
  instead of sending real emails. Swap in a provider like SendGrid or AWS SES
  when you're ready.
