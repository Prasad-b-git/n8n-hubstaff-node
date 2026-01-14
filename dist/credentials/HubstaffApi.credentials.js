"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubstaffApi = void 0;
class HubstaffApi {
    constructor() {
        this.name = 'hubstaffApi1';
        this.displayName = 'Hubstaff API V2';
        this.documentationUrl = 'https://developer.hubstaff.com/';
        this.properties = [
            {
                displayName: 'Personal Access Token (Refresh Token)',
                name: 'refreshToken',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                default: '',
                required: true,
                description: 'Your Hubstaff Personal Access Token (Refresh Token) - valid for 90 days. Get it from https://developer.hubstaff.com/personal_access_tokens.',
            },
            {
                displayName: 'Organization ID',
                name: 'organizationId',
                type: 'string',
                default: '',
                required: false,
                description: 'Your Hubstaff Organization ID. You can find this in your Hubstaff account settings or by using the Organization -> Get All operation.',
            },
        ];
    }
}
exports.HubstaffApi = HubstaffApi;
