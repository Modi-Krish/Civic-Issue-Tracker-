import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';

export function subscribeToNotifications(userId: string, callback: (notifs: any[]) => void) {
  const q1 = query(collection(db, 'notifications'), where('userId', '==', userId));
  const q2 = query(collection(db, 'notifications'), where('user_id', '==', userId));

  let notifs1: any[] = [];
  let notifs2: any[] = [];

  const update = () => {
    const map = new Map<string, any>();
    [...notifs1, ...notifs2].forEach(item => map.set(item.id, item));
    const combined = Array.from(map.values());
    combined.sort((a, b) => {
      const getMillis = (x: any) => typeof x?.toMillis === 'function' ? x.toMillis() : (x?.seconds ? x.seconds * 1000 : (x ? new Date(x).getTime() : 0));
      return getMillis(b.created_at) - getMillis(a.created_at);
    });
    callback(combined);
  };

  const unsub1 = onSnapshot(q1, (snapshot) => {
    notifs1 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    update();
  }, (error) => {
    console.error("Error subscribing to notifications (q1):", error);
  });

  const unsub2 = onSnapshot(q2, (snapshot) => {
    notifs2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    update();
  }, (error) => {
    console.error("Error subscribing to notifications (q2):", error);
  });

  return () => {
    unsub1();
    unsub2();
  };
}

export async function markNotificationRead(notifId: string) {
  try {
    const notifRef = doc(db, 'notifications', notifId);
    await updateDoc(notifRef, { is_read: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function markAllNotificationsRead(userId: string, notifs: any[]) {
  try {
    const batch = writeBatch(db);
    notifs.forEach(notif => {
      if (!notif.is_read) {
        batch.update(doc(db, 'notifications', notif.id), { is_read: true });
      }
    });
    await batch.commit();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
}

export async function getCompanyAdminStats(userId: string) {
  // In a fully migrated DB, this would query 'contracts', 'bids', and 'company_ratings'
  // For now, since the DB is empty, we return empty stats.
  return {
    rating: 0,
    completed: 0,
    activeContracts: 0,
    openBids: 0
  };
}

export async function getCompanyEmployeeTasks(userId: string) {
  // Queries 'issues' assigned to this user
  try {
    const q = query(collection(db, 'issues'), where('assigned_employee_id', '==', userId));
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    tasks.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return tasks;
  } catch (error) {
    console.error('Error fetching employee tasks:', error);
    return [];
  }
}
