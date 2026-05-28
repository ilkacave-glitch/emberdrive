# Mileage

A simple, warm mileage logger for your work vehicle. Built for iPhone, works offline, looks like a real app on your home screen.

## What it does

- Quickly log trips with date, purpose, from/to, and odometer readings
- Tap any number field and use the iPhone keyboard mic to speak the kilometres
- Saves trips to your phone (no internet needed after first load)
- Shows your monthly total at a glance
- Export any month as a CSV spreadsheet (sorted by date, ready for Vikram)
- Or email a formatted log straight from the app

## Files in this project

```
index.html      Main app structure
styles.css      The warm, earthy design
app.js          All the logic
manifest.json   So iPhone treats it like an app
sw.js           Service worker for offline use
icon-192.png    App icon (small)
icon-512.png    App icon (large)
```

## Getting it on your iPhone (step by step)

### Step 1: Upload to GitHub

1. Go to github.com and sign in
2. Click the **+** in the top right, then **New repository**
3. Name it something like `mileage` (lowercase, no spaces)
4. Make sure it's **Public** (required for free hosting)
5. Tick **Add a README file**
6. Click **Create repository**

### Step 2: Upload these files

1. On your new repo page, click **Add file** then **Upload files**
2. Drag in ALL the files from this folder (index.html, styles.css, app.js, manifest.json, sw.js, icon-192.png, icon-512.png)
3. Scroll down and click **Commit changes**

### Step 3: Turn on GitHub Pages

1. Click the **Settings** tab at the top of your repo
2. In the left sidebar, click **Pages**
3. Under "Source", pick **Deploy from a branch**
4. Pick branch **main** and folder **/ (root)**, then click **Save**
5. Wait about a minute. GitHub will show a green box with your link, something like:
   `https://yourusername.github.io/mileage/`

### Step 4: Add to your iPhone home screen

1. Open Safari on your iPhone (must be Safari, not Chrome)
2. Go to the link from Step 3
3. Tap the **Share button** at the bottom (square with arrow up)
4. Scroll down and tap **Add to Home Screen**
5. Tap **Add**

You're done! The Mileage icon now lives on your home screen and opens like a real app.

## How to use it day to day

**The two-step trip flow** — This is the bit that makes it lovely to use:

1. Climb into the car. Open Mileage on your phone.
2. Pick the purpose, from, and to from the drop-downs.
3. Tap the start odometer field, tap the **mic** on your iPhone keyboard, say the number (e.g. "forty-seven thousand two hundred and thirty-three").
4. Tap **Start trip**. The app locks in your start reading. You'll see a green "Trip in progress" banner showing where you're heading and what time you set off.
5. Drive. Lock your phone. Forget about the app.
6. Arrive at your destination. Open Mileage again — it remembers your trip is still in progress.
7. Speak the end odometer reading the same way. Tap **Finish trip**. Done.

If you accidentally start a trip or change your plans, tap **Cancel this trip** to throw it away.

**Looking back** — Tap the **Trips** tab to see everything you've logged. Newest first. Tap the × on any trip to delete it.

**Sending the log to Vikram** — Tap the **Export** tab, pick the month, then either download the spreadsheet (opens in Numbers or Excel) or tap "Email to Vikram" which opens your mail app with everything filled in.

## Important to know

Your trips are saved on your phone only. If you delete the app, lose your phone, or clear Safari data, the trips go too. If you'd like backup added later (Dropbox, iCloud, etc.) we can add it as a next step.

## Want to change something?

Edit the files on GitHub directly (click any file, then the pencil icon to edit) and GitHub Pages will redeploy within a minute. Tell me what you'd like and I'll guide you through it.
