# n8n-nodes-hubstaff1

<div align="center">

![npm version](https://img.shields.io/npm/v/n8n-nodes-hubstaff1?style=for-the-badge)
![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-hubstaff1?style=for-the-badge)
![License](https://img.shields.io/npm/l/n8n-nodes-hubstaff1?style=for-the-badge)

**Powerful Hubstaff API v2 integration for n8n workflows**

[Features](#features) • [Installation](#installation) • [Quick Start](#quick-start) • [Documentation](#documentation)

</div>

---

## 🚀 Features

### ✨ Complete Hubstaff API v2 Support
- **🔐 Secure Authentication**: Automatic token refresh with intelligent caching
- **👥 User Management**: Get current user info and retrieve users by ID
- **📁 Project Management**: List, create, and manage projects
- **✅ Task Management**: Create, update, and retrieve tasks across projects
- **👤 Member Management**: Get all organization members with email addresses
- **⏱️ Time Tracking**: Create, update, and retrieve time entries

### 🎯 Key Advantages

- ✅ **Token Caching**: Smart caching system reduces API calls and improves performance
- ✅ **OpenID Connect**: Uses industry-standard OAuth2 with automatic token refresh
- ✅ **Error Handling**: Comprehensive error messages for better debugging
- ✅ **Pagination Support**: Built-in pagination for large datasets
- ✅ **Type Safety**: Full TypeScript support with proper type definitions

## 📦 Installation

### Via n8n UI (Recommended)

1. Open your n8n instance
2. Go to **Settings** → **Community Nodes**
3. Search for `n8n-nodes-hubstaff1`
4. Click **Install**

### Via npm

```bash
npm install n8n-nodes-hubstaff1
```

## 🎬 Quick Start

### 1. Get Your Hubstaff Credentials

1. Visit [Hubstaff Developer Portal](https://developer.hubstaff.com/personal_access_tokens)
2. Create a **Personal Access Token (Refresh Token)**
3. Get your **Organization ID** from your Hubstaff account settings

### 2. Configure Credentials in n8n

1. In your n8n workflow, add the **Hubstaff 1** node
2. Click **Create New Credential**
3. Enter:
   - **Personal Access Token (Refresh Token)**: Your refresh token from Hubstaff
   - **Organization ID**: Your organization ID (optional but required for some operations)

### 3. Use the Node

Select your resource and operation:
- **User**: Get current user or get user by ID
- **Project**: Get all projects, get specific project, or create new project
- **Task**: Get all tasks, create, or update tasks
- **Member**: Get all organization members (includes emails!)
- **Time Entry**: Get, create, or update time entries

## 📚 Documentation

### Available Resources

#### 👤 User
- **Get current user (me)**: Returns authenticated user information
- **Get User**: Retrieve user details by User ID (includes email)

#### 📁 Project
- **Get All Projects**: List all projects in your organization
- **Get Project**: Retrieve specific project by ID
- **Create Project**: Create a new project with full parameter support:
  - Basic fields: name, description, billable, client_id, pay_rate, bill_rate
  - Metadata: Custom key-value pairs
  - Members: Add members with roles and rates
  - Budget: Configure budget limits (cost or hours)

### 🔄 Dynamic Project Members (`members_payload`)

When using the **Hubstaff 2** project resource (create or update), you can pass a **dynamic members array** built in previous nodes:

- **Prepare the array** in a Function node (for example `Prepare Member Payload (Add/Remove)`) as:

```javascript
return {
  ...$json,
  members_payload: [
    {
      user_id: 123,
      role: 'user',
      pay_rate: 1,
      bill_rate: 1,
    },
    {
      user_id: 456,
      role: 'remove',
      pay_rate: null,
      bill_rate: null,
    },
  ],
};
```

- In the **Hubstaff 2 → Project → Update Project** (or **Create Project**) node you can either:
  - Leave **Additional Fields → Members** empty and the node will automatically read `members_payload` from the incoming item, **or**
  - Set **Additional Fields → Members → Member → memberValues** to the expression `={{ $json.members_payload }}`.

Internally, the node normalizes this data and sends it to Hubstaff using the dedicated members update handling, so you are no longer limited to a single static member like `{{$json.assignee_mappings[0].hubstaff_user_id}}`.

#### ✅ Task
- **Get All Tasks**: List tasks (optionally filtered by project)
- **Create Task**: Create a new task in a project
- **Update Task**: Update existing task details

#### 👥 Member
- **Get All Members**: List all organization members with:
  - Email addresses
  - Membership roles
  - Project memberships
  - Profile information

#### ⏱️ Time Entry
- **Get Time Entries**: Retrieve time entries (with date filters)
- **Create Time Entry**: Log new time entry
- **Update Time Entry**: Modify existing time entry

### Authentication

This node uses Hubstaff's Personal Access Token (Refresh Token) system with automatic token exchange. The refresh token is securely cached and automatically exchanged for short-lived access tokens, ensuring reliable authentication without manual token management.

**Token Features:**
- ✅ Automatic refresh token exchange
- ✅ Intelligent caching (tokens cached until expiration)
- ✅ OpenID Connect discovery endpoint support
- ✅ Secure token storage

## 🔧 Configuration

### Required Fields

- **Personal Access Token (Refresh Token)**: Required for all operations
- **Organization ID**: Required for:
  - Project operations
  - Task operations (when not using Project ID)
  - Member operations

### Optional Fields

- **Organization ID**: Can be left empty if you only use user-specific operations

## 📖 Example Workflows

### Get All Members with Emails

```yaml
1. Add Hubstaff 1 node
2. Select Resource: Member
3. Select Operation: Get All Members
4. Enable "Return All" to get complete list
5. Output includes user.email for each member
```

**Output Example:**
```json
{
  "json": {
    "user_id": 12345,
    "user": {
      "id": 12345,
      "name": "John Doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "membership_role": "user",
    "effective_role": "project_user"
  }
}
```

### Create a Project

```yaml
1. Add Hubstaff 1 node
2. Select Resource: Project
3. Select Operation: Create Project
4. Enter:
   - Project Name: Your project name (required)
   - Description: Project description (optional)
   - Billable: Whether project is billable (default: true)
   - Client ID: Associate with a client (optional)
   - Pay Rate: Default pay rate (optional)
   - Bill Rate: Default bill rate (optional)
5. Additional Fields (optional):
   - Metadata: Key-value pairs for custom metadata
   - Members: Add members with roles and rates
   - Budget: Set budget type (cost/hours) with limits
6. Project is created and returned
```

**Available Parameters:**
- **Required**: Project Name
- **Basic Fields**: Description, Billable, Client ID, Pay Rate, Bill Rate
- **Additional Fields**:
  - **Metadata**: Custom key-value pairs
  - **Members**: Array of members with user_id, role (viewer/user/manager), pay_rate, bill_rate
  - **Budget**: 
    - Type: `cost` or `hours`
    - For `cost`: rate, cost limit
    - For `hours`: hours limit

### Create a Task

```yaml
1. Add Hubstaff 1 node
2. Select Resource: Task
3. Select Operation: Create Task
4. Enter:
   - Project ID: Your project ID
   - Name: Task name
5. Task is created and returned
```

### Get User by ID

```yaml
1. Add Hubstaff 1 node
2. Select Resource: User
3. Select Operation: Get User
4. Enter User ID
5. Returns user details including email
```

## 🆚 Why Choose This Package?

| Feature | n8n-nodes-hubstaff1 | Other Packages |
|---------|---------------------|----------------|
| **Token Caching** | ✅ Intelligent caching | ❌ No caching |
| **OpenID Connect** | ✅ Full OAuth2 support | ❌ Basic auth |
| **Member Emails** | ✅ Full access | ⚠️ Limited |
| **Error Messages** | ✅ Detailed & helpful | ⚠️ Basic |
| **TypeScript** | ✅ Full support | ⚠️ Partial |
| **Active Maintenance** | ✅ Regularly updated | ⚠️ Varies |
| **API Coverage** | ✅ Complete v2 API | ⚠️ Partial |
| **Performance** | ✅ Optimized | ⚠️ Standard |

## 🐛 Troubleshooting

### 401 Invalid Token Error
- **Solution**: Ensure your Personal Access Token (Refresh Token) is valid and not expired
- The node automatically handles token refresh, but the refresh token itself must be valid

### 404 Not Found Error
- **Solution**: Make sure Organization ID is configured in credentials for:
  - Project operations
  - Task operations (when Project ID is not provided)
  - Member operations

### Missing Email in Member Response
- **Note**: Email addresses are only visible to organization owners and managers
- Ensure your account has appropriate permissions

## 📊 API Coverage

This package provides comprehensive coverage of the Hubstaff API v2:

- ✅ **Users**: Current user info, user lookup by ID
- ✅ **Projects**: List, retrieve, create projects
- ✅ **Tasks**: Full CRUD operations
- ✅ **Members**: Complete member management with profile data
- ✅ **Time Entries**: Create, read, update time tracking data

## 📝 License

MIT License - feel free to use in your projects!

## 🙏 Acknowledgments

Built with ❤️ for the n8n community. Special thanks to Hubstaff for providing a robust API.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔗 Links

- [Hubstaff API Documentation](https://developer.hubstaff.com/)
- [Hubstaff Developer Portal](https://developer.hubstaff.com/personal_access_tokens)
- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community Nodes Guide](https://docs.n8n.io/integrations/community-nodes/)
- [Report Issues](https://github.com/your-repo/n8n-nodes-hubstaff1/issues)

## 📋 Requirements

- n8n version 0.150.0 or higher
- Hubstaff account with API access
- Personal Access Token (Refresh Token) from Hubstaff

## 🔄 Changelog

### v0.2.1
- ➕ Added Create Project operation with full parameter support
- 📝 Added support for metadata, members, budget, and all API parameters
- 🔧 Enhanced project creation with client_id, pay_rate, bill_rate fields

### v0.2.0
- ✨ Added professional icon
- 📚 Enhanced README with comprehensive documentation
- 🎨 Improved marketing and discoverability
- 🔧 Better package metadata

### v0.1.8
- ✅ Added Get User by ID operation
- 🔧 Fixed user operations to match API v2

### v0.1.7
- 👥 Added Member resource with Get All Members operation
- 📧 Member responses include email addresses

### v0.1.6
- 🔐 Implemented token caching for better performance
- 🌐 Added OpenID Connect discovery support
- 🐛 Fixed 404 errors with proper endpoint structure

## ⭐ Support

If you find this package useful, please consider giving it a star on GitHub!

## 💡 Tips

- **Organization ID**: You can find your Organization ID by using the Organization → Get All operation (if available) or in your Hubstaff account settings
- **Token Refresh**: The node automatically handles token refresh - no manual intervention needed
- **Pagination**: Use "Return All" for complete datasets, or set a limit for faster responses
- **Member Emails**: Email addresses are only visible to organization owners and managers

---

<div align="center">

**Made with ❤️ for the n8n community**

[Install Now](#-installation) • [Documentation](#-documentation) • [Report Issue](https://github.com/your-repo/n8n-nodes-hubstaff1/issues)

</div>
