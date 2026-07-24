import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useSignIn, useAuth, useSSO } from "@clerk/expo";
import { Link, Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
    const { isSignedIn } = useAuth();
    const signInState = useSignIn();
    const { startSSOFlow } = useSSO();
    const router = useRouter();

    const signIn = useMemo(() => {
        return (signInState as any)?.signIn ?? signInState;
    }, [signInState]);

    const fetchStatus = (signInState as any)?.fetchStatus;
    const isLoaded = fetchStatus !== "idle";

    const [emailAddress, setEmailAddress] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [googleSubmitting, setGoogleSubmitting] = useState(false);

    if (isSignedIn) {
        return <Redirect href="/home" />;
    }

    const onSignInPress = async () => {
        if (!isLoaded || !signIn) return;

        setSubmitting(true);

        try {
            await signIn.create({ identifier: emailAddress });
            await signIn.password({ password });

            if (signIn.status === "complete") {
                await signIn.finalize();
                router.replace("/home");
            } else {
                Alert.alert("Sign in incomplete", "Please complete the remaining steps.");
            }
        } catch (err: any) {
            const message =
                err?.errors?.[0]?.message ??
                err?.message ??
                "Unable to sign in. Please try again.";
            Alert.alert("Sign in failed", message);
        } finally {
            setSubmitting(false);
        }
    };

    const onGooglePress = async () => {
        setGoogleSubmitting(true);

        try {
            const redirectUrl = Linking.createURL("/");

            const result = await startSSOFlow({
                strategy: "oauth_google",
                redirectUrl,
            });

            const createdSessionId = (result as any)?.createdSessionId;
            const setActive = (result as any)?.setActive;
            const authSessionResult = (result as any)?.authSessionResult;
            const signInResult = (result as any)?.signIn;
            const signUpResult = (result as any)?.signUp;

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
                router.replace("/home");
                return;
            }

            if (signInResult?.status === "complete" && signInResult?.finalize) {
                await signInResult.finalize();
                router.replace("/home");
                return;
            }

            if (signUpResult?.status === "complete" && signUpResult?.finalize) {
                await signUpResult.finalize();
                router.replace("/home");
                return;
            }

            if (authSessionResult?.type === "dismiss" || authSessionResult?.type === "cancel") {
                return;
            }

            Alert.alert(
                "Google sign-in incomplete",
                "The Google authentication flow finished but did not create a session."
            );
        } catch (err: any) {
            const message =
                err?.errors?.[0]?.message ??
                err?.message ??
                "Google sign-in failed. Please try again.";
            Alert.alert("Google sign-in failed", message);
        } finally {
            setGoogleSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.content}>
                    <Text style={styles.eyebrow}>Welcome back</Text>
                    <Text style={styles.title}>Sign in to continue</Text>
                    <Text style={styles.subtitle}>
                        Access your AI workspace, conversation history, and settings.
                    </Text>

                    <View style={styles.form}>
                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={onGooglePress}
                            activeOpacity={0.85}
                            disabled={googleSubmitting}
                        >
                            {googleSubmitting ? (
                                <ActivityIndicator color="#F8FAFC" />
                            ) : (
                                <>
                                    <Ionicons name="logo-google" size={18} color="#F8FAFC" />
                                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.separatorRow}>
                            <View style={styles.separatorLine} />
                            <Text style={styles.separatorText}>or</Text>
                            <View style={styles.separatorLine} />
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#6B7280"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={emailAddress}
                            onChangeText={setEmailAddress}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#6B7280"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={onSignInPress}
                            activeOpacity={0.85}
                            disabled={submitting || !isLoaded}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#F8FAFC" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Sign in with email</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerRow}>
                        <Text style={styles.footerText}>Don&apos;t have an account?</Text>
                        <Link href="/sign-up" asChild>
                            <TouchableOpacity activeOpacity={0.8}>
                                <Text style={styles.footerLink}>Sign up</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: "#0B0D10",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        padding: 24,
    },
    eyebrow: {
        color: "#10B981",
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginBottom: 10,
    },
    title: {
        color: "#F9FAFB",
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 8,
    },
    subtitle: {
        color: "#9CA3AF",
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 24,
    },
    form: {
        marginBottom: 20,
    },
    googleButton: {
        height: 52,
        borderRadius: 14,
        backgroundColor: "#1F2937",
        borderWidth: 1,
        borderColor: "#374151",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        marginBottom: 18,
    },
    googleButtonText: {
        color: "#F8FAFC",
        fontSize: 15,
        fontWeight: "700",
    },
    separatorRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 18,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#2A3342",
    },
    separatorText: {
        color: "#6B7280",
        fontSize: 12,
        marginHorizontal: 12,
        textTransform: "uppercase",
        fontWeight: "700",
        letterSpacing: 0.6,
    },
    input: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#2A3342",
        backgroundColor: "#161B22",
        color: "#F9FAFB",
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    primaryButton: {
        height: 52,
        borderRadius: 14,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
    },
    primaryButtonText: {
        color: "#F8FAFC",
        fontSize: 15,
        fontWeight: "700",
    },
    footerRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
    },
    footerText: {
        color: "#9CA3AF",
        fontSize: 14,
    },
    footerLink: {
        color: "#10B981",
        fontSize: 14,
        fontWeight: "700",
    },
});