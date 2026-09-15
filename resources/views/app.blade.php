<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Bees360') }}</title>

        <style>
            #bees360-boot-skeleton { position: fixed; inset: 0; z-index: 100; display: flex; background: #fffaf1; font-family: Arial, sans-serif; }
            #bees360-boot-skeleton[hidden] { display: none; }
            .bees360-boot-sidebar { width: 244px; flex: none; background: #342515; padding: 24px 16px; }
            .bees360-boot-logo { width: 148px; height: 36px; border-radius: 12px; background: #ffc83d; margin-bottom: 36px; }
            .bees360-boot-nav { height: 34px; border-radius: 9px; background: #fff4d82a; margin: 12px 0; }
            .bees360-boot-main { flex: 1; min-width: 0; }
            .bees360-boot-header { height: 64px; background: white; border-bottom: 1px solid #eadfcf; }
            .bees360-boot-content { padding: 32px; }
            .bees360-boot-title { width: 220px; height: 30px; border-radius: 9px; background: #ded4c7; margin-bottom: 24px; }
            .bees360-boot-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
            .bees360-boot-card { height: 145px; border: 1px solid #eadfcf; border-radius: 16px; background: white; }
            .bees360-boot-table { height: 250px; margin-top: 24px; border: 1px solid #eadfcf; border-radius: 16px; background: white; }
            @keyframes bees360-boot-pulse { 50% { opacity: .55; } }
            #bees360-boot-skeleton > * { animation: bees360-boot-pulse 1.5s ease-in-out infinite; }
            @media (max-width: 768px) { .bees360-boot-sidebar { display: none; } .bees360-boot-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } .bees360-boot-content { padding: 20px; } }
        </style>

        <link rel="icon" type="image/svg+xml" sizes="any" href="{{ asset('favicon.svg') }}?v=bees360-20260914">
        <link rel="shortcut icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}?v=bees360-20260914">
        <link rel="apple-touch-icon" href="{{ asset('favicon.svg') }}?v=bees360-20260914">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite('resources/js/app.tsx')
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        <div id="bees360-boot-skeleton" role="status" aria-label="Loading Bees360 page">
            <aside class="bees360-boot-sidebar" aria-hidden="true"><div class="bees360-boot-logo"></div><div class="bees360-boot-nav"></div><div class="bees360-boot-nav"></div><div class="bees360-boot-nav"></div><div class="bees360-boot-nav"></div></aside>
            <div class="bees360-boot-main" aria-hidden="true"><div class="bees360-boot-header"></div><div class="bees360-boot-content"><div class="bees360-boot-title"></div><div class="bees360-boot-cards"><div class="bees360-boot-card"></div><div class="bees360-boot-card"></div><div class="bees360-boot-card"></div><div class="bees360-boot-card"></div></div><div class="bees360-boot-table"></div></div></div>
        </div>
        @inertia
    </body>
</html>
