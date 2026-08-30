#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiUdp.h>
#include <Wire.h>

// =========================================================
// VALLAM SYNC
// ESP32 + MPU6500 + OLED + GEMINI AI COACH
// WIFI UDP ESP-TO-ESP COMMUNICATION
// =========================================================

// =========================================================
// ATHLETE
// =========================================================

#define ATHLETE_ID 1

// =========================================================
// WIFI
// =========================================================

const char *WIFI_SSID = "Tinker Space";
const char *WIFI_PASSWORD = "123tinkerspace";
const char *WEB_API_URL = "https://vallom-sync-one.vercel.app/api/telemetry";

// =========================================================
// WIFI UDP
// =========================================================

// IMPORTANT:
// Change this to the IP address of your RECEIVER/GATEWAY ESP32.

IPAddress GATEWAY_IP(192, 168, 1, 100);

// UDP port used for ESP-to-ESP communication
const uint16_t UDP_PORT = 4210;

// Local UDP object
WiFiUDP udp;

// =========================================================
// GEMINI
// =========================================================

// IMPORTANT:
// Use your own Gemini API key.
const char *GEMINI_API_KEY =
    "AQ.Ab8RN6LZYl60Fp4Pv81ux3i9xsoTOS-6afO_Z_EkQGcBpaHXUg";

// Gemini model
const char *GEMINI_MODEL = "gemini-3.5-flash";

// =========================================================
// PINS
// =========================================================

#define TOUCH_PIN 15
#define MOTOR_PIN 4

#define I2C_SDA 21
#define I2C_SCL 22

// =========================================================
// OLED
// =========================================================

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDRESS 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// =========================================================
// MPU6500
// =========================================================

#define MPU6500_ADDRESS 0x68

#define MPU_WHO_AM_I 0x75
#define MPU_PWR_MGMT_1 0x6B
#define MPU_ACCEL_CONFIG 0x1C
#define MPU_CONFIG 0x1A
#define MPU_ACCEL_XOUT_H 0x3B

// MPU6500 ±4G
#define ACCEL_SCALE 8192.0

// =========================================================
// ROWING SETTINGS
// =========================================================

const float ACCEL_THRESHOLD = 15.0;

const unsigned long MIN_STROKE_DELAY = 400;

// =========================================================
// AI SETTINGS
// =========================================================

const unsigned long AI_ANALYSIS_INTERVAL = 10000UL;

const unsigned long AI_CONTEXT_COOLDOWN = 5000UL;

const int RAPID_INCREASE_THRESHOLD = 15;
const int RAPID_DECREASE_THRESHOLD = 15;

const int RHYTHM_CHANGE_THRESHOLD = 8;

// =========================================================
// MODES
// =========================================================

enum Mode { NORMAL, MEDIUM, HIGH_SPEED, CUSTOM };

Mode currentMode = NORMAL;

int targetSPM = 90;

// =========================================================
// STROKE DATA
// =========================================================

unsigned long lastStrokeTime = 0;
unsigned long lastDebounceTime = 0;

int currentSPM = 0;
int previousSPM = 0;

// =========================================================
// PERFORMANCE DATA
// =========================================================

int strokeCount = 0;

float accelerationSum = 0;
float accelerationMax = 0;

int spmSum = 0;
int spmSamples = 0;

// =========================================================
// AI CONTEXT
// =========================================================

String paceContext = "NORMAL";

String aiMessage = "AI READY";

volatile bool aiRunning = false;

unsigned long lastAIRequest = 0;

bool rapidChangeDetected = false;

// =========================================================
// TOUCH
// =========================================================

bool lastTouchState = LOW;

unsigned long lastTouchTime = 0;

// =========================================================
// MOTOR
// =========================================================

bool motorIsOn = false;

unsigned long motorStartTime = 0;

// =========================================================
// WIFI UDP DATA
// =========================================================

struct WiFiData {

  int athlete_id;

  int current_spm;

  int target_spm;
};

// =========================================================
// MPU WRITE
// =========================================================

void mpuWriteByte(uint8_t reg, uint8_t data) {

  Wire.beginTransmission((uint8_t)MPU6500_ADDRESS);

  Wire.write(reg);
  Wire.write(data);

  Wire.endTransmission();
}

