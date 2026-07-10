/**
 * theme.ts — the single source of truth for ShopCircle's visual design.
 *
 * WHY THIS FILE EXISTS:
 * Instead of writing raw values like `color: "#E60023"` or `padding: 16` all
 * over the app (called "magic numbers"), we name them once here and reuse the
 * names everywhere. Benefits:
 *   1. Consistency  — every red button is the EXACT same red.
 *   2. One change   — tweak the brand color here, the whole app updates.
 *   3. Readability  — `Colors.primary` says more than `#E60023`.
 *
 * These values come from the design system in
 * `.claude/inspiration.local/social_commerce_modern/DESIGN.md`.
 *
 * `as const` at the end of each object tells TypeScript "these values never
 * change", which gives us exact autocomplete (e.g. Colors.primary is typed as
 * the literal "#E60023", not just any string).
 */

// -------------------------------------------------------------------------
// COLORS
// High-contrast, modern look: white surfaces, black text, red ONLY for actions.
// -------------------------------------------------------------------------
export const Colors = {
  /** Brand red. Use ONLY for actions & active states: Buy, Add to cart,
   *  active nav icon, notification dots. Never for large backgrounds. */
  primary: "#E60023",
  /** Darker red for pressed/active button states. */
  primaryDark: "#B7001A",
  /** Text/icon color that sits on top of a red (primary) surface. */
  onPrimary: "#FFFFFF",

  /** Main app background. */
  background: "#FFFFFF",
  /** Very subtle raised surface (search bar, comment box). */
  surface: "#FAFAFA",
  /** Filled inputs and inactive chips. */
  surfaceMuted: "#EFEFEF",

  /** Primary text, icons, and headers. */
  text: "#000000",
  textPrimary: "#000000",
  /** Secondary/metadata text: timestamps, follower counts. */
  textSecondary: "#737373",

  /** 1px separators and card outlines (we use borders instead of shadows). */
  border: "#DBDBDB",

  /** Error / destructive states. */
  error: "#BA1A1A",

  // Raw values, handy for one-off cases.
  black: "#000000",
  white: "#FFFFFF",

} as const;

// -------------------------------------------------------------------------
// SPACING  (based on a 4px rhythm — every gap is a multiple of 4)
// Use for padding, margin, and gaps so the whole UI breathes consistently.
// -------------------------------------------------------------------------
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  /** Default left/right screen edge padding on mobile. */
  screen: 12,
} as const;

// -------------------------------------------------------------------------
// RADIUS  (corner rounding — disciplined 8–12px, avatars use `full`)
// -------------------------------------------------------------------------
export const Radius = {
  sm: 4,
  md: 8, // default for cards, inputs, large buttons
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999, // circles (avatars) & pill shapes
} as const;

// -------------------------------------------------------------------------
// FONTS
// Be Vietnam Pro font-family names. NOTE: these only work AFTER we load the
// font (next step, via expo-font / @expo-google-fonts). Until then, leaving
// fontFamily unset makes text fall back to the system font — which is fine.
// -------------------------------------------------------------------------
export const Fonts = {
  regular: "BeVietnamPro_400Regular",
  medium: "BeVietnamPro_500Medium",
  semibold: "BeVietnamPro_600SemiBold",
  bold: "BeVietnamPro_700Bold",
} as const;

// -------------------------------------------------------------------------
// TYPOGRAPHY  (a "type scale" — hierarchy driven by weight, not huge sizes)
// Each entry is a ready-to-spread text style: <Text style={Typography.bodyLg} />
// -------------------------------------------------------------------------
export const Typography = {
  /** Big screen titles, e.g. "Explore Ideas". */
  displayLg: { fontSize: 24, fontWeight: "700", lineHeight: 32, letterSpacing: -0.5 },
  /** Section headers / usernames. */
  headlineMd: { fontSize: 18, fontWeight: "600", lineHeight: 24 },
  /** Default body text. */
  bodyLg: { fontSize: 16, fontWeight: "400", lineHeight: 22 },
  /** Smaller body / captions. */
  bodySm: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
  /** Button labels and emphasized small text. */
  labelBold: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
  /** Tiny metadata (timestamps, counts). */
  labelSm: { fontSize: 12, fontWeight: "500", lineHeight: 16 },
} as const;

// -------------------------------------------------------------------------
// One convenient bundle, if you'd rather import a single `theme` object.
// Both styles work:  import { Colors } ...   OR   import { theme } ...
// -------------------------------------------------------------------------
export const theme = {
  colors: Colors,
  spacing: Spacing,
  radius: Radius,
  fonts: Fonts,
  typography: Typography,
} as const;

// Handy types you can reuse later (e.g. a prop that must be a theme color key).
export type ColorName = keyof typeof Colors;
export type SpacingName = keyof typeof Spacing;
