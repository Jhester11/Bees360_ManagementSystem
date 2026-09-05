<?php

namespace App\Http\Requests\Concerns;

use Closure;
use JsonException;
use Symfony\Component\HttpFoundation\Response;

trait ValidatesSpreadsheetInput
{
    protected function guardSpreadsheetPayloadSize(int $maximumBytes): void
    {
        $contentLength = (int) $this->server('CONTENT_LENGTH', 0);

        abort_if(
            $contentLength > $maximumBytes,
            Response::HTTP_REQUEST_ENTITY_TOO_LARGE,
            'The spreadsheet import payload is too large.',
        );
    }

    protected function decodeSpreadsheetArray(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        try {
            return json_decode($value, true, 8, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return $value;
        }
    }

    protected function safeSpreadsheetText(): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value)) {
                return;
            }

            if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $value) === 1) {
                $fail('The :attribute field contains unsupported control characters.');

                return;
            }

            if (preg_match('/\A[\s\p{Z}]*[=+\-@]/u', $value) === 1) {
                $fail('The :attribute field cannot begin with a spreadsheet formula operator.');
            }
        };
    }

    /**
     * @param  list<string>  $extensions
     */
    protected function safeSpreadsheetFileName(array $extensions): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail) use ($extensions): void {
            if (! is_string($value)) {
                return;
            }

            if (preg_match('/[\/\\\\\x00-\x1F\x7F]/', $value) === 1 || preg_match('/\A[\s\p{Z}]*[=+\-@]/u', $value) === 1) {
                $fail('The :attribute field must be a safe spreadsheet file name without a path.');

                return;
            }

            $extensionPattern = implode('|', array_map(static fn (string $extension): string => preg_quote($extension, '/'), $extensions));

            if (preg_match('/\.('.$extensionPattern.')\z/i', trim($value)) !== 1) {
                $fail('The :attribute field must name an approved spreadsheet type.');
            }
        };
    }
}