// =========================================================
// MPU READ
// =========================================================

uint8_t mpuReadByte(uint8_t reg) {

  Wire.beginTransmission((uint8_t)MPU6500_ADDRESS);

  Wire.write(reg);

  if (Wire.endTransmission(false) != 0) {

    return 0xFF;
  }

  Wire.requestFrom((uint8_t)MPU6500_ADDRESS, (uint8_t)1);

  if (Wire.available()) {

    return Wire.read();
  }

  return 0xFF;
}

// =========================================================
// INITIALIZE MPU6500
// =========================================================

bool initializeMPU6500() {

  Serial.println();
  Serial.println("Initializing MPU6500...");

  uint8_t whoAmI = mpuReadByte(MPU_WHO_AM_I);

  Serial.print("WHO_AM_I = 0x");
  Serial.println(whoAmI, HEX);

  if (whoAmI != 0x70) {

    Serial.println("ERROR: MPU6500 not detected!");

    return false;
  }

  Serial.println("MPU6500 detected!");

  // Wake up MPU
  mpuWriteByte(MPU_PWR_MGMT_1, 0x00);

  delay(100);

  // Accelerometer ±4G
  mpuWriteByte(MPU_ACCEL_CONFIG, 0x08);

  // Low pass filter
  mpuWriteByte(MPU_CONFIG, 0x03);

  delay(100);

  Serial.println("MPU6500 READY!");

  return true;
}

// =========================================================
// READ MPU6500
// =========================================================

void readMPU6500(float &accelX, float &accelY, float &accelZ) {

  Wire.beginTransmission((uint8_t)MPU6500_ADDRESS);

  Wire.write((uint8_t)MPU_ACCEL_XOUT_H);

  if (Wire.endTransmission(false) != 0) {

    accelX = 0;
    accelY = 0;
    accelZ = 0;

    return;
  }

  Wire.requestFrom((uint8_t)MPU6500_ADDRESS, (uint8_t)6);

  if (Wire.available() < 6) {

    accelX = 0;
    accelY = 0;
    accelZ = 0;

    return;
  }

  int16_t rawX = ((int16_t)Wire.read() << 8) | Wire.read();

  int16_t rawY = ((int16_t)Wire.read() << 8) | Wire.read();

  int16_t rawZ = ((int16_t)Wire.read() << 8) | Wire.read();

  accelX = (rawX / ACCEL_SCALE) * 9.80665;

  accelY = (rawY / ACCEL_SCALE) * 9.80665;

  accelZ = (rawZ / ACCEL_SCALE) * 9.80665;
}

// =========================================================
// TARGET SPM
// =========================================================

void setTargetSPM() {

  switch (currentMode) {

  case NORMAL:

    targetSPM = 90;

    break;

  case MEDIUM:

    targetSPM = 120;

    break;

  case HIGH_SPEED:

    targetSPM = 140;

    break;

  case CUSTOM:

    targetSPM = 95;

    break;
  }
}

// =========================================================
// MOTOR ON
// =========================================================

void startMotor() {

  digitalWrite(MOTOR_PIN, HIGH);

  motorIsOn = true;

  motorStartTime = millis();
}

// =========================================================
// MOTOR UPDATE
// =========================================================

void updateMotor() {

  if (motorIsOn && millis() - motorStartTime >= 100) {

    digitalWrite(MOTOR_PIN, LOW);

    motorIsOn = false;
  }
}

// =========================================================
// OLED MAIN SCREEN
// =========================================================

void updateDisplay() {

  display.clearDisplay();

  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);

  display.setCursor(0, 0);

  display.print("VALLAM SYNC");

  display.setCursor(105, 0);

  display.print(ATHLETE_ID);

  display.setCursor(0, 11);

  display.print("MODE: ");

  switch (currentMode) {

  case NORMAL:

    display.println("NORMAL");

    break;

  case MEDIUM:

    display.println("MEDIUM");

    break;

  case HIGH_SPEED:

    display.println("HIGH");

    break;

  case CUSTOM:

    display.println("CUSTOM");

    break;
  }

  display.setTextSize(2);

  display.setCursor(0, 24);

  display.print("SPM ");

  display.println(currentSPM);

  display.setTextSize(1);

  display.setCursor(0, 48);

  display.print("TARGET ");

  display.print(targetSPM);

  display.setCursor(70, 48);

  if (aiRunning) {

    display.print("AI...");

  } else {

    display.print("AI OK");
  }

  display.display();
}

