import React from "react";
import { SafeAreaView, View, Text, Pressable, Switch, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // ✅ EKLENDİ
import ChessBoard, { BotColor } from "../components/ChessBoard";
import { useSettings } from "../context/SettingsContext";

export default function Play() {
  const { darkTheme, soundEnabled, flipBoard } = useSettings();
  const insets = useSafeAreaInsets(); // ✅ EKLENDİ

  const [human, setHuman] = React.useState<"w" | "b">("w");
  const [vsBot, setVsBot] = React.useState(true);
  const effectiveFlip = vsBot ? false : flipBoard;
  const botColor: BotColor = vsBot ? (human === "w" ? "b" : "w") : null;

  const [hintKey, setHintKey] = React.useState(0);
  const [hintsLeft, setHintsLeft] = React.useState(3);
  const [gameSeed, setGameSeed] = React.useState(0);

  const resetGame = () => {
    setGameSeed((s) => s + 1);
    setHintKey(0);
    setHintsLeft(3);
  };

  const [banner, setBanner] = React.useState<{ text: string; visible: boolean }>({
    text: "",
    visible: false,
  });

  function showError(msg: string) {
    setBanner({ text: msg, visible: true });
    setTimeout(() => setBanner({ text: "", visible: false }), 1800);
  }

  const BG = darkTheme ? "bg-bgDark" : "bg-bgLight";
  const TEXT = darkTheme ? "text-textDark" : "text-textLight";
  const SURF = darkTheme ? "bg-surfaceDark" : "bg-surfaceLight";

  function onHintPress() {
    if (hintsLeft > 0) {
      setHintKey((k) => k + 1);
      setHintsLeft((n) => n - 1);
    } else {
      showError("You've run out of hints.");
    }
  }

  return (
    <SafeAreaView className={`${BG} flex-1`}>
      {banner.visible && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: (insets?.top ?? 0) + 10,
            left: 16,
            right: 16,
            zIndex: 50,
            elevation: 6,
          }}
        >
          <View
            className="rounded-xl2 shadow-card flex-row items-center px-4 py-3"
            style={{
              backgroundColor: darkTheme ? "#2C1F21" : "#FDECEC",
              borderWidth: 1,
              borderColor: darkTheme ? "#7F1D1D" : "#FCA5A5",
            }}
          >
            <Feather name="alert-triangle" size={18} color={darkTheme ? "#FCA5A5" : "#B91C1C"} />
            <Text
              className="ml-2 font-semibold"
              style={{ color: darkTheme ? "#FCA5A5" : "#B91C1C" }}
            >
              {banner.text}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-5 pt-8">
          <View className={`w-full max-w-board self-center rounded-xl2 p-4 ${SURF} shadow-card mb-6`}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className={`${TEXT} opacity-70 text-xs`}>Mode</Text>
                <Text className={`text-xl font-bold ${TEXT}`}>{vsBot ? "Play vs Bot" : "Two Players"}</Text>
              </View>
              <View className="items-end">
                <Text className={`${TEXT} mb-1`}>vs Bot</Text>
                <Switch
                  value={vsBot}
                  onValueChange={(v) => {
                    setVsBot(v);
                    resetGame();
                  }}
                  trackColor={{ false: darkTheme ? "#263041" : "#CDD5DF", true: darkTheme ? "#263041" : "#CDD5DF" }}
                  thumbColor={vsBot ? "#C6906D" : "#f4f3f4"}
                />
              </View>
            </View>

            <View className="flex-row items-center gap-4 mt-4">
              <Pressable
                onPress={() => {
                  setHuman("w");
                  resetGame();
                }}
                className={`flex-1 h-12 rounded-xl2 shadow-soft items-center justify-center ${
                  human === "w" ? "bg-[#C6906D]" : darkTheme ? "bg-[#1F2632]" : "bg-white"
                }`}
              >
                <Text className={`${human === "w" ? "text-white" : TEXT} font-semibold text-base`}>Play as White</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setHuman("b");
                  resetGame();
                }}
                className={`flex-1 h-12 rounded-xl2 shadow-soft items-center justify-center ${
                  human === "b" ? "bg-[#C6906D]" : darkTheme ? "bg-[#1F2632]" : "bg-white"
                }`}
              >
                <Text className={`${human === "b" ? "text-white" : TEXT} font-semibold text-base`}>Play as Black</Text>
              </Pressable>

              <Pressable
                onPress={onHintPress}
                className="flex-1 h-12 rounded-xl2 shadow-soft items-center justify-center bg-[#C6906D]"
              >
                <View className="flex-row items-center">
                  <Feather name="help-circle" size={18} color="#fff" />
                  <Text className="text-white font-semibold ml-2 text-base">Hint ({hintsLeft})</Text>
                </View>
              </Pressable>
            </View>
          </View>

          <View className="w-full max-w-board self-center">
            <ChessBoard
              key={`${vsBot ? "bot" : "two"}-${human}-${gameSeed}`}
              dark={darkTheme}
              sound={soundEnabled}
              flip={effectiveFlip}
              viewAs={human}
              botColor={botColor}
              hintKey={hintKey}
              onNewGame={() => {
                setHintKey(0);
                setHintsLeft(3);
                setBanner({ text: "", visible: false });
              }}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
