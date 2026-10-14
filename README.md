# AI Car Mechanic (prototype)

Mobile app: record a car noise, or type a description, and get back a ranked list of
likely faults with confidence %, severity, UK repair cost estimate, safety notes, and
evidence  all stored locally so you can browse past scans and manage multiple
vehicles in a garage.

Built with Expo (React Native) + TypeScript. No backend everything (vehicles, scan
history, settings, profile) is stored on-device via AsyncStorage. Two AI backends:
Gemini for the experimental audio-based diagnosis, Groq for the typed-description
diagnosis (see below).

## Project structure

```
App.tsx                          Root: providers + navigation
src/
  navigation/
    RootNavigator.tsx            Root stack: MainTabs + modal ScanFlow
    MainTabs.tsx                 Bottom tabs: Home, History, Scan(center), Garage, Profile
    ScanStackNavigator.tsx       Scan -> Processing -> Results (modal stack)
    ProfileStackNavigator.tsx    Profile -> Settings
  screens/
    HomeScreen.tsx               Scan button, vehicle selector, previous scans, pending-scan banner
    ScanScreen.tsx                Record mode (timer, spinner, noise warning) or Describe mode (text)
    ProcessingScreen.tsx         Audio: reflects live retry-queue state. Text: single Groq call.
    ResultsScreen.tsx            Fault/safety/costs/evidence, save/share/find-garage/scan-again
    GarageScreen.tsx             Vehicle list, add/edit/delete, select active vehicle
    HistoryScreen.tsx            Past scans: date, vehicle, diagnosis, confidence, notes
    SettingsScreen.tsx           Dark mode, units, notifications, privacy, delete data
    ProfileScreen.tsx            Name/email/phone/picture, vehicle count, subscription stub
  components/
    DiagnosisCard.tsx            One fault: name, confidence bar, severity, cost, time
    VehicleFormModal.tsx         Add/edit vehicle form (make/model/year/engine/fuel/reg/mileage)
  context/
    AppDataContext.tsx           Single source of truth: vehicles, scans, settings, profile, and
                                  the audio-scan retry queue (persisted to AsyncStorage on every change)
  services/
    gemini.ts                    Sends recorded audio + vehicle info to Gemini, parses JSON
    groq.ts                      Sends a typed description + vehicle info to Groq, parses JSON
    diagnosisParsing.ts          Shared JSON validation/normalization used by both backends
    apiError.ts                  ApiError class carrying an HTTP status + retryable flag
    audioCache.ts                Copies a recording to the permanent document directory
    storage.ts                   Typed AsyncStorage read/write helpers
  types/
    index.ts                     Vehicle, ScanRecord, PendingScan, DiagnosisResponse, AppSettings, ...
  theme/
    colors.ts                    Light + dark palettes, resolved via AppDataContext
```

## Setup

1. Install dependencies (already done if you just cloned this):
   ```bash
   npm install
   ```
2. Get a free Gemini API key from https://aistudio.google.com/apikey
3. Copy `.env.example` to `.env` and paste your key in:
   ```bash
   cp .env.example .env
   ```
4. Start the dev server:
   ```bash
   npx expo start
   ```
   - Scan the QR code with **Expo Go** on iPhone or Android to run it there.
   - `npx expo start --tunnel` if the phone isn't on the same Wi-Fi.

## Building an Android APK

```bash
npx expo install eas-cli   # if not already available
npx eas login
npx eas build -p android --profile preview
```

## Two ways to scan

**Record** (default): records audio (`expo-audio`), reads it as base64
(`expo-file-system`), and sends it inline to Gemini's `generateContent` endpoint
alongside the vehicle info, requesting a structured JSON diagnosis.

**Describe**: type the symptom as text, sent to Groq (`llama`/`gpt-oss` class model)
using the same JSON schema. This is the more reliable path  it's the same kind of
text-based diagnosis the very first version of this app shipped with, just now living
inside the new Scan flow alongside audio.

**Be clear-eyed about the audio path**: there is no free-tier API that does validated
acoustic fault classification (e.g. reliably telling a worn brake pad squeal apart
from a belt squeal from the waveform alone)  that requires a model trained on a
large labelled dataset of car fault sounds, which doesn't exist as an off-the-shelf
service. Gemini is a general multimodal model, not a purpose-built diagnostic
classifier, so its audio-based diagnosis is a best-effort guess, not a validated
result. The prompt explicitly instructs it to stay conservative and honest about
uncertainty, and the Results screen labels audio-sourced results as "Experimental
audio analysis  treat as a rough guide" (text-sourced results get a milder
"AI-generated diagnosis" label). Don't present either as more reliable than it is.

## Audio scans: cached immediately, retried until they succeed

Free-tier Gemini occasionally returns 429/5xx errors under load. To make that a
non-issue:

1. The instant you stop recording, the clip is copied out of the OS-managed cache
   directory into the app's permanent document directory (`src/services/audioCache.ts`)
    safe from being cleared under storage pressure  and a `PendingScan` is written
   to AsyncStorage *before any network call happens*.
2. The actual retry loop lives in `AppDataContext`, not in `ProcessingScreen`  so it
   keeps running even if you navigate away from that screen, switch tabs, or the
   screen gets frozen by `react-native-screens`. It's tied to the app's root provider,
   which is always mounted for as long as the app process is alive.
3. `src/services/apiError.ts` classifies failures: HTTP 429/5xx and dropped-network
   errors are retryable (exponential backoff, 3s → 30s cap, retried indefinitely);
   things like a missing/invalid API key are not, and surface immediately as a
   "Retry Scan" / "Discard" choice instead of looping forever.
4. On relaunch, any recordings still pending (app was closed mid-retry) resume
   automatically  nothing is silently lost.

**The one real limit**: this only survives while the app process is alive (foreground
or backgrounded-but-not-killed). True OS-level background retry after the app is
force-quit would need a native background task (e.g. via a custom dev client with
`expo-task-manager`), which is out of scope for an Expo Go prototype.

## What's local-only (by design, for now)

Vehicles, scan history, settings, and profile all live in AsyncStorage on the
device  nothing is synced to a server, there's no login, and no backend exists.
That means the following from the original feature list are intentionally **not**
built yet, since they each require real infrastructure decisions:

- **Nearby Garages** (needs a paid Maps/Places API key)  the "Find Garage" button
  currently shows a "coming soon" message.
- **Premium/Subscription/payments**  the Profile screen shows a "Free plan" stub;
  wiring up real billing needs App Store/Play Store compliance work.
- **Push notifications, server-triggered reminders (MOT/road tax/recalls)**  needs a
  backend to schedule and send them. The in-app notifications bell is currently a
  static placeholder.
- **Admin Dashboard, user accounts/login**  needs a real backend, database, and auth.
- **Emergency calling**  deliberately not built even as a stub; a real implementation
  should only ever open the phone's own dialer (`tel:` link) for the user to confirm
  and place the call themselves, never dial automatically.

## Security note (prototype only)

Both `EXPO_PUBLIC_GROQ_API_KEY` and `EXPO_PUBLIC_GEMINI_API_KEY` get bundled into the
app and are visible to anyone who inspects it. Fine for local testing; before sharing
a build with anyone else, put a tiny backend proxy in front of these APIs so the real
keys never leave your server.
