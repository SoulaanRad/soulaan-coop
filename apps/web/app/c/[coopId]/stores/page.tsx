import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search, Filter, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StoreCard } from "../components/store-card";
import { env } from "@/env";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "FOOD_BEVERAGE", label: "Food & Beverage" },
  { value: "RETAIL", label: "Retail" },
  { value: "SERVICES", label: "Services" },
  { value: "HEALTH_WELLNESS", label: "Health & Wellness" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "EDUCATION", label: "Education" },
  { value: "PROFESSIONAL", label: "Professional" },
];

interface PageProps {
  params: Promise<{ coopId: string }>;
  searchParams: Promise<{ category?: string; search?: string }>;
}

async function getStores(coopId: string, category?: string, search?: string) {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const input = JSON.stringify({ 
      coopId,
      category: category && category !== 'all' ? category : undefined,
      search,
      limit: 100,
    });
    const url = `${apiUrl}/store.getStores?input=${encodeURIComponent(input)}`;
    
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
    return data.result.data.stores || [];
  } catch (error) {
    console.error('Error fetching stores:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { coopId } = await params;
  return {
    title: `Stores | ${coopId} Coop`,
    description: `Browse all stores in the ${coopId} cooperative network`,
  };
}

export default async function StoresPage({ params, searchParams }: PageProps) {
  const { coopId } = await params;
  const { category, search } = await searchParams;

  const stores = await getStores(coopId, category, search);

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
                Community Stores
              </h1>
              <p className="text-muted-foreground">
                {stores.length} stores in the network
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <form className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                name="search"
                placeholder="Search stores..."
                defaultValue={search}
                className="pl-9"
              />
            </div>
            <Select name="category" defaultValue={category || "all"}>
              <SelectTrigger className="w-full sm:w-48">
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
            <Button type="submit">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </form>
        </div>
      </section>

      {/* Store Grid */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Store className="h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">No stores found</h2>
              <p className="mt-2 text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
              <Button variant="outline" asChild className="mt-4">
                <Link href={`/c/${coopId}/stores`}>Clear filters</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stores.map((store: any) => (
                <StoreCard key={store.id} store={{
                  id: store.id,
                  name: store.name,
                  description: store.description || '',
                  category: store.category,
                  imageUrl: store.imageUrl || '/placeholder-store.jpg',
                  rating: store.rating || 0,
                  reviewCount: store.reviewCount || 0,
                  productCount: store.productCount || 0,
                  isScVerified: store.isScVerified || false,
                  isFeatured: store.isFeatured || false,
                }} coopSlug={coopId} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
