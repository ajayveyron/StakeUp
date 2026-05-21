import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Alert, Platform } from "react-native";

import { useAction } from "convex/react";

import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpayCheckoutScript() {
  if (Platform.OS !== "web") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface PayCallbacks {
  onSuccess?: (commitmentId: Id<"commitments">) => void;
  onDismiss?: (commitmentId: Id<"commitments">) => void;
  onError?: (commitmentId: Id<"commitments">, error: Error) => void;
}

/**
 * Razorpay Checkout integration. Web-only; on native it shows a fallback alert.
 * Caller passes lifecycle callbacks to react to success / user-dismiss / error.
 *
 * Usage:
 *   const { pay, paying } = useRazorpayCheckout({ onSuccess: id => router.push(`/commitment/${id}`) });
 *   await pay(commitmentId);
 */
export function useRazorpayCheckout(callbacks: PayCallbacks = {}) {
  const createCheckoutOrder = useAction(api.payments.createCheckoutOrder);
  const verifyCheckoutPayment = useAction(api.payments.verifyCheckoutPayment);
  const [paying, setPaying] = useState(false);

  async function pay(commitmentId: Id<"commitments">) {
    if (paying) return;
    if (Platform.OS !== "web") {
      Alert.alert(
        "Use the web app for now",
        "Payment checkout is wired for the PWA. Native checkout will land with the native app.",
      );
      return;
    }
    setPaying(true);
    try {
      const loaded = await loadRazorpayCheckoutScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Could not load payment checkout");
      }
      const order = await createCheckoutOrder({ commitmentId });
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: "#FACC15" },
        modal: {
          ondismiss: () => {
            setPaying(false);
            callbacks.onDismiss?.(commitmentId);
          },
        },
        handler: (response) => {
          void verifyCheckoutPayment({
            commitmentId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          })
            .then(() => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              callbacks.onSuccess?.(commitmentId);
            })
            .catch((error) => {
              const err =
                error instanceof Error
                  ? error
                  : new Error("Payment verification failed");
              Alert.alert(
                "Payment verification failed",
                err.message || "Please contact support.",
              );
              callbacks.onError?.(commitmentId, err);
            })
            .finally(() => setPaying(false));
        },
      });
      checkout.open();
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Could not start payment");
      Alert.alert("Could not start payment", err.message || "Please try again.");
      callbacks.onError?.(commitmentId, err);
      setPaying(false);
    }
  }

  return { pay, paying };
}
