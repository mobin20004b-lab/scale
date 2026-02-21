#include <Arduino.h>
#include <ArduinoJson.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include "device_config.h"

#if __has_include("secrets.h")
#include "secrets.h"
#else
#include "secrets.example.h"
#endif

namespace {
constexpr byte DNS_PORT = 53;

HardwareSerial scaleSerial(1);
HardwareSerial printerSerial(2);
Preferences prefs;
DNSServer dnsServer;
WebServer web(80);

DeviceConfig cfg;
RuntimeState runtime;
String firmwareVersion = FIRMWARE_VERSION;

String endpoint(const String& path) {
  String base = cfg.backendBaseUrl;
  base.trim();
  if (base.endsWith("/")) base.remove(base.length() - 1);
  return base + path;
}

void logLine(const String& msg) { Serial.println("[ESP32 Scale] " + msg); }

String htmlEscape(const String& v) {
  String s = v;
  s.replace("&", "&amp;");
  s.replace("<", "&lt;");
  s.replace(">", "&gt;");
  s.replace("\"", "&quot;");
  return s;
}

void persistConfig() {
  prefs.begin("scale-agent", false);
  prefs.putString("wifiSsid", cfg.wifiSsid);
  prefs.putString("wifiPass", cfg.wifiPassword);
  prefs.putString("baseUrl", cfg.backendBaseUrl);
  prefs.putString("scaleId", cfg.scaleId);
  prefs.putString("apiToken", cfg.apiToken);
  prefs.putString("apSsid", cfg.apSsid);
  prefs.putString("apPass", cfg.apPassword);
  prefs.putString("printerType", cfg.printerType);
  prefs.putUInt("sBaud", cfg.scaleBaudRate);
  prefs.putUInt("pBaud", cfg.printerBaudRate);
  prefs.putUInt("sRx", cfg.scaleRxPin);
  prefs.putUInt("sTx", cfg.scaleTxPin);
  prefs.putUInt("pRx", cfg.printerRxPin);
  prefs.putUInt("pTx", cfg.printerTxPin);
  prefs.putUInt("wInt", cfg.weightSendIntervalMs);
  prefs.putUInt("tInt", cfg.telemetryIntervalMs);
  prefs.putUInt("cInt", cfg.commandPollIntervalMs);
  prefs.putUInt("cfgInt", cfg.configRefreshIntervalMs);
  prefs.putFloat("stableThr", cfg.stableWeightThreshold);
  prefs.putUInt("stableWin", cfg.stableWindowMs);
  prefs.putBool("autoPrint", cfg.autoPrintOnStockIn);
  prefs.putString("cfgVer", runtime.configVersion);
  prefs.end();
}

void loadConfig() {
  cfg.wifiSsid = WIFI_SSID;
  cfg.wifiPassword = WIFI_PASSWORD;
  cfg.backendBaseUrl = BACKEND_BASE_URL;
  cfg.scaleId = SCALE_ID;
  cfg.apiToken = SCALE_API_TOKEN;

  prefs.begin("scale-agent", true);
  cfg.wifiSsid = prefs.getString("wifiSsid", cfg.wifiSsid);
  cfg.wifiPassword = prefs.getString("wifiPass", cfg.wifiPassword);
  cfg.backendBaseUrl = prefs.getString("baseUrl", cfg.backendBaseUrl);
  cfg.scaleId = prefs.getString("scaleId", cfg.scaleId);
  cfg.apiToken = prefs.getString("apiToken", cfg.apiToken);
  cfg.apSsid = prefs.getString("apSsid", cfg.apSsid);
  cfg.apPassword = prefs.getString("apPass", cfg.apPassword);
  cfg.printerType = prefs.getString("printerType", cfg.printerType);
  cfg.scaleBaudRate = prefs.getUInt("sBaud", cfg.scaleBaudRate);
  cfg.printerBaudRate = prefs.getUInt("pBaud", cfg.printerBaudRate);
  cfg.scaleRxPin = prefs.getUInt("sRx", cfg.scaleRxPin);
  cfg.scaleTxPin = prefs.getUInt("sTx", cfg.scaleTxPin);
  cfg.printerRxPin = prefs.getUInt("pRx", cfg.printerRxPin);
  cfg.printerTxPin = prefs.getUInt("pTx", cfg.printerTxPin);
  cfg.weightSendIntervalMs = prefs.getUInt("wInt", cfg.weightSendIntervalMs);
  cfg.telemetryIntervalMs = prefs.getUInt("tInt", cfg.telemetryIntervalMs);
  cfg.commandPollIntervalMs = prefs.getUInt("cInt", cfg.commandPollIntervalMs);
  cfg.configRefreshIntervalMs = prefs.getUInt("cfgInt", cfg.configRefreshIntervalMs);
  cfg.stableWeightThreshold = prefs.getFloat("stableThr", cfg.stableWeightThreshold);
  cfg.stableWindowMs = prefs.getUInt("stableWin", cfg.stableWindowMs);
  cfg.autoPrintOnStockIn = prefs.getBool("autoPrint", cfg.autoPrintOnStockIn);
  runtime.configVersion = prefs.getString("cfgVer", "");
  prefs.end();
}

bool ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  WiFi.begin(cfg.wifiSsid.c_str(), cfg.wifiPassword.c_str());
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(250);
  }
  return WiFi.status() == WL_CONNECTED;
}

