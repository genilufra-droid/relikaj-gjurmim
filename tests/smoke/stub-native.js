// Zëvendësues për modulet native të Expo-s: mjafton të mos hedhin gabim gjatë renderimit.
const noop = async () => ({});
export const requestForegroundPermissionsAsync = async () => ({ status: "granted" });
export const requestBackgroundPermissionsAsync = async () => ({ status: "granted" });
export const getCurrentPositionAsync = async () => ({ coords: { latitude: 41.32, longitude: 19.44, accuracy: 5 } });
export const getLastKnownPositionAsync = async () => null;
export const watchPositionAsync = async () => ({ remove() {} });
export const Accuracy = { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 };
export const createURL = (p) => String(p);
export const parse = () => ({ path: "", queryParams: {} });
export const useURL = () => null;
export const getInitialURL = async () => null;
export const addEventListener = () => ({ remove() {} });
export const documentDirectory = "file:///docs/";
export const cacheDirectory = "file:///cache/";
export const getInfoAsync = async () => ({ exists: false, uri: "", size: 0 });
export const readAsStringAsync = async () => "";
export const writeAsStringAsync = noop;
export const deleteAsync = noop;
export const makeDirectoryAsync = noop;
export const downloadAsync = async () => ({ uri: "", status: 200 });
export const isAvailableAsync = async () => true;
export const shareAsync = noop;
export const getDocumentAsync = async () => ({ canceled: true, assets: [] });
export const launchImageLibraryAsync = async () => ({ canceled: true, assets: [] });
export const launchCameraAsync = async () => ({ canceled: true, assets: [] });
export const requestCameraPermissionsAsync = async () => ({ status: "granted" });
export const requestMediaLibraryPermissionsAsync = async () => ({ status: "granted" });
export const MediaTypeOptions = { Images: "Images", All: "All" };
export const Audio = { requestPermissionsAsync: async () => ({ status: "granted" }), setAudioModeAsync: noop, Recording: class { async prepareToRecordAsync() {} async startAsync() {} async stopAndUnloadAsync() {} getURI() { return "file:///a.m4a"; } } };
export const ExpoSpeechRecognitionModule = {
  requestPermissionsAsync: async () => ({ granted: true }),
  start: () => {}, stop: () => {}, abort: () => {},
  addListener: () => ({ remove() {} }),
  supportsOnDeviceRecognition: false,
  isRecognitionAvailable: () => true,
  getStateAsync: async () => "inactive",
  getDefaultRecognitionService: async () => ({}),
  getSupportedLocales: async () => ({ locales: [], installedLocales: [] }),
};
export const useSpeechRecognitionEvent = () => {};
export const EncodingType = { UTF8: "utf8", Base64: "base64" };
export const FileSystemSessionType = { Background: 0, Foreground: 1 };
export default {
  requestForegroundPermissionsAsync, getCurrentPositionAsync, Accuracy, createURL, Audio,
  ExpoSpeechRecognitionModule, useSpeechRecognitionEvent, isAvailableAsync, shareAsync,
};
