import { Status, TrainingPage } from '@/components/training/training-ui';
export default function AssignmentShow({ assignment }: { assignment: any }) {
    return (
        <TrainingPage title={assignment.name}>
            <div className="mb-5 rounded-2xl bg-[#4b2b0d] p-5 text-white">
                <b>{assignment.material.title}</b>
                <p className="mt-1 text-sm text-[#ead8bb]">
                    Assigned by {assignment.assigner.name} · {assignment.users.length} users
                </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#ead8bb] bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#f4ead9]">
                        <tr>
                            {['User', 'Role / Batch', 'Reading Progress', 'Assessment', 'Score', 'Status'].map((x) => (
                                <th className="p-4" key={x}>
                                    {x}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {assignment.users.map((u: any) => {
                            const last = u.attempts[0];
                            return (
                                <tr className="border-t border-[#eee2cf]" key={u.id}>
                                    <td className="p-4 font-bold">{u.user.name}</td>
                                    <td className="p-4 capitalize">
                                        {u.user.role}
                                        {u.user.batch ? ` / Batch ${u.user.batch}` : ''}
                                    </td>
                                    <td className="p-4">{u.progress?.progress_percentage || 0}%</td>
                                    <td className="p-4">{last ? 'Completed' : 'Not taken'}</td>
                                    <td className="p-4">{last ? `${last.percentage}%` : '—'}</td>
                                    <td className="p-4">
                                        <Status value={u.status} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </TrainingPage>
    );
}
