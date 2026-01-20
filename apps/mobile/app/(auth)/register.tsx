import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Needs to be your Machine's IP, not localhost, for emulator.
const API_URL = 'http://localhost:8000/api/v1'; 

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      if (!email || !password || !firstName || !lastName) {
        Alert.alert('Validation Error', 'All fields are required');
        return;
      }
      setLoading(true);
      
      const payload = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      };

      await axios.post(`${API_URL}/auth/register`, payload);
      
      Alert.alert('Success', 'Account created! Please log in.');
      router.back(); 
    } catch (e: any) {
      console.log(e);
      const message = e.response?.data?.detail || 'Registration failed. Try again.';
      Alert.alert('Registration Failed', message);
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
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} className="p-8">
                <TouchableOpacity onPress={() => router.back()} className="mb-6 w-10 h-10 items-center justify-center bg-white rounded-full shadow-sm">
                    <Text className="text-xl text-slate-800">←</Text>
                </TouchableOpacity>

                <View className="mb-8">
                    <Text className="text-3xl font-bold text-slate-800 tracking-tight">Create Account</Text>
                    <Text className="text-slate-500 mt-2 text-base">Join us to manage your medical records secure & easy.</Text>
                </View>
                
                <View className="space-y-4 gap-4">
                    <View className="flex-row gap-4">
                        <View className="flex-1">
                            <Text className="text-slate-700 font-medium mb-1.5 ml-1">First Name</Text>
                            <TextInput 
                                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-base text-slate-800 shadow-sm"
                                placeholder="John"
                                placeholderTextColor="#94a3b8"
                                value={firstName}
                                onChangeText={setFirstName}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-slate-700 font-medium mb-1.5 ml-1">Last Name</Text>
                            <TextInput 
                                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-base text-slate-800 shadow-sm"
                                placeholder="Doe"
                                placeholderTextColor="#94a3b8"
                                value={lastName}
                                onChangeText={setLastName}
                            />
                        </View>
                    </View>

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
                            placeholder="Min 6 chars"
                            placeholderTextColor="#94a3b8"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>
                </View>
                
                <TouchableOpacity 
                    className={`w-full py-4 rounded-2xl items-center mt-10 shadow-lg shadow-emerald-200 ${loading ? 'bg-emerald-800' : 'bg-emerald-600'}`}
                    onPress={handleRegister}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <Text className="text-white font-bold text-lg tracking-wide">
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </Text>
                </TouchableOpacity>

                <View className="flex-row justify-center mt-8">
                    <Text className="text-slate-500 text-base">Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text className="text-emerald-600 font-semibold text-base">Log In</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
