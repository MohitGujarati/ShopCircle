/**
 * Formatting helpers shared by every screen that shows a price.
 *
 * WHY THIS FILE EXISTS:
 *   The currency symbol was written inline in five different components. Change
 *   your mind about it — as we just did, rupees to dollars — and you have to
 *   find all five. Here it's one constant, and every screen that imports this
 *   follows automatically.
 */

/** The symbol shown before a price. */
export const CURRENCY = '$';

/**
 * 1234.5 -> "$1,234.50"
 *
 * `price` may arrive as a string: Postgres `numeric(10,2)` comes back as text
 * through the driver, because JS numbers can't represent every decimal exactly.
 * So we coerce, and fall back to printing it raw if it isn't a number at all.
 *
 * en-US gives the thousands/decimal grouping people expect with dollars; the
 * two `FractionDigits` options force "5" to render as "5.00" rather than "5".
 */
export function formatPrice(price: number | string): string {
    const value = Number(price);

    if (!Number.isFinite(value)) return `${CURRENCY}${price}`;

    return `${CURRENCY}${value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}
