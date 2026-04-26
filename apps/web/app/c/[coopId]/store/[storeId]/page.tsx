import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Star,
  Verified,
  Package,
  Download,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CartButton } from "../../components/cart-button";
import { env } from "@/env";

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

const categoryLabels: Record<string, string> = {
  FOOD_BEVERAGE: "Food & Beverage",
  RETAIL: "Retail",
  SERVICES: "Services",
  HEALTH_WELLNESS: "Health & Wellness",
  FASHION_APPAREL: "Fashion & Apparel",
  BEAUTY_WELLNESS: "Beauty & Wellness",
  HOME_GARDEN: "Home & Garden",
  TECH_ELECTRONICS: "Tech & Electronics",
  ARTS_CRAFTS: "Arts & Crafts",
  BOOKS_MEDIA: "Books & Media",
  SPORTS_FITNESS: "Sports & Fitness",
  AUTOMOTIVE: "Automotive",
  PETS: "Pets",
  TOYS_GAMES: "Toys & Games",
};

function formatCategoryLabel(category: string | null): string {
  if (!category) return "General";
  return categoryLabels[category] || category.replace(/_/g, " ");
}

async function getStore(storeId: string) {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const input = JSON.stringify({ storeId });
    const url = `${apiUrl}/store.getStore?input=${encodeURIComponent(input)}`;
    
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
    console.error('Error fetching store:', error);
    return null;
  }
}

async function getProducts(storeId: string) {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const input = JSON.stringify({ storeId, limit: 100 });
    const url = `${apiUrl}/store.getProducts?input=${encodeURIComponent(input)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.result.data.products || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

interface PageProps {
  params: Promise<{ coopId: string; storeId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { storeId } = await params;
  const store = await getStore(storeId);

  if (!store) {
    return {
      title: "Store Not Found",
    };
  }

  return {
    title: `${store.name} | Shop`,
    description: store.description,
  };
}

export default async function StoreDetailPage({ params }: PageProps) {
  const { coopId, storeId } = await params;

  const store = await getStore(storeId);
  const products = await getProducts(storeId);

  if (!store) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Store Header/Banner */}
      <header className="relative bg-gradient-to-br from-orange-600 to-amber-500">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              asChild
            >
              <Link href={`/c/${coopId}/stores`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Stores
              </Link>
            </Button>
            <CartButton coopId={coopId} />
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  {store.name}
                </h1>
                {store.isScVerified && (
                  <div className="rounded-full bg-green-500 p-1.5" title="Verified Store">
                    <Verified className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Badge className="bg-white/20 text-white">
                  {formatCategoryLabel(store.category)}
                </Badge>
                {store.rating && (
                  <div className="flex items-center gap-1 text-white">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{store.rating}</span>
                    <span className="text-white/70">
                      ({store.reviewCount} reviews)
                    </span>
                  </div>
                )}
              </div>
              <p className="mt-4 max-w-2xl text-white/90">{store.description}</p>
            </div>

            {/* Contact Info */}
            <div className="flex flex-col gap-2 text-sm text-white/90">
              {store.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {store.address}, {store.city}, {store.state}
                  </span>
                </div>
              )}
              {store.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{store.phone}</span>
                </div>
              )}
              {store.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{store.email}</span>
                </div>
              )}
              {store.website && (
                <a
                  href={store.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Visit Website</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Products Section */}
      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Products</h2>
            <span className="text-muted-foreground">
              {products.length} items available
            </span>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">No products yet</h2>
              <p className="mt-2 text-muted-foreground">
                This store hasn&apos;t added any products yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product: any) => {
                const TypeIcon = productTypeIcons[product.productType] || Package;

                return (
                  <Link
                    key={product.id}
                    href={`/c/${coopId}/product/${product.id}`}
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
                          {store.name}
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
          )}
        </div>
      </section>
    </div>
  );
}
