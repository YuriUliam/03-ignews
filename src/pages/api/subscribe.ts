import { query as q } from 'faunadb'
import { getSession } from 'next-auth/react'
import { NextApiRequest, NextApiResponse } from 'next'

import { fauna } from '../../services/fauna';
import { stripe } from './../../services/stripe';

type User = {
  ref: {
    id: string
  }
  data: {
    stripe_customer_id: string
  }
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method not allowed')
  }

  const session = await getSession({ req })

  const user = await fauna.query<User>(
    q.Get(
      q.Match(
        q.Index('user_by_email'),
        q.Casefold(session.user.email)
      )
    )
  )

  let customerId = user.data.stripe_customer_id

  if (!customerId) {
    const stripeCustomer = await stripe.customers.create({
      email: session.user.email,
    })

    await fauna.query(
      q.Update(
        q.Ref(q.Collection('users'), user.ref.id),
        { data: { stripe_customer_id: stripeCustomer.id } }
      )
    )

    customerId = stripeCustomer.id
  }

  const stripeCheckoutSession = await stripe.checkout.sessions.create({
    // Basic Information
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer: customerId,
    line_items: [
      { price: 'price_1K3JvjKFVrHamyrQG21sjILW', quantity: 1 }
    ],
    mode: 'subscription',
    payment_method_types: ['card'],

    // URLs
    cancel_url: process.env.STRIPE_CANCEL_URL,
    success_url: process.env.STRIPE_SUCCESS_URL,
  })

  return res.status(200).json({ sessionId: stripeCheckoutSession.id })
}