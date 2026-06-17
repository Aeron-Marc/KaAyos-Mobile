import React from 'react';

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type Worker = {
  id: string;
  name: string;
  category: string;
  avatar: string;
  initials: string;
  rating: number;
  reviews: number;
  distance: string;
  price: number;
  verified: boolean;
  skills: string[];
  about: string;
  location: { lat: number; lng: number };
};

export type Booking = {
  id: string;
  workerId: string;
  workerName: string;
  service: string;
  date: string;
  status: 'Active' | 'Done' | 'Pending';
  price: number;
};

export type WeeklyData = {
  name: string;
  earnings: number;
};

export type ProviderStats = {
  earnings: number;
  jobsCompleted: number;
  rating: number;
  weeklyData: WeeklyData[];
};

export const categories: Category[] = [
  { id: 'plumbing', name: 'Plumbing', icon: 'Wrench' },
  { id: 'electrical', name: 'Electrical', icon: 'Zap' },
  { id: 'cleaning', name: 'Cleaning', icon: 'Sparkles' },
  { id: 'hvac', name: 'HVAC', icon: 'Fan' },
  { id: 'carpentry', name: 'Carpentry', icon: 'Hammer' },
  { id: 'painting', name: 'Painting', icon: 'PaintRoller' },
];

export const workers: Worker[] = [
  {
    id: 'w1',
    name: 'Juan Dela Cruz',
    category: 'Plumbing',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
    initials: 'JD',
    rating: 4.9,
    reviews: 124,
    distance: '1.2 km',
    price: 450,
    verified: true,
    skills: ['Pipe Fixing', 'Water Heater', 'Drain Unblocking'],
    about: 'Experienced plumber with over 10 years of service. Fast, reliable, and guarantees high-quality work.',
    location: { lat: 14.5995, lng: 120.9842 },
  },
  {
    id: 'w2',
    name: 'Elena Santos',
    category: 'Cleaning',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    initials: 'ES',
    rating: 4.8,
    reviews: 89,
    distance: '3.5 km',
    price: 300,
    verified: true,
    skills: ['Deep Cleaning', 'Move-in/Move-out', 'Window Washing'],
    about: 'Meticulous cleaner who pays attention to every detail. Brings her own eco-friendly supplies.',
    location: { lat: 14.6095, lng: 120.9742 },
  },
  {
    id: 'w3',
    name: 'Marco Reyes',
    category: 'Electrical',
    avatar: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80',
    initials: 'MR',
    rating: 5.0,
    reviews: 210,
    distance: '0.8 km',
    price: 600,
    verified: true,
    skills: ['Wiring', 'Panel Upgrades', 'Lighting Setup'],
    about: 'Licensed master electrician. Safety is my number one priority.',
    location: { lat: 14.5895, lng: 120.9942 },
  },
  {
    id: 'w4',
    name: 'Sofia Gomez',
    category: 'Painting',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
    initials: 'SG',
    rating: 4.7,
    reviews: 56,
    distance: '5.1 km',
    price: 400,
    verified: false,
    skills: ['Interior Painting', 'Exterior Painting', 'Cabinet Refinishing'],
    about: 'Creative and neat painter. I can help you choose the right colors for your home.',
    location: { lat: 14.6195, lng: 120.9642 },
  },
  {
    id: 'w5',
    name: 'Carlos Mendez',
    category: 'Carpentry',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    initials: 'CM',
    rating: 4.6,
    reviews: 78,
    distance: '2.3 km',
    price: 550,
    verified: true,
    skills: ['Cabinet Making', 'Wood Repair', 'Custom Furniture'],
    about: 'Skilled carpenter with attention to detail and quality craftsmanship.',
    location: { lat: 14.5795, lng: 120.9742 },
  },
  {
    id: 'w6',
    name: 'Maria Garcia',
    category: 'HVAC',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    initials: 'MG',
    rating: 4.8,
    reviews: 92,
    distance: '4.2 km',
    price: 700,
    verified: true,
    skills: ['AC Installation', 'Heating Systems', 'Maintenance'],
    about: 'Professional HVAC technician with years of experience in residential installations.',
    location: { lat: 14.6295, lng: 120.9542 },
  },
];

export const bookings: Booking[] = [
  { id: 'b1', workerId: 'w1', workerName: 'Juan Dela Cruz', service: 'Plumbing - Leak Fix', date: 'Oct 24, 2026 - 10:00 AM', status: 'Active', price: 450 },
  { id: 'b2', workerId: 'w2', workerName: 'Elena Santos', service: 'Deep Cleaning', date: 'Oct 20, 2026 - 1:00 PM', status: 'Done', price: 1200 },
  { id: 'b3', workerId: 'w3', workerName: 'Marco Reyes', service: 'Electrical Inspection', date: 'Oct 28, 2026 - 9:00 AM', status: 'Pending', price: 600 },
];

export const providerStats: ProviderStats = {
  earnings: 12450,
  jobsCompleted: 42,
  rating: 4.9,
  weeklyData: [
    { name: 'Mon', earnings: 800 },
    { name: 'Tue', earnings: 1200 },
    { name: 'Wed', earnings: 400 },
    { name: 'Thu', earnings: 1600 },
    { name: 'Fri', earnings: 2100 },
    { name: 'Sat', earnings: 3000 },
    { name: 'Sun', earnings: 2400 },
  ],
};

export const categoryIcons: Record<string, React.ComponentType<any>> = {};
