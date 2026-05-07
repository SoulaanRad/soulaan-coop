import Link from "next/link";
import { Package, Star, Verified } from "lucide-react";
import { FallbackImage } from "@/components/ui/fallback-image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StoreCardProps {
  store: {
    id: string;
    name: string;
    description: string;
    category: string;
    imageUrl?: string | null;
    rating: number;
    reviewCount: number;
    productCount: number;
    isScVerified: boolean;
    isFeatured: boolean;
  };
  coopSlug: string;
}

const categoryLabels: Record<string, string> = {
  FOOD_BEVERAGE: "Food & Beverage",
  RETAIL: "Retail",
  SERVICES: "Services",
  HEALTH_WELLNESS: "Health & Wellness",
  ENTERTAINMENT: "Entertainment",
  EDUCATION: "Education",
  PROFESSIONAL: "Professional",
  HOME_GARDEN: "Home & Garden",
  AUTOMOTIVE: "Automotive",
  FOUNDER_PACKAGE: "Founder Package",
  OTHER: "Other",
};

export function StoreCard({ store, coopSlug }: StoreCardProps) {
  return (
    <Link href={`/c/${coopSlug}/store/${store.id}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-[var(--coop-accent)]">
        {/* Store Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-4xl font-bold text-[var(--coop-accent)]/40">
              {store.name.charAt(0)}
            </span>
          </div>
          {store.imageUrl && (
            <FallbackImage
              src={store.imageUrl}
              alt={store.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          )}
          {store.isFeatured && (
            <Badge className="absolute left-2 top-2 bg-[var(--coop-accent)] text-white">
              Featured
            </Badge>
          )}
          {store.isScVerified && (
            <div className="absolute right-2 top-2 rounded-full bg-green-500 p-1">
              <Verified className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-lg group-hover:text-[var(--coop-accent)] transition-colors">
              {store.name}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="w-fit text-xs">
            {categoryLabels[store.category] || store.category}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-3">
          <CardDescription className="line-clamp-2">
            {store.description}
          </CardDescription>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-[var(--coop-accent)]">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-medium">{store.rating}</span>
              <span className="text-muted-foreground">
                ({store.reviewCount})
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>{store.productCount} products</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
