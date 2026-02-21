export type LabelTemplateVersion = "v1";
export type LabelSize = "50x30" | "60x40";

export type LabelPayload = {
  productName: string;
  barcode: string;
  weight: number;
  unit: string;
  packedAt?: string | null;
  lotNumber?: string | null;
  location?: string | null;
};

const sizeStyles: Record<LabelSize, { widthMm: number; heightMm: number; fontScale: number }> = {
  "50x30": { widthMm: 50, heightMm: 30, fontScale: 0.9 },
  "60x40": { widthMm: 60, heightMm: 40, fontScale: 1 },
};

function renderSingleLabel(payload: LabelPayload, size: LabelSize) {
  const config = sizeStyles[size];

  return `
    <article class="label" style="--w:${config.widthMm}mm;--h:${config.heightMm}mm;--f:${config.fontScale}">
      <div class="row title">${payload.productName}</div>
      <div class="row barcode">*${payload.barcode}*</div>
      <div class="row meta"><strong>Barcode:</strong> ${payload.barcode}</div>
      <div class="row weight"><strong>Weight:</strong> ${payload.weight.toFixed(3)} ${payload.unit}</div>
      ${payload.packedAt ? `<div class="row optional">Packed: ${payload.packedAt}</div>` : ""}
      ${payload.lotNumber ? `<div class="row optional">Lot: ${payload.lotNumber}</div>` : ""}
      ${payload.location ? `<div class="row optional">Location: ${payload.location}</div>` : ""}
    </article>
  `;
}

export function renderLabelDocument({
  labels,
  size,
  templateVersion,
}: {
  labels: LabelPayload[];
  size: LabelSize;
  templateVersion: LabelTemplateVersion;
}) {
  const body = labels.map((label) => renderSingleLabel(label, size)).join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Label Print - ${templateVersion}</title>
  <style>
    @media print {
      body { margin: 0; }
      .label { page-break-after: always; }
    }

    body {
      font-family: Arial, sans-serif;
      margin: 8px;
      background: #fff;
      color: #000;
    }

    .sheet {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 8px;
    }

    .label {
      border: 1px solid #111;
      width: var(--w);
      height: var(--h);
      padding: 2.5mm;
      box-sizing: border-box;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1.3mm;
      line-height: 1.2;
      font-size: calc(11px * var(--f));
    }

    .row.title { font-size: calc(13px * var(--f)); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row.barcode { font-family: "Libre Barcode 39", "Courier New", monospace; font-size: calc(34px * var(--f)); line-height: 1; letter-spacing: 1px; }
    .row.weight { font-size: calc(12px * var(--f)); }
    .optional { font-size: calc(10px * var(--f)); }
  </style>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap">
</head>
<body>
  <main class="sheet">${body}</main>
</body>
</html>`;
}
