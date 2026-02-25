import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Shield, Save, X } from 'lucide-react'
import { supabase, type User, type Category, type UserPermission } from '../../lib/supabase'

export default function DashboardUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isPermModalOpen, setIsPermModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])

  // User Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    is_superadmin: false
  })

  useEffect(() => {
    fetchUsers()
    fetchCategories()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*')
    if (data) setCategories(data)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return
    
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) {
      alert('حدث خطأ أثناء الحذف')
    } else {
      setUsers(users.filter(u => u.id !== id))
    }
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        const updateData: any = {
          username: formData.username,
          is_superadmin: formData.is_superadmin
        }
        if (formData.password) {
          updateData.password = formData.password
        }
        await supabase.from('users').update(updateData).eq('id', editingUser.id)
      } else {
        await supabase.from('users').insert([{
          username: formData.username,
          password: formData.password, // Storing plain text as requested
          is_superadmin: formData.is_superadmin
        }])
      }
      setIsFormOpen(false)
      fetchUsers()
    } catch (err) {
      console.error(err)
      alert('حدث خطأ أثناء الحفظ')
    }
  }

  const openUserForm = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        username: user.username,
        password: '', // Don't show password
        is_superadmin: user.is_superadmin
      })
    } else {
      setEditingUser(null)
      setFormData({
        username: '',
        password: '',
        is_superadmin: false
      })
    }
    setIsFormOpen(true)
  }

  const openPermissions = async (user: User) => {
    setEditingUser(user)
    // Fetch current permissions
    const { data } = await supabase.from('user_permissions').select('*').eq('user_id', user.id)
    setUserPermissions(data || [])
    setIsPermModalOpen(true)
  }

  const handlePermissionChange = (categoryId: number, field: 'can_add' | 'can_edit' | 'can_delete', value: boolean) => {
    setUserPermissions(prev => {
      const existing = prev.find(p => p.category_id === categoryId)
      if (existing) {
        return prev.map(p => p.category_id === categoryId ? { ...p, [field]: value } : p)
      } else {
        // Create new entry
        return [...prev, {
          id: 0, // temp
          user_id: editingUser!.id,
          category_id: categoryId,
          can_add: false,
          can_edit: false,
          can_delete: false,
          [field]: value
        }]
      }
    })
  }

  const savePermissions = async () => {
    if (!editingUser) return
    
    try {
      // Delete existing permissions for this user
      await supabase.from('user_permissions').delete().eq('user_id', editingUser.id)
      
      // Insert new permissions
      // Filter out permissions where all flags are false
      const toInsert = userPermissions.filter(p => p.can_add || p.can_edit || p.can_delete).map(p => ({
        user_id: editingUser.id,
        category_id: p.category_id,
        can_add: p.can_add,
        can_edit: p.can_edit,
        can_delete: p.can_delete
      }))
      
      if (toInsert.length > 0) {
        await supabase.from('user_permissions').insert(toInsert)
      }
      
      setIsPermModalOpen(false)
      alert('تم حفظ الصلاحيات بنجاح')
    } catch (err) {
      console.error(err)
      alert('حدث خطأ أثناء حفظ الصلاحيات')
    }
  }

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">إدارة المستخدمين</h1>
        <button
          onClick={() => openUserForm()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          <span>إضافة مستخدم</span>
        </button>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-muted/50 text-muted-foreground font-medium">
              <tr>
                <th className="p-4">اسم المستخدم</th>
                <th className="p-4">الدور</th>
                <th className="p-4">تاريخ الإنشاء</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{user.username}</td>
                  <td className="p-4">
                    {user.is_superadmin ? (
                      <span className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded text-sm font-medium">مدير عام</span>
                    ) : (
                      <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-sm">مستخدم</span>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground">{new Date(user.created_at).toLocaleDateString('ar-EG')}</td>
                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => openPermissions(user)}
                      className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="الصلاحيات"
                      disabled={user.is_superadmin}
                    >
                      <Shield size={18} />
                    </button>
                    <button
                      onClick={() => openUserForm(user)}
                      className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                      title="تعديل"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md border border-border">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">اسم المستخدم (البريد الإلكتروني)</label>
                <input
                  type="email"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {editingUser ? 'كلمة المرور (اتركها فارغة للإبقاء على الحالية)' : 'كلمة المرور'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none text-foreground"
                  dir="ltr"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_superadmin"
                  checked={formData.is_superadmin}
                  onChange={(e) => setFormData({ ...formData, is_superadmin: e.target.checked })}
                  className="w-4 h-4 text-primary rounded border-input focus:ring-ring"
                />
                <label htmlFor="is_superadmin" className="text-sm font-medium text-foreground">مدير عام (صلاحيات كاملة)</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-muted-foreground hover:bg-muted rounded transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2 transition-colors"
                >
                  <Save size={18} />
                  <span>حفظ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {isPermModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col border border-border">
            <div className="p-4 border-b border-border flex justify-between items-center sticky top-0 bg-card z-10">
              <div>
                <h2 className="text-xl font-bold text-foreground">تحديد الصلاحيات</h2>
                <p className="text-sm text-muted-foreground">للمستخدم: {editingUser.username}</p>
              </div>
              <button onClick={() => setIsPermModalOpen(false)} className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-muted/50 text-muted-foreground font-medium">
                    <tr>
                      <th className="p-4 border-b border-border w-1/3">القسم</th>
                      <th className="p-4 border-b border-border text-center">إضافة مقال</th>
                      <th className="p-4 border-b border-border text-center">تعديل مقال</th>
                      <th className="p-4 border-b border-border text-center">حذف مقال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categories.map(category => {
                      const perm = userPermissions.find(p => p.category_id === category.id) || { can_add: false, can_edit: false, can_delete: false }
                      return (
                        <tr key={category.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-4 font-medium border-b border-border text-foreground">{category.name}</td>
                          <td className="p-4 border-b border-border text-center">
                            <input
                              type="checkbox"
                              checked={perm.can_add}
                              onChange={(e) => handlePermissionChange(category.id, 'can_add', e.target.checked)}
                              className="w-5 h-5 text-primary rounded border-input focus:ring-ring"
                            />
                          </td>
                          <td className="p-4 border-b border-border text-center">
                            <input
                              type="checkbox"
                              checked={perm.can_edit}
                              onChange={(e) => handlePermissionChange(category.id, 'can_edit', e.target.checked)}
                              className="w-5 h-5 text-primary rounded border-input focus:ring-ring"
                            />
                          </td>
                          <td className="p-4 border-b border-border text-center">
                            <input
                              type="checkbox"
                              checked={perm.can_delete}
                              onChange={(e) => handlePermissionChange(category.id, 'can_delete', e.target.checked)}
                              className="w-5 h-5 text-primary rounded border-input focus:ring-ring"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/10 sticky bottom-0">
              <button
                onClick={() => setIsPermModalOpen(false)}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={savePermissions}
                className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2 transition-colors"
              >
                <Save size={18} />
                <span>حفظ التغييرات</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
