/**
 * Shared regex helpers used by the scrape provider chain and the image
 * proxy. Filters out the obvious non-yacht photos (logos, sprites,
 * favicons, generic share images, social-platform default cards).
 */
export const GENERIC_IMAGE_RE =
  /logo|icon|sprite|placeholder|default|share[-_]?image|favicon|avatar|spacer|pixel|map|watermark/i;
