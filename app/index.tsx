import React from "react";
import { Link } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { useSettings } from "../context/SettingsContext";
import LottieView from "lottie-react-native";

export default function Home() {
  const { darkTheme } = useSettings();
  const BG = darkTheme ? "bg-bgDark" : "bg-bgLight";
  const TEXT = darkTheme ? "text-textDark" : "text-textLight";

  const primaryColor = darkTheme ? "#FFFFFF" : "#000000";

  return (
    <View className={`flex-1 ${BG} px-6`}>
      <View className="flex-1 items-center justify-center">
        {/* Hero */}
        <View className="items-center mb-12">
          {/* Lottie animasyonu */}
          <View style={{ width: 200, height: 200 }}>
            <LottieView
              source={require("../assets/animations/chess.json")}
              autoPlay
              loop
              speed={0.5}
              colorFilters={[
                {
                  keypath: "*",
                  color: primaryColor,
                },
              ]}
              style={{ width: "100%", height: "100%" }}
            />
          </View>

          <Text className={`${TEXT} opacity-70 text-center mt-2`}>
            Classic chess with bot, hints & more
          </Text>
        </View>

        <View className="items-center">
          <Link href="/play" asChild>
            <Pressable
              className="w-72 py-4 rounded-xl2 items-center shadow-card mb-6"
              style={{ backgroundColor: "#C6906D" }}
            >
              <Text className="text-white font-semibold text-lg">Play</Text>
            </Pressable>
          </Link>
          <Link href="/settings" asChild>
            <Pressable
              className="w-72 py-4 rounded-xl2 items-center shadow-card"
              style={{ backgroundColor: "#C6906D" }}
            >
              <Text className="text-white font-semibold text-lg">Settings</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}