bool sendJson(const String& method, const String& url, JsonDocument& payload, JsonDocument* out = nullptr) {
  if (!ensureWifi()) return false;

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + cfg.apiToken);

  String body;
  serializeJson(payload, body);

  int code = -1;
  if (method == "POST") code = http.POST(body);
  else if (method == "PATCH") code = http.PATCH(body);

  if (code < 200 || code >= 300) {
    http.end();
    return false;
  }

  if (out != nullptr) {
    String response = http.getString();
    if (deserializeJson(*out, response)) {
      http.end();
      return false;
    }
  }

  http.end();
  return true;
}

bool getJson(const String& url, JsonDocument& out) {
  if (!ensureWifi()) return false;

  HTTPClient http;
  http.begin(url);
  http.addHeader("Authorization", "Bearer " + cfg.apiToken);

  const int code = http.GET();
  if (code < 200 || code >= 300) {
    http.end();
    return false;
  }

  const String response = http.getString();
  const bool ok = !deserializeJson(out, response);
  http.end();
  return ok;
}

bool parseWeightLine(const String& line, float& outWeight) {
  String normalized = line;
  normalized.trim();
  if (normalized.isEmpty()) return false;

  int start = -1;
  for (uint16_t i = 0; i < normalized.length(); i++) {
    char c = normalized.charAt(i);
    if ((c >= '0' && c <= '9') || c == '+' || c == '-') {
      start = i;
      break;
    }
  }
  if (start < 0) return false;

  String token;
  for (uint16_t i = start; i < normalized.length(); i++) {
    char c = normalized.charAt(i);
    if ((c >= '0' && c <= '9') || c == '.' || c == '+' || c == '-') token += c;
    else break;
  }
  if (token.isEmpty()) return false;
  outWeight = token.toFloat();
  return true;
}

void updateStableWeight(float newWeight) {
  const uint32_t now = millis();
  if (!runtime.hasStableWeight) {
    runtime.hasStableWeight = true;
    runtime.candidateStableWeight = newWeight;
    runtime.candidateStableSince = now;
    runtime.stableWeight = newWeight;
    return;
  }

  if (fabs(newWeight - runtime.candidateStableWeight) <= cfg.stableWeightThreshold) {
    if (now - runtime.candidateStableSince >= cfg.stableWindowMs) runtime.stableWeight = newWeight;
    return;
  }

  runtime.candidateStableWeight = newWeight;
  runtime.candidateStableSince = now;
}

void readScaleData() {
  static String line;
  while (scaleSerial.available()) {
    const char c = static_cast<char>(scaleSerial.read());
    if (c == '\n' || c == '\r') {
      if (!line.isEmpty()) {
        float w = 0;
        if (parseWeightLine(line, w)) {
          runtime.currentWeight = w;
          updateStableWeight(w);
        }
        line = "";
      }
    } else {
      line += c;
    }
  }
}

