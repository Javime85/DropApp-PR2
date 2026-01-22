/*
 * Javier Villalón Mena - UOC Desenvolupament d'aplicacions interactives PR2
 * Capa Lògica (Bridge): Geolocalització → BigDataCloud → Open-Meteo.
 * Gestiona permisos, notificacions canals prioritaris i hardware (Torch/Haptics).
 * Objecte global: window.eyeWeather per sketch.js.
 * Mode test: 0h = 1min. Testejat Android 15 Xiaomi Redmi Note 14 Pro.
 */

import './sketch.js'; 
import { App } from '@capacitor/app'; 
import { Haptics } from '@capacitor/haptics';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Torch } from '@capawesome/capacitor-torch';

// Variables d'estat per hardware
let flashInterval = null;
let vibrateInterval = null;
let isFlashOn = false;

// Objecte global compartit amb p5.js
window.eyeWeather = { 
  city: "Cercant...", 
  temp: "--", 
  hum: "--", 
  status: "Carregant dades..." 
};

document.addEventListener('DOMContentLoaded', async () => {
  const splash = document.getElementById('splash-screen');
  const app = document.getElementById('app-container');

  // 1. GESTIÓ DE PERMISOS (Android 13+ Strict Mode)
  try {
    const notifs = await LocalNotifications.checkPermissions();
    if (notifs.display !== 'granted') await LocalNotifications.requestPermissions();
    
    // Geolocalització necessària per a l'API climàtica
    const geo = await Geolocation.checkPermissions();
    if (geo.location !== 'granted') await Geolocation.requestPermissions();
  } catch (e) {
    console.warn("Error inicialitzant permisos:", e);
  }

  // 2. CANAL D'ALTA PRIORITAT (Per travessar el mode No Molestar)
  try {
      await LocalNotifications.createChannel({
          id: 'dropapp_alerts',
          name: 'Alertes Crítiques DropApp',
          description: 'Avisos visuals i sonors per a la hidratació',
          importance: 5, // MAX IMPORTANCE (Sona fort i vibra)
          visibility: 1, // Visible a la pantalla de bloqueig
          vibration: true,
          sound: 'default_notification.mp3'
      });
  } catch(e) { console.error("Error creant canal", e); }

  // 3. LISTENERS DEL CICLE DE VIDA (CLAU PER A L'ÈXIT)
  
  // Quan l'usuari toca la notificació, l'app s'obre.
  // Aturem el hardware "extra" per permetre a l'usuari interactuar.
  LocalNotifications.addListener('localNotificationActionPerformed', async () => {
    // Opcional: Podem decidir si aturar-ho tot o deixar que l'usuari premi "Gota posada"
    // Per UX, millor deixar que l'usuari confirmi visualment.
    console.log("Notificació oberta per l'usuari");
  });

  // Quan l'app torna del segon pla (Resume)
  App.addListener('resume', () => {
    console.log("App represa (Resume)");
    updateWeatherFromStorage();
    
    // CRÍTIC: Sincronització immediata
    // Si l'alarma va sonar mentre estavem fora, el p5.js ho detectarà,
    // però forcem una actualització per si cal activar el Flash ara mateix.
    if (window.dropappSync) window.dropappSync(); 
    
    // Comprovem si hauriem d'estar sonant (per si JS estava congelat)
    checkAlarmStateOnResume();
  });

  // Inicialització UI
  const useGPS = localStorage.getItem('dropapp_gps_auto') === 'true';
  const chkGps = document.getElementById('chk-gps-auto');
  if (chkGps) chkGps.checked = useGPS;
  
  updateWeatherFromStorage();

  // Transició Splash -> App
  setTimeout(() => {
    if (splash) splash.style.display = 'none';
    if (app) app.style.display = 'block';
  }, 1500);

  setupConfigLogic();
});

