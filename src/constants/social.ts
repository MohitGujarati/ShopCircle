/**
 * Thresholds that decide how content is labelled. They live here rather than
 * inside a component because more than one screen judges the same thing — the
 * feed draws a "Trending" badge, Explore ranks by the same number — and two
 * copies of a magic number drift apart the moment one is tuned.
 */

/** Likes a product needs before it counts as trending. */
export const TRENDING_MIN_LIKES = 3;
