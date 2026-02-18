class HapticManager {
  public vibrateWrong() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 50, 50]); // Short double buzz
    }
  }

  public vibrateSuccess() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50); // Single short tick
    }
  }

  public vibrateTick(urgency: number = 0) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
       // Only tick haptically if urgent (last 3 seconds)
       if (urgency > 0.8) {
           navigator.vibrate(20);
       }
    }
  }

  public vibrateExplosion() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([500, 100, 500]); // Long heavy shake
    }
  }
}

export const hapticManager = new HapticManager();
