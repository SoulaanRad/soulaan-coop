"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    priceUSD: number;
    productType: string;
    storeName: string;
    storeId: string;
  };
  coopSlug: string;
  disabled?: boolean;
}

export function AddToCartButton({ product, coopSlug, disabled }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = () => {
    setIsAdding(true);
    try {
      // TODO: Implement cart functionality
      // For now, just redirect to mobile app or show a message
      console.log('Add to cart:', { product, quantity });
      
      // Redirect to mobile app with product info
      const mobileAppUrl = `https://mobile.cahootzcoops.com/product/${product.id}`;
      window.location.href = mobileAppUrl;
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
        className="w-full bg-orange-500 hover:bg-orange-600"
        onClick={handleAddToCart}
        disabled={disabled || isAdding}
      >
        <ShoppingCart className="mr-2 h-5 w-5" />
        {isAdding ? "Adding..." : "Add to Cart"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Shopping is available through our mobile app
      </p>
    </div>
  );
}
