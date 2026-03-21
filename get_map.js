const fs = require('fs');
const https = require('https');

// A highly detailed GeoJSON of Saudi Arabia from a public repository
const url = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries/SAU.geo.json';

https.get(url, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const geojson = JSON.parse(rawData);
            // Quick projection to convert lat/lng to a 100x100 viewBox
            // KSA bounds roughly: minLng 34.5, maxLng 55.7, minLat 16.3, maxLat 32.2
            const bounds = {
                minLng: 34.5, maxLng: 55.7,
                minLat: 16.3, maxLat: 32.2
            };
            
            const coords = geojson.features[0].geometry.coordinates[0];
            let path = "";
            let first = true;
            
            coords.forEach(([lng, lat]) => {
                // simple equirectangular projection scaled to 100x100
                // For exact aspect ratio, KSA is wider slightly than taller, but 100x100 viewBox with preserveAspectRatio meets fills bounds nicely.
                const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
                // Latitude needs reversing (larger lat = higher up geographically = smaller Y on screen)
                const y = 100 - (((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100);
                
                if (first) {
                    path += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
                    first = false;
                } else {
                    path += `L ${x.toFixed(2)} ${y.toFixed(2)} `;
                }
            });
            path += "Z";
            
            fs.writeFileSync('saudi_path.txt', path);
            console.log("Successfully extracted exact KSA path!");
        } catch (e) {
            console.error("Error:", e.message);
        }
    });
}).on('error', (e) => {
    console.error("Fetch error:", e.message);
});