// =========================================================
// PACE WARNING
// =========================================================

void showPaceWarning(const char *title, const char *message) {

  display.clearDisplay();

  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);

  display.setCursor(0, 0);

  display.println("!! VALLAM SYNC !!");

  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  display.setTextSize(2);

  display.setCursor(0, 17);

  display.println(title);

  display.setTextSize(1);

  display.setCursor(0, 42);

  display.println(message);

  display.setCursor(0, 54);

  display.print("SPM:");

  display.print(currentSPM);

  display.print(" T:");

  display.print(targetSPM);

  display.display();
}

// =========================================================
// AI MESSAGE DISPLAY
// =========================================================

void showAIMessage(String message) {

  display.clearDisplay();

  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);

  display.setCursor(0, 0);

  display.println("AI COACH");

  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Limit message
  if (message.length() > 120) {

    message = message.substring(0, 120);
  }

  // Remove quotes
  message.replace("\"", "");

  int line = 0;

  String lineText = "";

  for (int i = 0; i <= message.length(); i++) {

    char c = (i < message.length()) ? message[i] : ' ';

    if (c == ' ' || c == '\n') {

      if (lineText.length() > 0) {

        if (lineText.length() + 1 > 20) {

          display.setCursor(0, 14 + line * 9);

          display.println(lineText);

          line++;

          lineText = "";
        }

        if (lineText.length() > 0) {

          lineText += " ";
        }
      }

    } else {

      lineText += c;
    }

    if (line >= 5) {

      break;
    }
  }

  if (line < 5 && lineText.length() > 0) {

    display.setCursor(0, 14 + line * 9);

    display.println(lineText);
  }

  display.display();
}

// =========================================================
// WIFI
// =========================================================

void connectWiFi() {

  Serial.println();
  Serial.println("Connecting to WiFi...");

  WiFi.mode(WIFI_STA);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 30) {

    delay(500);

    Serial.print(".");

    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("WiFi CONNECTED!");

    Serial.print("Sender IP address: ");

    Serial.println(WiFi.localIP());

    Serial.print("Gateway IP address: ");

    Serial.println(GATEWAY_IP);

  } else {

    Serial.println("WiFi connection FAILED!");
  }
}

// =========================================================
// UDP WIFI SEND
// =========================================================

void sendWiFiData() {

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("WiFi disconnected - data not sent.");

    return;
  }

  WiFiData data;

  data.athlete_id = ATHLETE_ID;

  data.current_spm = currentSPM;

  data.target_spm = targetSPM;

  // Start UDP packet
  udp.beginPacket(GATEWAY_IP, UDP_PORT);

  // Send structure
  udp.write((uint8_t *)&data, sizeof(data));

  // Finish packet
  int result = udp.endPacket();

  if (result == 1) {

    Serial.print("UDP SENT -> ");

    Serial.print(GATEWAY_IP);

    Serial.print(" | Athlete: ");

    Serial.print(data.athlete_id);

    Serial.print(" | SPM: ");

    Serial.print(data.current_spm);

    Serial.print(" | Target: ");

    Serial.println(data.target_spm);

  } else {

    Serial.println("UDP SEND FAILED!");
  }
}

// =========================================================
// SEND TELEMETRY TO WEB
// =========================================================

