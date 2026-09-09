<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ActiveProcessorRoster
{
    private const LEGACY_ALIASES = [
        'arianne lopez' => 'Arianne Joy Lopez',
        'chris gozon' => 'Christer John C. Gozon',
        'christer gozon' => 'Christer John C. Gozon',
        'christer john gozon' => 'Christer John C. Gozon',
        'denn zafe' => 'Denn Charles Zafe',
        'desh completado' => 'Lourdes M. Completado',
        'don santos' => 'Elacio M. Santos Jr.',
        'jhun lester cervantes' => 'Jhun Cervantes',
        'king palo' => 'Reginald King Palo',
        'kristine espiritu' => 'Kristine Jewel Espiritu',
        'mac payongayong' => 'Mac Evens T. Payongayong',
        'marie moog' => 'Marie Anthonette Moog',
        'nikko dungca' => 'Nikko Adrian Dungca',
        'oliver noble' => 'Mc Oliver Noble',
        'rainier ana' => 'Rainier Sta Ana',
        'rheven aladin' => 'Rheven Violet Aladin',
        'tracy josafat' => 'Tracy John Josafat',
        'wengmir africa' => 'Wengmir A. Africa',
    ];

    /** @var Collection<int, User>|null */
    private ?Collection $processors = null;

    /** @return Collection<int, User> */
    public function all(): Collection
    {
        return $this->processors ??= User::query()
            ->where(function ($query): void {
                $query->where('role', UserRole::Processor->value)
                    ->orWhere('tracks_production', true);
            })
            ->where('is_active', true)
            ->whereBetween('batch', [1, 3])
            ->orderBy('batch')
            ->orderBy('name')
            ->get(['id', 'name', 'n_name', 'batch']);
    }

    /** @param Collection<int, User>|null $processors */
    public function match(string $name, ?Collection $processors = null): ?User
    {
        $needle = $this->normalize($name);
        if ($needle === '') {
            return null;
        }

        $processorList = $processors ?? $this->all();
        $legacyName = self::LEGACY_ALIASES[$needle] ?? null;

        if ($legacyName !== null) {
            $legacyMatch = $this->match($legacyName, $processorList);
            if ($legacyMatch !== null) {
                return $legacyMatch;
            }
        }

        $needleWords = collect(explode(' ', $needle))->filter(fn (string $word): bool => mb_strlen($word) > 1);
        $needleIdentity = $this->canonicalIdentity($name);

        return $processorList->first(function (User $processor) use ($needle, $needleIdentity, $needleWords): bool {
            $fullName = $this->normalize($processor->name);
            $nickname = $this->normalize($processor->n_name ?? '');
            $identityWords = collect(explode(' ', trim($fullName.' '.$nickname)))
                ->filter(fn (string $word): bool => mb_strlen($word) > 1)
                ->unique();

            return $needle === $fullName
                || ($nickname !== '' && $needle === $nickname)
                || $needleIdentity === $this->canonicalIdentity($processor->name)
                || ($needleWords->count() >= 2 && $needleWords->every(fn (string $word): bool => $identityWords->contains($word)));
        });
    }

    /** @param Collection<int, User>|null $processors */
    public function canonicalName(string $name, ?Collection $processors = null): ?string
    {
        return $this->match($name, $processors)?->name;
    }

    /** @param Collection<int, User>|null $processors */
    public function forFrontend(?Collection $processors = null): Collection
    {
        return ($processors ?? $this->all())->map(fn (User $processor): array => [
            'name' => $processor->name,
            'nickname' => $processor->n_name ?: Str::before($processor->name, ' '),
            'batch' => (int) $processor->batch,
            'aliases' => array_values(array_filter([$processor->n_name])),
        ])->values();
    }

    private function normalize(string $value): string
    {
        return Str::of($value)->lower()->replaceMatches('/[^a-z0-9]+/', ' ')->squish()->value();
    }

    private function canonicalIdentity(string $value): string
    {
        $normalized = collect(explode(' ', $this->normalize($value)))
            ->filter(fn (string $word): bool => mb_strlen($word) > 1)
            ->implode(' ');

        return $this->normalize(self::LEGACY_ALIASES[$normalized] ?? $normalized);
    }
}
