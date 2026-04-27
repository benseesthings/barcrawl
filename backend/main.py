import os
import math
from typing import List

import httpx
import polyline as polyline_codec
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Bar Crawl API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RouteRequest(BaseModel):
    origin: str
    destination: str


class BarsRequest(BaseModel):
    polyline: str


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in metres between two lat/lng points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def sample_polyline(encoded: str, interval: float = 200.0) -> List[tuple]:
    """Sample points along the encoded polyline every ~interval metres."""
    points = polyline_codec.decode(encoded)
    if not points:
        return []

    samples = [(points[0][0], points[0][1])]
    dist_to_next = interval

    for i in range(1, len(points)):
        p1 = points[i - 1]
        p2 = points[i]
        seg_len = haversine(p1[0], p1[1], p2[0], p2[1])
        if seg_len < 1e-6:
            continue

        walked = 0.0
        while walked + dist_to_next <= seg_len:
            walked += dist_to_next
            ratio = walked / seg_len
            lat = p1[0] + ratio * (p2[0] - p1[0])
            lng = p1[1] + ratio * (p2[1] - p1[1])
            samples.append((lat, lng))
            dist_to_next = interval

        dist_to_next -= seg_len - walked

    # Always include the destination
    last = points[-1]
    samples.append((last[0], last[1]))

    return samples


@app.post("/api/route")
@limiter.limit("50/hour")
async def get_route(request: Request, body: RouteRequest):
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/directions/json",
            params={
                "origin": body.origin,
                "destination": body.destination,
                "mode": "walking",
                "key": GOOGLE_API_KEY,
            },
            timeout=15.0,
        )

    data = resp.json()
    status = data.get("status")

    if status != "OK":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Directions API status: {status}. "
                f"{data.get('error_message', '')}"
            ),
        )

    route = data["routes"][0]
    leg = route["legs"][0]

    MAX_METERS = 8047  # 5 miles
    if leg["distance"]["value"] > MAX_METERS:
        raise HTTPException(
            status_code=400,
            detail=f"Route is too long ({leg['distance']['text']}). Please keep your crawl under 5 miles.",
        )

    return {
        "polyline": route["overview_polyline"]["points"],
        "distance": leg["distance"]["text"],
        "duration": leg["duration"]["text"],
    }


@app.post("/api/bars")
@limiter.limit("50/hour")
async def get_bars(request: Request, body: BarsRequest):
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")

    sample_points = sample_polyline(body.polyline, interval=200.0)
    seen_ids: set[str] = set()
    bars = []

    async with httpx.AsyncClient() as client:
        for lat, lng in sample_points:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
                params={
                    "location": f"{lat},{lng}",
                    "radius": 150,
                    "type": "bar",
                    "key": GOOGLE_API_KEY,
                },
                timeout=15.0,
            )
            data = resp.json()

            for place in data.get("results", []):
                pid = place["place_id"]
                if pid in seen_ids:
                    continue
                place_types = place.get("types", [])
                if "bar" not in place_types:
                    continue
                # Skip places where restaurant is listed before bar (primarily a restaurant)
                if "restaurant" in place_types and place_types.index("restaurant") < place_types.index("bar"):
                    continue
                seen_ids.add(pid)
                loc = place["geometry"]["location"]
                bars.append(
                    {
                        "place_id": pid,
                        "name": place["name"],
                        "rating": place.get("rating"),
                        "price_level": place.get("price_level"),
                        "vicinity": place.get("vicinity"),
                        "lat": loc["lat"],
                        "lng": loc["lng"],
                    }
                )

    return {"bars": bars}
