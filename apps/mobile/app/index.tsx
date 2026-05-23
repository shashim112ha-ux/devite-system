import React from 'react';
import { View, Text, SafeAreaView, ScrollView, Image } from 'react-native';
import { styled } from 'nativewind';
import { PremiumCard, BrandButton } from '../components/ui';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const StyledView = styled(View);
const StyledText = styled(Text);

export default function Home() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-brand-black">
      <StatusBar style="light" />
      <ScrollView className="px-6">
        <StyledView className="items-center py-10">
          <StyledText className="text-brand-orange text-4xl font-bold tracking-widest">
            DEVITE
          </StyledText>
          <StyledText className="text-brand-gold text-sm tracking-widest mt-1">
            CONTROL SYSTEM
          </StyledText>
        </StyledView>

        <PremiumCard title="مرحباً بك" className="mb-8">
          <StyledText className="text-white text-center text-lg mb-6">
            اختر النظام الذي تود الدخول إليه
          </StyledText>
          
          <StyledView className="space-y-4">
            <BrandButton 
              title="نظام الكاشير (POS)" 
              onPress={() => router.push('/pos')} 
              variant="orange"
            />
            <BrandButton 
              title="شاشة المطبخ" 
              onPress={() => router.push('/kitchen')} 
              variant="gold"
            />
            <BrandButton 
              title="لوحة تحكم المدير" 
              onPress={() => router.push('/dashboard')} 
              variant="outline"
            />
          </StyledView>
        </PremiumCard>

        <StyledView className="items-center py-10">
          <StyledText className="text-gray-500 text-xs">
            v1.0.0 - SMART CART MANAGEMENT
          </StyledText>
        </StyledView>
      </ScrollView>
    </SafeAreaView>
  );
}
