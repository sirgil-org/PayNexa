import type { ReactNode } from "react"
import { type Session } from '@supabase/supabase-js'
import { Navigate } from "react-router-dom"
import { supabase } from "../supabase/supabase-client"

export default function ProtectedRoute({
    children,
    session,
}: {
    children: ReactNode
    session: Session | null
}) {
    if (!supabase) return <Navigate replace to="/login" />
    if (!session) return <Navigate replace to="/login" />

    return children
}
