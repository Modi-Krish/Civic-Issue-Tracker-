'use client';

// Local storage keys and mock state
const emailToUserMap: Record<string, any> = {
  'citizencivictracker@gmail.com': { id: 'u1', full_name: 'Citizen User', role: 'citizen' },
  'govofficercivictracker@gmail.com': { id: 'u2', full_name: 'Gov Officer', role: 'government_officer' },
  'roadcivictracker@gmail.com': { id: 'u3', full_name: 'Road Dept Admin', role: 'department_admin' },
  'electricitycivictracker@gmail.com': { id: 'u4', full_name: 'Electricity Dept Admin', role: 'department_admin' },
  'companyadmincivictracker@gmail.com': { id: 'u5', full_name: 'Company Admin', role: 'company_admin' },
  'companyemployeecivictracker@gmail.com': { id: 'u6', full_name: 'Company Employee', role: 'company_employee' },
  'superadmincivictracker@gmail.com': { id: 'u7', full_name: 'Super Admin', role: 'super_admin' },
};

function getMockTableData(table: string): any[] {
  if (typeof window === 'undefined') return [];
  const key = `mock_${table}`;
  const data = localStorage.getItem(key);
  if (data) return JSON.parse(data);

  let defaults: any[] = [];
  if (table === 'departments') {
    defaults = [
      { id: 'd1', name: 'Roads', slug: 'roads' },
      { id: 'd2', name: 'Water Supply', slug: 'water' },
      { id: 'd3', name: 'Electricity', slug: 'electricity' },
      { id: 'd4', name: 'Sanitation', slug: 'sanitation' },
      { id: 'd5', name: 'Drainage', slug: 'drainage' }
    ];
  } else if (table === 'profiles') {
    defaults = [
      { id: 'u1', full_name: 'Citizen User', role: 'citizen', department_id: null, account_status: 'APPROVED' },
      { id: 'u2', full_name: 'Gov Officer', role: 'government_officer', department_id: null, account_status: 'APPROVED' },
      { id: 'u3', full_name: 'Road Dept Admin', role: 'department_admin', department_id: 'd1', account_status: 'APPROVED' },
      { id: 'u4', full_name: 'Electricity Dept Admin', role: 'department_admin', department_id: 'd3', account_status: 'APPROVED' },
      { id: 'u5', full_name: 'Company Admin', role: 'company_admin', department_id: null, account_status: 'APPROVED' },
      { id: 'u6', full_name: 'Company Employee', role: 'company_employee', department_id: null, account_status: 'APPROVED' },
      { id: 'u7', full_name: 'Super Admin', role: 'super_admin', department_id: null, account_status: 'APPROVED' }
    ];
  } else if (table === 'issues') {
    defaults = [
      {
        id: 'i1',
        reporter_id: 'u1',
        department_id: 'd1',
        title: 'Pothole on Main Street',
        description: 'Large pothole causing traffic issues near the intersection.',
        status: 'REPORTED',
        location_lat: 12.9716,
        location_lng: 77.5946,
        location_label: 'Main Street, Bangalore',
        before_image_path: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2',
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'i2',
        reporter_id: 'u1',
        department_id: 'd3',
        title: 'Streetlight Blown Out',
        description: 'The street lamp outside house #45 is completely dead.',
        status: 'IN_PROGRESS',
        location_lat: 12.9720,
        location_lng: 77.5950,
        location_label: 'Koramangala, Bangalore',
        before_image_path: 'https://images.unsplash.com/photo-1509395062183-67c5ad6faff9',
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ];
  } else if (table === 'rewards') {
    defaults = [
      { id: 'r1', user_id: 'u1', issue_id: 'i2', points: 15, reason: 'Issue verification contribution', created_at: new Date().toISOString() }
    ];
  }
  localStorage.setItem(key, JSON.stringify(defaults));
  return defaults;
}

function saveMockTableData(table: string, data: any[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`mock_${table}`, JSON.stringify(data));
}

let authCallbacks: any[] = [];

class MockQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitCount: number | null = null;
  private isSingle = false;
  private isCount = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: any) {
    if (options?.count) this.isCount = true;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push(item => item[col] === val);
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push(item => item[col] !== val);
    return this;
  }

  order(col: string, options?: { ascending: boolean }) {
    this.orderCol = col;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(row: any) {
    const list = getMockTableData(this.table);
    const newRow = { id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString(), ...row };
    list.push(newRow);
    saveMockTableData(this.table, list);
    return new MockQueryBuilder(this.table).eq('id', newRow.id).single();
  }

  update(row: any) {
    const list = getMockTableData(this.table);
    return {
      eq: (col: string, val: any) => {
        const updatedList = list.map(item => {
          if (item[col] === val) {
            return { ...item, ...row, updated_at: new Date().toISOString() };
          }
          return item;
        });
        saveMockTableData(this.table, updatedList);
        return {
          then: (resolve: any) => resolve({ data: row, error: null })
        };
      }
    };
  }

  then(onfulfilled: (value: any) => any) {
    const data = this.execute();
    if (this.isSingle) {
      onfulfilled({ data: data[0] || null, error: data[0] ? null : { code: 'PGRST116', message: 'No rows' } });
    } else if (this.isCount) {
      onfulfilled({ data: null, count: data.length, error: null });
    } else {
      onfulfilled({ data, count: data.length, error: null });
    }
  }

  private execute() {
    let list = getMockTableData(this.table);
    for (const filter of this.filters) {
      list = list.filter(filter);
    }
    if (this.orderCol) {
      list = [...list].sort((a, b) => {
        const valA = a[this.orderCol!];
        const valB = b[this.orderCol!];
        if (valA < valB) return this.orderAsc ? -1 : 1;
        if (valA > valB) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }
    if (this.limitCount !== null) {
      list = list.slice(0, this.limitCount);
    }
    return list;
  }
}

const mockSupabaseClient = {
  auth: {
    getSession: async () => {
      if (typeof window === 'undefined') return { data: { session: null } };
      const activeUserId = localStorage.getItem('mock_active_user_id') || 'u1';
      const user = getMockTableData('profiles').find(u => u.id === activeUserId);
      if (!user) return { data: { session: null } };
      const email = Object.keys(emailToUserMap).find(k => emailToUserMap[k].id === user.id);
      return {
        data: {
          session: {
            user: {
              id: user.id,
              email,
              created_at: '2026-07-28T00:00:00Z',
              user_metadata: { role: user.role, full_name: user.full_name }
            }
          }
        }
      };
    },
    signInWithPassword: async ({ email }: { email: string }) => {
      const user = emailToUserMap[email];
      if (!user) return { error: { message: 'Invalid email' } };
      localStorage.setItem('mock_active_user_id', user.id);
      setTimeout(() => {
        authCallbacks.forEach(cb => cb('SIGNED_IN', {
          user: {
            id: user.id,
            email,
            created_at: '2026-07-28T00:00:00Z',
            user_metadata: { role: user.role, full_name: user.full_name }
          }
        }));
      }, 10);
      return { data: { user: { id: user.id, user_metadata: { role: user.role } } }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem('mock_active_user_id');
      setTimeout(() => {
        authCallbacks.forEach(cb => cb('SIGNED_OUT', null));
      }, 10);
      return { error: null };
    },
    onAuthStateChange: (cb: any) => {
      authCallbacks.push(cb);
      const activeUserId = typeof window !== 'undefined' ? localStorage.getItem('mock_active_user_id') || 'u1' : 'u1';
      const user = getMockTableData('profiles').find(u => u.id === activeUserId);
      if (user) {
        const email = Object.keys(emailToUserMap).find(k => emailToUserMap[k].id === user.id);
        cb('INITIAL_SESSION', {
          user: {
            id: user.id,
            email,
            created_at: '2026-07-28T00:00:00Z',
            user_metadata: { role: user.role, full_name: user.full_name }
          }
        });
      } else {
        cb('INITIAL_SESSION', null);
      }
      return { data: { subscription: { unsubscribe: () => {
        authCallbacks = authCallbacks.filter(c => c !== cb);
      } } } };
    }
  },
  from: (table: string) => new MockQueryBuilder(table),
  channel: (name: string) => {
    const chan: any = {
      on: (event: string, filter: any, callback: any) => {
        return chan;
      },
      subscribe: () => {
        return chan;
      }
    };
    return chan;
  },
  removeChannel: (channel: any) => {
    return Promise.resolve();
  }
};

if (typeof window !== 'undefined') {
  (window as any).resetMockData = () => {
    localStorage.clear();
    window.location.reload();
  };
}

export function createClient() {
  // Always return the mock client in the browser/client-side so no DB is needed!
  return mockSupabaseClient as any;
}
