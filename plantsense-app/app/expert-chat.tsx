import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import type { ChatMessage } from '../types';

export default function ExpertChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '你好！我是植觉 AI 植物专家 🌿\n有任何关于植物养护、病虫害、浇水施肥的问题，都可以问我哦～' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const resp = await api.chat(newMessages.slice(1)); // 去掉系统欢迎消息
    setLoading(false);
    if (resp.success && resp.data?.reply) {
      setMessages(prev => [...prev, { role: 'assistant', content: resp.data!.reply }]);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: `抱歉，出了点问题：${resp.error || '请稍后重试'}` }]);
    }
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.msgRow, item.role === 'user' ? styles.msgRowUser : styles.msgRowBot]}>
      {item.role === 'assistant' && (
        <View style={styles.botAvatar}>
          <Text style={{ fontSize: 20 }}>🌿</Text>
        </View>
      )}
      <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <MaterialCommunityIcons name="arrow-left" size={26} color="#1a2e1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🌿 AI 植物专家</Text>
          <View style={{ width: 26 }} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderMessage}
          contentContainerStyle={[styles.msgList, { paddingBottom: 16 }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {loading && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>🌿 专家正在思考</Text>
            <ActivityIndicator size="small" color="#3a9e3a" style={{ marginLeft: 8 }} />
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="问问植物专家..."
            placeholderTextColor="#4a6a4a"
            multiline
            editable={!loading}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={sendMessage}
            activeOpacity={0.7}
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            disabled={!input.trim() || loading}
          >
            <MaterialCommunityIcons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f9f2' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#2d6a2d',
  },
  headerTitle: { color: '#d4f5d4', fontSize: 17, fontWeight: '600' },
  msgList: { padding: 16 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },
  botAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#eaf4e8',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  bubble: { maxWidth: '75%', borderRadius: 14, padding: 12 },
  bubbleBot: { backgroundColor: '#eaf4e8', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(58,158,58,0.18)' },
  bubbleUser: { backgroundColor: '#3a9e3a', borderBottomRightRadius: 4 },
  bubbleText: { color: '#1a2e1a', fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: '#fff' },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  typingText: { color: '#5a7a5a', fontSize: 13 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: 'rgba(58,158,58,0.18)',
  },
  input: {
    flex: 1, backgroundColor: '#f5f9f2', borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, color: '#1a2e1a', fontSize: 14, maxHeight: 100,
    borderWidth: 1, borderColor: '#e8f0e8', marginRight: 8,
  },
  sendBtn: { backgroundColor: '#3a9e3a', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
