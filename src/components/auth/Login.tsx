import { navigate, replace, Routes } from "@/app/navigation/nav";
import { Strings } from "@/constants/strings";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Typography } from "@/constants/theme";
import { useState } from "react";
import { Dimensions, Text, View } from "react-native";
import {
    AuthField,
    AuthScreen,
    FooterLink,
    GoogleButton,
    OrDivider,
    PrimaryButton,
} from "./parts";

const { width } = Dimensions.get("window");

const Login = () => {
    const { signIn } = useAuth();

    // Controlled form: React state holds what the user types.
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // UI state: `loading` blocks double-submits; `errorMsg` shows failures.
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSignIn = async () => {
        if (loading) return; // ignore taps while a request is in flight
        setErrorMsg(null);

        // Cheap client-side check before we bother the server.
        if (!email.trim() || !password) {
            setErrorMsg(Strings.auth.fillAllFields);
            return;
        }

        setLoading(true);
        const { error } = await signIn(email.trim(), password);
        setLoading(false);

        if (error) {
            setErrorMsg(error);
            return;
        }
        // Success. The session is now set, but we navigate explicitly: the auth
        // gate that redirects to Home only runs at "/", and we're on /login, so
        // it isn't mounted to do it for us. `replace` so Back can't return here.
        replace(Routes.HOME);
    };

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
                    value={email}
                    onChangeText={setEmail}
                />
                <AuthField
                    label={Strings.auth.password}
                    placeholder={Strings.auth.passwordPlaceholder}
                    secure
                    autoComplete="password"
                    value={password}
                    onChangeText={setPassword}
                />

                {errorMsg ? (
                    <Text style={{ ...Typography.bodySm, color: Colors.error }}>
                        {errorMsg}
                    </Text>
                ) : null}

                <PrimaryButton
                    label={loading ? Strings.auth.signingIn : Strings.auth.signIn}
                    onPress={handleSignIn}
                />
                <OrDivider label={Strings.auth.or} />
                {/* Google auth is a later slice — inert for now. */}
                <GoogleButton label={Strings.auth.continueWithGoogle} onPress={() => {}} />
            </AuthScreen>
        </View>
    );
};

export default Login;