// Funció de recuperació d'estat (Back-up logic)
function checkAlarmStateOnResume() {
    // Recuperem l'hora objectiu del localStorage (guardada per sketch.js)
    const target = parseInt(localStorage.getItem('dropapp_target_time') || 0);
    const now = Date.now();

    // Si el temps ha passat i no hem confirmat la gota...
    if (target > 0 && now >= target) {
        // Disparem l'alerta visual/tàctil perquè l'usuari ja té el mòbil a la mà
        if (window.setFlashMode) window.setFlashMode('strobe');
        if (window.triggerFinalAlarm) window.triggerFinalAlarm();
    }
}

// ======================= PONT HARDWARE =======================

window.dropappProgramarAvis = async (minuts) => {
  const chkNotif = document.getElementById('chk-notificacio');
  if (chkNotif && !chkNotif.checked) return;

  try {
    const ms = Math.floor(minuts * 60 * 1000);
    const horaAlarma = new Date(Date.now() + ms);

    // Cancel·lem anteriors per evitar duplicitats
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    // PROGRAMACIÓ ROBUSTA
    await LocalNotifications.schedule({
      notifications: [{
        id: 1,
        title: "💧 Hora de la gota!",
        body: "Hidrata els teus ulls ara mateix.",
        channelId: 'dropapp_alerts',
        schedule: { 
            at: horaAlarma, 
            allowWhileIdle: true, // CLAU: Desperta del mode Doze
            foreground: true      
        },
        smallIcon: 'ic_stat_dropapp', // Icona segura
        iconColor: '#00B4D8',
        actionTypeId: "",
        extra: null
      }]
    });
    console.log(`Alarma programada per: ${horaAlarma.toLocaleTimeString()}`);
  } catch (e) { console.error("Error programant notificacions:", e); }
};

window.setFlashMode = async (mode) => {
  const chkFlash = document.getElementById('chk-flash');
  // Permetem apagar (off) encara que el checkbox estigui desmarcat
  if (chkFlash && !chkFlash.checked && mode !== 'off') return;

  try {
    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }

    if (mode === 'off') { await Torch.disable(); isFlashOn = false; } 
    else if (mode === 'steady') { await Torch.enable(); isFlashOn = true; } 
    else if (mode === 'strobe') {
      // Loop estroboscòpic (Només funciona amb l'app en primer pla)
      flashInterval = setInterval(async () => {
        isFlashOn = !isFlashOn;
        try { isFlashOn ? await Torch.enable() : await Torch.disable(); } catch(e){}
      }, 200);
    }
  } catch (e) { /* Ignorem errors si no hi ha flash */ }
};

window.triggerFinalAlarm = async () => {
  if (vibrateInterval) clearInterval(vibrateInterval);
  // Vibració insistent (Haptics Loop)
  vibrateInterval = setInterval(async () => {
    try { await Haptics.vibrate({ duration: 1000 }); } catch (e) {}
  }, 1200);
};

window.stopAndResetHardware = async () => {
  console.log("Aturant tot el hardware...");
  if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
  if (vibrateInterval) { clearInterval(vibrateInterval); vibrateInterval = null; }
  
  // Netejem localStorage per evitar falses alarmes al resume
  localStorage.setItem('dropapp_target_time', 0);

  try { 
    await Torch.disable();
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    await LocalNotifications.removeAllDelivered(); 
  } catch (e) {}
};

window.dropappVibrate = () => Haptics.vibrate();

// ======================= LÒGICA API CLIMÀTICA =======================
// (Mantinguda igual que la teva versió original, funciona bé)

async function updateWeatherFromStorage() {
  const isAuto = localStorage.getItem('dropapp_gps_auto') === 'true';
  if (isAuto) {
    try {
      window.eyeWeather.city = "Cercant GPS...";
      const coords = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
      fetchWeather(coords.coords.latitude, coords.coords.longitude);
    } catch (e) { fetchWeather(); }
  } else {
    const lat = localStorage.getItem('dropapp_lat');
    const lon = localStorage.getItem('dropapp_lon');
    const city = localStorage.getItem('dropapp_city_name');
    if (lat && lon) fetchWeather(lat, lon, city);
    else fetchWeather();
  }
}

