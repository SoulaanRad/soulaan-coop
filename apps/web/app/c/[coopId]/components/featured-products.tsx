"use client";

import Link from "next/link";
import Image from "next/image";
import { Download, Package, Wrench } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  description: string;
  priceUSD: number;
  imageUrl: string;
  storeName: string;
  category: string;
  productType: string;
}

interface FeaturedProductsProps {
  products: Product[];
  coopSlug: string;
}

const productTypeIcons: Record<string, typeof Package> = {
  PHYSICAL: Package,
  DIGITAL: Download,
  SERVICE: Wrench,
};

const productTypeLabels: Record<string, string> = {
  PHYSICAL: "Physical",
  DIGITAL: "Digital",
  SERVICE: "Service",
};

export function FeaturedProducts({ products, coopSlug }: FeaturedProductsProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => {
        const TypeIcon = productTypeIcons[product.productType] || Package;

        return (
          <Link
            key={product.id}
            href={`/c/${coopSlug}/product/${product.id}`}
          >
            <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-orange-200">
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden bg-muted">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
                  <TypeIcon className="h-12 w-12 text-orange-200" />
                </div>
                <Badge
                  variant="secondary"
                  className="absolute left-2 top-2 gap-1"
                >
                  <TypeIcon className="h-3 w-3" />
                  {productTypeLabels[product.productType]}
                </Badge>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="line-clamp-1 text-base group-hover:text-orange-600 transition-colors">
                  {product.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {product.storeName}
                </p>
              </CardHeader>

              <CardContent className="pb-2">
                <CardDescription className="line-clamp-2 text-sm">
                  {product.description}
                </CardDescription>
              </CardContent>

              <CardFooter className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">
                  ${product.priceUSD.toFixed(2)}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="group-hover:bg-orange-500 group-hover:text-white transition-colors"
                >
                  View
                </Button>
              </CardFooter>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
