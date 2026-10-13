"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Receipt, PlusCircle, Home } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

export function MobileNav() {
  const pathname = usePathname();
  const { activeUnit } = useAuth();

  const items = [
    {
      label: "Recibos",
      href: "/invoices",
      icon: Receipt,
      active: pathname.startsWith("/invoices"),
    },
    {
      label: "Cargar Pago",
      href: "/payments/new",
      icon: PlusCircle,
      active: pathname === "/payments/new",
      highlight: true,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
                item.active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  item.highlight && !item.active
                    ? "bg-primary/10 text-primary"
                    : item.active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : ""
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
