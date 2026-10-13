import { apiClient } from "@/lib/api/client";
import { APP_API_PREFIX } from "@/lib/utils/constants";

export interface ExchangeRateItem {
  source: string;
  rate_date: string;
  bs_per_unit: number;
  source_updated_at: string | null;
  fetched_at?: string;
  is_manual?: boolean;
}

export interface ExchangeRatesSet {
  rate_date: string;
  rates: {
    euro_oficial: ExchangeRateItem | null;
    dolar_oficial: ExchangeRateItem | null;
    dolar_paralelo: ExchangeRateItem | null;
  };
}

export interface NormalizedRates {
  euroOficial: number;
  dolarOficial: number;
  dolarParalelo: number;
  rateDate: string;
  updatedAt?: string;
}

// Fallback rates if offline or API delay (updated to current BCV values)
const DEFAULT_FALLBACK_RATES: NormalizedRates = {
  euroOficial: 982.0045,
  dolarOficial: 876.7976,
  dolarParalelo: 1008.35,
  rateDate: new Date().toISOString().slice(0, 10),
};

export const exchangeRatesService = {
  async getLatestRates(): Promise<NormalizedRates> {
    try {
      // 1. Try backend authenticated app endpoint
      const res = await apiClient.get<ExchangeRatesSet>(
        `${APP_API_PREFIX}/exchange-rates/latest`
      );

      if (res.data?.rates) {
        const euro = res.data.rates.euro_oficial?.bs_per_unit;
        const dolar = res.data.rates.dolar_oficial?.bs_per_unit;
        const paralelo = res.data.rates.dolar_paralelo?.bs_per_unit;

        if (euro && dolar) {
          return {
            euroOficial: euro,
            dolarOficial: dolar,
            dolarParalelo: paralelo || dolar * 1.15,
            rateDate: res.data.rate_date || new Date().toISOString().slice(0, 10),
            updatedAt: res.data.rates.euro_oficial?.source_updated_at || undefined,
          };
        }
      }
    } catch (backendError) {
      console.warn("Backend exchange rate fetch error, trying direct public source...", backendError);
    }

    try {
      // 2. Fallback to direct public dolarapi endpoint
      const [dolaresRes, eurosRes] = await Promise.all([
        fetch("https://ve.dolarapi.com/v1/dolares").then((r) => r.json()),
        fetch("https://ve.dolarapi.com/v1/euros/oficial").then((r) => r.json()),
      ]);

      const dolaresList = Array.isArray(dolaresRes) ? dolaresRes : [dolaresRes];
      const dolarOficial = dolaresList.find((d: any) => d.fuente === "oficial")?.promedio || DEFAULT_FALLBACK_RATES.dolarOficial;
      const dolarParalelo = dolaresList.find((d: any) => d.fuente === "paralelo")?.promedio || DEFAULT_FALLBACK_RATES.dolarParalelo;
      const euroOficial = eurosRes?.promedio || DEFAULT_FALLBACK_RATES.euroOficial;

      return {
        euroOficial,
        dolarOficial,
        dolarParalelo,
        rateDate: new Date().toISOString().slice(0, 10),
        updatedAt: eurosRes?.fechaActualizacion,
      };
    } catch (fallbackError) {
      console.warn("Public exchange rate fallback failed, using defaults:", fallbackError);
      return DEFAULT_FALLBACK_RATES;
    }
  },
};
