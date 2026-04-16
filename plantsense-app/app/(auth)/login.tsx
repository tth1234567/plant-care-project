import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('提示', '请填写邮箱和密码');
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('登录失败', e.message || '请检查邮箱和密码');
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
          <MaterialCommunityIcons name="leaf" size={48} color="#3a9e3a" />
          <Text style={styles.appName}>植觉</Text>
        </View>
        <Text style={styles.subtitle}>PlantSense — 感知每棵植物的心声</Text>

        <View style={styles.form}>
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
          <Text style={styles.label}>密码</Text>
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
            onPress={handleLogin}
            activeOpacity={0.8}
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>登录</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.7}
            style={styles.registerLink}
          >
            <Text style={styles.registerLinkText}>还没有账号？立即注册</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f9f2' },
  content: { padding: 32, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  appName: { color: '#3a9e3a', fontSize: 40, fontWeight: 'bold' },
  subtitle: { color: '#5a7a5a', fontSize: 13, marginBottom: 48, textAlign: 'center' },
  form: { width: '100%' },
  label: { color: '#6a8a6a', fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#ffffff', borderRadius: 10, padding: 14,
    color: '#1a2e1a', fontSize: 15, borderWidth: 1, borderColor: '#e8f0e8',
  },
  loginBtn: {
    backgroundColor: '#3a9e3a', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 28,
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  registerLink: { alignItems: 'center', marginTop: 20 },
  registerLinkText: { color: '#3a9e3a', fontSize: 14 },
});
