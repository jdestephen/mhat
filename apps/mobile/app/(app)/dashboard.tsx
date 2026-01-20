import React from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://localhost:8000/api/v1';

export default function DashboardScreen() {
  const router = useRouter();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
       const res = await axios.get(`${API_URL}/documents`);
       return res.data;
    }
  });

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-white p-4 rounded-lg mb-3 border border-slate-200 shadow-sm">
        <View className="flex-row justify-between items-center mb-1">
            <Text className="font-bold text-slate-800 text-lg">{item.title}</Text>
            <Text className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <Text className="text-slate-600">{item.description}</Text>
        <View className="flex-row mt-2">
            <View className="bg-emerald-100 px-2 py-1 rounded">
                <Text className="text-xs text-emerald-800 font-bold uppercase">{item.file_type}</Text>
            </View>
        </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-4 border-b border-slate-200 bg-white">
        <Text className="text-xl font-bold text-slate-800">My History</Text>
      </View>

      <FlatList
        data={data || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
            <View className="p-10 items-center">
                <Text className="text-slate-500">No documents found.</Text>
            </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 w-14 h-14 bg-emerald-700 rounded-full justify-center items-center shadow-lg"
        onPress={() => router.push('/(app)/upload')}
      >
        <Text className="text-white text-3xl pb-1">+</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}
