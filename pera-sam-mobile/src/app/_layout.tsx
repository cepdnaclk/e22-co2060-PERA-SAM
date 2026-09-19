import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/AuthContext';

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Determine if current route is a public auth screen (login or register)
    const currentSegment = segments[0] as string | undefined;
    const isPublicScreen = !currentSegment || currentSegment === 'index' || currentSegment === 'register';

    if (session && isPublicScreen) {
      // User is signed in but on auth screen → go to dashboard
      router.replace('/(tabs)/dashboard' as any);
    } else if (!session && !isPublicScreen) {
      // User is signed out but on protected screen → go to login
      router.replace('/');
    }
  }, [session, loading, segments, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" options={{ title: 'Login' }} />
        <Stack.Screen name="register" options={{ title: 'Register' }} />
        <Stack.Screen name="(tabs)" options={{ title: 'Home' }} />
        <Stack.Screen
          name="chat"
          options={{
            title: 'Chat',
            animation: 'slide_from_bottom',
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
