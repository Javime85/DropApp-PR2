# DropApp - PR2

Aplicació mòbil híbrida (Capacitor + p5.js) per gestionar la salut ocular mitjançant recordatoris intel·ligents i dades ambientals en temps real.

## Descripció

DropApp evoluciona en aquesta PR2 per no només recordar l'aplicació de gotes oftalmològiques, sinó per contextualitzar la necessitat de l'usuari segons la humitat i temperatura de la seva ubicació actual, utilitzant APIs externes i geolocalització.

## Funcionalitat

- **Temporitzador Visual:** Interfície animada amb p5.js que mostra el progrés cap a la següent dosi.
- **Context Ambiental (API):** Connexió amb *Open-Meteo* per alertar si la humitat relativa és baixa (<35%), factor crític per a l'ull sec.
- **Geolocalització Dinàmica (API):** Obtenció de la ubicació actual i traducció a nom de localitat mitjançant *BigDataCloud Reverse Geocoding*.
- **Alertes Natives:**
  * Notificació local al sistema.
  * Llanterna (mode fix i parpelleig estroboscòpic) com a senyal visual.
  * Vibració hàptica coordinada.
- **Configuració Persistent:** Emmagatzematge local (`localStorage`) de preferències, intervals i darreres dades climàtiques.

## Estructura del projecte

```text
dropapp/
├── android/                   
├── public/                  
│   ├── css/
│   │   └── style.css
│   ├── dropapp_logo.png
│   ├── gota.png
│   ├── p5.js
│   └── p5.sound.min.js
├── src/                      
│   ├── aptics-test.js
│   ├── counter.js
│   ├── javascript.svg
│   ├── main.js
│   └── sketch.js
├── .gitignore
├── capacitor.config.ts       
├── index.html                
├── LICENSE
├── package.json
├── package-lock.json
└── README.md
```

## Tecnologies utilitzades

- **Vite + JavaScript:** Entorn de desenvolupament i empaquetat.
- **p5.js:** Gràfics generatius i lògica visual del temporitzador.
- **Capacitor 6:** Framework per convertir la web app en nativa i accedir al maquinari.
- **Plugins Natius:**
  * `@capacitor/geolocation`: Per obtenir les coordenades de l'usuari.
  * `@capacitor/local-notifications`: Per als avisos del sistema.
  * `@capacitor/haptics`: Per a la resposta tàctil (vibració).
  * `@capawesome/capacitor-torch`: Per al control de la llanterna.

## Instal·lació i execució

Per desplegar el projecte en un terminal Android:

1.  Instal·lar dependències:
    ```bash
    npm install
    ```
2.  Generar la compilació:
    ```bash
    npm run build
    ```
3.  Sincronitzar amb el projecte Android:
    ```bash
    npx cap sync android
    ```
4.  Executar des d'Android Studio:
    ```bash
    npx cap open android
    ```

## Descàrrega i instal·lació

Pots obtenir el codi d'aquest projecte de dues maneres:

1. **Descàrrega directa:** [Descarregar DropApp-PR2 (.zip)](https://github.com/Javime85/DropApp-PR2/archive/refs/heads/main.zip)
2. **Clonar el repositori:**
   ```bash
   git clone https://github.com/Javime85/DropApp-PR2.git

El projecte s'ha testejat satisfactòriament en un **Xiaomi Redmi Note 14 Pro** amb **Android 15**.

## Llicència

Aquest projecte està publicat sota la llicència **MIT**. Vegeu el fitxer `LICENSE` per a més detalls.

## Autor

**Javier Villalón Mena** – UOC, assignatura *Desenvolupament d'aplicacions interactives* (PR2 - Gener 2026).
