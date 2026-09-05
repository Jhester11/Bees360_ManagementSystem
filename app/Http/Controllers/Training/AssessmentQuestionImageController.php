<?php

namespace App\Http\Controllers\Training;

use App\Http\Controllers\Controller;
use App\Models\AssessmentQuestion;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AssessmentQuestionImageController extends Controller
{
    public function __invoke(AssessmentQuestion $question): StreamedResponse
    {
        $this->authorize('view', $question->assessment->material);
        abort_unless($question->image_path && Storage::disk('local')->exists($question->image_path), 404);

        return Storage::disk('local')->response($question->image_path, null, [
            'Cache-Control' => 'private, max-age=3600',
            'Content-Type' => Storage::disk('local')->mimeType($question->image_path),
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
