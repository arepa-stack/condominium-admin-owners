"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Home,
  User,
  Mail,
  Phone,
  CreditCard,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import {
  onboardingService,
  type BuildingPublic,
  type UnitPublic,
} from "@/lib/services/onboarding.service";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");

  const [buildings, setBuildings] = useState<BuildingPublic[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingPublic | null>(null);
  const [units, setUnits] = useState<UnitPublic[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [phone, setPhone] = useState("");

  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);
  const [isLoadingUnits, setIsLoadingUnits] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Load buildings on mount
  useEffect(() => {
    async function loadBuildings() {
      setIsLoadingBuildings(true);
      try {
        const list = await onboardingService.getBuildings();
        setBuildings(list);

        if (codeParam) {
          const match = list.find(
            (b) => b.building_code?.toLowerCase() === codeParam.toLowerCase() || b.id === codeParam
          );
          if (match) {
            setSelectedBuilding(match);
          } else {
            // Try fetching by code directly
            try {
              const b = await onboardingService.getBuildingByCode(codeParam);
              setSelectedBuilding(b);
            } catch {
              console.warn("Could not find building by code param:", codeParam);
            }
          }
        } else if (list.length > 0) {
          // Default to Residencias Granada if available, otherwise first building
          const granada = list.find((b) => b.name.toLowerCase().includes("granada"));
          setSelectedBuilding(granada || list[0]);
        }
      } catch (err) {
        console.error("Error loading buildings:", err);
        toast.error("No se pudieron cargar los edificios disponibles.");
      } finally {
        setIsLoadingBuildings(false);
      }
    }
    loadBuildings();
  }, [codeParam]);

  // Load units when selectedBuilding changes
  useEffect(() => {
    async function loadUnits() {
      if (!selectedBuilding?.building_code) return;
      setIsLoadingUnits(true);
      setSelectedUnitId("");
      try {
        const unitList = await onboardingService.getUnitsByCode(selectedBuilding.building_code);
        // Sort units by natural apartment numbering
        const sorted = [...unitList].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true })
        );
        setUnits(sorted);
      } catch (err) {
        console.error("Error loading units:", err);
        toast.error("No se pudieron cargar las unidades de este edificio.");
        setUnits([]);
      } finally {
        setIsLoadingUnits(false);
      }
    }
    loadUnits();
  }, [selectedBuilding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBuilding?.building_code) {
      toast.error("Por favor selecciona tu edificio o condominio.");
      return;
    }
    if (!selectedUnitId) {
      toast.error("Por favor selecciona tu apartamento o unidad.");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Por favor ingresa tu nombre y apellido completos.");
      return;
    }
    if (!email.trim()) {
      toast.error("Por favor ingresa un correo electrónico válido.");
      return;
    }
    if (!documentId.trim()) {
      toast.error("Por favor ingresa tu cédula o documento de identidad.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onboardingService.submitRegistration({
        building_code: selectedBuilding.building_code,
        unit_id: selectedUnitId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        document_id: documentId.trim(),
        phone: phone.trim() || undefined,
      });

      setIsSuccess(true);
      toast.success("¡Solicitud enviada con éxito!");
    } catch (err: any) {
      console.error("Registration error:", err);
      const msg = err.response?.data?.message || err.message || "Error al enviar la solicitud";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedUnitName = units.find((u) => u.id === selectedUnitId)?.name || "Tu apartamento";

  // Success Confirmation Screen (Emulates mobile APK behavior)
  if (isSuccess) {
    return (
      <Card className="border-border shadow-xl bg-card/95 backdrop-blur-sm text-center animate-in zoom-in-95 duration-200">
        <CardContent className="pt-8 pb-8 px-6 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5">
              Registro Pendiente de Aprobación
            </Badge>
            <h2 className="text-2xl font-display font-bold text-foreground">
              ¡Solicitud Recibida!
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Tu solicitud para la unidad <strong>{selectedUnitName}</strong> en{" "}
              <strong>{selectedBuilding?.name}</strong> fue enviada correctamente.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Propietario / Residente:</span>
              <span className="font-semibold text-foreground">{firstName} {lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Correo:</span>
              <span className="font-mono text-foreground">{email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cédula:</span>
              <span className="font-mono text-foreground">{documentId}</span>
            </div>
            <div className="pt-2 border-t border-border/60 text-muted-foreground">
              La junta de condominio o administración validará tus datos para habilitar tu cuenta. Podrás iniciar sesión con tu correo una vez aprobada.
            </div>
          </div>

          <div className="pt-2">
            <Link href="/login" className="w-full block">
              <Button className="w-full h-11 text-sm font-semibold gap-2 shadow-sm">
                Volver al Inicio de Sesión
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-xl bg-card/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-4 text-center">
        <CardTitle className="text-xl font-bold">Registro de Residente</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Solicita tu acceso al portal del condominio en pocos pasos
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Building Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              Edificio / Condominio *
            </Label>
            {isLoadingBuildings ? (
              <div className="h-10 rounded-md border border-border bg-muted/30 flex items-center px-3 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-primary" />
                Cargando edificios disponibles...
              </div>
            ) : (
              <Select
                value={selectedBuilding?.id || ""}
                onValueChange={(val) => {
                  const b = buildings.find((item) => item.id === val);
                  if (b) setSelectedBuilding(b);
                }}
              >
                <SelectTrigger className="h-10 text-xs bg-background/50">
                  <SelectValue placeholder="Selecciona tu edificio" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-primary" />
                        <span>{b.name}</span>
                        {b.address && (
                          <span className="text-[10px] text-muted-foreground">
                            ({b.address})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Unit / Apartamento Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-muted-foreground" />
              Apartamento / Unidad *
            </Label>
            {isLoadingUnits ? (
              <div className="h-10 rounded-md border border-border bg-muted/30 flex items-center px-3 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-primary" />
                Cargando apartamentos...
              </div>
            ) : (
              <Select
                value={selectedUnitId}
                onValueChange={setSelectedUnitId}
                disabled={!selectedBuilding || units.length === 0}
              >
                <SelectTrigger className="h-10 text-xs bg-background/50">
                  <SelectValue
                    placeholder={
                      !selectedBuilding
                        ? "Primero selecciona tu edificio"
                        : units.length === 0
                        ? "No hay unidades disponibles"
                        : "Selecciona tu apartamento (ej. 14, 23...)"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      Apartamento {u.name} {u.floor ? `(Piso ${u.floor})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-semibold">
                Nombre *
              </Label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  id="firstName"
                  placeholder="Ej. Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="pl-8 h-10 text-xs bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-semibold">
                Apellido *
              </Label>
              <Input
                id="lastName"
                placeholder="Ej. Pérez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="h-10 text-xs bg-background/50"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Correo Electrónico *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu.correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10 text-xs bg-background/50"
            />
          </div>

          {/* Document ID & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="documentId" className="text-xs font-semibold flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                Cédula / DNI *
              </Label>
              <Input
                id="documentId"
                placeholder="V-12345678"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                required
                className="h-10 text-xs font-mono bg-background/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                Teléfono (Opcional)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0414-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10 text-xs font-mono bg-background/50"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || isLoadingBuildings || isLoadingUnits}
            className="w-full h-11 text-sm font-semibold shadow-md mt-3 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando solicitud...
              </>
            ) : (
              <>
                Enviar Solicitud de Registro
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Al registrarte, tu solicitud pasará a validación por parte de la administración del edificio.
          </p>
        </form>

        <div className="mt-5 pt-3.5 border-t border-border/60 text-center space-y-2">
          <div className="text-xs text-muted-foreground">
            ¿Ya tienes cuenta activa?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Inicia sesión aquí
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-threshold my-4">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-5 text-center">
          <Link href="/login" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio de sesión
          </Link>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-2 shadow-sm">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
            Apto
          </h1>
          <p className="text-xs font-medium text-primary">Portal Web de Residentes</p>
        </div>

        <Suspense
          fallback={
            <Card className="p-8 text-center border-border">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Cargando formulario de registro...</p>
            </Card>
          }
        >
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