void sendTelemetryToWeb() {

  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  https.setTimeout(6000);

  if (!https.begin(client, WEB_API_URL)) {
    Serial.println("HTTPS BEGIN FAILED!");
    return;
  }

  https.addHeader("Content-Type", "application/json");

  float avgAccel = (strokeCount > 0) ? (accelerationSum / strokeCount) : 0;

  float consistency = 100;
  if (targetSPM > 0) {
    float diff = abs(currentSPM - targetSPM);
    consistency = 100 - (diff / targetSPM) * 100;
    if (consistency < 0) {
      consistency = 0;
    }
  }

  String json = "{";
  json += "\"athlete_id\":" + String(ATHLETE_ID) + ",";
  json += "\"current_spm\":" + String(currentSPM) + ",";
  json += "\"target_spm\":" + String(targetSPM) + ",";
  json += "\"accel_max\":" + String(accelerationMax, 2) + ",";
  json += "\"avg_accel\":" + String(avgAccel, 2) + ",";
  json += "\"stroke_count\":" + String(strokeCount) + ",";
  json += "\"pace_context\":\"" + jsonEscape(paceContext) + "\",";
  json += "\"consistency\":" + String(consistency, 1);
  json += "}";

  int httpCode = https.POST(json);

  if (httpCode > 0) {
    Serial.print("Web Telemetry sent. HTTP code: ");
    Serial.println(httpCode);

    String response = https.getString();
    int targetIndex = response.indexOf("\"targetSPM\":");
    if (targetIndex != -1) {
      int colonIndex = response.indexOf(':', targetIndex);
      if (colonIndex != -1) {
        String targetStr = response.substring(colonIndex + 1);
        int newTarget = targetStr.toInt();
        if (newTarget > 0) {
          targetSPM = newTarget;
          Serial.print("Updated Target SPM from Web: ");
          Serial.println(targetSPM);
        }
      }
    }
  } else {
    Serial.print("Web Telemetry failed, error: ");
    Serial.println(https.errorToString(httpCode).c_str());
  }

  https.end();
}

// =========================================================
// JSON ESCAPE
// =========================================================

String jsonEscape(String input) {

  input.replace("\\", "\\\\");

  input.replace("\"", "\\\"");

  input.replace("\n", "\\n");

  input.replace("\r", "\\r");

  return input;
}

// =========================================================
// GEMINI AI
// =========================================================

