import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import { authenticate } from "../shopify.server";
import { getTranslator } from "../lib/i18n";

// Load Polaris Translations
import en from "@shopify/polaris/locales/en.json";
import fr from "@shopify/polaris/locales/fr.json";
import es from "@shopify/polaris/locales/es.json";
import it from "@shopify/polaris/locales/it.json";
import de from "@shopify/polaris/locales/de.json";
import ptBR from "@shopify/polaris/locales/pt-BR.json";
import ptPT from "@shopify/polaris/locales/pt-PT.json";
import sv from "@shopify/polaris/locales/sv.json";

const polarisLocales: Record<string, any> = {
  en, fr, es, it, de, "pt-BR": ptBR, "pt-PT": ptPT, sv
};

export const loader = async ({ request }: any) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") || "en";

  return { 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    locale
  };
};

export default function App() {
  const { apiKey, locale } = useLoaderData<any>();
  const t = getTranslator(locale);

  // Fallback Polaris to English if the specific language (e.g. Hindi) isn't officially supported by Polaris
  const polarisTranslations = polarisLocales[locale] || polarisLocales[locale.split('-')[0]] || en;

  return (
    <AppProvider embedded apiKey={apiKey}>
      <PolarisAppProvider i18n={polarisTranslations}>
        <ui-nav-menu>
          <Link to="/app" rel="home">{t("nav.dashboard")}</Link>
          <Link to="/app/upload">{t("nav.upload")}</Link>
          <Link to="/app/deliveries">{t("nav.deliveries")}</Link>
          <Link to="/app/settings">{t("nav.settings")}</Link>
          <Link to="/app/pricing">{t("nav.plans")}</Link>
        </ui-nav-menu>
        <Outlet />
      </PolarisAppProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
