const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors'); // Agregamos CORS para evitar bloqueos del navegador
const app = express();

const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.static('public'));

// --- TRADUCTOR DE COORDENADAS (Fundamental para que OSRM entienda el clic) ---
function toLatLon(x, y) {
    // Si ya están en rango de lat/lon, no convertir
    if (Math.abs(x) <= 180) return { lon: x, lat: y };
    const lon = (x / 20037508.34) * 180;
    let lat = (y / 20037508.34) * 180;
    lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
    return { lon, lat };
}

// Endpoint que procesa el ruteo
app.get('/get-route', async (req, res) => {
    const { coords } = req.query;
    if (!coords) return res.status(400).json({ error: "Faltan coordenadas" });

    try {
        // 1. Convertir las coordenadas recibidas (que vienen del mapa en metros) a Lat/Lon
        const points = coords.split(';');
        const convertedCoords = points.map(p => {
            const [x, y] = p.split(',').map(Number);
            const converted = toLatLon(x, y);
            return `${converted.lon.toFixed(6)},${converted.lat.toFixed(6)}`;
        }).join(';');

        // 2. Consultar a OSRM con las coordenadas ya convertidas
        const url = `https://router.project-osrm.org/route/v1/driving/${convertedCoords}?overview=full&geometries=geojson`;
        const response = await axios.get(url);
        
        if (!response.data.routes || response.data.routes.length === 0) {
            return res.status(404).json({ error: "No se encontró ruta" });
        }

        const route = response.data.routes[0];

        // 3. Respuesta en formato Esri JSON (con los campos que ArcGIS exige)
        const esriResponse = {
            geometryType: "esriGeometryPolyline",
            spatialReference: { wkid: 4326 },
            features: [{
                attributes: { 
                    OBJECTID: 1,
                    Distancia_km: (route.distance / 1000).toFixed(2), 
                    Tiempo_min: (route.duration / 60).toFixed(1) 
                },
                geometry: { 
                    paths: [route.geometry.coordinates], 
                    spatialReference: { wkid: 4326 } 
                }
            }]
        };

        res.json(esriResponse);
    } catch (error) {
        console.error("Error en ruteo:", error.message);
        res.status(500).json({ error: "Error en el servidor de ruteo" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
});
