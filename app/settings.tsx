import React from "react";
import { View, Text, Switch } from "react-native";
import { useSettings } from "../context/SettingsContext";

const Row = ({ title, subtitle, value, onChange, dark }:{
  title:string; subtitle:string; value:boolean; onChange:(v:boolean)=>void; dark:boolean;
}) => (
  <View className={`rounded-xl2 p-4 ${dark ? "bg-surfaceDark" : "bg-surfaceLight"} shadow-card`}>
    <View className="flex-row items-center">
      <View className="flex-1 pr-3">
        <Text className={`text-base font-semibold ${dark ? "text-textDark" : "text-textLight"}`}>{title}</Text>
        <Text className={`${dark ? "text-textDark/70" : "text-textLight/70"} text-xs mt-1`}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: dark ? "#263041" : "#CDD5DF", true: dark ? "#263041" : "#CDD5DF" }}
        thumbColor={value ? "#C6906D" : "#f4f3f4"}
      />
    </View>
  </View>
);

export default function Settings() {
  const {
    darkTheme, setDarkTheme, soundEnabled, setSoundEnabled,
    flipBoard, setFlipBoard, showCoords, setShowCoords,
    largePieces, setLargePieces, strongBot, setStrongBot, haptics, setHaptics
  } = useSettings();
  const BG = darkTheme ? "bg-bgDark" : "bg-bgLight";
  return (
    <View className={`flex-1 ${BG} px-5 py-6 max-w-board self-center w-full`}>
      <View className="mb-4"><Row title="Dark Theme" subtitle="Switch between Dark and Light" value={darkTheme} onChange={setDarkTheme} dark={darkTheme}/></View>
      <View className="mb-4"><Row title="Sound" subtitle="Play move sounds" value={soundEnabled} onChange={setSoundEnabled} dark={darkTheme}/></View>
      <View className="mb-4"><Row title="Haptics" subtitle="Vibrate lightly on moves" value={haptics} onChange={setHaptics} dark={darkTheme}/></View>
      <View className="mb-4"><Row title="Flip Board" subtitle="Rotate to side to move" value={flipBoard} onChange={setFlipBoard} dark={darkTheme}/></View>
      <View className="mb-4"><Row title="Show Coordinates" subtitle="Display a–h / 1–8 labels" value={showCoords} onChange={setShowCoords} dark={darkTheme}/></View>
      <View className="mb-4"><Row title="Large Pieces" subtitle="Increase piece size on the board" value={largePieces} onChange={setLargePieces} dark={darkTheme}/></View>
      <View><Row title="Stronger Bot (beta)" subtitle="Material-based move selection" value={strongBot} onChange={setStrongBot} dark={darkTheme}/></View>
    </View>
  );
}
