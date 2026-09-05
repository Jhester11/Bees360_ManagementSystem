<?php

namespace App\Http\Requests\Training;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAssessmentRequest extends FormRequest
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
            'description' => ['nullable', 'string', 'max:3000'],
            'passing_score' => ['required', 'numeric', 'min:0', 'max:100'],
            'time_limit_minutes' => ['nullable', 'integer', 'min:1', 'max:480'],
            'maximum_attempts' => ['required', 'integer', 'min:1', 'max:20'],
            'randomize_questions' => ['boolean'], 'randomize_choices' => ['boolean'],
            'show_score' => ['boolean'], 'show_correct_answers' => ['boolean'],
            'require_training_completion' => ['boolean'], 'is_published' => ['boolean'],
            'due_at' => ['nullable', 'date'],
            'questions' => ['required', 'array', 'min:1', 'max:200'],
            'questions.*.id' => ['nullable', 'integer', 'exists:assessment_questions,id'],
            'questions.*.question' => ['required', 'string', 'max:5000'],
            'questions.*.image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'questions.*.remove_image' => ['nullable', 'boolean'],
            'questions.*.explanation' => ['nullable', 'string', 'max:5000'],
            'questions.*.points' => ['required', 'integer', 'min:1', 'max:100'],
            'questions.*.choices' => ['required', 'array', 'min:2', 'max:8'],
            'questions.*.choices.*.choice' => ['required', 'string', 'max:2000'],
            'questions.*.choices.*.is_correct' => ['required', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach ($this->input('questions', []) as $index => $question) {
                if (collect($question['choices'] ?? [])->where('is_correct', true)->count() !== 1) {
                    $validator->errors()->add("questions.$index.choices", 'Each question must have exactly one correct answer.');
                }
            }
        }];
    }
}
