import api from '../api/axios'

const PUBLIC_VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function subscribePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push-уведомления не поддерживаются')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      const publicKey = PUBLIC_VAPID_KEY || (await api.get('/notifications/push-subscription/')).data.public_key
      if (!publicKey) {
        console.warn('VAPID public key не настроен')
        return false
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    await api.post('/notifications/push-subscription/', {
      endpoint: subscription.endpoint,
      p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
      auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
    })

    return true
  } catch (err) {
    console.error('Ошибка подписки на push:', err)
    return false
  }
}

export async function unsubscribePush() {
  if (!('serviceWorker' in navigator)) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      await api.delete('/notifications/push-subscription/', { data: { endpoint: subscription.endpoint } })
    }
    return true
  } catch (err) {
    console.error('Ошибка отписки от push:', err)
    return false
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'default'
  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    await subscribePush()
  }
  return permission
}
