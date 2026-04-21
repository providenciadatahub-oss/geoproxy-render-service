const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Servimos los archivos de la carpeta public (el mapa)
app.use(express.static('public'));

// Endpoint que procesa el ruteo
app.get('/get-route', async (req, res) => {
    const { coords } = req.query;
    if (!coords) return res.status(400).json({ error: "Faltan coordenadas" });

    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
        const response = await axios.get(url);
        
        if (!response.data.routes || response.data.routes.length === 0) {
            return res.status(404).json({ error: "No se encontró ruta" });
        }

        const route = response.data.routes[0];

        // Respuesta en formato Esri JSON para que el mapa la entienda
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
        res.status(500).json({ error: "Error en el servidor de ruteo" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor activo en el puerto ${PORT}`);
});
