import React, { useState, useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Home, Gem, Wallet, CheckSquare, Settings } from 'lucide-react-native'
import { HomeScreen } from './src/screens/HomeScreen'
import { WeddingScreen } from './src/screens/WeddingScreen'
import { FinanceScreen } from './src/screens/FinanceScreen'
import { TodosScreen } from './src/screens/TodosScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { theme } from './src/theme/colors'

const Tab = createBottomTabNavigator()
const colors = theme.dark

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.cardBorder,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size || 20} color={color} />,
          }}
        />
        <Tab.Screen
          name="Wedding"
          component={WeddingScreen}
          options={{
            tabBarLabel: 'Wedding',
            tabBarIcon: ({ color, size }) => <Gem size={size || 20} color={color} />,
          }}
        />
        <Tab.Screen
          name="Finance"
          component={FinanceScreen}
          options={{
            tabBarLabel: 'Finance',
            tabBarIcon: ({ color, size }) => <Wallet size={size || 20} color={color} />,
          }}
        />
        <Tab.Screen
          name="Todos"
          component={TodosScreen}
          options={{
            tabBarLabel: 'Tasks',
            tabBarIcon: ({ color, size }) => <CheckSquare size={size || 20} color={color} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, size }) => <Settings size={size || 20} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
