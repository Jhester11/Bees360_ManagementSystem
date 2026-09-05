<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Http\Requests\Concerns\ValidatesSpreadsheetInput;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreQaAssessmentsRequest extends FormRequest
{
    use ValidatesSpreadsheetInput;

    private const MAXIMUM_PAYLOAD_BYTES = 20 * 1024 * 1024;

    protected function prepareForValidation(): void
    {
        $this->guardSpreadsheetPayloadSize(self::MAXIMUM_PAYLOAD_BYTES);
        $assessments = $this->decodeSpreadsheetArray($this->input('assessments'));

        if (is_array($assessments)) {
            $this->merge(['assessments' => array_values($assessments)]);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return in_array($this->user()?->role, [UserRole::Operations, UserRole::Qa], true);
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
            'assessments' => ['required', 'array', 'min:1', 'max:10000'],
            'assessments.*' => ['required', 'array:assessment_date,processor_name,score,project_id,qc_name,report_url,feedback'],
            'assessments.*.assessment_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'assessments.*.processor_name' => ['bail', 'required', 'string', 'max:255', $this->safeSpreadsheetText()],
            'assessments.*.score' => ['required', 'numeric', 'between:0,100'],
            'assessments.*.project_id' => ['bail', 'required', 'string', 'max:50', $this->safeSpreadsheetText()],
            'assessments.*.qc_name' => ['bail', 'nullable', 'string', 'max:255', $this->safeSpreadsheetText()],
            'assessments.*.report_url' => ['bail', 'nullable', 'string', 'max:2048', 'url:http,https'],
            'assessments.*.feedback' => ['nullable', 'array', 'max:20'],
            'assessments.*.feedback.*' => ['bail', 'required', 'string', 'max:1000', $this->safeSpreadsheetText()],
        ];
    }
}
