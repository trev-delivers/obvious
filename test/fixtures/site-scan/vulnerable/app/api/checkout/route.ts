import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_KEY);
export async function POST(request) {
  const { amount, name } = await request.json();
  const session = await stripe.checkout.sessions.create({
    line_items: [{ price_data: { currency: "gbp", product_data: { name }, unit_amount: amount }, quantity: 1 }],
    mode: "payment",
  });
  return Response.json({ url: session.url });
}
