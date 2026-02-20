export interface ScaleFormattingConfig {
  tare?: number | null;
  unit?: string | null;
  precision?: number | null;
}

function clampPrecision(precision?: number | null) {
  const normalized = Number.isFinite(precision) ? Number(precision) : 2;
  return Math.min(4, Math.max(0, normalized));
}

export function getDisplayWeight(
  rawWeight: number | null,
  config: ScaleFormattingConfig
) {
  if (rawWeight === null || !Number.isFinite(rawWeight)) {
    return null;
  }

  const tare = Number.isFinite(config.tare) ? Number(config.tare) : 0;
  return rawWeight - tare;
}

export function formatScaleWeight(
  rawWeight: number | null,
  config: ScaleFormattingConfig
) {
  const weight = getDisplayWeight(rawWeight, config);
  const unit = config.unit?.trim() || "گرم";
  const precision = clampPrecision(config.precision);

  if (weight === null) {
    return `بدون وزن (${unit})`;
  }

  return `${weight.toFixed(precision)} ${unit}`;
}
