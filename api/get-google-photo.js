const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { query, lat, lng } = req.query;
    const apiKey = GOOGLE_API_KEY;

    try {
        let photoReference = '';

        // Phase 1: Search by name/query if provided
        if (query) {
            const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();
            
            if (searchData.results && searchData.results.length > 0 && searchData.results[0].photos) {
                photoReference = searchData.results[0].photos[0].photo_reference;
            }
        }

        // Phase 2: Search by coordinates if query failed or wasn't provided
        if (!photoReference && lat && lng) {
            const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&key=${apiKey}`;
            const nearbyRes = await fetch(nearbyUrl);
            const nearbyData = await nearbyRes.json();

            if (nearbyData.results && nearbyData.results.length > 0) {
                // Find first result with photos
                const placeWithPhoto = nearbyData.results.find(r => r.photos && r.photos.length > 0);
                if (placeWithPhoto) {
                    photoReference = placeWithPhoto.photos[0].photo_reference;
                }
            }
        }

        // Phase 3: Fetch the photo if reference found
        if (photoReference) {
            const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;
            const photoRes = await fetch(photoUrl);
            if (photoRes.ok) {
                const buffer = await photoRes.arrayBuffer();
                res.setHeader('Content-Type', photoRes.headers.get('content-type') || 'image/jpeg');
                return res.send(Buffer.from(buffer));
            }
        }

        // Phase 4: Fallback to Street View if no Places photo found
        if (lat && lng) {
            const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${lat},${lng}&key=${apiKey}`;
            const svRes = await fetch(streetViewUrl);
            if (svRes.ok) {
                const buffer = await svRes.arrayBuffer();
                res.setHeader('Content-Type', svRes.headers.get('content-type') || 'image/jpeg');
                return res.send(Buffer.from(buffer));
            }
        }

        return res.status(404).json({ error: "No photo or street view found for this location" });

    } catch (e) {
        console.error("Google Photo API Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
