import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Text as RNText, TextProps } from 'react-native';
import React from 'react';

const RootLayout = () => {
  const [fontsLoaded] = useFonts({
    'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
    'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
  });

  if (!fontsLoaded) {
    return null; // Bisa diganti dengan splash screen kalau ada
  }

  const oldRender = RNText.render;
  RNText.render = function (...args) {
  const origin = oldRender.call(this, ...args);
  const propsStyle = origin.props.style || [];
  const flatStyle = Array.isArray(propsStyle) ? Object.assign({}, ...propsStyle) : propsStyle;

  const isBold = flatStyle?.fontWeight === 'bold';

  return React.cloneElement(origin, {
    style: [{ fontFamily: isBold ? 'Nunito-Bold' : 'Nunito-Regular' }, origin.props.style],
  });
};



  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Cek Plagiasi', headerShown: false,  }} />
      <Stack.Screen name="hasil" options={{ title: 'Hasil Cek Plagiasi' }} />
      <Stack.Screen 
        name="history" 
        options={{ 
          title: 'Riwayat Pemeriksaan', 
          headerShown: false,   }} 
      />
    </Stack>
  );
};

export default RootLayout;
