# Smart House Energy Monitoring

Application de monitoring temps reel pour une maison intelligente.

Le projet collecte les mesures electriques depuis STM32, les envoie avec MQTT, les stocke dans InfluxDB, puis les affiche dans Grafana, une application web React et une application mobile Flutter native.

## Architecture

```text
STM32 / MCP sensors
   -> Python collectors
   -> MQTT broker
   -> Node.js backend
   -> InfluxDB
   -> Grafana / React Web Dashboard / Flutter Mobile App
```

Le chatbot utilise aussi un backend FastAPI separe:

```text
Frontend Assistant IA -> FastAPI /chat -> response
```

Architecture detaillee des dossiers:

```text
docs/PROJECT_ARCHITECTURE.md
```

## Prerequis

- Node.js
- Python
- Flutter
- InfluxDB 2.x
- Grafana
- MQTTX pour tester MQTT manuellement

## Configuration `.env`

Le fichier `.env` contient les parametres locaux du backend Node.

Un exemple existe dans `.env.example`.

Variables importantes:

```env
API_HOST=0.0.0.0
API_PORT=3001

MQTT_URL=mqtt://broker.emqx.io:1883
MQTT_TOPIC=maison/+

INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your_token
INFLUX_ORG=smart_home
INFLUX_BUCKET=energy

SOURCE=stm32mp15
CHATBOT_URL=http://127.0.0.1:8000/chat
```

`API_HOST=0.0.0.0` permet au telephone ou a l'ecran STM32 d'acceder au backend via l'adresse IP du PC.

## Demarrage InfluxDB

Depuis PowerShell:

```powershell
& "C:\Users\Eslem Ben Ameur\influxdb\influxd.exe" --engine-path "D:\influxdb2\engine" --bolt-path "D:\influxdb2\influxd.bolt"
```

Puis ouvrir:

```text
http://localhost:8086
```

Verifier:

- org: `smart_home`
- bucket: `energy`
- token identique a `.env`

## Demarrage Backend Node.js

```powershell
cd "C:\Users\Eslem Ben Ameur\mqtt-reception"
npm install
npm start
```

Backend local:

```text
http://127.0.0.1:3001
```

Depuis un telephone ou STM32 sur le meme Wi-Fi:

```text
http://192.168.31.82:3001
```

Remplacer `192.168.31.82` par l'IPv4 du PC donne par:

```powershell
ipconfig
```

## Endpoints Backend

```text
GET  /api/health
GET  /api/app-state
GET  /api/settings
POST /api/settings
GET  /api/favorites
POST /api/favorites
GET  /api/scenes
POST /api/scenes
DELETE /api/scenes/:name
GET  /api/summary
GET  /api/latest
GET  /api/history?minutes=60
GET  /api/energy?minutes=60
GET  /api/daily-stats
GET  /api/alerts?minutes=60
GET  /api/alerts/history?limit=100
GET  /api/notifications
POST /api/alerts/:id/read
GET  /api/status
POST /api/auth/register
POST /api/auth/login
GET  /api/admin/devices
POST /api/admin/devices
DELETE /api/admin/devices/:name
POST /api/devices/:device/control
POST /api/chat
```

## MQTT Payload

Topic conseille:

```text
maison/<device>
```

Exemples:

```text
maison/frigo
maison/machine_cafe
maison/laptop
maison/microwave
maison/tv
maison/total
```

Payload JSON:

```json
{
  "device": "frigo",
  "power": 250,
  "voltage": 230,
  "current": 1.08,
  "frequency": 50
}
```

Le backend accepte aussi un payload sans `device`; dans ce cas il prend le nom depuis le topic.

## Collectors Python

Chaque collector lit les donnees depuis STM32 puis publie vers MQTT.

Exemple:

```powershell
python mcp_totale_mqtt.py --host 192.168.31.46
```

Si `paho-mqtt` manque:

```powershell
pip install paho-mqtt
```

Si le STM32 ne repond pas:

```powershell
ping 192.168.31.46
```

Puis tester dans le navigateur:

```text
http://192.168.31.46/data
```

## Web Dashboard React

Build:

```powershell
cd "C:\Users\Eslem Ben Ameur\mqtt-reception\web-dashboard"
npm install
npm run build
```

Ensuite ouvrir via le backend Node:

```text
http://127.0.0.1:3001
```

Pages disponibles:

- Dashboard principal
- Reports & CSV
- Settings & Budget
- Diagnostics
- Assistant IA

## Mobile Flutter Native

L'application mobile est native Flutter et utilise les memes APIs backend.

```powershell
cd "C:\Users\Eslem Ben Ameur\mqtt-reception\smart_house_mobile"
flutter pub get
flutter run -d chrome
```

Pour Android emulator, l'API par defaut est:

```text
http://10.0.2.2:3001
```

Pour un telephone reel, ouvrir dans l'app:

```text
More / Setup -> Admin Settings -> Backend connection
```

Puis mettre l'IP du PC:

```text
http://192.168.31.82:3001
```

## Chatbot FastAPI

Le chatbot doit tourner sur:

```text
http://127.0.0.1:8000/chat
```

Demarrage typique:

```powershell
cd "C:\Users\Eslem Ben Ameur\mqtt-reception\chatbot-backend"
pip install fastapi uvicorn pandas pyarrow
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Test:

```powershell
curl -X POST http://127.0.0.1:8000/chat -H "Content-Type: application/json" -d "{\"prompt\":\"give me energy advice\"}"
```

## Grafana

Datasource:

- Type: InfluxDB
- URL: `http://localhost:8086`
- Query language: Flux
- Org: `smart_home`
- Bucket: `energy`
- Token: meme token que `.env`

Query automatique par device:

```flux
from(bucket: "energy")
  |> range(start: -6h)
  |> filter(fn: (r) => r._measurement == "energy")
  |> filter(fn: (r) => r._field == "power")
  |> filter(fn: (r) => exists r.device)
  |> keep(columns: ["_time", "_value", "device"])
  |> group(columns: ["device"])
```

Total courant par devices:

```flux
from(bucket: "energy")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "energy")
  |> filter(fn: (r) => r._field == "power")
  |> filter(fn: (r) => exists r.device and r.device != "total")
  |> group(columns: ["device"])
  |> last()
  |> group()
  |> sum(column: "_value")
```

## Troubleshooting

### `ECONNREFUSED 127.0.0.1:8086`

InfluxDB n'est pas lance ou le port n'est pas `8086`.

### `ClientException: Failed to fetch`

Le backend Node n'est pas lance, ou l'app utilise une mauvaise IP.

### Le telephone ne se connecte pas au backend

Verifier:

- PC et telephone sur le meme Wi-Fi
- backend lance avec `API_HOST=0.0.0.0`
- URL mobile: `http://IP_DU_PC:3001`
- pare-feu Windows autorise Node.js

### Le chatbot ne repond pas

Verifier FastAPI:

```text
http://127.0.0.1:8000/docs
```

Puis tester `POST /chat`.

### Les devices ne s'ajoutent pas automatiquement

Verifier que les messages MQTT contiennent:

```json
{ "device": "nom_device", "power": 123 }
```

ou que le topic est:

```text
maison/nom_device
```

## Pour le rapport de stage

Elements a inclure:

- Schema architecture systeme
- Capture MQTTX
- Capture InfluxDB Data Explorer
- Capture Grafana Dashboard
- Capture Web Dashboard
- Capture Mobile App
- Description des alertes
- Description chatbot IA
- Description ajout automatique des devices
