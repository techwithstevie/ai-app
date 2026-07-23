import React from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { formatPersonaLabel } from "../utils/chatHelpers";

type Props = {
    visible: boolean;
    personas: string[];
    activePersona: string;
    bottomInset: number;
    onClose: () => void;
    onSelectPersona: (persona: string) => void;
};

export default function PersonaMenu({
    visible,
    personas,
    activePersona,
    bottomInset,
    onClose,
    onSelectPersona,
}: Props) {
    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.personaMenuOverlay} onPress={onClose}>
                <TouchableWithoutFeedback>
                    <View
                        style={[
                            styles.personaMenu,
                            { marginBottom: (bottomInset || 8) + 72 },
                        ]}
                    >
                        {personas.map((p) => {
                            const isActive = p === activePersona;

                            return (
                                <TouchableOpacity
                                    key={p}
                                    style={[
                                        styles.personaMenuItem,
                                        isActive && styles.personaMenuItemActive,
                                    ]}
                                    onPress={() => onSelectPersona(p)}
                                    activeOpacity={0.85}
                                >
                                    <Text
                                        style={[
                                            styles.personaMenuItemText,
                                            isActive && styles.personaMenuItemTextActive,
                                        ]}
                                    >
                                        {formatPersonaLabel(p)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </TouchableWithoutFeedback>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    personaMenuOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.18)",
    },
    personaMenu: {
        marginHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#374151",
        backgroundColor: "#111827",
        paddingVertical: 6,
    },
    personaMenuItem: {
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    personaMenuItemActive: {},
    personaMenuItemText: {
        color: "#D1D5DB",
        fontSize: 14,
        fontWeight: "500",
    },
    personaMenuItemTextActive: {
        color: "#10B981",
        fontWeight: "700",
    },
});