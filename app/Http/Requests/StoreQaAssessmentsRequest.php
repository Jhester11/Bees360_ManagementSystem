<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreQaAssessmentsRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $assessments = $this->input('assessments');

        if (is_string($assessments)) {
            $assessments = json_decode($assessments, true);
        }

        if (is_array($assessments)) {
            $this->merge(['assessments' => array_values($assessments)]);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'source_file' => ['required', 'string', 'max:255'],
            'assessments' => ['required', 'array', 'min:1', 'max:10000'],
            'assessments.*.assessment_date' => ['required', 'date_format:Y-m-d'],
            'assessments.*.processor_name' => ['required', 'string', 'max:255'],
            'assessments.*.score' => ['required', 'numeric', 'between:0,100'],
            'assessments.*.project_id' => ['required', 'string', 'max:50'],
            'assessments.*.qc_name' => ['nullable', 'string', 'max:255'],
            'assessments.*.report_url' => ['nullable', 'string', 'max:2048'],
            'assessments.*.feedback' => ['nullable', 'array', 'max:20'],
            'assessments.*.feedback.*' => ['required', 'string', 'max:1000'],
        ];
    }
}