void analyzeWithGemini() {

  Serial.println();
  Serial.println("========== AI COACH ==========");

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("WiFi not connected.");

    return;
  }

  if (strlen(GEMINI_API_KEY) < 20) {

    Serial.println("Gemini API key missing!");

    return;
  }

  // -------------------------------------------------------
  // Snapshot
  // -------------------------------------------------------

  int localSPM = currentSPM;

  int localPreviousSPM = previousSPM;

  int localTargetSPM = targetSPM;

  int localStrokeCount = strokeCount;

  float localAccelSum = accelerationSum;

  float localAccelMax = accelerationMax;

  int localSPMSum = spmSum;

  int localSPMSamples = spmSamples;

  String localContext = paceContext;

  // -------------------------------------------------------
  // Calculate average
  // -------------------------------------------------------

  float averageSPM = 0;

  if (localSPMSamples > 0) {

    averageSPM = (float)localSPMSum / localSPMSamples;
  }

  float averageAcceleration = 0;

  if (localStrokeCount > 0) {

    averageAcceleration = localAccelSum / localStrokeCount;
  }

  float targetDifference = abs(localSPM - localTargetSPM);

  float consistency = 100;

  if (localTargetSPM > 0) {

    consistency = 100 - (targetDifference / localTargetSPM) * 100;

    if (consistency < 0) {

      consistency = 0;
    }
  }

  // -------------------------------------------------------
  // Gemini prompt
  // -------------------------------------------------------

  String prompt =

      "You are Vallam Sync AI Coach. "
      "Vallam Sync is an intelligent "
      "traditional Kerala vallam rowing "
      "performance system. "
      "Analyze the athlete's live rowing data. "
      "Give ONE short actionable coaching message. "
      "Do not diagnose medical conditions. "
      "If there is a rapid pace increase, tell "
      "the athlete to control the pace. "
      "If there is a rapid pace decrease, tell "
      "the athlete to rebuild rhythm gradually. "
      "If rhythm is unstable, tell them to "
      "make strokes consistent. "
      "If performance is good, encourage them. "
      "Maximum 55 characters. "
      "Use simple words suitable for a tiny OLED. "

      "Context=";

  prompt += localContext;

  prompt += ", CurrentSPM=";

  prompt += String(localSPM);

  prompt += ", PreviousSPM=";

  prompt += String(localPreviousSPM);

  prompt += ", TargetSPM=";

  prompt += String(localTargetSPM);

  prompt += ", AverageSPM=";

  prompt += String(averageSPM, 1);

  prompt += ", AverageAcceleration=";

  prompt += String(averageAcceleration, 1);

  prompt += "m/s2";

  prompt += ", PeakAcceleration=";

  prompt += String(localAccelMax, 1);

  prompt += "m/s2";

  prompt += ", Consistency=";

  prompt += String(consistency, 1);

  prompt += "%.";

  Serial.println(prompt);

  // -------------------------------------------------------
  // HTTPS
  // -------------------------------------------------------

  WiFiClientSecure client;

  // Prototype / hackathon testing
  client.setInsecure();

  HTTPClient https;

  https.setTimeout(6000);

  String url = "https://generativelanguage.googleapis.com/"
               "v1beta/models/";

  url += GEMINI_MODEL;

  url += ":generateContent?key=";

  url += GEMINI_API_KEY;

  Serial.println("Connecting Gemini...");

  if (!https.begin(client, url)) {

    Serial.println("HTTPS BEGIN FAILED!");

    return;
  }

  https.addHeader("Content-Type", "application/json");

  // -------------------------------------------------------
  // JSON
  // -------------------------------------------------------

  String safePrompt = jsonEscape(prompt);

  String json = "{"
                "\"contents\":["
                "{"
                "\"parts\":["
                "{"
                "\"text\":\"";

  json += safePrompt;

  json += "\"}"
          "]"
          "}"
          "]"
          "}";

  Serial.println("Sending request...");

  int httpCode = https.POST(json);

  Serial.print("Gemini HTTP code: ");

  Serial.println(httpCode);

  // -------------------------------------------------------
  // SUCCESS
  // -------------------------------------------------------

  if (httpCode == 200) {

    String response = https.getString();

    Serial.println("Gemini response received!");

    // -----------------------------------------------------
    // Find text
    // -----------------------------------------------------

    int textIndex = response.indexOf("\"text\"");

    if (textIndex >= 0) {

      int colon = response.indexOf(':', textIndex);

      int start = response.indexOf('"', colon + 1);

      if (start >= 0) {

        start++;

        String result = "";

        bool escaped = false;

        for (int i = start; i < response.length(); i++) {

          char c = response[i];

          if (escaped) {

            if (c == 'n') {

              result += '\n';

            } else if (c == '"') {

              result += '"';

            } else if (c == '\\') {

              result += '\\';

            } else {

              result += c;
            }

            escaped = false;

          } else {

            if (c == '\\') {

              escaped = true;

            } else if (c == '"') {

              break;

            } else {

              result += c;
            }
          }
        }

        result.trim();

        if (result.length() > 0) {

          aiMessage = result;

          Serial.println();
          Serial.println("AI COACH:");

          Serial.println(aiMessage);

          showAIMessage(aiMessage);
        }

      } else {

        Serial.println("Could not parse Gemini text.");
      }

    } else {

      Serial.println("No text found in Gemini response.");

      Serial.println(response);
    }

  } else {

    Serial.println("GEMINI REQUEST FAILED");

    String error = https.getString();

    Serial.println(error);
  }

  https.end();

  Serial.println("==============================");
}

// =========================================================
// AI TASK
// =========================================================

void geminiTask(void *parameter) {

  aiRunning = true;

  analyzeWithGemini();

  aiRunning = false;

  vTaskDelete(NULL);
}

// =========================================================
// START AI
// =========================================================

void startAIAnalysis() {

  if (aiRunning) {

    return;
  }

  if (WiFi.status() != WL_CONNECTED) {

    return;
  }

  xTaskCreatePinnedToCore(geminiTask, "GeminiTask", 12000, NULL, 1, NULL, 0);
}

// =========================================================
// SETUP
// =========================================================

