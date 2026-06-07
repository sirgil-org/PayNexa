import { type Session } from '@supabase/supabase-js'
import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase/supabase-client"

export default function LoginPage({ session }: { session: Session | null }) {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [mode] = useState<'sign-in' | 'sign-up'>('sign-in')
    const [status, setStatus] = useState('')
    const [isBusy, setIsBusy] = useState(false)

    useEffect(() => {
        if (session) navigate('/', { replace: true })
    }, [navigate, session])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!supabase) {
            setStatus('The secure account connection has not been configured yet.')
            return
        }

        setIsBusy(true)
        setStatus(mode === 'sign-in' ? 'Signing in...' : 'Creating account...')

        const response =
            mode === 'sign-in'
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password })

        setIsBusy(false)

        if (response.error) {
            setStatus(response.error.message)
            return
        }

        setStatus(
            mode === 'sign-in'
                ? 'Signed in.'
                : 'Account created. Confirm your email if required.',
        )
        navigate('/', { replace: true })
    }

    return (
        <main className="grid min-h-svh place-items-center bg-base-200 px-4 py-8">
            <section className="card w-full max-w-md border border-base-300 bg-base-100 shadow-xl py-6">
                <div className="card-body gap-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-base-content/60">
                            PayNexa
                        </p>
                        <h1 className="text-4xl font-bold">
                            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
                        </h1>
                    </div>

                    <form className="grid gap-0" onSubmit={handleSubmit}>
                        <fieldset className="fieldset">
                            <legend className="fieldset-legend">Email</legend>
                            <input
                                autoComplete="email"
                                className="input input-bordered w-full"
                                required
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                            />
                        </fieldset>
                        <fieldset className="fieldset">
                            <legend className="fieldset-legend">Password</legend>
                            <input
                                autoComplete={
                                    mode === 'sign-in' ? 'current-password' : 'new-password'
                                }
                                className="input input-bordered w-full"
                                minLength={6}
                                required
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                            {mode === 'sign-up' && (
                                <p className="label">Use at least 6 characters.</p>
                            )}
                        </fieldset>
                        <button className="btn btn-primary mt-4" disabled={isBusy} type="submit">
                            {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
                        </button>
                    </form>

                    {/* <button
          className="btn btn-link w-fit px-0"
          type="button"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        >
          {mode === 'sign-in'
            ? 'Create a new account'
            : 'Use an existing account'}
        </button> */}

                    {status && (
                        <div className="alert border-secondary/20 bg-secondary/10 py-3 text-sm text-base-content">{status}</div>
                    )
                    }
                </div>
            </section>
        </main>
    )
}
