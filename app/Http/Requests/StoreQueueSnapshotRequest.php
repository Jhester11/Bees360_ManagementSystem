<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQueueSnapshotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'report_date' => ['required', 'date_format:Y-m-d'],
            'checkpoint' => ['required', Rule::in(['start', '11am', '2pm', '4pm'])],
            'file_name' => ['required', 'string', 'max:255'],
            'total_rows' => ['required', 'integer', 'min:0', 'max:100000'],
            'entries' => ['required', 'array', 'max:100'],
            'entries.*.name' => ['required', 'string', 'max:255'],
            'entries.*.batch' => ['required', 'integer', 'between:1,3'],
            'entries.*.general_exterior' => ['required', 'integer', 'min:0', 'max:100000'],
            'entries.*.four_point' => ['required', 'integer', 'min:0', 'max:100000'],
            'entries.*.other' => ['required', 'integer', 'min:0', 'max:100000'],
            'entries.*.total' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
