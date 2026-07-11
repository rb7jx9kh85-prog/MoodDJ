import type { Locale, Dictionary } from "@/lib/i18n/types";
import fr from "@/lib/i18n/dictionaries/fr";
import en from "@/lib/i18n/dictionaries/en";
import de from "@/lib/i18n/dictionaries/de";
import es from "@/lib/i18n/dictionaries/es";
import no from "@/lib/i18n/dictionaries/no";
import sv from "@/lib/i18n/dictionaries/sv";
import pt from "@/lib/i18n/dictionaries/pt";

export const dictionaries: Record<Locale, Dictionary> = { fr, en, de, es, no, sv, pt };

export * from "@/lib/i18n/types";
