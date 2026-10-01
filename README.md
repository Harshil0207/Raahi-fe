# Raahi — customer & rider app

React + Vite frontend for the Raahi ride-booking backend. One codebase serves
both sides: customers book and track rides, riders go online and drive them.
Which app you get is decided by the role on your account, not by the URL you
visit.

Designed mobile-first. The information hierarchy is built for a 360–430px phone
and opens out into a map-plus-panel layout from `md` up, rather than a desktop
screen squeezed down.

## Running it

```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:3000
```

The port is not arbitrary: the backend pins CORS and the Socket.IO handshake to
`FRONTEND_URL`, which defaults to `http://localhost:3000`. Running the client
anywhere else gets rejected — change both or neither.

Start the backend first (`npm run dev` in the project root). With it down, the
app still loads and says so rather than hanging.

| Variable | Meaning |
| --- | --- |
| `VITE_API_URL` | Backend API root, including `/api/v1` |
| `VITE_SOCKET_URL` | Socket.IO origin, no path suffix |
| `VITE_MAP_TILE_URL` | Tile template. Defaults to OpenStreetMap's public server — fine for development, swap it for production traffic |
| `VITE_MAP_TILE_ATTRIBUTION` | Attribution shown on the map |

There is no map API key here. Search, geocoding and routing all go through the
backend, which owns the provider choice and any key.

## How the two apps fit together

```
              register / login
                     │
         ┌───────────┴───────────┐
    role: customer          role: rider
         │                       │
  /  home + booking        /rider  dashboard
  /ride/:id  live ride     /rider/ride/:id  active ride
  /rides     history       /rider/rides     history
  /profile                 /rider/profile   + vehicle
```

Route guards keep each role inside its own app: a customer who lands on a rider
URL is redirected home rather than shown a permission error.

## Server is authoritative

The backend decides fares, ride status, rider assignment, OTP validity and
request expiry. The frontend never computes any of them.

- **Fares** come from `GET /maps/directions`, which returns the route *and* the
  price the server would charge. Nothing multiplies distance by a rate here.
- **Ride status** is refetched after every socket event. Socket payloads are
  partial, so they patch the local copy for an instant response and then
  trigger a read — the socket decides *when* to look, never *what is true*.
- **The 20-second window** counts down to the `expiresAt` the server sent, on
  every tick. It is never a local 20-second timer. Background the tab, reload
  the page, or run with a skewed clock and the number still lands correctly,
  and a late accept is refused by the backend regardless of what was on screen.
- **Losing a race** is a normal outcome: when another rider accepts first, the
  card disappears with an explanation instead of erroring.

## Real-time

One socket per session, authenticated with the same access token the REST API
uses. Ride rooms are joined by asking the server, which checks membership
against the database, and re-joined automatically after a reconnect.

Handled: `ride:new`, `ride:accepted`, `ride:expired`, `ride:no_riders`,
`ride:arriving`, `ride:arrived`, `ride:started`, `ride:completed`,
`ride:cancelled`, `rider:location`, `payment:updated`.

When the socket drops, a banner says live updates are paused rather than leaving
a stale screen looking current.

## Location

The app cannot turn anyone's GPS on and does not pretend to. It asks the browser
for permission; the user decides. Denied, unavailable and timeout are each
handled with a message and a way forward — every location can also be set by
dropping a pin on the map, which is what makes booking possible even when the
geocoding provider is unreachable.

Riders stream their position while online, more often during an active ride, and
updates that would not move the marker are skipped before the request is made.

## Auth

Access token in memory (mirrored to `localStorage` so a refresh survives),
refresh token in the backend's httpOnly cookie — so the long-lived credential is
never touched by JavaScript. A 401 triggers one shared refresh; parallel
requests wait on it rather than each rotating the token and invalidating the
session. If refresh fails, the app drops cleanly to signed-out.

## Layout

```
src/
  components/
    common/    app bar, logo, error boundary, profile screen, connection banner
    ui/        button, input, card, sheet, badge, switch, skeleton
    map/       provider-agnostic map, markers, tile config
    ride/      route preview, fare, progress rail, OTP display and input
    customer/  place picker, finding-rider, payment panel
    rider/     online card, incoming request, countdown ring
  pages/       auth/ customer/ rider/
  layouts/     auth shell, app shell with bottom nav
  routes/      route table and guards
  hooks/       useAuth, useGeolocation, useSocket, useRide, useRiderLocation,
               useCountdown, useMediaQuery, useDebouncedValue
  services/    axios instance + one module per backend area
  socket/      connection, ride rooms
  utils/       formatting, geo, polyline decoding
  constants/   ride status, socket events, roles
  validators/  form rules mirroring the backend's
```

Components never call axios directly; everything goes through `services/`.

## Maps

`components/map/` is the seam. `MapView` takes points and draws them; nothing
above it knows Leaflet exists, and `tileProvider.js` is the only file naming a
tile source. Encoded polylines from the backend decode the same way whether they
came from Google Directions or OSRM.

Leaflet is loaded lazily, so auth and history screens never download it.

## Accessibility and motion

Semantic markup, labelled icon-only controls, visible focus rings, 44px minimum
touch targets, and live regions on the things that change under you. Animation
is feedback, not decoration, and `prefers-reduced-motion` turns it off.

Dark by default with a light theme that is a real theme, not an afterthought —
every colour is a semantic token redefined per theme, so no component names a
raw colour.

## Checks

```bash
npm run lint
npm run build
```

Both are clean. What was verified against a running backend: registration and
login for both roles, role-based routing, session restoration across a refresh,
booking with a server-priced fare, socket dispatch to a nearby rider, the
countdown surviving a page reload without restarting, expiry withdrawing the
accept button, two riders racing with exactly one winner, OTP rejection then
acceptance, trip start and completion, cash settlement reaching the customer
over the socket, and UPI reporting that it is not enabled instead of faking a
success. Layout was checked at 360, 390, 430 and 1280px with no horizontal
overflow and no console errors.

## Not built

Ride ratings, scheduled rides, fare breakdowns beyond distance, and push
notifications. UPI shows the backend's 501 rather than a fake success — the
frontend is ready for it the moment a gateway is wired up.



Admin : admin@gmail.com
password : Admin12345
