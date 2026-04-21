const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// 1. ENDPOINT DE METADATOS (Vital para que ArcGIS acepte el servicio)
// Cuando ArcGIS lee la URL, pregunta por los detalles del servicio.
app.get('/solve/rest/info', (req, res) => {
    res.json({
        currentVersion: 10.91,
        serviceDescription: "Servidor de Ruteo OSRM para Providencia",
        capabilities: "Route"
    });
});

// 2. ENDPOINT DE RESOLUCIÓN (Donde la herramienta Direcciones envía los clics)
app.get('/solve', async (req, res) => {
    const { stops, f = 'json' } = req.query;

    if (!stops) return res.status(400).json({ error: "No se proporcionaron paradas (stops)" });

    try {
        // ArcGIS envía 'stops' como un JSON de Features. Extraemos las coordenadas.
        const stopsData = typeof stops === 'string' ? JSON.parse(stops) : stops;
        
        // Convertimos el formato de ArcGIS a formato OSRM (lon,lat;lon,lat)
        const coords = stopsData.features.map(f => {
            return `${f.geometry.x.toFixed(6)},${f.geometry.y.toFixed(6)}`;
        }).join(';');

        // Llamada al motor OSRM
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
        const response = await axios.get(url);
        const route = response.data.routes[0];

        // 3. RESPUESTA EN FORMATO NAS (Network Analysis Service)
        // Esto es lo que la herramienta "Direcciones" espera leer
        const nasResponse = {
            routes: {
                features: [{
                    attributes: {
                        Name: "Ruta Generada",
                        Total_Kilometers: route.distance / 1000,
                        Total_Minutes: route.duration / 60
                    },
                    geometry: {
                        paths: [route.geometry.coordinates],
                        spatialReference: { wkid: 4326 }
                    }
                }]
            },
            messages: []
        };

        res.json(nasResponse);
    } catch (error) {
        console.error("Error procesando ruteo:", error.message);
        res.status(500).json({ error: "Error en el cálculo de red" });
    }
});

app.listen(PORT, () => {
    console.log(`Servicio de Red activo en puerto ${PORT}`);
});
