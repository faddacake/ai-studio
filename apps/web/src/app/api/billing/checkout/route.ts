export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID_PERSONAL;
  const stripeEnabled = process.env.STRIPE_ENABLED === "true";

  if (!stripeEnabled || !stripeSecretKey || !stripePriceId) {
    return NextResponse.json(
      {
        error: "STRIPE_NOT_CONFIGURED",
        message:
          "Stripe is not configured. Set STRIPE_ENABLED=true, STRIPE_SECRET_KEY, and STRIPE_PRICE_ID_PERSONAL in your environment.",
      },
      { status: 503 },
    );
  }

  // Determine success/cancel URLs
  const origin = request.headers.get("origin") || "http://localhost:3001";
  const successUrl = `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/pricing`;

  try {
    // Use Stripe API directly (no SDK dependency needed)
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        mode: "payment",
        "line_items[0][price]": stripePriceId,
        "line_items[0][quantity]": "1",
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error("[billing] Stripe error:", session);
      return NextResponse.json(
        { error: "STRIPE_ERROR", message: session.error?.message || "Checkout failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing] Checkout error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
