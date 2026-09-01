<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReportImportRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $entries = $this->input('entries');

        if (is_string($entries)) {
            $entries = json_decode($entries, true);
        }

        if (! is_array($entries)) {
            return;
        }

        $this->merge([
            'entries' => collect($entries)
                ->filter(fn (mixed $entry) => is_array($entry)
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
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'entries' => ['required', 'array', 'min:1', 'max:10000'],
            'entries.*.source' => ['required', 'in:active,closed'],
            'entries.*.project_id' => ['required', 'string', 'max:50'],
            'entries.*.insured_by' => ['nullable', 'string', 'max:255'],
            'entries.*.inspection_type' => ['required', 'string', 'max:255'],
            'entries.*.assembled_by' => ['required', 'string', 'max:255'],
            'entries.*.assembled_at' => ['required', 'string', 'max:100'],
        ];
    }
}
