// Role and Permission Configuration based on Master Prompt

export const ROLE_TYPES = {
  ADMIN: 'admin',
  USER: 'user'
};

export const ROLE_CATEGORIES = {
  PLATFORM: 'platform',
  ELECTION_CREATOR: 'election_creator',
  VOTER: 'voter',
  SPONSOR: 'sponsor'
};

export const ASSIGNMENT_TYPES = {
  AUTOMATIC: 'automatic',
  MANUAL: 'manual',
  SUBSCRIPTION: 'subscription',
  ACTION_TRIGGERED: 'action_triggered'
};

export const ACTION_TRIGGERS = {
  CREATE_ELECTION: 'create_election',
  CREATE_ORG_ELECTION: 'create_organization_election',
  CONTENT_INTEGRATION: 'content_integration',
  DEPOSIT_FUNDS: 'deposit_funds'
};

export const DEFAULT_ROLE = 'Voter (Free)';

export const ADMIN_ROLES = [
  'Manager',
  'Admin',
  'Moderator',
  'Auditor',
  'Editor',
  'Advertiser',
  'Analyst'
];

export const USER_ROLES = [
  'Voter (Free)',
  'Individual Election Creator (Free)',
  'Individual Election Creator (Subscribed)',
  'Organization Election Creator (Free)',
  'Organization Election Creator (Subscribed)',
  'Content Creator (Subscribed)',
  'Sponsor'
];

export const PERMISSION_CATEGORIES = {
  ADMIN: 'admin',
  ELECTION: 'election',
  VOTING: 'voting',
  FINANCIAL: 'financial',
  CONTENT: 'content',
  ANALYTICS: 'analytics',
  SECURITY: 'security'
};

export const RESOURCE_TYPES = {
  USER: 'user',
  ELECTION: 'election',
  VOTE: 'vote',
  PAYMENT: 'payment',
  LOTTERY: 'lottery',
  CONTENT: 'content',
  SYSTEM: 'system',
  AUDIT: 'audit',
  SECURITY: 'security',
  ANALYTICS: 'analytics',
  ADVERTISEMENT: 'advertisement',
  ROLE: 'role'
};

export const ACTION_TYPES = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  EXECUTE: 'execute'
};

export default {
  ROLE_TYPES,
  ROLE_CATEGORIES,
  ASSIGNMENT_TYPES,
  ACTION_TRIGGERS,
  DEFAULT_ROLE,
  ADMIN_ROLES,
  USER_ROLES,
  PERMISSION_CATEGORIES,
  RESOURCE_TYPES,
  ACTION_TYPES
};