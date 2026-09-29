<?php

namespace App\Support;

use Closure;

final class UniqueRecords
{
    /** Keep the first record for each string key without scanning earlier records. */
    public static function byKey(callable $key): Closure
    {
        $seen = [];

        return static function (mixed $record) use ($key, &$seen): bool {
            $identity = $key($record);
            if (isset($seen[$identity])) {
                return false;
            }

            $seen[$identity] = true;

            return true;
        };
    }
}
