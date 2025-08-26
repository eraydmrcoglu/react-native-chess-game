import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Settings = {
  soundEnabled: boolean;
  flipBoard: boolean;
  darkTheme: boolean;
  showCoords: boolean;
  largePieces: boolean;
  strongBot: boolean;
  haptics: boolean;
};
type Ctx = Settings & {
  setSoundEnabled:(v:boolean)=>void;
  setFlipBoard:(v:boolean)=>void;
  setDarkTheme:(v:boolean)=>void;
  setShowCoords:(v:boolean)=>void;
  setLargePieces:(v:boolean)=>void;
  setStrongBot:(v:boolean)=>void;
  setHaptics:(v:boolean)=>void;
};
const DEFAULTS: Settings = {
  soundEnabled: true, flipBoard: false, darkTheme: false,
  showCoords: true, largePieces: false, strongBot: false, haptics: true,
};
const KEY = "rnchess.settings.v2";
const CtxObj = createContext<Ctx | null>(null);
export const useSettings = () => {
  const v = useContext(CtxObj);
  if (!v) throw new Error("useSettings outside provider");
  return v;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => { (async () => {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    setReady(true);
  })(); }, []);

  useEffect(() => { if (ready) AsyncStorage.setItem(KEY, JSON.stringify(settings)); }, [settings, ready]);

  const value: Ctx = useMemo(() => ({
    ...settings,
    setSoundEnabled: (v)=>setSettings(s=>({ ...s, soundEnabled:v })),
    setFlipBoard:    (v)=>setSettings(s=>({ ...s, flipBoard:v })),
    setDarkTheme:    (v)=>setSettings(s=>({ ...s, darkTheme:v })),
    setShowCoords:   (v)=>setSettings(s=>({ ...s, showCoords:v })),
    setLargePieces:  (v)=>setSettings(s=>({ ...s, largePieces:v })),
    setStrongBot:    (v)=>setSettings(s=>({ ...s, strongBot:v })),
    setHaptics:      (v)=>setSettings(s=>({ ...s, haptics:v })),
  }), [settings]);

  if (!ready) return null;
  return <CtxObj.Provider value={value}>{children}</CtxObj.Provider>;
};
