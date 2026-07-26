const API_BASE = 'http://192.168.1.3:3000/api';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

export function isAuthenticated(): boolean {
  return !!authToken;
}

export interface User {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: 'client' | 'worker' | 'admin';
  service_category: string | null;
  city: string | null;
  avatar: string | null;
  email_verified: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

export interface Worker {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  city: string | null;
  category: string;
  rating: number;
  reviews: number;
  jobs: number;
  verified: boolean;
  hourly_rate: number | null;
  services: { name: string; slug: string; price: number | null; base_price?: number | null }[];
  skills: string[];
}

export interface WorkerDetail {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  city: string | null;
  category: string;
  rating: number;
  jobs: number;
  verified: boolean;
  phone: string | null;
  email: string;
  bio: string | null;
  hourly_rate: number | null;
  years_of_experience: number | null;
  totalJobs: number;
  services: {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    base_price: number | null;
    custom_price: number | null;
    is_available: boolean;
  }[];
  reviews: {
    id: number;
    rating: number;
    comment: string | null;
    created_at: string;
    client_name: string;
    client_avatar: string | null;
  }[];
  skills: { name: string; slug: string }[];
  portfolio: {
    id: number;
    title: string | null;
    description: string | null;
    image_path: string | null;
    created_at: string;
  }[];
  documents: { type: string; status: string; file_path: string; admin_notes: string | null; verified_at: string | null }[];
}

export interface Booking {
  id: number;
  worker_id: number;
  client_id: number;
  service_category: string;
  scheduled_at: string;
  address: string;
  notes: string | null;
  status: 'new' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
  price: number | null;
  created_at: string;
  completed_at: string | null;
  other_name: string;
  other_avatar: string | null;
  completion_requested_by?: number | null;
  completion_requested_at?: string | null;
  confirmed_by_worker_at?: string | null;
  confirmed_by_client_at?: string | null;
  completion_status?: {
    is_pending: boolean;
    requested_by: 'worker' | 'client' | null;
    worker_confirmed: boolean;
    client_confirmed: boolean;
    pending_from: 'worker' | 'client' | null;
  };
}

export interface Message {
  id: number;
  booking_id: number | null;
  sender_id: number;
  receiver_id: number;
  message: string;
  read_at: string | null;
  created_at: string;
  sender_name: string;
  receiver_name: string;
  sender_avatar: string | null;
  receiver_avatar: string | null;
}

export interface Service {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  base_price: number | null;
  is_active: boolean;
  category_name: string;
}

export interface DashboardStats {
  stats: {
    activeBookings: number;
    completedJobs: number;
    unreadMessages: number;
    pendingReviews: number;
  };
}

export interface Earnings {
  stats: {
    total_earnings: number;
    total_jobs: number;
    completed_jobs: number;
  };
  weekly: { date: string; earnings: number }[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export async function login(email: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}): Promise<{ success: boolean; msg: string; userId?: number; token: string; user: User }> {
  return request('/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getCategories(): Promise<Category[]> {
  return request('/categories');
}

export async function getWorkers(params?: {
  category?: string;
  search?: string;
}): Promise<Worker[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  const qs = query.toString();
  return request(`/workers${qs ? `?${qs}` : ''}`);
}

export async function getWorkerDetail(id: number): Promise<WorkerDetail> {
  return request(`/workers/${id}`);
}

export async function getBookings(): Promise<Booking[]> {
  return request('/bookings');
}

export async function createBooking(data: {
  client_id: number;
  worker_id: number;
  service_category: string;
  scheduled_at: string;
  address: string;
  notes?: string;
  price?: number;
}): Promise<{ success: boolean; msg: string; bookingId: number }> {
  return request('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBookingStatus(
  bookingId: number,
  status: string
): Promise<{ success: boolean; msg: string }> {
  return request(`/bookings/${bookingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getProfile(): Promise<{ success: boolean; user: User }> {
  return request('/profile');
}

export async function updateProfile(
  data: { first_name?: string; last_name?: string; phone?: string; city?: string }
): Promise<{ success: boolean; msg: string }> {
  return request('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function uploadAvatar(file: FormData): Promise<{ success: boolean; msg: string; avatar_url: string }> {
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const response = await fetch(`${API_BASE}/profile/avatar`, {
    method: 'POST',
    headers,
    body: file,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Avatar upload failed');
  return data;
}

export async function getMessages(): Promise<Message[]> {
  return request('/messages');
}

export async function sendMessage(data: {
  sender_id: number;
  receiver_id: number;
  booking_id?: number;
  message: string;
}): Promise<{ success: boolean; msg: string; messageId: number }> {
  return request('/messages/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getServices(category_id?: number): Promise<Service[]> {
  const query = category_id ? `?category_id=${category_id}` : '';
  return request(`/services${query}`);
}

export async function toggleWorkerService(serviceId: number, isAvailable: boolean): Promise<{ success: boolean; msg: string }> {
  return request(`/worker/services/${serviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ is_available: isAvailable }),
  });
}

export async function updateWorkerLocation(latitude: number, longitude: number): Promise<{ success: boolean; msg: string }> {
  return request('/worker/location', {
    method: 'PUT',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return request('/client/dashboard');
}

export async function getEarnings(): Promise<Earnings> {
  return request('/earnings');
}

export async function submitReview(data: {
  booking_id: number;
  client_id: number;
  worker_id: number;
  rating: number;
  comment?: string;
}): Promise<{ success: boolean; msg: string }> {
  return request('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getWorkerProfile(userId: number): Promise<any> {
  return request(`/worker/profile/${userId}`);
}

export async function updateWorkerProfile(userId: number, data: any): Promise<{ success: boolean; msg: string }> {
  return request(`/worker/profile/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function submitDispute(data: {
  booking_id: number;
  reason: string;
}): Promise<{ success: boolean; msg: string; disputeId: number }> {
  return request('/disputes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getNotifications(): Promise<Notification[]> {
  return request('/notifications');
}

export async function markNotificationRead(id: string): Promise<{ success: boolean; msg: string }> {
  return request(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function chatBot(message: string, history: { role: string; content: string }[]): Promise<{
  success: boolean;
  reply: string;
  suggestions: string[];
}> {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}

export async function chatSuggest(message: string, history: { role: string; content: string }[]): Promise<{
  success: boolean;
  reply: string;
  suggestions: string[];
  workers: any[];
  mapHtml: string;
}> {
  return request('/chat/suggest', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}

export async function forgotPassword(email: string): Promise<{ success: boolean; msg: string; token?: string }> {
  return request('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(data: {
  email: string;
  token: string;
  password: string;
}): Promise<{ success: boolean; msg: string }> {
  return request('/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function markBookingComplete(bookingId: number): Promise<{ success: boolean; msg: string }> {
  return request(`/bookings/${bookingId}/mark-complete`, {
    method: 'POST',
  });
}

export async function confirmBookingCompletion(bookingId: number): Promise<{ success: boolean; msg: string }> {
  return request(`/bookings/${bookingId}/confirm-complete`, {
    method: 'POST',
  });
}