"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HubstaffOAuth2Api = void 0;
class HubstaffOAuth2Api {
    constructor() {
        this.name = 'hubstaffOAuth2Api1';
        this.extends = [
            'oAuth2Api',
        ];
        this.displayName = 'Hubstaff OAuth2 API 1';
        this.documentationUrl = 'https://developer.hubstaff.com/';
        this.properties = [
            {
                displayName: 'Authorization URL',
                name: 'authUrl',
                type: 'hidden',
                default: 'https://account.hubstaff.com/authorizations/new',
            },
            {
                displayName: 'AccessToken URL',
                name: 'accessTokenUrl',
                type: 'hidden',
                default: 'https://account.hubstaff.com/access/tokens',
            },
            {
                displayName: 'Scope',
                name: 'scope',
                type: 'hidden',
                default: 'hubstaff:read hubstaff:write',
            },
            {
                displayName: 'Auth URI Query Parameters',
                name: 'authQueryParameters',
                type: 'hidden',
                default: '',
            },
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'hidden',
                default: 'header',
            },
        ];
    }
}
exports.HubstaffOAuth2Api = HubstaffOAuth2Api;
