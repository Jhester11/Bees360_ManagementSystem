<?php

namespace App\Http\Requests\Training;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class StoreTrainingAssignmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return in_array($this->user()?->role, [UserRole::Trainer, UserRole::Operations], true);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'training_material_id' => ['required', 'exists:training_materials,id'],
            'name' => ['required', 'string', 'max:255'],
            'scope_type' => ['required', 'in:users,role,batch,all'],
            'scope_value' => ['nullable', 'string', 'max:100'],
            'user_ids' => ['nullable', 'array'],
            'user_ids.*' => ['integer', 'distinct', 'exists:users,id'],
            'due_at' => ['nullable', 'date', 'after:now'],
        ];
    }
}