void setup() {

  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("================================");

  Serial.println("       VALLAM SYNC");

  Serial.println("      AI ROWING COACH");

  Serial.println("       WIFI UDP MODE");

  Serial.println("================================");

  // =======================================================
  // GPIO
  // =======================================================

  pinMode(TOUCH_PIN, INPUT);

  pinMode(MOTOR_PIN, OUTPUT);

  digitalWrite(MOTOR_PIN, LOW);

  // =======================================================
  // I2C
  // =======================================================

  Wire.begin(I2C_SDA, I2C_SCL);

  Wire.setClock(400000);

  delay(100);

  // =======================================================
  // OLED
  // =======================================================

  Serial.println("Starting OLED...");

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {

    Serial.println("OLED FAILED!");

    while (true) {

      delay(1000);
    }
  }

  Serial.println("OLED OK!");

  display.clearDisplay();

  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);

  display.setCursor(0, 0);

  display.println("VALLAM SYNC");

  display.setCursor(0, 15);

  display.println("AI ROWING COACH");

  display.setCursor(0, 30);

  display.println("ONAM RACE MODE");

  display.setCursor(0, 42);

  display.println("WIFI UDP");

  display.setCursor(0, 54);

  display.println("Starting...");

  display.display();

  delay(1000);

  // =======================================================
  // MPU6500
  // =======================================================

  if (!initializeMPU6500()) {

    display.clearDisplay();

    display.setTextSize(1);

    display.setCursor(0, 0);

    display.println("MPU6500 ERROR");

    display.setCursor(0, 20);

    display.println("WHO_AM_I failed");

    display.display();

    while (true) {

      delay(1000);
    }
  }

  // =======================================================
  // WIFI
  // =======================================================

  connectWiFi();

  // =======================================================
  // UDP
  // =======================================================

  if (WiFi.status() == WL_CONNECTED) {

    udp.begin(UDP_PORT);

    Serial.println();
    Serial.println("================================");

    Serial.println("UDP WIFI READY!");

    Serial.print("Sender IP: ");

    Serial.println(WiFi.localIP());

    Serial.print("Gateway IP: ");

    Serial.println(GATEWAY_IP);

    Serial.print("UDP Port: ");

    Serial.println(UDP_PORT);

    Serial.println("================================");

  } else {

    Serial.println("UDP waiting for WiFi...");
  }

  // =======================================================
  // INITIAL DATA
  // =======================================================

  setTargetSPM();

  updateDisplay();

  Serial.println();
  Serial.println("================================");

  Serial.println("SYSTEM READY");

  Serial.println("MPU6500: OK");

  Serial.println("OLED: OK");

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("WiFi: OK");

  } else {

    Serial.println("WiFi: OFFLINE");
  }

  Serial.println("ESP-TO-ESP: UDP");

  Serial.println("AI interval: 10 seconds");

  Serial.println("Rapid SPM detection: ON");

  Serial.println("================================");
}

// =========================================================
// LOOP
// =========================================================

