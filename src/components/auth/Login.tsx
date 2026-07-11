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

const Login = () => {
    // No real auth yet — both buttons just drop the user into the app. Swap these
    // for Supabase sign-in calls in Phase 4; `replace` so Back can't return here.
    const enterApp = () => replace(Routes.HOME);

    return (
        <AuthScreen
            title={""}
            subtitle={Strings.auth.loginSubtitle}
            footer={
                <FooterLink
                    prompt={Strings.auth.noAccount}
                    action={Strings.auth.signUp}
                    onPress={() => navigate(Routes.REGISTRATION)}
                />
            }
        >
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
                autoComplete="password"
            />

            <PrimaryButton label={Strings.auth.signIn} onPress={enterApp} />
            <OrDivider label={Strings.auth.or} />
            <GoogleButton label={Strings.auth.continueWithGoogle} onPress={enterApp} />
        </AuthScreen>
    );
};

export default Login;
