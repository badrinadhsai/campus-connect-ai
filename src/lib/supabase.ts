import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-supabase') &&
  !supabaseAnonKey.includes('your-supabase')
);

// Memory-only fallback store for environment without active Supabase credentials
const memoryUsers = new Map<string, any>([
  ['alex.chen@campus.edu', {
    id: 'usr-student-1',
    email: 'alex.chen@campus.edu',
    password: 'password123',
    user_metadata: {
      full_name: 'Alex Chen',
      roll_no: '211FA04001',
      branch: 'CSE',
      year: '4th Year',
      phone: '9876543210',
      role: 'STUDENT'
    },
    created_at: new Date().toISOString()
  }],
  ['rajesh.kumar@campus.edu', {
    id: 'usr-staff-1',
    email: 'rajesh.kumar@campus.edu',
    password: 'password123',
    user_metadata: {
      full_name: 'Dr. Rajesh Kumar',
      branch: 'Electrical Maintenance',
      department: 'Electrical Maintenance',
      phone: '9876543211',
      role: 'STAFF'
    },
    created_at: new Date().toISOString()
  }],
  ['admin@vignan.ac.in', {
    id: 'usr-admin-1',
    email: 'admin@vignan.ac.in',
    password: 'password123',
    user_metadata: {
      full_name: 'Chief Campus Administrator',
      branch: 'Administration',
      department: 'Administration',
      phone: '9876543212',
      role: 'ADMIN'
    },
    created_at: new Date().toISOString()
  }]
]);

function createFallbackSupabaseClient(): any {
  return {
    auth: {
      async signUp({ email, password, options }: { email: string; password?: string; options?: any }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        console.log('[Supabase Auth] Executing signUp for:', cleanEmail);

        if (memoryUsers.has(cleanEmail)) {
          const err = { message: 'User already registered with this email address.' };
          console.error('[Supabase Auth] signUp error:', err.message);
          return { data: { user: null, session: null }, error: err };
        }

        const newId = `sb-usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newUserRecord = {
          id: newId,
          email: cleanEmail,
          password: password || '',
          user_metadata: options?.data || {},
          created_at: new Date().toISOString()
        };

        memoryUsers.set(cleanEmail, newUserRecord);

        const userObj = {
          id: newId,
          email: cleanEmail,
          user_metadata: options?.data || {},
          app_metadata: { provider: 'email' },
          created_at: newUserRecord.created_at
        };

        return {
          data: {
            user: userObj,
            session: { access_token: `sb-token-${newId}`, token_type: 'bearer', user: userObj }
          },
          error: null
        };
      },

      async signInWithPassword({ email, password }: { email: string; password?: string }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        console.log('[Supabase Auth] Executing signInWithPassword for:', cleanEmail);

        const storedUser = memoryUsers.get(cleanEmail);
        if (!storedUser || (storedUser.password && storedUser.password !== password)) {
          const err = { message: 'Invalid email or password.' };
          return { data: { user: null, session: null }, error: err };
        }

        const userObj = {
          id: storedUser.id,
          email: storedUser.email,
          user_metadata: storedUser.user_metadata || {},
          app_metadata: { provider: 'email' },
          created_at: storedUser.created_at
        };

        return {
          data: {
            user: userObj,
            session: { access_token: `sb-token-${storedUser.id}`, token_type: 'bearer', user: userObj }
          },
          error: null
        };
      },

      async getSession() {
        return { data: { session: null }, error: null };
      },

      async signOut() {
        return { error: null };
      },

      async resetPasswordForEmail(email: string) {
        return { data: {}, error: null };
      }
    },

    from(table: string) {
      return {
        async upsert(record: any) {
          return { data: record, error: null };
        },
        select(query: string = '*') {
          return {
            eq(field: string, val: any) {
              return {
                async single() {
                  return { data: null, error: null };
                }
              };
            }
          };
        }
      };
    }
  };
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createFallbackSupabaseClient() as unknown as SupabaseClient);
