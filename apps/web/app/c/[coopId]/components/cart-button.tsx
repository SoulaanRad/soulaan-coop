"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";

export function CartButton({ coopId }: { coopId: string }) {
  const { totalItems } = useCart();

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      asChild
    >
      <Link href={`/c/${coopId}/cart`}>
        <ShoppingCart className="h-5 w-5" />
        {totalItems > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
            {totalItems}
          </span>
        )}
      </Link>
    </Button>
  );
}
