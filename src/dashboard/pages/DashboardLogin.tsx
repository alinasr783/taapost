import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function DashboardLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single()

      if (error || !data) {
        setError('بيانات الدخول غير صحيحة')
        return
      }

      // Store user in localStorage for simple session management
      localStorage.setItem('dashboard_user', JSON.stringify(data))
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError('حدث خطأ أثناء تسجيل الدخول')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 rtl" dir="rtl">
      <div className="w-full max-w-md rounded-lg bg-card p-8 shadow-md border border-border">
        <h1 className="mb-6 text-center text-2xl font-bold text-foreground">تسجيل الدخول للوحة التحكم</h1>
        {error && <div className="mb-4 rounded bg-destructive/10 p-3 text-destructive border border-destructive/20">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border border-input bg-background p-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-input bg-background p-2 text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-primary py-2 text-primary-foreground hover:bg-primary/90 transition"
          >
            دخول
          </button>
        </form>
      </div>
    </div>
  )
}
