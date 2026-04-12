import Link from "next/link";
import Image from "next/image";
import { MapPin, Package, Star, Verified } from "lucide-react";
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
    imageUrl: string;
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
      <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-orange-200">
        {/* Store Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50">
            <span className="text-4xl font-bold text-orange-300">
              {store.name.charAt(0)}
            </span>
          </div>
          {store.isFeatured && (
            <Badge className="absolute left-2 top-2 bg-orange-500 text-white">
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
            <CardTitle className="line-clamp-1 text-lg group-hover:text-orange-600 transition-colors">
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
            <div className="flex items-center gap-1 text-amber-500">
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
