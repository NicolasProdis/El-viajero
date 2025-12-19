
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

/**
 * Triggers haptic feedback using the Web Vibration API.
 * Patterns:
 * - Single number: pulse in ms.
 * - Array: [vibrate, pause, vibrate, ...]
 */
export const triggerHaptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Silent catch as vibration might be blocked by user settings or not supported
      console.warn("Haptic feedback not available", e);
    }
  }
};
