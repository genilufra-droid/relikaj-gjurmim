// Zëvendësues i lehtë i react-native për testet e rrjedhjes (renderim pa telefon).
import React from "react";
const host = (name) => {
  const C = (props) => React.createElement(name, { ...props }, props?.children);
  C.displayName = name;
  return C;
};
export const View = host("View");
export const Text = host("Text");
export const TextInput = host("TextInput");
export const TouchableOpacity = host("TouchableOpacity");
export const TouchableHighlight = host("TouchableHighlight");
export const Pressable = host("Pressable");
export const ScrollView = host("ScrollView");
export const SafeAreaView = host("SafeAreaView");
export const StatusBar = host("StatusBar");
export const ActivityIndicator = host("ActivityIndicator");
export const KeyboardAvoidingView = host("KeyboardAvoidingView");
export const Image = host("Image");
export const Modal = host("Modal");
export const Switch = host("Switch");
export const RefreshControl = host("RefreshControl");
export const ImageBackground = host("ImageBackground");

export const FlatList = ({ data = [], renderItem, ListHeaderComponent, ListEmptyComponent, ListFooterComponent, keyExtractor }) => {
  const head = ListHeaderComponent
    ? React.isValidElement(ListHeaderComponent) ? ListHeaderComponent : React.createElement(ListHeaderComponent)
    : null;
  const foot = ListFooterComponent
    ? React.isValidElement(ListFooterComponent) ? ListFooterComponent : React.createElement(ListFooterComponent)
    : null;
  const items = data.map((item, index) =>
    renderItem ? React.createElement(React.Fragment, { key: keyExtractor ? keyExtractor(item) : index }, renderItem({ item, index, separators: {} })) : null);
  const empty = data.length === 0 && ListEmptyComponent
    ? (React.isValidElement(ListEmptyComponent) ? ListEmptyComponent : React.createElement(ListEmptyComponent))
    : null;
  return React.createElement("FlatList", null, head, ...items, empty, foot);
};
export const SectionList = FlatList;
export const VirtualizedList = FlatList;

export const StyleSheet = {
  create: (o) => o,
  flatten: (x) => x,
  compose: (a, b) => [a, b],
  absoluteFill: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  absoluteFillObject: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  hairlineWidth: 1,
};
export const Platform = { OS: "android", Version: 33, select: (o) => (o && ("android" in o ? o.android : o.default)) };
export const Dimensions = { get: () => ({ width: 412, height: 892, scale: 2.6, fontScale: 1 }), addEventListener: () => ({ remove() {} }) };
export const PixelRatio = { get: () => 2.6, getFontScale: () => 1, roundToNearestPixel: (n) => n };
export const Alert = { alert: () => {} };
export const Linking = {
  openURL: async () => true,
  canOpenURL: async () => true,
  getInitialURL: async () => null,
  addEventListener: () => ({ remove() {} }),
  createURL: (p) => String(p),
};
export const AppState = { currentState: "active", addEventListener: () => ({ remove() {} }) };
export const Animated = {
  View: host("Animated.View"),
  Text: host("Animated.Text"),
  ScrollView: host("Animated.ScrollView"),
  Value: class { constructor(v) { this.v = v; } setValue() {} interpolate() { return this; } },
  timing: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  spring: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  parallel: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  sequence: () => ({ start: (cb) => cb && cb({ finished: true }) }),
  createAnimatedComponent: (c) => c,
  event: () => () => {},
};
export const useColorScheme = () => "light";
export const useWindowDimensions = () => ({ width: 412, height: 892, scale: 2.6, fontScale: 1 });
export default {
  View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, SafeAreaView, StatusBar,
  ActivityIndicator, KeyboardAvoidingView, Image, Modal, Switch, FlatList, StyleSheet,
  Platform, Dimensions, Alert, Linking, AppState, Animated,
};
