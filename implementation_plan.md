# Full System Implementation Plan: Vallam Sync

This document serves as a comprehensive architectural and implementation guide for the entire **Vallam Sync** project. It outlines how the hardware, firmware, web backend, and frontend collaborate to create an intelligent Kerala Vallamkali rowing performance system.

---

## 1. System Architecture Overview

Vallam Sync is an end-to-end IoT system composed of an ESP32 hardware client and a Next.js full-stack web application. The core objective is to monitor a rower's performance, visualize the data in real-time, synchronize stroke targets across the crew, and provide automated AI coaching.

### Data Flow Diagram

1. **Sensor Acquisition**: The MPU6500 accelerometer samples motion data.
2. **Stroke Processing**: The ESP32 processes acceleration vectors to detect strokes, calculate SPM (Strokes Per Minute), and evaluate pace context.
3. **Local Sync**: The ESP32 broadcasts UDP packets locally to other ESP32 nodes (e.g., a gateway or other athletes).
4. **Cloud Telemetry**: The ESP32 sends a JSON payload containing the stroke statistics to the Next.js `/api/telemetry` endpoint via HTTPS.
5. **Dashboard Polling**: The Next.js frontend polls the backend telemetry endpoint every 600ms to update the React UI.
6. **Command Sync**: The Next.js API responds to the hardware telemetry payload with the current `targetSPM`, enforcing two-way synchronization.
7. **AI Analysis**: 
    - *Hardware Level*: The ESP32 directly queries the Google Gemini API every 10 seconds (or immediately upon a rapid pace change) for concise, OLED-friendly coaching tips.
    - *Web Level*: The dashboard can manually trigger a more robust Gemini coaching analysis via `/api/coach`.

---

## 2. Hardware Implementation (ESP32)

**Location:** `main/main.ino`

### Core Components
- **Microcontroller:** ESP32
- **IMU:** MPU6500 (I2C)
- **Display:** SSD1306 128x64 OLED (I2C)
- **Actuator:** 3V Vibration Motor (GPIO 4)
- **Input:** Capacitive Touch Sensor (GPIO 15)

### Key Functional Blocks
- **Sensor Polling (`readMPU6500`)**: Reads raw XYZ acceleration registers and converts them to standard `m/s²`.
- **Stroke Detection Algorithm**: Triggers a "stroke" when the composite 3D acceleration vector magnitude exceeds `15.0 m/s²`. A minimum debounce delay (`MIN_STROKE_DELAY` = 400ms) prevents double-counting.
- **Pace Analysis**: Compares current SPM to the previous SPM. Flags rapid increases (difference >= 15), rapid drops (difference <= -15), or rhythm instability (absolute difference >= 8).
- **Feedback Mechanisms**: 
  - *Haptic*: Triggers the motor if the athlete's SPM falls more than 5 strokes below the `targetSPM` or if a rapid pace change is detected.
  - *Visual*: Updates the OLED display with SPM, target, warnings, and AI feedback.
- **Connectivity**:
  - `sendWiFiData()`: Broadcasts raw SPM data via UDP to local peers for immediate synchronization on the boat.
  - `sendTelemetryToWeb()`: Formats stats into a JSON payload and uses `HTTPClient` (over `WiFiClientSecure`) to POST to the Next.js API. Parses the JSON response to extract and update the local `targetSPM`.
- **Edge AI Integration (`analyzeWithGemini`)**: Formats an aggressive, tiny prompt containing the current stats and pace context. Makes a direct secure HTTPS call to the Gemini API (`v1beta/models/gemini-3.5-flash:generateContent`). The response is manually parsed to extract the text string, escaping characters, and printing it to the OLED.

---

## 3. Web Backend Implementation

**Framework:** Next.js App Router API
**Location:** `web-server/app/api/` and `web-server/lib/`

### Global State Management (`lib/store.ts`)
Since Next.js API routes are stateless serverless functions, state is maintained in-memory using a `global` object (`global.vallamStore`). This persists data across hot-reloads and between API requests within the same Vercel execution environment.
- Tracks a `Map` of connected athletes.
- Maintains an array of `history` packets (max 200) for graphing.
- Stores the `globalTargetSPM` and `latestAdvice`.

### API Routes
- **`POST /api/telemetry`**: The ingestion endpoint for the ESP32. Updates the global store with the new telemetry packet. Responds with `{ success: true, received: packet, targetSPM: globalTargetSPM }`.
- **`GET /api/telemetry`**: Exposes the `athletes` array, recent `history`, and `latestAdvice` for the React frontend to poll.
- **`POST /api/settings`**: Accepts `{ target_spm }` updates from the web dashboard and mutates the `globalTargetSPM`.

---

## 4. Web Frontend Implementation

**Framework:** React, Tailwind CSS, Next.js App Router
**Location:** `web-server/app/page.tsx` & `web-server/components/`

### Page State & Sync Logic (`page.tsx`)
- Maintains local React state for `telemetry`, `mode`, `targetSPM`, `history`, and `isConnected`.
- Implements two primary `useEffect` synchronization loops:
  - **Downstream (Hardware -> Web)**: A 600ms polling interval fetches `/api/telemetry` and updates the React gauges and history.
  - **Upstream (Web -> Hardware)**: A reactive listener detects changes to `targetSPM` and POSTs the new value to `/api/settings`.
- **Data Simulator**: Contains a complex `useEffect` that mimics a rowing session if no hardware is connected. It generates realistic biomechanical drift, noise, and pace contexts (e.g., "RAPID PACE INCREASE") to validate the UI visually.

### UI Components
- **`Header.tsx`**: Navigation bar containing the status badge, Mode selection (NORMAL, MEDIUM, HIGH_SPEED, CUSTOM), and Simulator toggle. In `CUSTOM` mode, it renders an unconstrained numeric input allowing coaches to define specific pace rhythms.
- **`TelemetryGauges.tsx`**: Renders large, high-contrast numerical metrics for SPM, Acceleration, and Consistency %.
- **`RhythmVisualizer.tsx`**: Graphs the `history` of SPM over time against the `targetSPM` benchmark, providing a visual cue of the athlete's pacing stability.
- **`AISpeechFeed.tsx`**: Displays the latest coaching advice and provides a manual trigger to request new Gemini analysis.
- **`CrewSyncGrid.tsx`**: Shows the status of multiple athletes, highlighting who is in sync and who is dropping pace.

---

## 5. Security & Configuration Notes

- The ESP32 is currently configured with `client.setInsecure()` for HTTPS requests, which bypasses SSL certificate validation. This is standard for hackathons or prototyping but should be updated with a proper Root CA cert pool for production deployments.
- The `GEMINI_API_KEY` is hardcoded into the ESP32 firmware.
- The Next.js environment utilizes `.env.local` to store secure web server configurations if necessary.
