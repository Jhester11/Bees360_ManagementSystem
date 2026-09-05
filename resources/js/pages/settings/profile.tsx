import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, KeyRound, LockKeyhole, UploadCloud } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Profile settings', href: '/settings/profile' }];

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth, flash } = usePage<SharedData & { flash: { userMessage?: string } }>().props;
    const [preview, setPreview] = useState<string | null>(auth.user.avatar);
    const [dragging, setDragging] = useState(false);
    const [showSuccess, setShowSuccess] = useState(Boolean(flash.userMessage));
    const fileInput = useRef<HTMLInputElement>(null);
    const { data, setData, post, errors, processing, progress } = useForm({ _method: 'patch', email: auth.user.email, avatar: null as File | null });
    const initials = auth.user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join('');

    useEffect(
        () => () => {
            if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
        },
        [preview],
    );

    function selectAvatar(file?: File) {
        if (!file) return;
        if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
        setData('avatar', file);
        setPreview(URL.createObjectURL(file));
    }

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('profile.update'), { forceFormData: true, preserveScroll: true, onSuccess: () => setShowSuccess(true) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />
            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Profile information" description="Manage your photo, email and account security" />
                    <form onSubmit={submit} className="space-y-6">
                        <div className="rounded-3xl border border-[#ead5a6] bg-[#fffdf8] p-6 shadow-[0_12px_35px_rgba(74,45,16,0.06)]">
                            <div className="grid gap-6 md:grid-cols-[230px_1fr] md:items-center">
                                <button
                                    type="button"
                                    onClick={() => fileInput.current?.click()}
                                    onDragEnter={(event) => {
                                        event.preventDefault();
                                        setDragging(true);
                                    }}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setDragging(false);
                                        selectAvatar(event.dataTransfer.files[0]);
                                    }}
                                    className={`relative mx-auto grid size-48 place-items-center overflow-hidden rounded-full border-4 border-dashed transition ${dragging ? 'scale-105 border-[#d18400] bg-[#fff1c8]' : 'border-[#e5bc59] bg-[#fff8e8] hover:border-[#c87500]'}`}
                                    aria-label="Upload profile image"
                                    data-tour="profile-image"
                                >
                                    {preview ? (
                                        <img src={preview} alt="Profile preview" className="size-full object-cover" />
                                    ) : (
                                        <span className="text-5xl font-black text-[#8c5415]">{initials}</span>
                                    )}
                                </button>
                                <div>
                                    <h3 className="text-lg font-black text-[#342615]">Profile image</h3>
                                    <p className="mt-2 text-sm leading-6 text-[#806f59]">
                                        Drag and drop a JPG, PNG or WebP image here, or click the circle. Maximum size is 5 MB.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInput.current?.click()}
                                        className="mt-4 border-[#d9b66e] text-[#6a3f15]"
                                    >
                                        <UploadCloud className="size-4" /> Choose image
                                    </Button>
                                    <input
                                        ref={fileInput}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={(event) => selectAvatar(event.target.files?.[0])}
                                    />
                                    {progress && (
                                        <div className="mt-4 max-w-sm" aria-live="polite">
                                            <div className="mb-1 flex justify-between text-xs font-bold text-[#806f59]">
                                                <span>Uploading image</span>
                                                <span>{progress.percentage}%</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-[#eee7dc]">
                                                <div
                                                    className="h-full rounded-full bg-[#d18400] transition-all"
                                                    style={{ width: `${progress.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <InputError className="mt-2" message={errors.avatar} />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-5 rounded-3xl border border-[#ead5a6] bg-[#fffdf8] p-6 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="full-name">Full name</Label>
                                <div className="relative">
                                    <Input
                                        id="full-name"
                                        value={auth.user.name}
                                        readOnly
                                        className="cursor-not-allowed bg-[#f4efe7] pr-10 text-[#6f604d]"
                                    />
                                    <LockKeyhole className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#9b876d]" />
                                </div>
                                <p className="text-xs text-[#806f59]">Managed by Operations to keep report and QA links accurate.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="nickname">Nickname</Label>
                                <div className="relative">
                                    <Input
                                        id="nickname"
                                        value={auth.user.n_name || 'Not set'}
                                        readOnly
                                        className="cursor-not-allowed bg-[#f4efe7] pr-10 text-[#6f604d]"
                                    />
                                    <LockKeyhole className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#9b876d]" />
                                </div>
                                <p className="text-xs text-[#806f59]">Ask Operations if your linked identity needs correction.</p>
                            </div>
                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(event) => setData('email', event.target.value)}
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                />
                                <InputError className="mt-1" message={errors.email} />
                            </div>
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <p className="text-sm text-neutral-800">
                                Your email address is unverified.{' '}
                                <Link href={route('verification.send')} method="post" as="button" className="font-bold underline">
                                    Send a new verification link.
                                </Link>
                                {status === 'verification-link-sent' && <span className="ml-2 text-green-700">Verification link sent.</span>}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <Button type="button" variant="outline" asChild className="border-[#d9b66e] text-[#6a3f15]">
                                <Link href={route('password.edit')} data-tour="change-password">
                                    <KeyRound className="size-4" /> Change password
                                </Link>
                            </Button>
                            <Button disabled={processing} className="bg-[#4a2d10] text-white hover:bg-[#67401a]">
                                {processing ? 'Saving…' : 'Save profile'}
                            </Button>
                        </div>
                    </form>
                </div>
            </SettingsLayout>

            <Dialog open={showSuccess} onOpenChange={() => undefined}>
                <DialogContent
                    className="border-[#ead5a6] bg-[#fffdf8] text-center sm:max-w-md [&>button:last-child]:hidden"
                    onEscapeKeyDown={(event) => event.preventDefault()}
                    onPointerDownOutside={(event) => event.preventDefault()}
                >
                    <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#e8f6e8] text-[#2f7c45]">
                        <CheckCircle2 className="size-8" />
                    </span>
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl text-[#342615]">Profile updated</DialogTitle>
                        <DialogDescription className="text-center text-[#806f59]">
                            {flash.userMessage || 'Your Bees360 profile was updated successfully.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center">
                        <Button type="button" onClick={() => setShowSuccess(false)} className="min-w-32 bg-[#4a2d10] text-white hover:bg-[#67401a]">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
