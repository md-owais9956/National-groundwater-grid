const BASE_URL = 'http://localhost:3000'; 
let allStations = [];

window.onload = async () => {
    try {
        const res = await fetch(`${BASE_URL}/api/all-stations`);
        allStations = await res.json();
        renderGrid(allStations.slice(0, 50));
    } catch (err) { console.error("Is backend running?"); }
};

function renderGrid(data) {
    const list = document.getElementById('station-list');
    list.innerHTML = data.map(s => `
        <div class="station-card" onclick="analyzeStation('${s.name}')">
            <h3>${s.name}</h3><p>${s.district}</p>
        </div>
    `).join('');
}

async function analyzeStation(name) {
    const loader = document.getElementById('loader-overlay');
    const output = document.getElementById('prediction-output');
    loader.classList.remove('hidden');
    output.classList.add('hidden');

    try {
        const res = await fetch(`${BASE_URL}/api/search?place=${encodeURIComponent(name)}`);
        const data = await res.json();

        document.getElementById('res-location').innerText = data.station;
        document.getElementById('res-level').innerText = data.estimatedLevel + "m";
        document.getElementById('res-forecast').innerText = data.forecastLevel + "m";
        document.getElementById('res-wpi').innerText = data.wpi + "%";
        document.getElementById('res-hum').innerText = data.humidity + "%";
        document.getElementById('res-temp').innerText = data.temp + "°C";
        document.getElementById('res-suggest').innerText = data.recommendation;

        output.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { console.error("Error"); }
    finally { loader.classList.add('hidden'); }
}

document.getElementById('search-bar').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allStations.filter(s => s.name.toLowerCase().includes(term));
    renderGrid(filtered.slice(0, 50));
});