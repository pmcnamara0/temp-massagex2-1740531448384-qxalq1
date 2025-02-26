import { Message, Conversation } from '../types';
import { supabase } from '../lib/supabase';
import { mockMessages, mockConversations } from './mockData'; // Keep for fallback
import { getUserById } from './userService';

// Re-export getUserById
export { getUserById };

// Get conversations for a user
export const getConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    // Get all conversations where the user is a participant
    const { data: participations, error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    if (!participations.length) return [];
    
    const conversationIds = participations.map(p => p.conversation_id);
    
    // Get the conversations with their participants
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        created_at,
        conversation_participants(user_id)
      `)
      .in('id', conversationIds);
    
    if (convError) throw convError;
    
    // Get the last message for each conversation
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        // Get the last message
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('timestamp', { ascending: false })
          .limit(1);
        
        if (msgError) throw msgError;
        
        // Get the unread count
        const { data: unreadCount, error: countError } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('conversation_id', conv.id)
          .eq('read', false)
          .neq('sender_id', userId);
        
        if (countError) throw countError;
        
        // Extract participant IDs
        const participants = conv.conversation_participants.map((p: any) => p.user_id);
        
        return {
          id: conv.id,
          participants,
          lastMessage: messages[0] ? {
            id: messages[0].id,
            senderId: messages[0].sender_id,
            receiverId: participants.find((id: string) => id !== messages[0].sender_id) || '',
            content: messages[0].content,
            timestamp: messages[0].timestamp,
            read: messages[0].read,
          } : undefined,
          unreadCount: unreadCount?.count || 0,
        };
      })
    );
    
    return conversationsWithLastMessage;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    // Fallback to mock data
    const conversations = mockConversations.filter(conv => 
      conv.participants.includes(userId)
    );
    
    return conversations.map(conv => {
      const messagesInConv = mockMessages.filter(msg => 
        conv.participants.includes(msg.senderId) && 
        conv.participants.includes(msg.receiverId)
      );
      
      const sortedMessages = [...messagesInConv].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      return {
        ...conv,
        lastMessage: sortedMessages[0],
      };
    });
  }
};

// Get messages for a specific conversation
export const getMessages = async (conversationId: string): Promise<Message[]> => {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    
    // Get the conversation to know participants
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, conversation_participants(user_id)')
      .eq('id', conversationId)
      .single();
    
    if (convError) throw convError;
    
    const participants = conversation.conversation_participants.map((p: any) => p.user_id);
    
    // Transform data to match our Message type
    return messages.map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: participants.find(id => id !== msg.sender_id) || '',
      content: msg.content,
      timestamp: msg.timestamp,
      read: msg.read,
    }));
  } catch (error) {
    console.error('Error fetching messages:', error);
    // Fallback to mock data
    const conversation = mockConversations.find(conv => conv.id === conversationId);
    if (!conversation) return [];
    
    const messages = mockMessages.filter(msg => 
      conversation.participants.includes(msg.senderId) && 
      conversation.participants.includes(msg.receiverId)
    );
    
    return [...messages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
};

// Get conversation between two users
export const getConversationBetweenUsers = async (
  userId1: string, 
  userId2: string
): Promise<Conversation | undefined> => {
  try {
    // First get all conversations for userId1
    const { data: user1Convs, error: error1 } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId1);
    
    if (error1) throw error1;
    
    // Then get all conversations for userId2
    const { data: user2Convs, error: error2 } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId2);
    
    if (error2) throw error2;
    
    // Find common conversation IDs
    const user1ConvIds = user1Convs.map(c => c.conversation_id);
    const user2ConvIds = user2Convs.map(c => c.conversation_id);
    const commonConvIds = user1ConvIds.filter(id => user2ConvIds.includes(id));
    
    if (commonConvIds.length === 0) return undefined;
    
    // Get the first common conversation (there should only be one between two users)
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', commonConvIds[0])
      .single();
    
    if (error) throw error;
    
    // Get unread count
    const { data: unreadCount, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('conversation_id', conversation.id)
      .eq('read', false)
      .neq('sender_id', userId1);
    
    if (countError) throw countError;
    
    return {
      id: conversation.id,
      participants: [userId1, userId2],
      unreadCount: unreadCount?.count || 0,
    };
  } catch (error) {
    console.error('Error fetching conversation between users:', error);
    // Fallback to mock data
    return mockConversations.find(conv => 
      conv.participants.includes(userId1) && conv.participants.includes(userId2)
    );
  }
};

// Send a new message
export const sendMessage = async (senderId: string, receiverId: string, content: string): Promise<Message> => {
  try {
    // Check if conversation exists or create a new one
    let conversation = await getConversationBetweenUsers(senderId, receiverId);
    
    if (!conversation) {
      // Create a new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();
      
      if (convError) throw convError;
      
      // Add participants
      const participantsToAdd = [
        { conversation_id: newConversation.id, user_id: senderId },
        { conversation_id: newConversation.id, user_id: receiverId }
      ];
      
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participantsToAdd);
      
      if (partError) throw partError;
      
      conversation = {
        id: newConversation.id,
        participants: [senderId, receiverId],
        unreadCount: 0,
      };
    }
    
    // Create the message
    const messageData = {
      conversation_id: conversation.id,
      sender_id: senderId,
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    const { data: newMessage, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: newMessage.id,
      senderId: newMessage.sender_id,
      receiverId,
      content: newMessage.content,
      timestamp: newMessage.timestamp,
      read: newMessage.read,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    // Fallback with mock data
    const newMessage: Message = {
      id: `msg${mockMessages.length + 1}`,
      senderId,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    return newMessage;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (userId: string, conversationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('read', false);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    // In a mock environment, we don't need to do anything
  }
};

// Get user display info for a conversation
export const getConversationDisplayInfo = async (conversation: Conversation, currentUserId: string) => {
  const otherUserId = conversation.participants.find(id => id !== currentUserId);
  if (!otherUserId) return null;
  
  const otherUser = await getUserById(otherUserId);
  if (!otherUser) return null;
  
  return {
    id: otherUser.id,
    name: otherUser.name,
    profilePicture: otherUser.profilePicture,
  };
};
