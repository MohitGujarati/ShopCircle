import { type Href, Redirect } from "expo-router";
import { Routes } from "./navigation/nav";

export default function Index() {
    const isUserLoggedIn = false;

    // Routes come from a plain-JS file, so they're typed as `string`; Expo's
    // typed-routes want a specific Href, hence the cast.
    if (isUserLoggedIn) {
        // Send them to the home tabs if they're signed in.
        return <Redirect href={Routes.HOME as Href} />;
    } else {
        // Otherwise send them to the login screen.
        return <Redirect href={Routes.LOGIN as Href} />;
    }
}
