import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Alert, Platform } from "react-native";

import { useAction } from "convex/react";

import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import colors from "@/constants/colors";

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

type CheckoutOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
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
  onSlotSuccess?: () => void;
  onDepositSuccess?: (commitmentId: Id<"commitments">) => void;
  onDismiss?: (commitmentId?: Id<"commitments">) => void;
  onError?: (commitmentId: Id<"commitments"> | undefined, error: Error) => void;
}

export function useRazorpayCheckout(callbacks: PayCallbacks = {}) {
  const createSlotCheckoutOrder = useAction(api.payments.createSlotCheckoutOrder);
  const verifySlotCheckoutPayment = useAction(
    api.payments.verifySlotCheckoutPayment,
  );
  const createDepositCheckoutOrder = useAction(
    api.payments.createDepositCheckoutOrder,
  );
  const verifyDepositCheckoutPayment = useAction(
    api.payments.verifyDepositCheckoutPayment,
  );
  const [paying, setPaying] = useState(false);

  async function openCheckout(args: {
    commitmentId?: Id<"commitments">;
    order: CheckoutOrder;
    verify: (response: RazorpayCheckoutResponse) => Promise<unknown>;
    onSuccess: () => void;
  }) {
    const loaded = await loadRazorpayCheckoutScript();
    if (!loaded || !window.Razorpay) {
      throw new Error("Could not load payment checkout");
    }

    const checkout = new window.Razorpay({
      key: args.order.keyId,
      amount: Math.round(args.order.amount * 100),
      currency: args.order.currency,
      name: args.order.name,
      description: args.order.description,
      order_id: args.order.orderId,
      prefill: args.order.prefill,
      theme: { color: colors.light.primary },
      modal: {
        ondismiss: () => {
          setPaying(false);
          callbacks.onDismiss?.(args.commitmentId);
        },
      },
      handler: (response) => {
        void args
          .verify(response)
          .then(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            args.onSuccess();
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
            callbacks.onError?.(args.commitmentId, err);
          })
          .finally(() => setPaying(false));
      },
    });
    checkout.open();
  }

  async function buySlot() {
    if (paying) return;
    if (Platform.OS !== "web") {
      Alert.alert(
        "Use the web app for now",
        "Pact Pass checkout is wired for the PWA. Native checkout will land with the native app.",
      );
      return;
    }
    setPaying(true);
    try {
      const order = await createSlotCheckoutOrder({});
      await openCheckout({
        order,
        verify: (response) =>
          verifySlotCheckoutPayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }),
        onSuccess: () => callbacks.onSlotSuccess?.(),
      });
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Could not start payment");
      Alert.alert("Could not start payment", err.message || "Please try again.");
      callbacks.onError?.(undefined, err);
      setPaying(false);
    }
  }

  async function payDeposit(commitmentId: Id<"commitments">) {
    if (paying) return;
    if (Platform.OS !== "web") {
      Alert.alert(
        "Use the web app for now",
        "Deposit checkout is wired for the PWA. Native checkout will land with the native app.",
      );
      return;
    }
    setPaying(true);
    try {
      const order = await createDepositCheckoutOrder({ commitmentId });
      await openCheckout({
        commitmentId,
        order,
        verify: (response) =>
          verifyDepositCheckoutPayment({
            commitmentId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }),
        onSuccess: () => callbacks.onDepositSuccess?.(commitmentId),
      });
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Could not start payment");
      Alert.alert("Could not start payment", err.message || "Please try again.");
      callbacks.onError?.(commitmentId, err);
      setPaying(false);
    }
  }

  return { buySlot, payDeposit, pay: payDeposit, paying };
}