async function fetchWeather(lat, lon, cityName) {
    // Si no tenim coordenades, usem fallback (IP)
    if (!lat || !lon) {
        try {
             const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
             const data = await res.json();
             lat = data.latitude; lon = data.longitude;
             cityName = data.city || "Ubicació IP";
        } catch(e) { return; }
    }
    
    // Si tenim coordenades però no nom, fem reverse geo rapid
    if (!cityName) {
         try {
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ca`);
            const geoData = await geoRes.json();
            cityName = geoData.locality || geoData.city || "La teva zona";
         } catch(e) { cityName = "Zona Desconeguda"; }
    }

    try {
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`);
        const wData = await wRes.json();
        
        const hum = wData.current.relative_humidity_2m;
        let status = "Ambient Correcte";
        if (hum < 35) status = "Ambient SEC (Risc de sequedat ocular)";
        else if (hum > 70) status = "Ambient Humit";

        window.eyeWeather = { city: cityName, temp: wData.current.temperature_2m, hum: hum, status: status };
    } catch (e) {
        window.eyeWeather = { city: cityName, temp: "--", hum: "--", status: "Sense connexió" };
    }
}

// ======================= CONFIGURACIÓ DOM =======================
function setupConfigLogic() {
  // (Mantinguda igual que la teva versió original)
  const searchInput = document.getElementById('config-city-search');
  const resultsList = document.getElementById('city-results');
  const chkGPS = document.getElementById('chk-gps-auto');
  let tempCoords = null;

  if(chkGPS) {
    chkGPS.addEventListener('change', () => {
      document.getElementById('manual-city-group').style.opacity = chkGPS.checked ? "0.4" : "1";
      if (searchInput) searchInput.disabled = chkGPS.checked;
    });
  }

  if(searchInput) {
    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value;
      if (query.length < 3) { resultsList.classList.add('hidden'); return; }
      try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=ca`);
          const data = await res.json();
          resultsList.innerHTML = "";
          if (data.results) {
              resultsList.classList.remove('hidden');
              data.results.forEach(city => {
                  const li = document.createElement('li');
                  li.textContent = `${city.name} (${city.country})`;
                  li.onclick = () => {
                      tempCoords = { lat: city.latitude, lon: city.longitude, name: city.name };
                      searchInput.value = city.name;
                      resultsList.classList.add('hidden');
                  };
                  resultsList.appendChild(li);
              });
          }
      } catch(err) {}
    });
  }

  document.getElementById('config-save').addEventListener('click', () => {
    if (chkGPS) localStorage.setItem('dropapp_gps_auto', chkGPS.checked);
    localStorage.setItem('dropapp_interval_hours', document.getElementById('config-interval-hours').value);
    localStorage.setItem('dropapp_dark_mode', document.getElementById('config-dark-mode').value);
    localStorage.setItem('dropapp_notificacio', document.getElementById('chk-notificacio').checked);
    localStorage.setItem('dropapp_flash_enabled', document.getElementById('chk-flash').checked);
    
    if (tempCoords && !chkGPS.checked) {
      localStorage.setItem('dropapp_lat', tempCoords.lat);
      localStorage.setItem('dropapp_lon', tempCoords.lon);
      localStorage.setItem('dropapp_city_name', tempCoords.name);
    }

    document.body.classList.toggle('light-mode', document.getElementById('config-dark-mode').value === 'off');
    updateWeatherFromStorage();
    if (window.dropappSync) window.dropappSync();
    
    document.getElementById('config-panel').classList.add('hidden');
    document.getElementById('config-backdrop').classList.add('hidden');
  });

  document.getElementById('config-toggle').addEventListener('click', () => {
    document.getElementById('config-panel').classList.toggle('hidden');
    document.getElementById('config-backdrop').classList.toggle('hidden');
  });
  
  document.getElementById('config-cancel').addEventListener('click', () => {
    document.getElementById('config-panel').classList.add('hidden');
    document.getElementById('config-backdrop').classList.add('hidden');
  });
}