// ============================================
// USER PERMISSIONS & ROLES - COMPLETE FIXED
// ============================================

const ROLES = {
    admin: {
        label: 'Administrator',
        color: '#ef4444',
        icon: 'fa-crown',
        level: 100,
        permissions: {
            members: ['create', 'read', 'update', 'delete'],
            events: ['create', 'read', 'update', 'delete'],
            finance: ['create', 'read', 'update', 'delete'],
            users: ['create', 'read', 'update', 'delete'],
            sermons: ['create', 'read', 'update', 'delete'],
            settings: ['create', 'read', 'update', 'delete'],
            reports: ['read', 'export'],
            mpesa: ['create', 'read', 'update', 'delete'],
            pledges: ['create', 'read', 'update', 'delete'],
            budgets: ['create', 'read', 'update', 'delete'],
            prayer: ['create', 'read', 'update', 'delete'],
            media: ['create', 'read', 'update', 'delete'],
            attendance: ['create', 'read', 'update', 'delete']
        }
    },
    pastor: {
        label: 'Pastor',
        color: '#3b82f6',
        icon: 'fa-church',
        level: 80,
        permissions: {
            members: ['read', 'update'],
            events: ['create', 'read', 'update'],
            finance: ['read'],
            users: ['read'],
            sermons: ['create', 'read', 'update', 'delete'],
            settings: ['read'],
            reports: ['read'],
            mpesa: ['read'],
            pledges: ['read'],
            budgets: ['read'],
            prayer: ['create', 'read', 'update'],
            media: ['read'],
            attendance: ['read', 'update']
        }
    },
    secretary: {
        label: 'Secretary',
        color: '#8b5cf6',
        icon: 'fa-user-tie',
        level: 60,
        permissions: {
            members: ['create', 'read', 'update'],
            events: ['create', 'read', 'update'],
            finance: ['read'],
            users: ['read'],
            sermons: ['read'],
            settings: ['read'],
            reports: ['read'],
            mpesa: ['read'],
            pledges: ['create', 'read', 'update'],
            budgets: ['read'],
            prayer: ['create', 'read', 'update'],
            media: ['create', 'read'],
            attendance: ['create', 'read', 'update']
        }
    },
    treasurer: {
        label: 'Treasurer',
        color: '#f59e0b',
        icon: 'fa-coins',
        level: 50,
        permissions: {
            members: ['read'],
            events: ['read'],
            finance: ['create', 'read', 'update'],
            users: ['read'],
            sermons: ['read'],
            settings: ['read'],
            reports: ['read'],
            mpesa: ['create', 'read'],
            pledges: ['create', 'read', 'update'],
            budgets: ['create', 'read', 'update'],
            prayer: ['read'],
            media: ['read'],
            attendance: ['read']
        }
    },
    cashier: {
        label: 'Cashier',
        color: '#22c55e',
        icon: 'fa-cash-register',
        level: 30,
        permissions: {
            members: ['read'],
            events: ['read'],
            finance: ['create', 'read'],
            users: ['read'],
            sermons: ['read'],
            settings: ['read'],
            reports: ['read'],
            mpesa: ['create', 'read'],
            pledges: ['read'],
            budgets: ['read'],
            prayer: ['read'],
            media: ['read'],
            attendance: ['read']
        }
    },
    member: {
        label: 'Member',
        color: '#64748b',
        icon: 'fa-user',
        level: 10,
        permissions: {
            members: ['read'],
            events: ['read'],
            finance: ['read'],
            users: ['read'],
            sermons: ['read'],
            settings: ['read'],
            reports: ['read'],
            mpesa: ['read'],
            pledges: ['read'],
            budgets: ['read'],
            prayer: ['create', 'read'],
            media: ['read'],
            attendance: ['read']
        }
    }
};

// Get current user
function getCurrentUserRole() {
    const user = getCurrentUser();
    if (!user) return 'member';
    return user.role || 'member';
}

function getUserRoleLevel(role) {
    return ROLES[role]?.level || 0;
}

function getUserRoleLabel(role) {
    return ROLES[role]?.label || 'Member';
}

function getUserRoleColor(role) {
    return ROLES[role]?.color || '#64748b';
}

function isAdmin() {
    return getCurrentUserRole() === 'admin';
}

function hasPermission(module, action) {
    const role = getCurrentUserRole();
    const rolePerms = ROLES[role]?.permissions;
    if (!rolePerms) return false;
    const modulePerms = rolePerms[module];
    if (!modulePerms) return false;
    return modulePerms.includes(action);
}

function canCreate(module) { return hasPermission(module, 'create'); }
function canRead(module) { return hasPermission(module, 'read'); }
function canUpdate(module) { return hasPermission(module, 'update'); }
function canDelete(module) { return hasPermission(module, 'delete'); }
function canExport(module) { return hasPermission(module, 'export'); }

// Check if user can manage users (only admin)
function canManageUsers() {
    return isAdmin();
}

// Check if user can delete a specific user
function canDeleteUser(userToDelete) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    // Only admin can delete users
    if (!isAdmin()) return false;
    
    // Admin cannot delete themselves
    if (currentUser.id === userToDelete.id) return false;
    
    return true;
}

// Check if user can promote another user
function canPromoteUser(userToPromote) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    // Only admin can promote users
    if (!isAdmin()) return false;
    
    // Cannot promote self
    if (currentUser.id === userToPromote.id) return false;
    
    return true;
}

// Apply permissions to UI elements
function applyPermissions() {
    // Show/hide elements based on permissions
    document.querySelectorAll('[data-permission]').forEach(el => {
        const perm = el.dataset.permission;
        const [module, action] = perm.split('.');
        const visible = hasPermission(module, action);
        el.style.display = visible ? '' : 'none';
    });

    // Admin-only elements
    document.querySelectorAll('[data-admin-only]').forEach(el => {
        el.style.display = isAdmin() ? '' : 'none';
    });

    // Non-admin elements
    document.querySelectorAll('[data-non-admin]').forEach(el => {
        el.style.display = isAdmin() ? 'none' : '';
    });

    // Update role badge
    const roleBadge = document.getElementById('userRoleBadge');
    if (roleBadge) {
        const role = getCurrentUserRole();
        const label = getUserRoleLabel(role);
        const color = getUserRoleColor(role);
        roleBadge.textContent = label;
        roleBadge.style.color = color;
        roleBadge.style.borderColor = color;
    }

    // Update sidebar role
    const roleEl = document.getElementById('userRole');
    if (roleEl) {
        const role = getCurrentUserRole();
        roleEl.textContent = getUserRoleLabel(role);
    }
}