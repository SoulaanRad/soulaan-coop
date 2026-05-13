"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";
import { usePostHog } from "posthog-js/react";

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    priceUSD: number;
    productType: string;
    imageUrl?: string | null;
  };
  store: {
    id: string;
    name: string;
    isScVerified: boolean;
  };
  coopSlug: string;
  disabled?: boolean;
}

export function AddToCartButton({ product, store, coopSlug, disabled }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();
  const posthog = usePostHog();

  const handleAddToCart = () => {
    setIsAdding(true);
    try {
      addItem(
        {
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl || null,
          priceUSD: product.priceUSD,
        },
        {
          id: store.id,
          name: store.name,
          isScVerified: store.isScVerified,
        },
        quantity
      );
      
      posthog?.capture("product_added_to_cart", {
        product_id: product.id,
        product_name: product.name,
        product_type: product.productType,
        price_usd: product.priceUSD,
        quantity,
        total_usd: product.priceUSD * quantity,
        store_id: store.id,
        store_name: store.name,
        is_sc_verified: store.isScVerified,
        coop_slug: coopSlug,
      });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Quantity:</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center font-medium">{quantity}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setQuantity(quantity + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add to Cart Button */}
      <Button
        size="lg"
        className="w-full bg-[var(--coop-accent)] text-[var(--coop-accent-foreground)] hover:opacity-90 transition-opacity"
        onClick={handleAddToCart}
        disabled={disabled || isAdding}
      >
        {justAdded ? (
          <>
            <Check className="mr-2 h-5 w-5" />
            Added to Cart!
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isAdding ? "Adding..." : "Add to Cart"}
          </>
        )}
      </Button>

      {/* Out of Stock Message */}
      {disabled && !isAdding && (
        <p className="text-sm text-red-500 text-center font-medium">
          This item is currently out of stock
        </p>
      )}

      {/* View Cart Button */}
      {justAdded && (
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={() => router.push(`/c/${coopSlug}/cart`)}
        >
          View Cart
        </Button>
      )}
    </div>
  );
}
