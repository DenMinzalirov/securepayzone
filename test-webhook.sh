#!/bin/bash

echo "=== 1. Проверка доступности webhook endpoint (GET) ==="
curl http://localhost:3000/api/webhook

echo -e "\n\n=== 2. Отправка тестового webhook запроса (POST) ==="
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "test-order-123",
    "transaction_id": "test-txn-456",
    "status": "CAPTURED",
    "amount": 100.50,
    "currency": "USD",
    "timestamp": "2024-01-15T10:30:00Z",
    "signature": "test-signature-123"
  }'

echo -e "\n"
