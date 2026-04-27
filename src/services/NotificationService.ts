export class NotificationService {
  private static audioContext: AudioContext | null = null;

  private static getAudioContextCtor():
    | (new () => AudioContext)
    | undefined {
    const maybeWindow = window as Window & { webkitAudioContext?: new () => AudioContext };
    return window.AudioContext || maybeWindow.webkitAudioContext;
  }

  private static getOrCreateAudioContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext;

    const AudioContextCtor = this.getAudioContextCtor();
    if (!AudioContextCtor) return null;

    this.audioContext = new AudioContextCtor();
    return this.audioContext;
  }

  static async primeAudio(): Promise<boolean> {
    const audioContext = this.getOrCreateAudioContext();
    if (!audioContext) return false;

    try {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      return audioContext.state === 'running';
    } catch {
      return false;
    }
  }

  private static async playTonePattern(
    pattern: Array<{ frequency: number; startOffset: number; duration: number }>,
    maxGain: number = 0.12
  ): Promise<boolean> {
    const audioContext = this.getOrCreateAudioContext();
    if (!audioContext) return false;

    try {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      if (audioContext.state !== 'running') return false;

      const now = audioContext.currentTime;
      const gain = audioContext.createGain();
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(maxGain, now + 0.02);

      for (const step of pattern) {
        const osc = audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(step.frequency, now + step.startOffset);
        osc.connect(gain);
        osc.start(now + step.startOffset);
        osc.stop(now + step.startOffset + step.duration);
      }

      const endTime = Math.max(...pattern.map((step) => step.startOffset + step.duration), 0);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + endTime + 0.08);

      setTimeout(() => {
        gain.disconnect();
      }, Math.ceil((endTime + 0.2) * 1000));

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Best-effort local alert tone for iOS/PWA cases where Web Notification may be silent.
   * This should be triggered from a direct user gesture (button click) to avoid autoplay blocks.
   */
  static async playTestTone(): Promise<boolean> {
    return this.playTonePattern([
      { frequency: 880, startOffset: 0, duration: 0.12 },
      { frequency: 660, startOffset: 0.18, duration: 0.16 },
    ]);
  }

  static async playQueueEntryTone(): Promise<boolean> {
    return this.playTonePattern([
      { frequency: 740, startOffset: 0, duration: 0.1 },
      { frequency: 988, startOffset: 0.14, duration: 0.14 },
    ], 0.1);
  }

  static isSupported(): boolean {
    return 'Notification' in window;
  }

  static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }

  static hasPermission(): boolean {
    return this.isSupported() && Notification.permission === 'granted';
  }

  static notify(title: string, body: string, options?: { vibrate?: boolean }) {
    if (!this.hasPermission()) return;

    const notification = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      tag: 'smartqueue-notification',
      requireInteraction: true,
    });

    // Auto-close after 10s
    setTimeout(() => notification.close(), 10000);

    // Try to vibrate if supported
    if (options?.vibrate && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  static notifyCalled(clienteNome: string) {
    this.notify(
      'Sua vez chegou! 💈',
      `${clienteNome}, o barbeiro está te chamando. Dirija-se ao salão!`,
      { vibrate: true }
    );
  }

  static notifyNext(clienteNome: string) {
    this.notify(
      'Você é o próximo! 🔔',
      `${clienteNome}, prepare-se! Você será chamado em breve.`,
      { vibrate: true }
    );
  }
}
