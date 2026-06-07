import { type Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import {
  Navigate,
  Route,
  Routes
} from 'react-router-dom'
import AppLayout from './pages/app-layout'
import LoginPage from './pages/login'
import PayeeWorkspace from './pages/payee-workspace'
import ProtectedRoute from './pages/protected'
import { supabase } from './supabase/supabase-client'


function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoadingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoadingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (isLoadingSession) {
    return (
      <main className="grid min-h-svh place-items-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </main>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage session={session} />} />
      <Route
        path="/"
        element={
          <ProtectedRoute session={session}>
            <AppLayout session={session}>
              <PayeeWorkspace session={session as Session} />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App
