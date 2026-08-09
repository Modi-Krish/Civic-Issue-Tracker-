import { collection, doc, getDocs, setDoc, updateDoc, addDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export async function getConversationHistory(userId: string) {
  try {
    // We get the most recent active conversation, or create one later
    const q = query(
      collection(db, 'ai_conversations'),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );
    // Note: in a real production environment we would filter by userId, but we need an index for that.
    // Assuming we do:
    // const q = query(collection(db, 'ai_conversations'), where('userId', '==', userId), orderBy('updatedAt', 'desc'), limit(1));
    // For now we will fetch messages directly if we have a conversationId.
    
    // To keep it simple without composite indexes, we will create a new conversation per session 
    // or just fetch by a deterministic ID based on user ID.
    const convId = `conv_${userId}`;
    
    const msgsSnapshot = await getDocs(
      query(collection(db, 'ai_conversations', convId, 'messages'), orderBy('timestamp', 'asc'))
    );
    
    const messages: any[] = [];
    msgsSnapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      });
    });
    
    return { conversationId: convId, messages };
  } catch (error) {
    console.error("Failed to load history:", error);
    return { conversationId: `conv_${userId}`, messages: [] };
  }
}

export async function saveMessageToHistory(conversationId: string, userId: string, message: any) {
  try {
    const convRef = doc(db, 'ai_conversations', conversationId);
    
    // Ensure conversation doc exists
    await setDoc(convRef, {
      userId: userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // Add message
    await addDoc(collection(db, 'ai_conversations', conversationId, 'messages'), {
      ...message,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.warn("Failed to save message history:", error);
  }
}
