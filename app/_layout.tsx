import { Stack } from 'expo-router';

const RootLayout = () => {
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
