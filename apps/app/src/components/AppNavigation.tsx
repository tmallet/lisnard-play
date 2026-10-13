import { Tabs } from 'expo-router';

/** iOS et Android : barre d'onglets aux couleurs de la charte. */
export function AppNavigation() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: { backgroundColor: '#0f1752', borderTopColor: 'rgba(249,249,249,0.15)' },
        tabBarActiveTintColor: '#b0ad85',
        tabBarInactiveTintColor: 'rgba(249,249,249,0.7)',
        tabBarLabelStyle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 13 },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="a-propos" options={{ title: 'À propos' }} />
    </Tabs>
  );
}
