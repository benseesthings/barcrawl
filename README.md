# Bar Crawl

Plan a walking bar crawl between any two points. Enter a start and end address, get a walking route, then discover every bar within 150 m of the path — ordered by your walking direction.

Play with it at https://bens-barcrawl.onrender.com/ or set it up on your machine using below. 

## Architecture

```
frontend/   React + Vite + Tailwind  →  runs on http://localhost:5173
backend/    Python FastAPI            →  runs on http://localhost:8000
```

The frontend renders a Google Map (Maps JavaScript API). The backend calls the Google Directions API and Google Places API server-side. 

---

## Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.11
- A **Google Cloud** project with billing enabled

---

## Google Cloud Setup

1. Open [Google Cloud Console → APIs & Services → Library](https://console.cloud.google.com/apis/library).
2. Enable the following APIs:
   - **Maps JavaScript API** — used by the frontend to render the map
   - **Directions API** — used by the backend to compute walking routes
   - **Places API** — used by the backend to search for nearby bars
3. Create **two API keys** (or one shared key if you accept wider permissions):
   - **Backend key**: restrict to *Directions API* + *Places API*; add an IP restriction if deployed.
   - **Frontend key**: restrict to *Maps JavaScript API*; add an HTTP referrer restriction (`localhost:5173/*` for development).

---

## Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure your API key
cp .env.example .env
# Edit .env and set GOOGLE_API_KEY=<your backend key>

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

---

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure your Maps API key
cp .env.example .env
# Edit .env and set VITE_GOOGLE_MAPS_API_KEY=<your frontend key>

# Start the dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Usage

1. Type a **starting address** and a **destination** in the left sidebar.
2. Click **Plan Route** — the walking route appears on the map.
3. Click **Find Bars Along Route** — bar markers appear numbered in walking order.
4. Click any marker or sidebar entry to see name, rating, price, and address.

---
