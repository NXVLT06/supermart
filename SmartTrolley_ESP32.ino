/**
 * SmartTrolley_ESP32.ino
 * ─────────────────────────────────────────────────────────────
 * Smart Shopping Trolley — ESP32 / ESP8266 Firmware
 * 
 * Hardware:
 *   - ESP32 or ESP8266
 *   - MFRC522 RFID Reader (SPI)
 *   - HX711 Load Cell (weight sensor)  [optional]
 *   - Buzzer (feedback)                [optional]
 *   - LED (status indicator)           [optional]
 * 
 * How it works:
 *   1. ESP connects to WiFi
 *   2. Customer scans QR → trolleyID & phone sent to ESP (via Serial or hardcoded)
 *   3. RFID reader detects product tags → item added to cart
 *   4. ESP POSTs live data to /api/esp/update every 3 seconds
 *   5. Dashboard updates in real-time via SSE
 *   6. On checkout: server returns gate.action = "OPEN"
 *
 * Libraries needed (install via Arduino Library Manager):
 *   - MFRC522 by GithubCommunity
 *   - HX711 by bogde  (if using weight sensor)
 *   - ArduinoJson by Benoit Blanchon
 *   - HTTPClient (built-in for ESP32)
 *   - ESP8266WiFi / WiFi (built-in)
 * ─────────────────────────────────────────────────────────────
 */

#include <Arduino.h>
#include <ArduinoJson.h>

// ── Platform detection ─────────────────────────────────────────
#ifdef ESP8266
  #include <ESP8266WiFi.h>
  #include <ESP8266HTTPClient.h>
  #include <WiFiClient.h>
  #define WIFI_LIB ESP8266WiFi
#else
  #include <WiFi.h>
  #include <HTTPClient.h>
  #define WIFI_LIB WiFi
#endif

#include <SPI.h>
#include <MFRC522.h>

// ═══════════════════════════════════════════════════════════════
// ██  CONFIGURE THESE  ██████████████████████████████████████████
// ═══════════════════════════════════════════════════════════════

// WiFi credentials — same network as your PC
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server URL — use your PC's local IP (shown when server starts)
// Example: "http://192.168.1.105:3000"
const char* SERVER_URL    = "http://192.168.1.XXX:3000";
const char* ESP_API_KEY   = "esp-supermart-2024";

// Trolley identity (can be set per-trolley or via QR scan)
String trolleyID  = "T-ESP-01";
String phone      = "+919876543210";  // customer phone

// ═══════════════════════════════════════════════════════════════

// ── Pin definitions ────────────────────────────────────────────
#define RFID_SS_PIN   5    // ESP32: GPIO5  | ESP8266: D8
#define RFID_RST_PIN  22   // ESP32: GPIO22 | ESP8266: D3
#define BUZZER_PIN    2    // ESP32: GPIO2  | ESP8266: D4
#define LED_PIN       4    // ESP32: GPIO4  | ESP8266: D2
#define GATE_PIN      15   // Relay/servo for gate control

// ── RFID ───────────────────────────────────────────────────────
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);

// ── Product database: RFID UID → product info ──────────────────
// Add your actual RFID tag UIDs here (read them with RFID_ReadUID sketch)
struct Product {
  String uid;
  String sku;
  String name;
  float  unitPrice;
};

Product productDB[] = {
  { "A1B2C3D4", "GRC001", "Organic Whole Milk 1L",  65.00 },
  { "B2C3D4E5", "GRC002", "Brown Bread Loaf",        45.00 },
  { "C3D4E5F6", "GRC003", "Basmati Rice 5kg",       380.00 },
  { "D4E5F6G7", "GRC004", "Fresh Tomatoes 1kg",      40.00 },
  { "E5F6G7H8", "GRC005", "Amul Butter 500g",       232.50 },
  { "F6G7H8I9", "GRC006", "Colgate Toothpaste",      85.00 },
  { "G7H8I9J0", "GRC007", "Lays Chips",              20.00 },
};
const int PRODUCT_COUNT = sizeof(productDB) / sizeof(productDB[0]);

