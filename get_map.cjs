const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries/SAU.geo.json';

https.get(url, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const geojson = JSON.parse(rawData);
            
            // SAU coordinates typically start at index 0 for the main landmass
            const polygon = geojson.features[0].geometry.coordinates[0];
            
            // Find bounds
            let minLng = 1000, maxLng = -1000, minLat = 1000, maxLat = -1000;
            polygon.forEach(([lng, lat]) => {
                if(lng < minLng) minLng = lng;
                if(lng > maxLng) maxLng = lng;
                if(lat < minLat) minLat = lat;
                if(lat > maxLat) maxLat = lat;
            });

            // We want to scale this to 0-100 for our viewBox
            let path = "";
            let first = true;
            
            polygon.forEach(([lng, lat]) => {
                // scale x
                const x = ((lng - minLng) / (maxLng - minLng)) * 100;
                // scale y (invert lat)
                const y = 100 - (((lat - minLat) / (maxLat - minLat)) * 100);
                
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
            
            // Also map the cities
            const cities = [
                { id: 'riyadh', lng: 46.7219, lat: 24.7136, name: 'الرياض', isHQ: true },
                { id: 'jeddah', lng: 39.1925, lat: 21.4858, name: 'جدة' },
                { id: 'dammam', lng: 50.1065, lat: 26.3927, name: 'الدمام' },
                { id: 'mecca', lng: 39.8148, lat: 21.3891, name: 'مكة المكرمة' },
                { id: 'medina', lng: 39.6122, lat: 24.4686, name: 'المدينة المنورة' },
                { id: 'tabuk', lng: 36.5662, lat: 28.3835, name: 'تبوك' },
                { id: 'jizan', lng: 42.5511, lat: 16.8894, name: 'جازان' },
                { id: 'abha', lng: 42.5053, lat: 18.2164, name: 'أبها' },
                { id: 'hail', lng: 41.6907, lat: 27.5219, name: 'حائل' },
                { id: 'buraydah', lng: 43.9750, lat: 26.3260, name: 'بريدة' },
                { id: 'najran', lng: 44.1277, lat: 17.4933, name: 'نجران' },
                { id: 'jubail', lng: 49.6605, lat: 27.0094, name: 'الجبيل' },
                { id: 'taif', lng: 40.4062, lat: 21.2703, name: 'الطائف' },
                { id: 'yanbu', lng: 38.0772, lat: 24.0903, name: 'ينبع' },
                { id: 'ahsa', lng: 49.5653, lat: 25.3800, name: 'الأحساء' },
                { id: 'khafji', lng: 48.4902, lat: 28.4326, name: 'الخفجي' },
                { id: 'arar', lng: 41.0189, lat: 30.9753, name: 'عرعر' }
            ];

            let citiesCode = "const cities = [\n";
            cities.forEach(c => {
                const x = ((c.lng - minLng) / (maxLng - minLng)) * 100;
                const y = 100 - (((c.lat - minLat) / (maxLat - minLat)) * 100);
                citiesCode += `    { id: '${c.id}', x: ${x.toFixed(2)}, y: ${y.toFixed(2)}, name: '${c.name}'${c.isHQ ? ', isHQ: true' : ''} },\n`;
            });
            citiesCode += "];";
            fs.writeFileSync('saudi_cities.txt', citiesCode);
            console.log("Cities mapped!");
            
        } catch (e) {
            console.error("Error:", e.message);
        }
    });
});
