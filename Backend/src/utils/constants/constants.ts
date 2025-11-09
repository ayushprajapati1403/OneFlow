export class HTTP_STATUS {
  public static readonly SUCCESS = 200
  public static readonly UNAUTHORIZED = 401
  public static readonly UNPROCESSED = 422
  public static readonly SERVER_ERROR = 500
  public static readonly NOT_FOUND = 404
}

export const FILE_TYPE: any = {
  1: {
    NAME: 'PROFILE_PIC',
    IS_PUBLIC: true,
    MIME_TYPE: [`image/*`],
    FILE_EXTENSION: ['png', 'svg', 'gif', 'webp', 'jpg', 'jpeg']
  },
  2: {
    NAME: 'WP_PIC',
    IS_PUBLIC: true,
    MIME_TYPE: [`image/*`],
    FILE_EXTENSION: ['png', 'svg', 'gif', 'webp', 'jpg', 'jpeg']
  }
}

export const FILE_TYPE_CONT = {
  PROFILE_PIC: 1,
  WP_PIC: 2
}

export const AWS_PATH: any = {
  PROFILE_PIC: 'profile_pic/',
  WP_PIC: 'watch_pic/'
}

// Reg ex list
export const REGEXP = {
  DATE_FORMAT: /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/,
  DATE_TIME_FORMAT: /^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01]) (00|0[1-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9]):([0-9]|[0-5][0-9])$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,64}$/,
  ALPHA_NUMERIC_REGEXP: /^[A-Za-z0-9 ]*$/,
  ALPHABETS_REGEXP: /^[A-Za-z ]*$/,
  EMAIL_ADDRESS_REGEXP: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  URL: /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/,
  NUMBER: /^\d{2,10}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  YEAR: /^\d{4}$/,
  // NAME: /^(?!.* {2})(?=.*[A-Za-z])[A-Za-z0-9'-]+(?: [A-Za-z0-9'-]+)*$/
  NAME: /^(?!.* {2}) ?(?=.*[A-Za-z])[A-Za-z0-9'-]+(?: [A-Za-z0-9'-]+)* ?$/
}

export const RECORDS_PER_PAGE = 10

export const EMAIL_TEMPLATE_CODE = {
  ERROR_HANDLE: 'EXCEPTION_MESSAGE',
  SEND_OTP: 'SEND_OTP'
}

// Role constants - these should match role_type values in your roles table
export const ROLE_TYPES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  TEAM_MEMBER: 'team_member',
  FINANCE: 'finance'
} as const

export const CONTACT_TYPES = {
  CLIENT: 'client',
  VENDOR: 'vendor',
  BOTH: 'both'
} as const

export const PROJECT_STATUS = {
  PLANNED: 'planned',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed'
} as const

export const PROJECT_DEFAULT_LIMIT = 20

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done'
} as const

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const

export const TASK_DEFAULT_LIMIT = 20

export const TIMESHEET_DEFAULT_LIMIT = 20

export const SALES_ORDER_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  PAID: 'paid',
  DECLINED: 'declined'
} as const

export const SALES_ORDER_DEFAULT_LIMIT = 20

export const PURCHASE_ORDER_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  PAID: 'paid',
  DECLINED: 'declined'
} as const

export const PURCHASE_ORDER_DEFAULT_LIMIT = 20

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  PAID: 'paid',
  DECLINED: 'declined'
} as const

export const INVOICE_DEFAULT_LIMIT = 20

export const VENDOR_BILL_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  PAID: 'paid',
  DECLINED: 'declined'
} as const

export const VENDOR_BILL_DEFAULT_LIMIT = 20

export const EXPENSE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  PAID: 'paid',
  DECLINED: 'declined'
} as const

export const EXPENSE_DEFAULT_LIMIT = 20

export const DEFAULT_PAGE = 1
export const DECIMAL_VALUE = 10

export const ACTIVE_STATUS = {
  ACTIVE: 1,
  INACTIVE: 0
}

export const BASE_URL = '/oneflow'
export const CURRENT_API_VERSION = 'api/v1'
export const ROUTE_SCOPE = {
  PUBLIC: '/public/',
  PRIVATE: '/private/',
  PROTECTED: '/protected/'
}

export const OTP_RE_SEND_MINUTES = 1
export const OTP_EXPIRED = 5

export const SOCKET_EVENT = {
  CONNECT: 'connect',
  STATUS: 'status',
  NEW_CHAT: 'new-chat',
  NEW_MESSAGE: 'new-message',
  SEND_MESSAGE: 'send-message',
  RECEIVED_MESSAGE: 'received-message'
}

export const NOTIFICATION_SOUND = 'https://commondatastorage.googleapis.com/codeskulptor-assets/jump.ogg'
export const NOTIFICATION_TEMPLATE_CODE = {
  NEW_MESSAGE_NOTIFICATION: 'NEW_MESSAGE_NOTIFICATION',
  MISSED_CONNECTION: 'MISSED_CONNECTION'
}
export const NOTIFICATION_TYPE = {
  CHAT: 'chat',
  MISSED_CONNECTION: 'missed_connection'
}
export const FIND_NEAR_MISSED_CONNECTION_IN_MITER = { MITER: 100000 }
export const EXPIRED_NEAR_MISSED_MESSAGE_IN_MINUTES = 2880
