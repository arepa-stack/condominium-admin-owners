"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { billingService } from "@/lib/services/billing.service";
import { paymentsService } from "@/lib/services/payments.service";
import type { Invoice, PaymentMethod } from "@/types/models";
import { formatCurrency, formatPeriod } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  UploadCloud,
  FileCheck,
  X,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  Smartphone,
  Landmark,
  Banknote,
  Receipt,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { ExchangeRateCalculator } from "@/components/payments/ExchangeRateCalculator";

function CreatePaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, activeUnit } = useAuth();

  // Query params pre-fill (from clicking "Pagar Recibo" in invoices)
  const preselectedInvoiceId = searchParams.get("invoice_id");
  const prefilledAmount = searchParams.get("amount");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>(
    preselectedInvoiceId ? [preselectedInvoiceId] : []
  );
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);

  // Form Fields
  const [amount, setAmount] = useState<string>(prefilledAmount || "");
  const [method, setMethod] = useState<"PAGO_MOVIL" | "TRANSFER" | "CASH">("PAGO_MOVIL");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [bank, setBank] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [conversionSummary, setConversionSummary] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load pending invoices for unit
  useEffect(() => {
    async function loadInvoices() {
      if (!activeUnit?.unit_id) return;
      setIsLoadingInvoices(true);
      try {
        const data = await billingService.getUnitInvoices(activeUnit.unit_id);
        const pending = data.filter((i) => i.status !== "PAID" && i.status !== "CANCELLED");
        setInvoices(pending);

        // If prefilled invoice exists and amount wasn't in url, calculate from invoice
        if (preselectedInvoiceId && !prefilledAmount) {
          const target = pending.find((i) => i.id === preselectedInvoiceId);
          if (target) {
            const rem = target.remaining ?? (target.amount - (target.paid_amount || 0));
            setAmount(rem.toString());
          }
        }
      } catch (err) {
        console.error("Error loading pending invoices:", err);
      } finally {
        setIsLoadingInvoices(false);
      }
    }
    loadInvoices();
  }, [activeUnit?.unit_id, preselectedInvoiceId, prefilledAmount]);

  // Handle invoice toggle selection
  const handleToggleInvoice = (inv: Invoice) => {
    let nextSelected: string[];
    if (selectedInvoiceIds.includes(inv.id)) {
      nextSelected = selectedInvoiceIds.filter((id) => id !== inv.id);
    } else {
      nextSelected = [...selectedInvoiceIds, inv.id];
    }
    setSelectedInvoiceIds(nextSelected);

    // Sum selected invoices automatically
    if (nextSelected.length > 0) {
      const sum = invoices
        .filter((i) => nextSelected.includes(i.id))
        .reduce((acc, curr) => acc + (curr.remaining ?? (curr.amount - (curr.paid_amount || 0))), 0);
      setAmount(sum.toFixed(2));
    }
  };

  // Handle proof file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("El comprobante no debe superar los 10MB");
      return;
    }

    setProofFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setProofPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeUnit?.unit_id) {
      toast.error("No se encontró la unidad o apartamento activo.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    if (!date) {
      toast.error("Por favor selecciona la fecha del pago.");
      return;
    }

    if (method !== "CASH" && !reference.trim()) {
      toast.error("Por favor indica el número o referencia del comprobante.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build allocations if invoices are selected
      const allocations = selectedInvoiceIds.map((id) => {
        const inv = invoices.find((i) => i.id === id);
        const invRemaining = inv
          ? (inv.remaining ?? (inv.amount - (inv.paid_amount || 0)))
          : numericAmount;
        return {
          invoice_id: id,
          amount: Math.min(numericAmount, invRemaining),
        };
      });

      // Assemble note with phone and exchange rate calculation
      let combinedNotes = notes.trim();
      if (conversionSummary) {
        combinedNotes = `${conversionSummary}${combinedNotes ? ` | ${combinedNotes}` : ""}`;
      }
      if (method === "PAGO_MOVIL" && phone.trim()) {
        combinedNotes = `Tel: ${phone.trim()} | ${combinedNotes}`.trim();
      }

      await paymentsService.reportPayment({
        amount: numericAmount,
        unit_id: activeUnit.unit_id,
        building_id: activeUnit.building_id,
        method: method,
        date: date,
        reference: reference.trim() || undefined,
        bank: bank.trim() || undefined,
        notes: combinedNotes || undefined,
        proof_image: proofFile,
        allocations: allocations.length > 0 ? allocations : undefined,
      });

      toast.success("¡Pago reportado con éxito! Ha sido registrado para su validación.");
      router.push("/invoices");
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error(error instanceof Error ? error.message : "Error al reportar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Recibos
        </Link>

        {activeUnit && (
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
            Unidad: {activeUnit.unit_name || activeUnit.unit_id.slice(0, 6)}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
          Cargar Reporte de Pago
        </h1>
        <p className="text-sm text-muted-foreground">
          Registra los datos de tu transferencia, pago móvil o efectivo para que la administración valide tu abono.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select invoices to link (optional or recommended) */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              1. Recibos Asociados al Pago
            </CardTitle>
            <CardDescription className="text-xs">
              Selecciona el o los recibos que deseas pagar (o déjalo libre para un abono a cuenta general).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {isLoadingInvoices ? (
              <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Cargando recibos pendientes...
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex items-center gap-2">
                <Info className="w-4 h-4 text-primary shrink-0" />
                No tienes recibos con deuda pendiente. El pago se registrará como abono / saldo a favor.
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => {
                  const isSelected = selectedInvoiceIds.includes(inv.id);
                  const remaining = inv.remaining ?? (inv.amount - (inv.paid_amount || 0));

                  return (
                    <div
                      key={inv.id}
                      onClick={() => handleToggleInvoice(inv)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border/80 bg-background hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40 bg-background"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {formatPeriod(inv.period)} - {inv.description || "Condominio"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Total: ${formatCurrency(inv.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-primary block">
                          ${formatCurrency(remaining)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">pendiente</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Method and Payment Details */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              2. Método y Datos de la Transacción
            </CardTitle>
            <CardDescription className="text-xs">
              Selecciona el canal por el cual realizaste la transferencia o pago.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Method Pills */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod("PAGO_MOVIL")}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === "PAGO_MOVIL"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span className="text-xs">Pago Móvil</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod("TRANSFER")}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === "TRANSFER"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <Landmark className="w-5 h-5" />
                <span className="text-xs">Transferencia</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod("CASH")}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  method === "CASH"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border bg-background hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs">Efectivo / Zelle</span>
              </button>
            </div>

            {/* Live Exchange Rate & Fractional Payment (Abonos) Calculator */}
            {(() => {
              const totalSelectedDebt = selectedInvoiceIds.length > 0
                ? invoices
                    .filter((i) => selectedInvoiceIds.includes(i.id))
                    .reduce((acc, curr) => acc + (curr.remaining ?? (curr.amount - (curr.paid_amount || 0))), 0)
                : (invoices.length > 0
                    ? invoices.reduce((acc, curr) => acc + (curr.remaining ?? (curr.amount - (curr.paid_amount || 0))), 0)
                    : undefined);

              return (
                <ExchangeRateCalculator
                  usdAmount={parseFloat(amount) || 0}
                  onUsdAmountChange={(newUsd) => setAmount(newUsd.toFixed(2))}
                  totalInvoiceDebt={totalSelectedDebt}
                  onCalculationChange={(details) => setConversionSummary(details.textSummary)}
                />
              );
            })()}

            {/* Amount and Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-semibold">
                  Monto a Registrar (USD)*
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                    $
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="pl-7 h-10 font-bold text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs font-semibold">
                  Fecha del Pago*
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
            </div>

            {/* Bank & Reference */}
            {method !== "CASH" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bank" className="text-xs font-semibold">
                    Banco Emisor
                  </Label>
                  <Input
                    id="bank"
                    type="text"
                    placeholder="Ej. Banesco, Mercantil, BDV..."
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reference" className="text-xs font-semibold">
                    Número de Referencia*
                  </Label>
                  <Input
                    id="reference"
                    type="text"
                    placeholder="Últimos dígitos o N° comprobante"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    required
                    className="h-10 font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* Phone if Pago Movil */}
            {method === "PAGO_MOVIL" && (
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  Teléfono Emisor del Pago Móvil (Opcional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Ej. 0414-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10"
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Observaciones o Notas Adicionales
              </Label>
              <Textarea
                id="notes"
                placeholder="Indica cualquier detalle relevante para la administración..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Proof upload */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-primary" />
              3. Comprobante de Pago (Capture / Voucher)
            </CardTitle>
            <CardDescription className="text-xs">
              Adjunta la captura de pantalla o recibo emitido por tu banco (imagen o PDF).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!proofFile ? (
              <label className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-muted/20 hover:bg-muted/40 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  Haz clic para subir comprobante
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  Formatos soportados: JPG, PNG, WEBP o PDF (Máx 10MB)
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  {proofPreview ? (
                    <img
                      src={proofPreview}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <FileCheck className="w-6 h-6" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-semibold text-foreground truncate">{proofFile.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {(proofFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleRemoveFile}
                  className="text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-base font-bold shadow-md gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando comprobante y registrando pago...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Confirmar y Reportar Pago
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            El pago será enviado de forma segura para validación por la junta de condominio.
          </p>
        </div>
      </form>
    </div>
  );
}

export default function CreatePaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          Cargando formulario de pago...
        </div>
      }
    >
      <CreatePaymentForm />
    </Suspense>
  );
}
