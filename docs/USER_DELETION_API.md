# User Deletion API Documentation

## Overview

The CELF backend provides comprehensive user deletion functionality with proper data cleanup and authorization controls. All deletion operations require admin privileges and handle related data appropriately.

## Endpoints

### 1. Get User Deletion Preview

**GET** `/api/users/:id/deletion-preview`

Preview what data will be deleted when removing a user.

**Authorization:** Admin required

**Parameters:**
- `id` (path): User UUID to preview deletion for

**Response:**
```json
{
  "success": true,
  "message": "User deletion preview retrieved",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "createdAt": "2023-01-01T00:00:00Z"
    },
    "relatedData": {
      "wallet": {
        "id": "wallet-uuid",
        "totalBalance": 100.5000,
        "sendableBalance": 75.2500
      },
      "miningSessions": {
        "count": 5,
        "totalTokensEarned": 125.7500
      },
      "transactions": {
        "sentCount": 10,
        "receivedCount": 8,
        "totalCount": 18
      },
      "assignments": {
        "contactSubmissions": 2,
        "supportTickets": 1
      }
    }
  }
}
```

### 2. Delete Single User

**DELETE** `/api/users/:id`

Delete a single user and all related data.

**Authorization:** Admin required

**Parameters:**
- `id` (path): User UUID to delete

**Security Rules:**
- Cannot delete your own account
- Only super-admin can delete admin users
- Cannot delete non-existent users

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "deletedUser": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "relatedDataDeleted": {
      "wallet": 1,
      "miningSessions": 5,
      "transactionsUpdated": 18
    }
  }
}
```

### 3. Delete Multiple Users

**POST** `/api/users/delete-multiple`

Delete multiple users in a single operation.

**Authorization:** Admin required

**Request Body:**
```json
{
  "userIds": ["user-uuid-1", "user-uuid-2", "user-uuid-3"]
}
```

**Security Rules:**
- Cannot include your own user ID
- Only super-admin can delete admin users
- Invalid UUIDs will be rejected

**Response:**
```json
{
  "success": true,
  "message": "Multiple users deletion completed",
  "data": {
    "summary": {
      "totalRequested": 3,
      "successful": 2,
      "failed": 1
    },
    "successful": [
      {
        "deletedUser": {
          "id": "user-uuid-1",
          "email": "user1@example.com",
          "firstName": "John",
          "lastName": "Doe"
        },
        "relatedDataDeleted": {
          "wallet": 1,
          "miningSessions": 3,
          "transactionsUpdated": 5
        }
      }
    ],
    "failed": [
      {
        "userId": "user-uuid-3",
        "error": "User not found"
      }
    ]
  }
}
```

### 4. Delete All Users (DANGEROUS)

**POST** `/api/users/delete-all`

Delete all users from the system. This is a destructive operation.

**Authorization:** Super-admin required

**Request Body:**
```json
{
  "confirmationToken": "DELETE_ALL_USERS_CONFIRMED",
  "excludeAdmins": true
}
```

**Parameters:**
- `confirmationToken` (required): Must be exactly "DELETE_ALL_USERS_CONFIRMED"
- `excludeAdmins` (optional): Whether to exclude admin users from deletion (default: true)

**Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 25 users",
  "data": {
    "deletedCount": 25,
    "deletedUsers": [
      {
        "id": "user-uuid-1",
        "email": "user1@example.com",
        "role": "user",
        "name": "John Doe"
      }
    ],
    "excludedAdmins": true
  }
}
```

### 5. Delete Own Account

**DELETE** `/api/users/account`

Allow users to delete their own account.

**Authorization:** User authentication required

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": {
    "deletedUser": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "relatedDataDeleted": {
      "wallet": 1,
      "miningSessions": 5,
      "transactionsUpdated": 18
    },
    "preview": {
      "wallet": { "totalBalance": 100.5000 },
      "miningSessions": { "count": 5 },
      "transactions": { "totalCount": 18 }
    }
  }
}
```

## Data Cleanup Process

When a user is deleted, the following cleanup occurs:

1. **Mining Sessions**: Deleted (CASCADE)
2. **Transactions**: User references set to NULL (preserves transaction history)
3. **Contact Submissions**: assigned_to field set to NULL
4. **Support Tickets**: assigned_to field set to NULL
5. **Wallet**: Deleted (CASCADE)
6. **User Record**: Deleted

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Cannot delete your own account"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Cannot delete admin users"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

### 422 Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "userIds",
      "message": "Each user ID must be a valid UUID"
    }
  ]
}
```

## Usage Examples

### cURL Examples

```bash
# Get deletion preview
curl -X GET "http://localhost:5000/api/users/user-uuid/deletion-preview" \
  -H "Authorization: Bearer your-admin-token"

# Delete single user
curl -X DELETE "http://localhost:5000/api/users/user-uuid" \
  -H "Authorization: Bearer your-admin-token"

# Delete multiple users
curl -X POST "http://localhost:5000/api/users/delete-multiple" \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"userIds": ["uuid-1", "uuid-2"]}'

# Delete all users (super-admin only)
curl -X POST "http://localhost:5000/api/users/delete-all" \
  -H "Authorization: Bearer your-super-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"confirmationToken": "DELETE_ALL_USERS_CONFIRMED", "excludeAdmins": true}'
```

## Security Considerations

- All deletion operations are logged
- Soft delete is not implemented - deletions are permanent
- Transaction history is preserved by setting user references to NULL
- Admin users can only be deleted by super-admin
- Self-deletion is prevented for admin operations
- Confirmation tokens required for bulk operations
- All operations require proper authentication and authorization
