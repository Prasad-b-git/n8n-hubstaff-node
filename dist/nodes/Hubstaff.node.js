"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hubstaff = void 0;
const https = require("https");
const n8n_workflow_1 = require("n8n-workflow");
// Cache for access tokens
const tokenCache = new Map();
// Clean expired tokens from cache periodically
function cleanExpiredTokens() {
    const now = Date.now();
    for (const [key, value] of tokenCache.entries()) {
        if (now >= value.expiresAt) {
            tokenCache.delete(key);
        }
    }
}
// Helper function to get access token from refresh token using Node.js https module
async function getAccessToken(refreshToken) {
    // Clean expired tokens first
    cleanExpiredTokens();
    // Check if we have a valid cached token
    const cached = tokenCache.get(refreshToken);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.token;
    }
    // First, get the discovery endpoint
    const discovery = await new Promise((resolve, reject) => {
        const req = https.request('https://account.hubstaff.com/.well-known/openid-configuration', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk.toString();
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                }
                catch (error) {
                    reject(new Error(`Failed to parse discovery response: ${error}`));
                }
            });
        });
        req.on('error', (error) => {
            reject(new Error(`Discovery request failed: ${error.message}`));
        });
        req.end();
    });
    const tokenEndpoint = discovery.token_endpoint;
    // Exchange refresh token for access token
    const tokenData = await new Promise((resolve, reject) => {
        const url = new URL(tokenEndpoint);
        const postData = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
        const req = https.request({
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk.toString();
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(jsonData);
                    }
                    else {
                        reject(new Error(`Token request failed: ${res.statusCode} ${data}`));
                    }
                }
                catch (error) {
                    reject(new Error(`Failed to parse token response: ${error}`));
                }
            });
        });
        req.on('error', (error) => {
            reject(new Error(`Token request failed: ${error.message}`));
        });
        req.write(postData);
        req.end();
    });
    // Cache the token with expiration time (subtract 5 minutes for safety)
    const expiresAt = Date.now() + (tokenData.expires_in - 300) * 1000;
    tokenCache.set(refreshToken, {
        token: tokenData.access_token,
        expiresAt: expiresAt,
    });
    return tokenData.access_token;
}
class Hubstaff {
    constructor() {
        this.description = {
            displayName: 'Hubstaff 2',
            name: 'hubstaff2',
            icon: 'file:hubstaff.svg',
            group: ['output'],
            version: 1,
            description: 'Integrate Hubstaff API v2 - Manage users, projects, tasks, members, and time entries with automatic token refresh',
            defaults: {
                name: 'Hubstaff 2',
                color: '#5b21b6',
            },
            inputs: ['main'],
            outputs: ['main'],
            credentials: [
                {
                    name: 'hubstaffApi1',
                    required: true,
                },
            ],
            properties: [
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    options: [
                        { name: 'User', value: 'user' },
                        { name: 'Project', value: 'project' },
                        { name: 'Time Entry', value: 'time' },
                        { name: 'Task', value: 'task' },
                        { name: 'Member', value: 'member' },
                        { name: 'Client', value: 'client' },
                    ],
                    default: 'user',
                    description: 'Resource to operate on.',
                },
                // User operations
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['user'],
                        },
                    },
                    options: [
                        { name: 'Get current user (me)', value: 'getMe' },
                        { name: 'Get User', value: 'get' },
                    ],
                    default: 'getMe',
                },
                {
                    displayName: 'User ID',
                    name: 'userId',
                    type: 'string',
                    default: '',
                    required: true,
                    displayOptions: {
                        show: {
                            resource: ['user'],
                            operation: ['get'],
                        },
                    },
                    description: 'The ID of the user to retrieve',
                },
                // Project operations
                {
                    displayName: 'Project Operation',
                    name: 'projectOperation',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['project'],
                        },
                    },
                    options: [
                        { name: 'Get All Projects', value: 'getAll' },
                        { name: 'Get Project', value: 'get' },
                        { name: 'Create Project', value: 'create' },
                        { name: 'Update Project', value: 'update' },
                        { name: 'Get Project Members', value: 'getMembers' },
                    ],
                    default: 'getAll',
                },
                {
                    displayName: 'Project ID',
                    name: 'projectId',
                    type: 'string',
                    default: '',
                    required: true,
                    displayOptions: {
                        show: {
                            resource: ['project'],
                            projectOperation: ['get', 'getMembers'],
                        },
                    },
                    description: 'The ID of the project to get',
                },
                {
                    displayName: 'Project ID',
                    name: 'projectIdUpdate',
                    type: 'string',
                    default: '',
                    required: true,
                    displayOptions: {
                        show: {
                            resource: ['project'],
                            projectOperation: ['update'],
                        },
                    },
                    description: 'The ID of the project to update',
                },
                {
                    displayName: 'Project Name',
                    name: 'name',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['project'],
                            projectOperation: ['create', 'update'],
                        },
                    },
                    description: 'The name of the project',
                },
                {
                    displayName: 'Project Description',
                    name: 'description',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['project'],
                            projectOperation: ['create', 'update'],
                        },
                    },
                    description: 'The description of the project',
                },
                {
                    displayName: 'Billable',
                    name: 'billable',
                    type: 'boolean',
                    default: true,
                    displayOptions: {
                        show: {
                            resource: ['project'],
                            projectOperation: ['create', 'update'],
                        },
                    },
                    description: 'Whether the project is billable (default: true)',
                },
                {
                    displayName: 'Client ID',
                    name: 'client_id',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['project'],
                            projectOperation: ['create', 'update'],
                        },
                    },
                    description: 'The client ID to associate with this project',
                },
                {
                    displayName: 'Pay Rate',
                    name: 'pay_rate',
                    type: 'number',
                    typeOptions: {
                        numberPrecision: 2,
                    },
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['project'],
                            projectOperation: ['create', 'update'],
                        },
                    },
                    description: 'Default pay rate (will be rounded to 2 decimal places). Set to null to remove the rate.',
                },
                {
                    displayName: 'Bill Rate',
                    name: 'bill_rate',
                    type: 'number',
                    typeOptions: {
                        numberPrecision: 2,
                    },
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['project'],
                            projectOperation: ['create', 'update'],
                        },
                    },
                    description: 'Default bill rate (will be rounded to 2 decimal places). Set to null to remove the rate.',
                },
                {
                    displayName: 'Additional Fields',
                    name: 'additionalFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['project'],
                            projectOperation: ['create', 'update'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Metadata',
                            name: 'metadata',
                            type: 'fixedCollection',
                            typeOptions: {
                                multipleValues: true,
                            },
                            placeholder: 'Add Metadata',
                            default: {},
                            options: [
                                {
                                    displayName: 'Metadata',
                                    name: 'metadataValues',
                                    values: [
                                        {
                                            displayName: 'Key',
                                            name: 'key',
                                            type: 'string',
                                            default: '',
                                            description: 'The metadata key',
                                        },
                                        {
                                            displayName: 'Value',
                                            name: 'value',
                                            type: 'string',
                                            default: '',
                                            description: 'The metadata value',
                                        },
                                    ],
                                },
                            ],
                            description: 'Project metadata as key-value pairs',
                        },
                        {
                            displayName: 'Members',
                            name: 'members',
                            type: 'fixedCollection',
                            typeOptions: {
                                multipleValues: true,
                            },
                            placeholder: 'Add Member',
                            default: {},
                            options: [
                                {
                                    displayName: 'Member',
                                    name: 'memberValues',
                                    values: [
                                        {
                                            displayName: 'User ID',
                                            name: 'user_id',
                                            type: 'string',
                                            default: '',
                                            required: true,
                                            description: 'The user ID to add as a member',
                                        },
                                        {
                                            displayName: 'Role',
                                            name: 'role',
                                            type: 'options',
                                            options: [
                                                { name: 'Viewer', value: 'viewer' },
                                                { name: 'User', value: 'user' },
                                                { name: 'Manager', value: 'manager' },
                                                { name: 'Remove', value: 'remove' },
                                            ],
                                            default: 'user',
                                            description: 'The role for this member. Use "Remove" to remove a user from the project.',
                                        },
                                        {
                                            displayName: 'Pay Rate',
                                            name: 'pay_rate',
                                            type: 'number',
                                            typeOptions: {
                                                numberPrecision: 2,
                                            },
                                            default: 1.0,
                                            description: 'Pay rate for this member. Leave empty to use default 1.00.',
                                        },
                                        {
                                            displayName: 'Bill Rate',
                                            name: 'bill_rate',
                                            type: 'number',
                                            typeOptions: {
                                                numberPrecision: 2,
                                            },
                                            default: '',
                                            description: 'Bill rate for this member',
                                        },
                                    ],
                                },
                            ],
                            description: 'Members to add to the project',
                        },
                        {
                            displayName: 'Budget Type',
                            name: 'budget_type',
                            type: 'options',
                            options: [
                                { name: 'Cost', value: 'cost' },
                                { name: 'Hours', value: 'hours' },
                            ],
                            default: '',
                            description: 'The method for controlling the budget',
                        },
                        {
                            displayName: 'Budget Rate',
                            name: 'budget_rate',
                            type: 'string',
                            default: '',
                            displayOptions: {
                                show: {
                                    budget_type: ['cost'],
                                },
                            },
                            description: 'When budget type is cost, specifies which rate to use',
                        },
                        {
                            displayName: 'Budget Cost',
                            name: 'budget_cost',
                            type: 'number',
                            typeOptions: {
                                numberPrecision: 2,
                            },
                            default: '',
                            displayOptions: {
                                show: {
                                    budget_type: ['cost'],
                                },
                            },
                            description: 'When budget type is cost, defines the cost limit',
                        },
                        {
                            displayName: 'Budget Hours',
                            name: 'budget_hours',
                            type: 'number',
                            typeOptions: {
                                numberPrecision: 2,
                            },
                            default: '',
                            displayOptions: {
                                show: {
                                    budget_type: ['hours'],
                                },
                            },
                            description: 'When budget type is hours, defines the hours limit',
                        },
                    ],
                },
                // Time operations
                {
                    displayName: 'Time Operation',
                    name: 'timeOperation',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['time'],
                        },
                    },
                    options: [
                        { name: 'Get Time Entries', value: 'getAll' },
                        { name: 'Create Time Entry', value: 'create' },
                        { name: 'Update Time Entry', value: 'update' },
                    ],
                    default: 'getAll',
                },
                // Task operations
                {
                    displayName: 'Task Operation',
                    name: 'taskOperation',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['task'],
                        },
                    },
                    options: [
                        { name: 'Get All Tasks', value: 'getAll' },
                        { name: 'Get Task', value: 'get' },
                        { name: 'Create Task', value: 'create' },
                        { name: 'Update Task', value: 'update' },
                        { name: 'Delete Task', value: 'delete' },
                    ],
                    default: 'getAll',
                },
                // Member operations
                {
                    displayName: 'Member Operation',
                    name: 'memberOperation',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['member'],
                        },
                    },
                    options: [
                        { name: 'Get All Members', value: 'getAll' },
                    ],
                    default: 'getAll',
                },
                // Client operations
                {
                    displayName: 'Client Operation',
                    name: 'clientOperation',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['client'],
                        },
                    },
                    options: [
                        { name: 'Get All Clients', value: 'getAll' },
                        { name: 'Create Client', value: 'create' },
                        { name: 'Update Client', value: 'update' },
                    ],
                    default: 'getAll',
                },
                // Common parameters
                {
                    displayName: 'From (YYYY-MM-DD)',
                    name: 'from',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['time'],
                            timeOperation: ['getAll'],
                        },
                    },
                },
                {
                    displayName: 'To (YYYY-MM-DD)',
                    name: 'to',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['time'],
                            timeOperation: ['getAll'],
                        },
                    },
                },
                {
                    displayName: 'Return All',
                    name: 'returnAll',
                    type: 'boolean',
                    default: false,
                    description: 'If true, will paginate through all results',
                },
                {
                    displayName: 'Limit',
                    name: 'limit',
                    type: 'number',
                    typeOptions: {
                        minValue: 1,
                        maxValue: 500,
                    },
                    default: 100,
                    description: 'Max number of results to return when Return All is false',
                },
                {
                    displayName: 'Project ID',
                    name: 'projectId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['getAll'],
                        },
                    },
                    description: 'The ID of the project (optional - if not provided, returns all tasks for the organization)',
                },
                {
                    displayName: 'Task Filters',
                    name: 'taskFilters',
                    type: 'collection',
                    placeholder: 'Add Filter',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['getAll'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Page Start ID',
                            name: 'page_start_id',
                            type: 'number',
                            default: 0,
                            description: 'The page start ID for cursor-based pagination',
                        },
                        {
                            displayName: 'Page Limit',
                            name: 'page_limit',
                            type: 'number',
                            default: 0,
                            description: 'How many records to request per page (defaults to API standard when empty)',
                        },
                        {
                            displayName: 'Statuses',
                            name: 'status',
                            type: 'multiOptions',
                            options: [
                                { name: 'Active', value: 'active' },
                                { name: 'Completed', value: 'completed' },
                                { name: 'Deleted', value: 'deleted' },
                                { name: 'Archived', value: 'archived' },
                                { name: 'Archived Native Active', value: 'archived_native_active' },
                                { name: 'Archived Native Completed', value: 'archived_native_completed' },
                                { name: 'Archived Native Deleted', value: 'archived_native_deleted' },
                            ],
                            default: [],
                            description: 'Filter by one or more task statuses',
                        },
                        {
                            displayName: 'User IDs',
                            name: 'userIds',
                            type: 'string',
                            default: '',
                            description: 'Comma-separated list or JSON array of user IDs to filter by',
                        },
                        {
                            displayName: 'Project IDs',
                            name: 'projectIds',
                            type: 'string',
                            default: '',
                            description: 'Comma-separated list or JSON array of project IDs to filter by',
                        },
                        {
                            displayName: 'Global To-do IDs',
                            name: 'globalTodoIds',
                            type: 'string',
                            default: '',
                            description: 'Comma-separated list or JSON array of global to-do IDs to filter by',
                        },
                    ],
                },
                // Create / Update fields for time/task/client
                {
                    displayName: 'User ID',
                    name: 'user_id',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['time'],
                            timeOperation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Project ID',
                    name: 'project_id',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['time', 'task'],
                            timeOperation: ['create'],
                            taskOperation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Task ID',
                    name: 'task_id',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['time'],
                            timeOperation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Started At (ISO)',
                    name: 'started_at',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['time'],
                            timeOperation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Stopped At (ISO)',
                    name: 'stopped_at',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['time'],
                            timeOperation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Notes',
                    name: 'notes',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['time'],
                            timeOperation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Time Entry ID',
                    name: 'timeEntryId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['time'],
                            timeOperation: ['update'],
                        },
                    },
                },
                {
                    displayName: 'Update Fields',
                    name: 'updateFields',
                    type: 'collection',
                    placeholder: 'Add Field',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['time', 'client'],
                            timeOperation: ['update'],
                            clientOperation: ['update'],
                        },
                    },
                    options: [
                        { displayName: 'Notes', name: 'notes', type: 'string', default: '' },
                        { displayName: 'Name', name: 'name', type: 'string', default: '' },
                        { displayName: 'Started At', name: 'started_at', type: 'string', default: '' },
                        { displayName: 'Stopped At', name: 'stopped_at', type: 'string', default: '' },
                    ],
                },
                {
                    displayName: 'Lock Version',
                    name: 'lockVersion',
                    type: 'number',
                    required: true,
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['update'],
                        },
                    },
                    description: 'Lock version from the task fetch (required for optimistic locking)',
                },
                {
                    displayName: 'Summary',
                    name: 'summary',
                    type: 'string',
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['update'],
                        },
                    },
                    description: 'Task summary',
                },
                {
                    displayName: 'Status',
                    name: 'status',
                    type: 'options',
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['update'],
                        },
                    },
                    options: [
                        { name: 'Active', value: 'active' },
                        { name: 'Completed', value: 'completed' },
                    ],
                    description: 'Task status',
                },
                {
                    displayName: 'Assignee ID',
                    name: 'assigneeId',
                    type: 'string',
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['update'],
                        },
                    },
                    description: 'Single assignee user ID (use this OR Assignee IDs, not both)',
                },
                {
                    displayName: 'Assignee IDs',
                    name: 'assigneeIds',
                    type: 'string',
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['update'],
                        },
                    },
                    description: 'Comma-separated list of assignee user IDs (use this OR Assignee ID, not both)',
                },
                {
                    displayName: 'Pay Rate',
                    name: 'payRate',
                    type: 'number',
                    typeOptions: {
                        numberPrecision: 2,
                    },
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['update'],
                        },
                    },
                    description: 'Pay rate. Set to null to remove.',
                },
                {
                    displayName: 'Bill Rate',
                    name: 'billRate',
                    type: 'number',
                    typeOptions: {
                        numberPrecision: 2,
                    },
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['update'],
                        },
                    },
                    description: 'Bill rate. Set to null to remove.',
                },
                {
                    displayName: 'Metadata',
                    name: 'metadata',
                    type: 'fixedCollection',
                    typeOptions: {
                        multipleValues: true,
                    },
                    placeholder: 'Add Metadata',
                    default: {},
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['update'],
                        },
                    },
                    options: [
                        {
                            displayName: 'Metadata',
                            name: 'metadataValues',
                            values: [
                                {
                                    displayName: 'Key',
                                    name: 'key',
                                    type: 'string',
                                    default: '',
                                    description: 'The metadata key',
                                },
                                {
                                    displayName: 'Value',
                                    name: 'value',
                                    type: 'string',
                                    default: '',
                                    description: 'The metadata value',
                                },
                            ],
                        },
                    ],
                    description: 'Task metadata as key-value pairs',
                },
                {
                    displayName: 'Name',
                    name: 'name',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['task', 'client'],
                            taskOperation: ['create'],
                            clientOperation: ['create'],
                        },
                    },
                },
                {
                    displayName: 'Task ID',
                    name: 'taskId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['task'],
                            taskOperation: ['get', 'update', 'delete'],
                        },
                    },
                    description: 'The task ID to get, update, or delete',
                },
                {
                    displayName: 'Client ID (for update)',
                    name: 'clientId',
                    type: 'string',
                    default: '',
                    displayOptions: {
                        show: {
                            resource: ['client'],
                            clientOperation: ['update'],
                        },
                    },
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        // Get organizationId from credentials
        const credentials = await this.getCredentials('hubstaffApi1');
        const organizationId = credentials === null || credentials === void 0 ? void 0 : credentials.organizationId;
        for (let i = 0; i < items.length; i++) {
            const resource = this.getNodeParameter('resource', i);
            try {
                // ===== Users =====
                if (resource === 'user') {
                    const operation = this.getNodeParameter('operation', i);
                    if (operation === 'getMe') {
                        const response = await hubstaffRequest(this, 'GET', '/users/me');
                        // Handle response - it might be a string that needs to be parsed
                        let processedData = response;
                        if (typeof response === 'string') {
                            try {
                                processedData = JSON.parse(response);
                            }
                            catch (error) {
                                processedData = response;
                            }
                        }
                        // Handle wrapped response
                        if (processedData && typeof processedData === 'object' && 'user' in processedData) {
                            returnData.push({ json: processedData.user });
                        }
                        else {
                            returnData.push({ json: processedData });
                        }
                    }
                    else if (operation === 'get') {
                        const userId = this.getNodeParameter('userId', i);
                        if (!userId) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'User ID is required');
                        }
                        const response = await hubstaffRequest(this, 'GET', `/users/${userId}`);
                        // Handle response - it might be a string that needs to be parsed
                        let processedData = response;
                        if (typeof response === 'string') {
                            try {
                                processedData = JSON.parse(response);
                            }
                            catch (error) {
                                processedData = response;
                            }
                        }
                        // Handle wrapped response
                        if (processedData && typeof processedData === 'object' && 'user' in processedData) {
                            returnData.push({ json: processedData.user });
                        }
                        else {
                            returnData.push({ json: processedData });
                        }
                    }
                }
                // ===== Projects =====
                if (resource === 'project') {
                    const operation = this.getNodeParameter('projectOperation', i);
                    if (operation === 'getAll') {
                        if (!organizationId) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Organization ID is required. Please configure it in your credentials.');
                        }
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const limit = this.getNodeParameter('limit', i);
                        let responseData;
                        if (returnAll) {
                            responseData = await hubstaffRequestAllItems(this, `/organizations/${organizationId}/projects`);
                        }
                        else {
                            responseData = await hubstaffRequest(this, 'GET', `/organizations/${organizationId}/projects`, {}, { per_page: limit });
                        }
                        // Handle wrapped response
                        let processedData = responseData;
                        if (typeof responseData === 'string') {
                            try {
                                processedData = JSON.parse(responseData);
                            }
                            catch (error) {
                                processedData = responseData;
                            }
                        }
                        if (processedData && typeof processedData === 'object' && 'projects' in processedData) {
                            const projects = Array.isArray(processedData.projects) ? processedData.projects : [processedData.projects];
                            returnData.push(...projects.map((item) => ({ json: item })));
                        }
                        else if (Array.isArray(processedData)) {
                            returnData.push(...processedData.map((item) => ({ json: item })));
                        }
                        else {
                            returnData.push({ json: processedData });
                        }
                    }
                    else if (operation === 'get') {
                        const projectId = this.getNodeParameter('projectId', i, '');
                        if (!projectId)
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'projectId is required for get operation');
                        const resp = await hubstaffRequest(this, 'GET', `/projects/${projectId}`);
                        let processedData = resp;
                        if (typeof resp === 'string') {
                            try {
                                processedData = JSON.parse(resp);
                            }
                            catch (error) {
                                processedData = resp;
                            }
                        }
                        returnData.push({ json: processedData });
                    }
                    else if (operation === 'getMembers') {
                        const projectId = this.getNodeParameter('projectId', i, '');
                        if (!projectId) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'projectId is required to retrieve project members');
                        }
                        const resp = await hubstaffRequest(this, 'GET', `/projects/${projectId}/members`);
                        let processedData = resp;
                        if (typeof resp === 'string') {
                            try {
                                processedData = JSON.parse(resp);
                            }
                            catch (error) {
                                processedData = resp;
                            }
                        }
                        if (processedData && typeof processedData === 'object' && 'members' in processedData) {
                            const members = Array.isArray(processedData.members) ? processedData.members : [processedData.members];
                            returnData.push(...members.map((m) => ({ json: m })));
                        }
                        else if (Array.isArray(processedData)) {
                            returnData.push(...processedData.map((m) => ({ json: m })));
                        }
                        else {
                            returnData.push({ json: processedData });
                        }
                    }
                    else if (operation === 'create') {
                        if (!organizationId) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Organization ID is required. Please configure it in your credentials.');
                        }
                        const name = this.getNodeParameter('name', i);
                        if (!name) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Project name is required to create a project');
                        }
                        const description = this.getNodeParameter('description', i, '');
                        const billable = this.getNodeParameter('billable', i, true);
                        const clientId = this.getNodeParameter('client_id', i, '');
                        const payRate = this.getNodeParameter('pay_rate', i, '');
                        const billRate = this.getNodeParameter('bill_rate', i, '');
                        const additionalFields = this.getNodeParameter('additionalFields', i, {});
                        const body = {
                            name: name,
                        };
                        if (description) {
                            body.description = description;
                        }
                        if (billable !== undefined) {
                            body.billable = billable;
                        }
                        if (clientId) {
                            body.client_id = Number(clientId);
                        }
                        // Normalize project-level pay_rate: default to 1.00 when empty or invalid, allow explicit null to remove
                        if (payRate === null) {
                            body.pay_rate = null;
                        }
                        else {
                            let normalizedPayRate;
                            if (payRate === '' || payRate === undefined) {
                                normalizedPayRate = 1.0;
                            }
                            else {
                                const n = Number(payRate);
                                normalizedPayRate = !isNaN(n) && n >= 0.01 ? n : 1.0;
                            }
                            body.pay_rate = normalizedPayRate;
                        }
                        // Normalize project-level bill_rate: default to 1.00 when empty or invalid, allow explicit null to remove
                        if (billRate === null) {
                            body.bill_rate = null;
                        }
                        else {
                            let normalizedBillRate;
                            if (billRate === '' || billRate === undefined) {
                                normalizedBillRate = 1.0;
                            }
                            else {
                                const n = Number(billRate);
                                normalizedBillRate = !isNaN(n) && n >= 0.01 ? n : 1.0;
                            }
                            body.bill_rate = normalizedBillRate;
                        }
                        // Handle metadata
                        if (additionalFields.metadata) {
                            const metadata = additionalFields.metadata.metadataValues;
                            if (metadata && Array.isArray(metadata)) {
                                body.metadata = metadata.map((item) => ({
                                    key: item.key,
                                    value: item.value,
                                }));
                            }
                        }
                        // Handle members
                        // First try to get members from additionalFields.members.memberValues
                        let members = null;
                        if (additionalFields.members && additionalFields.members.memberValues) {
                            members = additionalFields.members.memberValues;
                        }
                        // Fallback: if memberValues is not available, check for members_payload directly in item data
                        if (!members && items[i].json.members_payload) {
                            members = items[i].json.members_payload;
                        }
                        // Handle case where memberValues might be set via expression (string that evaluates to array)
                        // or already be an array from the UI
                        if (members) {
                            // If it's a string, try to parse it (in case expression wasn't evaluated)
                            if (typeof members === 'string') {
                                try {
                                    const parsed = JSON.parse(members);
                                    if (Array.isArray(parsed)) {
                                        members = parsed;
                                    }
                                }
                                catch (e) {
                                    // If parsing fails, members might be an expression string that wasn't evaluated
                                    // In this case, we'll skip it and log a warning
                                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'members.memberValues must be an array. If using an expression like "={{ $json.members_payload }}", ensure it evaluates to an array.');
                                }
                            }
                            // Process members array
                            if (Array.isArray(members)) {
                                body.members = members.map((member) => {
                                    const memberObj = {
                                        user_id: Number(member.user_id),
                                        role: member.role,
                                    };
                                    // Member pay_rate: default to 1.00 when empty or invalid
                                    if (member.pay_rate === null) {
                                        memberObj.pay_rate = null;
                                    }
                                    else if (member.pay_rate === '' || member.pay_rate === undefined) {
                                        memberObj.pay_rate = 1.0;
                                    }
                                    else {
                                        const nPay = Number(member.pay_rate);
                                        memberObj.pay_rate = !isNaN(nPay) && nPay >= 0.01 ? nPay : 1.0;
                                    }
                                    // Member bill_rate: default to 1.00 when empty or invalid
                                    if (member.bill_rate === null) {
                                        memberObj.bill_rate = null;
                                    }
                                    else if (member.bill_rate === '' || member.bill_rate === undefined) {
                                        memberObj.bill_rate = 1.0;
                                    }
                                    else {
                                        const nBill = Number(member.bill_rate);
                                        memberObj.bill_rate = !isNaN(nBill) && nBill >= 0.01 ? nBill : 1.0;
                                    }
                                    return memberObj;
                                });
                            }
                        }
                        // Handle budget
                        if (additionalFields.budget_type) {
                            const budget = {
                                type: additionalFields.budget_type,
                            };
                            if (additionalFields.budget_type === 'cost') {
                                if (additionalFields.budget_rate) {
                                    budget.rate = additionalFields.budget_rate;
                                }
                                if (additionalFields.budget_cost !== '' && additionalFields.budget_cost !== null) {
                                    budget.cost = Number(additionalFields.budget_cost);
                                }
                            }
                            else if (additionalFields.budget_type === 'hours') {
                                if (additionalFields.budget_hours !== '' && additionalFields.budget_hours !== null) {
                                    budget.hours = Number(additionalFields.budget_hours);
                                }
                            }
                            body.budget = budget;
                        }
                        const resp = await hubstaffRequest(this, 'POST', `/organizations/${organizationId}/projects`, body);
                        let processedData = resp;
                        if (typeof resp === 'string') {
                            try {
                                processedData = JSON.parse(resp);
                            }
                            catch (error) {
                                processedData = resp;
                            }
                        }
                        // Handle wrapped response
                        if (processedData && typeof processedData === 'object' && 'project' in processedData) {
                            returnData.push({ json: processedData.project });
                        }
                        else {
                            returnData.push({ json: processedData });
                        }
                    }
                    else if (operation === 'update') {
                        const projectId = this.getNodeParameter('projectIdUpdate', i, '');
                        if (!projectId) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'projectId is required for update operation');
                        }
                        // Reuse fields similarly to create, but all optional
                        const name = this.getNodeParameter('name', i, '');
                        const description = this.getNodeParameter('description', i, '');
                        const billable = this.getNodeParameter('billable', i, undefined);
                        const clientId = this.getNodeParameter('client_id', i, '');
                        const payRate = this.getNodeParameter('pay_rate', i, '');
                        const billRate = this.getNodeParameter('bill_rate', i, '');
                        const additionalFields = this.getNodeParameter('additionalFields', i, {});
                        // Body for main project update
                        const body = {};
                        if (name) {
                            body.name = name;
                        }
                        if (description) {
                            body.description = description;
                        }
                        if (billable !== undefined) {
                            body.billable = billable;
                        }
                        if (clientId) {
                            body.client_id = Number(clientId);
                        }
                        // Normalize project-level pay_rate on update
                        if (payRate === null) {
                            body.pay_rate = null;
                        }
                        else if (payRate !== undefined) {
                            let normalizedPayRate;
                            if (payRate === '') {
                                normalizedPayRate = 1.0;
                            }
                            else {
                                const n = Number(payRate);
                                normalizedPayRate = !isNaN(n) && n >= 0.01 ? n : 1.0;
                            }
                            body.pay_rate = normalizedPayRate;
                        }
                        // Normalize project-level bill_rate on update
                        if (billRate === null) {
                            body.bill_rate = null;
                        }
                        else if (billRate !== undefined) {
                            let normalizedBillRate;
                            if (billRate === '') {
                                normalizedBillRate = 1.0;
                            }
                            else {
                                const n = Number(billRate);
                                normalizedBillRate = !isNaN(n) && n >= 0.01 ? n : 1.0;
                            }
                            body.bill_rate = normalizedBillRate;
                        }
                        // Handle metadata
                        if (additionalFields.metadata) {
                            const metadata = additionalFields.metadata.metadataValues;
                            if (metadata && Array.isArray(metadata)) {
                                body.metadata = metadata.map((item) => ({
                                    key: item.key,
                                    value: item.value,
                                }));
                            }
                        }
                        // Handle members update via dedicated /update_members endpoint
                        let membersPayload;
                        // First try to get members from additionalFields.members.memberValues
                        let members = null;
                        if (additionalFields.members && additionalFields.members.memberValues) {
                            members = additionalFields.members.memberValues;
                        }
                        // Fallback: if memberValues is not available, check for members_payload directly in item data
                        if (!members && items[i].json.members_payload) {
                            members = items[i].json.members_payload;
                        }
                        // Handle case where memberValues might be set via expression (string that evaluates to array)
                        // or already be an array from the UI
                        if (members) {
                            // If it's a string, try to parse it (in case expression wasn't evaluated)
                            if (typeof members === 'string') {
                                try {
                                    const parsed = JSON.parse(members);
                                    if (Array.isArray(parsed)) {
                                        members = parsed;
                                    }
                                }
                                catch (e) {
                                    // If parsing fails, members might be an expression string that wasn't evaluated
                                    // In this case, we'll skip it and log a warning
                                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'members.memberValues must be an array. If using an expression like "={{ $json.members_payload }}", ensure it evaluates to an array.');
                                }
                            }
                            // Process members array
                            if (Array.isArray(members)) {
                                membersPayload = {
                                    members: members.map((member) => {
                                    const memberObj = {
                                        user_id: Number(member.user_id),
                                        role: member.role,
                                    };
                                    // Member pay_rate on update: default to 1.00 when empty or invalid
                                    if (member.pay_rate === null) {
                                        memberObj.pay_rate = null;
                                    }
                                    else if (member.pay_rate === '' || member.pay_rate === undefined) {
                                        memberObj.pay_rate = 1.0;
                                    }
                                    else {
                                        const nPay = Number(member.pay_rate);
                                        memberObj.pay_rate = !isNaN(nPay) && nPay >= 0.01 ? nPay : 1.0;
                                    }
                                    // Member bill_rate on update: default to 1.00 when empty or invalid
                                    if (member.bill_rate === null) {
                                        memberObj.bill_rate = null;
                                    }
                                    else if (member.bill_rate === '' || member.bill_rate === undefined) {
                                        memberObj.bill_rate = 1.0;
                                    }
                                    else {
                                        const nBill = Number(member.bill_rate);
                                        memberObj.bill_rate = !isNaN(nBill) && nBill >= 0.01 ? nBill : 1.0;
                                    }
                                    return memberObj;
                                    }),
                                };
                            }
                        }
                        // Handle budget update (must send full config if provided)
                        if (additionalFields.budget_type) {
                            const budget = {
                                type: additionalFields.budget_type,
                            };
                            if (additionalFields.budget_type === 'cost') {
                                if (additionalFields.budget_rate) {
                                    budget.rate = additionalFields.budget_rate;
                                }
                                if (additionalFields.budget_cost !== '' && additionalFields.budget_cost !== null) {
                                    budget.cost = Number(additionalFields.budget_cost);
                                }
                            }
                            else if (additionalFields.budget_type === 'hours') {
                                if (additionalFields.budget_hours !== '' && additionalFields.budget_hours !== null) {
                                    budget.hours = Number(additionalFields.budget_hours);
                                }
                            }
                            body.budget = budget;
                        }
                        let finalResult = {};
                        // Hubstaff Update Project endpoint is a PUT on /v2/projects/{project_id}
                        if (Object.keys(body).length > 0) {
                            const resp = await hubstaffRequest(this, 'PUT', `/projects/${projectId}`, body);
                            let processedData = resp;
                            if (typeof resp === 'string') {
                                try {
                                    processedData = JSON.parse(resp);
                                }
                                catch (error) {
                                    processedData = resp;
                                }
                            }
                            if (processedData && typeof processedData === 'object' && 'project' in processedData) {
                                finalResult.project = processedData.project;
                            }
                            else {
                                finalResult.project = processedData;
                            }
                        }
                        // Use dedicated endpoint to update members if provided
                        if (membersPayload && Array.isArray(membersPayload.members) && membersPayload.members.length > 0) {
                            const membersResp = await hubstaffRequest(this, 'PUT', `/projects/${projectId}/update_members`, membersPayload);
                            let processedMembers = membersResp;
                            if (typeof membersResp === 'string') {
                                try {
                                    processedMembers = JSON.parse(membersResp);
                                }
                                catch (error) {
                                    processedMembers = membersResp;
                                }
                            }
                            finalResult.membersUpdate = processedMembers;
                        }
                        // Fallback in case neither project nor members were actually updated
                        if (Object.keys(finalResult).length === 0) {
                            finalResult = { success: true };
                        }
                        returnData.push({ json: finalResult });
                    }
                }
                // ===== Time Entries =====
                if (resource === 'time') {
                    const operation = this.getNodeParameter('timeOperation', i);
                    if (operation === 'getAll') {
                        const from = this.getNodeParameter('from', i);
                        const to = this.getNodeParameter('to', i);
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const limit = this.getNodeParameter('limit', i);
                        const qs = {};
                        if (from)
                            qs.start_date = from;
                        if (to)
                            qs.end_date = to;
                        let responseData;
                        if (returnAll) {
                            responseData = await hubstaffRequestAllItems(this, '/time_entries', qs);
                        }
                        else {
                            responseData = await hubstaffRequest(this, 'GET', '/time_entries', {}, { ...qs, per_page: limit });
                        }
                        let processedData = responseData;
                        if (typeof responseData === 'string') {
                            try {
                                processedData = JSON.parse(responseData);
                            }
                            catch (error) {
                                processedData = responseData;
                            }
                        }
                        if (Array.isArray(processedData)) {
                            returnData.push(...processedData.map((item) => ({ json: item })));
                        }
                        else {
                            returnData.push({ json: processedData });
                        }
                    }
                    if (operation === 'create') {
                        const user_id = this.getNodeParameter('user_id', i);
                        const project_id = this.getNodeParameter('project_id', i);
                        const task_id = this.getNodeParameter('task_id', i, '');
                        const started_at = this.getNodeParameter('started_at', i);
                        const stopped_at = this.getNodeParameter('stopped_at', i, '');
                        const notes = this.getNodeParameter('notes', i, '');
                        const body = { time_entry: {} };
                        if (user_id)
                            body.time_entry.user_id = Number(user_id);
                        if (project_id)
                            body.time_entry.project_id = Number(project_id);
                        if (task_id)
                            body.time_entry.task_id = Number(task_id);
                        if (started_at)
                            body.time_entry.started_at = started_at;
                        if (stopped_at)
                            body.time_entry.stopped_at = stopped_at;
                        if (notes)
                            body.time_entry.notes = notes;
                        const resp = await hubstaffRequest(this, 'POST', '/time_entries', body);
                        let processedData = resp;
                        if (typeof resp === 'string') {
                            try {
                                processedData = JSON.parse(resp);
                            }
                            catch (error) {
                                processedData = resp;
                            }
                        }
                        returnData.push({ json: processedData });
                    }
                    if (operation === 'update') {
                        const timeEntryId = this.getNodeParameter('timeEntryId', i);
                        const updateFields = this.getNodeParameter('updateFields', i, {});
                        if (!timeEntryId)
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'timeEntryId is required for update');
                        const resp = await hubstaffRequest(this, 'PATCH', `/time_entries/${timeEntryId}`, { time_entry: updateFields });
                        let processedData = resp;
                        if (typeof resp === 'string') {
                            try {
                                processedData = JSON.parse(resp);
                            }
                            catch (error) {
                                processedData = resp;
                            }
                        }
                        returnData.push({ json: processedData });
                    }
                }
                // ===== Tasks =====
                if (resource === 'task') {
                    const operation = this.getNodeParameter('taskOperation', i);
                    if (operation === 'getAll') {
                        const projectId = this.getNodeParameter('projectId', i, '');
                        const taskFilters = this.getNodeParameter('taskFilters', i, {});
                        const parseIdList = (input) => {
                            if (input === undefined || input === null || input === '') {
                                return [];
                            }
                            let values = [];
                            if (Array.isArray(input)) {
                                values = input;
                            }
                            else if (typeof input === 'string') {
                                const trimmed = input.trim();
                                if (!trimmed) {
                                    return [];
                                }
                                try {
                                    const parsed = JSON.parse(trimmed);
                                    if (Array.isArray(parsed)) {
                                        values = parsed;
                                    }
                                    else {
                                        values = trimmed.split(',');
                                    }
                                }
                                catch (error) {
                                    values = trimmed.split(',');
                                }
                            }
                            return values
                                .map((val) => {
                                if (val === null || val === undefined)
                                    return null;
                                if (typeof val === 'string') {
                                    const t = val.trim();
                                    if (!t)
                                        return null;
                                    const num = Number(t);
                                    return isNaN(num) ? null : num;
                                }
                                if (typeof val === 'number') {
                                    return val;
                                }
                                const num = Number(val);
                                return isNaN(num) ? null : num;
                            })
                                .filter((val) => val !== null && val !== undefined && !isNaN(val));
                        };
                        let endpoint;
                        if (projectId) {
                            // Get tasks for specific project
                            endpoint = `/projects/${projectId}/tasks`;
                        }
                        else if (organizationId) {
                            // Get all tasks for organization
                            endpoint = `/organizations/${organizationId}/tasks`;
                        }
                        else {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Organization ID must be configured in credentials or Project ID must be provided for getting tasks');
                        }
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const limit = this.getNodeParameter('limit', i);
                        const qsBase = {};
                        if (taskFilters.page_start_id) {
                            qsBase.page_start_id = taskFilters.page_start_id;
                        }
                        if (taskFilters.page_limit) {
                            qsBase.page_limit = taskFilters.page_limit;
                            qsBase.per_page = taskFilters.page_limit;
                        }
                        if (taskFilters.status && Array.isArray(taskFilters.status) && taskFilters.status.length > 0) {
                            qsBase['status[]'] = taskFilters.status;
                        }
                        const listFilterMap = [
                            { field: 'userIds', key: 'user_ids[]' },
                            { field: 'projectIds', key: 'project_ids[]' },
                            { field: 'globalTodoIds', key: 'global_todo_ids[]' },
                        ];
                        for (const filter of listFilterMap) {
                            const values = parseIdList(taskFilters[filter.field]);
                            if (values.length > 0) {
                                qsBase[filter.key] = values;
                            }
                        }
                        let responseData;
                        if (returnAll) {
                            responseData = await hubstaffRequestAllItems(this, endpoint, qsBase);
                        }
                        else {
                            responseData = await hubstaffRequest(this, 'GET', endpoint, {}, { ...qsBase, per_page: limit });
                        }
                        // Handle wrapped response
                        let processedData = responseData;
                        if (typeof responseData === 'string') {
                            try {
                                processedData = JSON.parse(responseData);
                            }
                            catch (error) {
                                processedData = responseData;
                            }
                        }
                        if (processedData && typeof processedData === 'object' && 'tasks' in processedData) {
                            const tasks = Array.isArray(processedData.tasks) ? processedData.tasks : [processedData.tasks];
                            returnData.push(...tasks.map((item) => ({ json: item })));
                        }
                        else if (Array.isArray(processedData)) {
                            returnData.push(...processedData.map((item) => ({ json: item })));
                        }
                        else {
                            returnData.push({ json: processedData });
                        }
                    }
                    if (operation === 'get') {
                        const taskId = this.getNodeParameter('taskId', i);
                        if (!taskId) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'taskId is required to fetch a task');
                        }
                        const resp = await hubstaffRequest(this, 'GET', `/tasks/${taskId}`);
                        let processedData = resp;
                        if (typeof resp === 'string') {
                            try {
                                processedData = JSON.parse(resp);
                            }
                            catch (error) {
                                processedData = resp;
                            }
                        }
                        if (processedData && typeof processedData === 'object' && 'task' in processedData) {
                            returnData.push({ json: processedData.task });
                        }
                        else {
                            returnData.push({ json: processedData });
                        }
                    }
                    if (operation === 'create') {
                        const project_id = this.getNodeParameter('project_id', i);
                        const name = this.getNodeParameter('name', i);
                        if (!name || !project_id)
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'name and project_id are required to create a task');
                        const resp = await hubstaffRequest(this, 'POST', `/projects/${project_id}/tasks`, { summary: name });
                        let processedData = resp;
                        if (typeof resp === 'string') {
                            try {
                                processedData = JSON.parse(resp);
                            }
                            catch (error) {
                                processedData = resp;
                            }
                        }
                        returnData.push({ json: processedData });
                    }
                    if (operation === 'update') {
                        const taskId = this.getNodeParameter('taskId', i);
                        if (!taskId)
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'taskId is required for task update');
                        const lockVersion = this.getNodeParameter('lockVersion', i);
                        if (lockVersion === undefined || lockVersion === null)
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'lockVersion is required for task update');
                        const summary = this.getNodeParameter('summary', i, '');
                        const status = this.getNodeParameter('status', i, '');
                        const assigneeId = this.getNodeParameter('assigneeId', i, '');
                        const assigneeIds = this.getNodeParameter('assigneeIds', i, '');
                        const payRate = this.getNodeParameter('payRate', i, '');
                        const billRate = this.getNodeParameter('billRate', i, '');
                        const metadata = this.getNodeParameter('metadata', i, {});
                        const body = {
                            lock_version: Number(lockVersion),
                        };
                        if (summary) {
                            body.summary = summary;
                        }
                        if (status) {
                            body.status = status;
                        }
                        // Handle assignee - use assignee_ids if provided, otherwise assignee_id
                        if (assigneeIds) {
                            // Parse comma-separated IDs or JSON array
                            let ids;
                            try {
                                ids = JSON.parse(assigneeIds);
                            }
                            catch (e) {
                                // If not JSON, treat as comma-separated
                                ids = assigneeIds.split(',').map((id) => Number(id.trim())).filter((id) => !isNaN(id));
                            }
                            if (Array.isArray(ids) && ids.length > 0) {
                                body.assignee_ids = ids;
                            }
                        }
                        else if (assigneeId) {
                            const id = Number(assigneeId);
                            if (!isNaN(id)) {
                                body.assignee_id = id;
                            }
                        }
                        // Handle pay_rate and bill_rate (can be null to remove)
                        if (payRate !== '' && payRate !== undefined) {
                            if (payRate === null) {
                                body.pay_rate = null;
                            }
                            else {
                                const nPay = Number(payRate);
                                if (!isNaN(nPay)) {
                                    body.pay_rate = nPay;
                                }
                            }
                        }
                        if (billRate !== '' && billRate !== undefined) {
                            if (billRate === null) {
                                body.bill_rate = null;
                            }
                            else {
                                const nBill = Number(billRate);
                                if (!isNaN(nBill)) {
                                    body.bill_rate = nBill;
                                }
                            }
                        }
                        // Handle metadata
                        if (metadata && metadata.metadataValues && Array.isArray(metadata.metadataValues)) {
                            body.metadata = metadata.metadataValues.map((item) => ({
                                key: item.key,
                                value: item.value,
                            }));
                        }
                        const resp = await hubstaffRequest(this, 'PUT', `/tasks/${taskId}`, body);
                        let processedData = resp;
                        if (typeof resp === 'string') {
                            try {
                                processedData = JSON.parse(resp);
                            }
                            catch (error) {
                                processedData = resp;
                            }
                        }
                        // Handle wrapped response
                        if (processedData && typeof processedData === 'object' && 'task' in processedData) {
                            returnData.push({ json: processedData.task });
                        }
                        else {
                            returnData.push({ json: processedData });
                        }
                    }
                    if (operation === 'delete') {
                        const taskId = this.getNodeParameter('taskId', i);
                        if (!taskId)
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'taskId is required to delete a task');
                        const resp = await hubstaffRequest(this, 'DELETE', `/tasks/${taskId}`);
                        if (resp === undefined || resp === null || resp === '') {
                            returnData.push({ json: { success: true, taskId, message: 'Task deleted' } });
                        }
                        else {
                            let processedData = resp;
                            if (typeof resp === 'string') {
                                try {
                                    processedData = JSON.parse(resp);
                                }
                                catch (error) {
                                    processedData = resp;
                                }
                            }
                            if (processedData && typeof processedData === 'object' && 'task' in processedData) {
                                returnData.push({ json: processedData.task });
                            }
                            else {
                                returnData.push({ json: processedData });
                            }
                        }
                    }
                }
                // ===== Members =====
                if (resource === 'member') {
                    const operation = this.getNodeParameter('memberOperation', i);
                    if (operation === 'getAll') {
                        if (!organizationId) {
                            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Organization ID is required. Please configure it in your credentials.');
                        }
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const limit = this.getNodeParameter('limit', i);
                        let responseData;
                        if (returnAll) {
                            responseData = await hubstaffRequestAllItems(this, `/organizations/${organizationId}/members`);
                        }
                        else {
                            responseData = await hubstaffRequest(this, 'GET', `/organizations/${organizationId}/members`, {}, { per_page: limit });
                        }
                        // Handle wrapped response
                        let processedData = responseData;
                        if (typeof responseData === 'string') {
                            try {
                                processedData = JSON.parse(responseData);
                            }
                            catch (error) {
                                processedData = responseData;
                            }
                        }
                        if (processedData && typeof processedData === 'object' && 'members' in processedData) {
                            const members = Array.isArray(processedData.members) ? processedData.members : [processedData.members];
                            returnData.push(...members.map((item) => ({ json: item })));
                        }
                        else if (Array.isArray(processedData)) {
                            returnData.push(...processedData.map((item) => ({ json: item })));
                        }
                        else {
                            returnData.push({ json: processedData });
                        }
                    }
                }
                // ===== Clients =====
                // Note: Clients endpoint may not be available in Hubstaff API v2
                if (resource === 'client') {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Client operations are not available in Hubstaff API v2. Please use Organizations, Projects, or Tasks instead.');
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ error: error.message, json: {} });
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
exports.Hubstaff = Hubstaff;
// Helper: perform HTTP request with credentials selection
async function hubstaffRequest(execFunctions, method, endpoint, body = {}, qs = {}, optionsOverrides = {}) {
    const credentialName = 'hubstaffApi1';
    const credentials = await execFunctions.getCredentials(credentialName);
    if (!credentials) {
        throw new n8n_workflow_1.NodeOperationError(execFunctions.getNode ? execFunctions.getNode() : undefined, `No credentials configured for ${credentialName}`);
    }
    // Get refresh token from credentials
    const refreshToken = credentials.refreshToken;
    if (!refreshToken) {
        throw new n8n_workflow_1.NodeOperationError(execFunctions.getNode ? execFunctions.getNode() : undefined, 'Refresh token is required');
    }
    // Get access token (with caching)
    const accessToken = await getAccessToken(refreshToken);
    const headers = {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
    const requestOptions = {
        method,
        uri: `https://api.hubstaff.com/v2${endpoint}`,
        headers,
        qs,
        body,
        json: true,
        ...optionsOverrides,
    };
    return execFunctions.helpers.request(requestOptions);
}
// Extract data array from typical Hubstaff response shapes
function extractDataFromResponse(response) {
    if (!response)
        return [];
    if (Array.isArray(response))
        return response;
    if (response.data && Array.isArray(response.data))
        return response.data;
    if (response.data && typeof response.data === 'object')
        return [response.data];
    for (const key of Object.keys(response)) {
        if (Array.isArray(response[key]))
            return response[key];
    }
    return [response];
}
// Pagination-aware fetch-all
async function hubstaffRequestAllItems(execFunctions, endpoint, qsBase = {}) {
    const allItems = [];
    let page = 1;
    const per_page = qsBase.per_page ? Number(qsBase.per_page) : 100;
    while (true) {
        const resp = await hubstaffRequest(execFunctions, 'GET', endpoint, {}, { ...qsBase, page, per_page });
        if (resp && resp.meta && resp.meta.pagination) {
            const items = extractDataFromResponse(resp);
            allItems.push(...items);
            const totalPages = resp.meta.pagination.total_pages || Math.ceil((resp.meta.pagination.total || 0) / (resp.meta.pagination.per_page || per_page));
            if (page >= totalPages)
                break;
            page++;
            continue;
        }
        const items = extractDataFromResponse(resp);
        if (!items || items.length === 0)
            break;
        allItems.push(...items);
        if (items.length < per_page)
            break;
        page++;
    }
    return allItems;
}