void sendWeightIfNeeded() {
  const uint32_t now = millis();
  if (now - runtime.lastWeightSentAt < cfg.weightSendIntervalMs &&
      fabs(runtime.currentWeight - runtime.lastSentWeight) <= cfg.stableWeightThreshold) {
    return;
  }

  JsonDocument req;
  req["weight"] = runtime.currentWeight;
  req["firmwareVersion"] = firmwareVersion;

  if (sendJson("POST", endpoint("/api/scales/" + cfg.scaleId + "/weight"), req)) {
    runtime.lastWeightSentAt = now;
    runtime.lastSentWeight = runtime.currentWeight;
  }
}

void sendTelemetryIfNeeded() {
  const uint32_t now = millis();
  if (now - runtime.lastTelemetryAt < cfg.telemetryIntervalMs) return;

  JsonDocument req;
  req["rssi"] = WiFi.RSSI();
  req["freeHeap"] = ESP.getFreeHeap();
  req["uptimeSec"] = now / 1000;
  req["firmwareVersion"] = firmwareVersion;

  if (sendJson("POST", endpoint("/api/scales/" + cfg.scaleId + "/device/telemetry"), req)) {
    runtime.lastTelemetryAt = now;
  }
}

void sendPrinterText(const String& data) {
  printerSerial.print(data);
  printerSerial.flush();
}

bool executePrint(const String& text) {
  if (cfg.printerType == "TSPL") {
    String tspl = "SIZE 50 mm,30 mm\nGAP 2 mm,0\nDIRECTION 1\nCLS\n";
    tspl += "TEXT 20,20,\"TSS24.BF2\",0,1,1,\"" + text + "\"\n";
    tspl += "PRINT 1\n";
    sendPrinterText(tspl);
    return true;
  }

  String escpos;
  escpos += String((char)0x1B) + "@";
  escpos += text + "\n\n\n";
  escpos += String((char)0x1D) + "V\x42\x00";
  sendPrinterText(escpos);
  return true;
}

void ackCommand(const String& commandId, const String& status, const String& err = "") {
  JsonDocument req;
  req["commandId"] = commandId;
  req["status"] = status;
  if (!err.isEmpty()) req["error"] = err;
  sendJson("POST", endpoint("/api/scales/" + cfg.scaleId + "/device/command-ack"), req);
}

void applyConfigFromServer(JsonVariantConst conf, const String& version) {
  if (!conf.is<JsonObjectConst>()) return;
  if (conf["printerType"].is<const char*>()) cfg.printerType = String(conf["printerType"].as<const char*>());
  if (conf["heartbeatIntervalSec"].is<int>()) cfg.weightSendIntervalMs = max(250, conf["heartbeatIntervalSec"].as<int>() * 1000);
  if (conf["telemetryIntervalSec"].is<int>()) cfg.telemetryIntervalMs = max(1000, conf["telemetryIntervalSec"].as<int>() * 1000);
  if (conf["stableWeightThreshold"].is<float>()) cfg.stableWeightThreshold = conf["stableWeightThreshold"].as<float>();
  if (conf["stableWindowMs"].is<int>()) cfg.stableWindowMs = max(200, conf["stableWindowMs"].as<int>());
  if (conf["autoPrintOnStockIn"].is<bool>()) cfg.autoPrintOnStockIn = conf["autoPrintOnStockIn"].as<bool>();

  runtime.configVersion = version;
  persistConfig();
}

void refreshRemoteConfigIfNeeded() {
  const uint32_t now = millis();
  if (now - runtime.lastConfigRefreshAt < cfg.configRefreshIntervalMs) return;

  JsonDocument res;
  if (getJson(endpoint("/api/scales/" + cfg.scaleId + "/device/config"), res)) {
    String version = String(res["version"] | "");
    if (!version.isEmpty() && version != runtime.configVersion) {
      applyConfigFromServer(res["config"], version);
    }
  }

  runtime.lastConfigRefreshAt = now;
}

