import api from '@/lib/api'

export interface NotificationItem {
  id: number
  user_id: number | null
  branch_id?: number | null
  title: string
  message: string
  category: string
  link_url?: string | null
  is_read: boolean
  is_dismissed: boolean
  read_at?: string | null
  dismissed_at?: string | null
  created_at: string
  created_by_name?: string | null
}

export interface PaginatedNotifications {
  data: NotificationItem[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export async function fetchNotifications(
  params: { limit?: number; page?: number } = {}
): Promise<PaginatedNotifications> {
  const { data } = await api.get('/api/notifications', { params })
  return data
}

export async function fetchSentNotifications(
  params: {
    limit?: number
    page?: number
    branch_id?: number
    category?: string
  } = {}
): Promise<PaginatedNotifications> {
  const { data } = await api.get('/api/notifications', {
    params: { ...params, scope: 'sent' },
  })
  return data
}

export async function markNotificationRead(id: number) {
  await api.post(`/api/notifications/${id}/read`)
}

export async function markAllNotificationsRead() {
  await api.post('/api/notifications/read-all')
}

export async function dismissNotification(id: number) {
  await api.post(`/api/notifications/${id}/dismiss`)
}

export async function createNotification(payload: {
  title: string
  message: string
  category: string
  link_url?: string
  branch_id?: number
}) {
  const { data } = await api.post('/api/notifications', payload)
  return data
}
