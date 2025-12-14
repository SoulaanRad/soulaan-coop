'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3Auth } from './use-web3-auth';

// Define role hierarchy
const roleHierarchy: Record<string, number> = {
  admin: 100,
  moderator: 50,
  member: 10,
  guest: 0,
};

// Define permission sets
const rolePermissions: Record<string, string[]> = {
  admin: ['manage_users', 'manage_content', 'approve_redemptions', 'view_analytics'],
  moderator: ['manage_content', 'approve_redemptions', 'view_analytics'],
  member: ['view_analytics'],
  guest: [],
};

export function useRoles() {
  const { isAuthenticated, address } = useWeb3Auth();
  const [userRole, setUserRole] = useState<string>('guest');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user role from the server
  const fetchUserRole = useCallback(async () => {
    if (!isAuthenticated || !address) {
      setUserRole('guest');
      setPermissions(rolePermissions.guest);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      const profile = await response.json();
      const role = profile.role || 'member';
      
      setUserRole(role);
      setPermissions([...rolePermissions[role], ...(profile.permissions || [])]);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('guest');
      setPermissions(rolePermissions.guest);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, address]);

  // Fetch role on mount and when auth state changes
  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Check if user has a specific role
  const hasRole = useCallback((role: string): boolean => {
    const userRoleLevel = roleHierarchy[userRole] || 0;
    const requiredRoleLevel = roleHierarchy[role] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  }, [userRole]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission));
  }, [permissions]);

  // Check if user has all of the specified permissions
  const hasAllPermissions = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => permissions.includes(permission));
  }, [permissions]);

  return {
    role: userRole,
    permissions,
    isLoading,
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    fetchUserRole,
  };
}
