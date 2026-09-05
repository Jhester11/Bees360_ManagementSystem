<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Http\Requests\Concerns\ValidatesSpreadsheetInput;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreCstProcessorMetricsRequest extends FormRequest
{
    use ValidatesSpreadsheetInput;

    private const MAXIMUM_PAYLOAD_BYTES = 8 * 1024 * 1024;

    protected function prepareForValidation(): void
    {
        $this->guardSpreadsheetPayloadSize(self::MAXIMUM_PAYLOAD_BYTES);
        $metrics = $this->decodeSpreadsheetArray($this->input('metrics'));

        if (is_array($metrics)) {
            $this->merge(['metrics' => array_values($metrics)]);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Operations;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'source_file' => ['bail', 'required', 'string', 'max:255', $this->safeSpreadsheetFileName(['xlsx', 'xls', 'csv'])],
            'metrics' => ['required', 'array', 'min:1', 'max:5000'],
            'metrics.*' => ['required', 'array:report_date,processor_name,general_exterior,four_point,qc_score,qc_reviews'],
            'metrics.*.report_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'metrics.*.processor_name' => ['bail', 'required', 'string', 'max:255', $this->safeSpreadsheetText()],
            'metrics.*.general_exterior' => ['required', 'integer', 'min:0', 'max:100000'],
            'metrics.*.four_point' => ['required', 'integer', 'min:0', 'max:100000'],
            'metrics.*.qc_score' => ['nullable', 'numeric', 'between:0,100'],
            'metrics.*.qc_reviews' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
