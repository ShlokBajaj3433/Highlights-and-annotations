/** Message passing types for extension communication */

export type MessageType =
  | 'AUTH_STATE_CHANGED'
  | 'WORKSPACE_CHANGED'
  | 'PRESENCE_UPDATE'
  | 'HIGHLIGHT_CREATED'
  | 'HIGHLIGHT_UPDATED'
  | 'HIGHLIGHT_DELETED'
  | 'COMMENT_CREATED'
  | 'COMMENT_UPDATED'
  | 'COMMENT_DELETED'
  | 'VISIT_RECORDED'
  | 'DOMAIN_RULE_CHANGED'
  | 'PAUSE_STATE_CHANGED'
  | 'OPEN_SIDE_PANEL'
  | 'CLOSE_SIDE_PANEL'
  | 'GET_PAGE_INFO'
  | 'PAGE_INFO_RESPONSE'
  | 'HIGHLIGHT_TEXT'
  | 'GET_HIGHLIGHTS'
  | 'HIGHLIGHTS_RESPONSE'
  | 'CREATE_HIGHLIGHT'
  | 'HIGHLIGHT_CREATED_RESPONSE'
  | 'GET_COMMENTS'
  | 'COMMENTS_RESPONSE'
  | 'CREATE_COMMENT'
  | 'COMMENT_CREATED_RESPONSE'
  | 'SEARCH_QUERY'
  | 'SEARCH_RESPONSE'
  | 'SYNC_REQUEST'
  | 'SYNC_RESPONSE'
  | 'OFFLINE_QUEUE_FLUSH'
  | 'REALTIME_CONNECT'
  | 'REALTIME_DISCONNECT'
  | 'REALTIME_STATUS';

export interface BaseMessage<T extends MessageType = MessageType> {
  type: T;
  timestamp: number;
  requestId?: string;
}

export interface AuthStateChangedMessage extends BaseMessage<'AUTH_STATE_CHANGED'> {
  payload: {
    isAuthenticated: boolean;
    user?: import('./types').User;
    workspace?: import('./types').Workspace;
  };
}

export interface WorkspaceChangedMessage extends BaseMessage<'WORKSPACE_CHANGED'> {
  payload: {
    workspace: import('./types').Workspace | null;
  };
}

export interface PresenceUpdateMessage extends BaseMessage<'PRESENCE_UPDATE'> {
  payload: {
    pageKey: string;
    users: Array<{
      userId: string;
      userName: string;
      userColor: string;
      shareLevel: import('./types').ShareLevel;
    }>;
  };
}

export interface HighlightCreatedMessage extends BaseMessage<'HIGHLIGHT_CREATED'> {
  payload: {
    highlight: import('./types').Highlight;
  };
}

export interface VisitRecordedMessage extends BaseMessage<'VISIT_RECORDED'> {
  payload: {
    visit: import('./types').PageVisit;
  };
}

export interface DomainRuleChangedMessage extends BaseMessage<'DOMAIN_RULE_CHANGED'> {
  payload: {
    domain: string;
    level: import('./types').ShareLevel;
    isBlocklist: boolean;
  };
}

export interface PauseStateChangedMessage extends BaseMessage<'PAUSE_STATE_CHANGED'> {
  payload: {
    paused: boolean;
    pauseUntil?: number;
  };
}

export interface GetPageInfoMessage extends BaseMessage<'GET_PAGE_INFO'> {
  payload: {
    tabId: number;
  };
}

export interface PageInfoResponseMessage extends BaseMessage<'PAGE_INFO_RESPONSE'> {
  payload: {
    url: string;
    title: string;
    domain: string;
    canonicalUrl?: string;
    pageKey: string;
    shareLevel: import('./types').ShareLevel;
  };
}

export interface HighlightTextMessage extends BaseMessage<'HIGHLIGHT_TEXT'> {
  payload: {
    quote: {
      exact: string;
      prefix: string;
      suffix: string;
    };
    position: { start: number; end: number };
    xpath: string;
  };
}

export interface GetHighlightsMessage extends BaseMessage<'GET_HIGHLIGHTS'> {
  payload: {
    pageKey: string;
  };
}

export interface HighlightsResponseMessage extends BaseMessage<'HIGHLIGHTS_RESPONSE'> {
  payload: {
    highlights: import('./types').Highlight[];
  };
}

export interface CreateHighlightMessage extends BaseMessage<'CREATE_HIGHLIGHT'> {
  payload: {
    pageKey: string;
    quote: {
      exact: string;
      prefix: string;
      suffix: string;
    };
    position: { start: number; end: number };
    xpath: string;
    color: string;
  };
}

export interface SearchQueryMessage extends BaseMessage<'SEARCH_QUERY'> {
  payload: {
    query: string;
    filters?: {
      userId?: string;
      domain?: string;
      dateFrom?: number;
      dateTo?: number;
      contentType?: 'visit' | 'highlight' | 'comment' | 'note';
      hasComments?: boolean;
    };
    cursor?: string;
    limit?: number;
  };
}

export interface SearchResponseMessage extends BaseMessage<'SEARCH_RESPONSE'> {
  payload: {
    results: Array<{
      type: 'visit' | 'highlight' | 'comment' | 'note';
      id: string;
      title: string;
      snippet: string;
      url?: string;
      domain: string;
      timestamp: number;
      userId: string;
      userName: string;
      userColor: string;
    }>;
    nextCursor?: string;
  };
}

export interface SyncRequestMessage extends BaseMessage<'SYNC_REQUEST'> {
  payload: {
    lastSyncTimestamp: number;
  };
}

export interface SyncResponseMessage extends BaseMessage<'SYNC_RESPONSE'> {
  payload: {
    visits: import('./types').PageVisit[];
    highlights: import('./types').Highlight[];
    comments: import('./types').Comment[];
    pageNotes: import('./types').PageNote[];
    notifications: import('./types').Notification[];
  };
}

export interface RealtimeStatusMessage extends BaseMessage<'REALTIME_STATUS'> {
  payload: {
    status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
    error?: string;
  };
}

export type ExtensionMessage =
  | AuthStateChangedMessage
  | WorkspaceChangedMessage
  | PresenceUpdateMessage
  | HighlightCreatedMessage
  | VisitRecordedMessage
  | DomainRuleChangedMessage
  | PauseStateChangedMessage
  | GetPageInfoMessage
  | PageInfoResponseMessage
  | HighlightTextMessage
  | GetHighlightsMessage
  | HighlightsResponseMessage
  | CreateHighlightMessage
  | SearchQueryMessage
  | SearchResponseMessage
  | SyncRequestMessage
  | SyncResponseMessage
  | RealtimeStatusMessage;

export function createMessage<T extends MessageType>(
  type: T,
  payload: ExtensionMessage extends BaseMessage<T> ? ExtensionMessage['payload'] : never,
  requestId?: string
): ExtensionMessage {
  return {
    type,
    timestamp: Date.now(),
    requestId,
    payload,
  } as ExtensionMessage;
}

export function isMessageType<T extends MessageType>(
  message: ExtensionMessage,
  type: T
): message is Extract<ExtensionMessage, { type: T }> {
  return message.type === type;
}
