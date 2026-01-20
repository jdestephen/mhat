import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = 'http://localhost:8000/api/v1';

export default function UploadScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };
  
  const pickFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
    });
    
    if (!result.canceled) {
        setImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!image || !title) {
        Alert.alert("Missing Validations", "Please provide an image and title.");
        return;
    }

    setUploading(true);
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        
        const uriParts = image.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append('file', {
            uri: image,
            name: `photo.${fileType}`,
            type: `image/${fileType}`,
        } as any);

        await axios.post(`${API_URL}/documents/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        Alert.alert("Success", "Document uploaded!");
        router.back();
    } catch (e) {
        console.error(e);
        Alert.alert("Error", "Upload failed.");
    } finally {
        setUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
        <ScrollView className="p-6">
            <View className="flex-row justify-between items-center mb-6">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-slate-500 text-lg">Cancel</Text>
                </TouchableOpacity>
                <Text className="text-xl font-bold text-slate-800">New Document</Text>
                <View className="w-10" /> 
            </View>

            <View className="items-center mb-6">
                {image ? (
                    <Image source={{ uri: image }} className="w-full h-64 rounded-lg bg-slate-100" resizeMode="contain" />
                ) : (
                    <View className="w-full h-64 bg-slate-100 rounded-lg justify-center items-center border-2 border-dashed border-slate-300">
                        <Text className="text-slate-400">No Image Selected</Text>
                    </View>
                )}
                
                <View className="flex-row mt-4 space-x-4 gap-4">
                     <TouchableOpacity onPress={pickImage} className="bg-slate-800 px-4 py-2 rounded">
                        <Text className="text-white font-medium">Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickFromGallery} className="bg-slate-200 px-4 py-2 rounded">
                        <Text className="text-slate-800 font-medium">Gallery</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View className="space-y-4 gap-4">
                <View>
                    <Text className="text-sm font-medium mb-1 text-slate-700">Title</Text>
                    <TextInput 
                        className="w-full border border-slate-300 rounded-lg p-3 bg-white"
                        placeholder="e.g. Prescription"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>
                
                <View>
                    <Text className="text-sm font-medium mb-1 text-slate-700">Description</Text>
                    <TextInput 
                        className="w-full border border-slate-300 rounded-lg p-3 bg-white"
                        placeholder="Details..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />
                </View>
            </View>

            <TouchableOpacity 
                className={`w-full p-4 rounded-lg items-center mt-8 ${!image || uploading ? 'bg-slate-300' : 'bg-emerald-700'}`}
                onPress={handleUpload}
                disabled={!image || uploading}
            >
                <Text className="text-white font-bold text-lg">
                    {uploading ? "Uploading..." : "Save Document"}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    </SafeAreaView>
  );
}
