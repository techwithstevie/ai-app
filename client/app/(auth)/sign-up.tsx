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
import { useSignUp, useAuth } from "@clerk/expo";
import { Link, Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
    const { isSignedIn } = useAuth();
    const signUpState = useSignUp();
    const router = useRouter();

    const signUp = useMemo(() => {
        return (signUpState as any)?.signUp ?? signUpState;
    }, [signUpState]);

    const fetchStatus = (signUpState as any)?.fetchStatus;
    const isLoaded = fetchStatus !== "idle";

    const [emailAddress, setEmailAddress] = useState("");
    const [password, setPassword] = useState("");
    const [pendingVerification, setPendingVerification] = useState(false);
    const [code, setCode] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (isSignedIn) {
        return <Redirect href="/home" />;
    }

    const onSignUpPress = async () => {
        if (!isLoaded || !signUp) return;

        setSubmitting(true);

        try {
            await signUp.create({});

            await signUp.password({
                emailAddress,
                password,
            });

            await signUp.verifications.sendEmailCode();

            setPendingVerification(true);
        } catch (err: any) {
            const message =
                err?.errors?.[0]?.message ??
                err?.message ??
                "Unable to sign up. Please try again.";
            Alert.alert("Sign up failed", message);
        } finally {
            setSubmitting(false);
        }
    };

    const onVerifyPress = async () => {
        if (!isLoaded || !signUp) return;

        setSubmitting(true);

        try {
            await signUp.verifications.verifyEmailCode(code);

            if (signUp.status === "complete") {
                await signUp.finalize();
                router.replace("/home");
            } else {
                Alert.alert("Verification incomplete", "Please try again.");
            }
        } catch (err: any) {
            const message =
                err?.errors?.[0]?.message ??
                err?.message ??
                "Verification failed. Please try again.";
            Alert.alert("Verification failed", message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={styles.content}>
                    <Text style={styles.eyebrow}>Create account</Text>
                    <Text style={styles.title}>
                        {pendingVerification ? "Verify your email" : "Sign up to get started"}
                    </Text>
                    <Text style={styles.subtitle}>
                        {pendingVerification
                            ? "Enter the verification code sent to your email."
                            : "Create an account to save chats and access your AI workspace."}
                    </Text>

                    {!pendingVerification ? (
                        <View style={styles.form}>
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
                                onPress={onSignUpPress}
                                activeOpacity={0.85}
                                disabled={submitting || !isLoaded}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#F8FAFC" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Create account</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            <TextInput
                                style={styles.input}
                                placeholder="Verification code"
                                placeholderTextColor="#6B7280"
                                keyboardType="number-pad"
                                value={code}
                                onChangeText={setCode}
                            />

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={onVerifyPress}
                                activeOpacity={0.85}
                                disabled={submitting || !isLoaded}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#F8FAFC" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>Verify email</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {!pendingVerification && (
                        <View style={styles.footerRow}>
                            <Text style={styles.footerText}>Already have an account?</Text>
                            <Link href="/sign-in" asChild>
                                <TouchableOpacity activeOpacity={0.8}>
                                    <Text style={styles.footerLink}>Sign in</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    )}
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