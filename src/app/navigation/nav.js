import { router } from 'expo-router';

export const Routes = {
    // Home feed lives at /home so the root index route (/) is free to act as
    // the auth gate that decides between /home and /login.
    HOME: '/home',
    CREATE: '/create',
    // Create is ONE screen now — posting and selling are the same form, split
    // by a toggle inside it. These two aliases stay so older links (and the
    // camera's `returnTo`) keep resolving somewhere valid.
    CREATE_POST: '/create',
    CREATE_PRODUCT: '/create',
    // Browsing posts vs products IS two screens, so the top tabs moved here.
    EXPLORE_POSTS: '/explore/post-tab',
    EXPLORE_PRODUCTS: '/explore/product-tab',
    PROFILE: '/profile',
    // Lives outside (tabs)/ so it covers the tab bar when open.
    CAMERA: '/camera',
    LOGIN: '/login',
    REGISTRATION: '/registration',
};

// 1) Plain navigation — just the destination.
//    navigate(Routes.ABOUT)
export function navigate(to) {
    router.navigate(to);
}

// 2) Navigation with values — pass data to the destination screen.
//    navigateWithParams(Routes.PROFILE, { id: 7, name: 'Mohit' })
//    Read them on the other side with: const params = useLocalSearchParams();
export function navigateWithParams(to, params) {
    router.navigate({ pathname: to, params });
}

// 3) Navigation that REPLACES the current screen instead of stacking on top of it.
//    Use this when the screen you are leaving should not be somewhere "back"
//    can return to — e.g. after posting a photo, back should not reopen the
//    camera. On web this also means one browser-history entry instead of two.
//    replaceWithParams(Routes.CREATE_POST, { photoUri })
export function replaceWithParams(to, params) {
    router.replace({ pathname: to, params });
}

// 4) Replace the current screen with a new one (no back entry). Same idea as
//    replaceWithParams but when you have no params — e.g. after signing in,
//    Back should not return to the login screen.
//    replace(Routes.HOME)
export function replace(to) {
    router.replace(to);
}

// Go back to the previous screen (like finish() / popping the back stack).
export function goBack() {
    router.back();
}

// Open one product's page. The id is part of the PATH, not a query param —
// /product/abc-123 matches the dynamic route file app/product/[id].tsx.
export function openProduct(id) {
    router.navigate(`/product/${id}`);
}