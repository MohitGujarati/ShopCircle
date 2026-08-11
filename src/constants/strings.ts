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
    // Top tabs on the Explore screen.
    tabs: {
      posts: "Posts",
      products: "Products",
      people: "People",
    },
    searchPeoplePlaceholder: "Search by name or @username…",
    accounts: "Accounts",
    noResults: "Nothing matched that search.",
    emptyPosts: "No posts yet.",
    emptyProducts: "No products listed yet.",
    emptyPeople: "No one to show yet.",
    loadFailed: "Couldn't load. Pull to try again.",
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
    noReviews: "No reviews yet",
    loadFailed: "Couldn't load this product.",
    notFound: "This product no longer exists.",
    // Checkout isn't built — these say so instead of pretending.
    checkoutSoon: "Checkout isn't wired up yet.",
    checkoutSoonBody: "Payments come later — for now this is just the listing.",
    // Social proof on a product card.
    trending: "Trending",
    interested: "interested", // e.g. `${count} ${Strings.product.interested}`
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
    productNamePlaceholder: "e.g. Handmade ceramic mug",
    price: "Price",
    pricePlaceholder: "0.00",
    description: "Description",
    descriptionPlaceholder: "Material, size, what makes it special…",
    addPhoto: "Add photo",
    addProductPhoto: "Add a product photo",
    changePhoto: "Change photo",

    // Photo strip (PhotoPicker).
    gallery: "Gallery",
    camera: "Camera",
    cover: "Cover",
    firstPhotoIsCover: "First photo is the cover",
    tooManyPhotos: "That's enough photos",
    libraryPermissionTitle: "Photo access needed",
    libraryPermissionBody: "ShopCircle needs access to your photos to add them to a post.",
    publish: "Publish",
    publishing: "Publishing…",

    // Chip groups on the Add product form.
    category: "Category",
    categories: {
      fashion: "Fashion",
      tech: "Tech",
      home: "Home",
      beauty: "Beauty",
      other: "Other",
    },
    condition: "Condition",
    conditions: {
      new: "New",
      used: "Used",
    },
    location: "Location",
    locationPlaceholder: "City, State",

    // Marks the fields you can't publish without.
    required: "*",
    requiredHint: "* required",

    // The single create form: one screen, product fields behind a toggle.
    caption: "Caption",
    captionPlaceholder: "Say something about this…",
    share: "Share",
    sharing: "Sharing…",
    sell: "Sell this item",
    sellHint: "Adds a price and product details so people can buy it.",
    aiLabel: "Add AI label",
    aiLabelHint: "Label realistic content that was made with AI.",

    // Post-only rows. Everything here is UI only for now — the row exists so the
    // screen looks finished, but nothing is wired to a table yet.
    poll: "Poll",
    prompt: "Prompt",
    addAudio: "Add audio",
    tagPeople: "Tag people",
    addLocation: "Add location",
    addLocationHint:
      "People you share this with can see the location you tag and view this content on the map.",
    audience: "Audience",
    followers: "Followers",
    alsoShareOn: "Also share on…",
    off: "Off",
    badgeNew: "New",
    moreOptions: "More options",
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
    fillAllSignUpFields: "Please fill in every field.",
    invalidEmail: "That doesn't look like an email address.",
    invalidUsername: "3–20 characters: letters, numbers and _ only.",
    usernameTaken: "That username is taken.",
    passwordTooShort: "Password must be at least 6 characters.",
    creatingAccount: "Creating account…",
    checkEmail: "Almost there — check your inbox to confirm your address.",
    usernameHint: "This is your @handle. You can't change it later.",

    // Registration screen.
    registerTitle: "Create your account",
    registerSubtitle: "Join ShopCircle to discover and sell products.",
    createAccount: "Create account",
    haveAccount: "Already have an account?",

    // Shared field labels / placeholders.
    name: "Name",
    namePlaceholder: "Jane Doe",
    setUserNamePlaceholder: "Username",
    userNamePlaceholder: "Username",
    email: "Email",
    emailPlaceholder: "Enter your email or username",
    emailOrUserNamePlaceholder: "Email or Username",
    password: "Password",
    passwordPlaceholder: "••••••••",

    // Divider between form and Google button.
    or: "or",
  },
} as const;

export type StringsType = typeof Strings;
