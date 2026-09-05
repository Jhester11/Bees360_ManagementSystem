<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Http\Requests\Concerns\ValidatesSpreadsheetInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreReportImportRequest extends FormRequest
{
    use ValidatesSpreadsheetInput;

    private const MAXIMUM_PAYLOAD_BYTES = 16 * 1024 * 1024;

    protected function prepareForValidation(): void
    {
        $this->guardSpreadsheetPayloadSize(self::MAXIMUM_PAYLOAD_BYTES);
        $entries = $this->decodeSpreadsheetArray($this->input('entries'));

        if (! is_array($entries)) {
            return;
        }

        $this->merge([
            'entries' => collect($entries)
                ->filter(fn (mixed $entry): bool => is_array($entry)
                    && filled($entry['source'] ?? null)
                    && filled($entry['project_id'] ?? null)
                    && filled($entry['inspection_type'] ?? null)
                    && filled($entry['assembled_by'] ?? null)
                    && filled($entry['assembled_at'] ?? null))
                ->values()
                ->all(),
        ]);
    }

    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Operations;
    }

    public function rules(): array
    {
        return [
            'entries' => ['required', 'array', 'min:1', 'max:10000'],
            'entries.*' => ['required', 'array:source,project_id,insured_by,inspection_type,assembled_by,assembled_at'],
            'entries.*.source' => ['required', 'in:active,closed'],
            'entries.*.project_id' => ['bail', 'required', 'string', 'max:50', $this->safeSpreadsheetText()],
            'entries.*.insured_by' => ['bail', 'nullable', 'string', 'max:255', $this->safeSpreadsheetText()],
            'entries.*.inspection_type' => ['bail', 'required', 'string', 'max:255', $this->safeSpreadsheetText()],
            'entries.*.assembled_by' => ['bail', 'required', 'string', 'max:255', $this->safeSpreadsheetText()],
            'entries.*.assembled_at' => ['bail', 'required', 'string', 'max:100', $this->safeSpreadsheetText()],
        ];
    }
}
