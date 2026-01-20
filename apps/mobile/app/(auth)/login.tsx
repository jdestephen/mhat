import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Needs to be your Machine's IP, not localhost, for emulator.
const API_URL = 'http://localhost:8000/api/v1'; 

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
        Alert.alert('Missing Fields', 'Please enter both email and password.');
        return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      await axios.post(`${API_URL}/auth/login`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      
      router.replace('/(app)/dashboard');
    } catch (e) {
      console.log(e);
      Alert.alert('Login Failed', 'Check credentials or backend connection.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
        <StatusBar style="dark" />
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="p-8">
                <View className="items-center mb-10">
                    <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mb-4">
                        <Text className="text-4xl">🏥</Text> 
                    </View>
                    <Text className="text-3xl font-bold text-slate-800 tracking-tight">Welcome Back</Text>
                    <Text className="text-slate-500 mt-2 text-base">Sign in to access your medical history</Text>
                </View>

                <View className="space-y-4 gap-4">
                    <View>
                        <Text className="text-slate-700 font-medium mb-1.5 ml-1">Email</Text>
                        <TextInput 
                            className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-base text-slate-800 shadow-sm"
                            placeholder="hello@example.com"
                            placeholderTextColor="#94a3b8"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>
                    
                    <View>
                        <Text className="text-slate-700 font-medium mb-1.5 ml-1">Password</Text>
                        <TextInput 
                            className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-base text-slate-800 shadow-sm"
                            placeholder="••••••••"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    className={`nav-button w-full py-4 rounded-2xl items-center mt-8 shadow-lg shadow-emerald-200 ${loading ? 'bg-emerald-800' : 'bg-emerald-600'}`}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-bold text-lg tracking-wide">
                        {loading ? 'Signing In...' : 'Sign In'}
                    </Text>
                </TouchableOpacity>

                <View className="flex-row justify-center mt-8">
                    <Text className="text-slate-500 text-base">Don't have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                        <Text className="text-emerald-600 font-semibold text-base">Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
