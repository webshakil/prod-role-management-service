-- =====================================================
-- VOTTERY ROLE & PERMISSION TABLES
-- =====================================================

-- Role Definitions Table
CREATE TABLE IF NOT EXISTS votteryy_roles (
  role_id SERIAL PRIMARY KEY,
  role_name VARCHAR(100) UNIQUE NOT NULL,
  role_type VARCHAR(50) NOT NULL, -- 'admin' or 'user'
  role_category VARCHAR(100), -- 'platform', 'election_creator', 'voter', 'sponsor'
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  requires_subscription BOOLEAN DEFAULT FALSE,
  requires_action_trigger BOOLEAN DEFAULT FALSE, -- e.g., creating election, depositing funds
  action_trigger VARCHAR(100), -- 'create_election', 'deposit_funds', 'content_integration'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permission Definitions Table
CREATE TABLE IF NOT EXISTS votteryy_permissions (
  permission_id SERIAL PRIMARY KEY,
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  permission_category VARCHAR(100), -- 'election', 'voting', 'financial', 'admin', 'content'
  description TEXT,
  resource_type VARCHAR(100), -- 'election', 'vote', 'user', 'payment', 'lottery'
  action_type VARCHAR(50), -- 'create', 'read', 'update', 'delete', 'execute'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission Mapping Table
CREATE TABLE IF NOT EXISTS votteryy_role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  is_granted BOOLEAN DEFAULT TRUE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES votteryy_roles(role_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES votteryy_permissions(permission_id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- User Role Assignments Table (Enhanced version of existing votteryy_user_roles)
CREATE TABLE IF NOT EXISTS votteryy_user_role_assignments (
  assignment_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  assignment_type VARCHAR(50) DEFAULT 'automatic', -- 'automatic', 'manual', 'subscription', 'action_triggered'
  assigned_by INT, -- admin user_id who assigned (NULL for automatic)
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- NULL for permanent roles
  is_active BOOLEAN DEFAULT TRUE,
  deactivated_at TIMESTAMP,
  deactivated_by INT,
  deactivation_reason TEXT,
  metadata JSONB, -- Store additional context like subscription_id, election_id
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES votteryy_roles(role_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES public.users(user_id),
  FOREIGN KEY (deactivated_by) REFERENCES public.users(user_id)
);

-- Role Assignment History Table (Audit Trail)
CREATE TABLE IF NOT EXISTS votteryy_role_assignment_history (
  history_id SERIAL PRIMARY KEY,
  assignment_id INT,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'assigned', 'deactivated', 'reactivated', 'expired'
  action_by INT, -- admin user_id
  action_reason TEXT,
  action_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  previous_status BOOLEAN,
  new_status BOOLEAN,
  metadata JSONB,
  FOREIGN KEY (assignment_id) REFERENCES votteryy_user_role_assignments(assignment_id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES votteryy_roles(role_id) ON DELETE CASCADE,
  FOREIGN KEY (action_by) REFERENCES public.users(user_id)
);

-- User Permission Cache Table (Performance optimization)
CREATE TABLE IF NOT EXISTS votteryy_user_permission_cache (
  cache_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  permissions JSONB NOT NULL, -- Array of permission names
  roles JSONB NOT NULL, -- Array of role names
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cache_version INT DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- Role Hierarchy Table (For future expansion)
CREATE TABLE IF NOT EXISTS votteryy_role_hierarchy (
  id SERIAL PRIMARY KEY,
  parent_role_id INT NOT NULL,
  child_role_id INT NOT NULL,
  hierarchy_level INT DEFAULT 1,
  FOREIGN KEY (parent_role_id) REFERENCES votteryy_roles(role_id) ON DELETE CASCADE,
  FOREIGN KEY (child_role_id) REFERENCES votteryy_roles(role_id) ON DELETE CASCADE,
  UNIQUE(parent_role_id, child_role_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_votteryy_roles_type ON votteryy_roles(role_type);
CREATE INDEX idx_votteryy_roles_category ON votteryy_roles(role_category);
CREATE INDEX idx_votteryy_roles_active ON votteryy_roles(is_active);

CREATE INDEX idx_votteryy_permissions_category ON votteryy_permissions(permission_category);
CREATE INDEX idx_votteryy_permissions_resource ON votteryy_permissions(resource_type);
CREATE INDEX idx_votteryy_permissions_action ON votteryy_permissions(action_type);

CREATE INDEX idx_votteryy_role_permissions_role ON votteryy_role_permissions(role_id);
CREATE INDEX idx_votteryy_role_permissions_permission ON votteryy_role_permissions(permission_id);

CREATE INDEX idx_votteryy_user_assignments_user ON votteryy_user_role_assignments(user_id);
CREATE INDEX idx_votteryy_user_assignments_role ON votteryy_user_role_assignments(role_id);
CREATE INDEX idx_votteryy_user_assignments_active ON votteryy_user_role_assignments(is_active);
CREATE INDEX idx_votteryy_user_assignments_type ON votteryy_user_role_assignments(assignment_type);
CREATE INDEX idx_votteryy_user_assignments_expires ON votteryy_user_role_assignments(expires_at);

CREATE INDEX idx_votteryy_assignment_history_user ON votteryy_role_assignment_history(user_id);
CREATE INDEX idx_votteryy_assignment_history_role ON votteryy_role_assignment_history(role_id);
CREATE INDEX idx_votteryy_assignment_history_action ON votteryy_role_assignment_history(action);
CREATE INDEX idx_votteryy_assignment_history_date ON votteryy_role_assignment_history(action_at);

CREATE INDEX idx_votteryy_permission_cache_user ON votteryy_user_permission_cache(user_id);

-- =====================================================
-- INSERT DEFAULT ROLES
-- =====================================================

-- ADMIN ROLES (Platform Level)
INSERT INTO votteryy_roles (role_name, role_type, role_category, description, is_default, requires_subscription, requires_action_trigger) VALUES
('Manager', 'admin', 'platform', 'Complete platform control, highest permissions', FALSE, FALSE, FALSE),
('Admin', 'admin', 'platform', 'System administration, user management, platform config', FALSE, FALSE, FALSE),
('Moderator', 'admin', 'platform', 'Content moderation, community management, compliance', FALSE, FALSE, FALSE),
('Auditor', 'admin', 'platform', 'Security verification, audit trails, compliance', FALSE, FALSE, FALSE),
('Editor', 'admin', 'platform', 'Content management, translations, multi-language support', FALSE, FALSE, FALSE),
('Advertiser', 'admin', 'platform', 'Campaign management, ad revenue, promotional content', FALSE, FALSE, FALSE),
('Analyst', 'admin', 'platform', 'Data analytics, reporting, performance metrics', FALSE, FALSE, FALSE);

-- USER ROLES
INSERT INTO votteryy_roles (role_name, role_type, role_category, description, is_default, requires_subscription, requires_action_trigger, action_trigger) VALUES
('Voter (Free)', 'user', 'voter', 'Participate in voting only', TRUE, FALSE, FALSE, NULL),
('Individual Election Creator (Free)', 'user', 'election_creator', 'Create limited elections without monetization', FALSE, FALSE, TRUE, 'create_election'),
('Individual Election Creator (Subscribed)', 'user', 'election_creator', 'Unlimited election creation with all features', FALSE, TRUE, FALSE, NULL),
('Organization Election Creator (Free)', 'user', 'election_creator', 'Basic organizational voting capability', FALSE, FALSE, TRUE, 'create_organization_election'),
('Organization Election Creator (Subscribed)', 'user', 'election_creator', 'Full enterprise voting capability', FALSE, TRUE, FALSE, NULL),
('Content Creator (Subscribed)', 'user', 'election_creator', 'Create monetized voting experiences within content', FALSE, TRUE, TRUE, 'content_integration'),
('Sponsor', 'user', 'sponsor', 'Fund prize pools and manage funded elections', FALSE, FALSE, TRUE, 'deposit_funds');

-- =====================================================
-- INSERT DEFAULT PERMISSIONS
-- =====================================================

-- ADMIN PERMISSIONS
INSERT INTO votteryy_permissions (permission_name, permission_category, description, resource_type, action_type) VALUES
-- Manager Permissions
('manage_all_users', 'admin', 'Full user management capabilities', 'user', 'execute'),
('configure_system', 'admin', 'System-wide configuration access', 'system', 'update'),
('manage_payment_gateways', 'admin', 'Configure payment processors', 'payment', 'update'),
('access_audit_trails', 'admin', 'View complete audit logs', 'audit', 'read'),
('verify_security', 'admin', 'Security verification and compliance', 'security', 'execute'),
('manage_admin_roles', 'admin', 'Assign and manage admin roles', 'role', 'update'),

-- Admin Permissions
('manage_users', 'admin', 'User account management', 'user', 'update'),
('moderate_content', 'admin', 'Content moderation capabilities', 'content', 'update'),
('detect_fraud', 'admin', 'Fraud detection and prevention', 'security', 'execute'),
('manage_translations', 'admin', 'Translation and localization management', 'content', 'update'),
('view_analytics', 'admin', 'Access analytics dashboards', 'analytics', 'read'),
('manage_advertisements', 'admin', 'Advertisement campaign management', 'advertisement', 'update'),

-- ELECTION CREATION PERMISSIONS
('create_election_limited', 'election', 'Create limited number of elections', 'election', 'create'),
('create_election_unlimited', 'election', 'Create unlimited elections', 'election', 'create'),
('use_custom_branding', 'election', 'Apply custom branding to elections', 'election', 'update'),
('monetize_elections', 'election', 'Enable monetization features', 'election', 'update'),
('create_lotterized_elections', 'election', 'Create elections with lottery', 'lottery', 'create'),
('integrate_content_creator', 'election', 'Content creator integration tools', 'election', 'update'),
('embed_voting_icon', 'election', 'Embed voting icons in content', 'election', 'update'),
('lotterize_projected_revenue', 'election', 'Use projected revenue as prize', 'lottery', 'create'),
('setup_biometric_voting', 'election', 'Configure biometric requirements', 'election', 'update'),
('setup_regional_pricing', 'election', 'Configure regional pricing', 'election', 'update'),

-- VOTING PERMISSIONS
('vote_in_elections', 'voting', 'Cast votes in elections', 'vote', 'create'),
('vote_with_biometric', 'voting', 'Vote using biometric authentication', 'vote', 'create'),
('vote_with_fee', 'voting', 'Participate in paid voting', 'vote', 'create'),
('verify_own_vote', 'voting', 'Verify personal vote integrity', 'vote', 'read'),
('audit_own_vote', 'voting', 'Access personal voting audit trail', 'vote', 'read'),
('enter_lottery', 'voting', 'Participate in gamify draws', 'lottery', 'create'),
('win_prizes', 'voting', 'Eligible to win Gamify prizes', 'lottery', 'execute'),

-- SPONSOR PERMISSIONS
('fund_prize_pools', 'financial', 'Deposit funds for prize pools', 'payment', 'create'),
('manage_prize_pools', 'financial', 'Manage funded prize pools', 'lottery', 'update'),
('track_prize_distributions', 'financial', 'Monitor prize distribution', 'lottery', 'read'),
('create_sponsored_elections', 'election', 'Create elections with prizes', 'election', 'create');

-- =====================================================
-- MAP PERMISSIONS TO ROLES
-- =====================================================

-- Manager Role Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r
CROSS JOIN votteryy_permissions p
WHERE r.role_name = 'Manager';

-- Admin Role Permissions (excluding Manager-only permissions)
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Admin'
AND p.permission_name NOT IN ('verify_security', 'manage_admin_roles');

-- Moderator Role Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Moderator'
AND p.permission_name IN ('moderate_content', 'detect_fraud');

-- Auditor Role Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Auditor'
AND p.permission_name IN ('access_audit_trails', 'verify_security', 'detect_fraud');

-- Editor Role Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Editor'
AND p.permission_name IN ('moderate_content', 'manage_translations');

-- Advertiser Role Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Advertiser'
AND p.permission_name IN ('manage_advertisements');

-- Analyst Role Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Analyst'
AND p.permission_name IN ('view_analytics');

-- Voter (Free) Role Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Voter (Free)'
AND p.permission_name IN (
  'vote_in_elections', 'vote_with_biometric', 'vote_with_fee',
  'verify_own_vote', 'audit_own_vote', 'enter_lottery', 'win_prizes'
);

-- Individual Election Creator (Free) Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Individual Election Creator (Free)'
AND p.permission_name IN (
  'create_election_limited', 'vote_in_elections', 'vote_with_biometric',
  'verify_own_vote', 'audit_own_vote', 'enter_lottery', 'win_prizes'
);

-- Individual Election Creator (Subscribed) Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Individual Election Creator (Subscribed)'
AND p.permission_name IN (
  'create_election_unlimited', 'use_custom_branding', 'monetize_elections',
  'create_lotterized_elections', 'setup_biometric_voting', 'setup_regional_pricing',
  'vote_in_elections', 'vote_with_biometric', 'verify_own_vote',
  'audit_own_vote', 'enter_lottery', 'win_prizes'
);

-- Organization Election Creator (Free) Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Organization Election Creator (Free)'
AND p.permission_name IN (
  'create_election_limited', 'vote_in_elections', 'verify_own_vote', 'audit_own_vote'
);

-- Organization Election Creator (Subscribed) Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Organization Election Creator (Subscribed)'
AND p.permission_name IN (
  'create_election_unlimited', 'use_custom_branding', 'monetize_elections',
  'create_lotterized_elections', 'setup_biometric_voting', 'setup_regional_pricing',
  'vote_in_elections', 'verify_own_vote', 'audit_own_vote'
);

-- Content Creator (Subscribed) Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Content Creator (Subscribed)'
AND p.permission_name IN (
  'create_election_unlimited', 'use_custom_branding', 'monetize_elections',
  'create_lotterized_elections', 'integrate_content_creator', 'embed_voting_icon',
  'lotterize_projected_revenue', 'setup_biometric_voting', 'setup_regional_pricing',
  'vote_in_elections', 'verify_own_vote', 'audit_own_vote', 'enter_lottery', 'win_prizes'
);

-- Sponsor Role Permissions
INSERT INTO votteryy_role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM votteryy_roles r, votteryy_permissions p
WHERE r.role_name = 'Sponsor'
AND p.permission_name IN (
  'fund_prize_pools', 'manage_prize_pools', 'track_prize_distributions',
  'create_sponsored_elections', 'vote_in_elections', 'verify_own_vote',
  'audit_own_vote', 'enter_lottery', 'win_prizes'
);