<?php

namespace App\Http\Requests\Training;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;

class StoreTrainingMaterialRequest extends FormRequest
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
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'subject' => ['required', 'string', 'max:120'],
            'topic' => ['required', 'string', 'max:120'],
            'category' => ['required', 'string', 'max:120'],
            'audiences' => ['required', 'array', 'min:1'],
            'audiences.*' => ['distinct', 'in:processor,reviewer,operations,all'],
            'difficulty' => ['required', 'in:beginner,intermediate,advanced'],
            'version' => ['required', 'regex:/^\d+(\.\d+){0,2}$/', 'max:30'],
            'published_at' => ['nullable', 'date'],
            'estimated_reading_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'cover' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'pdf' => [$this->isMethod('post') ? 'required' : 'nullable', 'file', 'mimes:pdf', 'max:51200'],
            'status' => ['required', 'in:draft,published,archived'],
            'assessment_required' => ['boolean'],
            'require_retraining' => ['boolean'],
        ];
    }
}
