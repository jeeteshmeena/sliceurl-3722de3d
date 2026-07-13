import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type OrderInfo = {
  id: string;
  order_number: string;
  amount: number;
  currency: string;
  description: string | null;
  customer_email: string | null;
  customer_name: string | null;
  status: string;
  txn_token: string | null;
  paytm_order_id: string | null;
  mid: string | null;
  env: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

function loadPaytmScript(env: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("paytm-checkout-js") as HTMLScriptElement | null;
    if (existing) return resolve();
    const script = document.createElement("script");
    script.id = "paytm-checkout-js";
    const host = env === "production" ? "securegw.paytm.in" : "securegw-stage.paytm.in";
    // MID appended dynamically after we know it
    script.dataset.host = host;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paytm SDK"));
    document.body.appendChild(script);
  });
}

export default function HostedCheckout() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const status = params.get("status");

  useEffect(() => {
    document.title = "Secure Checkout · SliceURL";
    (async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/merchant-api/public/orders/${id}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load order");
        setOrder(j);
      } catch (e: any) {
        toast.error(e.message ?? "Failed to load order");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const pay = async () => {
    if (!order?.txn_token || !order.mid || !order.paytm_order_id) {
      toast.error("Order not ready for payment");
      return;
    }
    setLaunching(true);
    try {
      const host = order.env === "production" ? "securegw.paytm.in" : "securegw-stage.paytm.in";
      const scriptId = "paytm-checkout-js-dynamic";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://${host}/merchantpgpui/checkoutjs/merchants/${order.mid}.js`;
        script.async = true;
        document.body.appendChild(script);
        await new Promise((res, rej) => {
          script!.onload = () => res(null);
          script!.onerror = () => rej(new Error("Failed to load Paytm SDK"));
        });
      }

      const w = window as any;
      const config = {
        root: "",
        flow: "DEFAULT",
        data: {
          orderId: order.paytm_order_id,
          token: order.txn_token,
          tokenType: "TXN_TOKEN",
          amount: String(order.amount),
        },
        handler: {
          notifyMerchant: (eventName: string) => {
            if (eventName === "SESSION_EXPIRED") toast.error("Session expired");
          },
        },
      };
      if (w.Paytm?.CheckoutJS) {
        w.Paytm.CheckoutJS.onLoad(() => {
          w.Paytm.CheckoutJS.init(config).then(() => w.Paytm.CheckoutJS.invoke());
        });
      } else {
        toast.error("Paytm SDK not available");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Failed to launch Paytm");
    } finally {
      setLaunching(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!order) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Order not found.</div>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 rounded-[14px] space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Secure Payment</h1>
          <p className="text-xs text-muted-foreground mt-1">Powered by Paytm · SliceURL</p>
        </div>

        {status === "success" && (
          <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-700 dark:text-green-400">
            Payment successful. You may close this window.
          </div>
        )}
        {status === "failed" && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-700 dark:text-red-400">
            Payment failed. Please try again.
          </div>
        )}
        {status === "pending" && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-700 dark:text-amber-400">
            Payment pending confirmation.
          </div>
        )}

        <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span className="font-mono text-xs">{order.order_number}</span></div>
          {order.description && <div className="flex justify-between"><span className="text-muted-foreground">Description</span><span className="text-right max-w-[200px]">{order.description}</span></div>}
          {order.customer_email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{order.customer_email}</span></div>}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-lg font-semibold">{order.currency} {Number(order.amount).toFixed(2)}</span>
          </div>
        </div>

        {order.status === "success" ? (
          <div className="text-center text-sm text-green-600 dark:text-green-400">Already paid.</div>
        ) : (
          <Button onClick={pay} disabled={launching || !order.txn_token} className="w-full rounded-xl h-12">
            {launching ? "Launching…" : "Pay Now"}
          </Button>
        )}

        <p className="text-[11px] text-center text-muted-foreground">Your payment is processed securely by Paytm. SliceURL never stores your card details.</p>
      </Card>
    </div>
  );
}
