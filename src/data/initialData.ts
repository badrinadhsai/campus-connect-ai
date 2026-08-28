import { CategoryInfo, Complaint, User, AuditLog, AppNotification } from '../types';

export const INITIAL_USERS: User[] = [];

export const INITIAL_CATEGORIES: CategoryInfo[] = [
  { id: 'cat-1', name: 'Wi-Fi', description: 'Wireless connectivity, router outages, signal strength issues', defaultSlaHours: 12, active: true, assignedStaffCount: 0, iconName: 'Wifi' },
  { id: 'cat-2', name: 'Classroom', description: 'Projectors, smartboards, desks, podiums, air conditioning', defaultSlaHours: 24, active: true, assignedStaffCount: 0, iconName: 'Monitor' },
  { id: 'cat-3', name: 'Laboratory', description: 'Lab equipment, chemical safety, electrical outlets, PC hardware', defaultSlaHours: 18, active: true, assignedStaffCount: 0, iconName: 'FlaskConical' },
  { id: 'cat-4', name: 'Library', description: 'Silent zone AC, study desk lights, computer kiosk errors', defaultSlaHours: 24, active: true, assignedStaffCount: 0, iconName: 'BookOpen' },
  { id: 'cat-5', name: 'Hostel', description: 'Dorm room furniture, window latches, door locks, room AC', defaultSlaHours: 24, active: true, assignedStaffCount: 0, iconName: 'Home' },
  { id: 'cat-6', name: 'Mess', description: 'Food quality, hygiene, seating arrangement, water coolers', defaultSlaHours: 12, active: true, assignedStaffCount: 0, iconName: 'Utensils' },
  { id: 'cat-7', name: 'Bus', description: 'Route delays, AC breakdown, seat damage, driver tracking', defaultSlaHours: 12, active: true, assignedStaffCount: 0, iconName: 'Bus' },
  { id: 'cat-8', name: 'Electricity', description: 'Power failure, short circuits, broken switches, corridor lights', defaultSlaHours: 6, active: true, assignedStaffCount: 0, iconName: 'Zap' },
  { id: 'cat-9', name: 'Water', description: 'Water leakage, pipe burst, RO purifier failure, tank empty', defaultSlaHours: 6, active: true, assignedStaffCount: 0, iconName: 'Droplets' },
  { id: 'cat-10', name: 'Washroom', description: 'Sanitation, broken flush, soap dispensers, missing supplies', defaultSlaHours: 8, active: true, assignedStaffCount: 0, iconName: 'Bath' },
  { id: 'cat-11', name: 'Furniture', description: 'Broken chairs, damaged benches, wobbly tables', defaultSlaHours: 48, active: true, assignedStaffCount: 0, iconName: 'Armchair' },
  { id: 'cat-12', name: 'Sports', description: 'Ground lighting, broken net, gymnasium equipment damage', defaultSlaHours: 48, active: true, assignedStaffCount: 0, iconName: 'Trophy' },
  { id: 'cat-13', name: 'Medical', description: 'First aid box refill, wheelchair access, emergency light', defaultSlaHours: 4, active: true, assignedStaffCount: 0, iconName: 'Cross' },
  { id: 'cat-14', name: 'Lost & Found', description: 'Lost ID cards, laptops, keys, bottles, bags found on campus', defaultSlaHours: 72, active: true, assignedStaffCount: 0, iconName: 'Search' },
  { id: 'cat-15', name: 'Parking', description: 'Illegal parking, gate barrier malfunction, EV charger error', defaultSlaHours: 24, active: true, assignedStaffCount: 0, iconName: 'Car' },
  { id: 'cat-16', name: 'Security', description: 'CCTV camera blackouts, gate security, unauthorized entry', defaultSlaHours: 4, active: true, assignedStaffCount: 0, iconName: 'ShieldAlert' },
  { id: 'cat-17', name: 'Other', description: 'General campus inquiry or uncategorized infrastructure issue', defaultSlaHours: 48, active: true, assignedStaffCount: 0, iconName: 'HelpCircle' }
];

export const INITIAL_COMPLAINTS: Complaint[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];
