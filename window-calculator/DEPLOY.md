# Deployment Guide - Vercel (Free)

## One-Click Deploy to Vercel

### Option 1: GitHub (Recommended)

1. Create a GitHub repository and push this code
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **"New Project"**
4. Import your GitHub repository
5. Click **"Deploy"**
6. Done! Your app is live.

### Option 2: Direct Upload

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **"New Project"**
3. Click **"Upload"** at the bottom
4. Drag & drop the `window-calculator` folder
5. Click **"Deploy"**
6. Done! Your app is live.

---

## After Deployment

Your app will be available at a URL like:
`https://your-project-name.vercel.app`

Share this link with anyone - no installation needed!

---

## Notes

- **100% Free** on Vercel's hobby plan
- **No cold starts** - instant loading
- **Auto HTTPS** - secure by default
- **Database**: Uses in-memory SQLite, resets on redeploy
  - For persistent data, consider upgrading to a database service

---

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

