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

## APIllow Zillow Data

For the lowest-cost Zillow-first integration, set an APIllow key on the hosted backend:

```powershell
$env:APILLOW_API_KEY="your_api_key"
$env:APILLOW_MAX_ITEMS="8"
node server.js
```

APIllow can return Zillow `favorite_count` and `page_view_count`, which the portal maps to Zillow saves/views where present. Redfin likes require a separate Redfin-capable provider.

## Generic Live Data Hook

The portal also supports a custom provider endpoint:

```powershell
$env:COMPS_PROVIDER_URL="https://your-provider.example.com/comps"
$env:COMPS_PROVIDER_TOKEN="optional-token"
node server.js
```

## GitHub Pages + Hosted Backend

GitHub Pages can only serve static files. To use live data:

1. Deploy this app to Render/Railway with `APILLOW_API_KEY` set.
2. Copy `public/config.example.js` to `public/config.js`.
3. Set `window.COMPS_API_BASE_URL` to the hosted backend URL.
4. Commit and push `public/config.js`.

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
