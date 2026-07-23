import React from "react";
import { Keyboard, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ChatHeader from "../../features/chat/components/ChatHeader";
import ChatInputBar from "../../features/chat/components/ChatInputBar";
import ChatMessageList from "../../features/chat/components/ChatMessageList";
import PersonaMenu from "../../features/chat/components/PersonaMenu";
import { useChatScreen } from "../../features/chat/hooks/useChatScreen";

export default function ChatScreen() {
  const chat = useChatScreen();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <ChatHeader
            persona={chat.persona}
            onOpenHistory={() => chat.router.push("/(tabs)/history")}
            onNewChat={chat.startNewChat}
          />

          <ChatMessageList
            messages={chat.messages}
            systemMessageOpacity={chat.systemMessageOpacity}
            scrollRef={chat.scrollRef}
          />

          <ChatInputBar
            input={chat.input}
            isLoading={chat.isLoading}
            insetsBottom={chat.insets.bottom}
            onChangeInput={chat.setInput}
            onOpenPersonaMenu={() => chat.setPersonaMenuVisible(true)}
            onSend={chat.sendMessage}
          />

          <PersonaMenu
            visible={chat.personaMenuVisible}
            personas={chat.personas}
            activePersona={chat.persona}
            bottomInset={chat.insets.bottom}
            onClose={() => chat.setPersonaMenuVisible(false)}
            onSelectPersona={chat.handlePersonaChange}
          />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0D10",
  },
  inner: {
    flex: 1,
  },
});