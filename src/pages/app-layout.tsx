import { Link } from "react-router-dom"
import { supabase } from "../supabase/supabase-client"
import { type Session } from '@supabase/supabase-js'
import type { ReactNode } from "react"

export default function AppLayout({
    children,
    session,
}: {
    children: ReactNode
    session: Session | null
}) {
    async function signOut() {
        await supabase?.auth.signOut()
    }

    return (
        <main className="min-h-svh bg-base-200 text-base-content">
            <nav className="navbar border-b border-base-300 bg-base-100 px-4 lg:px-[max(1rem,calc((100vw-1240px)/2))]">
                <div className="flex-1">
                    <Link className="text-lg font-extrabold" to="/">
                        <img src="/wordmark.png" alt="logo" className="h-10" />
                    </Link>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 text-sm text-base-content/70">
                    <span className="truncate">{session?.user.email}</span>
                    <button className="btn btn-outline btn-sm" type="button" onClick={signOut}>
                        Sign out
                    </button>
                </div>
            </nav>
            {children}
        </main>
    )
}
