// The products a person can be using (Nov 5 2026). One account, one set
// list, one usage pool; the product tells rows and events apart. Safe to
// import in the browser.
export const PRODUCTS = ['bits', 'realtors'] as const
export type Product = (typeof PRODUCTS)[number]
export const DEFAULT_PRODUCT: Product = 'bits'

export function asProduct(v: unknown): Product {
  return PRODUCTS.includes(v as Product) ? (v as Product) : DEFAULT_PRODUCT
}
