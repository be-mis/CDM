# Cash Advance API Documentation

## Overview
This API handles all operations related to Cash Advances in the Cash Disbursement Module.

## Base URL
```
/api/cash-advances
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Create Cash Advance
Create a new cash advance (draft or submit for approval)

**Endpoint:** `POST /api/cash-advances`

**Request Body:**
```json
{
  "advanceNumber": "CA-202601-0001",
  "advanceDate": "2026-01-05",
  "requestedBy": "John Doe",
  "department": "Finance",
  "employeeId": "EMP001",
  "advanceType": "cash",
  "purpose": "Office supplies and equipment",
  "projectName": "Q1 Office Renovation",
  "destination": "Manila",
  "startDate": "2026-01-10",
  "endDate": "2026-01-15",
  "paymentMethod": "check",
  "checkNumber": "CHK-2026-001",
  "accountNumber": null,
  "liquidationDeadline": "2026-01-20",
  "status": "draft",
  "requestedAmount": 50000.00,
  "items": [
    {
      "description": "Office chairs",
      "category": "Furniture",
      "estimatedAmount": 30000.00
    },
    {
      "description": "Desk supplies",
      "category": "Supplies",
      "estimatedAmount": 20000.00
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Draft saved successfully",
  "data": {
    "id": 1,
    "advanceNumber": "CA-202601-0001",
    "status": "draft"
  }
}
```

**Status Codes:**
- `201`: Created successfully
- `400`: Bad request (missing required fields or validation errors)
- `401`: Unauthorized
- `500`: Server error

---

### 2. Update Cash Advance
Update an existing cash advance (only drafts or rejected can be updated)

**Endpoint:** `PUT /api/cash-advances/:id`

**Request Body:** Same as Create Cash Advance

**Response:**
```json
{
  "success": true,
  "message": "Draft updated successfully",
  "data": {
    "id": 1
  }
}
```

**Status Codes:**
- `200`: Updated successfully
- `400`: Bad request (cannot update in current status)
- `404`: Cash advance not found
- `401`: Unauthorized
- `500`: Server error

---

### 3. Get All Cash Advances
Retrieve all cash advances for the current user

**Endpoint:** `GET /api/cash-advances`

**Query Parameters:**
- `status` (optional): Filter by status (draft, pending, approved, rejected, disbursed, liquidated, cancelled)

**Example:** `GET /api/cash-advances?status=draft`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "advance_number": "CA-202601-0001",
      "advance_date": "2026-01-05",
      "requested_by": "John Doe",
      "department": "Finance",
      "purpose": "Office supplies and equipment",
      "requested_amount": 50000.00,
      "approved_amount": null,
      "status": "draft",
      "payment_method": "check",
      "created_at": "2026-01-05T10:30:00.000Z",
      "updated_at": "2026-01-05T10:30:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### 4. Get Cash Advance by ID
Retrieve a single cash advance with all details including items and attachments

**Endpoint:** `GET /api/cash-advances/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "advance_number": "CA-202601-0001",
    "advance_date": "2026-01-05",
    "requested_by": "John Doe",
    "department": "Finance",
    "employee_id": "EMP001",
    "purpose": "Office supplies and equipment",
    "project_name": "Q1 Office Renovation",
    "destination": "Manila",
    "start_date": "2026-01-10",
    "end_date": "2026-01-15",
    "requested_amount": 50000.00,
    "approved_amount": null,
    "payment_method": "check",
    "check_number": "CHK-2026-001",
    "account_number": null,
    "liquidation_deadline": "2026-01-20",
    "status": "draft",
    "created_by": 1,
    "approved_by": null,
    "approved_at": null,
    "disbursed_at": null,
    "liquidated_at": null,
    "remarks": null,
    "created_at": "2026-01-05T10:30:00.000Z",
    "updated_at": "2026-01-05T10:30:00.000Z",
    "items": [
      {
        "id": 1,
        "cash_advance_id": 1,
        "description": "Office chairs",
        "category": "Furniture",
        "estimated_amount": 30000.00,
        "created_at": "2026-01-05T10:30:00.000Z",
        "updated_at": "2026-01-05T10:30:00.000Z"
      },
      {
        "id": 2,
        "cash_advance_id": 1,
        "description": "Desk supplies",
        "category": "Supplies",
        "estimated_amount": 20000.00,
        "created_at": "2026-01-05T10:30:00.000Z",
        "updated_at": "2026-01-05T10:30:00.000Z"
      }
    ],
    "attachments": []
  }
}
```

**Status Codes:**
- `200`: Success
- `404`: Cash advance not found
- `401`: Unauthorized
- `500`: Server error

---

### 5. Delete Cash Advance
Delete a cash advance (only drafts can be deleted)

**Endpoint:** `DELETE /api/cash-advances/:id`

**Response:**
```json
{
  "success": true,
  "message": "Cash advance deleted successfully"
}
```

**Status Codes:**
- `200`: Deleted successfully
- `400`: Bad request (only drafts can be deleted)
- `404`: Cash advance not found
- `401`: Unauthorized
- `500`: Server error

---

### 6. Add Attachment
Add an attachment to a cash advance

**Endpoint:** `POST /api/cash-advances/:cashAdvanceId/attachments`

**Request Body:**
```json
{
  "fileName": "receipt.pdf",
  "filePath": "/uploads/2026/01/receipt_123456.pdf",
  "fileType": "application/pdf",
  "fileSize": 245678
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attachment added successfully",
  "data": {
    "id": 1
  }
}
```

**Status Codes:**
- `201`: Created successfully
- `401`: Unauthorized
- `500`: Server error

---

## Status Values

Cash advances can have the following status values:
- `draft`: Initial state, can be edited and deleted
- `pending`: Submitted for approval, awaiting review
- `approved`: Approved by manager/approver
- `rejected`: Rejected by manager/approver (can be edited and resubmitted)
- `disbursed`: Payment has been disbursed
- `liquidated`: Liquidation submitted
- `cancelled`: Request cancelled

## Workflow

1. **Create Draft**: User creates a cash advance with status `draft`
2. **Submit for Approval**: User submits, status changes to `pending`
3. **Approval/Rejection**: Manager approves (→ `approved`) or rejects (→ `rejected`)
4. **Disbursement**: If approved, finance disburses payment (→ `disbursed`)
5. **Liquidation**: User submits liquidation report (→ `liquidated`)

## Notes

- Only drafts and rejected cash advances can be edited
- Only drafts can be deleted
- Travel Advance requires: destination, start_date, end_date, and liquidation_deadline
- All monetary amounts are in decimal format (15,2)
- Items are required and must have at least one entry
- Department is validated against the departments table
