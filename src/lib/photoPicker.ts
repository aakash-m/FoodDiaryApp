import * as ImagePicker from 'expo-image-picker';

export type PickedImage = { uri: string; width: number; height: number };

export class CameraPermissionError extends Error {
  override name = 'CameraPermissionError';
  constructor(readonly canAskAgain: boolean) {
    super('Camera access is needed to take meal photos.');
  }
}

const toPicked = (assets: ImagePicker.ImagePickerAsset[]): PickedImage[] =>
  assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }));

/** Opens the camera; [] if cancelled. Throws CameraPermissionError when access is denied. */
export async function takePhoto(): Promise<PickedImage[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new CameraPermissionError(permission.canAskAgain);
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  return result.canceled ? [] : toPicked(result.assets);
}

/** Opens the system photo picker (no permission needed on Android); [] if cancelled. */
export async function pickFromGallery(limit: number): Promise<PickedImage[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 1,
  });
  return result.canceled ? [] : toPicked(result.assets).slice(0, limit);
}
