<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePlatformPullRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'report_date' => ['required', 'date_format:Y-m-d'],
            'checkpoint' => ['required', Rule::in(['10am', '12nn', '2pm', '4pm', '5pm'])],
            'active_file_name' => ['nullable', 'required_without:closed_file_name', 'string', 'max:255'],
            'closed_file_name' => ['nullable', 'required_without:active_file_name', 'string', 'max:255'],
            'entries' => ['required', 'array', 'min:1', 'max:20000'],
            'entries.*.source' => ['required', Rule::in(['active', 'closed'])],
            'entries.*.project_id' => ['required', 'string', 'max:50'],
            'entries.*.inspection_type' => ['required', 'string', 'max:255'],
            'entries.*.assembled_by' => ['required', 'string', 'max:255'],
        ];
    }
}
