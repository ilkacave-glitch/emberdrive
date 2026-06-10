# Mileage

A simple, warm mileage logger for your work vehicle. Built for iPhone, works offline, looks like a real app on your home screen.

## What it does

- Quick two-step logging: Start trip when you climb in, Finish trip when you arrive
- Use the iPhone keyboard mic to speak the odometer reading
- Pre-fills the start odometer from your last trip (with override + reason prompt if the reading has changed)
- Round trip checkbox so you don't have to log Helensville-and-back as two separate trips
- "Add a stop" for multi-leg work days (visit a client mid-journey without losing the trip)
- Pick "Other" for any drop-down and type/speak a custom value; the app remembers it for next time
- Manage your saved custom destinations in the Export tab
- Monthly total at a glance, plus CSV download or email to Vikram

## How to use it day to day

**The simple trip (most days):**

1. Climb in. Open Mileage.
2. The start odometer is pre-filled from your last trip. If it matches the car, just tap **Start trip**.
3. If it doesn't match, change it and pick a reason from the prompt (someone else drove, personal use, etc.).
4. Drive. Lock your phone. Forget about the app.
5. Arrive. Open Mileage. Speak the end odometer. Tap **Finish trip**.

**Round trips (Glenfield → Helensville → Glenfield):**

Tick the **"Returning here at the end"** box before tapping Start trip. When you get home, you only log the final odometer. The app records the total kilometres for the whole round trip.

**Multi-stop work days:**

Start a normal trip. When you arrive at your first stop, tap **Add a stop instead** of Finish trip. Enter the reading and your next destination. Repeat for each stop. When you're finally home, tap **Finish trip** to close it all out.

**Custom destinations:**

Pick "Other" from any drop-down and a text field appears. Type or speak the place (e.g. "Bald Hetherington's office"). It saves for next time and shows up in the drop-down. To remove a saved custom, go to Export tab and tap the × next to it.

## Files in this project

```
index.html      App structure
styles.css      Warm, earthy design
app.js          All the logic
manifest.json   So iPhone treats it like an app
sw.js           Service worker for offline use
icon-192.png    App icon (small)
icon-512.png    App icon (large)
```

## Important to know

Your trips save on your phone only. If you delete the app, lose your phone, or clear Safari data, the trips go too.

## Updating the app

Edit files on GitHub directly (click the file, then the pencil icon). GitHub Pages will redeploy within a minute. After updates, you may need to remove the icon from your iPhone home screen and re-add it, so it picks up the new version.
