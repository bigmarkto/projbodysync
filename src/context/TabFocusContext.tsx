// src/context/TabFocusContext.tsx
import React, { createContext, useContext } from "react";

export type StudentTabKey = "home" | "workouts" | "progress" | "settings";

interface TabFocusContextType {
  activeTab: StudentTabKey;
  visitTick: Record<StudentTabKey, number>;
  navigateTab: (tab: StudentTabKey) => void;
}

export const TabFocusContext = createContext<TabFocusContextType>({
  activeTab: "home",
  visitTick: { home: 0, workouts: 0, progress: 0, settings: 0 },
  navigateTab: () => {},
});

export const useTabFocus = (tabKey: StudentTabKey) => {
  const ctx = useContext(TabFocusContext);
  return {
    isFocused: ctx.activeTab === tabKey,
    focusTick: ctx.visitTick[tabKey] ?? 0,
    navigateTab: ctx.navigateTab,
  };
};
