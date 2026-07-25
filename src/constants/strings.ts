/**
 * strings.ts — every piece of user-facing text lives here, not in components.
 *
 * WHY:
 *   1. Consistency — "Add to cart" is written once; no "Add to Cart" typos elsewhere.
 *   2. Easy edits  — change wording in one place, it updates across the app.
 *   3. Future i18n — when you later add other languages, this is the file you
 *      translate. Components never hold raw text, so translating is painless.
 *
 * Usage:  import { Strings } from "@/constants/strings";
 *         <Text>{Strings.product.addToCart}</Text>
 *
 * Grouped by screen/feature so it's easy to find. `as const` locks the values
 * for exact autocomplete.
 */
export const Strings = {
  app: {
    name: "ShopCircle",
    tagline: "Discover. Follow. Shop.",
  },

  // Bottom tab bar labels.
  tabs: {
    home: "Home",
    explore: "Explore",
    create: "Create",
    activity: "Activity",
    profile: "Profile",
    messages: "Messages",
  },

  // Actions & words reused across many screens.
  common: {
    buy: "Buy",
    addToCart: "Add to cart",
    buyNow: "Buy now",
    viewDetails: "View Details",
    follow: "Follow",
    following: "Following",
    unfollow: "Unfollow",
    message: "Message",
    share: "Share",
    save: "Save",
    cancel: "Cancel",
    retry: "Retry",
    seeAll: "See all",
    loading: "Loading…",
  },

  // Home feed screen.
  feed: {
    forYou: "For you",
    following: "Following",
    trending: "Trending",
    create: "Create",
    emptyFollowing: "Follow some stores to see their products here.",
    // Post card labels. Counts are added in the component, e.g.
    // `${count} ${Strings.feed.likes}` → "12 likes".
    likes: "likes",
    comments: "comments",
    viewAll: "View all",
    empty: "No posts yet. Tap the + button to share your first one.",
    loadFailed: "Couldn't load the feed.",
    // Delete confirmation, shown from the ⋯ menu on your own posts.
    delete: "Delete",
    deleteTitle: "Delete post?",
    deleteBody: "This can't be undone.",
    deleteFailed: "Couldn't delete the post",
  },

  // Explore / discovery screen.
  explore: {
    title: "Explore Ideas",
    searchPlaceholder: "Search products, stores, people…",
    trending: "TRENDING",
    categories: {
      all: "All",
      home: "Home",
      fashion: "Fashion",
      tech: "Tech",
      beauty: "Beauty",
    },
  },

  // Product details screen.
  product: {
    addToCart: "Add to cart",
    buyNow: "Buy now",
    color: "Color",
    share: "Share",
    reviews: "reviews", // e.g. `${count} ${Strings.product.reviews}`
    outOfStock: "Out of stock",
  },

  // Creator / user profile screen.
  profile: {
    posts: "Posts",
    followers: "Followers",
    following: "Following",
    tabs: {
      products: "Products",
      collections: "Collections",
      likes: "Likes",
    },
    editProfile: "Edit profile",
  },



  // Create / publish product screen (built later).
  create: {
    title: "New product",
    // Top tab bar inside the Create screen.
    tabs: {
      post: "Post",
      product: "Product",
    },
    productName: "Product name",
    price: "Price",
    description: "Description",
    addPhoto: "Add photo",
    publish: "Publish",
  },

  // Full-screen camera opened from the header camera icon.
  camera: {
    post: "Post",
    retake: "Retake",
    // Web has no phone camera to open, so we upload a file from the computer.
    uploadTitle: "Upload a photo",
    uploadBody: "Choose a product photo from your computer.",
    choosePhoto: "Choose photo",
    // Shown while the OS permission has been denied.
    permissionTitle: "Camera access needed",
    permissionBody: "ShopCircle needs your camera to take product photos.",
    grantAccess: "Grant access",
    // Errors surfaced via Alert.
    captureFailed: "Could not take the photo. Please try again.",
    saveFailed: "Photo taken, but it could not be saved to your gallery.",
    galleryFailed: "Could not open your gallery. Please try again.",
  },

  // Auth & onboarding (built in Phase 4/5).
  auth: {
    continueWithGoogle: "Continue with Google",
    welcome: "Welcome to ShopCircle",
    signOut: "Sign out",

    // Login screen.
    loginTitle: "Welcome back",
    loginSubtitle: "Sign in to keep shopping and sharing.",
    signIn: "Sign in",
    signingIn: "Signing in…",
    noAccount: "Don't have an account?",
    signUp: "Sign up",

    // Inline validation / error messages.
    fillAllFields: "Please enter your email and password.",

    // Registration screen.
    registerTitle: "Create your account",
    registerSubtitle: "Join ShopCircle to discover and sell products.",
    createAccount: "Create account",
    haveAccount: "Already have an account?",

    // Shared field labels / placeholders.
    name: "Name",
    namePlaceholder: "Jane Doe",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    passwordPlaceholder: "••••••••",

    // Divider between form and Google button.
    or: "or",
  },
} as const;

export type StringsType = typeof Strings;
