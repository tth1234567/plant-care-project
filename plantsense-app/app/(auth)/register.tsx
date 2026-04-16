import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../stores/authStore';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('提示', '请填写邮箱和密码');
      return;
    }
    if (password.length < 6) {
      Alert.alert('提示', '密码至少 6 位');
      return;
    }
    setLoading(true);
    try {
      await register({ email: email.trim(), password, nickname: nickname.trim() || undefined });
      Alert.alert('注册成功', '请前往邮箱点击确认链接后再登录', [{ text: '去登录', onPress: () => router.replace('/(auth)/login') }]);
    } catch (e: any) {
      Alert.alert('注册失败', e.message || '请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoRow}>
          <MaterialCommunityIcons name="leaf" size={36} color="#3a9e3a" />
          <Text style={styles.appName}>注册植觉</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>昵称（可选）</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="给自己起个名字"
            placeholderTextColor="#4a6a4a"
            editable={!loading}
          />
          <Text style={styles.label}>邮箱</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="请输入邮箱"
            placeholderTextColor="#4a6a4a"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          <Text style={styles.label}>密码（至少 6 位）</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="请输入密码"
            placeholderTextColor="#4a6a4a"
            secureTextEntry
            editable={!loading}
          />
          <TouchableOpacity
            onPress={handleRegister}
            activeOpacity={0.8}
            style={[styles.btn, loading && styles.btnDisabled]}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>注册</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>已有账号？返回登录</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f9f2' },
  content: { padding: 32, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  appName: { color: '#3a9e3a', fontSize: 28, fontWeight: 'bold' },
  form: { width: '100%' },
  label: { color: '#6a8a6a', fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#ffffff', borderRadius: 10, padding: 14,
    color: '#1a2e1a', fontSize: 15, borderWidth: 1, borderColor: '#e8f0e8',
  },
  btn: { backgroundColor: '#3a9e3a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backLink: { alignItems: 'center', marginTop: 20 },
  backLinkText: { color: '#3a9e3a', fontSize: 14 },
});
