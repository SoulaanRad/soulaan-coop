"use client";

import { useMemo, useRef, useState } from "react";
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
import { Loader2, Upload } from "lucide-react";

interface BulkProductImportDialogProps {
  storeId: string;
  storeName: string;
  onSuccess?: () => void;
}

const SAMPLE_ROWS = `name,description,category,imageUrl,images,priceUSD,trackInventory,sourceUrl,isActive,isFeatured
Black Girl Sunscreen SPF 30,Moisturizing sunscreen made for melanin-rich skin,BEAUTY,https://example.com/main.jpg,"[""https://example.com/side.jpg""]",9.99,TRUE,https://example.com/product,TRUE,TRUE`;

function countImageUrls(rawRows: string) {
  const urls = rawRows.match(/https?:\/\/[^\s"',\]]+\.(?:jpg|jpeg|png|webp|gif|heic)(?:\?[^\s"',\]]*)?/gi);
  return urls?.length ?? 0;
}

export function BulkProductImportDialog({ storeId, storeName, onSuccess }: BulkProductImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [rawRows, setRawRows] = useState("");
  const [defaultQuantity, setDefaultQuantity] = useState("100");
  const [mirrorImages, setMirrorImages] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [retries, setRetries] = useState("3");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const prepareImport = api.store.prepareBulkProductImportAdmin.useMutation();
  const saveProducts = api.store.savePreparedBulkProductsAdmin.useMutation({
    onSuccess: (result) => {
      if (result.created > 0 || result.updated > 0) {
        onSuccess?.();
      }
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setRawRows(text);
    prepareImport.reset();
    saveProducts.reset();
  };

  const handlePrepare = (event: React.FormEvent) => {
    event.preventDefault();
    saveProducts.reset();
    prepareImport.mutate({
      storeId,
      rawRows,
      mirrorImages,
      retries: parseInt(retries, 10),
    });
  };

  const handleSaveProducts = () => {
    const products = prepareImport.data?.products.filter((product) => product.status === "ready") ?? [];

    saveProducts.mutate({
      storeId,
      defaultQuantity: parseInt(defaultQuantity, 10),
      updateExisting,
      products: products.map((product) => ({
        rowNumber: product.rowNumber,
        name: product.name,
        description: product.description,
        category: product.category,
        imageUrl: product.imageUrl,
        images: product.images,
        priceUSD: product.priceUSD,
        quantity: product.quantity,
        trackInventory: product.trackInventory,
        sourceUrl: product.sourceUrl,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        sku: product.sku,
      })),
    });
  };

  const resetAndClose = () => {
    setOpen(false);
    prepareImport.reset();
    saveProducts.reset();
  };

  const prepared = prepareImport.data;
  const saveResult = saveProducts.data;
  const readyProducts = prepared?.products.filter((product) => product.status === "ready") ?? [];
  const imageUrlCount = useMemo(() => countImageUrls(rawRows), [rawRows]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-slate-700">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Bulk Import Products to {storeName}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Upload a CSV/TSV file or paste spreadsheet rows. Remote image URLs can be copied into Vercel Blob during import.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePrepare} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Label htmlFor="product-file" className="text-gray-300">
                CSV or TSV file
              </Label>
              <Input
                ref={fileInputRef}
                id="product-file"
                type="file"
                accept=".csv,.tsv,text/csv,text/tab-separated-values"
                onChange={handleFileChange}
                className="bg-slate-800 border-slate-700 text-white file:text-white"
              />
            </div>
            <div>
              <Label htmlFor="default-quantity" className="text-gray-300">
                Default quantity
              </Label>
              <Input
                id="default-quantity"
                type="number"
                min="0"
                step="1"
                value={defaultQuantity}
                onChange={(event) => setDefaultQuantity(event.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="product-rows" className="text-gray-300">
                Paste rows
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRawRows(SAMPLE_ROWS);
                  prepareImport.reset();
                  saveProducts.reset();
                }}
                className="h-7 text-xs text-gray-400"
              >
                Insert sample
              </Button>
            </div>
            <Textarea
              id="product-rows"
              value={rawRows}
              onChange={(event) => {
                setRawRows(event.target.value);
                prepareImport.reset();
                saveProducts.reset();
              }}
              placeholder="Paste rows from your spreadsheet here..."
              rows={10}
              className="font-mono text-xs bg-slate-800 border-slate-700 text-white"
            />
            <p className="text-xs text-gray-500 mt-2">
              Header row is optional. Supported columns include name, description, category, imageUrl, images, priceUSD,
              quantity, trackInventory, sourceUrl, isActive, isFeatured, and sku. Your older format with storeId first is
              also supported.
            </p>
            {rawRows.trim().length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Detected about {imageUrlCount} image URL{imageUrlCount === 1 ? "" : "s"} in the pasted data.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800 p-3 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={mirrorImages}
                onChange={(event) => setMirrorImages(event.target.checked)}
                className="h-4 w-4"
              />
              Upload remote images to Blob
            </label>
            <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800 p-3 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(event) => setUpdateExisting(event.target.checked)}
                className="h-4 w-4"
              />
              Update matching products
            </label>
            <div>
              <Label htmlFor="retries" className="text-gray-300">
                Image retries
              </Label>
              <Input
                id="retries"
                type="number"
                min="1"
                max="5"
                step="1"
                value={retries}
                onChange={(event) => setRetries(event.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div
              className={`rounded border p-3 ${
                prepared ? "border-green-800 bg-green-950/20" : prepareImport.isPending ? "border-blue-800 bg-blue-950/30" : "border-slate-700 bg-slate-800"
              }`}
            >
              <p className="text-sm font-medium text-white">Step 1: Upload Images</p>
              <p className="mt-1 text-xs text-gray-400">
                Parse the rows and mirror remote product images into Blob. Nothing is saved to the DB yet.
              </p>
            </div>
            <div
              className={`rounded border p-3 ${
                saveResult ? "border-green-800 bg-green-950/20" : prepared ? "border-amber-800 bg-amber-950/20" : "border-slate-700 bg-slate-800"
              }`}
            >
              <p className="text-sm font-medium text-white">Step 2: Save Products</p>
              <p className="mt-1 text-xs text-gray-400">
                Review the image upload results, then save the prepared products to the database.
              </p>
            </div>
          </div>

          {prepareImport.isError && (
            <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              {prepareImport.error.message}
            </div>
          )}

          {prepareImport.isPending && (
            <div className="rounded border border-blue-900 bg-blue-950/30 p-3 text-sm text-blue-200">
              <div className="flex items-center gap-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading images...
              </div>
              <p className="mt-1 text-xs text-blue-200/80">
                {mirrorImages
                  ? `The importer is mirroring about ${imageUrlCount} image URL${imageUrlCount === 1 ? "" : "s"} into Blob.`
                  : "Image upload is disabled, so the original image URLs will be kept."}
              </p>
            </div>
          )}

          {prepared && (
            <div className="rounded border border-slate-700 bg-slate-800 p-3 text-sm">
              <p className="font-medium text-white">
                Prepared {prepared.total} rows: {prepared.ready} ready, {prepared.failed} failed.
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 rounded border border-slate-700 bg-slate-900 p-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">Image URLs found</p>
                  <p className="text-lg font-semibold text-white">{prepared.imageTotal}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{mirrorImages ? "Images uploaded" : "Upload disabled"}</p>
                  <p className={mirrorImages ? "text-lg font-semibold text-green-400" : "text-lg font-semibold text-gray-400"}>
                    {prepared.imagesUploaded}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Image warnings</p>
                  <p className={prepared.imageWarnings > 0 ? "text-lg font-semibold text-amber-400" : "text-lg font-semibold text-green-400"}>
                    {prepared.imageWarnings}
                  </p>
                </div>
              </div>
              {!mirrorImages && prepared.imageTotal > 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  Image upload was disabled for this import, so products kept the original image URLs.
                </p>
              )}
              {mirrorImages && prepared.imageTotal > 0 && prepared.imagesUploaded === prepared.imageTotal && (
                <p className="mt-2 text-xs text-green-400">All detected product images were uploaded to Blob.</p>
              )}
              {prepared.imageWarnings > 0 && (
                <p className="mt-1 text-amber-400">
                  {prepared.imageWarnings} image upload warning(s). You can still save the products with the images that succeeded.
                </p>
              )}
              <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
                {prepared.products
                  .filter(
                    (product) =>
                      product.status === "failed" ||
                      product.imageErrors.length > 0 ||
                      (product.imageTotal > 0 && product.imagesUploaded < product.imageTotal),
                  )
                  .map((product) => (
                    <div key={`${product.rowNumber}-${product.name}`} className="text-xs text-gray-300">
                      <span className={product.status === "failed" ? "text-red-400" : "text-amber-400"}>
                        Row {product.rowNumber}:
                      </span>{" "}
                      {product.name} {product.error ? `- ${product.error}` : ""}
                      {product.imageTotal > 0 && (
                        <div className="ml-4 text-gray-400">
                          Images uploaded: {product.imagesUploaded}/{product.imageTotal}
                        </div>
                      )}
                      {product.imageErrors.map((error) => (
                        <div key={error} className="ml-4 text-amber-300">
                          {error}
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {saveProducts.isError && (
            <div className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              {saveProducts.error.message}
            </div>
          )}

          {saveProducts.isPending && (
            <div className="rounded border border-blue-900 bg-blue-950/30 p-3 text-sm text-blue-200">
              <div className="flex items-center gap-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving products to the database...
              </div>
            </div>
          )}

          {saveResult && (
            <div className="rounded border border-green-900 bg-green-950/30 p-3 text-sm text-green-200">
              <p className="font-medium">
                Saved {saveResult.total} products: {saveResult.created} created, {saveResult.updated} updated,{" "}
                {saveResult.failed} failed.
              </p>
              {saveResult.failed > 0 && (
                <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                  {saveResult.results
                    .filter((row) => row.status === "failed")
                    .map((row) => (
                      <div key={`${row.rowNumber}-${row.name}`} className="text-xs text-red-300">
                        Row {row.rowNumber}: {row.name} - {row.error}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={resetAndClose} className="border-slate-700">
              {saveResult ? "Close" : "Cancel"}
            </Button>
            {prepared && !saveResult && (
              <Button
                type="button"
                onClick={handleSaveProducts}
                disabled={saveProducts.isPending || readyProducts.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {saveProducts.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `Save ${readyProducts.length} Product${readyProducts.length === 1 ? "" : "s"}`
                )}
              </Button>
            )}
            <Button
              type="submit"
              disabled={prepareImport.isPending || saveProducts.isPending || rawRows.trim().length === 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {prepareImport.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                prepared ? "Re-upload Images" : "Upload Images"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
