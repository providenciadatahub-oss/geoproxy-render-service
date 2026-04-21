// Este endpoint hace que Render hable "Dialept Esri"
app.get('/solve', async (req, res) => {
    const { stops, f } = req.query; // ArcGIS envía los puntos en 'stops' y pide formato en 'f'
    
    if (!stops) return res.status(400).json({ error: "Faltan stops" });

    try {
        // 1. Convertir los stops de ArcGIS a formato OSRM
        // ArcGIS envía stops como JSON: {"features": [{"geometry": {"x": lon, "y": lat}}, ...]}
        const stopsData = JSON.parse(stops);
        const p1 = stopsData.features[0].geometry;
        const p2 = stopsData.features[1].geometry;
        const coordsString = `${p1.x},${p1.y};${p2.x},${p2.y}`;

        // 2. Llamar a OSRM (lo que ya hacíamos)
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
        const response = await axios.get(url);
        const route = response.data.routes[0];

        // 3. Responder con el formato EXACTO que espera el motor de ArcGIS
        const esriStandardResponse = {
            routes: {
                features: [{
                    attributes: { 
                        Name: "Ruta Providencia",
                        Total_Kilometers: route.distance / 1000,
                        Total_Minutes: route.duration / 60
                    },
                    geometry: { 
                        paths: [route.geometry.coordinates],
                        spatialReference: { wkid: 4326 }
                    }
                }]
            }
        };

        res.json(esriStandardResponse);
    } catch (error) {
        res.status(500).json({ error: "Error en el puente Esri-OSRM" });
    }
});
