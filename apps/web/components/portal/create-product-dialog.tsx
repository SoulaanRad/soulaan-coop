"use client";

import { useState } from "react";
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
import { Plus, Loader2 } from "lucide-react";

interface CreateProductDialogProps {
  storeId: string;
  storeName: string;
  onSuccess?: () => void;
}

export function CreateProductDialog({ storeId, storeName, onSuccess }: CreateProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceUSD, setPriceUSD] = useState("");
  const [quantity, setQuantity] = useState("0");

  const { data: categories, isLoading: loadingCategories } = api.categories.getProductCategories.useQuery({
    includeAdminOnly: true,
  });

  const createProduct = api.store.addProductAdmin.useMutation({
    onSuccess: () => {
      setOpen(false);
      resetForm();
      onSuccess?.();
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("");
    setPriceUSD("");
    setQuantity("0");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate({
      storeId,
      name,
      description: description || undefined,
      category: category as any,
      priceUSD: parseFloat(priceUSD),
      quantity: parseInt(quantity),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Add Product to {storeName}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a new product (admin can use any category)
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price" className="text-gray-300">
                Price (USD) *
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={priceUSD}
                onChange={(e) => setPriceUSD(e.target.value)}
                placeholder="0.00"
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="quantity" className="text-gray-300">
                Quantity *
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
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
              disabled={createProduct.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {createProduct.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Product"
              )}
            </Button>
          </div>

          {createProduct.error && (
            <p className="text-red-400 text-sm">{createProduct.error.message}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
