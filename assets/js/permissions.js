// ============================================
// USER PERMISSIONS & ROLES
// ============================================

const ROLES = {
    admin: {
        label: 'Administrator',
        color: '#ef4444',
        icon: 'fa-crown',
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
            media: ['create', 'read', 'update', 'delete']
        }
    },
    pastor: {
        label: 'Pastor',
        color: '#3b82f6',
        icon: 'fa-church',
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
            media: ['read']
        }
    },
    secretary: {
        label: 'Secretary',
        color: '#8b5cf6',
        icon: 'fa-user-tie',
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
            media: ['create', 'read']
        }
    },
    cashier: {
        label: 'Cashier',
        color: '#22c55e',
        icon: 'fa-cash-register',
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
            media: ['read']
        }
    },
    member: {
        label: 'Member',
        color: '#64748b',
        icon: 'fa-user',
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
            media: ['read']
        }
    }
};

function getCurrentUserRole() {
    const user = getCurrentUser();
    return user ? user.role : 'member';
}

function getUserRoleLabel(role) {
    return ROLES[role]?.label || 'Member';
}

function getUserRoleColor(role) {
    return ROLES[role]?.color || '#64748b';
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

function applyPermissions() {
    // Show/hide elements based on permissions
    document.querySelectorAll('[data-permission]').forEach(el => {
        const perm = el.dataset.permission;
        const [module, action] = perm.split('.');
        const visible = hasPermission(module, action);
        el.style.display = visible ? '' : 'none';
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
}