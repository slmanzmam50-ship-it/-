export default async function handler(req, res) {
    // Enable CORS for development
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
        return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
        const decodedUrl = decodeURIComponent(url);
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `Failed to fetch target URL. Status: ${response.status}` });
        }

        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.startsWith('image/')) {
            const buffer = await response.arrayBuffer();
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(Buffer.from(buffer));
        }

        const text = await response.text();
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(text);
    } catch (e) {
        console.error("Proxy error:", e);
        return res.status(500).json({ error: e.message });
    }
}
