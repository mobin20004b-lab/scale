import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from "@/lib/i18n";

export async function getSessionLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  if (localeCookie && isSupportedLocale(localeCookie)) return localeCookie;
  return DEFAULT_LOCALE;
}
