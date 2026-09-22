export const SERVER_HOST = '192.168.0.187';
export const SERVER_PORT = 3000;
export const SERVER_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;
export const API_BASE = `${SERVER_URL}/api`;

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

export const TUY_BARANGAYS = [
  'Acle',
  'Bayudbud',
  'Bolbok',
  'Burgos',
  'Dalima',
  'Dao',
  'Guinhawa',
  'Lumbangan',
  'Luna',
  'Luntal',
  'Magahis',
  'Malibu',
  'Mataywanac',
  'Palincaro',
  'Putol',
  'Rillo',
  'Rizal',
  'Sabang',
  'San Jose',
  'Talon',
  'Toong',
  'Tuyon-Tuyon',
] as const;

export type TuyBarangay = typeof TUY_BARANGAYS[number];

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
  barangay?: string | null;
  street_address?: string | null;
  location_source?: 'gps' | 'manual' | null;
  email_notifications?: string;
  language?: string;
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

export interface BookingPhoto {
  id: number;
  url: string;
  caption: string | null;
  created_at: string;
}

export interface Booking {
  id: number;
  booking_ref?: string;
  worker_id: number;
  client_id: number;
  service_category: string;
  scheduled_at: string;
  address: string;
  house_no?: string | null;
  barangay?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes: string | null;
  status: 'new' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled' | 'declined';
  price: number | null;
  property_type?: string | null;
  pricing_type?: string | null;
  estimated_duration_hours?: number | null;
  complexity_level?: string | null;
  reschedule_requested_by?: number | null;
  reschedule_proposed_at?: string | null;
  reschedule_reason?: string | null;
  reschedule_status?: 'pending' | 'approved' | 'declined' | null;
  reschedule_responded_at?: string | null;
  created_at: string;
  completed_at: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  other_name: string;
  other_avatar: string | null;
  other_phone?: string | null;
  completion_requested_by?: number | null;
  completion_requested_at?: string | null;
  confirmed_by_worker_at?: string | null;
  confirmed_by_client_at?: string | null;
  work_started_at?: string | null;
  work_ended_at?: string | null;
  scope_amendment_price?: number | null;
  scope_amendment_notes?: string | null;
  scope_amendment_status?: 'pending' | 'approved' | 'declined' | null;
  scope_amendment_requested_at?: string | null;
  review_id?: number | null;
  review_rating?: number | null;
  review_comment?: string | null;
  photos?: BookingPhoto[];
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
  photo_url?: string | null;
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
  worker_id: number;
  service_category: string;
  scheduled_at: string;
  address: string;
  house_no?: string;
  barangay?: string;
  notes?: string;
  price?: number;
  property_type?: string;
  pricing_type?: string;
  estimated_duration_hours?: number;
  complexity_level?: string;
  latitude?: number;
  longitude?: number;
}): Promise<{ success: boolean; msg: string; bookingId: number; bookingRef?: string }> {
  return request('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBookingStatus(
  bookingId: number,
  status: string,
  decline_reason?: string
): Promise<{ success: boolean; msg: string }> {
  return request(`/bookings/${bookingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, decline_reason }),
  });
}

export async function requestReschedule(
  bookingId: number,
  proposed_at: string,
  reason?: string
): Promise<{ success: boolean; msg: string }> {
  return request(`/bookings/${bookingId}/reschedule`, {
    method: 'POST',
    body: JSON.stringify({ proposed_at, reason }),
  });
}

export async function respondReschedule(
  bookingId: number,
  action: 'approve' | 'decline'
): Promise<{ success: boolean; msg: string }> {
  return request(`/bookings/${bookingId}/reschedule-respond`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export async function uploadBookingPhoto(
  bookingId: number,
  file: FormData
): Promise<{ success: boolean; msg: string; photo: BookingPhoto }> {
  const headers: Record<string, string> = {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const response = await fetch(`${API_BASE}/bookings/${bookingId}/photo`, {
    method: 'POST',
    headers,
    body: file,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Photo upload failed');
  return data;
}

export async function confirmBookingCompletion(
  bookingId: number
): Promise<{ success: boolean; fullyCompleted: boolean; msg: string }> {
  return request(`/bookings/${bookingId}/confirm-complete`, {
    method: 'POST',
  });
}

export async function pingWorkerLocation(
  bookingId: number,
  latitude: number,
  longitude: number
): Promise<{ success: boolean; msg: string }> {
  return request(`/bookings/${bookingId}/location-ping`, {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function getProfile(): Promise<{ success: boolean; user: User }> {
  return request('/profile');
}

export async function updateProfile(
  data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    city?: string;
    barangay?: string;
    street_address?: string;
    location_source?: 'gps' | 'manual';
    email_notifications?: string;
    language?: string;
  }
): Promise<{ success: boolean; msg: string }> {
  return request('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function uploadAvatar(fileOrUri: FormData | string): Promise<{ success: boolean; msg: string; avatar_url: string }> {
  let body: FormData;
  if (typeof fileOrUri === 'string') {
    body = new FormData();
    body.append('file', {
      uri: fileOrUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);
  } else {
    body = fileOrUri;
  }

  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const response = await fetch(`${API_BASE}/profile/avatar`, {
    method: 'POST',
    headers,
    body,
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
  client_id?: number;
  worker_id: number;
  rating: number;
  comment?: string;
}): Promise<{ success: boolean; msg?: string }> {
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

export async function startWorkTimer(bookingId: number): Promise<{ success: boolean; msg?: string }> {
  return request(`/bookings/${bookingId}/timer-start`, {
    method: 'POST',
  });
}

export async function stopWorkTimer(bookingId: number): Promise<{
  success: boolean;
  msg?: string;
  elapsedHours?: number;
  price?: number;
}> {
  return request(`/bookings/${bookingId}/timer-stop`, {
    method: 'POST',
  });
}

export async function requestScopeAmendment(
  bookingId: number,
  data: { additional_price?: number; new_total_price?: number; notes: string }
): Promise<{ success: boolean; msg?: string; new_price?: number }> {
  return request(`/bookings/${bookingId}/scope-amendment`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function respondScopeAmendment(
  bookingId: number,
  action: 'approved' | 'declined'
): Promise<{ success: boolean; msg?: string }> {
  return request(`/bookings/${bookingId}/scope-amendment-respond`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export async function uploadChatPhoto(imageUri: string): Promise<{ success: boolean; photoPath: string; url: string }> {
  const formData = new FormData();
  formData.append('photo', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'chat_photo.jpg',
  } as any);

  const url = `${API_BASE}/messages/upload`;
  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to upload chat photo');
  }
  return data;
}

export async function uploadWorkerDocument(
  documentType: 'government_id' | 'barangay_clearance',
  imageUri: string
): Promise<{ success: boolean; msg: string; file_path: string }> {
  const formData = new FormData();
  formData.append('document_type', documentType);
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: `${documentType}.jpg`,
  } as any);

  const url = `${API_BASE}/worker/document`;
  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to upload document');
  }
  return data;
}

export async function getWorkerDocuments(): Promise<
  Array<{ id: number; document_type: string; file_path: string; status: string; admin_notes: string | null }>
> {
  return request('/worker/documents');
}