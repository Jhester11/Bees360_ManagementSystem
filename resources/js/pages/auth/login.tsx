import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, KeyRound, LoaderCircle, Mail, ShieldCheck } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginForm extends Record<string, string | boolean> {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

const accessRoles = [
    { name: 'Operations', description: 'Manage every area' },
    { name: 'Trainer', description: 'Manage learning material' },
    { name: 'Quality Assurance', description: 'Review scores and quality' },
    { name: 'Team member', description: 'View your account' },
];

export default function Login({ status, canResetPassword }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Sign in" />

            <main className="relative grid min-h-svh overflow-hidden bg-[#fffaf0] text-[#302619] lg:grid-cols-[1.05fr_0.95fr]">
                <div className="absolute -top-32 left-[42%] size-80 rounded-full bg-[#ffc83d]/25 blur-3xl" />
                <section className="relative hidden overflow-hidden bg-[#332312] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
                    <div className="absolute inset-0 [background-image:radial-gradient(#ffc83d_1px,transparent_1px)] [background-size:28px_28px] opacity-20" />
                    <div className="relative flex items-center gap-3">
                        <div className="grid size-12 place-items-center rounded-2xl bg-[#ffc83d] text-[#38260e] shadow-lg shadow-black/20">
                            <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 32 32">
                                <path d="M16 4 26 10v12l-10 6-10-6V10l10-6Z" fill="currentColor" />
                                <path d="m16 4 10 6-10 6L6 10l10-6Zm0 12v12M6 10v12l10 6m10-18v12l-10 6" stroke="#fff4cf" strokeWidth="1.5" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight">Bees360</span>
                    </div>

                    <div className="relative max-w-lg">
                        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ffc83d]/30 bg-[#ffc83d]/10 px-3 py-1 text-sm font-medium text-[#ffda72]">
                            <ShieldCheck className="size-4" />
                            One workspace. Every role.
                        </span>
                        <h1 className="text-4xl leading-tight font-bold tracking-tight xl:text-5xl">The hive for your team’s best work.</h1>
                        <p className="mt-5 max-w-md text-base leading-7 text-[#eadbc5]">
                            Bees360 brings operations, learning, quality, and your team account together in one focused workspace.
                        </p>

                        <div className="mt-10 grid grid-cols-2 gap-3">
                            {accessRoles.map((role) => (
                                <div key={role.name} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                                    <p className="font-semibold text-[#ffda72]">{role.name}</p>
                                    <p className="mt-1 text-sm text-[#dcc9af]">{role.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="relative text-sm text-[#bba98f]">© {new Date().getFullYear()} Bees360 Management System</p>
                </section>

                <section className="relative flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
                    <div className="w-full max-w-md">
                        <Link href={route('home')} className="mb-12 flex items-center gap-3 lg:hidden">
                            <div className="grid size-11 place-items-center rounded-xl bg-[#3b2915] text-[#ffc83d]">
                                <svg aria-hidden="true" className="size-6" fill="currentColor" viewBox="0 0 32 32">
                                    <path d="M16 4 26 10v12l-10 6-10-6V10l10-6Z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold tracking-tight">Bees360</span>
                        </Link>

                        <div>
                            <p className="text-sm font-semibold tracking-[0.18em] text-[#b46b08] uppercase">Welcome back</p>
                            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#2f2416]">Sign in to Bees360</h2>
                            <p className="mt-3 text-sm leading-6 text-[#766956]">Enter your account details to access your workspace.</p>
                        </div>

                        {status && (
                            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                {status}
                            </div>
                        )}

                        <form className="mt-8 grid gap-5" onSubmit={submit}>
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="font-semibold text-[#4b3b26]">
                                    Email address
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#947e5e]" />
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        autoFocus
                                        autoComplete="email"
                                        value={data.email}
                                        onChange={(event) => setData('email', event.target.value)}
                                        placeholder="name@bees360.com"
                                        className="h-12 rounded-xl border-[#dfd2be] bg-white pl-11 shadow-sm placeholder:text-[#a59680] focus-visible:ring-[#d78b13]"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="font-semibold text-[#4b3b26]">
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="text-sm font-semibold text-[#ae6805] hover:text-[#7b4700] hover:underline"
                                        >
                                            Forgot password?
                                        </Link>
                                    )}
                                </div>
                                <div className="relative">
                                    <KeyRound className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#947e5e]" />
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        value={data.password}
                                        onChange={(event) => setData('password', event.target.value)}
                                        placeholder="Enter your password"
                                        className="h-12 rounded-xl border-[#dfd2be] bg-white pr-12 pl-11 shadow-sm placeholder:text-[#a59680] focus-visible:ring-[#d78b13]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((visible) => !visible)}
                                        className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#806c4f] hover:bg-[#fff1d5] hover:text-[#5d3b08] focus-visible:ring-2 focus-visible:ring-[#d78b13] focus-visible:outline-hidden"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="remember"
                                    checked={data.remember}
                                    onCheckedChange={(checked) => setData('remember', checked === true)}
                                    className="border-[#c5b291] data-[state=checked]:border-[#b66b00] data-[state=checked]:bg-[#b66b00]"
                                />
                                <Label htmlFor="remember" className="cursor-pointer text-sm text-[#675945]">
                                    Keep me signed in
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="mt-2 h-12 rounded-xl bg-[#b96c00] text-base font-bold text-white shadow-lg shadow-[#b96c00]/20 hover:bg-[#925400]"
                            >
                                {processing ? <LoaderCircle className="size-5 animate-spin" /> : 'Sign in'}
                            </Button>
                        </form>

                        <p className="mt-8 text-center text-sm text-[#766956]">Need access? Please contact your Bees360 administrator.</p>
                    </div>
                </section>
            </main>
        </>
    );
}
