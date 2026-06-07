import { Ionicons } from "@expo/vector-icons";

import { NavigationProp, useNavigation } from "@react-navigation/native";

import { CameraView, useCameraPermissions } from "expo-camera";

import * as ImagePicker from "expo-image-picker";

import { useEffect, useRef, useState } from "react";

import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { SubscriptionPaywall } from "../components/SubscriptionPaywall";

import { useSubscription } from "../context/SubscriptionContext";

import { getTestMealPhotoUri } from "../services/testMealPhoto";

import { useUi } from "../context/UiContext";

import { RootStackParamList } from "../navigation/types";



export function CameraScreen() {

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const { hasAccess, isLoading: isSubscriptionLoading } = useSubscription();

  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();

  const [isCapturing, setIsCapturing] = useState(false);

  const [isPickingGallery, setIsPickingGallery] = useState(false);

  const [isTestAnalyzing, setIsTestAnalyzing] = useState(false);

  const { showToast, showLoading, hideLoading } = useUi();

  const isBusy = isCapturing || isPickingGallery || isTestAnalyzing;



  useEffect(() => {

    if (permission && !permission.granted && permission.canAskAgain) {

      requestPermission();

    }

  }, [permission, requestPermission]);



  function openSubscription() {

    navigation.navigate("Subscription");

  }



  async function handleTakePhoto() {

    if (!hasAccess) {

      openSubscription();

      return;

    }

    if (!cameraRef.current || isBusy) return;



    try {

      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({

        quality: 0.85,

        skipProcessing: false

      });



      if (!photo?.uri) return;

      goToAnalysis(photo.uri);

    } finally {

      setIsCapturing(false);

    }

  }



  async function handlePickFromGallery() {

    if (!hasAccess) {

      openSubscription();

      return;

    }

    if (isBusy) return;



    try {

      setIsPickingGallery(true);

      const libraryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!libraryPerm.granted) return;



      const res = await ImagePicker.launchImageLibraryAsync({

        mediaTypes: ["images"],

        allowsEditing: true,

        aspect: [4, 3],

        quality: 0.9

      });



      if (res.canceled) return;

      const uri = res.assets[0]?.uri;

      if (!uri) return;



      navigation.navigate("Result", { photoUri: uri });

    } finally {

      setIsPickingGallery(false);

    }

  }



  function goToAnalysis(photoUri: string, testClaude = false) {

    navigation.navigate("Result", { photoUri, testClaude });

  }



  async function handleTestClaudeAnalysis() {

    if (!hasAccess) {

      openSubscription();

      return;

    }

    if (isBusy) return;



    try {

      setIsTestAnalyzing(true);

      showLoading("Загружаем тестовое фото...");

      const testPhotoUri = await getTestMealPhotoUri();

      hideLoading();

      showToast("Тест Claude: анализ тарелки...", "info");

      goToAnalysis(testPhotoUri, true);

    } catch {

      hideLoading();

      showToast("Не удалось загрузить тестовое фото", "error");

    } finally {

      setIsTestAnalyzing(false);

    }

  }



  if (isSubscriptionLoading) {

    return (

      <SafeAreaView className="flex-1 items-center justify-center bg-black">

        <ActivityIndicator size="large" color="#D00000" />

      </SafeAreaView>

    );

  }



  if (!hasAccess) {

    return (

      <SafeAreaView className="flex-1 bg-black">

        <SubscriptionPaywall onSubscribe={openSubscription} />

      </SafeAreaView>

    );

  }



  if (!permission) {

    return (

      <SafeAreaView className="flex-1 items-center justify-center bg-black">

        <ActivityIndicator size="large" color="#D00000" />

      </SafeAreaView>

    );

  }



  if (!permission.granted) {

    return (

      <SafeAreaView className="flex-1 bg-black px-6">

        <View className="flex-1 items-center justify-center">

          <Ionicons name="camera-outline" size={56} color="#D00000" />

          <Text className="mt-6 text-center text-2xl font-extrabold text-white">Нужен доступ к камере</Text>

          <Text className="mt-3 text-center text-base font-semibold text-gym-muted">

            Без камеры KachAI не сможет сфотографировать тарелку и посчитать макросы.

          </Text>

          <Pressable

            className="mt-8 h-14 w-full items-center justify-center rounded-2xl border-2 border-gym-red bg-gym-red"

            onPress={requestPermission}

          >

            <Text className="text-base font-extrabold uppercase tracking-wide text-white">Разрешить камеру</Text>

          </Pressable>

        </View>

      </SafeAreaView>

    );

  }



  return (

    <SafeAreaView className="flex-1 bg-black" edges={["top", "left", "right", "bottom"]}>

      <View className="flex-1 px-6 pt-4">

        <View className="items-center">

          <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">Сканер</Text>

          <Text className="mt-2 text-xl font-extrabold text-white">Наведи камеру на тарелку</Text>

        </View>



        <View className="flex-1 items-center justify-center py-6">

          <View className="relative h-[300px] w-[300px] items-center justify-center">

            <View className="h-[300px] w-[300px] overflow-hidden rounded-full border-[6px] border-gym-red bg-black">

              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

            </View>



            <View

              pointerEvents="none"

              className="absolute h-[300px] w-[300px] items-center justify-center rounded-full"

            >

              <View className="h-24 w-24 rounded-full border-2 border-gym-red/60" />

              <View className="absolute h-1 w-20 bg-gym-red/80" />

            </View>

          </View>



          <Text className="mt-5 text-center text-sm font-semibold text-gym-muted">

            Держи тарелку в круге — ИИ посчитает Ккал и БЖУ

          </Text>

        </View>



        <View className="gap-3 pb-4">

          <Pressable

            className={`min-h-[72px] items-center justify-center rounded-2xl border-2 border-amber-400 bg-amber-500/20 px-4 ${

              isBusy ? "opacity-70" : "active:opacity-85"

            }`}

            onPress={handleTestClaudeAnalysis}

            disabled={isBusy}

          >

            {isTestAnalyzing ? (

              <ActivityIndicator color="#FBBF24" size="large" />

            ) : (

              <View className="items-center gap-1">

                <View className="flex-row items-center gap-2">

                  <Ionicons name="flask" size={22} color="#FBBF24" />

                  <Text className="text-center text-lg font-extrabold uppercase tracking-wide text-amber-300">

                    Тестовый анализ (Claude)

                  </Text>

                </View>

                <Text className="text-center text-xs font-semibold text-amber-200/80">

                  Без камеры · тестовое фото тарелки

                </Text>

              </View>

            )}

          </Pressable>



          <Pressable

            className={`h-14 items-center justify-center rounded-2xl border-2 border-gym-red bg-gym-red ${

              isCapturing ? "opacity-70" : "active:opacity-85"

            }`}

            onPress={handleTakePhoto}

            disabled={isBusy}

          >

            {isCapturing ? (

              <ActivityIndicator color="#FFFFFF" />

            ) : (

              <Text className="text-base font-extrabold uppercase tracking-wide text-white">Сделать фото</Text>

            )}

          </Pressable>



          <Pressable

            className={`h-12 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-zinc-800 bg-gym-card ${

              isBusy ? "opacity-70" : "active:opacity-85"

            }`}

            onPress={handlePickFromGallery}

            disabled={isBusy}

          >

            <Ionicons name="images-outline" size={18} color="#FFFFFF" />

            <Text className="text-base font-extrabold uppercase tracking-wide text-white">Из галереи</Text>

          </Pressable>

        </View>

      </View>

    </SafeAreaView>

  );

}

