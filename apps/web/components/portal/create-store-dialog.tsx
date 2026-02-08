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
import { Plus, Loader2 } from "lucide-react";

interface CreateStoreDialogProps {
  onSuccess?: () => void;
}

export function CreateStoreDialog({ onSuccess }: CreateStoreDialogProps) {
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [communityCommitment, setCommunityCommitment] = useState("10");

  const { data: categories, isLoading: loadingCategories } = api.categories.getStoreCategories.useQuery({
    includeAdminOnly: true,
  });

  const createStore = api.store.createStoreAdmin.useMutation({
    onSuccess: () => {
      setOpen(false);
      resetForm();
      onSuccess?.();
    },
  });

  const resetForm = () => {
    setOwnerId("");
    setName("");
    setDescription("");
    setCategory("");
    setCommunityCommitment("10");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStore.mutate({
      ownerId,
      name,
      description: description || undefined,
      category: category as any,
      communityCommitmentPercent: parseFloat(communityCommitment),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-600 hover:bg-amber-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Store
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Store</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create a store for an existing user (admin only)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ownerId" className="text-gray-300">
              Owner User ID *
            </Label>
            <Input
              id="ownerId"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              placeholder="Enter user ID"
              required
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

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
            <Label htmlFor="commitment" className="text-gray-300">
              Community Commitment % *
            </Label>
            <Input
              id="commitment"
              type="number"
              min="5"
              max="100"
              step="0.1"
              value={communityCommitment}
              onChange={(e) => setCommunityCommitment(e.target.value)}
              required
              className="bg-slate-800 border-slate-700 text-white"
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
              disabled={createStore.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {createStore.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Store"
              )}
            </Button>
          </div>

          {createStore.error && (
            <p className="text-red-400 text-sm">{createStore.error.message}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
