const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');

const app = express();
app.use(cors());

// --- CONFIGURATION ---
// Replace with your actual 32-character OpenWeatherMap Key
const API_KEY = '726142172cfd060a3781442e9a01c867'; 
const csvPath = path.join(__dirname, 'data', 'groundwater_history.csv');

// ML Logic: Linear Regression for 1-Year Forecast
function predictFuture(data) {
    if (data.length < 2) return "Stable";
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    data.forEach((val, i) => {
        sumX += i; sumY += val;
        sumXY += i * val; sumXX += i * i;
    });
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const nextVal = (sumY / n) + slope * (n - (sumX / n));
    return nextVal.toFixed(2);
}

// Route 1: Initial Grid Load
app.get('/api/all-stations', (req, res) => {
    const stations = [];
    const seen = new Set();
    if (!fs.existsSync(csvPath)) return res.status(500).json({ error: "CSV Missing" });

    fs.createReadStream(csvPath).pipe(csv()).on('data', (row) => {
        const name = row.station_name || row['station_name'];
        if (name && !seen.has(name)) {
            stations.push({ name: name.trim(), district: (row.district_name || "Regional").trim() });
            seen.add(name);
        }
    }).on('end', () => res.json(stations));
});

// Route 2: Analysis & Prediction
app.get('/api/search', async (req, res) => {
    const query = (req.query.place || "").toLowerCase().trim();
    let history = [];
    let matchRow = null;

    fs.createReadStream(csvPath).pipe(csv()).on('data', (row) => {
        if ((row.station_name || "").toLowerCase().trim() === query) {
            history.push(parseFloat(row.currentlevel || 5.0));
            matchRow = row;
        }
    }).on('end', async () => {
        if (!matchRow) return res.status(404).json({ error: "No data" });

        let hum = 45, tmp = 28;
        try {
            const weather = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${matchRow.district_name}&appid=${API_KEY}&units=metric`, { timeout: 2000 });
            hum = weather.data.main.humidity;
            tmp = weather.data.main.temp;
        } catch (e) { console.log("Weather Fallback"); }

        const lastKnown = history[history.length - 1];
        const liveEst = (lastKnown + (hum * 0.01) - (tmp * 0.08)).toFixed(2);
        const forecast = predictFuture(history);
        
        // WPI Algorithm
        let wpi = (parseFloat(liveEst) * 1.5) + (hum * 0.4) + ((40 - tmp) * 0.6);
        wpi = Math.min(Math.max(wpi, 0), 100).toFixed(1);

        res.json({
            station: matchRow.station_name.toUpperCase(),
            estimatedLevel: liveEst,
            forecastLevel: forecast,
            humidity: hum,
            temp: tmp,
            wpi: wpi,
            recommendation: wpi > 50 ? "✅ High Potential" : "⚠️ Low Potential"
        });
    });
});

app.listen(3000, () => console.log("Backend Live: http://localhost:3000"));