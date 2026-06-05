<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => 'laravel-service',
        'language' => 'PHP',
        'framework' => 'Laravel',
        'message' => 'Laravel Service berjalan di dalam Docker'
    ]);
});

Route::get('/health', function () {
    return response()->json([
        'service' => 'laravel-service',
        'language' => 'PHP',
        'framework' => 'Laravel',
        'database' => 'sqlite',
        'status' => 'running'
    ]);
});

Route::get('/report', function () {
    return response()->json([
        'service' => 'laravel-service',
        'message' => 'Laravel Service digunakan untuk simulasi laporan transaksi',
        'data' => [
            'total_report' => 2,
            'report_type' => 'order summary',
            'generated_by' => 'Laravel Service'
        ]
    ]);
});
