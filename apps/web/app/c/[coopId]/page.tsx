import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Users,
  Store,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CoopHero } from "./components/coop-hero";
import { StoreCard } from "./components/store-card";
import { FeaturedProducts } from "./components/featured-products";
import { JoinWaitlistForm } from "./components/join-waitlist-form";
import { env } from "@/env";

async function getPublicCoopInfo(coopId: string) {
  if(!coopId) {
    return null;
  }
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const input = JSON.stringify({ coopId });
    const url = `${apiUrl}/publicCoopInfo.getByCoopIdWithUnpublished?input=${encodeURIComponent(input)}`;
    
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
    console.error('Error fetching public coop info:', error);
    return null;
  }
}

async function getCoopConfig(coopId: string) {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const input = JSON.stringify({ coopId });
    const url = `${apiUrl}/coopConfig.getActive?input=${encodeURIComponent(input)}`;
    
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
    console.error('Error fetching coop config:', error);
    return null;
  }
}

async function getPreviewData(coopId: string, previewMode: 'live' | 'curated' | 'hybrid') {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const input = JSON.stringify({ coopId, previewMode });
    const url = `${apiUrl}/publicCoopInfo.getPreviewData?input=${encodeURIComponent(input)}`;
    
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
    console.error('Error fetching preview data:', error);
    return null;
  }
}

async function getFeaturedProducts(coopId: string) {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const input = JSON.stringify({ coopId, limit: 8 });
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
    const products = data.result.data.products || [];
    
    // Filter to only featured products
    return products.filter((p: any) => p.isFeatured);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
}





interface PageProps {
  params: Promise<{ coopId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { coopId } = await params;
  const publicInfo = await getPublicCoopInfo(coopId);

  if (!publicInfo) {
    return {
      title: "Coop Not Found",
    };
  }

  const name = publicInfo.name || coopId;
  const description = publicInfo.aboutBody || publicInfo.tagline || `Join ${name}`;

  return {
    title: `${name} | Shop & Join`,
    description,
    openGraph: {
      title: `${name} | Shop & Join`,
      description,
      type: "website",
    },
  };
}

export default async function CoopPublicPage({ params }: PageProps) {
  const { coopId } = await params;
  
  const publicInfo = await getPublicCoopInfo(coopId);
  
  if (!publicInfo) {
    notFound();
  }

  // Fetch coop config for colors and other settings
  const coopConfig = await getCoopConfig(coopId);

  // Fetch preview data (stores and proposals)
  const previewData = await getPreviewData(coopId, publicInfo.previewMode as 'live' | 'curated' | 'hybrid');
  
  // Fetch featured products for this coop
  const featuredProducts = await getFeaturedProducts(coopId);
  
  // Colors are stored as hex values like "#16a34a"
  // Create gradient from primary and accent colors
  const primaryColorHex = coopConfig?.bgColor || '#ea580c'; // orange-600
  const accentColorHex = coopConfig?.accentColor || '#d97706'; // amber-600
  
  // Create inline style for gradient background
  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${primaryColorHex}, ${accentColorHex})`,
  };
  
  // Transform publicInfo to match expected coop structure
  const coop = {
    id: coopId,
    slug: coopId,
    name: publicInfo.name || coopId,
    tagline: publicInfo.tagline || 'Building community wealth together',
    description: publicInfo.aboutBody || publicInfo.heroSubtitle || '',
    mission: publicInfo.missionBody || '',
    bgColor: primaryColorHex,
    accentColor: accentColorHex,
    gradientStyle, // Inline style object for gradient backgrounds
    memberCount: 0, // TODO: Get from stats
    storeCount: previewData?.stores?.length || 0,
    totalProducts: 0, // TODO: Calculate from stores
    stats: {
      treasurySize: '$0', // TODO: Get from treasury
      proposalsFunded: 0, // TODO: Get from proposals
      averageDiscount: '15%',
    },
  };

  // Use preview data for stores, or fall back to mock data
  const stores = previewData?.stores?.map((store: any) => ({
    id: store.id,
    name: store.name,
    description: store.description || '',
    category: store.category || 'OTHER',
    imageUrl: store.imageUrl || '/placeholder-store.jpg',
    rating: 0, // TODO: Get from reviews
    reviewCount: 0,
    productCount: 0, // TODO: Get from products
    isScVerified: false, // TODO: Get from store data
    isFeatured: false,
  })) || mockStores;

  // Use real featured products, or fall back to mock data
  const products = featuredProducts.length > 0 ? featuredProducts.map((product: any) => ({
    id: product.id,
    name: product.name,
    description: product.description || '',
    priceUSD: product.priceUSD,
    imageUrl: product.imageUrl || '/placeholder-product.jpg',
    storeName: product.store?.name || '',
    category: product.category || 'OTHER',
    productType: 'PHYSICAL', // Default to PHYSICAL since productType doesn't exist in schema
  })) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <CoopHero coop={coop} />

      {/* Stats Bar - conditionally rendered based on showStatsBar */}
      {publicInfo.showStatsBar && (
        <section className="border-b bg-card">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground md:text-3xl">
                  {coop.memberCount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground md:text-3xl">
                  {coop.storeCount}
                </div>
                <div className="text-sm text-muted-foreground">Stores</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground md:text-3xl">
                  {coop.totalProducts}
                </div>
                <div className="text-sm text-muted-foreground">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground md:text-3xl">
                  {coop.stats.treasurySize}
                </div>
                <div className="text-sm text-muted-foreground">Treasury</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Featured Products
              </h2>
              <p className="mt-1 text-muted-foreground">
                Popular items from our community stores
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/c/${coopId}/products`}>
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <FeaturedProducts products={products} coopSlug={coopId} />
        </div>
      </section>

      {/* Stores Section */}
      <section className="border-t bg-muted/30 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Community Stores
              </h2>
              <p className="mt-1 text-muted-foreground">
                Shop from businesses in our cooperative network
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href={`/c/${coopId}/stores`}>
                All Stores
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stores.map((store: any) => (
              <StoreCard key={store.id} store={store} coopSlug={coopId} />
            ))}
          </div>
        </div>
      </section>

      {/* Join Section */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl" style={coop.gradientStyle}>
            <div className="grid items-center gap-8 p-8 md:grid-cols-2 md:p-12">
              <div className="text-white">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Join Our Community
                </h2>
                <p className="mt-4 text-lg text-white/90">
                  Become a member of {coop.name} and help build economic
                  independence together. Get access to exclusive discounts,
                  voting rights, and community benefits.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-white/20 p-1">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span>Exclusive member discounts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-white/20 p-1">
                      <Users className="h-4 w-4" />
                    </div>
                    <span>Vote on community proposals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="rounded-full bg-white/20 p-1">
                      <Store className="h-4 w-4" />
                    </div>
                    <span>Support Black-owned businesses</span>
                  </li>
                </ul>
              </div>
              <JoinWaitlistForm coopId={coop.id} coopName={coop.name} primaryColor={coop.bgColor} />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {coop.name}. Part of the Cahootz
              Cooperative Network.
            </div>
            <div className="flex gap-6">
              <Link
                href={`/c/${coopId}/about`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                About
              </Link>
              <Link
                href={`/c/${coopId}/stores`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Stores
              </Link>
              <Link
                href={`/c/${coopId}/products`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Products
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
