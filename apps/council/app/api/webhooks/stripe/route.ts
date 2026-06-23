import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { councilQuery } from "@/db/council-db";
import { recordFeePayment } from "@/lib/treasurer-queries";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { playerFeeId } = session.metadata ?? {};

    if (!playerFeeId || !session.amount_total) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Idempotency: skip if this payment intent was already recorded
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id;

    const existing = await councilQuery<{ id: string }>(
      `SELECT id FROM fee_payments WHERE reference = $1 LIMIT 1`,
      [paymentIntentId]
    );
    if (existing.rows[0]) {
      return NextResponse.json({ ok: true, skipped: "already recorded" });
    }

    const amountPaid = session.amount_total / 100; // pence → pounds

    await recordFeePayment({
      playerFeeId,
      amount: amountPaid,
      paymentMethod: "stripe",
      paidAt: new Date(session.created * 1000).toISOString(),
      reference: paymentIntentId,
      notes: "Paid online via Stripe",
      recordedBy: null,
    });
  }

  return NextResponse.json({ ok: true });
}
