import { navigate, replace, Routes } from "@/app/navigation/nav";
import { Strings } from "@/constants/strings";
import {
    AuthField,
    AuthScreen,
    FooterLink,
    GoogleButton,
    OrDivider,
    PrimaryButton,
} from "./parts";

const Registration = () => {
    // No real auth yet — creating an account just enters the app. Swap for a
    // Supabase sign-up call in Phase 4; `replace` so Back can't return here.
    const enterApp = () => replace(Routes.HOME);

    return (
        <AuthScreen
            title={""}
            subtitle={Strings.auth.registerSubtitle}
            footer={
                <FooterLink
                    prompt={Strings.auth.haveAccount}
                    action={Strings.auth.signIn}
                    onPress={() => navigate(Routes.LOGIN)}
                />
            }
        >
            <AuthField
                label={Strings.auth.name}
                placeholder={Strings.auth.namePlaceholder}
                autoComplete="name"
                autoCapitalize="words"
            />
            <AuthField
                label={Strings.auth.email}
                placeholder={Strings.auth.emailPlaceholder}
                keyboardType="email-address"
                autoComplete="email"
            />
            <AuthField
                label={Strings.auth.password}
                placeholder={Strings.auth.passwordPlaceholder}
                secure
                autoComplete="password-new"
            />

            <PrimaryButton label={Strings.auth.createAccount} onPress={enterApp} />
            <OrDivider label={Strings.auth.or} />
            <GoogleButton label={Strings.auth.continueWithGoogle} onPress={enterApp} />
        </AuthScreen>
    );
};

export default Registration;
