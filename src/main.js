import './sketch.js'; // Importem el fitxer de dibuix p5.js
// Importació de Plugins de Capacitor
import { Haptics } from '@capacitor/haptics';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Torch } from '@capawesome/capacitor-torch';

// --- ESTAT GLOBAL ---
// Guardem els intervals per poder-los cancel·lar (clearInterval) quan l'usuari atura l'alarma.
let flashInterval = null;
let vibrateInterval = null;
let isFlashOn = false;

// --- INICIALITZACIÓ ---
document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash-screen');
  const app = document.getElementById('app-container');

  // 1. Demanem permís per enviar notificacions al moment d'obrir l'app
  LocalNotifications.requestPermissions();

  // 2. Carreguem configuracions guardades (Persistència de dades)
  const useGPS = localStorage.getItem('dropapp_gps_auto') === 'true';
  document.getElementById('chk-gps-auto').checked = useGPS;
  
  // 3. Iniciem la lògica de clima (GPS -> API -> UI)
  updateWeatherFromStorage();

  // 4. Simulem un temps de càrrega per l'Splash Screen (1.5s)
  setTimeout(() => {
    if (splash) splash.style.display = 'none'; // Amagar logo
    if (app) app.style.display = 'block';      // Mostrar App
  }, 1500);

  // 5. Activem els listeners dels botons de configuració
  setupConfigLogic();
});

// ===============================================================
// PONT DE COMUNICACIÓ: P5.JS <-> CAPACITOR
// Exposem funcions a l'objecte 'window' perquè sketch.js les pugui cridar
// ===============================================================

// 1. CONTROL DE LA LLANTERNA
// Modes: 'steady' (fixa), 'strobe' (parpelleig), 'off' (apagada)
window.setFlashMode = async (mode) => {
  // Si l'usuari ha desactivat la llanterna a la config, sortim
  if (!document.getElementById('chk-flash').checked) return;

  try {
    // Sempre netegem intervals anteriors per evitar solapaments
    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }

    if (mode === 'off') {
      await Torch.disable();
      isFlashOn = false;
    } 
    else if (mode === 'steady') {
      await Torch.enable(); // Llum fixa (fase d'avís)
      isFlashOn = true;
    } 
    else if (mode === 'strobe') {
      // Creem un bucle que encén i apaga cada 200ms (fase urgent)
      flashInterval = setInterval(async () => {
        isFlashOn = !isFlashOn;
        try {
          if (isFlashOn) await Torch.enable();
          else await Torch.disable();
        } catch (e) {} // Ignorem errors menors de hardware
      }, 200); 
    }
  } catch (e) { console.error("Error Hardware Flash:", e); }
};

// 2. ALARMA FINAL (Vibració + Notificació)
window.triggerFinalAlarm = async () => {
  console.log("🚨 ALARMA FINAL: Vibració + Notificació");

  // A. Notificació Local (apareix a la barra d'estat)
  if (document.getElementById('chk-notificacio').checked) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: "💧 HORA DE LA GOTA!",
          body: "Toca aquí o entra a l'app per confirmar.",
          id: 1, // ID fix per poder cancel·lar-la després
          schedule: { at: new Date(Date.now() + 100) }, // Immediat
          smallIcon: 'ic_stat_drop', // Icona personalitzada a Android/res/drawable
          actionTypeId: "",
          extra: null
        }]
      });
    } catch (e) { console.error("Error Notif schedule:", e); }
  }

  // B. Patró de Vibració (Bucle infinit fins que l'usuari cliqui)
  if (vibrateInterval) clearInterval(vibrateInterval);
  
  // Vibració inicial
  try { await Haptics.vibrate({ duration: 1000 }); } catch (e) {}
  
  // Repetim vibració cada 1.2 segons
  vibrateInterval = setInterval(async () => {
    try { await Haptics.vibrate({ duration: 1000 }); } catch (e) {}
  }, 1200);
};

// 3. RESET TOTAL (Aturar tot el hardware)
// Es crida quan l'usuari prem "Gota posada" o "Iniciar"
window.stopAndResetHardware = async () => {
  console.log("✅ RESET TOTAL (Stop Hardware)");

  // Aturem tots els bucles de temps (Javascript)
  if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
  if (vibrateInterval) { clearInterval(vibrateInterval); vibrateInterval = null; }

  // Apaguem el maquinari físic (Hardware)
  try { await Torch.disable(); } catch (e) {}
  try { await Haptics.stop(); } catch (e) {}

  // Netejem les notificacions de la safata del sistema
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    await LocalNotifications.removeAllDelivered();
  } catch (e) { console.error("Error esborrant notif:", e); }
};

// ===============================================================
// LÒGICA DE DADES I API (CLIMA I UBICACIÓ)
// ===============================================================

