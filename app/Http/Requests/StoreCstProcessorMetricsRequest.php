<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCstProcessorMetricsRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $metrics = $this->input('metrics');

        if (is_string($metrics)) {
            $metrics = json_decode($metrics, true);
        }

        if (is_array($metrics)) {
            $this->merge(['metrics' => array_values($metrics)]);
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
            'metrics' => ['required', 'array', 'min:1', 'max:5000'],
            'metrics.*.report_date' => ['required', 'date_format:Y-m-d'],
            'metrics.*.processor_name' => ['required', 'string', 'max:255'],
            'metrics.*.general_exterior' => ['required', 'integer', 'min:0', 'max:100000'],
            'metrics.*.four_point' => ['required', 'integer', 'min:0', 'max:100000'],
            'metrics.*.qc_score' => ['nullable', 'numeric', 'between:0,100'],
            'metrics.*.qc_reviews' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
