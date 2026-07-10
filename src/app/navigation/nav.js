import { router } from 'expo-router';

export const Routes = {
    HOME: '/',
    CREATE: '/create',
    // The Post tab specifically — a photo from the camera lands here.
    CREATE_POST: '/create/post-tab',
    PROFILE: '/profile',
    // Lives outside (tabs)/ so it covers the tab bar when open.
    CAMERA: '/camera',
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

// Go back to the previous screen (like finish() / popping the back stack).
export function goBack() {
    router.back();
}