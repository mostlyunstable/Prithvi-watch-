import React, { createContext, useContext, useState, useEffect } from 'react';
import { BackHandler } from 'react-native';

export type Tab = 'home' | 'map' | 'hazards' | 'emergency' | 'settings';

export interface NavRoute {
  name: string; // e.g. 'home', 'map', 'hazards', 'emergency', 'settings', 'landslide_details', 'flood_details', 'alert_details'
  params?: any;
}

interface NavigationContextType {
  activeTab: Tab;
  activeRoute: NavRoute;
  push: (name: string, params?: any) => void;
  pop: () => void;
  canGoBack: () => boolean;
  switchTab: (tab: Tab) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [stacks, setStacks] = useState<Record<Tab, NavRoute[]>>({
    home: [{ name: 'home' }],
    map: [{ name: 'map' }],
    hazards: [{ name: 'hazards' }],
    emergency: [{ name: 'emergency' }],
    settings: [{ name: 'settings' }],
  });

  const activeStack = stacks[activeTab];
  const activeRoute = activeStack[activeStack.length - 1];

  const push = (name: string, params?: any) => {
    setStacks((prev) => {
      const currentStack = prev[activeTab];
      return {
        ...prev,
        [activeTab]: [...currentStack, { name, params }],
      };
    });
  };

  const pop = () => {
    setStacks((prev) => {
      const currentStack = prev[activeTab];
      if (currentStack.length <= 1) return prev;
      return {
        ...prev,
        [activeTab]: currentStack.slice(0, -1),
      };
    });
  };

  const canGoBack = () => {
    return activeStack.length > 1;
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
  };

  // Hardware back button handler for Android
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack()) {
        pop();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, [activeTab, stacks]);

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        activeRoute,
        push,
        pop,
        canGoBack,
        switchTab,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