void loop() {

  unsigned long currentMillis = millis();

  // =======================================================
  // TOUCH / MODE
  // =======================================================

  bool touchState = digitalRead(TOUCH_PIN);

  if (touchState == HIGH && lastTouchState == LOW &&
      currentMillis - lastTouchTime > 300) {

    lastTouchTime = currentMillis;

    currentMode = static_cast<Mode>((currentMode + 1) % 4);

    setTargetSPM();

    Serial.print("MODE: ");

    Serial.println(currentMode);

    Serial.print("NEW TARGET SPM: ");

    Serial.println(targetSPM);

    // Send new target to gateway immediately
    sendWiFiData();
    sendTelemetryToWeb();

    startMotor();

    updateDisplay();
  }

  lastTouchState = touchState;

  // =======================================================
  // MOTOR
  // =======================================================

  updateMotor();

  // =======================================================
  // MPU
  // =======================================================

  float accelX;
  float accelY;
  float accelZ;

  readMPU6500(accelX, accelY, accelZ);

  // =======================================================
  // ACCELERATION MAGNITUDE
  // =======================================================

  float magnitude = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

  // =======================================================
  // STROKE DETECTION
  // =======================================================

  if (magnitude > ACCEL_THRESHOLD &&
      currentMillis - lastDebounceTime > MIN_STROKE_DELAY) {

    Serial.println();
    Serial.println("******** STROKE ********");

    Serial.print("Acceleration: ");

    Serial.print(magnitude, 2);

    Serial.println(" m/s2");

    // =====================================================
    // CALCULATE SPM
    // =====================================================

    if (lastStrokeTime > 0) {

      unsigned long interval = currentMillis - lastStrokeTime;

      if (interval > 0) {

        currentSPM = 60000 / interval;
      }

      // Limit SPM
      if (currentSPM > 200) {

        currentSPM = 200;
      }

      if (currentSPM < 20) {

        currentSPM = 20;
      }

      // ===================================================
      // SPM CHANGE ANALYSIS
      // ===================================================

      if (previousSPM > 0) {

        int difference = currentSPM - previousSPM;

        // -------------------------------------------------
        // RAPID INCREASE
        // -------------------------------------------------

        if (difference >= RAPID_INCREASE_THRESHOLD) {

          paceContext = "RAPID PACE INCREASE";

          rapidChangeDetected = true;

          Serial.println("!!! RAPID PACE INCREASE !!!");

          Serial.print("SPM change: +");

          Serial.println(difference);

          showPaceWarning("PACE UP!", "Control your pace.");

          startMotor();
        }

        // -------------------------------------------------
        // RAPID DECREASE
        // -------------------------------------------------

        else if (difference <= -RAPID_DECREASE_THRESHOLD) {

          paceContext = "RAPID PACE DROP";

          rapidChangeDetected = true;

          Serial.println("!!! RAPID PACE DROP !!!");

          Serial.print("SPM change: ");

          Serial.println(difference);

          showPaceWarning("PACE DROP!", "Build rhythm slowly.");

          startMotor();
        }

        // -------------------------------------------------
        // RHYTHM UNSTABLE
        // -------------------------------------------------

        else if (abs(difference) >= RHYTHM_CHANGE_THRESHOLD) {

          paceContext = "RHYTHM UNSTABLE";

          Serial.println("RHYTHM UNSTABLE");
        }

        // -------------------------------------------------
        // NORMAL
        // -------------------------------------------------

        else {

          paceContext = "NORMAL";
        }
      }

      previousSPM = currentSPM;

      // Statistics
      spmSum += currentSPM;

      spmSamples++;
    }

    // =====================================================
    // ACCELERATION STATISTICS
    // =====================================================

    accelerationSum += magnitude;

    if (magnitude > accelerationMax) {

      accelerationMax = magnitude;
    }

    strokeCount++;

    // =====================================================
    // SAVE TIME
    // =====================================================

    lastStrokeTime = currentMillis;

    lastDebounceTime = currentMillis;

    // =====================================================
    // HAPTIC FEEDBACK
    // =====================================================

    if (currentSPM < targetSPM - 5) {

      startMotor();
    }

    // =====================================================
    // OLED
    // =====================================================

    if (paceContext == "NORMAL") {

      updateDisplay();
    }

    // =====================================================
    // WIFI UDP
    // =====================================================

    sendWiFiData();
    sendTelemetryToWeb();

    // =====================================================
    // DEBUG
    // =====================================================

    Serial.print("SPM: ");

    Serial.print(currentSPM);

    Serial.print(" | Target: ");

    Serial.print(targetSPM);

    Serial.print(" | Context: ");

    Serial.println(paceContext);
  }

  // =======================================================
  // NO STROKE
  // =======================================================

  if (currentSPM > 0 && currentMillis - lastStrokeTime > 3000) {

    currentSPM = 0;

    paceContext = "NO STROKE";

    updateDisplay();

    // Tell gateway that athlete has stopped
    sendWiFiData();
    sendTelemetryToWeb();
  }

  // =======================================================
  // RAPID CHANGE AI
  // =======================================================

  if (rapidChangeDetected && !aiRunning && WiFi.status() == WL_CONNECTED &&
      currentMillis - lastAIRequest >= AI_CONTEXT_COOLDOWN) {

    rapidChangeDetected = false;

    lastAIRequest = currentMillis;

    Serial.println(">>> RAPID CHANGE AI");

    startAIAnalysis();
  }

  // =======================================================
  // NORMAL AI EVERY 10 SECONDS
  // =======================================================

  if (!aiRunning && WiFi.status() == WL_CONNECTED &&
      currentMillis - lastAIRequest >= AI_ANALYSIS_INTERVAL) {

    lastAIRequest = currentMillis;

    Serial.println(">>> 10 SECOND AI ANALYSIS");

    startAIAnalysis();
  }

  // =======================================================
  // LOOP DELAY
  // =======================================================

  delay(10);
}