# Comps Portal

Small online-ready portal for entering a subject property address and reviewing comparable listings with Zillow saves and Redfin likes/favorites.

## Run Locally

```powershell
cd "C:\Users\User\Documents\New project\comps-app"
node server.js
```

Open `http://localhost:4173`.

## Deploy Online

### Render

1. Push `comps-app` to a GitHub repository.
2. In Render, choose **New > Blueprint**.
3. Select the repository. Render will read `render.yaml`.
4. Add `COMPS_PROVIDER_URL` and `COMPS_PROVIDER_TOKEN` if you have a live data source.
5. Deploy. Render will provide a public URL.

### Railway/Fly/Docker Hosts

Use the included `Dockerfile`, or configure:

- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Port: use the host-provided `PORT` environment variable

## Live Data Hook

The portal runs in demo mode by default because Zillow and Redfin engagement metrics are not exposed through a stable public API. To connect a licensed/internal data source, set:

```powershell
$env:COMPS_PROVIDER_URL="https://your-provider.example.com/comps"
$env:COMPS_PROVIDER_TOKEN="optional-token"
node server.js
```

The provider should accept:

```json
{ "address": "123 Main St, Austin, TX" }
```

And return:

```json
{
  "address": "123 Main St, Austin, TX",
  "mode": "live",
  "subject": { "beds": 3, "baths": 2, "sqft": 1600, "estimatedValue": 450000 },
  "comps": [
    {
      "source": "Zillow",
      "address": "125 Main St",
      "status": "Active",
      "price": 460000,
      "beds": 3,
      "baths": 2,
      "sqft": 1580,
      "distanceMiles": 0.2,
      "zillowSaves": 44,
      "redfinLikes": null,
      "url": "https://..."
    }
  ]
}
```
