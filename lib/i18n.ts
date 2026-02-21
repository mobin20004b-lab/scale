export const SUPPORTED_LOCALES = ["fa", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fa";

export const dictionaries = {
  fa: {
    common: {
      viewAll: "مشاهده همه",
      unknown: "نامشخص",
      printTestLabel: "چاپ لیبل آزمایشی",
    },
    dashboard: {
      operationalInbox: "صندوق عملیات",
      unknownBarcodes: "بارکدهای ناشناس",
      failedCommands: "فرمان‌های ناموفق",
      staleScales: "ترازوهای راکد/آفلاین",
      mappingNeeded: "نیازمند تعیین نگاشت",
      investigateDevices: "بررسی وضعیت دستگاه‌ها",
      noConnection5Min: "عدم ارتباط بیش از ۵ دقیقه",
      nextAction: "اقدام بعدی",
      openUnknownQueue: "باز کردن صف بارکدهای ناشناس",
      reviewFailedCommands: "بررسی فرمان‌های ناموفق",
      inspectStaleScales: "بررسی ترازوهای راکد",
      slaOver30m: "بیش از ۳۰ دقیقه بدون رسیدگی",
      trendUp: "افزایشی",
      trendDown: "کاهشی",
      trendFlat: "بدون تغییر",
    },
    scales: {
      online: "آنلاین",
      stale: "راکد",
      offline: "آفلاین",
      fleetFirmwareMap: "نگاشت نسخه سیستم‌عامل ترازو به تفکیک انبار",
    },
    header: {
      operationalInbox: "صندوق عملیات",
    },
  },
  en: {
    common: {
      viewAll: "View all",
      unknown: "Unknown",
      printTestLabel: "Print test label",
    },
    dashboard: {
      operationalInbox: "Operational inbox",
      unknownBarcodes: "Unknown barcodes",
      failedCommands: "Failed commands",
      staleScales: "Stale/offline scales",
      mappingNeeded: "Mapping required",
      investigateDevices: "Investigate device health",
      noConnection5Min: "No connection for more than 5 minutes",
      nextAction: "Next action",
      openUnknownQueue: "Open unknown barcode queue",
      reviewFailedCommands: "Review failed commands",
      inspectStaleScales: "Inspect stale scales",
      slaOver30m: ">30 minutes unresolved",
      trendUp: "Rising",
      trendDown: "Falling",
      trendFlat: "No change",
    },
    scales: {
      online: "Online",
      stale: "Stale",
      offline: "Offline",
      fleetFirmwareMap: "Fleet firmware map by warehouse",
    },
    header: {
      operationalInbox: "Operational inbox",
    },
  },
} as const;

export type TranslationDictionary = (typeof dictionaries)[Locale];

export function isSupportedLocale(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}


export function getDictionary(locale: Locale): TranslationDictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}