// ── Cart state ─────────────────────────────────────────────────
struct CartItem {
  String sku;
  String name;
  int    qty;
  float  unitPrice;
  String uid;
};

CartItem cart[20];
int cartSize = 0;
bool theftFlag = false;

// ── Timing ─────────────────────────────────────────────────────
unsigned long lastSendMs  = 0;
unsigned long lastPingMs  = 0;
const long    SEND_INTERVAL = 3000;   // Send to server every 3s
const long    PING_INTERVAL = 10000;  // Ping server every 10s

// ── State ──────────────────────────────────────────────────────
String trolleyStatus = "SHOPPING";
bool   gateCleared   = false;

// ══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);

  // Pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN,    OUTPUT);
  pinMode(GATE_PIN,   OUTPUT);
  digitalWrite(GATE_PIN, LOW);  // Gate closed by default

  // SPI + RFID
  SPI.begin();
  rfid.PCD_Init();

  Serial.println("\n🛒 SmartTrolley ESP Firmware Starting...");
  Serial.printf("   Trolley ID: %s\n", trolleyID.c_str());

  // Connect WiFi
  connectWiFi();

  // Startup beep
  beep(2);
  Serial.println("✅ Ready! Scan products with RFID.");
}

// ══════════════════════════════════════════════════════════════
void loop() {
  // ── Check WiFi ──────────────────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi lost. Reconnecting...");
    connectWiFi();
  }

  // ── RFID scan ───────────────────────────────────────────────
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String uid = getUID();
    handleRFIDScan(uid);
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  // ── Send data to server every 3s ────────────────────────────
  unsigned long now = millis();
  if (now - lastSendMs >= SEND_INTERVAL) {
    lastSendMs = now;
    sendToServer();
  }

  // ── Serial commands (for testing) ───────────────────────────
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    handleSerialCommand(cmd);
  }

  delay(50);
}

// ══════════════════════════════════════════════════════════════
// RFID Scan Handler
// ══════════════════════════════════════════════════════════════
void handleRFIDScan(String uid) {
  Serial.printf("📡 RFID scanned: %s\n", uid.c_str());

  // Look up product
  Product* found = nullptr;
  for (int i = 0; i < PRODUCT_COUNT; i++) {
    if (productDB[i].uid.equalsIgnoreCase(uid)) {
      found = &productDB[i];
      break;
    }
  }

  if (!found) {
    Serial.printf("   ❌ Unknown tag: %s\n", uid.c_str());
    beep(3);  // Error beep
    return;
  }

  // Check if already in cart
  for (int i = 0; i < cartSize; i++) {
    if (cart[i].uid == uid) {
      cart[i].qty++;
      Serial.printf("   ✅ %s qty → %d\n", found->name.c_str(), cart[i].qty);
      beep(1);
      printCart();
      return;
    }
  }

  // Add new item
  if (cartSize < 20) {
    cart[cartSize] = { found->sku, found->name, 1, found->unitPrice, uid };
    cartSize++;
    Serial.printf("   ✅ Added: %s @ ₹%.2f\n", found->name.c_str(), found->unitPrice);
    beep(1);
    printCart();
  }
}

// ══════════════════════════════════════════════════════════════
// Send cart data to server
// ══════════════════════════════════════════════════════════════
void sendToServer() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Build JSON payload
  JsonDocument doc;
  doc["trolleyID"]  = trolleyID;
  doc["phone"]      = phone;
  doc["status"]     = trolleyStatus;
  doc["theftFlag"]  = theftFlag;
  doc["weightKg"]   = readWeight();
  doc["batteryPct"] = getBatteryPct();
  doc["rssi"]       = WiFi.RSSI();

  JsonArray items = doc["items"].to<JsonArray>();
  for (int i = 0; i < cartSize; i++) {
    JsonObject item = items.add<JsonObject>();
    item["sku"]       = cart[i].sku;
    item["name"]      = cart[i].name;
    item["qty"]       = cart[i].qty;
    item["unitPrice"] = cart[i].unitPrice;
  }

  String jsonStr;
  serializeJson(doc, jsonStr);

  // HTTP POST
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/esp/update";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-ESP-Key", ESP_API_KEY);
  http.setTimeout(5000);

  int httpCode = http.POST(jsonStr);

  if (httpCode == 200) {
    String response = http.getString();
    Serial.printf("📤 Sent → Server: %s\n", response.c_str());

    // Parse response to check gate
    JsonDocument resp;
    if (deserializeJson(resp, response) == DeserializationError::Ok) {
      bool gateOpen = resp["gate"]["cleared"] | false;
      String action = resp["gate"]["action"] | "CLOSED";

      if (gateOpen && !gateCleared) {
        gateCleared = true;
        openGate();
      }
    }
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.printf("❌ HTTP error: %d\n", httpCode);
    digitalWrite(LED_PIN, LOW);
  }

  http.end();
}

