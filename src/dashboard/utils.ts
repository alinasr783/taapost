import { supabase, type User, type UserPermission } from '../lib/supabase'

export async function getUserPermissions(userId: number): Promise<UserPermission[]> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
  
  if (error) {
    console.error('Error fetching permissions:', error)
    return []
  }
  return data || []
}

export function hasPermission(
  user: User,
  permissions: UserPermission[],
  categoryId: number,
  action: 'add' | 'edit' | 'delete'
): boolean {
  if (user.is_superadmin) return true
  
  const perm = permissions.find(p => p.category_id === categoryId)
  if (!perm) return false
  
  if (action === 'add') return perm.can_add
  if (action === 'edit') return perm.can_edit
  if (action === 'delete') return perm.can_delete
  
  return false
}