void handleCommand(JsonVariantConst command) {
  const String id = String(command["id"] | "");
  const String type = String(command["type"] | "");
  if (id.isEmpty() || type.isEmpty()) return;

  if (type == "PRINT_TEST") {
    ackCommand(id, executePrint("TEST " + String(millis())) ? "ACKED" : "FAILED", "");
    return;
  }

  if (type == "PRINT_LABEL") {
    String text = "LABEL";
    if (command["payload"].is<JsonObjectConst>()) {
      auto p = command["payload"].as<JsonObjectConst>();
      if (p["text"].is<const char*>()) text = String(p["text"].as<const char*>());
      else if (p["source"].is<const char*>()) text = String(p["source"].as<const char*>());
    }
    ackCommand(id, executePrint(text) ? "ACKED" : "FAILED", "");
    return;
  }

  if (type == "SET_CONFIG") {
    if (command["payload"].is<JsonObjectConst>()) {
      applyConfigFromServer(command["payload"], runtime.configVersion);
      ackCommand(id, "ACKED");
    } else {
      ackCommand(id, "FAILED", "Invalid config payload");
    }
    return;
  }

  if (type == "RESTART") {
    ackCommand(id, "ACKED");
    delay(150);
    ESP.restart();
    return;
  }

  ackCommand(id, "FAILED", "Unsupported command");
}

void pollCommandsIfNeeded() {
  const uint32_t now = millis();
  if (now - runtime.lastCommandPollAt < cfg.commandPollIntervalMs) return;

  JsonDocument res;
  if (getJson(endpoint("/api/scales/" + cfg.scaleId + "/device/next-command"), res)) {
    if (res["command"].is<JsonObjectConst>()) handleCommand(res["command"]);
  }
  runtime.lastCommandPollAt = now;
}

