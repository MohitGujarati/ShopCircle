import { navigate, replace, Routes } from "@/app/navigation/nav";
import { Strings } from "@/constants/strings";
import { Colors, Typography } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
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
    const { signIn, signInWithGoogle, linkError } = useAuth();

    // Either an email or a username — useAuth.signIn resolves a handle to the
    // account's email before calling Supabase.
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    // UI state: `loading` blocks double-submits; `errorMsg` shows failures.
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSignIn = async () => {
        if (loading) return; // ignore taps while a request is in flight
        setErrorMsg(null);

        // Cheap client-side check before we bother the server.
        if (!identifier.trim() || !password) {
            setErrorMsg(Strings.auth.fillAllFields);
            return;
        }

        setLoading(true);
        const { error } = await signIn(identifier.trim(), password);
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

    const handleGoogle = async () => {
        if (loading) return;
        setErrorMsg(null);
        setLoading(true);
        const { error } = await signInWithGoogle();
        setLoading(false);

        if (error) {
            setErrorMsg(error);
            return;
        }
        // No error and no session means the user closed the Google page — stay
        // here silently rather than announcing a failure they caused on purpose.
        const { data } = await supabase.auth.getSession();
        if (data.session) replace(Routes.HOME);
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
                    label={Strings.auth.emailOrUserNamePlaceholder}
                    placeholder={Strings.auth.emailPlaceholder}
                    // Not keyboardType="email-address": that keyboard pushes the
                    // "@" and ".com" keys, which is wrong half the time now.
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={identifier}
                    onChangeText={setIdentifier}
                />
                <AuthField
                    label={Strings.auth.password}
                    placeholder={Strings.auth.passwordPlaceholder}
                    secure
                    autoComplete="password"
                    value={password}
                    onChangeText={setPassword}
                />

                {/* An expired/used email link lands here rather than in the app,
                    so this is where that failure has to be explained. */}
                {errorMsg ?? linkError ? (
                    <Text style={{ ...Typography.bodySm, color: Colors.error }}>
                        {errorMsg ?? linkError}
                    </Text>
                ) : null}

                <PrimaryButton
                    label={loading ? Strings.auth.signingIn : Strings.auth.signIn}
                    onPress={handleSignIn}
                />
                <OrDivider label={Strings.auth.or} />
                <GoogleButton
                    label={Strings.auth.continueWithGoogle}
                    onPress={handleGoogle}
                />
            </AuthScreen>
        </View>
    );
};

export default Login;
