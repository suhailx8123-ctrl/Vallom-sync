<img width="1920" height="1080" alt="brave_IGIpDorxQz" src="https://github.com/user-attachments/assets/66e23ca2-c930-40e6-b680-54f62401814e" /># Vallam Sync 🛶

**Vallam Sync** is an intelligent IoT telemetry and AI coaching platform designed specifically for traditional Kerala Vallamkali (snake boat) rowing. It synchronizes performance data across the crew, visualizes real-time metrics, and provides actionable AI coaching feedback to improve rhythm, consistency, and pacing.
<img width="1920" height="1080" alt="brave_9qEiwtjQAW" src="https://github.com/user-attachments/assets/ee710e5d-71b1-43ce-a2fc-0216da943edd" />

<img width="1920" height="1080" alt="brave_IGIpDorxQz" src="https://github.com/user-attachments/assets/b296cbba-2267-462e-b00f-223e2d8792b0" />


<img width="900" height="1600" alt="WhatsApp Image 2026-08-30 at 11 48 14 AM" src="https://github.com/user-attachments/assets/0f4e984b-cd83-4f06-aec0-9e13e5deba02" />

<img width="900" height="1600" alt="WhatsApp Image 2026-08-30 at 11 48 14 AM (1)" src="https://github.com/user-attachments/assets/332c23ea-4a9c-4ca5-b620-bac8132148ec" />


## 🌟 Features

*   **Real-Time Telemetry**: Tracks Strokes Per Minute (SPM), peak/average acceleration, and stroke count using an MPU6500 accelerometer on the athlete's paddle/boat.
*   **Full-Stack SPM Synchronization**: Bidirectional synchronization of the "Target SPM" between the web dashboard and the ESP32 hardware. Change the target pace on the dashboard, and the hardware instantly updates.
*   **Gemini AI Coach**: Integrates with Google's Gemini AI to analyze live rowing data and provide short, actionable coaching messages (e.g., "Control your pace", "Build rhythm slowly").
*   **Haptic & Visual Feedback**: Uses an OLED display to show live stats and AI messages, and a motor for haptic feedback when the athlete's pace drops below the target.
*   **Live Web Dashboard**: A Next.js web application featuring telemetry gauges, rhythm visualizers, AI speech feeds, and crew sync grids.

## 🏗️ Architecture

The project is split into two main components:

1.  **`main/` (Hardware Firmware)**
    *   **Microcontroller**: ESP32
    *   **Sensors**: MPU6500 (6-axis motion tracking)
    *   **Display**: SSD1306 OLED (I2C)
    *   **Actuators**: Vibration motor for haptic feedback
    *   **Connectivity**: WiFi (UDP for local gateway sync, HTTPS for web telemetry and Gemini AI API)
    *   **Codebase**: C++ / Arduino (`main.ino`)

2.  **`web-server/` (Web Dashboard & API)**
    *   **Framework**: Next.js (App Router), React, Tailwind CSS
    *   **Backend**: Next.js API Routes (`/api/telemetry`, `/api/settings`, `/api/coach`)
    *   **State Management**: In-memory global store (Vercel Serverless runtime cache)
    *   **UI Components**: Real-time gauges, waveform visualizers, mode selectors.

## 🚀 Getting Started

### Hardware Setup (ESP32)

1.  Open the `main/main.ino` file in the Arduino IDE or VS Code with the Arduino extension.
2.  Install the required libraries:
    *   `Adafruit GFX Library`
    *   `Adafruit SSD1306`
3.  Update the configuration variables in `main.ino`:
    *   `WIFI_SSID` and `WIFI_PASSWORD`
    *   `GATEWAY_IP` (if using the local UDP gateway feature)
    *   `GEMINI_API_KEY` (Your Google Gemini API Key)
    *   `WEB_API_URL` (The URL of your deployed Next.js web server, e.g., `https://your-app.vercel.app/api/telemetry`)
4.  Connect your ESP32, MPU6500, OLED, and Motor according to the defined pins (`TOUCH_PIN 15`, `MOTOR_PIN 4`, `I2C_SDA 21`, `I2C_SCL 22`).
5.  Compile and upload to the ESP32.

### Web Server Setup (Next.js)

1.  Navigate to the `web-server` directory:
    ```bash
    cd web-server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

## 📡 API Endpoints

*   **`POST /api/telemetry`**: Receives live JSON telemetry from the ESP32. Responds with the latest `targetSPM` to keep the hardware in sync.
*   **`GET /api/telemetry`**: Polled by the frontend to retrieve the latest athlete stats and history.
*   **`POST /api/settings`**: Updates the global `targetSPM` when the user changes modes on the dashboard.
*   **`POST /api/coach`**: Manually triggers the Gemini AI analysis from the dashboard.

## 🛠️ Modes of Operation

*   **NORMAL**: Base cruising pace (90 SPM).
*   **MEDIUM**: Elevated racing pace (100 SPM).
*   **HIGH_SPEED**: Sprint pace (120 SPM).
*   **CUSTOM**: Allows the coach/user to manually input a specific Target SPM (40-150) on the web dashboard.

---
*Developed for Kerala Vallamkali (Snake Boat) Racing.*
