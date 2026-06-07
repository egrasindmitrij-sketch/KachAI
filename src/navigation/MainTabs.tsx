import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraScreen } from "../screens/CameraScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const tabIcons: Record<keyof MainTabParamList, { active: IoniconName; inactive: IoniconName }> = {
  Home: { active: "barbell", inactive: "barbell-outline" },
  Camera: { active: "camera", inactive: "camera-outline" },
  History: { active: "time", inactive: "time-outline" },
  Profile: { active: "person", inactive: "person-outline" }
};

const tabTitles: Record<keyof MainTabParamList, string> = {
  Home: "Главная",
  Camera: "Сканер",
  History: "История",
  Profile: "Профиль"
};

export function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        title: tabTitles[route.name],
        headerStyle: { backgroundColor: "#0B0B0B" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "800", fontSize: 18 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: "#151515",
          borderTopColor: "#222222",
          height: 60 + bottomInset,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
          paddingTop: 8
        },
        tabBarActiveTintColor: "#D00000",
        tabBarInactiveTintColor: "#8C8C8C",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ color, focused }) => {
          const icons = tabIcons[route.name];
          return <Ionicons name={focused ? icons.active : icons.inactive} size={22} color={color} />;
        },
        lazy: true
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Camera" component={CameraScreen} options={{ headerShown: false }} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
