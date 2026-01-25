/*
 * Javier Villalón Mena - UOC PR2 Desenvolupament d'aplicacions interactives
 * Capa Visual p5.js: Màquina estats llanterna (0off/1fix/2strobe), tint gota <35% hum.
 * Lligat a window.eyeWeather de main.js. Timestamps absoluts per segon pla.
 * Mode debug: interval 0 = 60s. Captures en folio.
 */

let dropappSketch = (p) => {
  let intervalMs = 60 * 60 * 1000; 
  let targetTime = 0; // Timestamp absolut (Independent del framerate)
  
  let running = false;
  let started = false;
  let alertActive = false;
  let flashState = 0; // 0=Off, 1=Steady, 2=Strobe
  let imgGota;
  let btnY, btnW, btnH;

  p.preload = () => { imgGota = p.loadImage('/gota.png'); };

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight).parent('p5-container');
    p.textAlign(p.CENTER, p.CENTER);
    
    // Intentem recuperar l'estat si l'usuari ha refrescat la pàgina
    let storedTarget = localStorage.getItem('dropapp_target_time');
    if (storedTarget && storedTarget > 0) {
        let now = Date.now();
        if (storedTarget > now) {
            targetTime = parseInt(storedTarget);
            started = true;
            running = true;
        }
    }
    
    sync(); // Sincronització de configuració
    window.dropappSync = sync; 
  };

  function sync() {
    const h = localStorage.getItem('dropapp_interval_hours') || 1;
    if (h == 0) {
      intervalMs = 60 * 1000; // Mode Test: 1 minut
    } else {
      intervalMs = h * 60 * 60 * 1000;
    }
  }

  p.windowResized = () => { p.resizeCanvas(p.windowWidth, p.windowHeight); };

  p.draw = () => {
    p.clear();
    
    let now = Date.now();
    let rem = intervalMs; 

    if (started && running) {
        rem = targetTime - now;
        if (rem < 0) rem = 0;
    }

    // --- MÀQUINA D'ESTATS TEMPORAL ---
    if (running && started) {
      // 1. ALARMA FINAL (Temps esgotat)
      if (rem <= 0) {
        if (!alertActive) {
         alertActive = true;
         // IMPORTANT: Aquesta crida només funciona si l'app està oberta (Foreground).
         if (window.triggerFinalAlarm) window.triggerFinalAlarm(); 
        }
      } 
      // 2. FASE URGÈNCIA (< 5s) -> Llanterna parpadejant
      else if (rem <= 5000) {
        if (flashState !== 2) {
         flashState = 2;
         if (window.setFlashMode) window.setFlashMode('strobe');
        }
      }
      // 3. FASE PRE-AVÍS (< 10s) -> Llanterna fixa
      else if (rem <= 10000) {
        if (flashState !== 1) {
         flashState = 1;
         if (window.setFlashMode) window.setFlashMode('steady');
        }
      }
      // 4. ESTAT NORMAL
      else {
        if (flashState !== 0) {
         flashState = 0;
         if (window.setFlashMode) window.setFlashMode('off');
        }
      }
    }

    // Dibuixat de la UI
    p.rectMode(p.CORNER); 
    dibuixarEscenari();
    p.rectMode(p.CENTER);
    dibuixarContingut(rem);
  };

  function dibuixarEscenari() {
    let isDay = document.body.classList.contains('light-mode');
    let c1, c2;

    // Feedback visual agressiu si sona l'alarma (Vermell intens)
    if (alertActive) {
      let flashSpeed = 20; 
      c1 = p.color(p.frameCount % flashSpeed < (flashSpeed/2) ? '#ff0000' : '#800000');
      c2 = p.color('#220000');
    } else {
      // Mode Normal (Dia/Nit)
      c1 = isDay ? p.color('#E3F2FD') : p.color('#0D1B2A');
      c2 = isDay ? p.color('#00B4D8') : p.color('#1B263B');
    }

    let g = p.drawingContext.createLinearGradient(0, 0, 0, p.height);
    g.addColorStop(0, c1.toString());
    g.addColorStop(1, c2.toString());
    p.drawingContext.fillStyle = g;
    p.noStroke();
    p.rect(0, 0, p.width, p.height);
  }

  function dibuixarContingut(rem) {
    let isDay = document.body.classList.contains('light-mode') && !alertActive;
    let mainColor = alertActive ? 255 : (isDay ? 30 : 255);
    
    // ================================
    // SECCIÓ SUPERIOR: INFO CLIMÀTICA
    // ================================
    if (window.eyeWeather && window.eyeWeather.city) {
      
      let startY = p.height * 0.16; // Marge superior relatiu
      let boxW = p.width * 0.90;    // Amplada caixa (90% pantalla)
      let boxX = (p.width - boxW) / 2; // Centrat

      // 1. Icona Pin
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(32); 
      p.text("📍", p.width/2, startY);

      // 2. Nom Ciutat (Gestió automàtica de 2 línies)
      let textNet = window.eyeWeather.city.replace("📍", "").substring(0, 50); 
      
      p.fill(mainColor);
      p.textSize(26); 
      p.textStyle(p.BOLD);
      p.textLeading(32); // Separació entre línies
      p.rectMode(p.CORNER); 
      
      // Dibuixem el text dins d'una caixa de 80px d'alt (prou per a 2 línies)
      // Comença sota el pin (startY + 45)
      p.text(textNet, boxX, startY + 45, boxW, 80);

      // 3. Temperatura i Humitat
      // Calculem la posició Y sumant l'alçada de la caixa anterior per evitar solapaments
      let tempY = startY + 45 + 80; 
      
      p.rectMode(p.CENTER); // Tornem al mode centre per la resta
      p.textAlign(p.CENTER, p.TOP); 
      p.textSize(18); 
      p.textStyle(p.NORMAL);
      p.text(`${window.eyeWeather.temp || '--'}ºC | Hum: ${window.eyeWeather.hum || '--'}%`, p.width/2, tempY);
      
      // 4. Estat (Amb lògica de colors d'alerta)
      let statusColor = alertActive ? '#FF4444' : (isDay ? '#0077B6' : '#4CC9F0');
      let icona = "";

      // Si humitat < 35%, posem groc i warning
      if (window.eyeWeather.status.includes("SEC") || parseFloat(window.eyeWeather.hum) < 35) {
         statusColor = '#FFD166'; // Groc alerta
         icona = "⚠️ ";
      } else if (window.eyeWeather.status === "Sense connexió") {
         statusColor = '#AAAAAA';
      }

      p.fill(statusColor);
      p.textSize(16);
      p.textStyle(p.BOLD);
      p.text(icona + (window.eyeWeather.status || "Carregant..."), p.width/2, tempY + 30);

    } else {
      // Fallback si no hi ha dades
      p.fill(mainColor);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(18);
      p.text("Sintonitzant clima...", p.width/2, p.height * 0.20);
    }

    // ==========================================================
    // SECCIÓ CENTRAL: GOTA ANIMADA
    // ==========================================================
    p.imageMode(p.CENTER);
    if (window.eyeWeather && parseFloat(window.eyeWeather.hum) < 35 && !alertActive) {
      p.tint(255, 200, 100); // Tint taronja/groc si està sec
    } else if (isDay) {
      p.tint(0, 150, 200);   // Blau fosc si és de dia
    } else {
      p.noTint();            // Blanc original de nit
    }

    let baseW = Math.min(p.width * 0.55, 220);
    let pulse = alertActive ? Math.sin(p.millis() / 80) * 15 : Math.sin(p.millis() / 1000) * 5;
    
    // Ubiquem la gota una mica més avall (0.56) per donar espai al text
    if (imgGota) p.image(imgGota, p.width/2, p.height * 0.56, baseW + pulse, (baseW*1.33) + pulse);
    p.noTint();

    // ===================================
    // SECCIÓ INFERIOR: RELLOTGE I BOTONS
    // ===================================
    p.fill(mainColor);
    let s = Math.ceil(rem / 1000); 
    let timeStr = `${p.nf(Math.floor(s/3600),2)}:${p.nf(Math.floor((s%3600)/60),2)}:${p.nf(s%60,2)}`;
    
    let shakeX = alertActive ? p.random(-2, 2) : 0;
    
    // Rellotge Gran
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(64); 
    p.textStyle(p.BOLD);
    
    // Ombra suau per llegibilitat
    p.drawingContext.shadowBlur = 10;
    p.drawingContext.shadowColor = 'rgba(0,0,0,0.2)';
    p.text(timeStr, (p.width/2) + shakeX, p.height * 0.78);
    p.drawingContext.shadowBlur = 0;

    // BOTONS
    btnW = p.width * 0.42; btnH = 60; btnY = p.height * 0.90; 
    let btnColor = alertActive ? '#ff4444' : '#00B4D8';
    
    // Botó Esquerre (Blanc -> Iniciar)
    if (!alertActive) btn(p.width * 0.25, btnY, btnW, btnH, "Iniciar", "#FFFFFF", "#000000");
    else btn(p.width * 0.25, btnY, btnW, btnH, "...", "#444444", "#888888");

    // Botó Dret (Color -> Acció)
    let btnScale = alertActive ? (Math.sin(p.millis() / 100) * 2) : 0;
    btn(p.width * 0.75, btnY, btnW + btnScale, btnH + btnScale, "Gota posada", btnColor, "#FFFFFF");
  }

  // Funció auxiliar per dibuixar botons
  function btn(x, y, w, h, t, bg, tc) {
    p.drawingContext.shadowBlur = 15;
    p.drawingContext.shadowColor = 'rgba(0,0,0,0.3)';
    p.fill(bg); 
    p.rect(x, y, w, h, 20); // Vores arrodonides (20)
    p.drawingContext.shadowBlur = 0;
    
    p.fill(tc); 
    p.textSize(15); 
    p.textStyle(p.BOLD);
    p.text(t, x, y);
  }

  p.mousePressed = () => {
    // Detecció de clics als botons
    if (p.abs(p.mouseY - btnY) < btnH / 2 + 20) {
      if (p.abs(p.mouseX - (p.width * 0.75)) < btnW / 2) reiniciarTimer();
      else if (p.abs(p.mouseX - (p.width * 0.25)) < btnW / 2) {
         if (!alertActive) reiniciarTimer();
      }
    }
  };

  function reiniciarTimer() {
      // 1. Definim el nou temps objectiu
      targetTime = Date.now() + intervalMs;
      
      // 2. Persistència de dades (CRÍTIC PER SI L'APP ES TANCA)
      localStorage.setItem('dropapp_target_time', targetTime);

      // 3. Reset de l'estat visual
      started = true; running = true; alertActive = false; flashState = 0;
      
      // 4. Comunicació amb el sistema natiu (main.js)
      if (window.stopAndResetHardware) window.stopAndResetHardware();
      if (window.dropappVibrate) window.dropappVibrate(); // Feedback tàctil

      // 5. Programació precisa de la notificació
      if (window.dropappProgramarAvis) window.dropappProgramarAvis(intervalMs / 1000 / 60);
  }
};
new p5(dropappSketch);
