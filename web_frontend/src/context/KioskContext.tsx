"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { FaceProfile, OrderType, SelectedModifier, Category, Product } from "@/types";

export interface CartItem {
  cartItemId: string;  // Unique ID for this cart item (generated when adding)
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;  // Original price before discount (for strikethrough display)
  quantity: number;
  isVeg: boolean;
  imageUrl?: string | null;
  specialInstructions?: string;
  selectedModifiers?: SelectedModifier[];
  modifiersTotal?: number;
}

export interface GuestInfo {
  name: string;
  phone: string;
}

interface KioskState {
  mode: "guest" | "logged-in";
  user: FaceProfile | null;
  guestInfo: GuestInfo | null;
  cart: CartItem[];
  orderType: OrderType;
  // Preloaded data for instant menu display
  categories: Category[];
  products: Product[];
  isDataPreloaded: boolean;
}

interface KioskContextType extends KioskState {
  // Auth actions
  loginUser: (user: FaceProfile) => void;
  setGuestMode: (guestInfo?: GuestInfo) => void;
  logout: () => void;

  // Cart actions
  addToCart: (item: Omit<CartItem, "quantity" | "cartItemId"> & { quantity?: number }) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateSpecialInstructions: (cartItemId: string, instructions: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;

  // Order type
  setOrderType: (type: OrderType) => void;

  // Guest info
  updateGuestInfo: (info: GuestInfo) => void;

  // Preload data for instant menu
  setPreloadedData: (categories: Category[], products: Product[]) => void;

  // Reset for new order
  resetKiosk: () => void;
}

const initialState: KioskState = {
  mode: "guest",
  user: null,
  guestInfo: null,
  cart: [],
  orderType: "DINE_IN",
  categories: [],
  products: [],
  isDataPreloaded: false,
};

const KioskContext = createContext<KioskContextType | undefined>(undefined);

export function KioskProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<KioskState>(initialState);

  const loginUser = useCallback((user: FaceProfile) => {
    setState((prev) => ({
      ...prev,
      mode: "logged-in",
      user,
      guestInfo: null,
    }));
  }, []);

  const setGuestMode = useCallback((guestInfo?: GuestInfo) => {
    setState((prev) => ({
      ...prev,
      mode: "guest",
      user: null,
      guestInfo: guestInfo || null,
    }));
  }, []);

  const logout = useCallback(() => {
    setState((prev) => ({
      ...prev,
      mode: "guest",
      user: null,
      guestInfo: null,
    }));
  }, []);

  const addToCart = useCallback((item: Omit<CartItem, "quantity" | "cartItemId"> & { quantity?: number }) => {
    setState((prev) => {
      // Create a unique key for the item based on productId and selected modifiers
      const getItemKey = (cartItem: { productId: string; selectedModifiers?: SelectedModifier[] }) => {
        const modifiersKey = cartItem.selectedModifiers
          ?.map((m) => `${m.groupName}:${m.options.map((o) => o.name).sort().join(",")}`)
          .sort()
          .join("|") || "";
        return `${cartItem.productId}__${modifiersKey}`;
      };

      const newItemKey = getItemKey(item);
      const existingIndex = prev.cart.findIndex((i) => getItemKey(i) === newItemKey);

      if (existingIndex >= 0) {
        const newCart = [...prev.cart];
        newCart[existingIndex].quantity += item.quantity || 1;
        return { ...prev, cart: newCart };
      }

      // Generate a unique cart item ID
      const cartItemId = `${item.productId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return { ...prev, cart: [...prev.cart, { ...item, cartItemId, quantity: item.quantity || 1 }] };
    });
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setState((prev) => ({
      ...prev,
      cart: prev.cart.filter((i) => i.cartItemId !== cartItemId),
    }));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    setState((prev) => {
      if (quantity <= 0) {
        return { ...prev, cart: prev.cart.filter((i) => i.cartItemId !== cartItemId) };
      }
      return {
        ...prev,
        cart: prev.cart.map((i) =>
          i.cartItemId === cartItemId ? { ...i, quantity } : i
        ),
      };
    });
  }, []);

  const updateSpecialInstructions = useCallback((cartItemId: string, instructions: string) => {
    setState((prev) => ({
      ...prev,
      cart: prev.cart.map((i) =>
        i.cartItemId === cartItemId ? { ...i, specialInstructions: instructions } : i
      ),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setState((prev) => ({ ...prev, cart: [] }));
  }, []);

  const getCartTotal = useCallback(() => {
    return state.cart.reduce((sum, item) => {
      const itemPrice = item.price + (item.modifiersTotal || 0);
      return sum + itemPrice * item.quantity;
    }, 0);
  }, [state.cart]);

  const getCartItemCount = useCallback(() => {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [state.cart]);

  const setOrderType = useCallback((type: OrderType) => {
    setState((prev) => ({ ...prev, orderType: type }));
  }, []);

  const updateGuestInfo = useCallback((info: GuestInfo) => {
    setState((prev) => ({ ...prev, guestInfo: info }));
  }, []);

  const setPreloadedData = useCallback((categories: Category[], products: Product[]) => {
    setState((prev) => ({
      ...prev,
      categories,
      products,
      isDataPreloaded: true,
    }));
  }, []);

  const resetKiosk = useCallback(() => {
    setState(initialState);
  }, []);

  const value: KioskContextType = {
    ...state,
    loginUser,
    setGuestMode,
    logout,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateSpecialInstructions,
    clearCart,
    getCartTotal,
    getCartItemCount,
    setOrderType,
    updateGuestInfo,
    setPreloadedData,
    resetKiosk,
  };

  return (
    <KioskContext.Provider value={value}>{children}</KioskContext.Provider>
  );
}

export function useKiosk() {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error("useKiosk must be used within a KioskProvider");
  }
  return context;
}
