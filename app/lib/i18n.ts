type Translations = {
  [locale: string]: {
    [key: string]: string;
  };
};

const dictionaries: Translations = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.upload": "Upload Ebook",
    "nav.deliveries": "Deliveries",
    "nav.settings": "Settings",
    "nav.plans": "Plans",
  },
  fr: {
    "nav.dashboard": "Tableau de bord",
    "nav.upload": "Télécharger un Ebook",
    "nav.deliveries": "Livraisons",
    "nav.settings": "Paramètres",
    "nav.plans": "Forfaits",
  },
  es: {
    "nav.dashboard": "Panel de control",
    "nav.upload": "Subir Ebook",
    "nav.deliveries": "Entregas",
    "nav.settings": "Configuración",
    "nav.plans": "Planes",
  },
  it: {
    "nav.dashboard": "Dashboard",
    "nav.upload": "Carica Ebook",
    "nav.deliveries": "Consegne",
    "nav.settings": "Impostazioni",
    "nav.plans": "Piani",
  },
  de: {
    "nav.dashboard": "Dashboard",
    "nav.upload": "Ebook hochladen",
    "nav.deliveries": "Lieferungen",
    "nav.settings": "Einstellungen",
    "nav.plans": "Pläne",
  },
  "pt-BR": {
    "nav.dashboard": "Painel",
    "nav.upload": "Enviar Ebook",
    "nav.deliveries": "Entregas",
    "nav.settings": "Configurações",
    "nav.plans": "Planos",
  },
  "pt-PT": {
    "nav.dashboard": "Painel",
    "nav.upload": "Enviar Ebook",
    "nav.deliveries": "Entregas",
    "nav.settings": "Definições",
    "nav.plans": "Planos",
  },
  sv: {
    "nav.dashboard": "Instrumentpanel",
    "nav.upload": "Ladda upp E-bok",
    "nav.deliveries": "Leveranser",
    "nav.settings": "Inställningar",
    "nav.plans": "Planer",
  },
  hi: {
    "nav.dashboard": "डैशबोर्ड",
    "nav.upload": "ईबुक अपलोड करें",
    "nav.deliveries": "डिलीवरी",
    "nav.settings": "सेटिंग्स",
    "nav.plans": "योजनाएं",
  },
};

/**
 * Returns a translation function bound to the given locale.
 * Fallbacks to English if the key or locale is missing.
 */
export function getTranslator(locale: string) {
  // Normalize locale (e.g. "pt-BR" from "pt-br", or just strip to primary "fr")
  let activeLocale = "en";
  if (dictionaries[locale]) {
    activeLocale = locale;
  } else if (dictionaries[locale.split('-')[0]]) {
    activeLocale = locale.split('-')[0];
  }

  return function t(key: string): string {
    return dictionaries[activeLocale]?.[key] || dictionaries["en"][key] || key;
  };
}
