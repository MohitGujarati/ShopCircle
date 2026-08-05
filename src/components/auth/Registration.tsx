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

// Mirrors the CHECK constraint in supabase/username.sql. Validating in both
// places is deliberate: this one gives a helpful message, the database one is
// what actually guarantees it.
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const Registration = () => {
    const { signUp, signInWithGoogle } = useAuth();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [infoMsg, setInfoMsg] = useState<string | null>(null);

    const handleSignUp = async () => {
        if (loading) return;
        setErrorMsg(null);
        setInfoMsg(null);

        // Usernames are stored lowercase, so normalise before validating —
        // otherwise "Mohit" would fail a rule it actually satisfies.
        const handle = username.trim().toLowerCase();
        const mail = email.trim();

        if (!handle || !mail || !password) {
            setErrorMsg(Strings.auth.fillAllSignUpFields);
            return;
        }
        if (!USERNAME_RE.test(handle)) {
            setErrorMsg(Strings.auth.invalidUsername);
            return;
        }
        if (!mail.includes("@")) {
            setErrorMsg(Strings.auth.invalidEmail);
            return;
        }
        if (password.length < 6) {
            setErrorMsg(Strings.auth.passwordTooShort);
            return;
        }

        setLoading(true);

        // Check the handle before creating the account. The unique index is the
        // real guard, but a duplicate there aborts the trigger and Supabase
        // reports it as an opaque "Database error saving new user" — this turns
        // the common case into a message that actually helps.
        const { data: taken } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", handle)
            .maybeSingle();

        if (taken) {
            setLoading(false);
            setErrorMsg(Strings.auth.usernameTaken);
            return;
        }

        const { error, needsConfirmation } = await signUp(mail, password, handle);
        setLoading(false);

        if (error) {
            // The race we can't prevent: someone claimed the handle between the
            // check above and this insert. The database caught it.
            setErrorMsg(
                error.includes("Database error") ? Strings.auth.usernameTaken : error,
            );
            return;
        }

        if (needsConfirmation) {
            // Account created but no session — "Confirm email" is on in the
            // Supabase dashboard. Entering the app would just bounce them back.
            setInfoMsg(Strings.auth.checkEmail);
            return;
        }

        // The gate that redirects logged-in users only runs at "/", and we're on
        // /registration — so navigate explicitly. `replace` so Back can't return
        // to a filled-in signup form.
        replace(Routes.HOME);
    };

    // Google has no separate "sign up" — approving the consent screen creates
    // the account if it doesn't exist. Same call as the Login screen.
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
        const { data } = await supabase.auth.getSession();
        if (data.session) replace(Routes.HOME);
    };

    return (
        <View style={{ width: width > 768 ? "50%" : "100%", flex: 1, alignSelf: "center" }}>
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
                    label={Strings.auth.setUserNamePlaceholder}
                    placeholder={Strings.auth.userNamePlaceholder}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={username}
                    onChangeText={setUsername}
                />
                <Text style={{ ...Typography.labelSm, color: Colors.textSecondary }}>
                    {Strings.auth.usernameHint}
                </Text>

                <AuthField
                    label={Strings.auth.email}
                    placeholder={Strings.auth.emailPlaceholder}
                    keyboardType="email-address"
                    autoComplete="email"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
                <AuthField
                    label={Strings.auth.password}
                    placeholder={Strings.auth.passwordPlaceholder}
                    secure
                    autoComplete="password-new"
                    value={password}
                    onChangeText={setPassword}
                />

                {errorMsg ? (
                    <Text style={{ ...Typography.bodySm, color: Colors.error }}>{errorMsg}</Text>
                ) : null}
                {infoMsg ? (
                    <Text style={{ ...Typography.bodySm, color: Colors.text }}>{infoMsg}</Text>
                ) : null}

                <PrimaryButton
                    label={loading ? Strings.auth.creatingAccount : Strings.auth.createAccount}
                    onPress={handleSignUp}
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

export default Registration;
