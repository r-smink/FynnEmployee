// The product types Luna designs for, and how each becomes a Printful product and an Etsy listing.
// Printful ids are from its public catalog (api.printful.com/products).

export interface ProductSpec {
  printfulId: number
  // Printful print area
  placement: 'front' | 'default'
  layout: 'chest' | 'center' | 'wrap'
  // Garment colour: a dark design goes on the light colour, a light design on the dark one
  colors?: { light: string; dark: string }
  // Printful size names, in the order buyers see them
  sizes: string[]
  // Etsy category names to look for, best first; `prefer` breaks ties between same-named categories
  taxonomy: string[]
  prefer?: string
  // One line for the listing description
  details: string
  // Etsy materials field: letters, numbers and spaces only
  materials: string[]
}

export const PRODUCT_SPECS: Record<string, ProductSpec> = {
  'T-Shirt': {
    printfulId: 71, placement: 'front', layout: 'chest', colors: { light: 'White', dark: 'Black' },
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'], taxonomy: ['T-shirts'], prefer: 'unisex',
    details: 'Unisex Bella + Canvas 3001 t-shirt: soft, lightweight 100% combed ring-spun cotton (heather colours are a cotton blend).',
    materials: ['Cotton', 'Ring spun cotton'],
  },
  Hoodie: {
    printfulId: 146, placement: 'front', layout: 'chest', colors: { light: 'White', dark: 'Black' },
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'], taxonomy: ['Hoodies & Sweatshirts', 'Hoodies', 'Sweatshirts'], prefer: 'unisex',
    details: 'Unisex Gildan 18500 heavy blend hoodie: 50% cotton, 50% polyester, with a front pouch pocket and matching drawcord.',
    materials: ['Cotton', 'Polyester'],
  },
  Mug: {
    printfulId: 19, placement: 'default', layout: 'wrap',
    sizes: ['11 oz', '15 oz'], taxonomy: ['Mugs'],
    details: 'White glossy ceramic mug, printed on both sides. Dishwasher and microwave safe.',
    materials: ['Ceramic'],
  },
  'Tote Bag': {
    printfulId: 367, placement: 'front', layout: 'chest', colors: { light: 'Oyster', dark: 'Black' },
    sizes: ['One size'], taxonomy: ['Tote Bags', 'Totes'],
    details: 'Organic cotton tote bag (Econscious EC8000) with long shoulder handles.',
    materials: ['Organic cotton', 'Cotton'],
  },
  Poster: {
    printfulId: 1, placement: 'default', layout: 'center',
    sizes: ['12″×16″', '18″×24″', '24″×32″'], taxonomy: ['Posters', 'Prints'],
    details: 'Museum-quality poster on thick, durable enhanced matte paper. Frame not included.',
    materials: ['Matte paper', 'Paper'],
  },
  Sticker: {
    printfulId: 358, placement: 'default', layout: 'center',
    sizes: ['3″×3″', '4″×4″', '5.5″×5.5″'], taxonomy: ['Stickers'],
    details: 'Kiss-cut vinyl sticker, cut close around the design. Durable and water-resistant.',
    materials: ['Vinyl'],
  },
}

export const PRODUCT_TYPES = Object.keys(PRODUCT_SPECS)

// Older designs used other names for the same products
const ALIASES: Record<string, string> = { 'Sticker Set': 'Sticker' }

export function productSpec(category: string | null): ProductSpec | null {
  if (!category) return null
  return PRODUCT_SPECS[category] ?? PRODUCT_SPECS[ALIASES[category]] ?? null
}

// The product type name used now, also for older names; null when the type is not made automatically
export function productType(category: string | null): string | null {
  if (!category) return null
  return PRODUCT_SPECS[category] ? category : ALIASES[category] ?? null
}
