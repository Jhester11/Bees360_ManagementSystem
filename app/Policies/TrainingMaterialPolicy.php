<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\TrainingMaterial;
use App\Models\User;

class TrainingMaterialPolicy
{
    /**
     * Create a new policy instance.
     */
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }

    public function view(User $user, TrainingMaterial $material): bool
    {
        if (in_array($user->role, [UserRole::Trainer, UserRole::Reviewer, UserRole::Operations, UserRole::Qa], true)) {
            return true;
        }

        return $material->status === 'published'
            && $material->audiences()->whereIn('audience', ['processor', 'all'])->exists();
    }

    public function create(User $user): bool
    {
        return $this->canManage($user);
    }

    public function update(User $user, TrainingMaterial $material): bool
    {
        return $this->canManage($user);
    }

    public function delete(User $user, TrainingMaterial $material): bool
    {
        return $this->canManage($user)
            && $material->status === 'draft'
            && ! $material->assignments()->exists();
    }

    public function manage(User $user): bool
    {
        return $this->canManage($user);
    }

    public function viewReports(User $user): bool
    {
        return in_array($user->role, [UserRole::Trainer, UserRole::Operations], true);
    }

    private function canManage(User $user): bool
    {
        return in_array($user->role, [UserRole::Trainer, UserRole::Operations], true);
    }
}
