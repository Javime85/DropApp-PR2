import { Haptics, ImpactStyle } from '@capacitor/haptics';

window.testHaptics = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
    console.log('Haptics impact Heavy OK');
  } catch (err) {
    console.warn('Error Haptics test', err);
  }
};