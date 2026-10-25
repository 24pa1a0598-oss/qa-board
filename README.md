# Q&A Board

A simple discussion forum where people can ask questions, post answers, vote, and mark the best answer as accepted.

**Live demo:** _add your deployed link here after step 2 below_

## Features

- Ask questions with a title, details, author name and tags
- Post answers to any question
- Upvote / downvote questions and answers
- Accept one answer per question (shown first, question marked "solved")
- Search by keyword, filter by tag, sort by newest or most votes
- Data persists in a local `data.json` file (created automatically)

## Tech stack

- **Backend:** Node.js + Express (REST API)
- **Frontend:** plain HTML, CSS and JavaScript (no build step)
- **Storage:** JSON file

## Run it locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/<your-username>/qa-board.git
cd qa-board
npm install
npm start
```

Then open <http://localhost:3000>.

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/questions?q=&tag=&sort=new\|votes` | List / search questions |
| POST | `/api/questions` | Create a question |
| GET | `/api/questions/:id` | Question with its answers |
| POST | `/api/questions/:id/answers` | Post an answer |
| POST | `/api/questions/:id/vote` | Vote on a question (`{ "delta": 1 \| -1 }`) |
| POST | `/api/questions/:id/answers/:aid/vote` | Vote on an answer |
| POST | `/api/questions/:id/answers/:aid/accept` | Accept / unaccept an answer |
| GET | `/health` | Health check |

## Deploy (free, on Render)

1. Push this repo to GitHub (see below).
2. Go to <https://render.com>, sign in with GitHub and choose **New → Web Service**.
3. Select the `qa-board` repository. Render reads `render.yaml`; otherwise use:
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: **Free**
4. Click **Create Web Service**. After the build finishes, open the `https://<name>.onrender.com` link.

> Note: free instances sleep after inactivity (first load can take ~30–60 s) and their disk is
> not permanent, so questions may reset on redeploy/restart. That is fine for a demo; for real
> persistence swap the JSON file for a hosted database.

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Q&A board"
git branch -M main
git remote add origin https://github.com/<your-username>/qa-board.git
git push -u origin main
```

Create the empty **public** repository `qa-board` on GitHub first (no README/license, since this repo already has them).

## Project structure

```
qa-board/
├── server.js        # Express server + API
├── public/          # Frontend (index.html, style.css, app.js)
├── render.yaml      # Render deploy config
├── package.json
└── README.md
```

## License

MIT