String renderIndexPage() {
  String html;
  html.reserve(5000);
  html += "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>ESP32 Scale Agent</title><style>body{font-family:Arial;padding:16px;max-width:820px;margin:auto}input,select{width:100%;padding:8px;margin:4px 0 10px}fieldset{margin-bottom:12px}button{padding:10px 16px}code{background:#f2f2f2;padding:2px 4px}</style></head><body>";
  html += "<h2>ESP32 Scale Agent - Local Management</h2>";
  html += "<p>AP SSID: <code>" + htmlEscape(cfg.apSsid) + "</code> | AP IP: <code>" + WiFi.softAPIP().toString() + "</code></p>";
  html += "<p>STA status: <code>" + String(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED") + "</code>";
  html += " | Current SSID: <code>" + htmlEscape(WiFi.SSID()) + "</code></p>";
  html += "<p>Internet test: <code>" + String(runtime.lastInternetStatus) + "</code> " + htmlEscape(runtime.lastInternetMessage) + "</p>";
  html += "<form method='POST' action='/save'>";

  html += "<fieldset><legend>Backend & Device</legend>";
  html += "Endpoint URL <input name='backendBaseUrl' value='" + htmlEscape(cfg.backendBaseUrl) + "'>";
  html += "Scale ID <input name='scaleId' value='" + htmlEscape(cfg.scaleId) + "'>";
  html += "Token <input name='apiToken' value='" + htmlEscape(cfg.apiToken) + "'>";
  html += "</fieldset>";

  html += "<fieldset><legend>WiFi / AP</legend>";
  html += "WiFi SSID <input name='wifiSsid' value='" + htmlEscape(cfg.wifiSsid) + "'>";
  html += "WiFi Password <input name='wifiPassword' value='" + htmlEscape(cfg.wifiPassword) + "'>";
  html += "AP SSID <input name='apSsid' value='" + htmlEscape(cfg.apSsid) + "'>";
  html += "AP Password <input name='apPassword' value='" + htmlEscape(cfg.apPassword) + "'>";
  html += "</fieldset>";

  html += "<fieldset><legend>Intervals & stability</legend>";
  html += "Weight interval (ms) <input type='number' name='weightSendIntervalMs' value='" + String(cfg.weightSendIntervalMs) + "'>";
  html += "Telemetry interval (ms) <input type='number' name='telemetryIntervalMs' value='" + String(cfg.telemetryIntervalMs) + "'>";
  html += "Command poll (ms) <input type='number' name='commandPollIntervalMs' value='" + String(cfg.commandPollIntervalMs) + "'>";
  html += "Config refresh (ms) <input type='number' name='configRefreshIntervalMs' value='" + String(cfg.configRefreshIntervalMs) + "'>";
  html += "Stable threshold <input name='stableWeightThreshold' value='" + String(cfg.stableWeightThreshold, 3) + "'>";
  html += "Stable window (ms) <input type='number' name='stableWindowMs' value='" + String(cfg.stableWindowMs) + "'>";
  html += "</fieldset>";

  html += "<fieldset><legend>Scale & Printer connectivity</legend>";
  html += "Printer type <select name='printerType'><option" + String(cfg.printerType == "TSPL" ? " selected" : "") + ">TSPL</option><option" + String(cfg.printerType == "ESC_POS" ? " selected" : "") + ">ESC_POS</option></select>";
  html += "Scale baud <input type='number' name='scaleBaudRate' value='" + String(cfg.scaleBaudRate) + "'>";
  html += "Scale RX pin <input type='number' name='scaleRxPin' value='" + String(cfg.scaleRxPin) + "'>";
  html += "Scale TX pin <input type='number' name='scaleTxPin' value='" + String(cfg.scaleTxPin) + "'>";
  html += "Printer baud <input type='number' name='printerBaudRate' value='" + String(cfg.printerBaudRate) + "'>";
  html += "Printer RX pin <input type='number' name='printerRxPin' value='" + String(cfg.printerRxPin) + "'>";
  html += "Printer TX pin <input type='number' name='printerTxPin' value='" + String(cfg.printerTxPin) + "'>";
  html += "Auto print on stock-in <select name='autoPrintOnStockIn'><option value='0'" + String(cfg.autoPrintOnStockIn ? "" : " selected") + ">No</option><option value='1'" + String(cfg.autoPrintOnStockIn ? " selected" : "") + ">Yes</option></select>";
  html += "</fieldset>";

  html += "<button type='submit'>Save & Reboot</button> ";
  html += "<a href='/test-internet'>Run internet test</a> | <a href='/status'>Status JSON</a>";
  html += "</form></body></html>";
  return html;
}

void applyWebArgs() {
  if (web.hasArg("backendBaseUrl")) cfg.backendBaseUrl = web.arg("backendBaseUrl");
  if (web.hasArg("scaleId")) cfg.scaleId = web.arg("scaleId");
  if (web.hasArg("apiToken")) cfg.apiToken = web.arg("apiToken");
  if (web.hasArg("wifiSsid")) cfg.wifiSsid = web.arg("wifiSsid");
  if (web.hasArg("wifiPassword")) cfg.wifiPassword = web.arg("wifiPassword");
  if (web.hasArg("apSsid")) cfg.apSsid = web.arg("apSsid");
  if (web.hasArg("apPassword")) cfg.apPassword = web.arg("apPassword");
  if (web.hasArg("printerType")) cfg.printerType = web.arg("printerType");

  if (web.hasArg("weightSendIntervalMs")) cfg.weightSendIntervalMs = web.arg("weightSendIntervalMs").toInt();
  if (web.hasArg("telemetryIntervalMs")) cfg.telemetryIntervalMs = web.arg("telemetryIntervalMs").toInt();
  if (web.hasArg("commandPollIntervalMs")) cfg.commandPollIntervalMs = web.arg("commandPollIntervalMs").toInt();
  if (web.hasArg("configRefreshIntervalMs")) cfg.configRefreshIntervalMs = web.arg("configRefreshIntervalMs").toInt();
  if (web.hasArg("stableWeightThreshold")) cfg.stableWeightThreshold = web.arg("stableWeightThreshold").toFloat();
  if (web.hasArg("stableWindowMs")) cfg.stableWindowMs = web.arg("stableWindowMs").toInt();

  if (web.hasArg("scaleBaudRate")) cfg.scaleBaudRate = web.arg("scaleBaudRate").toInt();
  if (web.hasArg("printerBaudRate")) cfg.printerBaudRate = web.arg("printerBaudRate").toInt();
  if (web.hasArg("scaleRxPin")) cfg.scaleRxPin = web.arg("scaleRxPin").toInt();
  if (web.hasArg("scaleTxPin")) cfg.scaleTxPin = web.arg("scaleTxPin").toInt();
  if (web.hasArg("printerRxPin")) cfg.printerRxPin = web.arg("printerRxPin").toInt();
  if (web.hasArg("printerTxPin")) cfg.printerTxPin = web.arg("printerTxPin").toInt();
  if (web.hasArg("autoPrintOnStockIn")) cfg.autoPrintOnStockIn = web.arg("autoPrintOnStockIn") == "1";
}

void runInternetTest() {
  if (!ensureWifi()) {
    runtime.lastInternetStatus = -1;
    runtime.lastInternetMessage = "WiFi disconnected";
    return;
  }

  HTTPClient http;
  const String url = endpoint("/api/scales/" + cfg.scaleId + "/device/config");
  http.begin(url);
  http.addHeader("Authorization", "Bearer " + cfg.apiToken);
  int code = http.GET();
  runtime.lastInternetStatus = code;
  runtime.lastInternetMessage = code > 0 ? "Backend reachable" : "Backend unreachable";
  http.end();
}

void setupWebPortal() {
  web.on("/", HTTP_GET, []() { web.send(200, "text/html", renderIndexPage()); });

  web.on("/save", HTTP_POST, []() {
    applyWebArgs();
    persistConfig();
    web.send(200, "text/html", "<h3>Saved. Rebooting...</h3>");
    delay(300);
    ESP.restart();
  });

  web.on("/test-internet", HTTP_GET, []() {
    runInternetTest();
    web.sendHeader("Location", "/");
    web.send(302, "text/plain", "");
  });

  web.on("/status", HTTP_GET, []() {
    JsonDocument doc;
    doc["firmwareVersion"] = firmwareVersion;
    doc["wifiConnected"] = WiFi.status() == WL_CONNECTED;
    doc["wifiSsid"] = WiFi.SSID();
    doc["ip"] = WiFi.localIP().toString();
    doc["apSsid"] = cfg.apSsid;
    doc["apIp"] = WiFi.softAPIP().toString();
    doc["weight"] = runtime.currentWeight;
    doc["stableWeight"] = runtime.stableWeight;
    doc["internetStatus"] = runtime.lastInternetStatus;
    doc["internetMessage"] = runtime.lastInternetMessage;
    String out;
    serializeJson(doc, out);
    web.send(200, "application/json", out);
  });

  web.onNotFound([]() {
    web.sendHeader("Location", String("http://") + WiFi.softAPIP().toString() + "/", true);
    web.send(302, "text/plain", "Redirecting to index");
  });

  web.begin();
}

void startApModeWithDnsRedirect() {
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(cfg.apSsid.c_str(), cfg.apPassword.c_str());
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
  logLine("AP mode enabled SSID=" + cfg.apSsid + " IP=" + WiFi.softAPIP().toString());
}
}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);

  loadConfig();
  startApModeWithDnsRedirect();

  scaleSerial.begin(cfg.scaleBaudRate, SERIAL_8N1, cfg.scaleRxPin, cfg.scaleTxPin);
  printerSerial.begin(cfg.printerBaudRate, SERIAL_8N1, cfg.printerRxPin, cfg.printerTxPin);

  setupWebPortal();
  ensureWifi();
  runInternetTest();
}

void loop() {
  dnsServer.processNextRequest();
  web.handleClient();

  ensureWifi();
  readScaleData();
  sendWeightIfNeeded();
  sendTelemetryIfNeeded();
  refreshRemoteConfigIfNeeded();
  pollCommandsIfNeeded();

  delay(20);
}
