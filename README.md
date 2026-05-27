# CarrierNet — Ligentia Carrier Prospecting Tool

Search 600,000+ FMCSA-registered US motor carriers by state and city.

---

## Requirements

- **Node.js** (free download): https://nodejs.org  
  Download the "LTS" version and install it. That's the only requirement.

---

## Setup (one time only)

1. Unzip this folder somewhere on your computer (e.g. Desktop)
2. Open a terminal / command prompt inside the `carriernet` folder
3. Run:
   ```
   npm install
   ```
   This installs the 3 small packages the server needs (takes ~10 seconds).

---

## Starting the app (every time)

**Windows:** Double-click `START.bat`

**Mac / Linux:** 
```bash
./start.sh
```

Or from any terminal:
```bash
node server.js
```

Then open your browser and go to:
```
http://localhost:3000
```

---

## How to search

1. Select a **state** from the dropdown (required)
2. Optionally type a **city** to narrow results (e.g. "Houston", "Chicago")
3. Optionally type a **carrier name keyword** (e.g. "eagle", "express") for a specific search
4. Click **Search Carriers**

The tool automatically queries FMCSA across 30 common carrier name keywords and filters all results to only show carriers registered in the state/city you selected.

---

## Features

- Live FMCSA data — same database as SAFER (safer.fmcsa.dot.gov)
- Filter by state, city, authority status, carrier name keyword
- Quick Region presets in the sidebar (IL, GA, TX, NY, CA, FL, OH)
- Each DOT# links directly to the carrier's FMCSA SAFER profile
- **Outreach List** — save carriers, add notes, export to CSV
- Export all search results to CSV

---

## API Key

Your FMCSA API key is stored in `server.js` (line 4).  
Free key registration: https://mobile.fmcsa.dot.gov/developer/home.page

---

## Stopping the app

Press `Ctrl + C` in the terminal window.
