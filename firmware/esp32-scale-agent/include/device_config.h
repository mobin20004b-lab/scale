#pragma once

#include <Arduino.h>

struct DeviceConfig {
  String wifiSsid;
  String wifiPassword;
  String backendBaseUrl;
  String scaleId;
  String apiToken;

  String apSsid = "Scale-Agent-Setup";
  String apPassword = "12345678";

  String printerType = "TSPL";
  uint32_t scaleBaudRate = 9600;
  uint32_t printerBaudRate = 9600;
  uint8_t scaleRxPin = 16;
  uint8_t scaleTxPin = 17;
  uint8_t printerRxPin = 26;
  uint8_t printerTxPin = 27;

  uint32_t weightSendIntervalMs = 1000;
  uint32_t telemetryIntervalMs = 15000;
  uint32_t commandPollIntervalMs = 2000;
  uint32_t configRefreshIntervalMs = 30000;

  float stableWeightThreshold = 0.02f;
  uint32_t stableWindowMs = 1200;
  bool autoPrintOnStockIn = false;
};

struct RuntimeState {
  float currentWeight = 0.0f;
  float lastSentWeight = 0.0f;
  uint32_t lastWeightSentAt = 0;
  uint32_t lastTelemetryAt = 0;
  uint32_t lastCommandPollAt = 0;
  uint32_t lastConfigRefreshAt = 0;

  float candidateStableWeight = 0.0f;
  uint32_t candidateStableSince = 0;
  bool hasStableWeight = false;
  float stableWeight = 0.0f;

  String configVersion;
  int lastInternetStatus = -1;
  String lastInternetMessage = "Not tested";
};
