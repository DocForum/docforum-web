import { apiClient } from './api-client';
import type { MessageThread, Message, MessagePage } from '../types/models';


export interface SendMessageInput {
  body: string;
}

export interface ListMessagesParams {
  cursor?: string;
  limit?: number;
}

export type SendMessageResult = Message;


export const messagingService = {
  async getThread(appointmentId: string): Promise<MessageThread> {
    return apiClient.get<MessageThread>(
      `/appointments/${encodeURIComponent(appointmentId)}/message-thread`,
    );
  },

  async listMessages(
    appointmentId: string,
    params: ListMessagesParams = {},
  ): Promise<MessagePage> {
    const search = new URLSearchParams();
    if (params.cursor) search.set('cursor', params.cursor);
    if (params.limit !== undefined) search.set('limit', String(params.limit));
    const qs = search.toString();
    return apiClient.get<MessagePage>(
      `/appointments/${encodeURIComponent(appointmentId)}/messages${qs ? `?${qs}` : ''}`,
    );
  },

  async sendMessage(
    appointmentId: string,
    input: SendMessageInput,
  ): Promise<Message> {
    return apiClient.post<Message>(
      `/appointments/${encodeURIComponent(appointmentId)}/messages`,
      { body: input.body },
    );
  },
};
