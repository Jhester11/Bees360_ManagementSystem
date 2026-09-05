<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOperationsRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$allowedRoles): Response
    {
        $allowedRoles = $allowedRoles ?: [UserRole::Operations->value];

        abort_unless(
            in_array($request->user()?->role?->value, $allowedRoles, true),
            403,
        );

        return $next($request);
    }
}
