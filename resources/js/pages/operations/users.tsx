import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, ImagePlus, LoaderCircle, LockKeyhole, Pencil, ShieldCheck, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react';

type ManagedUser = {
    id: number;
    name: string;
    n_name: string | null;
    email: string;
    role: string;
    is_active: boolean;
    avatar: string | null;
    created_at: string;
};

type Role = { value: string; label: string };
type UsersProps = { users: ManagedUser[]; roles: Role[] };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Operations dashboard', href: '/dashboard' },
    { title: 'Users', href: '/operations/users' },
];

const roleDetails: Record<string, string> = {
    operations: 'Full Operations access, including account management.',
    processor: 'Regular user access for Bees360 processors.',
    trainer: 'Access intended for Bees360 training workflows.',
    qa: 'Access intended for quality assurance and scoring.',
    reviewer: 'Access intended for report review workflows.',
};

function initials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

export default function Users({ users, roles }: UsersProps) {
    const { auth, flash } = usePage<SharedData & { flash: { userMessage?: string } }>().props;
    const [showCreate, setShowCreate] = useState(false);
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
    const [statusTarget, setStatusTarget] = useState<ManagedUser | null>(null);
    const [statusProcessing, setStatusProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(Boolean(flash.userMessage));
    const [successMessage, setSuccessMessage] = useState(flash.userMessage ?? '');
    const [successContext, setSuccessContext] = useState<'create' | 'update' | 'delete' | 'status' | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageLoadProgress, setImageLoadProgress] = useState(0);
    const form = useForm({
        _method: 'post' as 'post' | 'patch',
        name: '',
        n_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'processor',
        avatar: null as File | null,
    });

    const previewUrl = useMemo(() => (form.data.avatar ? URL.createObjectURL(form.data.avatar) : null), [form.data.avatar]);

    useEffect(
        () => () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        },
        [previewUrl],
    );

    useEffect(() => {
        if (flash.userMessage) {
            setSuccessMessage(flash.userMessage);
            setShowSuccess(true);
        }
    }, [flash.userMessage]);

    function chooseImage(file?: File) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            form.setError('avatar', 'Choose a JPG, PNG, or WebP image.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            form.setError('avatar', 'The profile image must not exceed 5 MB.');
            return;
        }
        form.clearErrors('avatar');
        setImageLoading(true);
        setImageLoadProgress(0);

        const reader = new FileReader();
        reader.onprogress = (event) => {
            if (event.lengthComputable) setImageLoadProgress(Math.round((event.loaded / event.total) * 100));
        };
        reader.onload = () => {
            setImageLoadProgress(100);
            form.setData('avatar', file);
        };
        reader.onerror = () => {
            setImageLoading(false);
            setImageLoadProgress(0);
            form.setError('avatar', 'The image could not be loaded. Choose another file.');
        };
        reader.readAsArrayBuffer(file);
    }

    function dropImage(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        setIsDragging(false);
        chooseImage(event.dataTransfer.files[0]);
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(editingUser ? `/operations/users/${editingUser.id}` : '/operations/users', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setImageLoading(false);
                setImageLoadProgress(0);
                setSuccessContext(editingUser ? 'update' : 'create');
                setSuccessMessage(editingUser ? 'Successfully updated the Bees360 account.' : 'Successfully created the Bees360 account.');
                setShowCreate(false);
                setEditingUser(null);
                form.reset();
                setShowSuccess(true);
            },
        });
    }

    function openCreate() {
        setEditingUser(null);
        form.reset();
        form.clearErrors();
        form.setData('_method', 'post');
        setShowCreate(true);
    }

    function openUpdate(user: ManagedUser) {
        setEditingUser(user);
        form.clearErrors();
        form.setData({
            _method: 'patch',
            name: user.name,
            n_name: user.n_name ?? '',
            email: user.email,
            password: '',
            password_confirmation: '',
            role: user.role,
            avatar: null,
        });
        setShowCreate(true);
    }

    function closeAccountDialog() {
        if (form.processing) return;
        setShowCreate(false);
        setEditingUser(null);
        form.reset();
        form.clearErrors();
    }

    function closeSuccess() {
        setShowSuccess(false);

        if (successContext === 'create' || successContext === 'update') closeAccountDialog();
        if (successContext === 'delete') setDeleteTarget(null);
        if (successContext === 'status') setStatusTarget(null);

        setSuccessContext(null);
    }

    function updateStatus() {
        if (!statusTarget) return;
        setStatusProcessing(true);
        router.patch(
            `/operations/users/${statusTarget.id}/status`,
            { is_active: !statusTarget.is_active },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSuccessContext('status');
                    setSuccessMessage(
                        statusTarget.is_active ? 'The account was deactivated successfully.' : 'The account was activated successfully.',
                    );
                    setStatusTarget(null);
                    setShowSuccess(true);
                },
                onFinish: () => setStatusProcessing(false),
            },
        );
    }

    function deleteUser() {
        if (!deleteTarget) return;
        router.delete(`/operations/users/${deleteTarget.id}`, {
            preserveScroll: true,
            onStart: () => setStatusProcessing(true),
            onSuccess: () => {
                setSuccessContext('delete');
                setSuccessMessage('The Bees360 account and all connected data were deleted successfully.');
                setDeleteTarget(null);
                setShowSuccess(true);
            },
            onFinish: () => setStatusProcessing(false),
        });
    }

    const activeCount = users.filter((user) => user.is_active).length;
    const displayedAvatar = previewUrl ?? editingUser?.avatar ?? null;
    const explicitCloseDialogClass = '[&>button:last-child]:hidden';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Users" />
            <div className="flex flex-1 flex-col gap-6 bg-[#fffaf1] p-5 md:p-8">
                <Dialog open={showSuccess}>
                    <DialogContent
                        onEscapeKeyDown={(event) => event.preventDefault()}
                        onPointerDownOutside={(event) => event.preventDefault()}
                        className={`max-w-md border-[#ead5a6] bg-[#fffdf8] text-center ${explicitCloseDialogClass}`}
                    >
                        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#e8f6e5] text-[#348347]">
                            <CheckCircle2 className="size-8" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-center text-2xl text-[#342615]">Successful</DialogTitle>
                            <DialogDescription className="text-center text-[#806f59]">{successMessage}</DialogDescription>
                        </DialogHeader>
                        <Button onClick={closeSuccess} className="h-12 bg-[#b96c00] px-8 text-base font-bold text-white hover:bg-[#925400]">
                            Close
                        </Button>
                    </DialogContent>
                </Dialog>

                <Dialog open={Boolean(statusTarget)}>
                    <DialogContent
                        onEscapeKeyDown={(event) => event.preventDefault()}
                        onPointerDownOutside={(event) => event.preventDefault()}
                        className={`max-w-md border-[#ead5a6] bg-[#fffdf8] ${explicitCloseDialogClass}`}
                    >
                        <DialogHeader>
                            <DialogTitle className="text-[#342615]">
                                {statusTarget?.is_active ? 'Deactivate account?' : 'Activate account?'}
                            </DialogTitle>
                            <DialogDescription className="leading-6 text-[#806f59]">
                                {statusTarget?.is_active
                                    ? `${statusTarget.name} will be signed out and unable to use Bees360.`
                                    : `${statusTarget?.name} will be able to sign in and use Bees360 again.`}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                type="button"
                                onClick={() => setStatusTarget(null)}
                                className="h-11 border border-[#dac7a7] bg-white px-6 font-bold text-[#654d2e] hover:bg-[#fff5df]"
                            >
                                Close
                            </Button>
                            <Button
                                type="button"
                                onClick={updateStatus}
                                disabled={statusProcessing}
                                className={
                                    statusTarget?.is_active
                                        ? 'bg-[#a33b2d] text-white hover:bg-[#812d22]'
                                        : 'bg-[#39844a] text-white hover:bg-[#2b6939]'
                                }
                            >
                                {statusProcessing && <LoaderCircle className="size-4 animate-spin" />}
                                Yes, {statusTarget?.is_active ? 'deactivate' : 'activate'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={Boolean(deleteTarget)}>
                    <DialogContent
                        onEscapeKeyDown={(event) => event.preventDefault()}
                        onPointerDownOutside={(event) => event.preventDefault()}
                        className={`max-w-md border-[#ead5a6] bg-[#fffdf8] ${explicitCloseDialogClass}`}
                    >
                        <div className="grid size-14 place-items-center rounded-2xl bg-[#f9e2dc] text-[#a33b2d]">
                            <Trash2 className="size-7" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-xl text-[#342615]">Delete this account?</DialogTitle>
                            <DialogDescription className="leading-6 text-[#806f59]">
                                This permanently deletes {deleteTarget?.name}, their profile image, sessions, queue uploads, platform pulls, and all
                                connected records. This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={statusProcessing}
                                className="h-11 border border-[#dac7a7] bg-white px-6 font-bold text-[#654d2e] hover:bg-[#fff5df]"
                            >
                                Close
                            </Button>
                            <Button
                                type="button"
                                onClick={deleteUser}
                                disabled={statusProcessing}
                                className="h-11 bg-[#a33b2d] px-6 font-bold text-white hover:bg-[#812d22]"
                            >
                                {statusProcessing && <LoaderCircle className="size-4 animate-spin" />}
                                Yes, delete permanently
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={showCreate}>
                    <DialogContent
                        onEscapeKeyDown={(event) => event.preventDefault()}
                        onPointerDownOutside={(event) => event.preventDefault()}
                        className={`max-h-[92vh] max-w-4xl overflow-y-auto border-[#ead5a6] bg-[#fffdf8] p-0 ${explicitCloseDialogClass}`}
                    >
                        <DialogHeader className="border-b border-[#efdfc8] bg-[#fff7e5] px-6 py-5 text-left">
                            <DialogTitle className="flex items-center gap-3 text-xl text-[#342615]">
                                <span className="grid size-10 place-items-center rounded-xl bg-[#ffc83d] text-[#4a351d]">
                                    <UserPlus className="size-5" />
                                </span>
                                {editingUser ? 'Update Bees360 account' : 'Create Bees360 account'}
                            </DialogTitle>
                            <DialogDescription className="text-[#806f59]">
                                {editingUser
                                    ? 'Modify the selected account details, profile image, password, or role.'
                                    : 'Add the profile, login details, and access role for a team member.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submit} className="grid gap-8 p-6 md:grid-cols-[300px_minmax(0,1fr)]">
                            <div className="grid content-start gap-3">
                                <Label>Profile image</Label>
                                <label
                                    onDragEnter={() => setIsDragging(true)}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={dropImage}
                                    className={`group relative mx-auto grid aspect-square w-full max-w-[290px] cursor-pointer place-items-center overflow-hidden rounded-full border-[3px] border-dashed p-5 text-center transition ${isDragging ? 'scale-[1.02] border-[#b96c00] bg-[#fff0c9]' : 'border-[#d8bd8c] bg-[#fffaf1] hover:border-[#b96c00] hover:bg-[#fff4dd]'}`}
                                >
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        onChange={(event) => chooseImage(event.target.files?.[0])}
                                    />
                                    {displayedAvatar ? (
                                        <div className="grid h-full w-full place-items-center gap-3">
                                            <img
                                                src={displayedAvatar}
                                                alt="Profile preview"
                                                onLoad={() => previewUrl && setImageLoading(false)}
                                                className="absolute inset-0 size-full rounded-full object-cover"
                                            />
                                            <span className="absolute bottom-6 rounded-full bg-[#342615]/85 px-4 py-2 text-xs font-bold text-white shadow-lg">
                                                Click or drop to replace
                                            </span>
                                            {imageLoading && (
                                                <span className="absolute inset-0 grid place-items-center rounded-full bg-[#342615]/70 text-white">
                                                    <span className="grid place-items-center gap-2">
                                                        <LoaderCircle className="size-9 animate-spin text-[#ffc83d]" />
                                                        <span className="text-sm font-bold">Uploading image {imageLoadProgress}%</span>
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    ) : imageLoading ? (
                                        <div className="grid place-items-center gap-3 text-[#714b10]">
                                            <LoaderCircle className="size-11 animate-spin text-[#d88a0c]" />
                                            <p className="font-bold">Uploading image {imageLoadProgress}%</p>
                                        </div>
                                    ) : (
                                        <div className="grid place-items-center gap-3">
                                            <span className="grid size-28 place-items-center rounded-full border-4 border-white bg-[#ffc83d] text-4xl font-black tracking-tight text-[#4a351d] shadow-[0_8px_24px_rgba(88,57,18,0.16)]">
                                                {form.data.name.trim() ? initials(form.data.name) : <ImagePlus className="size-10" />}
                                            </span>
                                            <div>
                                                <p className="font-bold text-[#4a3821]">
                                                    {form.data.name.trim() ? `${initials(form.data.name)} default avatar` : 'Drag & drop image'}
                                                </p>
                                                <p className="mt-1 text-xs text-[#806f59]">Image is optional · click to browse</p>
                                            </div>
                                            <span className="text-[11px] text-[#9a8669]">JPG, PNG or WebP · Max 5 MB</span>
                                        </div>
                                    )}
                                </label>
                                <InputError message={form.errors.avatar} />
                                {form.processing && (
                                    <div className="grid gap-2" aria-live="polite">
                                        <div className="flex justify-between text-xs font-bold text-[#806f59]">
                                            <span>Uploading account</span>
                                            <span>{form.progress?.percentage ?? 0}%</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-[#f0e1c8]">
                                            <div
                                                className="h-full rounded-full bg-[#d88a0c] transition-all"
                                                style={{ width: `${form.progress?.percentage ?? 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="user-name">Full name</Label>
                                    <Input
                                        id="user-name"
                                        value={form.data.name}
                                        onChange={(event) => form.setData('name', event.target.value)}
                                        placeholder="Insert fullname"
                                        className="h-11 border-[#decba9] bg-white"
                                    />
                                    <p className="text-xs text-[#8b7454]">
                                        The default avatar updates instantly using the first two words, such as CJ.
                                    </p>
                                    <InputError message={form.errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="user-n-name">N-name</Label>
                                    <Input
                                        id="user-n-name"
                                        value={form.data.n_name}
                                        onChange={(e) => form.setData('n_name', e.target.value)}
                                        placeholder="Nick name"
                                        className="h-11 border-[#decba9] bg-white"
                                    />
                                    <InputError message={form.errors.n_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="user-email">Email address</Label>
                                    <Input
                                        id="user-email"
                                        type="email"
                                        value={form.data.email}
                                        onChange={(e) => form.setData('email', e.target.value)}
                                        placeholder="Email address@gmail.com"
                                        className="h-11 border-[#decba9] bg-white"
                                    />
                                    <InputError message={form.errors.email} />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="user-password">Password</Label>
                                        <Input
                                            id="user-password"
                                            type="password"
                                            value={form.data.password}
                                            onChange={(e) => form.setData('password', e.target.value)}
                                            placeholder="Password"
                                            className="h-11 border-[#decba9] bg-white"
                                        />
                                        <InputError message={form.errors.password} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="user-password-confirmation">Confirm password</Label>
                                        <Input
                                            id="user-password-confirmation"
                                            type="password"
                                            value={form.data.password_confirmation}
                                            onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                            placeholder="Confirm password"
                                            className="h-11 border-[#decba9] bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="user-role">Permission / role</Label>
                                    <Select value={form.data.role} onValueChange={(value) => form.setData('role', value)}>
                                        <SelectTrigger
                                            id="user-role"
                                            className="h-12 rounded-xl border-[#decba9] bg-white text-[#4a3821] focus:ring-[#d78b13]"
                                        >
                                            <ShieldCheck className="mr-2 size-4 text-[#a96300]" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="border-[#e3c78f] bg-[#fffdf8]">
                                            {roles.map((role) => (
                                                <SelectItem key={role.value} value={role.value}>
                                                    {role.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="rounded-lg bg-[#fff5dc] px-3 py-2 text-xs leading-5 text-[#80602b]">
                                        {roleDetails[form.data.role]}
                                    </p>
                                    <InputError message={form.errors.role} />
                                </div>
                                <DialogFooter className="border-t border-[#efdfc8] pt-5">
                                    <Button
                                        type="button"
                                        onClick={closeAccountDialog}
                                        disabled={form.processing}
                                        className="h-12 border border-[#dac7a7] bg-white px-8 text-base font-bold text-[#654d2e] hover:bg-[#fff5df]"
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        className="h-12 bg-[#b96c00] px-8 font-bold text-white hover:bg-[#925400]"
                                    >
                                        <UserPlus className="size-4" />
                                        {form.processing
                                            ? `${editingUser ? 'Updating' : 'Creating'} ${form.progress?.percentage ?? 0}%`
                                            : editingUser
                                              ? 'Update account'
                                              : 'Create account'}
                                    </Button>
                                </DialogFooter>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                        <p className="text-sm font-bold tracking-[0.18em] text-[#b26a00] uppercase">Account administration</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#342615]">Users</h1>
                        <p className="mt-2 text-sm text-[#776a57]">Create accounts and control who can access the Bees360 workspace.</p>
                    </div>
                    <Button onClick={openCreate} className="h-11 gap-2 bg-[#b96c00] px-5 font-bold text-white hover:bg-[#925400]">
                        <UserPlus className="size-4" />
                        Create account
                    </Button>
                </section>

                <section className="grid gap-4 sm:grid-cols-3">
                    {[
                        ['Total accounts', users.length, UsersRound, 'bg-[#fff0c9] text-[#a96300]'],
                        ['Active', activeCount, CheckCircle2, 'bg-[#e4f3df] text-[#347846]'],
                        ['Deactivated', users.length - activeCount, LockKeyhole, 'bg-[#f7e3df] text-[#a04435]'],
                    ].map(([label, value, Icon, tone]) => (
                        <article
                            key={String(label)}
                            className="rounded-2xl border border-[#eadbc6] bg-[#fffdf8] p-5 shadow-[0_8px_30px_rgb(88,57,18,0.05)]"
                        >
                            <div className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                                <Icon className="size-5" />
                            </div>
                            <p className="mt-4 text-sm text-[#806f59]">{label}</p>
                            <p className="mt-1 text-2xl font-extrabold text-[#342615]">{value}</p>
                        </article>
                    ))}
                </section>

                <section className="overflow-hidden rounded-2xl border border-[#eadbc6] bg-[#fffdf8] shadow-[0_8px_30px_rgb(88,57,18,0.08)]">
                    <div className="border-b border-[#eadbc6] bg-[#fff7e5] px-5 py-4">
                        <h2 className="font-bold text-[#342615]">Bees360 accounts</h2>
                        <p className="mt-1 text-sm text-[#806f59]">Deactivated accounts remain in the system but cannot sign in.</p>
                    </div>
                    <div className="divide-y divide-[#f0e5d4]">
                        {users.map((user) => (
                            <article
                                key={user.id}
                                className="grid gap-4 p-5 transition hover:bg-[#fffaf1] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <Avatar className="size-12 border-2 border-[#edcf89]">
                                        <AvatarImage src={user.avatar ?? undefined} alt={user.name} className="object-cover" />
                                        <AvatarFallback className="bg-[#fff0c9] font-bold text-[#8b5b11]">{initials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="truncate font-bold text-[#342615]">{user.name}</p>
                                        <p className="truncate text-sm text-[#806f59]">N-name: {user.n_name ?? '—'}</p>
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-[#4a3821]">{user.email}</p>
                                    <p className="mt-1 text-xs font-bold tracking-wide text-[#9a6a1a] uppercase">
                                        {roles.find((role) => role.value === user.role)?.label ?? user.role}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
                                    <span
                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${user.is_active ? 'bg-[#e4f3df] text-[#347846]' : 'bg-[#f7e3df] text-[#a04435]'}`}
                                    >
                                        <span className={`size-2 rounded-full ${user.is_active ? 'bg-[#3d914f]' : 'bg-[#bd5140]'}`} />
                                        {user.is_active ? 'Active' : 'Deactivated'}
                                    </span>
                                    <Button
                                        type="button"
                                        disabled={user.id === auth.user.id}
                                        onClick={() => setStatusTarget(user)}
                                        className={`min-w-24 border font-bold ${user.is_active ? 'border-[#e0b9b2] bg-white text-[#a04435] hover:bg-[#fff0ec]' : 'border-[#b9d9bd] bg-white text-[#347846] hover:bg-[#edf8eb]'}`}
                                    >
                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => openUpdate(user)}
                                        className="border border-[#dfc58f] bg-white font-bold text-[#8b5b11] hover:bg-[#fff2d2]"
                                    >
                                        <Pencil className="size-4" /> Update
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={user.id === auth.user.id}
                                        onClick={() => setDeleteTarget(user)}
                                        className="border border-[#e0b9b2] bg-white font-bold text-[#a04435] hover:bg-[#fff0ec]"
                                    >
                                        <Trash2 className="size-4" /> Delete
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
