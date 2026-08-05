import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { AuthClient } from "../../features/auth/services/authClient";
import { saveToken } from "../../features/auth/services/tokenStore";

export default function SignUpScreen() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert("Missing fields", "Please enter both email and password.");
            return;
        }

        setIsLoading(true);
        try {
            const token = await AuthClient.register({ email, password });
            await saveToken(token);
            router.replace("/home");
        } catch (error) {
            console.error(error);
            Alert.alert("Registration failed", "Unable to create account. Try again with a different email.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior="padding">
            <View style={styles.card}>
                <Text style={styles.title}>Create account</Text>
                <Text style={styles.subtitle}>Register with your email and password.</Text>

                <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        placeholder="you@example.com"
                        placeholderTextColor="#7C8598"
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        textContentType="newPassword"
                        placeholder="Create a password"
                        placeholderTextColor="#7C8598"
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color="#F8FAFC" />
                    ) : (
                        <Text style={styles.buttonText}>Create account</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/sign-in")}>
                    <Text style={styles.linkText}>Already have an account? Sign in</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0B0D10",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    card: {
        width: "100%",
        backgroundColor: "#111827",
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: "#1F2937",
    },
    title: {
        color: "#F9FAFB",
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 8,
    },
    subtitle: {
        color: "#9CA3AF",
        fontSize: 14,
        marginBottom: 24,
    },
    field: {
        marginBottom: 16,
    },
    label: {
        color: "#9CA3AF",
        fontSize: 12,
        fontWeight: "700",
        marginBottom: 8,
    },
    input: {
        height: 48,
        borderRadius: 14,
        backgroundColor: "#0F172A",
        color: "#F9FAFB",
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: "#24324A",
    },
    button: {
        height: 48,
        borderRadius: 14,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    buttonText: {
        color: "#F8FAFC",
        fontSize: 15,
        fontWeight: "700",
    },
    linkText: {
        color: "#60A5FA",
        fontSize: 14,
        textAlign: "center",
        marginTop: 6,
    },
});
