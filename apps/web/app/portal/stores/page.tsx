"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Store,
  Globe,
  ExternalLink,
  ShieldCheck,
  Star,
  StarOff,
  Package,
  Search,
  Eye,
  DollarSign,
} from "lucide-react";
import { CreateStoreDialog } from "@/components/portal/create-store-dialog";
import { CreateProductDialog } from "@/components/portal/create-product-dialog";

type MainTab = "applications" | "stores" | "featured";
type ApplicationStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
type StoreStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";

export default function StoreManagementPage() {
  const [mainTab, setMainTab] = useState<MainTab>("stores");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Store Management</h1>
          <p className="text-gray-400 mt-1">Manage stores, applications, and featured products</p>
        </div>
        <CreateStoreDialog onSuccess={() => window.location.reload()} />
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 bg-slate-900 rounded-lg p-2">
        <Button
          onClick={() => setMainTab("stores")}
          variant={mainTab === "stores" ? "default" : "ghost"}
          className={mainTab === "stores" ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          <Store className="h-4 w-4 mr-2" />
          All Stores
        </Button>
        <Button
          onClick={() => setMainTab("applications")}
          variant={mainTab === "applications" ? "default" : "ghost"}
          className={mainTab === "applications" ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Applications
        </Button>
        <Button
          onClick={() => setMainTab("featured")}
          variant={mainTab === "featured" ? "default" : "ghost"}
          className={mainTab === "featured" ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          <Star className="h-4 w-4 mr-2" />
          Featured Products
        </Button>
      </div>

      {/* Tab Content */}
      {mainTab === "stores" && <AllStoresTab />}
      {mainTab === "applications" && <ApplicationsTab />}
      {mainTab === "featured" && <FeaturedProductsTab />}
    </div>
  );
}

// ============================================
// ALL STORES TAB
// ============================================
function AllStoresTab() {
  const [statusFilter, setStatusFilter] = useState<StoreStatus | undefined>("APPROVED");
  const [search, setSearch] = useState("");
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const { data, isLoading, refetch } = api.store.getAllStores.useQuery({
    status: statusFilter,
    search: search || undefined,
  });

  const toggleFeatured = api.store.toggleFeatured.useMutation({
    onSuccess: () => refetch(),
  });

  const toggleScVerification = api.store.toggleScVerification.useMutation({
    onSuccess: () => refetch(),
  });

  const stores = data?.stores ?? [];

  const statusTabs: { label: string; value: StoreStatus | undefined }[] = [
    { label: "Approved", value: "APPROVED" },
    { label: "Pending", value: "PENDING" },
    { label: "Suspended", value: "SUSPENDED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "All", value: undefined },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
          {statusTabs.map((tab) => (
            <Button
              key={tab.label}
              onClick={() => setStatusFilter(tab.value)}
              variant={statusFilter === tab.value ? "default" : "ghost"}
              size="sm"
              className={statusFilter === tab.value ? "bg-slate-700" : ""}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search stores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700"
          />
        </div>
      </div>

      {/* Stores List */}
      {stores.length === 0 ? (
        <div className="text-center py-12">
          <Store className="h-12 w-12 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">No stores found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {stores.map((store) => (
            <Card key={store.id} className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-white">{store.name}</h3>
                      {store.isScVerified && (
                        <Badge className="bg-amber-600 text-xs">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          SC Verified
                        </Badge>
                      )}
                      {store.isFeatured && (
                        <Badge className="bg-purple-600 text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {store.category.replace(/_/g, " ")} • Owner: {store.owner.name || store.owner.email}
                    </p>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span><Package className="h-4 w-4 inline mr-1" />{store.productCount} products</span>
                      <span><DollarSign className="h-4 w-4 inline mr-1" />{store.orderCount} orders</span>
                      <span>{store.communityCommitmentPercent}% commitment</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        store.status === "APPROVED"
                          ? "bg-green-600"
                          : store.status === "PENDING"
                          ? "bg-yellow-600"
                          : store.status === "SUSPENDED"
                          ? "bg-red-600"
                          : "bg-gray-600"
                      }
                    >
                      {store.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedStore(selectedStore === store.id ? null : store.id)}
                      className="hover:bg-slate-800"
                    >
                      <Eye className="h-4 w-4 text-gray-400 hover:text-white" />
                    </Button>
                  </div>
                </div>

                {/* Expanded View */}
                {selectedStore === store.id && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                    {/* Store Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800 rounded-lg p-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Store Information</h4>
                        <div className="space-y-2 text-sm">
                          {store.description && (
                            <div>
                              <span className="text-gray-500">Description: </span>
                              <span className="text-white">{store.description}</span>
                            </div>
                          )}
                          {store.address && (
                            <div>
                              <span className="text-gray-500">Address: </span>
                              <span className="text-white">{store.address}</span>
                              {store.city && store.state && (
                                <span className="text-white">, {store.city}, {store.state}</span>
                              )}
                            </div>
                          )}
                          {store.phone && (
                            <div>
                              <span className="text-gray-500">Phone: </span>
                              <span className="text-white">{store.phone}</span>
                            </div>
                          )}
                          {store.email && (
                            <div>
                              <span className="text-gray-500">Email: </span>
                              <span className="text-white">{store.email}</span>
                            </div>
                          )}
                          {store.website && (
                            <div>
                              <span className="text-gray-500">Website: </span>
                              <a 
                                href={store.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-amber-400 hover:text-amber-300"
                              >
                                {store.website} <ExternalLink className="h-3 w-3 inline" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Settings & Stats</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">UC Discount: </span>
                            <span className="text-white">{store.ucDiscountPercent}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Accepts UC: </span>
                            <span className="text-white">{store.acceptsUC ? 'Yes' : 'No'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Total Sales: </span>
                            <span className="text-white">${store.totalSales?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Total Orders: </span>
                            <span className="text-white">{store.orderCount || 0}</span>
                          </div>
                          {store.rating && (
                            <div>
                              <span className="text-gray-500">Rating: </span>
                              <span className="text-white">{store.rating.toFixed(1)} ({store.reviewCount} reviews)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleFeatured.mutate({ storeId: store.id, featured: !store.isFeatured })}
                        disabled={toggleFeatured.isPending}
                      >
                        {store.isFeatured ? (
                          <>
                            <StarOff className="h-4 w-4 mr-1" />
                            Remove Featured
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-1" />
                            Make Featured
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleScVerification.mutate({ storeId: store.id, verified: !store.isScVerified })}
                        disabled={toggleScVerification.isPending}
                      >
                        {store.isScVerified ? (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            Remove SC Verification
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            Grant SC Verification
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Products Section */}
                    <StoreProductsPanel storeId={store.id} storeName={store.name} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// STORE PRODUCTS PANEL
// ============================================
function StoreProductsPanel({ storeId, storeName }: { storeId: string; storeName: string }) {
  const { data: products, isLoading, error, refetch } = api.store.getStoreProductsAdmin.useQuery({
    storeId,
    includeInactive: true,
  });

  const toggleProductFeatured = api.store.toggleProductFeatured.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return <div className="py-4 text-center text-gray-400">Loading products...</div>;
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-red-400 mb-2">Error loading products</p>
        <p className="text-sm text-gray-500">{error.message}</p>
        <Button onClick={() => refetch()} size="sm" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-400 mb-2">No products yet</p>
        <CreateProductDialog storeId={storeId} storeName={storeName} onSuccess={() => refetch()} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-white">Products ({products.length})</h4>
        <CreateProductDialog storeId={storeId} storeName={storeName} onSuccess={() => refetch()} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((product) => (
          <div
            key={product.id}
            className={`bg-slate-800 rounded-lg p-3 border ${
              product.isFeatured ? "border-amber-500" : "border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h5 className="font-medium text-white truncate">{product.name}</h5>
                <p className="text-sm text-gray-400">${product.priceUSD.toFixed(2)}</p>
              </div>
              {!product.isActive && (
                <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {product.quantity} in stock • {product.totalSold} sold
              </span>
              <Button
                variant={product.isFeatured ? "default" : "outline"}
                size="sm"
                className={product.isFeatured ? "bg-amber-600 hover:bg-amber-700 h-7 text-xs" : "h-7 text-xs"}
                onClick={() => toggleProductFeatured.mutate({ productId: product.id, featured: !product.isFeatured })}
                disabled={toggleProductFeatured.isPending}
              >
                {product.isFeatured ? (
                  <>
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Featured
                  </>
                ) : (
                  <>
                    <Star className="h-3 w-3 mr-1" />
                    Feature
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// FEATURED PRODUCTS TAB
// ============================================
function FeaturedProductsTab() {
  const { data, isLoading, refetch } = api.store.getAllStores.useQuery({
    status: "APPROVED",
    limit: 100,
  });

  const toggleProductFeatured = api.store.toggleProductFeatured.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const stores = data?.stores ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Featured Products</CardTitle>
          <CardDescription>
            Select products to feature on the mobile app home page. Featured products appear in the "Featured" section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stores.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No active stores</p>
          ) : (
            <div className="space-y-6">
              {stores.map((store) => (
                <div key={store.id} className="border-b border-slate-800 pb-6 last:border-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Store className="h-4 w-4 text-amber-500" />
                    <h3 className="font-medium text-white">{store.name}</h3>
                    {store.isScVerified && (
                      <Badge className="bg-amber-600 text-xs">SC Verified</Badge>
                    )}
                    <span className="text-sm text-gray-500">({store.productCount} products)</span>
                  </div>
                  {store.productCount > 0 && (
                    <StoreProductsForFeaturing storeId={store.id} onToggle={() => {}} />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StoreProductsForFeaturing({ storeId, onToggle }: { storeId: string; onToggle: () => void }) {
  const { data: products, isLoading, refetch } = api.store.getStoreProductsAdmin.useQuery({
    storeId,
    includeInactive: false,
  });

  const toggleProductFeatured = api.store.toggleProductFeatured.useMutation({
    onSuccess: () => {
      refetch();
      onToggle();
    },
  });

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading...</div>;
  }

  if (!products || products.length === 0) {
    return <div className="text-sm text-gray-400">No active products</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => toggleProductFeatured.mutate({ productId: product.id, featured: !product.isFeatured })}
          disabled={toggleProductFeatured.isPending}
          className={`p-3 rounded-lg border text-left transition-all ${
            product.isFeatured
              ? "bg-amber-600/20 border-amber-500 ring-1 ring-amber-500"
              : "bg-slate-800 border-slate-700 hover:border-slate-600"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm truncate">{product.name}</p>
              <p className="text-xs text-gray-400">${product.priceUSD.toFixed(2)}</p>
            </div>
            {product.isFeatured && (
              <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// ============================================
// APPLICATIONS TAB
// ============================================
function ApplicationsTab() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [grantScVerification, setGrantScVerification] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | undefined>("PENDING");

  const { data, isLoading, error, refetch } = api.store.getStoreApplications.useQuery({
    status: statusFilter,
    limit: 50,
  });

  const applications = data?.stores ?? [];

  const approveStore = api.store.approveStore.useMutation({
    onSuccess: () => {
      setReviewNotes("");
      setGrantScVerification(false);
      refetch();
      setCurrentIndex(0);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const rejectStore = api.store.rejectStore.useMutation({
    onSuccess: () => {
      setRejectionReason("");
      refetch();
      setCurrentIndex(0);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleApprove = () => {
    if (!currentApp) return;
    approveStore.mutate({
      storeId: currentApp.id,
      reviewNotes: reviewNotes || undefined,
      grantScVerification,
    });
  };

  const handleReject = () => {
    if (!currentApp || !rejectionReason || rejectionReason.length < 10) {
      alert("Please provide a rejection reason (at least 10 characters)");
      return;
    }
    rejectStore.mutate({
      storeId: currentApp.id,
      rejectionReason,
    });
  };

  const statusTabs: { label: string; value: ApplicationStatus | undefined }[] = [
    { label: "Pending", value: "PENDING" },
    { label: "Under Review", value: "UNDER_REVIEW" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "All", value: undefined },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
        <div className="text-red-500 text-center">
          <p className="font-semibold">Error loading applications</p>
          <p className="text-sm text-gray-400 mt-2">{error.message}</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
          {statusTabs.map((tab) => (
            <Button
              key={tab.label}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentIndex(0);
              }}
              variant={statusFilter === tab.value ? "default" : "ghost"}
              size="sm"
              className={statusFilter === tab.value ? "bg-slate-700" : ""}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
          <Store className="h-16 w-16 text-gray-600" />
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">No {statusFilter?.toLowerCase() || ""} Applications</h2>
            <p className="text-gray-400">
              {statusFilter === "PENDING"
                ? "All store applications have been reviewed!"
                : `No ${statusFilter?.toLowerCase().replace("_", " ") || ""} applications found.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(currentIndex, applications.length - 1);
  const currentApp = applications[safeIndex];
  const isPending = currentApp?.status === "PENDING" || currentApp?.status === "UNDER_REVIEW";

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
        {statusTabs.map((tab) => (
          <Button
            key={tab.label}
            onClick={() => {
              setStatusFilter(tab.value);
              setCurrentIndex(0);
            }}
            variant={statusFilter === tab.value ? "default" : "ghost"}
            size="sm"
            className={statusFilter === tab.value ? "bg-slate-700" : ""}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
        <Button
          onClick={() => {
            setCurrentIndex(currentIndex - 1);
            setReviewNotes("");
            setRejectionReason("");
          }}
          disabled={safeIndex === 0}
          variant="ghost"
          size="sm"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-gray-400">
          {safeIndex + 1} / {applications.length}
        </span>
        <Button
          onClick={() => {
            setCurrentIndex(currentIndex + 1);
            setReviewNotes("");
            setRejectionReason("");
          }}
          disabled={safeIndex === applications.length - 1}
          variant="ghost"
          size="sm"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Application Card */}
      {currentApp && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Store className="h-5 w-5 text-amber-500" />
                  {currentApp.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {currentApp.category.replace(/_/g, " ")}
                  {currentApp.application?.websiteUrl && (
                    <a
                      href={currentApp.application.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-amber-500 hover:underline inline-flex items-center gap-1"
                    >
                      <Globe className="h-3 w-3" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardDescription>
              </div>
              <Badge
                className={
                  currentApp.status === "PENDING"
                    ? "bg-yellow-500/10 text-yellow-500"
                    : currentApp.status === "APPROVED"
                    ? "bg-green-500/10 text-green-500"
                    : currentApp.status === "REJECTED"
                    ? "bg-red-500/10 text-red-500"
                    : "bg-blue-500/10 text-blue-500"
                }
              >
                {currentApp.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Owner Info */}
            <div>
              <h4 className="font-medium text-amber-500 mb-2">Applicant</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Name:</span> <span className="text-white">{currentApp.owner.name}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="text-white">{currentApp.owner.email}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="text-white">{currentApp.owner.phone || "N/A"}</span></div>
                <div><span className="text-gray-500">Applied:</span> <span className="text-white">{new Date(currentApp.createdAt).toLocaleDateString()}</span></div>
              </div>
            </div>

            {/* Store Description */}
            {currentApp.application?.storeDescription && (
              <div>
                <h4 className="font-medium text-amber-500 mb-2">Store Description</h4>
                <p className="text-sm text-gray-300 bg-slate-800 p-3 rounded-lg">
                  {currentApp.application.storeDescription}
                </p>
              </div>
            )}

            {/* Community Benefit */}
            {currentApp.application?.communityBenefitStatement && (
              <div>
                <h4 className="font-medium text-amber-500 mb-2">Community Benefit Statement</h4>
                <p className="text-sm text-gray-300 bg-slate-800 p-3 rounded-lg">
                  {currentApp.application.communityBenefitStatement}
                </p>
              </div>
            )}

            {/* Commitment */}
            <div>
              <h4 className="font-medium text-amber-500 mb-2">Community Commitment</h4>
              <Badge className="bg-green-600">{currentApp.communityCommitmentPercent}%</Badge>
            </div>

            {/* Actions for pending */}
            {isPending && (
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={grantScVerification}
                    onChange={(e) => setGrantScVerification(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  <span>Grant SC Verification on approval</span>
                </label>

                <div>
                  <Label>Review Notes (optional)</Label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Notes for this review..."
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>

                <div>
                  <Label>Rejection Reason (required if rejecting)</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Reason for rejection (min 10 chars)..."
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleReject}
                    disabled={rejectStore.isPending || approveStore.isPending}
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={approveStore.isPending || rejectStore.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
