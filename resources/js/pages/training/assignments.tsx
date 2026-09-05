import { Empty, TrainingPage, button, field } from '@/components/training/training-ui';
import { Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
export default function Assignments({ assignments, materials, users }: { assignments: any; materials: any[]; users: any[] }) {
    const f = useForm({
        training_material_id: materials[0]?.id || 0,
        name: '',
        scope_type: 'users',
        scope_value: '',
        user_ids: [] as number[],
        due_at: '',
    });
    function submit(e: FormEvent) {
        e.preventDefault();
        f.post('/training/assignments', { onSuccess: () => f.reset('name', 'user_ids') });
    }
    return (
        <TrainingPage title="Training Assignments">
            <form onSubmit={submit} className="mb-6 grid gap-4 rounded-2xl border border-[#ead8bb] bg-white p-5 md:grid-cols-2">
                <label>
                    <b className="text-sm">Training material</b>
                    <select
                        className={field}
                        value={f.data.training_material_id}
                        onChange={(e) => f.setData('training_material_id', Number(e.target.value))}
                    >
                        {materials.map((m) => (
                            <option value={m.id} key={m.id}>
                                {m.title}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <b className="text-sm">Assignment name</b>
                    <input className={field} value={f.data.name} onChange={(e) => f.setData('name', e.target.value)} />
                </label>
                <label>
                    <b className="text-sm">Assign to</b>
                    <select className={field} value={f.data.scope_type} onChange={(e) => f.setData('scope_type', e.target.value)}>
                        <option value="users">Individual / multiple users</option>
                        <option value="role">User role</option>
                        <option value="batch">Processor batch</option>
                        <option value="all">All users</option>
                    </select>
                </label>
                {f.data.scope_type === 'users' ? (
                    <label>
                        <b className="text-sm">Users</b>
                        <select
                            multiple
                            className={`${field} h-32`}
                            onChange={(e) =>
                                f.setData(
                                    'user_ids',
                                    Array.from(e.target.selectedOptions).map((x) => Number(x.value)),
                                )
                            }
                        >
                            {users.map((u) => (
                                <option value={u.id} key={u.id}>
                                    {u.name} · {u.role}
                                    {u.batch ? ` · Batch ${u.batch}` : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : f.data.scope_type !== 'all' ? (
                    <label>
                        <b className="text-sm">{f.data.scope_type === 'role' ? 'Role' : 'Batch number'}</b>
                        {f.data.scope_type === 'role' ? (
                            <select className={field} value={f.data.scope_value} onChange={(e) => f.setData('scope_value', e.target.value)}>
                                <option value="">Select role</option>
                                {['processor', 'reviewer', 'operations', 'trainer', 'qa'].map((x) => (
                                    <option key={x}>{x}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                className={field}
                                type="number"
                                min="1"
                                value={f.data.scope_value}
                                onChange={(e) => f.setData('scope_value', e.target.value)}
                            />
                        )}
                    </label>
                ) : (
                    <div />
                )}
                <label>
                    <b className="text-sm">Due date</b>
                    <input type="datetime-local" className={field} value={f.data.due_at} onChange={(e) => f.setData('due_at', e.target.value)} />
                </label>
                <div className="flex items-end">
                    <button className={button} disabled={f.processing}>
                        Assign training
                    </button>
                </div>
            </form>
            {assignments.data.length ? (
                <div className="overflow-hidden rounded-2xl border border-[#ead8bb] bg-white">
                    {assignments.data.map((a: any) => (
                        <Link href={`/training/assignments/${a.id}`} className="flex justify-between border-b p-4 hover:bg-[#fff8eb]" key={a.id}>
                            <span>
                                <b>{a.name}</b>
                                <small className="block text-[#776750]">
                                    {a.material.title} · Due {a.due_at ? new Date(a.due_at).toLocaleDateString() : 'anytime'}
                                </small>
                            </span>
                            <b>{a.users_count} users →</b>
                        </Link>
                    ))}
                </div>
            ) : (
                <Empty text="No training assignments yet." />
            )}
        </TrainingPage>
    );
}
