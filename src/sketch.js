// Usem "Instance Mode" de p5.js per aïllar les nostres variables del global scope
let dropappSketch = (p) => {
  // Variables d'Estat del Temporitzador
  let intervalMs = 60 * 60 * 1000; // Defecte: 1 hora
  let lastDropTime = 0;            // Marca de temps (timestamp) de l'última dosi
  let running = false;             // Si el compte enrere està actiu
  let started = false;             // Si s'ha premut "Iniciar" alguna vegada
  let imgGota;                     // Recurs gràfic
  
  // Màquina d'Estats de l'Alarma
  let alertActive = false; // True quan el temps ha arribat a 0
  let flashState = 0;      // Controla fases: 0=Off, 1=Fixe (avís), 2=Parpelleig (urgència)

  // Coordenades i mides per detectar clics (Hit Detection manual)
  let btnY, btnW, btnH;

  p.preload = () => { imgGota = p.loadImage('/gota.png'); };

  p.setup = () => {
    // Creem el canvas adaptat a la finestra i el vinculem al DIV
    p.createCanvas(p.windowWidth, p.windowHeight).parent('p5-container');
    p.textAlign(p.CENTER, p.CENTER);
    
    // Sincronització inicial amb la configuració (LocalStorage)
    sync();
    // Exposem la funció sync perquè main.js pugui avisar-nos quan canviï la config
    window.dropappSync = sync;
  };

  // Funció per llegir la configuració d'hores
  function sync() {
    const h = localStorage.getItem('dropapp_interval_hours') || 1;
    if (h == 0) {
      intervalMs = 60 * 1000; // Mode DEBUG: 1 minut per proves ràpides
      console.log("⚠️ MODE TEST: Temporitzador fixat a 1 MINUT");
    } else {
      intervalMs = h * 60 * 60 * 1000; // Conversió hores -> milisegons
    }
  }

  // Si girem el mòbil, redimensionem el canvas
  p.windowResized = () => { p.resizeCanvas(p.windowWidth, p.windowHeight); };

  // --- BUCLE PRINCIPAL DE DIBUIX (60 FPS) ---
  p.draw = () => {
    p.clear();
    
    // Càlcul del temps restant
    let elapsed = p.millis() - lastDropTime;
    // Math.max evita números negatius
    let rem = (started && running) ? Math.max(0, intervalMs - elapsed) : intervalMs;

    // --- LÒGICA DE CONTROL (MÀQUINA D'ESTATS) ---
    // Aquesta secció comprova el temps i envia ordres al Hardware (main.js)
    if (running && started) {
      
      // FASE 3: ALARMA FINAL (Temps esgotat) -> 00:00:00
      if (rem <= 0) {
        if (!alertActive) {
          alertActive = true;
          // Cridem al Hardware només una vegada (trigger)
          if (window.triggerFinalAlarm) window.triggerFinalAlarm();
        }
      } 
      // FASE 2: URGÈNCIA (Últims 5 segons) -> Flash ràpid
      else if (rem <= 5000) {
        if (flashState !== 2) {
          flashState = 2;
          if (window.setFlashMode) window.setFlashMode('strobe');
        }
      }
      // FASE 1: PRE-AVÍS (Últims 10 segons) -> Flash fixe
      else if (rem <= 10000) {
        if (flashState !== 1) {
          flashState = 1;
          if (window.setFlashMode) window.setFlashMode('steady');
        }
      }
      // FASE 0: NORMAL -> Flash apagat
      else {
        if (flashState !== 0) {
          flashState = 0;
          if (window.setFlashMode) window.setFlashMode('off');
        }
      }
    }

    // Dibuix per capes
    p.rectMode(p.CORNER); 
    dibuixarEscenari();
    p.rectMode(p.CENTER);
    dibuixarContingut(rem);
  };

  // Fons degradat que canvia de color segons l'estat (Alarma vs Normal)
  function dibuixarEscenari() {
    let isDay = document.body.classList.contains('light-mode');
    let c1, c2;

    if (alertActive) {
      // Efecte visual d'alarma (Vermell polsant)
      let flashSpeed = 20; 
      c1 = p.color(p.frameCount % flashSpeed < (flashSpeed/2) ? '#ff0000' : '#800000');
      c2 = p.color('#220000');
    } else {
      // Colors de tema Dia / Nit
      c1 = isDay ? p.color('#E3F2FD') : p.color('#0D1B2A');
      c2 = isDay ? p.color('#00B4D8') : p.color('#1B263B');
    }

    // Gradient lineal vertical
    let g = p.drawingContext.createLinearGradient(0, 0, 0, p.height);
    g.addColorStop(0, c1.toString());
    g.addColorStop(1, c2.toString());
    p.drawingContext.fillStyle = g;
    p.noStroke();
    p.rect(0, 0, p.width, p.height);
  }

  // Dibuix dels elements UI (Text, Imatge, Botons)
  function dibuixarContingut(rem) {
    let isDay = document.body.classList.contains('light-mode') && !alertActive;
    let mainColor = alertActive ? 255 : (isDay ? 30 : 255);
    p.fill(mainColor);

    // 1. INFO CLIMÀTICA (Dades rebudes de main.js)
    if (window.eyeWeather) {
      // Neteja del text per treure la icona (ja la posarem nosaltres)
      let textNet = window.eyeWeather.city.replace("📍 ", "").replace("📍", ""); 
      
      // ALGORITME DE TEXT DINÀMIC:
      // Reduïm la mida de la font fins que el text càpiga en pantalla
      let maxW = p.width * 0.85; // Marge del 85%
      let dynamicSize = 30;      // Mida inicial
      p.textSize(dynamicSize); p.textStyle(p.BOLD);
      
      while (p.textWidth(textNet) > maxW && dynamicSize > 12) {
        dynamicSize -= 1;
        p.textSize(dynamicSize);
      }

      let ampleText = p.textWidth(textNet);
      
      // Dibuixem Text centrat
      p.text(textNet, p.width/2, p.height * 0.18);
      
      // Dibuixem la xinxeta a l'esquerra del text calculat
      p.textSize(dynamicSize); 
      p.text("📍", (p.width/2) - (ampleText/2) - (dynamicSize), p.height * 0.18);
      
      // Subtítols (Temperatura i Humitat)
      p.textSize(16); p.textStyle(p.NORMAL);
      p.text(`${window.eyeWeather.temp}ºC | Humitat: ${window.eyeWeather.hum}%`, p.width/2, p.height * 0.23);
      
      // Missatge d'estat (Color vermell si és perillós)
      p.fill(alertActive ? '#FFCCCC' : (isDay ? '#0077B6' : '#00B4D8'));
      p.text(window.eyeWeather.status, p.width/2, p.height * 0.26);
    }

    // 2. IMATGE DE LA GOTA (Amb efecte de "batec")
    p.imageMode(p.CENTER);
    if (isDay) p.tint(0, 150, 200); else p.noTint(); // Tinter blau en mode dia

    let baseW = Math.min(p.width * 0.5, 200); // Responsive: 50% ample o màx 200px
    let baseH = baseW * 1.33;
    let pulse = 0;

    // Matemàtiques per l'animació de batec (Sine Wave)
    if (alertActive) {
      pulse = Math.sin(p.millis() / 80) * 15; // Ràpid (Alarma)
    } else if (running && started) {
      pulse = Math.sin(p.millis() / 1000) * 5; // Lent (Respiració)
    }

    p.image(imgGota, p.width/2, p.height * 0.45, baseW + pulse, baseH + pulse);
    p.noTint();

    // 3. RELLOTGE DIGITAL
    p.fill(mainColor);
    let s = Math.ceil(rem / 1000); 
    // Format HH:MM:SS
    let timeStr = `${p.nf(Math.floor(s/3600),2)}:${p.nf(Math.floor((s%3600)/60),2)}:${p.nf(s%60,2)}`;
    // Efecte de tremolor (Shake) si sona l'alarma
    let shakeX = alertActive ? p.random(-2, 2) : 0;
    
    p.textSize(60); p.textStyle(p.BOLD);
    p.text(timeStr, (p.width/2) + shakeX, p.height * 0.72);

    // 4. BOTONS DINÀMICS
    // Calculem la posició Y dinàmicament (85% de l'alçada)
    btnW = p.width * 0.40; 
    btnH = 65;            
    btnY = p.height * 0.85; 

    // Botó Esquerre: "Iniciar" (Desactivat si sona l'alarma)
    if (alertActive) {
      btn(p.width * 0.25, btnY, btnW, btnH, "Iniciar", "#666666", "#aaaaaa");
    } else {
      btn(p.width * 0.25, btnY, btnW, btnH, "Iniciar", "#FFFFFF", "#000000");
    }

    // Botó Dret: "Gota posada" (Sempre actiu, fa reset)
    let btnColor = alertActive ? '#ff4444' : '#00B4D8';
    // Efecte de zoom al botó dret durant l'alarma
    let btnScale = alertActive ? (Math.sin(p.millis() / 100) * 2) : 0;
    
    btn(p.width * 0.75, btnY, btnW + btnScale, btnH + btnScale, "Gota posada", btnColor, "#FFFFFF");
  }

  // Helper per dibuixar botons arrodonits amb ombra
  function btn(x, y, w, h, t, bg, tc) {
    p.drawingContext.shadowBlur = 15;
    p.drawingContext.shadowColor = 'rgba(0,0,0,0.3)';
    p.fill(bg); p.rect(x, y, w, h, 20); // 20 = radi de la cantonada
    p.drawingContext.shadowBlur = 0;
    p.fill(tc); p.textSize(15); p.textStyle(p.BOLD);
    p.text(t, x, y);
  }

  // --- GESTIÓ D'INPUT (Touch/Click) ---
  p.mousePressed = () => {
    // Comprovem si el clic està a l'alçada dels botons
    if (p.abs(p.mouseY - btnY) < btnH / 2 + 20) {
      
      // HIT DETECTION BOTÓ DRET: "Gota posada"
      if (p.abs(p.mouseX - (p.width * 0.75)) < btnW / 2) {
         lastDropTime = p.millis(); 
         started = true; 
         running = true; 
         alertActive = false;
         flashState = 0;
         // Cridem a main.js per apagar llanterna/vibració
         if (window.stopAndResetHardware) window.stopAndResetHardware();
         if(window.dropappVibrate) window.dropappVibrate();
      }
      
      // HIT DETECTION BOTÓ ESQUERRE: "Iniciar"
      else if (p.abs(p.mouseX - (p.width * 0.25)) < btnW / 2) {
         if (alertActive) return; // Bloquejat si hi ha alarma

         lastDropTime = p.millis(); 
         started = true; 
         running = true; 
         alertActive = false;
         flashState = 0;
         if (window.stopAndResetHardware) window.stopAndResetHardware();
         if(window.dropappVibrate) window.dropappVibrate();
      }
    }
  };
};
new p5(dropappSketch);