import { Empty, Material, Status, TrainingPage, button } from '@/components/training/training-ui';
import { Link } from '@inertiajs/react';
export default function Materials({ materials }: { materials: { data: Material[] } }) {
    return (
        <TrainingPage
            title="Training Materials"
            actions={
                <Link className={button} href="/training/materials/create">
                    Create material
                </Link>
            }
        >
            {materials.data.length ? (
                <div className="overflow-x-auto rounded-2xl border border-[#ead8bb] bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#41280f] text-white">
                            <tr>
                                {['Title', 'Client / Topic', 'Audience', 'Version', 'Status', ''].map((x) => (
                                    <th className="p-4" key={x}>
                                        {x}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {materials.data.map((m) => (
                                <tr className="border-b border-[#eee2cf]" key={m.id}>
                                    <td className="p-4 font-bold">{m.title}</td>
                                    <td className="p-4">
                                        {m.subject?.name}
                                        <br />
                                        <span className="text-xs text-[#7b6c59]">{m.topic?.name}</span>
                                    </td>
                                    <td className="p-4">{m.audiences?.map((a) => a.audience).join(', ')}</td>
                                    <td className="p-4">v{m.version}</td>
                                    <td className="p-4">
                                        <Status value={m.status} />
                                    </td>
                                    <td className="p-4">
                                        <Link className="font-bold text-[#a35e00]" href={`/training/materials/${m.id}/edit`}>
                                            Edit
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <Empty text="Create your first training material to begin." />
            )}
        </TrainingPage>
    );
}
