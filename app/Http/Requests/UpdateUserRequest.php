<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Http\Requests\Concerns\ValidatesSpreadsheetInput;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    use ValidatesSpreadsheetInput;

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
            'name' => [
                'required',
                'string',
                'max:255',
                $this->safeSpreadsheetText(),
                Rule::unique(User::class, 'name')->ignore($this->route('user')),
                Rule::unique(User::class, 'n_name')->ignore($this->route('user')),
            ],
            'n_name' => [
                'required',
                'string',
                'max:80',
                $this->safeSpreadsheetText(),
                Rule::unique(User::class, 'n_name')->ignore($this->route('user')),
                Rule::unique(User::class, 'name')->ignore($this->route('user')),
            ],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->route('user')),
            ],
            'password' => ['nullable', 'confirmed', Password::defaults()],
            'role' => ['required', Rule::enum(UserRole::class)],
            'batch' => [
                Rule::requiredIf(fn (): bool => $this->input('role') === UserRole::Processor->value),
                'nullable',
                'integer',
                'between:1,3',
            ],
            'avatar' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'extensions:jpg,jpeg,png,webp',
                'max:5120',
                'dimensions:min_width=1,min_height=1,max_width=4096,max_height=4096',
            ],
        ];
    }
}