// Funció intel·ligent: Decideix si usar GPS, dades guardades o valors per defecte
async function updateWeatherFromStorage() {
  const isAuto = localStorage.getItem('dropapp_gps_auto') === 'true';
  // Dades recuperades del navegador (persistència)
  const savedLat = localStorage.getItem('dropapp_lat');
  const savedLon = localStorage.getItem('dropapp_lon');
  const savedCity = localStorage.getItem('dropapp_city_name');

  if (isAuto) {
    try {
      // FEEDBACK: Informem a l'usuari que estem treballant (UX)
      window.eyeWeather = { 
        city: "🛰️ Cercant satèl·lits...", 
        temp: "--", hum: "--", status: "Localitzant..." 
      };

      // 1. Demanem posició al GPS del mòbil
      const coords = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true, // Volem precisió GPS real
        timeout: 10000 // Si en 10s no respon, salta error (evita bloqueig)
      });
      
      const lat = coords.coords.latitude;
      const lon = coords.coords.longitude;
      let finalName = "📍 Ubicació GPS";

      // 2. "Reverse Geocoding": Convertim lat/lon en nom de ciutat
      try {
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ca`);
        if(geoRes.ok) {
            const geoData = await geoRes.json();
            // Prioritzem: Ciutat -> Localitat -> Nom genèric
            if (geoData.city || geoData.locality) {
                finalName = `📍 ${geoData.city || geoData.locality}`;
            }
        }
      } catch (err) { console.warn("Error obtenint nom ciutat, usant genèric."); }

      // 3. Obtenim el clima amb les dades precises
      fetchWeather(lat, lon, finalName);

    } catch (e) { 
      console.error("Error GPS:", e);
      fetchWeather(); // Fallback: Crida sense paràmetres (usarà IP)
    } 
  } else if (savedLat && savedLon) {
    // Mode Manual: Usem el que hi ha guardat
    fetchWeather(savedLat, savedLon, savedCity);
  } else { 
    // Primera vegada que s'obre l'App
    fetchWeather(); 
  }
}

// Funció robusta per obtenir el clima (Open-Meteo)
async function fetchWeather(lat, lon, cityName) {
  try {
    // FALLBACK: Si no tenim coordenades, usem geolocalització per IP
    if (!lat || !lon) {
      const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
      if (!res.ok) throw new Error("Error Geo IP");
      const data = await res.json();
      lat = data.latitude; lon = data.longitude;
      cityName = data.city || "La teva zona";
    }

    // CRIDA A L'API PRINCIPAL (Open-Meteo)
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`);
    
    if (!weatherRes.ok) throw new Error("Error API Meteo");
    
    const wData = await weatherRes.json();
    if (!wData.current) throw new Error("Dades incompletes");

    const hum = wData.current.relative_humidity_2m;
    
    // LÒGICA DE NEGOCI: Interpretem la humitat per donar un consell de salut
    let status = "Ambient normal";
    if (hum < 35) status = "Ambient SEC ⚠️ (Posa't gotes!)";
    else if (hum > 70) status = "Ambient Humit";

    // Actualitzem l'objecte global que llegeix p5.js per dibuixar
    window.eyeWeather = { city: cityName, temp: wData.current.temperature_2m, hum, status };

  } catch (e) { 
    console.log("Error Clima/Xarxa:", e);
    // MODE OFFLINE: Mostrem dades buides però no trenquem l'app
    window.eyeWeather = { 
        city: cityName || "Sense connexió", 
        temp: "--", hum: "--", status: "Mode Offline (Sense dades)" 
    };
  }
}

// --- GESTIÓ DE LA CONFIGURACIÓ (DOM EVENTS) ---
function setupConfigLogic() {
  const searchInput = document.getElementById('config-city-search');
  const resultsList = document.getElementById('city-results');
  const chkGPS = document.getElementById('chk-gps-auto');
  let tempCoords = null;

  // Toggle entre manual i automàtic
  chkGPS.addEventListener('change', () => {
    document.getElementById('manual-city-group').style.opacity = chkGPS.checked ? "0.4" : "1";
    searchInput.disabled = chkGPS.checked;
  });

  // Autocomplete de ciutats (API Geocoding)
  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 3) { resultsList.classList.add('hidden'); return; } // Mínim 3 lletres
    
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=ca`);
        if(res.ok) {
            const data = await res.json();
            resultsList.innerHTML = "";
            if (data.results) {
            resultsList.classList.remove('hidden');
            data.results.forEach(city => {
                const li = document.createElement('li');
                li.textContent = `${city.name} (${city.country})`;
                // Al clicar una ciutat, guardem les coordenades temporalment
                li.onclick = () => {
                    tempCoords = { lat: city.latitude, lon: city.longitude, name: city.name };
                    searchInput.value = city.name;
                    resultsList.classList.add('hidden');
                };
                resultsList.appendChild(li);
            });
            }
        }
    } catch(err) { console.error("Error cerca ciutat", err); }
  });

  // Guardar Configuració i Aplicar canvis
  document.getElementById('config-save').addEventListener('click', () => {
    localStorage.setItem('dropapp_gps_auto', chkGPS.checked);
    localStorage.setItem('dropapp_interval_hours', document.getElementById('config-interval-hours').value);
    localStorage.setItem('dropapp_dark_mode', document.getElementById('config-dark-mode').value);
    
    if (tempCoords && !chkGPS.checked) {
      localStorage.setItem('dropapp_lat', tempCoords.lat);
      localStorage.setItem('dropapp_lon', tempCoords.lon);
      localStorage.setItem('dropapp_city_name', tempCoords.name);
    }

    // Canvi de tema CSS en calent
    document.body.classList.toggle('light-mode', document.getElementById('config-dark-mode').value === 'off');
    
    // Recarreguem dades i sincronitzem el rellotge de p5.js
    updateWeatherFromStorage();
    if (window.dropappSync) window.dropappSync();
    
    // Tanquem modal
    document.getElementById('config-panel').classList.add('hidden');
    document.getElementById('config-backdrop').classList.add('hidden');
  });

  // Obre/Tanca modal
  document.getElementById('config-toggle').addEventListener('click', () => {
    document.getElementById('config-panel').classList.toggle('hidden');
    document.getElementById('config-backdrop').classList.toggle('hidden');
  });

  document.getElementById('config-cancel').addEventListener('click', () => {
    document.getElementById('config-panel').classList.add('hidden');
    document.getElementById('config-backdrop').classList.add('hidden');
  });
}

// Funció simple per vibrar al fer clic (Feedback hàptic UI)
window.dropappVibrate = () => Haptics.vibrate({ duration: 300 });