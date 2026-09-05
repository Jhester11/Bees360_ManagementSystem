<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Http\Requests\Concerns\ValidatesSpreadsheetInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQueueSnapshotRequest extends FormRequest
{
    use ValidatesSpreadsheetInput;

    private const MAXIMUM_PAYLOAD_BYTES = 1024 * 1024;

    protected function prepareForValidation(): void
    {
        $this->guardSpreadsheetPayloadSize(self::MAXIMUM_PAYLOAD_BYTES);
    }

    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Operations;
    }

    public function rules(): array
    {
        return [
            'report_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'checkpoint' => ['required', Rule::in(['start', '11am', '2pm', '4pm'])],
            'file_name' => ['bail', 'required', 'string', 'max:255', $this->safeSpreadsheetFileName(['xlsx', 'xls'])],
            'total_rows' => ['required', 'integer', 'min:0', 'max:100000'],
            'entries' => ['required', 'array', 'max:100'],
            'entries.*' => ['required', 'array:name,batch,general_exterior,four_point,other,total'],
            'entries.*.name' => ['bail', 'required', 'string', 'max:255', $this->safeSpreadsheetText()],
            'entries.*.batch' => ['required', 'integer', 'between:1,3'],
            'entries.*.general_exterior' => ['required', 'integer', 'min:0', 'max:100000'],
            'entries.*.four_point' => ['required', 'integer', 'min:0', 'max:100000'],
            'entries.*.other' => ['required', 'integer', 'min:0', 'max:100000'],
            'entries.*.total' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
