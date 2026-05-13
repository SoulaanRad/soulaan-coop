"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Store, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/cart-context";
import { api } from "@/lib/trpc/client";
import { useWeb3Auth } from "@/hooks/use-web3-auth";
import { usePostHog } from "posthog-js/react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { env } from "@/env";

const stripePromise = loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({
  coopId,
  onSuccess,
}: {
  coopId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/c/${coopId}/checkout/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed. Please try again.");
      } else {
        onSuccess();
      }
    } catch (err) {
      console.error("Payment error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        size="lg"
        className="w-full bg-[var(--coop-accent)] text-[var(--coop-accent-foreground)] hover:opacity-90 transition-opacity"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          "Complete Payment"
        )}
      </Button>
      {errorMessage && (
        <p className="text-sm text-red-500">{errorMessage}</p>
      )}
    </form>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const coopId = params.coopId as string;
  const storeId = searchParams.get("storeId");
  const posthog = usePostHog();
  const checkoutStartedFired = useRef(false);

  const { user } = useWeb3Auth();
  const { getStoreItems, clearStoreItems } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [storeInfo, setStoreInfo] = useState<{
    name: string;
    isScVerified: boolean;
    businessId: string | null;
  } | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [needsGuestInfo, setNeedsGuestInfo] = useState(false);

  const cartItems = storeId ? getStoreItems(storeId) : [];
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.priceUSD * item.quantity,
    0
  );

  // Fetch store details to get businessId
  const { data: storeData, isLoading: storeLoading } = api.store.getStore.useQuery(
    { storeId: storeId || "" },
    { enabled: !!storeId }
  );

  const createCheckoutMutation = api.commerce.createCheckout.useMutation();

  useEffect(() => {
    if (!storeId || cartItems.length === 0) {
      setError("Invalid checkout. Please add items to your cart.");
      setLoading(false);
      return;
    }

    // Wait for store data to load
    if (storeLoading) {
      return;
    }

    if (!storeData) {
      setError("Store not found.");
      setLoading(false);
      return;
    }

    if (!storeData.businessId) {
      setError("This store is not set up to accept payments yet.");
      setLoading(false);
      return;
    }

    // Set store info
    setStoreInfo({
      name: storeData.name,
      isScVerified: storeData.isScVerified,
      businessId: storeData.businessId,
    });

    // If not authenticated, show guest info form
    if (!user?.id) {
      setNeedsGuestInfo(true);
      setLoading(false);
      return;
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, user?.id, storeData, storeLoading]);

  const orderItemsMetadata = cartItems.map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    priceUSD: item.priceUSD,
  }));

  const handleAuthenticatedCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id || !storeInfo?.businessId) return;

    const trimmedShippingAddress = shippingAddress.trim();
    if (!trimmedShippingAddress) {
      setFormError("Enter the shipping address so the store owner knows where to send the order.");
      return;
    }

    setIsCreatingCheckout(true);
    setFormError(null);

    try {
      const result = await createCheckoutMutation.mutateAsync({
        userId: user.id,
        coopId,
        businessId: storeInfo.businessId,
        listedAmountCents: Math.round(subtotal * 100),
        currency: "USD",
        metadata: {
          items: orderItemsMetadata,
          shippingAddress: trimmedShippingAddress,
        },
      });

      setClientSecret(result.clientSecret);
      if (!checkoutStartedFired.current) {
        posthog.capture("checkout_started", {
          coop_id: coopId,
          store_id: storeId,
          store_name: storeInfo.name,
          is_sc_verified: storeInfo.isScVerified,
          subtotal_usd: subtotal,
          item_count: cartItems.length,
          checkout_type: "authenticated",
        });
        checkoutStartedFired.current = true;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setFormError(err.message || "Failed to initialize checkout");
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const handleGuestCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeId || !guestEmail || !storeInfo?.businessId) return;

    const trimmedShippingAddress = shippingAddress.trim();
    if (!trimmedShippingAddress) {
      setFormError("Enter the shipping address so the store owner knows where to send the order.");
      return;
    }
    
    setIsCreatingCheckout(true);
    setFormError(null);

    try {
      const result = await createCheckoutMutation.mutateAsync({
        coopId,
        businessId: storeInfo.businessId,
        listedAmountCents: Math.round(subtotal * 100),
        currency: "USD",
        guestEmail,
        guestName: guestName || undefined,
        metadata: {
          items: orderItemsMetadata,
          shippingAddress: trimmedShippingAddress,
        },
      });

      setClientSecret(result.clientSecret);
      setNeedsGuestInfo(false);
      if (!checkoutStartedFired.current) {
        posthog.capture("checkout_started", {
          coop_id: coopId,
          store_id: storeId,
          store_name: storeInfo.name,
          is_sc_verified: storeInfo.isScVerified,
          subtotal_usd: subtotal,
          item_count: cartItems.length,
          checkout_type: "guest",
        });
        checkoutStartedFired.current = true;
      }
    } catch (err: any) {
      console.error("Guest checkout error:", err);
      setFormError(err.message || "Failed to initialize checkout");
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const handleSuccess = () => {
    if (storeId) {
      clearStoreItems(storeId);
    }
    posthog.capture("checkout_completed", {
      coop_id: coopId,
      store_id: storeId,
      store_name: storeInfo?.name,
      is_sc_verified: storeInfo?.isScVerified,
      subtotal_usd: subtotal,
      item_count: cartItems.length,
    });
    setPaymentSuccess(true);
  };

  if (!storeId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-bold">Invalid Checkout</h2>
            <p className="mb-4 text-muted-foreground">
              No store selected for checkout.
            </p>
            <Button asChild>
              <Link href={`/c/${coopId}/cart`}>Return to Cart</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">Order Placed!</h2>
            <p className="mb-4 text-muted-foreground">
              Your order has been successfully placed.
            </p>
            {storeInfo?.isScVerified && (
              <div className="mb-4 rounded-lg bg-[var(--coop-accent)]/10 p-4">
                <p className="text-sm text-[var(--coop-accent)]">
                  🪙 You'll earn SC rewards when your payment completes!
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" asChild className="flex-1">
                <Link href={`/c/${coopId}/stores`}>Continue Shopping</Link>
              </Button>
              <Button asChild className="flex-1 bg-[var(--coop-accent)] text-[var(--coop-accent-foreground)] hover:opacity-90 transition-opacity">
                <Link href={`/c/${coopId}`}>Go to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsGuestInfo) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/c/${coopId}/cart`}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-xl font-bold">Guest Checkout</h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-md px-4 py-8 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact and shipping</CardTitle>
              <CardDescription>
                Enter where the store should send your order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGuestCheckout} className="space-y-4">
                <div>
                  <Label htmlFor="guestName">Name (Optional)</Label>
                  <Input
                    id="guestName"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="guestEmail">Email *</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guestShippingAddress">Shipping address *</Label>
                  <Textarea
                    id="guestShippingAddress"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Street address, apartment, city, state, ZIP"
                    rows={4}
                    required
                  />
                </div>
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="font-medium mb-1">Order Total</p>
                  <p className="text-2xl font-bold">${subtotal.toFixed(2)}</p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} from {storeInfo?.name}
                  </p>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[var(--coop-accent)] text-[var(--coop-accent-foreground)] hover:opacity-90 transition-opacity"
                  disabled={isCreatingCheckout}
                >
                  {isCreatingCheckout ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue to Payment"
                  )}
                </Button>
                {formError && (
                  <p className="text-sm text-red-500 text-center">{formError}</p>
                )}
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[var(--coop-accent)]" />
          <p className="text-muted-foreground">Initializing checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-bold">Checkout Error</h2>
            <p className="mb-4 text-muted-foreground">{error}</p>
            <Button asChild>
              <Link href={`/c/${coopId}/cart`}>Return to Cart</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/c/${coopId}/cart`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold">Checkout</h1>
          </div>
        </div>
      </header>

      {/* Checkout Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                {storeInfo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="h-4 w-4" />
                    <span>{storeInfo.name}</span>
                    {storeInfo.isScVerified && (
                      <div className="flex items-center gap-1">
                        <BadgeCheck className="h-4 w-4 text-[var(--coop-accent)]" />
                        <span className="text-[var(--coop-accent)]">SC Verified</span>
                      </div>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">
                      ${(item.priceUSD * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>
                  Enter your payment information to complete the purchase
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!clientSecret && (
                  <form onSubmit={handleAuthenticatedCheckout} className="space-y-4">
                    <div>
                      <Label htmlFor="shippingAddress">Shipping address *</Label>
                      <Textarea
                        id="shippingAddress"
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Street address, apartment, city, state, ZIP"
                        rows={4}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-[var(--coop-accent)] text-[var(--coop-accent-foreground)] hover:opacity-90 transition-opacity"
                      disabled={isCreatingCheckout}
                    >
                      {isCreatingCheckout ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Preparing payment...
                        </>
                      ) : (
                        "Continue to Payment"
                      )}
                    </Button>
                    {formError && (
                      <p className="text-sm text-red-500">{formError}</p>
                    )}
                  </form>
                )}
                {clientSecret && (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: "stripe",
                      },
                    }}
                  >
                    <CheckoutForm
                      coopId={coopId}
                      onSuccess={handleSuccess}
                    />
                  </Elements>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
