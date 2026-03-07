<?php

// backend/save_assessment.php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'Method not allowed',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Читаем JSON из тела запроса
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'Invalid JSON body',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$fullName  = trim($data['patientName'] ?? '');
$total     = (int)($data['total'] ?? 0);
$sensory   = (int)($data['sensory'] ?? 0);
$affective = (int)($data['affective'] ?? 0);
$vas       = (int)($data['vas'] ?? 0);
$ppi       = (int)($data['ppi'] ?? 0);
$scores    = $data['scores'] ?? null;

try {
    $pdo = get_pdo_connection();
    $pdo->beginTransaction();

    $patientId = null;
    if ($fullName !== '') {
        $stmt = $pdo->prepare("
            INSERT INTO patients (full_name)
            VALUES (:full_name)
        ");
        $stmt->execute([':full_name' => $fullName]);
        $patientId = (int)$pdo->lastInsertId();
    }

    $stmt = $pdo->prepare("
        INSERT INTO assessments (
            patient_id,
            total_score,
            sensory_score,
            affective_score,
            vas_score,
            ppi_score,
            pain_descriptors
        ) VALUES (
            :patient_id,
            :total_score,
            :sensory_score,
            :affective_score,
            :vas_score,
            :ppi_score,
            :pain_descriptors
        )
    ");

    $stmt->execute([
        ':patient_id'       => $patientId ?: null,
        ':total_score'      => $total,
        ':sensory_score'    => $sensory,
        ':affective_score'  => $affective,
        ':vas_score'        => $vas,
        ':ppi_score'        => $ppi,
        ':pain_descriptors' => json_encode($scores, JSON_UNESCAPED_UNICODE),
    ]);

    $assessmentId = (int)$pdo->lastInsertId();

    $pdo->commit();

    echo json_encode([
        'success'       => true,
        'message'       => 'ok',
        'patient_id'    => $patientId,
        'assessment_id' => $assessmentId,
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Save error: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}

