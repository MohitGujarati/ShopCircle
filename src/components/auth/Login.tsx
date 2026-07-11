import { navigate, replace, Routes } from "@/app/navigation/nav";
import { Strings } from "@/constants/strings";
import { View } from "react-native";
import {
    AuthField,
    AuthScreen,
    FooterLink,
    GoogleButton,
    OrDivider,
    PrimaryButton,
} from "./parts";

import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const Login = () => {
    // No real auth yet — both buttons just drop the user into the app. Swap these
    // for Supabase sign-in calls in Phase 4; `replace` so Back can't return here.
    const enterApp = () => replace(Routes.HOME);

    return (
        <View style={{ width: width > 768 ? "50%" : "100%", flex: 1, alignSelf: "center" }}>


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

        </View>
    );
};

export default Login;
