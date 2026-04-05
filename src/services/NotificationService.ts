export class NotificationService {
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
