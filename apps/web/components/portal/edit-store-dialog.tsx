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
import { BlobImageUpload } from "./blob-image-upload";

interface EditStoreDialogProps {
  coopId: string;
  store: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
    bannerUrl: string | null;
    ownerId: string;
  };
  onSuccess?: () => void;
}

export function EditStoreDialog({ coopId, store, onSuccess }: EditStoreDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(store.name);
  const [description, setDescription] = useState(store.description || "");
  const [category, setCategory] = useState(store.category);
  const [imageUrl, setImageUrl] = useState(store.imageUrl || "");
  const [bannerUrl, setBannerUrl] = useState(store.bannerUrl || "");

  const { data: categories, isLoading: loadingCategories } = api.categories.getStoreCategories.useQuery({
    includeAdminOnly: true,
  });

  const updateStore = api.store.updateStore.useMutation({
    onSuccess: () => {
      setOpen(false);
      onSuccess?.();
    },
  });

  useEffect(() => {
    if (open) {
      setName(store.name);
      setDescription(store.description || "");
      setCategory(store.category);
      setImageUrl(store.imageUrl || "");
      setBannerUrl(store.bannerUrl || "");
    }
  }, [open, store]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore.mutate({
      storeId: store.id,
      name,
      description: description || undefined,
      category: category as any,
      imageUrl: imageUrl || undefined,
      bannerUrl: bannerUrl || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-slate-700">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Store
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Store</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update store information and images
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-gray-300">
              Store Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter store name"
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
              placeholder="Enter store description"
              className="bg-slate-800 border-slate-700 text-white"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-gray-300">
              Category *
            </Label>
            <Select value={category} onValueChange={setCategory} required>
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
            <BlobImageUpload
              uploadType="store"
              coopId={coopId}
              resourceId={store.ownerId}
              label="Store Image"
              description="Upload a logo or main image for the store"
              aspectRatio="aspect-square"
              onUploadComplete={(url) => setImageUrl(url)}
              currentImageUrl={imageUrl}
            />
          </div>

          <div>
            <BlobImageUpload
              uploadType="store"
              coopId={coopId}
              resourceId={store.ownerId}
              label="Store Banner"
              description="Upload a wide banner image for the store"
              aspectRatio="aspect-video"
              onUploadComplete={(url) => setBannerUrl(url)}
              currentImageUrl={bannerUrl}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateStore.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {updateStore.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Store"
              )}
            </Button>
          </div>

          {updateStore.error && (
            <p className="text-red-400 text-sm">{updateStore.error.message}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
