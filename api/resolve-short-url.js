export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const finalUrl = response.url;
        const html = await response.text();

        // 1. Try extracting exact pin coordinates from the final URL
        let pinMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        let latitude = null;
        let longitude = null;

        if (pinMatch) {
            latitude = parseFloat(pinMatch[1]);
            longitude = parseFloat(pinMatch[2]);
        } else {
            // 2. Try view center coordinates in final URL
            const matchAt = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (matchAt) {
                latitude = parseFloat(matchAt[1]);
                longitude = parseFloat(matchAt[2]);
            } else {
                // 3. Try parsing coordinates from HTML
                const htmlMatch = html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
                                  html.match(/ll=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/) ||
                                  html.match(/@(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/) ||
                                  html.match(/center=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/) ||
                                  html.match(/markers=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/);
                if (htmlMatch) {
                    latitude = parseFloat(htmlMatch[1]);
                    longitude = parseFloat(htmlMatch[2]);
                }
            }
        }

        let placeName = null;
        const placeMatch = finalUrl.match(/\/place\/([^/]+)/);
        if (placeMatch) {
            try {
                placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
                // Remove plus codes like "FF8J+J8G " to improve search
                placeName = placeName.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3}\s*/, '');
            } catch (e) { }
        }

        // Sanity check to avoid returning Null Island or US default coordinates (Vercel is in US)
        // Saudi Arabia/Middle East is roughly Lat: 15 to 35, Lng: 34 to 60.
        // If it's outside this bounding box, it's likely a bot fallback to Washington DC.
        let isValidLocation = false;
        if (latitude !== null && longitude !== null && !isNaN(latitude) && !isNaN(longitude)) {
            if (latitude !== 0 && longitude !== 0) {
                // Check if it's in the Middle East bounding box
                if (latitude > 10 && latitude < 40 && longitude > 30 && longitude < 65) {
                    isValidLocation = true;
                }
            }
        }

        if (isValidLocation) {
            return res.status(200).json({ latitude, longitude, finalUrl, placeName });
        } else {
            return res.status(422).json({ error: 'Could not extract valid local coordinates', finalUrl, placeName });
        }
    } catch (error) {
        console.error('Error resolving short URL:', error);
        return res.status(500).json({ error: error.message });
    }
}
