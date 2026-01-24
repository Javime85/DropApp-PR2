# DropApp - PR2

Aplicació mòbil híbrida (Capacitor + p5.js) per gestionar la salut ocular mitjançant recordatoris i dades ambientals en temps real.

## Descripció

DropApp evoluciona en aquesta PR2 per contextualitzar la necessitat de l'usuari segons la humitat i temperatura de la seva ubicació actual. L'aplicació utilitza APIs externes i geolocalització per modificar el comportament visual i les alertes del dispositiu, passant d'un simple temporitzador a un assistent de salut contextual.

## Novetats destacades (PR2)

- **Precisió en segon pla:** Càlculs basats en timestamps absoluts (`Date.now()`) per evitar dessincronitzacions.
- **Notificacions natives robustes:** Canals prioritaris i icona personalitzada (`ic_stat_dropapp`) per Android 13+.
- **Gestió d'errors (offline):** Detecta Mode Avió i adapta la UI sense bloquejar-se.
- **Context ambiental:** Open-Meteo + BigDataCloud. **Tint groc a la gota si humitat <35% (llindar risc ull sec).**

## Funcionalitat

- **Temporitzador visual:** p5.js amb comptador basat en timestamps.
- **Geolocalització (API):** Coordenades → nom localitat catalana (BigDataCloud Reverse Geocoding).
- **Alertes natives:**
  - Notificació local (canal `dropappalerts`, importance 5).
  - Llanterna (modes: fix/estroboscòpic via màquina d'estats).
  - Vibració hàptica coordinada.
- **Configuració persistent:** localStorage (intervals, mode fosc/clar, GPS manual).
- **Objecte global:** `window.eyeWeather` compartit main.js ↔ sketch.js.
- **Precisió en segon pla:** Implementació de càlculs basats en timestamps absoluts (`Date.now()`) per garantir que el temporitzador no es dessincronitzi mai, fins i tot si el sistema "congela" el JavaScript.
- **Estratègia de Resurrecció:** L'app detecta quan l'usuari torna a entrar des de la notificació i reactiva immediatament el hardware (flash/vibració) si el temps s'ha esgotat.
- **Notificacions Natives Robustes:** Implementació de canals de notificació prioritaris i ús d'icones natives personalitzades (`ic_stat_dropapp`) per complir amb els estàndards visuals d'Android 13+.
- **Context Ambiental:** Connexió amb l'API Open-Meteo. La gota de p5.js canvia de color (tint groguenc) si la humitat és inferior al 35% (risc de sequedat ocular).

## Estructura del projecte

```
dropapp/
├── android/                  
├── public/                  
│   ├── css/style.css         
│   ├── dropapp_logo.png      
│   └── gota.png
├── src/                      
│   ├── main.js                
│   └── sketch.js              
├── capacitor.config.ts        
├── index.html                 
├── package.json
└── README.md
```

## Tecnologies

- **Vite + JS ES6**
- **p5.js** 
- **Capacitor 6**
- **Plugins:** `@capacitor/geolocation`, `@capacitor/local-notifications`, `@capacitor/haptics`, `@capawesome/capacitor-torch`

## Instruccions correcció/testeig

### 1. Mode Test Ràpid (1 min)
- Config → "Hores entre dosis" = **0** → Auto: 60s.
- Prova tot: pre-avís llanterna → strobe → vibració → notificació.

### 2. Permisos Android 12+ **CRÍTIC**
Configuració → Apps → DropApp → "Alarmes i recordatoris" → Activar
(Sense això, alarmes exactes fallen per seguretat Android.)

## Tecnologies usades
- **Vite + JavaScript:** Entorn de desenvolupament modern.
- **p5.js:** Renderitzat del canvas i lògica visual reactiva.
- **Capacitor 6:** Framework per a la integració nativa.
- **Plugins:**
  - `@capacitor/geolocation`
  - `@capacitor/local-notifications`
  - `@capacitor/haptics`
  - `@capawesome/capacitor-torch`

## Instruccions per a la Correcció i Testeig

Per facilitar la revisió de la pràctica i evitar esperes d'una hora, s'han habilitat mecanismes específics:

### 1. Mode Test Ràpid (1 minut)
Per veure el cicle complet sense esperar:
1. Obriu la configuració de l'App (botó flotant ⚙️).
2. Al camp **"Hores entre dosis"**, poseu-hi un **0**.
3. Guardeu els canvis.
4. En prémer "Iniciar", el temporitzador es configurarà automàticament a **1 minut**.
   *Això permet validar ràpidament la transició d'estats: pre-avís, notificació en background i activació del flash al retornar.*

### 2. Configuració de Notificacions i Segon Pla (Xiaomi/Redmi)

Per garantir que **DropApp** funcioni correctament en segon pla i les notificacions arribin puntuals, cal ajustar manualment la configuració seguint els literals exactes del sistema:

**1. Evitar que el sistema retiri permisos:**
*   Mantingues premuda la icona de l'app i selecciona **Info. de la aplicación**.
*   Entra a **Permisos de la aplicación**.
*   Busca al final i **DESACTIVA** l'interruptor que diu: **"Pausar la actividad de la aplicación si no se utiliza"**.

**2. Permisos addicionals (Important en Xiaomi):**
*   Torna enrere a la pantalla d'**Info. de la aplicación**.
*   Entra a l'apartat **Otros permisos**.
*   Busca l'opció **Accesos directos de la pantalla de inicio**. Si surt amb una creu vermella, prem-la i selecciona **Permitir siempre**.

**3. Configuració de Notificacions:**
*   Dins d'**Info. de la aplicación**, entra a **Notificaciones**.
*   A la part inferior, fixa't en l'apartat **Categorías de notificaciones**.
    *   Entra dins de **Default**: Assegura't que **Permitir notificaciones** estigui activat, així com el **Sonido** i la **Vibración**.
    *   Entra dins de **Alertes Crítiques Dropapp**: Igual que l'anterior, activa totes les opcions manualment si apareixen desactivades.

**4. Permís d'Alarma Exacta:**
*   Si apareix l'opció a la llista de configuració, entra a **Alarmas y recordatorios** i activa l'interruptor **Permitir la configuración de alarmas y recordatorios**.

## Instal·lació i execució

Per desplegar el projecte en un dispositiu Android:

1. Instal·lar dependències:
   ```bash
   npm install
   ```
2. Generar la compilació web:
   ```bash
   npm run build
   ```
3. Sincronitzar amb el projecte natiu:
   ```bash
   npx cap sync android
   ```
4. Obrir i executar des d'Android Studio:
   ```bash
   npx cap open android
   ```
   
## Descàrrega
ZIP DIRECTE: https://github.com/Javime85/DropApp-PR2/archive/refs/heads/main.zip

GitHub: https://github.com/Javime85/DropApp-PR2

Testejat: Xiaomi Redmi Note 14 Pro (Android 15).

## Llicència
MIT. Veure LICENSE.

## Autor

**Javier Villalón Mena**  
UOC, assignatura Desenvolupament d'aplicacions interactives (PR2 - Gener 2026).
