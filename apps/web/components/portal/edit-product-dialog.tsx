"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Loader2 } from "lucide-react";
import { CompactImageUpload } from "./compact-image-upload";

interface EditProductDialogProps {
  product: {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    imageUrl?: string | null;
    images?: string[];
    priceUSD: number;
    compareAtPrice?: number | null;
    ucDiscountPrice?: number | null;
    sku?: string | null;
    quantity: number;
    trackInventory: boolean;
    allowBackorder: boolean;
    isActive: boolean;
    isFeatured: boolean;
  };
  onSuccess?: () => void;
}

export function EditProductDialog({ product, onSuccess }: EditProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || "");
  const [category, setCategory] = useState(product.category || "");
  const [imageUrl, setImageUrl] = useState(product.imageUrl || "");
  const [additionalImages, setAdditionalImages] = useState<string[]>(product.images || []);
  const [priceUSD, setPriceUSD] = useState(product.priceUSD.toString());
  const [compareAtPrice, setCompareAtPrice] = useState(product.compareAtPrice?.toString() || "");
  const [ucDiscountPrice, setUcDiscountPrice] = useState(product.ucDiscountPrice?.toString() || "");
  const [sku, setSku] = useState(product.sku || "");
  const [quantity, setQuantity] = useState(product.quantity.toString());
  const [trackInventory, setTrackInventory] = useState(product.trackInventory);
  const [allowBackorder, setAllowBackorder] = useState(product.allowBackorder);
  const [isActive, setIsActive] = useState(product.isActive);

  const { data: categories, isLoading: loadingCategories } = api.categories.getProductCategories.useQuery({
    includeAdminOnly: true,
  });

  const updateProduct = api.store.updateProductAdmin.useMutation({
    onSuccess: () => {
      setOpen(false);
      onSuccess?.();
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(product.name);
      setDescription(product.description || "");
      setCategory(product.category || "");
      setImageUrl(product.imageUrl || "");
      setAdditionalImages(product.images || []);
      setPriceUSD(product.priceUSD.toString());
      setCompareAtPrice(product.compareAtPrice?.toString() || "");
      setUcDiscountPrice(product.ucDiscountPrice?.toString() || "");
      setSku(product.sku || "");
      setQuantity(product.quantity.toString());
      setTrackInventory(product.trackInventory);
      setAllowBackorder(product.allowBackorder);
      setIsActive(product.isActive);
    }
  }, [open, product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {
      productId: product.id,
    };

    if (name !== product.name) updateData.name = name;
    if (description !== (product.description || "")) updateData.description = description || null;
    if (category !== (product.category || "")) updateData.category = category || null;
    if (imageUrl !== (product.imageUrl || "")) updateData.imageUrl = imageUrl || null;
    if (JSON.stringify(additionalImages) !== JSON.stringify(product.images || [])) {
      updateData.images = additionalImages.length > 0 ? additionalImages : [];
    }
    if (parseFloat(priceUSD) !== product.priceUSD) updateData.priceUSD = parseFloat(priceUSD);
    if (compareAtPrice !== (product.compareAtPrice?.toString() || "")) {
      updateData.compareAtPrice = compareAtPrice ? parseFloat(compareAtPrice) : null;
    }
    if (ucDiscountPrice !== (product.ucDiscountPrice?.toString() || "")) {
      updateData.ucDiscountPrice = ucDiscountPrice ? parseFloat(ucDiscountPrice) : null;
    }
    if (sku !== (product.sku || "")) updateData.sku = sku || null;
    if (parseInt(quantity) !== product.quantity) updateData.quantity = parseInt(quantity);
    if (trackInventory !== product.trackInventory) updateData.trackInventory = trackInventory;
    if (allowBackorder !== product.allowBackorder) updateData.allowBackorder = allowBackorder;
    if (isActive !== product.isActive) updateData.isActive = isActive;

    updateProduct.mutate(updateData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Product</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update product details and settings
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-300">
              Product Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              required
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-gray-300">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter product description"
              className="bg-slate-800 border-slate-700 text-white"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-gray-300">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {loadingCategories ? (
                  <div className="p-2 text-center text-gray-400">Loading...</div>
                ) : (
                  categories?.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key} className="text-white">
                      {cat.label}
                      {cat.isAdminOnly && " (Admin Only)"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300 mb-2 block">Product Images</Label>
            <div className="flex flex-wrap gap-2">
              <CompactImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                label="Main Image"
              />
              {[0, 1, 2].map((idx) => (
                <CompactImageUpload
                  key={idx}
                  value={additionalImages[idx] || ""}
                  onChange={(url) => {
                    const newImages = [...additionalImages];
                    if (url) {
                      newImages[idx] = url;
                    } else {
                      newImages.splice(idx, 1);
                    }
                    setAdditionalImages(newImages.filter(Boolean));
                  }}
                  label={`Image ${idx + 2}`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priceUSD" className="text-gray-300">
                Price (USD) *
              </Label>
              <Input
                id="priceUSD"
                type="number"
                step="0.01"
                min="0"
                value={priceUSD}
                onChange={(e) => setPriceUSD(e.target.value)}
                placeholder="0.00"
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="compareAtPrice" className="text-gray-300">
                Compare At Price (Optional)
              </Label>
              <Input
                id="compareAtPrice"
                type="number"
                step="0.01"
                min="0"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="0.00"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ucDiscountPrice" className="text-gray-300">
                UC Discount Price (Optional)
              </Label>
              <Input
                id="ucDiscountPrice"
                type="number"
                step="0.01"
                min="0"
                value={ucDiscountPrice}
                onChange={(e) => setUcDiscountPrice(e.target.value)}
                placeholder="0.00"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="sku" className="text-gray-300">
                SKU (Optional)
              </Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU-123"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="quantity" className="text-gray-300">
              Quantity in Stock
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div>
                <Label className="text-gray-300">Track Inventory</Label>
                <p className="text-xs text-gray-500">Monitor stock levels for this product</p>
              </div>
              <Button
                type="button"
                variant={trackInventory ? "default" : "outline"}
                size="sm"
                onClick={() => setTrackInventory(!trackInventory)}
                className={trackInventory ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {trackInventory ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div>
                <Label className="text-gray-300">Allow Backorder</Label>
                <p className="text-xs text-gray-500">Allow purchases when out of stock</p>
              </div>
              <Button
                type="button"
                variant={allowBackorder ? "default" : "outline"}
                size="sm"
                onClick={() => setAllowBackorder(!allowBackorder)}
                className={allowBackorder ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {allowBackorder ? "Enabled" : "Disabled"}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div>
                <Label className="text-gray-300">Active Status</Label>
                <p className="text-xs text-gray-500">Show product in store listings</p>
              </div>
              <Button
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsActive(!isActive)}
                className={isActive ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isActive ? "Active" : "Inactive"}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={updateProduct.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={updateProduct.isPending}
            >
              {updateProduct.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>

          {updateProduct.error && (
            <p className="text-sm text-red-400 text-center">
              {updateProduct.error.message}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
