import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View } from "react-native";

export default function SettingsScreen() {
    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <View style={styles.content}>
                <Text style={styles.title}>Settings</Text>
                <Text style={styles.text}>Settings will live here.</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0B0D10",
    },
    content: {
        flex: 1,
        padding: 16,
    },
    title: {
        color: "#F9FAFB",
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 8,
    },
    text: {
        color: "#9CA3AF",
        fontSize: 14,
    },
});