// ══════════════════════════════════════════════════════════════
// Helper: Connect to WiFi
// ══════════════════════════════════════════════════════════════
void connectWiFi() {
  Serial.printf("📶 Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("   Signal: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("\n❌ WiFi failed. Retrying in loop...");
  }
}

// ══════════════════════════════════════════════════════════════
// Helper: Get RFID UID as hex string
// ══════════════════════════════════════════════════════════════
String getUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// ══════════════════════════════════════════════════════════════
// Helper: Open gate (relay / servo)
// ══════════════════════════════════════════════════════════════
void openGate() {
  Serial.println("🚪 GATE OPENING!");
  beep(3);
  digitalWrite(GATE_PIN, HIGH);  // Energize relay / move servo
  delay(5000);                   // Keep open 5 seconds
  digitalWrite(GATE_PIN, LOW);   // Close
  Serial.println("🚪 Gate closed.");
}

// ══════════════════════════════════════════════════════════════
// Helper: Read weight from HX711 (stub — connect your HX711)
// ══════════════════════════════════════════════════════════════
float readWeight() {
  // TODO: Replace with actual HX711 reading
  // #include <HX711.h>
  // HX711 scale;
  // scale.begin(DOUT_PIN, CLK_PIN);
  // return scale.get_units(5);
  return 0.0;
}

// Helper: Read battery voltage (ADC)
int getBatteryPct() {
  // ESP32 ADC on pin 34 (voltage divider)
  // int raw = analogRead(34);
  // float voltage = (raw / 4095.0) * 3.3 * 2;
  // return map(voltage * 100, 320, 420, 0, 100);
  return 85;  // Stub
}

// Helper: Buzzer beeps
void beep(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH); delay(80);
    digitalWrite(BUZZER_PIN, LOW);  delay(80);
  }
}

// Helper: Print cart to Serial
void printCart() {
  Serial.println("─── Cart ────────────────────");
  float total = 0;
  for (int i = 0; i < cartSize; i++) {
    float lineTotal = cart[i].qty * cart[i].unitPrice;
    Serial.printf("  %s x%d @ ₹%.2f = ₹%.2f\n",
      cart[i].name.c_str(), cart[i].qty,
      cart[i].unitPrice, lineTotal);
    total += lineTotal;
  }
  Serial.printf("  TOTAL: ₹%.2f\n", total);
  Serial.println("─────────────────────────────");
}

// Helper: Serial commands for testing
void handleSerialCommand(String cmd) {
  if (cmd == "checkout") {
    trolleyStatus = "AWAITING_PAYMENT";
    Serial.println("💳 Status → AWAITING_PAYMENT");
    sendToServer();
  }
  else if (cmd == "theft") {
    theftFlag = !theftFlag;
    Serial.printf("⚠️ theftFlag → %s\n", theftFlag ? "true" : "false");
  }
  else if (cmd == "clear") {
    cartSize = 0;
    theftFlag = false;
    trolleyStatus = "SHOPPING";
    gateCleared = false;
    Serial.println("🗑️ Cart cleared.");
  }
  else if (cmd == "status") {
    Serial.printf("WiFi: %s | IP: %s | Items: %d\n",
      WiFi.isConnected() ? "OK" : "NO",
      WiFi.localIP().toString().c_str(), cartSize);
    printCart();
  }
  else if (cmd == "ping") {
    sendToServer();
  }
}
