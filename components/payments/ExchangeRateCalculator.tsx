"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Copy,
  Check,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Info,
  Euro,
  DollarSign,
  Landmark,
} from "lucide-react";
import { exchangeRatesService, type NormalizedRates } from "@/lib/services/exchange-rates.service";
import { toast } from "sonner";

interface ExchangeRateCalculatorProps {
  usdAmount: number;
  onUsdAmountChange: (amount: number) => void;
  totalInvoiceDebt?: number;
  onCalculationChange?: (details: {
    bsAmount: number;
    euroAmount: number;
    rateUsed: number;
    rateSource: "euro_oficial" | "dolar_oficial";
    textSummary: string;
  }) => void;
}

export function ExchangeRateCalculator({
  usdAmount,
  onUsdAmountChange,
  totalInvoiceDebt,
  onCalculationChange,
}: ExchangeRateCalculatorProps) {
  const [rates, setRates] = useState<NormalizedRates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRateSource, setSelectedRateSource] = useState<"euro_oficial" | "dolar_oficial">("euro_oficial");
  const [copiedBs, setCopiedBs] = useState(false);

  // Load exchange rates
  useEffect(() => {
    async function loadRates() {
      setIsLoading(true);
      try {
        const data = await exchangeRatesService.getLatestRates();
        setRates(data);
      } catch (err) {
        console.error("Failed to load exchange rates:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRates();
  }, []);

  // Compute active rate and conversions
  const activeRate = selectedRateSource === "euro_oficial" ? (rates?.euroOficial || 982.00) : (rates?.dolarOficial || 876.80);

  // Amount in Bs
  const bsAmount = Math.max(0, usdAmount) * activeRate;

  // Amount in Euro based on official parity
  const euroAmount = rates && rates.euroOficial > 0
    ? (Math.max(0, usdAmount) * rates.dolarOficial) / rates.euroOficial
    : usdAmount * 0.89;

  // Remaining debt after partial payment / abono
  const remainingAfterPayment = totalInvoiceDebt !== undefined ? Math.max(0, totalInvoiceDebt - usdAmount) : null;
  const isPartialPayment = totalInvoiceDebt !== undefined && usdAmount > 0 && usdAmount < totalInvoiceDebt;

  // Notify parent component with conversion details
  useEffect(() => {
    if (onCalculationChange) {
      const summary = `Monto USD: $${usdAmount.toFixed(2)} | Calculado a Tasa ${
        selectedRateSource === "euro_oficial" ? "Euro Oficial" : "Dólar Oficial"
      } (Bs. ${activeRate.toFixed(2)}): Bs. ${bsAmount.toLocaleString("es-VE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      onCalculationChange({
        bsAmount,
        euroAmount,
        rateUsed: activeRate,
        rateSource: selectedRateSource,
        textSummary: summary,
      });
    }
  }, [usdAmount, activeRate, selectedRateSource, bsAmount, euroAmount, onCalculationChange]);

  const handleCopyBs = () => {
    const formatted = bsAmount.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    navigator.clipboard.writeText(formatted);
    setCopiedBs(true);
    toast.success("Monto en Bolívares copiado al portapapeles");
    setTimeout(() => setCopiedBs(false), 2000);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-xs overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header with live rates */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Tasas de Cambio Oficiales (BCV)
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Actualizado para transacciones en Bolívares y cálculo en divisas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="outline"
              className={`text-[11px] font-mono font-semibold cursor-pointer transition-all ${
                selectedRateSource === "euro_oficial"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setSelectedRateSource("euro_oficial")}
            >
              🇪🇺 Euro: Bs. {rates?.euroOficial?.toFixed(2) || "982.00"}
            </Badge>

            <Badge
              variant="outline"
              className={`text-[11px] font-mono font-semibold cursor-pointer transition-all ${
                selectedRateSource === "dolar_oficial"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setSelectedRateSource("dolar_oficial")}
            >
              🇻🇪 Dólar: Bs. {rates?.dolarOficial?.toFixed(2) || "876.80"}
            </Badge>
          </div>
        </div>

        {/* Rate Source Selection Toggle */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground font-medium">Tasa de cálculo para tu pago:</span>
          <div className="flex rounded-lg border border-border p-0.5 bg-background">
            <button
              type="button"
              onClick={() => setSelectedRateSource("euro_oficial")}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                selectedRateSource === "euro_oficial"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tasa Euro BCV (Granada)
            </button>
            <button
              type="button"
              onClick={() => setSelectedRateSource("dolar_oficial")}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-all ${
                selectedRateSource === "dolar_oficial"
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tasa Dólar BCV
            </button>
          </div>
        </div>

        {/* Partial Payment / Abono Presets */}
        {totalInvoiceDebt !== undefined && totalInvoiceDebt > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground">
                ¿Cuánto deseas cancelar?
              </span>
              <span className="text-muted-foreground">
                Total adeudado: <strong className="text-foreground">${totalInvoiceDebt.toFixed(2)}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant={usdAmount === totalInvoiceDebt ? "default" : "outline"}
                size="sm"
                onClick={() => onUsdAmountChange(totalInvoiceDebt)}
                className="text-xs h-7.5 gap-1"
              >
                Pagar Totalidad (${totalInvoiceDebt.toFixed(2)})
              </Button>

              {totalInvoiceDebt > 50 && (
                <Button
                  type="button"
                  variant={usdAmount === 50 ? "default" : "outline"}
                  size="sm"
                  onClick={() => onUsdAmountChange(50)}
                  className="text-xs h-7.5"
                >
                  Abonar $50.00
                </Button>
              )}

              {totalInvoiceDebt > 20 && totalInvoiceDebt !== 50 && (
                <Button
                  type="button"
                  variant={usdAmount === 20 ? "default" : "outline"}
                  size="sm"
                  onClick={() => onUsdAmountChange(20)}
                  className="text-xs h-7.5"
                >
                  Abonar $20.00
                </Button>
              )}

              <Button
                type="button"
                variant={usdAmount === parseFloat((totalInvoiceDebt / 2).toFixed(2)) ? "default" : "outline"}
                size="sm"
                onClick={() => onUsdAmountChange(parseFloat((totalInvoiceDebt / 2).toFixed(2)))}
                className="text-xs h-7.5"
              >
                50% (${(totalInvoiceDebt / 2).toFixed(2)})
              </Button>
            </div>
          </div>
        )}

        {/* Live Converted Amount Box */}
        <div className="p-4 rounded-xl bg-background border border-border/80 shadow-xs space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
              Total a Pagar / Transferir en Bolívares
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              Tasa: Bs. {activeRate.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-foreground tracking-tight block">
                Bs. {bsAmount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-muted-foreground block font-mono">
                Equivalente en Euros: <strong className="text-foreground">€ {euroAmount.toFixed(2)}</strong> | En Dólares: <strong className="text-foreground">${usdAmount.toFixed(2)}</strong>
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyBs}
              className="gap-1.5 text-xs h-9 px-3 shrink-0"
              title="Copiar monto en Bs para transferir"
            >
              {copiedBs ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-700 dark:text-green-400" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Bs
                </>
              )}
            </Button>
          </div>

          {/* Abono indicator details */}
          {isPartialPayment && remainingAfterPayment !== null && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between">
              <span>
                Estás realizando un <strong>Abono Fraccionado</strong> de ${usdAmount.toFixed(2)}.
              </span>
              <span className="font-mono font-bold">
                Quedará pendiente: ${remainingAfterPayment.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
