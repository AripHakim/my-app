// app/_layout.js
import { Stack } from 'expo-router';

const RootLayout = () => {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="hasil" options={{ title: 'Hasil Cek Plagiasi' }} />
    </Stack>
  );
};

export default RootLayout;
