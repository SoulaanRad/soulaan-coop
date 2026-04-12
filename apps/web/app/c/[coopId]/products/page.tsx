import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Filter,
  Package,
  Search,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { env } from "@/env";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "FOOD", label: "Food" },
  { value: "BEAUTY", label: "Beauty" },
  { value: "CLOTHING", label: "Clothing" },
  { value: "SERVICES", label: "Services" },
  { value: "BOOKS", label: "Books" },
  { value: "FOUNDER_BADGES", label: "Founder Badges" },
];

const productTypes = [
  { value: "all", label: "All Types" },
  { value: "PHYSICAL", label: "Physical" },
  { value: "DIGITAL", label: "Digital" },
  { value: "SERVICE", label: "Service" },
];

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

async function getProducts(coopId: string, category?: string, productType?: string, search?: string) {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const input = JSON.stringify({ 
      coopId,
      category: category && category !== 'all' ? category : undefined,
      productType: productType && productType !== 'all' ? productType : undefined,
      search,
      limit: 100,
    });
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
  params: Promise<{ coopId: string }>;
  searchParams: Promise<{
    category?: string;
    type?: string;
    search?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { coopId } = await params;
  return {
    title: `Products | ${coopId} Coop`,
    description: `Browse all products from ${coopId} cooperative stores`,
  };
}

export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { coopId } = await params;
  const { category, type, search, sort } = await searchParams;

  let products = await getProducts(coopId, category, type, search);

  // Sort products
  if (sort === "price-asc") {
    products = products.sort((a: any, b: any) => a.priceUSD - b.priceUSD);
  } else if (sort === "price-desc") {
    products = products.sort((a: any, b: any) => b.priceUSD - a.priceUSD);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/c/${coopId}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                All Products
              </h1>
              <p className="text-muted-foreground">
                {products.length} products available
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <form className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                name="search"
                placeholder="Search products..."
                defaultValue={search}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select name="category" defaultValue={category || "all"}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select name="type" defaultValue={type || "all"}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {productTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select name="sort" defaultValue={sort || "featured"}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Product Grid */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">No products found</h2>
              <p className="mt-2 text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
              <Button variant="outline" asChild className="mt-4">
                <Link href={`/c/${coopId}/products`}>Clear filters</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product: any) => {
                const TypeIcon =
                  productTypeIcons[product.productType] || Package;

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
                          {product.store?.name}
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
