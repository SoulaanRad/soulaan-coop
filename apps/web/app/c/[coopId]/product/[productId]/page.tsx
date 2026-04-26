import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Package,
  Star,
  Store,
  Truck,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddToCartButton } from "./components/add-to-cart-button";
import { CartButton } from "../../components/cart-button";
import { env } from "@/env";

const productTypeIcons: Record<string, typeof Package> = {
  PHYSICAL: Package,
  DIGITAL: Download,
  SERVICE: Wrench,
};

const productTypeLabels: Record<string, string> = {
  PHYSICAL: "Physical Product",
  DIGITAL: "Digital Download",
  SERVICE: "Service",
};

const productTypeDescriptions: Record<string, string> = {
  PHYSICAL: "This item will be shipped to your address",
  DIGITAL: "You will receive a download link after purchase",
  SERVICE: "Book a time slot after purchase",
};

async function getProduct(productId: string) {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const input = JSON.stringify({ productId });
    const url = `${apiUrl}/store.getProduct?input=${encodeURIComponent(input)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.result.data;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

interface PageProps {
  params: Promise<{ coopId: string; productId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: `${product.name} | Shop`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { coopId, productId } = await params;

  const product = await getProduct(productId);

  if (!product) {
    notFound();
  }

  const TypeIcon = productTypeIcons[product.productType] || Package;
  const discount = product.compareAtPrice
    ? Math.round(
        ((product.compareAtPrice - product.priceUSD) / product.compareAtPrice) *
          100
      )
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/c/${coopId}/products`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Link>
            </Button>
            <CartButton coopId={coopId} />
          </div>
        </div>
      </header>

      {/* Product Content */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Product Image */}
            <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50">
                <TypeIcon className="h-24 w-24 text-orange-300" />
              </div>
              {discount > 0 && (
                <Badge className="absolute left-4 top-4 bg-red-500 text-white">
                  {discount}% OFF
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="absolute right-4 top-4 gap-1"
              >
                <TypeIcon className="h-3 w-3" />
                {productTypeLabels[product.productType]}
              </Badge>
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              {/* Store Info */}
              <Link
                href={`/c/${coopId}/store/${product.store.id}`}
                className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Store className="h-4 w-4" />
                <span>{product.store.name}</span>
                {product.store.rating && (
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{product.store.rating}</span>
                  </div>
                )}
              </Link>

              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {product.name}
              </h1>

              <p className="mt-4 text-muted-foreground">{product.description}</p>

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-foreground">
                  ${product.priceUSD.toFixed(2)}
                </span>
                {product.compareAtPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    ${product.compareAtPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Product Type Info */}
              <div className="mt-6 flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                <div className="rounded-full bg-orange-100 p-2">
                  <TypeIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-medium">
                    {productTypeLabels[product.productType]}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {productTypeDescriptions[product.productType]}
                  </div>
                </div>
              </div>

              {/* Stock Status */}
              {product.productType === "PHYSICAL" && product.trackInventory && (
                <div className="mt-4 text-sm">
                  {product.quantity > 10 ? (
                    <span className="text-green-600">In Stock</span>
                  ) : product.quantity > 0 ? (
                    <span className="text-amber-600">
                      Only {product.quantity} left in stock
                    </span>
                  ) : (
                    <span className="text-red-600">Out of Stock</span>
                  )}
                </div>
              )}

              <Separator className="my-6" />

              {/* Add to Cart */}
              <AddToCartButton
                product={{
                  id: product.id,
                  name: product.name,
                  priceUSD: product.priceUSD,
                  productType: product.productType,
                  imageUrl: product.imageUrl,
                }}
                store={{
                  id: product.store.id,
                  name: product.store.name,
                  isScVerified: product.store.isScVerified || false,
                }}
                coopSlug={coopId}
                disabled={product.trackInventory && product.quantity === 0}
              />

              {/* Shipping Info */}
              {product.productType === "PHYSICAL" && (
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>Free shipping on orders over $50</span>
                </div>
              )}
            </div>
          </div>

          {/* Long Description */}
          {product.longDescription && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold">About this product</h2>
              <div className="mt-4 prose prose-neutral max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-muted-foreground">
                  {product.longDescription}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
