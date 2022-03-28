import { Client as PrismicClient } from '@prismicio/client'

export function getPrismicClient() {
  const prismic = new PrismicClient(
    process.env.PRISMIC_ENDPOINT,
    {
      accessToken: process.env.PRISMIC_ACCESS_TOKEN
    }
  )

  return prismic;
}
